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

  // 2. Embeddings via EmbeddingGemma — proves the capability for semantic RAG.
  results.push(
    await timed('embed-gemma', async () => {
      const embId = await sdk.loadModel({ modelSrc: sdk.EMBEDDINGGEMMA_300M_Q4_0, modelType: 'llamacpp-embedding' });
      const v = await sdk.embed({ modelId: embId, text: 'Andromeda galaxy M31' });
      const vec = Array.isArray(v) ? v : v?.vector;
      return `dim=${vec?.length ?? 0}`;
    }, report),
  );

  return results;
}
