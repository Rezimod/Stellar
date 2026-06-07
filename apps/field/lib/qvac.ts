import 'react-native-get-random-values';
import { audit } from './audit';

export type LoadProgress = {
  phase: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  bytesDownloaded?: number;
  bytesTotal?: number;
  message?: string;
  error?: string;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  imageUri?: string; // local file:// uri when the user attached a photo (Vision)
};

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
  private vlmModelId: string | null = null;
  private vlmModelName = '';
  private ttsModelId: string | null = null;

  private llmTracker = new ProgressTracker();
  private whisperTracker = new ProgressTracker();
  private vlmTracker = new ProgressTracker();
  private ttsTracker = new ProgressTracker();

  private llmLoad: Promise<void> | null = null;
  private whisperLoad: Promise<void> | null = null;
  private vlmLoad: Promise<void> | null = null;
  private ttsLoad: Promise<void> | null = null;

  // Field Mesh: when seeding, this device serves the on-device model to nearby
  // peers over QVAC's P2P transport (Hyperdrive), so a phone at a dark-sky site
  // with no internet can pull the AI from a peer instead of the cloud.
  private seedingState: 'off' | 'starting' | 'seeding' | 'error' = 'off';
  private seedError = '';

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

  /** Field Mesh seeding state, for the UI. */
  getSeedingState(): { state: 'off' | 'starting' | 'seeding' | 'error'; error: string } {
    return { state: this.seedingState, error: this.seedError };
  }

  /**
   * Start seeding the on-device model to nearby peers over P2P. The model is
   * already cached locally, so this just begins announcing/serving it on the
   * QVAC swarm — turning this phone into a source other Field devices can pull
   * the model from with no internet.
   */
  async startSeeding(): Promise<void> {
    if (this.seedingState === 'seeding' || this.seedingState === 'starting') return;
    this.seedingState = 'starting';
    try {
      await this.ensureReady(); // model must be cached before we can seed it
      const sdk = await import('@qvac/sdk');
      const { downloadAsset, LLAMA_TOOL_CALLING_1B_INST_Q4_K } = sdk as any;
      // seed:true serves the cached asset to peers; resolves once seeding starts.
      await downloadAsset({ assetSrc: LLAMA_TOOL_CALLING_1B_INST_Q4_K, seed: true });
      this.seedingState = 'seeding';
    } catch (err: any) {
      this.seedingState = 'error';
      this.seedError = err?.message ?? String(err);
      throw err;
    }
  }

  getWhisperProgress() {
    return this.whisperTracker.get();
  }

  subscribeWhisper(fn: Listener) {
    return this.whisperTracker.subscribe(fn);
  }

  getVlmProgress() {
    return this.vlmTracker.get();
  }

  subscribeVlm(fn: Listener) {
    return this.vlmTracker.subscribe(fn);
  }

  /**
   * Lazily load the on-device vision-language model. Loaded only when the user
   * first attaches a photo (it's a heavier model + projection), so phones that
   * never use Vision don't pay the download. Prefers Qwen3-VL 2B (strong on
   * equipment/sky recognition); falls back to the lighter SmolVLM2 500M.
   */
  async ensureVlmReady(): Promise<void> {
    if (this.vlmTracker.get().phase === 'ready') return;
    if (this.vlmLoad) return this.vlmLoad;

    this.vlmLoad = (async () => {
      try {
        const sdk = await import('@qvac/sdk');
        const s = sdk as any;
        const { loadModel } = s;

        const qwen = s.QWEN3VL_2B_MULTIMODAL_Q4_K;
        const qwenProj = s.MMPROJ_QWEN3VL_2B_MULTIMODAL_Q4_K;
        const smol = s.SMOLVLM2_500M_MULTIMODAL_Q8_0;
        const smolProj = s.MMPROJ_SMOLVLM2_500M_MULTIMODAL_Q8_0;

        // RAM-aware: Qwen3-VL 2B (~2GB, far better recognition) needs headroom on
        // top of the resident 1B chat model, so reserve it for ≥6.5GB phones. On
        // constrained devices use SmolVLM2 500M (~700MB) — it won't OOM. Honours
        // the "runs on constrained devices" goal instead of crashing on them.
        let totalBytes = 0;
        try {
          const Device = await import('expo-device');
          totalBytes = (Device as any).totalMemory ?? 0;
        } catch {
          /* fall through to the smaller model */
        }
        const roomy = totalBytes >= 6.5 * 1024 * 1024 * 1024;

        const qwenPick = qwen && qwenProj
          ? { modelSrc: qwen, projectionModelSrc: qwenProj, name: 'Qwen3-VL 2B' }
          : null;
        const smolPick = smol && smolProj
          ? { modelSrc: smol, projectionModelSrc: smolProj, name: 'SmolVLM2 500M' }
          : null;
        const pick = (roomy ? qwenPick : smolPick) ?? smolPick ?? qwenPick;
        if (!pick) throw new Error('No multimodal model exported by @qvac/sdk');

        this.vlmModelName = pick.name;
        this.vlmTracker.emit({
          phase: 'downloading',
          message: `Fetching vision model — ${pick.name} (one-time)`,
        });
        audit.modelLoad(pick.name, { kind: 'vision' });

        this.vlmModelId = await loadModel({
          modelSrc: pick.modelSrc,
          modelType: 'llm',
          // Roomier context: the identify prompt (visual field-guide + 2 worked
          // examples) plus the image projection tokens plus the answer need headroom.
          modelConfig: { ctx_size: 3072, projectionModelSrc: pick.projectionModelSrc },
          onProgress: (p: { downloaded?: number; total?: number }) => {
            this.vlmTracker.emit({
              phase: 'downloading',
              bytesDownloaded: p.downloaded,
              bytesTotal: p.total,
              message: `Downloading ${pick.name}`,
            });
          },
        });

        this.vlmTracker.emit({ phase: 'ready', message: 'Vision ready' });
      } catch (err: any) {
        this.vlmTracker.emit({ phase: 'error', error: err?.message ?? String(err) });
        this.vlmLoad = null; // allow retry
        throw err;
      }
    })();

    return this.vlmLoad;
  }

  /**
   * Stream a vision-language answer about an on-device image. Routes through the
   * VLM with the photo attached; everything stays local. Holds the single-job
   * gate so it never collides with a text completion or transcription.
   */
  async *seeImage(
    prompt: string,
    imagePath: string,
    system?: string,
  ): AsyncIterable<string> {
    await this.ensureVlmReady();
    if (!this.vlmModelId) throw new Error('Vision model not loaded');

    const cleanPath = imagePath.startsWith('file://') ? imagePath.slice(7) : imagePath;
    const history: any[] = [];
    if (system) history.push({ role: 'system', content: system });
    history.push({ role: 'user', content: prompt, attachments: [{ path: cleanPath }] });

    const release = await this.acquire();
    try {
      const sdk = await import('@qvac/sdk');
      const { completion } = sdk as any;
      const result = completion({
        modelId: this.vlmModelId,
        history,
        stream: true,
        generationParams: { temp: 0.2, top_p: 0.9, predict: 220 },
      });
      yield* audit.instrument('vision', this.vlmModelName || 'vlm', prompt, result.tokenStream, result.stats);
    } finally {
      release();
    }
  }

  getTtsProgress() {
    return this.ttsTracker.get();
  }

  subscribeTts(fn: Listener) {
    return this.ttsTracker.subscribe(fn);
  }

  /**
   * Lazily load the on-device TTS voice (Supertonic — general-purpose English,
   * no voice cloning). Loaded only when the user first taps "read aloud", so
   * phones that never use voice-out don't pay the download.
   */
  async ensureTtsReady(): Promise<void> {
    if (this.ttsTracker.get().phase === 'ready') return;
    if (this.ttsLoad) return this.ttsLoad;

    this.ttsLoad = (async () => {
      try {
        const sdk = await import('@qvac/sdk');
        const s = sdk as any;
        const enc = s.TTS_SUPERTONIC2_OFFICIAL_TEXT_ENCODER_SUPERTONE_FP32;
        if (!enc) throw new Error('Supertonic TTS not exported by @qvac/sdk');

        this.ttsTracker.emit({ phase: 'downloading', message: 'Fetching voice (Supertonic, one-time)' });
        audit.modelLoad('Supertonic TTS', { kind: 'tts' });

        this.ttsModelId = await s.loadModel({
          modelSrc: enc.src,
          modelType: 'tts',
          modelConfig: {
            ttsEngine: 'supertonic',
            language: 'en',
            speed: 1.05,
            numInferenceSteps: 5,
            supertonicMultilingual: false,
            ttsTextEncoderSrc: enc.src,
            ttsDurationPredictorSrc: s.TTS_SUPERTONIC2_OFFICIAL_DURATION_PREDICTOR_SUPERTONE_FP32.src,
            ttsVectorEstimatorSrc: s.TTS_SUPERTONIC2_OFFICIAL_VECTOR_ESTIMATOR_SUPERTONE_FP32.src,
            ttsVocoderSrc: s.TTS_SUPERTONIC2_OFFICIAL_VOCODER_SUPERTONE_FP32.src,
            ttsUnicodeIndexerSrc: s.TTS_SUPERTONIC2_OFFICIAL_UNICODE_INDEXER_SUPERTONE_FP32.src,
            ttsTtsConfigSrc: s.TTS_SUPERTONIC2_OFFICIAL_TTS_CONFIG_SUPERTONE.src,
            ttsVoiceStyleSrc: s.TTS_SUPERTONIC2_OFFICIAL_VOICE_STYLE_SUPERTONE.src,
          },
          onProgress: (p: { downloaded?: number; total?: number }) => {
            this.ttsTracker.emit({
              phase: 'downloading',
              bytesDownloaded: p.downloaded,
              bytesTotal: p.total,
              message: 'Downloading voice',
            });
          },
        });

        this.ttsTracker.emit({ phase: 'ready', message: 'Voice ready' });
      } catch (err: any) {
        this.ttsTracker.emit({ phase: 'error', error: err?.message ?? String(err) });
        this.ttsLoad = null; // allow retry
        throw err;
      }
    })();

    return this.ttsLoad;
  }

  /**
   * Synthesize speech for `text` on-device and return a playable WAV file uri.
   * Builds the 16-bit PCM WAV in-memory (no Buffer/base64) and writes it to the
   * cache. Holds the single-job gate during synthesis.
   */
  async speak(text: string): Promise<string> {
    await this.ensureTtsReady();
    if (!this.ttsModelId) throw new Error('TTS not loaded');

    const release = await this.acquire();
    const start = Date.now();
    try {
      const sdk = await import('@qvac/sdk');
      const { textToSpeech } = sdk as any;
      const result = textToSpeech({ modelId: this.ttsModelId, text, inputType: 'text', stream: false });
      const samples: number[] = await result.buffer;

      const SAMPLE_RATE = 44100;
      const wav = pcm16ToWav(samples, SAMPLE_RATE);

      const { File, Paths } = await import('expo-file-system');
      const file = new File(Paths.cache, `astra-tts-${Date.now()}.wav`);
      file.write(wav);

      audit.record({
        type: 'inference',
        kind: 'tts',
        model: 'Supertonic TTS',
        promptPreview: text.slice(0, 160),
        totalMs: Date.now() - start,
        meta: { samples: samples.length, seconds: Number((samples.length / SAMPLE_RATE).toFixed(2)) },
      });
      return file.uri;
    } finally {
      release();
    }
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

/** Build a 16-bit PCM mono WAV (header + samples) as a Uint8Array — no Buffer. */
function pcm16ToWav(samples: number[], sampleRate: number): Uint8Array {
  const dataLen = samples.length * 2;
  const buf = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buf);
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-32768, Math.min(32767, Math.round(samples[i] ?? 0)));
    view.setInt16(44 + i * 2, v, true);
  }
  return new Uint8Array(buf);
}

export const qvac = new QvacRuntime();
