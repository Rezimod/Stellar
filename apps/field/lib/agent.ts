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

const SYSTEM_PROMPT = `You are Stellar's Field companion, a precise astronomy assistant for telescope owners. Answer using ONLY the live sky data below. Be concise — 2 short sentences. Never invent positions.`;

/** Compact, model-friendly grounding line (far fewer tokens than full JSON → lower TTFT). */
function groundingText(live: LiveSky): string {
  if (live.kind === 'body' || live.kind === 'dso') {
    const status = !live.aboveHorizon
      ? 'below the horizon, not up right now'
      : live.daylight
        ? 'above the horizon but it is DAYTIME, so not viewable until after dark'
        : 'above the horizon and viewable now (dark sky)';
    const extra = live.kind === 'dso' && live.detail ? ` (${live.detail})` : '';
    return `${live.name}${extra}: altitude ${live.altitude}°, direction ${live.direction}, ${status}.`;
  }
  if (live.daylight) {
    return `It is DAYTIME — nothing is observable now. After dark these would be up: ${live.bodies.map((b) => b.name).join(', ') || 'none'}.`;
  }
  if (live.bodies.length === 0) return 'Nothing is above the horizon right now.';
  return 'Above the horizon now: ' + live.bodies.map((b) => `${b.name} (${b.altitude}°, ${b.direction})`).join('; ') + '.';
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
  const sdk: any = await import('@qvac/sdk');
  const modelId = await qvac.ensureLlmModelId();

  // Run the local ephemeris tool, then ground the model's answer in a compact
  // summary of the result (full JSON bloats the prompt and slows TTFT).
  const tool = runLocalTool(userMessage, lat, lon);
  audit.record({ type: 'inference', kind: 'tool-call', model: tool.name, promptPreview: userMessage, meta: { result: tool.result } });

  const groundedSystem = `${SYSTEM_PROMPT}\n\nLive on-device sky data: ${groundingText(tool.live)}`;

  const answer = sdk.completion({
    modelId,
    history: [
      { role: 'system', content: groundedSystem },
      { role: 'user', content: userMessage },
    ],
    stream: true,
  });

  return {
    stream: audit.instrument('llm', 'tool-model', userMessage, answer.tokenStream, answer.stats),
    toolsUsed: [tool.name],
    live: tool.live,
  };
}
