import 'react-native-get-random-values';

export type LoadProgress = {
  phase: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  bytesDownloaded?: number;
  bytesTotal?: number;
  message?: string;
  error?: string;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type Listener = (p: LoadProgress) => void;

class ProgressTracker {
  private state: LoadProgress = { phase: 'idle' };
  private listeners = new Set<Listener>();

  get(): LoadProgress {
    return this.state;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  emit(next: LoadProgress) {
    this.state = next;
    this.listeners.forEach((l) => l(next));
  }
}

class QvacRuntime {
  private llmModelId: string | null = null;
  private embedModelId: string | null = null;
  private whisperModelId: string | null = null;

  private llmTracker = new ProgressTracker();
  private whisperTracker = new ProgressTracker();

  private llmLoad: Promise<void> | null = null;
  private whisperLoad: Promise<void> | null = null;

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
    if (this.llmTracker.get().phase === 'ready') return;
    if (this.llmLoad) return this.llmLoad;

    this.llmLoad = (async () => {
      try {
        this.llmTracker.emit({
          phase: 'downloading',
          message: 'Fetching local model (~700MB, one-time)',
        });

        const sdk = await import('@qvac/sdk');
        const { loadModel, QWEN3_600M_INST_Q4, LLAMA_3_2_1B_INST_Q4_0 } = sdk as any;
        const modelSrc = QWEN3_600M_INST_Q4 ?? LLAMA_3_2_1B_INST_Q4_0;

        this.llmModelId = await loadModel({
          modelSrc,
          modelType: 'llm',
          modelConfig: { gpu_layers: 0, ctx_size: 512, n_threads: 1, no_mmap: true },
          onProgress: (p: { downloaded?: number; total?: number }) => {
            this.llmTracker.emit({
              phase: 'downloading',
              bytesDownloaded: p.downloaded,
              bytesTotal: p.total,
              message: 'Downloading Llama 3.2 1B',
            });
          },
        });

        this.llmTracker.emit({ phase: 'loading', message: 'Warming model' });

        try {
          const embedSrc = (sdk as any).EMBED_NOMIC_V1_5 ?? (sdk as any).EMBED_BGE_SMALL_EN ?? null;
          if (embedSrc) {
            this.embedModelId = await loadModel({ modelSrc: embedSrc, modelType: 'embed' });
          }
        } catch {
          this.embedModelId = null;
        }

        this.llmTracker.emit({ phase: 'ready', message: 'On-device AI ready' });
      } catch (err: any) {
        this.llmTracker.emit({ phase: 'error', error: err?.message ?? String(err) });
        throw err;
      }
    })();

    return this.llmLoad;
  }

  async ensureWhisperReady(): Promise<void> {
    if (this.whisperTracker.get().phase === 'ready') return;
    if (this.whisperLoad) return this.whisperLoad;

    this.whisperLoad = (async () => {
      try {
        this.whisperTracker.emit({
          phase: 'downloading',
          message: 'Fetching speech recognizer (~150MB, one-time)',
        });

        const sdk = await import('@qvac/sdk');
        const loadModel = (sdk as any).loadModel;
        const whisperSrc =
          (sdk as any).WHISPER_BASE_EN ??
          (sdk as any).WHISPER_TINY_EN ??
          (sdk as any).WHISPER_BASE ??
          (sdk as any).WHISPER_TINY ??
          null;

        if (!loadModel || !whisperSrc) {
          throw new Error('Whisper model constants not exported by @qvac/sdk');
        }

        this.whisperModelId = await loadModel({
          modelSrc: whisperSrc,
          modelType: 'transcription',
          onProgress: (p: { downloaded?: number; total?: number }) => {
            this.whisperTracker.emit({
              phase: 'downloading',
              bytesDownloaded: p.downloaded,
              bytesTotal: p.total,
              message: 'Downloading Whisper',
            });
          },
        });

        this.whisperTracker.emit({ phase: 'ready', message: 'Speech recognizer ready' });
      } catch (err: any) {
        this.whisperTracker.emit({ phase: 'error', error: err?.message ?? String(err) });
        throw err;
      }
    })();

    return this.whisperLoad;
  }

  async *generate(history: ChatMessage[]): AsyncIterable<string> {
    await this.ensureReady();
    if (!this.llmModelId) throw new Error('LLM not loaded');

    const sdk = await import('@qvac/sdk');
    const { completion } = sdk as any;

    const result = completion({ modelId: this.llmModelId, history, stream: true });
    for await (const token of result.tokenStream) {
      yield token as string;
    }
  }

  async embed(text: string): Promise<number[] | null> {
    await this.ensureReady();
    if (!this.embedModelId) return null;

    const sdk = await import('@qvac/sdk');
    const embedFn = (sdk as any).embed;
    if (!embedFn) return null;

    const out = await embedFn({ modelId: this.embedModelId, text });
    return Array.isArray(out) ? out : (out?.vector ?? null);
  }

  async transcribe(audioPath: string): Promise<string> {
    await this.ensureWhisperReady();
    if (!this.whisperModelId) throw new Error('Whisper not loaded');

    const sdk = await import('@qvac/sdk');
    const transcribeFn = (sdk as any).transcribe;
    if (!transcribeFn) throw new Error('@qvac/sdk has no transcribe export');

    const out = await transcribeFn({ modelId: this.whisperModelId, audioPath });
    if (typeof out === 'string') return out;
    if (out?.text) return out.text;
    if (Array.isArray(out?.segments)) return out.segments.map((s: any) => s.text ?? '').join(' ');
    return '';
  }

  hasEmbedder() {
    return this.embedModelId != null;
  }
}

export const qvac = new QvacRuntime();
