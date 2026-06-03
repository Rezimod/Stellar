import { getBodyPosition, getVisibleNow, sunAltitude } from './ephemeris';
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

const SYSTEM_PROMPT = `You are Stellar's Field companion, a precise, patient astronomy assistant for telescope owners at dark-sky sites. Answer the user's question using ONLY the live sky data provided. Be concise — 2 to 3 short sentences. Never invent positions.

Read the data carefully:
- "aboveHorizon" means the object is geometrically up.
- "daylight": true means the Sun is up and the sky is too bright to observe anything.
- "observable" true means it is actually viewable right now.
If observable is false because it is daylight, say the object is technically up but not viewable until after dark. If it is below the horizon, say it is not up right now and mention when it rises if known.`;

const BODY_RE = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune)\b/i;

/** Pick and run the right local tool for the question — pure on-device compute. */
function runLocalTool(message: string, lat: number, lon: number): { name: string; result: unknown } {
  const m = message.match(BODY_RE);
  if (m) {
    const body = m[1].toLowerCase();
    return { name: 'get_body_position', result: getBodyPosition(body, lat, lon) ?? { error: `unknown body: ${body}` } };
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
  };
}

export type AgentResult = {
  stream: AsyncIterable<string>;
  /** The local tool(s) that produced the grounding data. */
  toolsUsed: string[];
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

  // Run the local ephemeris tool, then ground the model's answer in the result.
  const tool = runLocalTool(userMessage, lat, lon);
  audit.record({ type: 'inference', kind: 'tool-call', model: tool.name, promptPreview: userMessage, meta: { result: tool.result } });

  const groundedSystem =
    `${SYSTEM_PROMPT}\n\nLive sky data computed on-device for the observer's location:\n- ${tool.name} → ${JSON.stringify(tool.result)}`;

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
  };
}
