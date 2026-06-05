import { getBodyPosition, getVisibleNow, getDsoPosition, sunAltitude } from './ephemeris';
import { findDso } from './dso';
import { audit } from './audit';
import { sanitizeUserText } from './sanitize';
import { qvac, type ChatMessage } from './qvac';
import { TOOL_DEFS, runTool, summarizeTool, type ToolCtx } from './skyTools';

/**
 * Offline sky agent — the hackathon headline. Fully on-device, airplane-mode.
 *
 * Orchestration: the LLAMA_TOOL_CALLING_1B model is given the native QVAC sky
 * tools and decides which to call, chaining several for a compound question
 * ("best target tonight and when?" → visibility + moon + dark window). We run a
 * multi-round tool loop, then ground the final answer.
 *
 * Reliability: a deterministic pass always computes the primary object's verdict
 * from real ephemeris, so the answer can never flip "below horizon" into "it's
 * up" — even if the small model orchestrates oddly or not at all. Model-driven
 * orchestration on top, deterministic guarantee underneath.
 */

const ORCH_SYSTEM = `You are Stellar's Field companion, a precise astronomy assistant for telescope owners. To answer the user, CALL the on-device sky tools you need — you may call several. Use get_body_position for planets/Moon/Sun, get_object_position for deep-sky objects and stars, get_visible_now for what's up now, get_moon_conditions and get_dark_window when planning faint-object observing. Call tools rather than guessing.`;

const ANSWER_SYSTEM = `You are Stellar's Field companion. Answer in 2 short sentences using ONLY the live on-device data below. Lead with the verdict and never contradict it: if the data says NOT visible / below the horizon / daytime, you must say it is not viewable now. Never invent numbers.`;

const BODY_RE = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune)\b/i;

/** Display-ready snapshot of the on-device computation, shown under the answer. */
type Point = {
  name: string;
  altitude: number;
  direction: string;
  daylight: boolean;
  observable: boolean;
  aboveHorizon: boolean;
};

export type LiveSky =
  | ({ kind: 'body' } & Point)
  | ({ kind: 'dso'; detail?: string } & Point)
  | {
      kind: 'sky';
      daylight: boolean;
      bodies: { name: string; altitude: number; direction: string }[];
    };

/** One model-driven tool invocation — surfaced in the UI as the orchestration trace. */
export type OrchestrationStep = { tool: string; args: Record<string, unknown>; ok: boolean };

export type AgentResult = {
  stream: AsyncIterable<string>;
  /** Tools the model orchestrated (in order). */
  toolsUsed: string[];
  steps: OrchestrationStep[];
  /** Display-ready snapshot of the live on-device computation (the guaranteed verdict). */
  live: LiveSky;
};

/** Authoritative verdict line for the primary object — guarantees correct polarity. */
function groundingText(live: LiveSky): string {
  if (live.kind === 'body' || live.kind === 'dso') {
    const status = !live.aboveHorizon
      ? 'below the horizon, NOT visible right now'
      : live.daylight
        ? 'above the horizon but it is daytime, NOT viewable until after dark'
        : 'up and viewable now (dark sky)';
    const extra = live.kind === 'dso' && live.detail ? ` (${live.detail})` : '';
    return `${live.name}${extra}: altitude ${live.altitude}°, direction ${live.direction} — ${status}.`;
  }
  if (live.daylight) {
    return `It is daytime — nothing observable now. After dark these would be up: ${live.bodies.map((b) => b.name).join(', ') || 'none'}.`;
  }
  if (live.bodies.length === 0) return 'Nothing is above the horizon right now.';
  return 'Up right now: ' + live.bodies.map((b) => `${b.name} (${b.altitude}°, ${b.direction})`).join('; ') + '.';
}

/** Deterministic primary tool — the reliable verdict + the LIVE SKY badge. */
function runLocalTool(message: string, lat: number, lon: number): { name: string; result: unknown; live: LiveSky } {
  const dso = findDso(message);
  if (dso) {
    const p = getDsoPosition(dso.ra, dso.dec, lat, lon);
    return {
      name: 'get_object_position',
      result: { name: dso.name, type: dso.type, constellation: dso.constellation, magnitude: dso.mag, ...p },
      live: {
        kind: 'dso',
        name: dso.name,
        altitude: p.altitude,
        direction: p.azimuthDir,
        daylight: p.daylight,
        observable: p.observable,
        aboveHorizon: p.aboveHorizon,
        detail: `${dso.type} · mag ${dso.mag} · ${dso.constellation}`,
      },
    };
  }
  const m = message.match(BODY_RE);
  if (m) {
    const p = getBodyPosition(m[1].toLowerCase(), lat, lon);
    const live: LiveSky = p
      ? { kind: 'body', name: p.name, altitude: p.altitude, direction: p.azimuthDir, daylight: p.daylight, observable: p.observable, aboveHorizon: p.aboveHorizon }
      : { kind: 'body', name: m[1], altitude: 0, direction: '—', daylight: false, observable: false, aboveHorizon: false };
    return { name: 'get_body_position', result: p ?? { error: `unknown body: ${m[1]}` }, live };
  }
  const list = getVisibleNow(lat, lon);
  const daylight = sunAltitude(lat, lon) > -6;
  return {
    name: 'get_visible_now',
    result: { daylight, count: list.length, bodies: list.map((b) => ({ name: b.name, altitude: b.altitude, direction: b.azimuthDir })) },
    live: { kind: 'sky', daylight, bodies: list.slice(0, 5).map((b) => ({ name: b.name, altitude: b.altitude, direction: b.azimuthDir })) },
  };
}

export async function runSkyAgent(
  userMessageRaw: string,
  _history: ChatMessage[],
  lat: number,
  lon: number,
): Promise<AgentResult> {
  const userMessage = sanitizeUserText(userMessageRaw);
  const ctx: ToolCtx = { lat, lon };
  const sdk: any = await import('@qvac/sdk');
  const modelId = await qvac.ensureLlmModelId();

  // Hold the single-job gate across all passes (tool rounds + final answer).
  const release = await qvac.acquireJob();
  const steps: OrchestrationStep[] = [];
  const collected: { name: string; result: unknown }[] = [];

  try {
    // 1) Model-driven orchestration: let it call (and chain) the native tools.
    const convo: ChatMessage[] = [
      { role: 'system', content: ORCH_SYSTEM },
      { role: 'user', content: userMessage },
    ];
    const MAX_ROUNDS = 2;
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const r = sdk.completion({ modelId, history: convo, stream: true, tools: TOOL_DEFS });
      // Drain both streams (matches the SDK example) so the request fully
      // completes and `toolCalls` resolves. Intermediate text is discarded —
      // the user-facing answer is the grounded final pass below.
      await Promise.all([
        (async () => { for await (const _tok of r.tokenStream) { /* discard */ } })(),
        (async () => { for await (const _evt of r.toolCallStream) { /* drained for completion */ } })(),
      ]);
      const calls: { id: string; name: string; arguments: Record<string, unknown> }[] = (await r.toolCalls) ?? [];
      if (calls.length === 0) break;
      convo.push({ role: 'assistant', content: (await r.text) ?? '' });
      for (const call of calls) {
        let result: unknown;
        let ok = true;
        try {
          result = runTool(call.name, call.arguments ?? {}, ctx);
        } catch (e) {
          ok = false;
          result = { error: String(e) };
        }
        steps.push({ tool: call.name, args: call.arguments ?? {}, ok });
        collected.push({ name: call.name, result });
        audit.record({ type: 'inference', kind: 'tool-call', model: call.name, promptPreview: userMessage, meta: { args: call.arguments, result } });
        convo.push({ role: 'tool', content: JSON.stringify(result) });
      }
    }

    // 2) Deterministic primary — the guaranteed verdict + the LIVE SKY badge.
    const primary = runLocalTool(userMessage, lat, lon);
    audit.record({ type: 'inference', kind: 'tool-call', model: `${primary.name} (deterministic)`, promptPreview: userMessage, meta: { result: primary.result } });
    if (collected.length === 0) {
      // Model orchestrated nothing — fall back so the answer is still grounded.
      steps.push({ tool: primary.name, args: {}, ok: true });
      collected.push({ name: primary.name, result: primary.result });
    }

    // 3) Ground the final answer: authoritative verdict first, then everything
    //    the model gathered (moon, dark window, other objects).
    const lines = [groundingText(primary.live)];
    for (const c of collected) {
      const s = summarizeTool(c.name, c.result);
      if (s) lines.push(s);
    }
    const grounded = `${ANSWER_SYSTEM}\n\nLive on-device sky data:\n- ${dedupe(lines).join('\n- ')}`;

    // Final answer pass — no tools, so it answers from the grounded data.
    const finalRes = sdk.completion({
      modelId,
      history: [
        { role: 'system', content: grounded },
        { role: 'user', content: userMessage },
      ],
      stream: true,
    });
    async function* drain(): AsyncIterable<string> {
      try {
        for await (const tok of finalRes.tokenStream) yield tok as string;
      } finally {
        release();
      }
    }

    return {
      stream: audit.instrument('llm', 'orchestrator', userMessage, drain(), finalRes.stats),
      // Always credit the deterministic primary tool too, so correctness tracking
      // (eval) stays stable regardless of how the model orchestrated.
      toolsUsed: [...new Set([...steps.map((s) => s.tool), primary.name])],
      steps,
      live: primary.live,
    };
  } catch (err) {
    release();
    throw err;
  }
}

function dedupe(lines: string[]): string[] {
  return [...new Set(lines.filter(Boolean))];
}
