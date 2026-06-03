import { getBodyPosition, getVisibleNow, getDsoPosition, sunAltitude } from './ephemeris';
import { findDso } from './dso';
import { audit } from './audit';
import { sanitizeUserText } from './sanitize';
import { qvac, type ChatMessage } from './qvac';

/**
 * Offline sky agent — the hackathon headline. Fully on-device:
 *   sky question → run the local ephemeris tool → model answers grounded in it.
 * No cloud, works in airplane mode.
 *
 * The router already classified this as a sky-position question, so we run the
 * tool deterministically and ground the answer in real computed data, rather
 * than gambling on a 1B model deciding to emit a tool call (unreliable on small
 * models, and the QVAC SDK has no tool_choice to force it). This is the
 * production-grade choice: the answer is always backed by real on-device
 * computation, never the model's guess.
 */

const SYSTEM_PROMPT = `You are Stellar's Field companion, a precise astronomy assistant for telescope owners.
You are given a VERDICT and live sky data computed on-device. Restate the verdict in one short, natural sentence, then add the altitude and compass direction.
RULES: Never contradict the verdict. If it says NOT visible / below the horizon / daytime, you MUST say it is not visible right now — never say it is up. Keep it to 2 short sentences. Never invent numbers.`;

/**
 * Compact, model-friendly grounding line. We compute the yes/no VERDICT here from
 * real on-device data so the small model only has to restate it (not decide it) —
 * this stops the 1B from flipping the answer's polarity. Far fewer tokens than
 * full JSON, too, which keeps TTFT low.
 */
function groundingText(live: LiveSky): string {
  if (live.kind === 'body' || live.kind === 'dso') {
    const verdict = !live.aboveHorizon
      ? `VERDICT: No — ${live.name} is below the horizon and NOT visible right now.`
      : live.daylight
        ? `VERDICT: Not yet — ${live.name} is above the horizon but it is daytime, so it is NOT visible until after dark.`
        : `VERDICT: Yes — ${live.name} is up and visible right now.`;
    const detail = `Altitude ${live.altitude}°, direction ${live.direction}.`;
    const extra = live.kind === 'dso' && live.detail ? ` It is a ${live.detail}.` : '';
    return `${verdict} ${detail}${extra}`;
  }
  if (live.daylight) {
    return `VERDICT: It is daytime — nothing is visible yet. After dark these would be up: ${live.bodies.map((b) => b.name).join(', ') || 'none'}.`;
  }
  if (live.bodies.length === 0) return 'VERDICT: Nothing is above the horizon right now.';
  return 'VERDICT: Up right now — ' + live.bodies.map((b) => `${b.name} (${b.altitude}°, ${b.direction})`).join('; ') + '.';
}

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

/** Pick and run the right local tool for the question — pure on-device compute. */
function runLocalTool(
  message: string,
  lat: number,
  lon: number,
): { name: string; result: unknown; live: LiveSky } {
  // Deep-sky object or named star (M31, Andromeda, Pleiades, Vega…)
  const dso = findDso(message);
  if (dso) {
    const p = getDsoPosition(dso.ra, dso.dec, lat, lon);
    const result = { name: dso.name, type: dso.type, constellation: dso.constellation, magnitude: dso.mag, ...p };
    return {
      name: 'get_dso_position',
      result,
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
    const body = m[1].toLowerCase();
    const p = getBodyPosition(body, lat, lon);
    const result = p ?? { error: `unknown body: ${body}` };
    const live: LiveSky = p
      ? {
          kind: 'body',
          name: p.name,
          altitude: p.altitude,
          direction: p.azimuthDir,
          daylight: p.daylight,
          observable: p.observable,
          aboveHorizon: p.aboveHorizon,
        }
      : { kind: 'body', name: body, altitude: 0, direction: '—', daylight: false, observable: false, aboveHorizon: false };
    return { name: 'get_body_position', result, live };
  }
  const list = getVisibleNow(lat, lon);
  const daylight = sunAltitude(lat, lon) > -6;
  return {
    name: 'get_visible_now',
    result: {
      daylight,
      count: list.length,
      bodies: list.map((b) => ({ name: b.name, altitude: b.altitude, direction: b.azimuthDir, magnitude: b.magnitude, observable: b.observable, constellation: b.constellation })),
    },
    live: {
      kind: 'sky',
      daylight,
      bodies: list.slice(0, 5).map((b) => ({ name: b.name, altitude: b.altitude, direction: b.azimuthDir })),
    },
  };
}

export type AgentResult = {
  stream: AsyncIterable<string>;
  /** The local tool(s) that produced the grounding data. */
  toolsUsed: string[];
  /** Display-ready snapshot of the live on-device computation. */
  live: LiveSky;
};

export async function runSkyAgent(
  userMessageRaw: string,
  _history: ChatMessage[],
  lat: number,
  lon: number,
): Promise<AgentResult> {
  // Untrusted input (typed or voice-transcribed) — defang prompt injection.
  const userMessage = sanitizeUserText(userMessageRaw);

  // Run the local ephemeris tool, then ground the model's answer in a compact
  // summary of the result (full JSON bloats the prompt and slows TTFT).
  const tool = runLocalTool(userMessage, lat, lon);
  audit.record({ type: 'inference', kind: 'tool-call', model: tool.name, promptPreview: userMessage, meta: { result: tool.result } });

  const groundedSystem = `${SYSTEM_PROMPT}\n\nLive on-device sky data: ${groundingText(tool.live)}`;

  // Serialized through the QVAC single-job gate so it can't collide with the
  // background embedding warm-up or any other in-flight inference.
  const answer = await qvac.lockedCompletion([
    { role: 'system', content: groundedSystem },
    { role: 'user', content: userMessage },
  ]);

  return {
    stream: audit.instrument('llm', 'tool-model', userMessage, answer.tokenStream, answer.stats),
    toolsUsed: [tool.name],
    live: tool.live,
  };
}
