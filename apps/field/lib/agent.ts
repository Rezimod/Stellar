import { buildSkyTools } from './tools';
import { audit } from './audit';
import { sanitizeUserText } from './sanitize';
import { qvac, type ChatMessage } from './qvac';

/**
 * Offline sky agent — the hackathon headline. Fully on-device:
 *   user question → tool-calling LLM decides → local ephemeris tool runs →
 *   model answers grounded in the result. No cloud, works in airplane mode.
 *
 * Reuses the single shared tool-calling model (also serves the RAG chat), so a
 * constrained phone never loads a second ~700MB model.
 *
 * Two-pass loop (provider-agnostic, robust for a 1B model):
 *   1. completion(stream:false, tools) → which tool(s) to call
 *   2. run the tool handlers locally, then completion(stream:true) with the
 *      results injected so the answer is grounded in real sky data.
 */

const SYSTEM_PROMPT = `You are Stellar's Field companion, a precise, patient astronomy assistant for telescope owners observing at dark-sky sites. When a question is about whether or where an object is in the sky right now, or what is currently visible, call the provided tool. Keep answers to 2–4 short sentences. Use the live data; never invent positions.`;

export type AgentResult = {
  stream: AsyncIterable<string>;
  /** Names of tools the model chose to call (empty if it answered directly). */
  toolsUsed: string[];
};

export async function runSkyAgent(
  userMessageRaw: string,
  history: ChatMessage[],
  lat: number,
  lon: number,
): Promise<AgentResult> {
  // Untrusted input (typed or voice-transcribed) — defang prompt injection.
  const userMessage = sanitizeUserText(userMessageRaw);
  const sdk: any = await import('@qvac/sdk');
  const modelId = await qvac.ensureLlmModelId();
  const tools = buildSkyTools(lat, lon);

  const baseHistory: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-6),
    { role: 'user', content: userMessage },
  ];

  // Pass 1 — let the model decide whether to call a tool.
  const decide = sdk.completion({ modelId, history: baseHistory, stream: false, tools });
  const calls = (await decide.toolCalls) ?? [];

  const toolsUsed: string[] = [];
  let toolContext = '';
  for (const call of calls) {
    toolsUsed.push(call.name);
    // Prefer the SDK's invoke(); fall back to an inline result if the runtime
    // already executed the handler (exact shape verified on-device).
    const result = call.invoke ? await call.invoke() : (call.result ?? call.output ?? null);
    audit.record({ type: 'inference', kind: 'tool-call', model: call.name, promptPreview: userMessage, meta: { result } });
    toolContext += `\n- ${call.name} → ${JSON.stringify(result)}`;
  }

  // No tool needed — stream the model's direct answer (re-ask in stream mode).
  if (toolsUsed.length === 0) {
    const direct = sdk.completion({ modelId, history: baseHistory, stream: true });
    return { stream: audit.instrument('llm', 'tool-model', userMessage, direct.tokenStream, direct.stats), toolsUsed };
  }

  // Pass 2 — answer grounded in the live, on-device tool results.
  const groundedSystem =
    `${SYSTEM_PROMPT}\n\nLive sky data computed on-device for the observer's location:${toolContext}\n\nAnswer the user's question using only this data. Be concise.`;
  const answer = sdk.completion({
    modelId,
    history: [{ role: 'system', content: groundedSystem }, { role: 'user', content: userMessage }],
    stream: true,
  });
  return { stream: audit.instrument('llm', 'tool-model', userMessage, answer.tokenStream, answer.stats), toolsUsed };
}
