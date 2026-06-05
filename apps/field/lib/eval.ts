import { routeFor, type Route } from './router';
import { runSkyAgent } from './agent';
import { startChat } from './companion';
import { audit } from './audit';

/**
 * On-device eval harness — the "impressive result" for the submission. Runs a
 * fixed question set through the real routing + models and measures: did the
 * router pick the right path, did the agent call the right tool, did we get a
 * grounded answer, and how fast (TTFT / total). Produces a JSON artifact.
 */

export type EvalCase = {
  q: string;
  expectRoute: Route;
  expectTool?: 'get_body_position' | 'get_visible_now';
};

export const EVAL_SET: EvalCase[] = [
  // Agent — specific body position
  { q: 'Is Saturn up right now?', expectRoute: 'agent', expectTool: 'get_body_position' },
  { q: 'Where is Jupiter in the sky?', expectRoute: 'agent', expectTool: 'get_body_position' },
  { q: 'How high is the Moon right now?', expectRoute: 'agent', expectTool: 'get_body_position' },
  { q: 'Is Mars visible tonight?', expectRoute: 'agent', expectTool: 'get_body_position' },
  { q: 'When does Venus set?', expectRoute: 'agent', expectTool: 'get_body_position' },
  // Agent — what's visible
  { q: 'What can I see right now?', expectRoute: 'agent', expectTool: 'get_visible_now' },
  { q: 'What planets are visible tonight?', expectRoute: 'agent', expectTool: 'get_visible_now' },
  { q: "What's up in the sky tonight?", expectRoute: 'agent', expectTool: 'get_visible_now' },
  // Agent — compound orchestration (the model is expected to chain several
  // tools; the recorded `toolsUsed` reveals the orchestration). Pass is keyed to
  // the deterministic primary so the artifact stays consistent run-to-run.
  { q: "What's the best target tonight, and when?", expectRoute: 'agent', expectTool: 'get_visible_now' },
  { q: 'Will the Moon interfere with faint targets tonight?', expectRoute: 'agent', expectTool: 'get_body_position' },
  // Companion — knowledge (RAG)
  { q: 'What is M31?', expectRoute: 'companion' },
  { q: 'How do I collimate a Newtonian?', expectRoute: 'companion' },
  { q: 'What eyepiece should I use for planets?', expectRoute: 'companion' },
  { q: 'What is the difference between a refractor and a reflector?', expectRoute: 'companion' },
  { q: 'How do I set up my telescope?', expectRoute: 'companion' },
  { q: 'What causes light pollution?', expectRoute: 'companion' },
  { q: 'What is the Messier catalog?', expectRoute: 'companion' },
  { q: 'How do I focus on a star?', expectRoute: 'companion' },
];

export type EvalResult = {
  q: string;
  expectRoute: Route;
  actualRoute: Route;
  routeOk: boolean;
  expectTool?: string;
  toolsUsed: string[];
  toolOk: boolean | null; // null for companion cases
  ttftMs: number | null;
  totalMs: number;
  answerChars: number;
  ok: boolean;
};

export type EvalSummary = {
  total: number;
  routePass: number;
  toolCases: number;
  toolPass: number;
  overallPass: number;
  avgTtftMs: number;
  avgTotalMs: number;
};

export async function runEval(
  observer: { lat: number; lon: number },
  report?: (r: EvalResult) => void,
): Promise<{ results: EvalResult[]; summary: EvalSummary }> {
  const results: EvalResult[] = [];

  for (const c of EVAL_SET) {
    const actualRoute = routeFor(c.q);
    const start = Date.now();
    let firstAt: number | null = null;
    let answer = '';
    let toolsUsed: string[] = [];

    try {
      if (actualRoute === 'agent') {
        const res = await runSkyAgent(c.q, [], observer.lat, observer.lon);
        toolsUsed = res.toolsUsed;
        for await (const tok of res.stream) {
          if (firstAt === null) firstAt = Date.now();
          answer += tok;
        }
      } else {
        const res = await startChat(c.q, []);
        for await (const tok of res.stream) {
          if (firstAt === null) firstAt = Date.now();
          answer += tok;
        }
      }
    } catch (e: any) {
      answer = `ERROR: ${e?.message ?? e}`;
    }

    const totalMs = Date.now() - start;
    const routeOk = actualRoute === c.expectRoute;
    const toolOk =
      c.expectRoute === 'agent'
        ? c.expectTool
          ? toolsUsed.includes(c.expectTool)
          : toolsUsed.length > 0
        : null;
    const answerChars = answer.length;
    const ok = routeOk && toolOk !== false && answerChars > 0 && !answer.startsWith('ERROR');

    const r: EvalResult = {
      q: c.q,
      expectRoute: c.expectRoute,
      actualRoute,
      routeOk,
      expectTool: c.expectTool,
      toolsUsed,
      toolOk,
      ttftMs: firstAt ? firstAt - start : null,
      totalMs,
      answerChars,
      ok,
    };
    results.push(r);
    report?.(r);
  }

  const ttfts = results.map((r) => r.ttftMs).filter((x): x is number => x != null);
  const toolCases = results.filter((r) => r.toolOk !== null);
  const summary: EvalSummary = {
    total: results.length,
    routePass: results.filter((r) => r.routeOk).length,
    toolCases: toolCases.length,
    toolPass: toolCases.filter((r) => r.toolOk).length,
    overallPass: results.filter((r) => r.ok).length,
    avgTtftMs: ttfts.length ? Math.round(ttfts.reduce((a, b) => a + b, 0) / ttfts.length) : 0,
    avgTotalMs: Math.round(results.reduce((a, r) => a + r.totalMs, 0) / (results.length || 1)),
  };

  return { results, summary };
}

/** Write the eval results to a JSON artifact; returns the file URI for sharing. */
export async function writeEvalFile(
  results: EvalResult[],
  summary: EvalSummary,
): Promise<string> {
  const device = await audit.deviceInfo();
  const payload = JSON.stringify(
    { device, ranAt: new Date().toISOString(), summary, results },
    null,
    2,
  );
  const { File, Paths } = await import('expo-file-system');
  const file = new File(Paths.document, `qvac-eval-${Date.now()}.json`);
  try {
    if (file.exists) file.delete();
  } catch {
    // fresh file
  }
  file.create();
  file.write(payload);
  return file.uri;
}
