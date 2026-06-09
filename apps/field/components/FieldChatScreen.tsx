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
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createAudioPlayer } from 'expo-audio';
import { qvac, type ChatMessage, type LoadProgress } from '../lib/qvac';
import { startChat } from '../lib/companion';
import { runSkyAgent, type LiveSky, type OrchestrationStep } from '../lib/agent';
import { identifyImage } from '../lib/vision';
import { getObserverLocation, DEFAULT_OBSERVER, type Observer } from '../lib/location';
import { looksLikeSkyQuery } from '../lib/router';
import { warmCorpusEmbeddings } from '../lib/rag';
import type { Citation } from '../lib/rag';
import {
  loadConversations,
  saveConversations,
  titleFromTurns,
  newConversationId,
  type Conversation,
  type Turn,
  type AssistantTurn,
} from '../lib/conversations';
import { ModelLoadingBanner } from './ModelLoadingBanner';
import { ChatDrawer } from './ChatDrawer';

const STARTER_PROMPTS = [
  'Is Saturn up right now?',
  'Best target tonight, and when?',
  'What is M31?',
];

export function FieldChatScreen() {
  const [progress, setProgress] = useState<LoadProgress>(qvac.getProgress());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState<{
    text: string;
    citations: Citation[];
    toolsUsed?: string[];
    live?: LiveSky;
    steps?: OrchestrationStep[];
    vision?: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [observer, setObserver] = useState<Observer>(DEFAULT_OBSERVER);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [vlmProgress, setVlmProgress] = useState<LoadProgress>(qvac.getVlmProgress());
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const unsub = qvac.subscribe(setProgress);
    const unsubVlm = qvac.subscribeVlm(setVlmProgress);
    return () => {
      unsub();
      unsubVlm();
    };
  }, []);

  // Load saved history once on mount (offline, on-device).
  useEffect(() => {
    loadConversations().then(setConversations).catch(() => {});
  }, []);

  // Persist the current chat after a completed turn; create on first message.
  function persist(finalTurns: Turn[]) {
    setConversations((prev) => {
      const id = activeId ?? newConversationId();
      if (!activeId) setActiveId(id);
      const existing = prev.find((c) => c.id === id);
      const conv: Conversation = {
        id,
        title: existing?.title || titleFromTurns(finalTurns),
        updatedAt: Date.now(),
        turns: finalTurns,
      };
      const next = [conv, ...prev.filter((c) => c.id !== id)].sort((a, b) => b.updatedAt - a.updatedAt);
      saveConversations(next);
      return next;
    });
  }

  function newChat() {
    setTurns([]);
    setStreaming(null);
    setActiveId(null);
    setInput('');
    setDrawerOpen(false);
  }

  function selectConversation(id: string) {
    const conv = conversations.find((c) => c.id === id);
    if (conv) {
      setTurns(conv.turns);
      setActiveId(id);
      setStreaming(null);
    }
    setDrawerOpen(false);
  }

  function deleteConversation(id: string) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConversations(next);
      return next;
    });
    if (id === activeId) newChat();
  }

  useEffect(() => {
    qvac
      .ensureReady()
      .then(() => warmCorpusEmbeddings())
      .catch(() => {});
  }, []);

  useEffect(() => {
    getObserverLocation().then(setObserver).catch(() => {});
  }, []);

  async function pickImage() {
    if (busy || progress.phase !== 'ready') return;
    Alert.alert('Identify a photo', 'Point the camera at your gear or the sky, or pick a photo.', [
      {
        text: 'Take photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true });
          if (!res.canceled) setAttachment(res.assets[0].uri);
        },
      },
      {
        text: 'Choose photo',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) return;
          const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.6, allowsEditing: true });
          if (!res.canceled) setAttachment(res.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function sendImage(imageUri: string, text: string) {
    setBusy(true);
    setInput('');
    setAttachment(null);

    const newTurns: Turn[] = [...turns, { role: 'user', content: text, imageUri }];
    setTurns(newTurns);
    setStreaming({ text: 'Looking at your photo…', citations: [] });

    try {
      const { stream } = await identifyImage(imageUri, text);
      let acc = '';
      setStreaming({ text: '', citations: [], vision: true });
      for await (const tok of stream) {
        acc += tok;
        setStreaming({ text: acc, citations: [], vision: true });
        scrollRef.current?.scrollToEnd({ animated: false });
      }
      const done: Turn[] = [...newTurns, { role: 'assistant', content: acc, citations: [], vision: true }];
      setTurns(done);
      setStreaming(null);
      persist(done);
    } catch (err: any) {
      const done: Turn[] = [
        ...newTurns,
        { role: 'assistant', content: `Vision error: ${err?.message ?? err}`, citations: [] },
      ];
      setTurns(done);
      setStreaming(null);
      persist(done);
    } finally {
      setBusy(false);
    }
  }

  async function send(text: string) {
    if (attachment) {
      await sendImage(attachment, text.trim() || 'What is this?');
      return;
    }
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

    const sky = looksLikeSkyQuery(message);
    setStreaming({ text: sky ? 'Checking the live sky…' : '', citations: [] });

    try {
      if (sky) {
        const { stream, toolsUsed, live, steps } = await runSkyAgent(
          message,
          history,
          observer.lat,
          observer.lon,
        );
        let acc = '';
        setStreaming({ text: '', citations: [], toolsUsed, live, steps });
        for await (const tok of stream) {
          acc += tok;
          setStreaming({ text: acc, citations: [], toolsUsed, live, steps });
          scrollRef.current?.scrollToEnd({ animated: false });
        }
        const done: Turn[] = [...newTurns, { role: 'assistant', content: acc, citations: [], toolsUsed, live, steps }];
        setTurns(done);
        setStreaming(null);
        persist(done);
      } else {
        const { stream, citations } = await startChat(message, history);
        setStreaming({ text: '', citations });

        let acc = '';
        for await (const tok of stream) {
          acc += tok;
          setStreaming({ text: acc, citations });
          scrollRef.current?.scrollToEnd({ animated: false });
        }

        const done: Turn[] = [...newTurns, { role: 'assistant', content: acc, citations }];
        setTurns(done);
        setStreaming(null);
        persist(done);
      }
    } catch (err: any) {
      const done: Turn[] = [
        ...newTurns,
        { role: 'assistant', content: `Error: ${err?.message ?? err}`, citations: [] },
      ];
      setTurns(done);
      setStreaming(null);
      persist(done);
    } finally {
      setBusy(false);
    }
  }

  const statusLabel =
    progress.phase === 'ready'
      ? 'READY'
      : progress.phase === 'downloading'
      ? 'DOWNLOADING'
      : progress.phase === 'loading'
      ? 'WARMING UP'
      : progress.phase === 'error'
      ? 'UNAVAILABLE'
      : 'INITIALIZING';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Stellar Field</Text>
          <View style={[styles.statusDot, statusDotColor(progress.phase)]} />
          <Text style={styles.statusPill}>{statusLabel}</Text>
          <TouchableOpacity
            onPress={newChat}
            style={styles.iconBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.newIcon}>✎</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Llama 3.2 1B</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>Powered by Tether QVAC</Text>
        </View>
      </View>

      <ModelLoadingBanner progress={progress} />
      {vlmProgress.phase !== 'idle' && vlmProgress.phase !== 'ready' && (
        <ModelLoadingBanner progress={vlmProgress} />
      )}

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
              Ask anything about the night sky — on-device, no signal needed. Tap ＋ to
              photograph your telescope, an eyepiece, or the sky and have Astra identify it.
            </Text>
            <Text style={styles.starterLabel}>Try</Text>
            <View style={styles.starterChips}>
              <TouchableOpacity style={[styles.starterChip, styles.starterChipVision]} onPress={pickImage}>
                <Text style={styles.starterChipText}>📷 Identify my gear</Text>
              </TouchableOpacity>
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
              {(m as ChatMessage).imageUri && (
                <Image source={{ uri: (m as ChatMessage).imageUri }} style={styles.bubbleImage} />
              )}
              {!!m.content && (
                <Text style={[styles.bubbleText, styles.userBubbleText]}>{m.content}</Text>
              )}
            </View>
          ) : (
            <View key={i}>
              <View style={[styles.bubble, styles.aiBubble]}>
                <Text style={styles.bubbleText}>{m.content}</Text>
              </View>
              <View style={styles.aiActions}>
                <AssistantFooter citations={(m as AssistantTurn).citations} live={(m as AssistantTurn).live} steps={(m as AssistantTurn).steps} vision={(m as AssistantTurn).vision} />
                {!!m.content && <SpeakerButton text={m.content} />}
              </View>
            </View>
          ),
        )}

        {streaming && (
          <View>
            <View style={[styles.bubble, styles.aiBubble]}>
              <Text style={styles.bubbleText}>{streaming.text || '…'}</Text>
            </View>
            <AssistantFooter citations={streaming.citations} live={streaming.live} steps={streaming.steps} vision={streaming.vision} />
          </View>
        )}
      </ScrollView>

      {attachment && (
        <View style={styles.attachStrip}>
          <Image source={{ uri: attachment }} style={styles.attachThumb} />
          <Text style={styles.attachLabel} numberOfLines={1}>Photo attached — Astra will identify it on-device</Text>
          <TouchableOpacity onPress={() => setAttachment(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.attachRemove}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.composer}>
        <TouchableOpacity
          onPress={pickImage}
          disabled={busy || progress.phase !== 'ready'}
          style={[styles.attachBtn, (busy || progress.phase !== 'ready') && styles.sendBtnDisabled]}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.attachIcon}>＋</Text>
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={
            progress.phase !== 'ready'
              ? 'Loading on-device AI…'
              : attachment
              ? 'Add a question (optional)…'
              : 'Ask the sky…'
          }
          placeholderTextColor="#6B7280"
          style={styles.input}
          editable={!busy && progress.phase === 'ready'}
          onSubmitEditing={() => send(input)}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={() => send(input)}
          disabled={busy || progress.phase !== 'ready' || (!input.trim() && !attachment)}
          style={[
            styles.sendBtn,
            (busy || progress.phase !== 'ready' || (!input.trim() && !attachment)) && styles.sendBtnDisabled,
          ]}
        >
          <Text style={styles.sendText}>{busy ? '…' : '↑'}</Text>
        </TouchableOpacity>
      </View>

      <ChatDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={newChat}
        onDelete={deleteConversation}
        observer={observer}
      />
    </KeyboardAvoidingView>
  );
}

/** Read an assistant answer aloud with the on-device QVAC TTS voice (Supertonic). */
function SpeakerButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);

  useEffect(
    () => () => {
      try {
        playerRef.current?.remove();
      } catch {
        /* noop */
      }
    },
    [],
  );

  async function onPress() {
    if (state === 'loading') return;
    if (state === 'playing') {
      try {
        playerRef.current?.remove();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      setState('idle');
      return;
    }
    setState('loading');
    try {
      const uri = await qvac.speak(text.slice(0, 600));
      const player = createAudioPlayer(uri);
      playerRef.current = player;
      player.addListener('playbackStatusUpdate', (s: { didJustFinish?: boolean }) => {
        if (s?.didJustFinish) {
          setState('idle');
          try {
            player.remove();
          } catch {
            /* noop */
          }
        }
      });
      player.play();
      setState('playing');
    } catch (err: any) {
      setState('idle');
      Alert.alert('Voice unavailable', err?.message ?? 'Could not synthesize speech.');
    }
  }

  return (
    <TouchableOpacity onPress={onPress} style={styles.speakBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Text style={styles.speakIcon}>{state === 'loading' ? '…' : state === 'playing' ? '◼' : '🔊'}</Text>
    </TouchableOpacity>
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

function fmtTime(iso: string | null): string {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
}

function formatLiveSky(live: LiveSky): string {
  if (live.kind === 'plan') {
    const when = live.darkStart ? `dark from ${fmtTime(live.darkStart)}` : 'dark now';
    const targets = live.bodies.length ? live.bodies.map((b) => b.name).join(', ') : 'deep-sky objects';
    return `Tonight · ${when} · Moon ${live.moonPct}% (${live.moonInterference}) · ${targets}`;
  }
  if (live.kind === 'body' || live.kind === 'dso') {
    if (!live.aboveHorizon) return `${live.name} · below horizon · not up`;
    const status = live.daylight ? 'daytime · not viewable' : 'viewable now';
    return `${live.name} · ${live.altitude}° · ${live.direction} · ${status}`;
  }
  if (live.daylight) return 'Daytime · nothing observable now';
  if (live.bodies.length === 0) return 'Nothing above the horizon';
  return 'Up: ' + live.bodies.map((b) => `${b.name} ${b.altitude}° ${b.direction}`).join(' · ');
}

const TOOL_LABELS: Record<string, string> = {
  get_visible_now: 'visible now',
  get_tonight_targets: 'tonight',
  get_body_position: 'planet/moon',
  get_object_position: 'deep-sky',
  get_moon_conditions: 'moon',
  get_dark_window: 'dark window',
};
function toolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/^get_/, '').replace(/_/g, ' ');
}

function AssistantFooter({
  citations,
  live,
  steps,
  vision,
}: {
  citations: Citation[];
  live?: LiveSky;
  steps?: OrchestrationStep[];
  vision?: boolean;
}) {
  // Vision answer — on-device VLM identified an attached photo.
  if (vision) {
    return (
      <View style={styles.assistantFooter}>
        <View style={[styles.modeBadge, styles.modeBadgeVision]}>
          <Text style={styles.modeBadgeText}>VISION</Text>
        </View>
        <View style={styles.citation}>
          <Text style={styles.citationText} numberOfLines={1}>on-device · photo never left your phone</Text>
        </View>
      </View>
    );
  }
  // Agent answer — grounded in live, on-device sky data (not the RAG corpus).
  if (live) {
    return (
      <View style={styles.agentFooter}>
        {steps && steps.length > 0 && (
          <View style={styles.trace}>
            <Text style={styles.traceLabel}>ORCHESTRATED</Text>
            {steps.map((s, i) => (
              <View key={i} style={styles.traceItem}>
                <View style={[styles.toolChip, !s.ok && styles.toolChipErr]}>
                  <Text style={styles.toolChipText}>{toolLabel(s.tool)}</Text>
                </View>
                {i < steps.length - 1 && <Text style={styles.traceArrow}>→</Text>}
              </View>
            ))}
          </View>
        )}
        <View style={styles.assistantFooter}>
          <View style={[styles.modeBadge, styles.modeBadgeLive]}>
            <Text style={styles.modeBadgeText}>LIVE SKY</Text>
          </View>
          <View style={styles.liveReadout}>
            <Text style={styles.liveReadoutText} numberOfLines={2}>{formatLiveSky(live)}</Text>
          </View>
        </View>
      </View>
    );
  }
  if (citations.length === 0) return null;
  return (
    <View style={styles.assistantFooter}>
      <View style={[styles.modeBadge, styles.modeBadgeField]}>
        <Text style={styles.modeBadgeText}>QVAC</Text>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  menuIcon: { color: '#9CA3AF', fontSize: 20, lineHeight: 22, marginTop: -1 },
  newIcon: { color: '#9CA3AF', fontSize: 17, lineHeight: 20 },
  title: { color: '#F3F4F6', fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPill: {
    marginLeft: 'auto',
    color: '#7DD3C4',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  metaText: { color: '#6B7280', fontSize: 11, letterSpacing: 0.2 },
  metaDot: { color: '#374151', fontSize: 11 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10, paddingBottom: 32 },
  starterWrap: { gap: 10 },
  hint: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, paddingHorizontal: 4 },
  starterLabel: {
    color: '#6B7280',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  starterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  starterChip: {
    backgroundColor: '#141823',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#222838',
  },
  starterChipVision: { backgroundColor: '#171426', borderColor: '#3A2E5E' },
  starterChipText: { color: '#9CA3AF', fontSize: 12 },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 16, maxWidth: '88%' },
  userBubble: { backgroundColor: '#7C5CFF', alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: {
    backgroundColor: '#141B2A',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#222C40',
  },
  bubbleText: { color: '#E5E7EB', fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#FFFFFF' },
  bubbleImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: '#0B0E17',
    resizeMode: 'cover',
  },
  aiActions: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  speakBtn: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#222C40',
    backgroundColor: '#141B2A',
  },
  speakIcon: { fontSize: 12, color: '#9CA3AF' },
  agentFooter: { marginTop: 4, marginLeft: 4, maxWidth: '92%', gap: 6 },
  trace: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  traceLabel: {
    color: '#5C6678',
    fontSize: 8.5,
    letterSpacing: 1.2,
    fontWeight: '700',
    marginRight: 2,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  traceItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  traceArrow: { color: '#3C4658', fontSize: 11 },
  toolChip: {
    backgroundColor: '#14B8A614',
    borderWidth: 1,
    borderColor: '#14B8A640',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  toolChipErr: { backgroundColor: '#F8717118', borderColor: '#F8717155' },
  toolChipText: {
    color: '#7DD3C4',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  assistantFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  modeBadgeField: { backgroundColor: '#14B8A622', borderWidth: 1, borderColor: '#14B8A655' },
  modeBadgeLive: { backgroundColor: '#F59E0B22', borderWidth: 1, borderColor: '#F59E0B66' },
  modeBadgeVision: { backgroundColor: '#7C5CFF22', borderWidth: 1, borderColor: '#7C5CFF66' },
  liveReadout: {
    flex: 1,
    backgroundColor: '#0F1320',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B33',
  },
  liveReadoutText: {
    color: '#F4C572',
    fontSize: 10.5,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.2,
  },
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
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 8,
    backgroundColor: '#0B0E17',
    borderTopWidth: 1,
    borderTopColor: '#1A2030',
  },
  attachStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 8,
    backgroundColor: '#0B0E17',
  },
  attachThumb: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#141A28' },
  attachLabel: { flex: 1, color: '#9CA3AF', fontSize: 12 },
  attachRemove: { color: '#6B7280', fontSize: 22, lineHeight: 24, paddingHorizontal: 4 },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141A28',
    borderWidth: 1,
    borderColor: '#222B3D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: { color: '#7DD3C4', fontSize: 22, lineHeight: 24, marginTop: -1 },
  input: {
    flex: 1,
    backgroundColor: '#141A28',
    color: '#E5E7EB',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#222B3D',
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#14B8A6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#1A2030' },
  sendText: { color: '#06281F', fontWeight: '800', fontSize: 20, lineHeight: 22 },
});
