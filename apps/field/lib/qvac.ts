/**
 * Stub runtime for the verification build.
 *
 * The full QVAC integration (Llama + Whisper running on-device via the
 * @qvac/sdk Bare-runtime bridge) is implemented in commits prior to this
 * one — see git history and TETHER_QVAC_TRACK.md. EAS Build kept failing
 * during the QVAC native prebuild step (worker.mobile.bundle generation
 * via bare-pack), and we needed a working APK on hardware to verify the
 * rest of the app, so this module temporarily returns canned responses
 * instead of importing @qvac/sdk.
 *
 * Plan to re-enable: install Android Studio locally, use `npx expo
 * run:android --device` (the path the QVAC docs recommend over EAS for
 * the first build), confirm the prebuild plugin runs locally, then
 * restore the previous version of this file.
 */

export type LoadProgress = {
  phase: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  bytesDownloaded?: number;
  bytesTotal?: number;
  message?: string;
  error?: string;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type Listener = (p: LoadProgress) => void;

const STUB_REPLY = `On-device AI is currently disabled in this build while we finish wiring the Tether QVAC native modules. The full integration is implemented (lib/qvac.ts in earlier commits) and works in development; the EAS build pipeline needs additional setup that requires a local Android Studio toolchain. Once that's resolved, this same chat will be answered by Llama 3.2 1B running entirely on this phone.`;

const STUB_TRANSCRIPT = `M31 Andromeda, 25mm Plossl at 100x, faint dust lane visible, seeing 7 of 10`;

class StubProgress {
  private state: LoadProgress = { phase: 'ready', message: 'AI runtime stub' };
  private listeners = new Set<Listener>();

  get() {
    return this.state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }
}

class QvacRuntime {
  private llmTracker = new StubProgress();
  private whisperTracker = new StubProgress();

  getProgress() {
    return this.llmTracker.get();
  }

  subscribe(fn: Listener) {
    return this.llmTracker.subscribe(fn);
  }

  getWhisperProgress() {
    return this.whisperTracker.get();
  }

  subscribeWhisper(fn: Listener) {
    return this.whisperTracker.subscribe(fn);
  }

  async ensureReady(): Promise<void> {
    return;
  }

  async ensureWhisperReady(): Promise<void> {
    return;
  }

  async *generate(_history: ChatMessage[]): AsyncIterable<string> {
    const tokens = STUB_REPLY.split(/(\s+)/);
    for (const t of tokens) {
      await new Promise((r) => setTimeout(r, 18));
      yield t;
    }
  }

  async embed(_text: string): Promise<number[] | null> {
    return null;
  }

  async transcribe(_audioPath: string): Promise<string> {
    await new Promise((r) => setTimeout(r, 600));
    return STUB_TRANSCRIPT;
  }

  hasEmbedder() {
    return false;
  }
}

export const qvac = new QvacRuntime();
