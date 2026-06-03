import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from './qvac';
import type { Citation } from './rag';
import type { LiveSky } from './agent';

/**
 * On-device conversation history. Stored locally (AsyncStorage) so the Field
 * companion keeps its chats at a dark-sky site with no signal — same offline-first
 * principle as the rest of the app.
 */

export type AssistantTurn = {
  role: 'assistant';
  content: string;
  citations: Citation[];
  toolsUsed?: string[];
  live?: LiveSky;
};

export type Turn = ChatMessage | AssistantTurn;

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  turns: Turn[];
};

const KEY = 'field.conversations.v1';

export async function loadConversations(): Promise<Conversation[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Conversation[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export async function saveConversations(list: Conversation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* best-effort; history is non-critical */
  }
}

export function titleFromTurns(turns: Turn[]): string {
  const first = turns.find((t) => t.role === 'user');
  const text = first?.content?.trim() || 'New chat';
  return text.length > 38 ? text.slice(0, 38).trimEnd() + '…' : text;
}

export function newConversationId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function relativeTime(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
