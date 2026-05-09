import { qvac, type ChatMessage } from './qvac';
import { retrieveContext, type Citation } from './rag';
import { env } from './env';

export type CompanionMode = 'auto' | 'online' | 'field';
export type ResolvedMode = 'field' | 'online';

export type ChatResult = {
  stream: AsyncIterable<string>;
  citations: Citation[];
  mode: ResolvedMode;
};

const SYSTEM_PROMPT = `You are Stellar's Space Companion, a precise and patient astronomy assistant for telescope owners. Answer questions about the night sky, telescope use, and observation planning. Use the provided context when relevant and cite catalog IDs (e.g., M31, NGC 7000) when applicable. Be concise — 2 to 5 short sentences. If asked something outside astronomy, say so politely.`;

let cachedOnline: { value: boolean; until: number } | null = null;

async function isOnline(): Promise<boolean> {
  const now = Date.now();
  if (cachedOnline && cachedOnline.until > now) return cachedOnline.value;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch('https://www.google.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    const ok = res.status === 204 || res.ok;
    cachedOnline = { value: ok, until: now + 30_000 };
    return ok;
  } catch {
    cachedOnline = { value: false, until: now + 5_000 };
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// Llama 3.2 1B in QVAC ships with a small context window (~2k tokens).
// Keep only the last few turns of dialogue and cap the RAG snippet so we
// never exceed the budget regardless of how long the chat session runs.
const MAX_HISTORY_TURNS = 6; // 3 user + 3 assistant
const MAX_CONTEXT_CHARS = 1200;
const MAX_USER_CHARS = 600;

async function* fieldStream(
  userMessage: string,
  history: ChatMessage[],
  context: string,
): AsyncIterable<string> {
  const trimmedContext =
    context.length > MAX_CONTEXT_CHARS ? context.slice(0, MAX_CONTEXT_CHARS) + '…' : context;
  const augmentedSystem = trimmedContext
    ? `${SYSTEM_PROMPT}\n\nRelevant astronomy reference:\n${trimmedContext}`
    : SYSTEM_PROMPT;

  const recentHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-MAX_HISTORY_TURNS);

  const trimmedUser =
    userMessage.length > MAX_USER_CHARS ? userMessage.slice(0, MAX_USER_CHARS) + '…' : userMessage;

  const fullHistory: ChatMessage[] = [
    { role: 'system', content: augmentedSystem },
    ...recentHistory,
    { role: 'user', content: trimmedUser },
  ];

  yield* qvac.generate(fullHistory);
}

async function* onlineStream(
  userMessage: string,
  history: ChatMessage[],
): AsyncIterable<string> {
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

export async function startChat(
  userMessage: string,
  history: ChatMessage[],
  mode: CompanionMode = 'auto',
): Promise<ChatResult> {
  const useField = mode === 'field' || (mode === 'auto' && !(await isOnline()));
  const resolved: ResolvedMode = useField ? 'field' : 'online';

  const { context, citations } = await retrieveContext(userMessage);

  const stream = useField
    ? fieldStream(userMessage, history, context)
    : onlineStream(userMessage, history);

  return { stream, citations, mode: resolved };
}

export function clearOnlineCache() {
  cachedOnline = null;
}
