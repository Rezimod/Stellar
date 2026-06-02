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

  // 1. Tool-calling LLM — the headline. Uses the purpose-built 1B tool model.
  results.push(
    await timed('llm-tool-calling', async () => {
      const modelId = await sdk.loadModel({ modelSrc: sdk.LLAMA_TOOL_CALLING_1B_INST_Q4_K, modelType: 'llm' });
      const { z } = await import('zod');
      const res = sdk.completion({
        modelId,
        history: [{ role: 'user', content: 'Is Saturn visible right now? Use the tool to check.' }],
        stream: false,
        tools: [
          {
            name: 'get_planet_altitude',
            description: 'Returns the current altitude in degrees of a planet above the horizon',
            parameters: z.object({ planet: z.string().describe('planet name, e.g. Saturn') }),
            handler: async (a: any) => ({ planet: a.planet, altitudeDeg: 34 }),
          },
        ],
      });
      const calls = await res.toolCalls;
      return `toolCalls=${calls.length}${calls[0] ? ` → ${calls[0].name}` : ' (model answered without calling)'}`;
    }, report),
  );

  // 2. Embeddings via EmbeddingGemma — powers semantic RAG retrieval.
  results.push(
    await timed('embed-gemma', async () => {
      const embId = await sdk.loadModel({ modelSrc: sdk.EMBEDDINGGEMMA_300M_Q4_0, modelType: 'embed' });
      const v = await sdk.embed({ modelId: embId, text: 'Andromeda galaxy M31' });
      const vec = Array.isArray(v) ? v : v?.vector;
      return `dim=${vec?.length ?? 0}`;
    }, report),
  );

  return results;
}
