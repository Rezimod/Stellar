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

class QvacRuntime {
  private llmModelId: string | null = null;
  private embedModelId: string | null = null;
  private progress: LoadProgress = { phase: 'idle' };
  private listeners = new Set<Listener>();
  private loadPromise: Promise<void> | null = null;

  getProgress() {
    return this.progress;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.progress);
    return () => this.listeners.delete(fn);
  }

  private emit(next: LoadProgress) {
    this.progress = next;
    this.listeners.forEach((l) => l(next));
  }

  async ensureReady(): Promise<void> {
    if (this.progress.phase === 'ready') return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        this.emit({ phase: 'downloading', message: 'Fetching local model (~700MB, one-time)' });

        const sdk = await import('@qvac/sdk');
        const { loadModel, LLAMA_3_2_1B_INST_Q4_0 } = sdk as any;

        this.llmModelId = await loadModel({
          modelSrc: LLAMA_3_2_1B_INST_Q4_0,
          modelType: 'llm',
          onProgress: (p: { downloaded?: number; total?: number }) => {
            this.emit({
              phase: 'downloading',
              bytesDownloaded: p.downloaded,
              bytesTotal: p.total,
              message: 'Downloading Llama 3.2 1B',
            });
          },
        });

        this.emit({ phase: 'loading', message: 'Warming model' });

        try {
          const embedSdk = (sdk as any).EMBED_NOMIC_V1_5 ?? (sdk as any).EMBED_BGE_SMALL_EN ?? null;
          if (embedSdk) {
            this.embedModelId = await loadModel({ modelSrc: embedSdk, modelType: 'embed' });
          }
        } catch {
          this.embedModelId = null;
        }

        this.emit({ phase: 'ready', message: 'On-device AI ready' });
      } catch (err: any) {
        this.emit({ phase: 'error', error: err?.message ?? String(err) });
        throw err;
      }
    })();

    return this.loadPromise;
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

  hasEmbedder() {
    return this.embedModelId != null;
  }
}

export const qvac = new QvacRuntime();
