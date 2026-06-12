import { qvac, type ChatMessage } from './qvac';
import { retrieveContext, type Citation } from './rag';
import { sanitizeUserText, INJECTION_GUARD, wrapUntrusted } from './sanitize';

/** Field chat is QVAC-only — no cloud LLM proxy. */

export type ChatResult = {
  stream: AsyncIterable<string>;
  citations: Citation[];
};

const SYSTEM_PROMPT = `You are Stellar's Space Companion for telescope owners. Answer astronomy, telescope, and observing questions from the provided context when relevant. Be concise: 2-4 short sentences. Cite catalog IDs when useful. If outside astronomy, say so briefly.`;

// Llama 3.2 1B in QVAC ships with a small context window (~2k tokens).
// Keep only the last few turns of dialogue and cap the RAG snippet so we
// never exceed the budget regardless of how long the chat session runs.
const MAX_HISTORY_TURNS = 4;
const MAX_CONTEXT_CHARS = 850;
const MAX_USER_CHARS = 600;

async function* fieldStream(
  userMessage: string,
  history: ChatMessage[],
  context: string,
): AsyncIterable<string> {
  const trimmedContext =
    context.length > MAX_CONTEXT_CHARS ? context.slice(0, MAX_CONTEXT_CHARS) + '…' : context;
  // Retrieved corpus text is fenced as untrusted reference, and the guard tells
  // the model not to obey any instructions that might be embedded in it.
  const augmentedSystem = trimmedContext
    ? `${SYSTEM_PROMPT}\n\n${INJECTION_GUARD}\n\n${wrapUntrusted('astronomy reference', trimmedContext)}`
    : `${SYSTEM_PROMPT}\n\n${INJECTION_GUARD}`;

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

export async function startChat(userMessageRaw: string, history: ChatMessage[]): Promise<ChatResult> {
  // Untrusted input (typed or voice-transcribed) — defang prompt injection.
  const userMessage = sanitizeUserText(userMessageRaw);
  const { context, citations } = await retrieveContext(userMessage);
  const stream = fieldStream(userMessage, history, context);
  return { stream, citations };
}
