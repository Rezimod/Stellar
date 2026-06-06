/**
 * Day-1 de-risk gate. Probes each QVAC capability we plan to ship so we learn —
 * on real hardware, not from docs — exactly what runs before committing the
 * build. Each probe is best-effort; a failure's error message IS the diagnostic.
 *
 * Wire `runSmokeTest` to a dev button and read the report. Loading several
 * models is slow and storage-heavy on first run; run probes you care about.
 */

export type SmokeResult = { capability: string; ok: boolean; ms: number; detail: string };
type Reporter = (r: SmokeResult) => void;

async function timed(cap: string, fn: () => Promise<string>, report?: Reporter): Promise<SmokeResult> {
  const t = Date.now();
  try {
    const detail = await fn();
    const r: SmokeResult = { capability: cap, ok: true, ms: Date.now() - t, detail };
    report?.(r);
    return r;
  } catch (e: any) {
    const r: SmokeResult = { capability: cap, ok: false, ms: Date.now() - t, detail: e?.message ?? String(e) };
    report?.(r);
    return r;
  }
}

export async function runSmokeTest(report?: Reporter): Promise<SmokeResult[]> {
  const sdk: any = await import('@qvac/sdk');
  const results: SmokeResult[] = [];

  // 1. The real headline path: the offline sky agent (local ephemeris → grounded
  //    LLM answer). Tests what we actually ship, end to end, on this device.
  results.push(
    await timed('sky-agent', async () => {
      const { runSkyAgent } = await import('./agent');
      const { stream, toolsUsed } = await runSkyAgent('Is Saturn up right now?', [], 41.7151, 44.8271);
      let answer = '';
      for await (const tok of stream) answer += tok;
      const preview = answer.replace(/\s+/g, ' ').trim().slice(0, 80);
      return `tool=${toolsUsed.join(',') || 'none'} · "${preview}${answer.length > 80 ? '…' : ''}"`;
    }, report),
  );

  // 2. Native QVAC tool-calling — proves the SDK tool API is wired: the model is
  //    loaded with tools enabled and `completion({ tools })` accepts our real sky
  //    tool descriptors and returns a toolCalls result. (At runtime we drive the
  //    orchestration deterministically for reliability + speed; this verifies the
  //    native path itself is live.)
  results.push(
    await timed('native-tool-calling', async () => {
      const { qvac } = await import('./qvac');
      const { TOOL_DEFS } = await import('./skyTools');
      const modelId = await qvac.ensureLlmModelId();
      const r = sdk.completion({
        modelId,
        history: [{ role: 'user', content: 'Where is Jupiter right now?' }],
        stream: true,
        tools: TOOL_DEFS,
      });
      await Promise.all([
        (async () => { for await (const _t of r.tokenStream) { /* drain */ } })(),
        (async () => { for await (const _e of r.toolCallStream) { /* drain */ } })(),
      ]);
      const calls = (await r.toolCalls) ?? [];
      return `api ok · ${TOOL_DEFS.length} tools accepted · model emitted ${calls.length} call(s)`;
    }, report),
  );

  // 3. Embeddings via EmbeddingGemma — proves the capability for semantic RAG.
  results.push(
    await timed('embed-gemma', async () => {
      const embId = await sdk.loadModel({ modelSrc: sdk.EMBEDDINGGEMMA_300M_Q4_0, modelType: 'llamacpp-embedding' });
      const v = await sdk.embed({ modelId: embId, text: 'Andromeda galaxy M31' });
      const vec = Array.isArray(v) ? v : v?.vector;
      return `dim=${vec?.length ?? 0}`;
    }, report),
  );

  // 4. Vision (multimodal) — writes a known test image to disk and asks the VLM
  //    to describe it. Proves the on-device image→text path runs end to end.
  results.push(
    await timed('vision-vlm', async () => {
      const { qvac } = await import('./qvac');
      const { File, Paths } = await import('expo-file-system');
      const file = new File(Paths.cache, `smoke-vision-${Date.now()}.png`);
      file.write(TEST_IMAGE_PNG_BASE64, { encoding: 'base64' as any });
      let answer = '';
      for await (const tok of qvac.seeImage('Describe this image in one short sentence.', file.uri)) {
        answer += tok;
      }
      const preview = answer.replace(/\s+/g, ' ').trim().slice(0, 90);
      return `ok · "${preview}${answer.length > 90 ? '…' : ''}"`;
    }, report),
  );

  return results;
}

// 32×32 PNG: red top half, blue bottom half. Small, known, bundled — gives the
// vision probe a deterministic image without shipping an asset file.
const TEST_IMAGE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALklEQVR4nO3NQQkAAAgEMONcHPtjGFP4EAb7ryY5VQKBQCB4EaTnlEAgEAheBAtEsQBMPZNXHgAAAABJRU5ErkJggg==';
