import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { qvac, type LoadProgress } from '../lib/qvac';
import { extractFromTranscript, type Extracted } from '../lib/extract';
import {
  saveObservation,
  flushQueue,
  getQueue,
  type QueuedObservation,
  type SaveResult,
} from '../lib/observations';
import { ModelLoadingBanner } from './ModelLoadingBanner';
import { MicButton } from './MicButton';
import { useUserId } from '../lib/user';

type Status = 'idle' | 'recording' | 'transcribing' | 'review' | 'saving';

export function VoiceLogScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);
  const userId = useUserId();

  const [whisperProgress, setWhisperProgress] = useState<LoadProgress>(qvac.getWhisperProgress());
  const [status, setStatus] = useState<Status>('idle');
  const [transcript, setTranscript] = useState('');
  const [target, setTarget] = useState('');
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [queue, setQueue] = useState<QueuedObservation[]>([]);
  const [lastResult, setLastResult] = useState<SaveResult | null>(null);

  useEffect(() => {
    const unsub = qvac.subscribeWhisper(setWhisperProgress);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermGranted(granted);
      if (granted) {
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
    })();
    refreshQueue();
  }, []);

  async function refreshQueue() {
    setQueue(await getQueue());
  }

  async function handlePressIn() {
    if (!permGranted) {
      const { granted } = await requestRecordingPermissionsAsync();
      setPermGranted(granted);
      if (!granted) return;
    }
    if (status !== 'idle' && status !== 'review') return;
    try {
      setTranscript('');
      setTarget('');
      setExtracted(null);
      setLastResult(null);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('recording');
    } catch (err: any) {
      Alert.alert('Recording error', err?.message ?? String(err));
      setStatus('idle');
    }
  }

  async function handlePressOut() {
    if (status !== 'recording') return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Recorder produced no audio file');
      setStatus('transcribing');

      qvac.ensureWhisperReady().catch(() => {});
      const text = await qvac.transcribe(uri);
      const cleaned = text.trim();
      setTranscript(cleaned);
      const ext = extractFromTranscript(cleaned);
      setExtracted(ext);
      setTarget(ext.target ?? '');
      setStatus(cleaned ? 'review' : 'idle');
    } catch (err: any) {
      Alert.alert('Transcription failed', err?.message ?? String(err));
      setStatus('idle');
    }
  }

  async function handleSave() {
    const notes = transcript.trim();
    if (!notes) return;
    const finalTarget = target.trim() || extracted?.target || 'Unspecified';

    setStatus('saving');
    try {
      const result = await saveObservation({
        user_id: userId,
        target: finalTarget,
        notes,
        source: 'voice',
      });
      setLastResult(result);
      setTranscript('');
      setTarget('');
      setExtracted(null);
      await refreshQueue();

      if (result.status === 'queued' && result.reason === 'offline') {
        await flushQueue().catch(() => {});
        await refreshQueue();
      }
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? String(err));
    } finally {
      setStatus('idle');
    }
  }

  async function handleSyncQueue() {
    const r = await flushQueue();
    await refreshQueue();
    Alert.alert('Sync', `Synced ${r.synced}, still queued ${r.failed}`);
  }

  const recordingMs = recorderState.durationMillis ?? 0;
  const micDisabled =
    permGranted === false ||
    status === 'transcribing' ||
    status === 'saving';
  const micBusy = status === 'transcribing' || status === 'saving';

  const lastResultText = useMemo(() => {
    if (!lastResult) return null;
    if (lastResult.status === 'synced') return 'Saved to your observation log.';
    if (lastResult.reason === 'offline') return 'Saved locally — will sync when back online.';
    if (lastResult.reason === 'no-supabase') return 'Saved locally (Supabase not configured).';
    return `Saved locally — sync error: ${lastResult.error ?? 'unknown'}`;
  }, [lastResult]);

  const whisperLabel =
    whisperProgress.phase === 'ready'
      ? 'WHISPER · READY'
      : whisperProgress.phase === 'downloading'
      ? 'DOWNLOADING WHISPER'
      : whisperProgress.phase === 'loading'
      ? 'WARMING WHISPER'
      : whisperProgress.phase === 'error'
      ? 'WHISPER UNAVAILABLE'
      : 'IDLE · TAP MIC TO START';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Voice Log</Text>
          <View
            style={[
              styles.statusDot,
              whisperProgress.phase === 'ready'
                ? { backgroundColor: '#14B8A6' }
                : whisperProgress.phase === 'error'
                ? { backgroundColor: '#F87171' }
                : { backgroundColor: '#F59E0B' },
            ]}
          />
        </View>
        <Text style={styles.statusStrip}>
          {whisperLabel}  ·  ON-DEVICE STT  ·  TETHER QVAC
        </Text>
        <Text style={styles.subtitle}>
          Record observations at the eyepiece. Whisper transcribes locally — no signal needed.
        </Text>
      </View>

      <ModelLoadingBanner progress={whisperProgress} />

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <MicButton
          isRecording={status === 'recording'}
          durationMs={recordingMs}
          disabled={micDisabled}
          busy={micBusy}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        />

        {permGranted === false && (
          <Text style={styles.warning}>
            Microphone permission is denied. Enable it in Settings to record observations.
          </Text>
        )}

        {(status === 'review' || status === 'saving') && (
          <View style={styles.reviewCard}>
            <Text style={styles.fieldLabel}>Target</Text>
            <TextInput
              style={styles.input}
              value={target}
              onChangeText={setTarget}
              placeholder="M31, Saturn, NGC 7000…"
              placeholderTextColor="#6B7280"
              autoCapitalize="characters"
            />

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={transcript}
              onChangeText={setTranscript}
              placeholder="Transcribed observation"
              placeholderTextColor="#6B7280"
              multiline
              textAlignVertical="top"
            />

            {extracted && (extracted.magnification || extracted.seeing || extracted.transparency) && (
              <View style={styles.hintRow}>
                {extracted.magnification ? (
                  <Hint label={`${extracted.magnification}x`} />
                ) : null}
                {extracted.seeing != null ? (
                  <Hint label={`Seeing ${extracted.seeing}/10`} />
                ) : null}
                {extracted.transparency != null ? (
                  <Hint label={`Trans. ${extracted.transparency}/5`} />
                ) : null}
              </View>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, status === 'saving' && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={status === 'saving' || !transcript.trim()}
            >
              <Text style={styles.saveText}>{status === 'saving' ? 'Saving…' : 'Save observation'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {lastResultText && status !== 'review' && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{lastResultText}</Text>
          </View>
        )}

        {queue.length > 0 && (
          <View style={styles.queueCard}>
            <View style={styles.queueHeader}>
              <Text style={styles.queueTitle}>Queued ({queue.length})</Text>
              <TouchableOpacity onPress={handleSyncQueue}>
                <Text style={styles.queueSync}>Sync now</Text>
              </TouchableOpacity>
            </View>
            {queue.slice(-5).reverse().map((q) => (
              <View key={q.local_id} style={styles.queueItem}>
                <Text style={styles.queueTarget}>{q.target}</Text>
                <Text style={styles.queueNotes} numberOfLines={2}>
                  {q.notes}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Hint({ label }: { label: string }) {
  return (
    <View style={styles.hint}>
      <Text style={styles.hintText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginBottom: 8,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  subtitle: { color: '#9CA3AF', fontSize: 13, lineHeight: 18 },
  body: { padding: 16, gap: 16, paddingBottom: 40 },
  warning: {
    color: '#F59E0B',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F59E0B11',
    borderWidth: 1,
    borderColor: '#F59E0B33',
    borderRadius: 8,
  },
  reviewCard: {
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  fieldLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#0B0E17',
    color: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#252B3D',
  },
  notesInput: { minHeight: 96 },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  hint: {
    backgroundColor: '#0F1320',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1A1F2E',
  },
  hintText: { color: '#9CA3AF', fontSize: 11, letterSpacing: 0.5 },
  saveBtn: {
    backgroundColor: '#14B8A6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnDisabled: { backgroundColor: '#1A1F2E' },
  saveText: { color: '#0B0E17', fontWeight: '700', fontSize: 14 },
  toast: {
    backgroundColor: '#14B8A622',
    borderColor: '#14B8A655',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toastText: { color: '#A7F3D0', fontSize: 13 },
  queueCard: {
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  queueTitle: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  queueSync: { color: '#14B8A6', fontSize: 12, letterSpacing: 0.5 },
  queueItem: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#252B3D' },
  queueTarget: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
  queueNotes: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
});
