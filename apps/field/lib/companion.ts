import { qvac, type ChatMessage } from './qvac';
import { retrieveContext, type Citation } from './rag';

/** Field chat is QVAC-only — no cloud LLM proxy. */

export type ChatResult = {
  stream: AsyncIterable<string>;
  citations: Citation[];
};

const SYSTEM_PROMPT = `You are Stellar's Space Companion, a precise and patient astronomy assistant for telescope owners. Answer questions about the night sky, telescope use, and observation planning. Use the provided context when relevant and cite catalog IDs (e.g., M31, NGC 7000) when applicable. Be concise — 2 to 5 short sentences. If asked something outside astronomy, say so politely.`;

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

export async function startChat(userMessage: string, history: ChatMessage[]): Promise<ChatResult> {
  const { context, citations } = await retrieveContext(userMessage);
  const stream = fieldStream(userMessage, history, context);
  return { stream, citations };
}
