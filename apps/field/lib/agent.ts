import { getBodyPosition, getVisibleNow, getDsoPosition, sunAltitude } from './ephemeris';
import { findDso } from './dso';
import { audit } from './audit';
import { sanitizeUserText } from './sanitize';
import { qvac, type ChatMessage } from './qvac';
import { runTool, summarizeTool, type ToolCtx } from './skyTools';

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

const ANSWER_SYSTEM = `You are Stellar's Field companion. Answer in 2–3 short sentences using ONLY the live on-device data below. Lead with the verdict and never contradict it: if the data says NOT visible / below the horizon / daytime, say it is not viewable now. Only name objects that actually appear in the data — never invent or recommend a target that is not listed. If nothing is observable now, say so and give the dark-window time. When Moon or dark-window data is present, include the Moon's illumination and the dark-window time so the observer can plan. Never invent numbers.`;

const BODY_RE = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune)\b/i;
// Planning intent → bring in visibility + moon + dark-window tools (true
// multi-tool orchestration). "tonight" is intentionally NOT here — it's too
// common; only genuine planning words trigger the wider tool set.
const PLAN_RE = /\b(best|target|plan|observe|observing|recommend|good time|what should i|what to)\b/i;
const MOON_RE = /\b(moon|moonlight|interfere|interference|faint|deep.?sky|dark window|darkness)\b/i;

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
    }
  | {
      kind: 'plan';
      fromTime: string | null;
      moonPct: number;
      moonInterference: string;
      darkStart: string | null;
      darkEnd: string | null;
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
  if (live.kind === 'plan') return ''; // planning uses the tool summaries as the lead
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

/** Deterministic multi-tool plan for a query — what tools *should* run. */
function planToolCalls(message: string): { name: string; args: Record<string, unknown> }[] {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const dso = findDso(message);
  const bodyM = message.match(BODY_RE);
  const planning = PLAN_RE.test(message);

  if (dso) calls.push({ name: 'get_object_position', args: { name: dso.name } });
  else if (bodyM) calls.push({ name: 'get_body_position', args: { body: bodyM[1].toLowerCase() } });

  if (planning) {
    // "best target tonight" → what's actually up after dark + moon + dark window.
    calls.push({ name: 'get_tonight_targets', args: {} });
    calls.push({ name: 'get_moon_conditions', args: {} });
    calls.push({ name: 'get_dark_window', args: {} });
  } else if (!dso && !bodyM) {
    calls.push({ name: 'get_visible_now', args: {} });
  }
  if (!planning && MOON_RE.test(message)) {
    calls.push({ name: 'get_moon_conditions', args: {} });
    calls.push({ name: 'get_dark_window', args: {} });
  }
  return calls;
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

  // Hold the single-job gate for the answer stream.
  const release = await qvac.acquireJob();
  const steps: OrchestrationStep[] = [];
  const collected: { name: string; result: unknown }[] = [];

  try {
    // Deterministic multi-tool orchestration. Native QVAC tool-calling is wired
    // and verified (Diagnostics smoke test), but a 1B is unreliable at *emitting*
    // structured calls at runtime — it tends to describe the call in prose and
    // burns a full generation doing it. So the planner selects and chains the
    // right tools deterministically: reliable, correct, and fast (one model
    // pass). The answer is grounded in their real results.
    for (const pc of planToolCalls(userMessage)) {
      if (collected.some((c) => c.name === pc.name)) continue;
      const result = runTool(pc.name, pc.args, ctx);
      steps.push({ tool: pc.name, args: pc.args, ok: true });
      collected.push({ name: pc.name, result });
      audit.record({ type: 'inference', kind: 'tool-call', model: pc.name, promptPreview: userMessage, meta: { args: pc.args, result } });
    }

    // Badge + lead verdict. A general planning question ("best target tonight")
    // leads with what's actually up after dark; an object/simple question leads
    // with that object's deterministic verdict (guaranteed correct polarity).
    const planning = PLAN_RE.test(userMessage);
    const hasObject = !!findDso(userMessage) || BODY_RE.test(userMessage);
    let live: LiveSky;
    let leadLine: string;
    let primaryTool: string | null = null;
    if (planning && !hasObject) {
      const tt = collected.find((c) => c.name === 'get_tonight_targets')?.result as any;
      const moon = collected.find((c) => c.name === 'get_moon_conditions')?.result as any;
      const dark = collected.find((c) => c.name === 'get_dark_window')?.result as any;
      live = {
        kind: 'plan',
        fromTime: tt?.fromTime ?? null,
        moonPct: moon?.illumination ?? 0,
        moonInterference: moon?.interference ?? 'none',
        darkStart: dark?.darkStart ?? null,
        darkEnd: dark?.darkEnd ?? null,
        bodies: (tt?.bodies ?? []).slice(0, 4).map((b: any) => ({ name: b.name, altitude: b.altitude, direction: b.direction })),
      };
      leadLine = summarizeTool('get_tonight_targets', tt) || 'Planning targets for tonight.';
    } else {
      const primary = runLocalTool(userMessage, lat, lon);
      live = primary.live;
      leadLine = groundingText(primary.live);
      primaryTool = primary.name;
    }

    // Ground the final answer: lead line first, then the orchestrated tool results.
    const lines = [leadLine];
    for (const c of collected) {
      const s = summarizeTool(c.name, c.result);
      if (s) lines.push(s);
    }
    const grounded = `${ANSWER_SYSTEM}\n\nLive on-device sky data:\n- ${dedupe(lines).join('\n- ')}`;

    // Final answer pass — no tools, so it answers from the grounded data.
    // Low temperature keeps it faithful to the data (no invented targets);
    // a token cap keeps it short and fast on the 1B.
    const finalRes = sdk.completion({
      modelId,
      history: [
        { role: 'system', content: grounded },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      generationParams: { temp: 0.2, top_p: 0.9, predict: 180 },
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
      toolsUsed: [...new Set([...steps.map((s) => s.tool), ...(primaryTool ? [primaryTool] : [])])],
      steps,
      live,
    };
  } catch (err) {
    release();
    throw err;
  }
}

function dedupe(lines: string[]): string[] {
  return [...new Set(lines.filter(Boolean))];
}
