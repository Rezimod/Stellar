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
import { chat, type CompanionMode } from '../lib/companion';
import { ModelLoadingBanner } from './ModelLoadingBanner';

export function FieldChatScreen() {
  const [progress, setProgress] = useState<LoadProgress>(qvac.getProgress());
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
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

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    const newHistory: ChatMessage[] = [...history, { role: 'user', content: text }];
    setHistory(newHistory);
    setStreaming('');

    try {
      let acc = '';
      for await (const tok of chat(text, history, mode)) {
        acc += tok;
        setStreaming(acc);
        scrollRef.current?.scrollToEnd({ animated: false });
      }
      setHistory([...newHistory, { role: 'assistant', content: acc }]);
      setStreaming('');
    } catch (err: any) {
      setHistory([...newHistory, { role: 'assistant', content: `Error: ${err?.message ?? err}` }]);
      setStreaming('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Stellar Field</Text>
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

      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {history.length === 0 && progress.phase === 'ready' && (
          <Text style={styles.hint}>
            Ask anything about the night sky. In FIELD mode, the LLM runs entirely on this device — no
            signal needed.
          </Text>
        )}
        {history.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, m.role === 'user' && styles.userBubbleText]}>
              {m.content}
            </Text>
          </View>
        ))}
        {streaming.length > 0 && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <Text style={styles.bubbleText}>{streaming}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={progress.phase === 'ready' ? 'Ask the sky...' : 'Loading on-device AI...'}
          placeholderTextColor="#6B7280"
          style={styles.input}
          editable={!busy && progress.phase === 'ready'}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={send}
          disabled={busy || progress.phase !== 'ready' || !input.trim()}
          style={[
            styles.sendBtn,
            (busy || progress.phase !== 'ready' || !input.trim()) && styles.sendBtnDisabled,
          ]}
        >
          <Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>Powered by Tether QVAC · Llama 3.2 1B · on-device</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  header: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: '#E5E7EB', fontSize: 22, fontWeight: '600', letterSpacing: 0.3 },
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
  modeChipText: { color: '#9CA3AF', fontSize: 11, letterSpacing: 1 },
  modeChipTextActive: { color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },
  hint: { color: '#6B7280', fontSize: 14, lineHeight: 20, padding: 12 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: '88%' },
  userBubble: { backgroundColor: '#8B5CF6', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1A1F2E', alignSelf: 'flex-start' },
  bubbleText: { color: '#E5E7EB', fontSize: 15, lineHeight: 21 },
  userBubbleText: { color: '#FFFFFF' },
  composer: {
    flexDirection: 'row',
    padding: 12,
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
  footer: {
    color: '#4B5563',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
});
