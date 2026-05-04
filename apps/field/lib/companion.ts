import { qvac, type ChatMessage } from './qvac';
import { retrieveContext } from './rag';
import { env } from './env';

export type CompanionMode = 'auto' | 'online' | 'field';

const SYSTEM_PROMPT = `You are Stellar's Space Companion, a precise and patient astronomy assistant for telescope owners. Answer questions about the night sky, telescope use, and observation planning. Use the provided context when relevant. Be concise; cite the catalog ID (e.g., M31, NGC 7000) when applicable. If asked something outside astronomy, say so politely.`;

async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch('https://www.google.com/generate_204', { method: 'HEAD' });
    return res.status === 204 || res.ok;
  } catch {
    return false;
  }
}

export async function* chat(
  userMessage: string,
  history: ChatMessage[],
  mode: CompanionMode = 'auto',
): AsyncIterable<string> {
  const useField = mode === 'field' || (mode === 'auto' && !(await isOnline()));

  if (useField) {
    const context = await retrieveContext(userMessage);
    const augmentedSystem = context
      ? `${SYSTEM_PROMPT}\n\nRelevant astronomy reference:\n${context}`
      : SYSTEM_PROMPT;

    const fullHistory: ChatMessage[] = [
      { role: 'system', content: augmentedSystem },
      ...history,
      { role: 'user', content: userMessage },
    ];

    yield* qvac.generate(fullHistory);
    return;
  }

  const res = await fetch(env.webChatEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: userMessage, history }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat endpoint failed: ${res.status}`);
  }

  const reader = (res.body as any).getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}
