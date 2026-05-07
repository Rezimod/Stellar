import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { qvac, type ChatMessage, type LoadProgress } from '../lib/qvac';
import { startChat, type CompanionMode, type ResolvedMode } from '../lib/companion';
import type { Citation } from '../lib/rag';
import { ModelLoadingBanner } from './ModelLoadingBanner';

type AssistantTurn = {
  role: 'assistant';
  content: string;
  resolvedMode: ResolvedMode;
  citations: Citation[];
};

type Turn = ChatMessage | AssistantTurn;

const STARTER_PROMPTS = [
  'What is M31?',
  'Best telescope target tonight?',
  'How do I collimate a Newtonian?',
  'What can I see with binoculars?',
];

export function FieldChatScreen() {
  const [progress, setProgress] = useState<LoadProgress>(qvac.getProgress());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<{
    text: string;
    resolvedMode: ResolvedMode;
    citations: Citation[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<CompanionMode>('auto');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = qvac.subscribe(setProgress);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    qvac.ensureReady().catch(() => {});
  }, []);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setBusy(true);

    const history: ChatMessage[] = turns.map((t) =>
      t.role === 'assistant'
        ? ({ role: 'assistant', content: t.content } as ChatMessage)
        : (t as ChatMessage),
    );
    const newTurns: Turn[] = [...turns, { role: 'user', content: message }];
    setTurns(newTurns);

    try {
      const { stream, citations, mode: resolvedMode } = await startChat(message, history, mode);
      setStreaming({ text: '', resolvedMode, citations });

      let acc = '';
      for await (const tok of stream) {
        acc += tok;
        setStreaming({ text: acc, resolvedMode, citations });
        scrollRef.current?.scrollToEnd({ animated: false });
      }

      setTurns([
        ...newTurns,
        { role: 'assistant', content: acc, resolvedMode, citations },
      ]);
      setStreaming(null);
    } catch (err: any) {
      setTurns([
        ...newTurns,
        {
          role: 'assistant',
          content: `Error: ${err?.message ?? err}`,
          resolvedMode: 'field',
          citations: [],
        },
      ]);
      setStreaming(null);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    progress.phase === 'ready'
      ? 'ON-DEVICE · READY'
      : progress.phase === 'downloading'
      ? 'DOWNLOADING MODEL'
      : progress.phase === 'loading'
      ? 'WARMING MODEL'
      : progress.phase === 'error'
      ? 'MODEL UNAVAILABLE'
      : 'INITIALIZING';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Stellar Field</Text>
          <View style={[styles.statusDot, statusDotColor(progress.phase)]} />
        </View>
        <Text style={styles.statusStrip}>
          {statusLabel}  ·  LLAMA 3.2 1B  ·  TETHER QVAC
        </Text>
        <View style={styles.modeRow}>
          {(['auto', 'field', 'online'] as CompanionMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeChip, mode === m && styles.modeChipActive]}
            >
              <Text style={[styles.modeChipText, mode === m && styles.modeChipTextActive]}>
                {m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ModelLoadingBanner progress={progress} />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {turns.length === 0 && progress.phase === 'ready' && (
          <View style={styles.starterWrap}>
            <Text style={styles.hint}>
              Ask anything about the night sky. In FIELD mode the model runs entirely on this device — no
              signal needed.
            </Text>
            <View style={styles.starterChips}>
              {STARTER_PROMPTS.map((p) => (
                <TouchableOpacity key={p} style={styles.starterChip} onPress={() => send(p)}>
                  <Text style={styles.starterChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {turns.map((m, i) =>
          m.role === 'user' ? (
            <View key={i} style={[styles.bubble, styles.userBubble]}>
              <Text style={[styles.bubbleText, styles.userBubbleText]}>{m.content}</Text>
            </View>
          ) : (
            <View key={i}>
              <View style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.bubbleText}>{m.content}</Text>
              </View>
              <AssistantFooter
                resolvedMode={(m as AssistantTurn).resolvedMode}
                citations={(m as AssistantTurn).citations}
              />
            </View>
          ),
        )}

        {streaming && (
          <View>
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.bubbleText}>{streaming.text || '…'}</Text>
            </View>
            <AssistantFooter resolvedMode={streaming.resolvedMode} citations={streaming.citations} />
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={progress.phase === 'ready' ? 'Ask the sky…' : 'Loading on-device AI…'}
          placeholderTextColor="#6B7280"
          style={styles.input}
          editable={!busy && progress.phase === 'ready'}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={() => send(input)}
          disabled={busy || progress.phase !== 'ready' || !input.trim()}
          style={[
            styles.sendBtn,
            (busy || progress.phase !== 'ready' || !input.trim()) && styles.sendBtnDisabled,
          ]}
        >
          <Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function statusDotColor(phase: LoadProgress['phase']) {
  switch (phase) {
    case 'ready':
      return { backgroundColor: '#14B8A6' };
    case 'error':
      return { backgroundColor: '#F87171' };
    default:
      return { backgroundColor: '#F59E0B' };
  }
}

function AssistantFooter({
  resolvedMode,
  citations,
}: {
  resolvedMode: ResolvedMode;
  citations: Citation[];
}) {
  if (citations.length === 0 && resolvedMode === 'online') return null;
  return (
    <View style={styles.assistantFooter}>
      <View
        style={[
          styles.modeBadge,
          resolvedMode === 'field' ? styles.modeBadgeField : styles.modeBadgeOnline,
        ]}
      >
        <Text style={styles.modeBadgeText}>
          {resolvedMode === 'field' ? 'ON-DEVICE' : 'CLAUDE'}
        </Text>
      </View>
      {citations.slice(0, 3).map((c) => (
        <View key={c.id} style={styles.citation}>
          <Text style={styles.citationText} numberOfLines={1}>
            {c.title}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1F2E',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { color: '#E5E7EB', fontSize: 20, fontWeight: '600', letterSpacing: 0.3 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusStrip: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1.2,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: '#252B3D',
  },
  modeChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  modeChipText: { color: '#9CA3AF', fontSize: 11, letterSpacing: 1, fontWeight: '600' },
  modeChipTextActive: { color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 32 },
  starterWrap: { gap: 14 },
  hint: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
  starterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  starterChip: {
    backgroundColor: '#1A1F2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#252B3D',
  },
  starterChipText: { color: '#E5E7EB', fontSize: 13 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: '88%' },
  userBubble: { backgroundColor: '#8B5CF6', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1A1F2E', alignSelf: 'flex-start' },
  bubbleText: { color: '#E5E7EB', fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#FFFFFF' },
  assistantFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginLeft: 4,
    maxWidth: '88%',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  modeBadgeField: { backgroundColor: '#14B8A622', borderWidth: 1, borderColor: '#14B8A655' },
  modeBadgeOnline: { backgroundColor: '#8B5CF622', borderWidth: 1, borderColor: '#8B5CF655' },
  modeBadgeText: {
    color: '#E5E7EB',
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '700',
  },
  citation: {
    backgroundColor: '#0F1320',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1A1F2E',
    maxWidth: 200,
  },
  citationText: { color: '#9CA3AF', fontSize: 10 },
  composer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#0B0E17',
    borderTopWidth: 1,
    borderTopColor: '#1A1F2E',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1F2E',
    color: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    backgroundColor: '#14B8A6',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 10,
  },
  sendBtnDisabled: { backgroundColor: '#1A1F2E' },
  sendText: { color: '#0B0E17', fontWeight: '700', fontSize: 14 },
});
