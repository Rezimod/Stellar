import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * On-device inference audit log — the evidence bundle required by the QVAC
 * Hackathon 3-stage verification. Every model load/unload and inference is
 * recorded with timing (TTFT, tokens/sec) so the demo video, the exported log,
 * and the declared hardware all corroborate each other.
 */

export type InferenceKind = 'llm' | 'tool-call' | 'embed' | 'whisper' | 'tts' | 'ocr';

export type AuditEvent = {
  ts: string;
  type: 'model_load' | 'model_unload' | 'inference';
  kind?: InferenceKind;
  model?: string;
  promptPreview?: string;
  completionTokens?: number;
  ttftMs?: number;
  totalMs?: number;
  tokensPerSec?: number;
  sdkStats?: unknown;
  meta?: Record<string, unknown>;
};

const STORAGE_KEY = 'qvac.audit.events';

class AuditLog {
  readonly sessionId = `sess_${Date.now()}`;
  private events: AuditEvent[] = [];

  record(e: Omit<AuditEvent, 'ts'>) {
    this.events.push({ ts: new Date().toISOString(), ...e });
    void this.persist();
  }

  modelLoad(model: string, meta?: Record<string, unknown>) {
    this.record({ type: 'model_load', model, meta });
  }

  modelUnload(model: string) {
    this.record({ type: 'model_unload', model });
  }

  /**
   * Wrap a streaming inference: passes tokens through unchanged while capturing
   * time-to-first-token, token count, throughput, and any QVAC CompletionStats.
   */
  async *instrument(
    kind: InferenceKind,
    model: string,
    promptPreview: string,
    stream: AsyncIterable<string>,
    statsPromise?: Promise<unknown>,
  ): AsyncIterable<string> {
    const start = Date.now();
    let firstAt: number | null = null;
    let tokens = 0;

    for await (const tok of stream) {
      if (firstAt === null) firstAt = Date.now();
      tokens += 1;
      yield tok;
    }

    const end = Date.now();
    const genMs = firstAt ? end - firstAt : end - start;
    const sdkStats = statsPromise ? await statsPromise.catch(() => undefined) : undefined;

    this.record({
      type: 'inference',
      kind,
      model,
      promptPreview: promptPreview.slice(0, 160),
      completionTokens: tokens,
      ttftMs: firstAt ? firstAt - start : undefined,
      totalMs: end - start,
      tokensPerSec: tokens > 0 && genMs > 0 ? Number((tokens / (genMs / 1000)).toFixed(2)) : undefined,
      sdkStats,
    });
  }

  /** For non-streaming one-shot calls (TTS, OCR). */
  async measure<T>(
    kind: InferenceKind,
    model: string,
    promptPreview: string,
    fn: () => Promise<T>,
    meta?: Record<string, unknown>,
  ): Promise<T> {
    const start = Date.now();
    const out = await fn();
    this.record({
      type: 'inference',
      kind,
      model,
      promptPreview: promptPreview.slice(0, 160),
      totalMs: Date.now() - start,
      meta,
    });
    return out;
  }

  getEvents(): AuditEvent[] {
    return this.events;
  }

  toJSON() {
    return { sessionId: this.sessionId, exportedAt: new Date().toISOString(), events: this.events };
  }

  /**
   * Write the full evidence bundle (device specs + every inference's timing) to
   * a JSON file in the app's document directory. Returns the file URI so the UI
   * can hand it to the OS share sheet for the hackathon submission.
   */
  async writeFile(): Promise<string> {
    const device = await this.deviceInfo();
    const payload = JSON.stringify({ device, ...this.toJSON() }, null, 2);
    const { File, Paths } = await import('expo-file-system');
    const file = new File(Paths.document, `qvac-audit-${this.sessionId}.json`);
    try {
      if (file.exists) file.delete();
    } catch {
      // fresh file — nothing to delete
    }
    file.create();
    file.write(payload);
    return file.uri;
  }

  async deviceInfo(): Promise<Record<string, unknown>> {
    try {
      const Device = await import('expo-device');
      return {
        brand: Device.brand,
        manufacturer: Device.manufacturer,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
        totalMemory: Device.totalMemory,
        supportedCpuArchitectures: Device.supportedCpuArchitectures,
      };
    } catch {
      return {};
    }
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // non-fatal: in-memory log still available for export
    }
  }
}

export const audit = new AuditLog();
