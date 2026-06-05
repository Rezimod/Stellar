import 'react-native-get-random-values';

export type LoadProgress = {
  phase: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  bytesDownloaded?: number;
  bytesTotal?: number;
  message?: string;
  error?: string;
};

export type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };

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

  // QVAC runs ONE inference at a time (single-job worker). Every completion,
  // embedding, and transcription acquires this gate so a background job (e.g.
  // corpus-embedding warm-up) never collides with a user's chat message.
  private jobGate: Promise<void> = Promise.resolve();

  private async acquire(): Promise<() => void> {
    const prev = this.jobGate;
    let release!: () => void;
    this.jobGate = new Promise<void>((r) => (release = r));
    await prev;
    return release;
  }

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
        // One model serves both the RAG chat and the tool-calling agent — the
        // tool-calling 1B is instruction-tuned and answers general questions
        // fine, so we avoid loading a second ~700MB model on constrained phones.
        const { loadModel, LLAMA_TOOL_CALLING_1B_INST_Q4_K } = sdk as any;

        this.llmModelId = await loadModel({
          modelSrc: LLAMA_TOOL_CALLING_1B_INST_Q4_K,
          modelType: 'llm',
          // Enable native tool-calling so the model can orchestrate the sky tools.
          // (Without `tools: true` the model never emits tool calls — the cause of
          // the earlier "answered without calling" behaviour.) Larger ctx holds the
          // tool descriptors + multi-step tool results.
          modelConfig: { ctx_size: 4096, tools: true },
          onProgress: (p: { downloaded?: number; total?: number }) => {
            this.llmTracker.emit({
              phase: 'downloading',
              bytesDownloaded: p.downloaded,
              bytesTotal: p.total,
              message: 'Downloading Llama 3.2 1B (tool-calling)',
            });
          },
        });

        this.llmTracker.emit({ phase: 'loading', message: 'Warming model' });

        try {
          const embedSrc =
            (sdk as any).EMBEDDINGGEMMA_300M_Q4_0 ??
            (sdk as any).EMBEDDINGGEMMA_300M_Q8_0 ??
            null;
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

  /** Ensure the shared LLM is loaded and return its id (used by the agent). */
  async ensureLlmModelId(): Promise<string> {
    await this.ensureReady();
    if (!this.llmModelId) throw new Error('LLM not loaded');
    return this.llmModelId;
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
          modelType: 'whisper',
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

    const release = await this.acquire();
    try {
      const sdk = await import('@qvac/sdk');
      const { completion } = sdk as any;
      const result = completion({ modelId: this.llmModelId, history, stream: true });
      for await (const token of result.tokenStream) {
        yield token as string;
      }
    } finally {
      release();
    }
  }

  /**
   * Acquire the single-job inference gate manually. The orchestrator holds it
   * across several completion passes (tool rounds + final answer), releasing
   * only once the final answer stream is fully drained. Returns a release fn.
   */
  async acquireJob(): Promise<() => void> {
    return this.acquire();
  }

  async embed(text: string): Promise<number[] | null> {
    await this.ensureReady();
    if (!this.embedModelId) return null;

    const release = await this.acquire();
    try {
      const sdk = await import('@qvac/sdk');
      const embedFn = (sdk as any).embed;
      if (!embedFn) return null;
      const out = await embedFn({ modelId: this.embedModelId, text });
      return Array.isArray(out) ? out : (out?.vector ?? null);
    } finally {
      release();
    }
  }

  async transcribe(audioPath: string): Promise<string> {
    await this.ensureWhisperReady();
    if (!this.whisperModelId) throw new Error('Whisper not loaded');

    const release = await this.acquire();
    try {
      const sdk = await import('@qvac/sdk');
      const transcribeFn = (sdk as any).transcribe;
      if (!transcribeFn) throw new Error('@qvac/sdk has no transcribe export');

      const cleanPath = audioPath.startsWith('file://') ? audioPath.slice(7) : audioPath;
      const out = await transcribeFn({ modelId: this.whisperModelId, audioChunk: cleanPath });
      return typeof out === 'string' ? out : '';
    } finally {
      release();
    }
  }

  hasEmbedder() {
    return this.embedModelId != null;
  }
}

export const qvac = new QvacRuntime();
