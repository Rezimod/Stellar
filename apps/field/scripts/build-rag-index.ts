/**
 * Build the on-device RAG index for Stellar Field.
 *
 * Reads markdown files from rag/sources/ (one chunk per file or per ## heading),
 * optionally embeds each chunk via @qvac/sdk if available in this Node env,
 * and writes the result to rag/corpus/index.json.
 *
 * For Day 1 we ship a hand-curated index.json. Once the team grows the corpus,
 * run `npm run build:rag` to regenerate.
 *
 * Usage:
 *   npx tsx scripts/build-rag-index.ts
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';

type Chunk = {
  id: string;
  source: string;
  title: string;
  text: string;
  embedding?: number[];
};

const SOURCES_DIR = join(process.cwd(), 'rag', 'sources');
const OUT_PATH = join(process.cwd(), 'rag', 'corpus', 'index.json');

function parseSourceFromFilename(name: string): string {
  const base = basename(name, extname(name));
  return base.split('-')[0] || 'misc';
}

function splitByHeadings(md: string): Array<{ title: string; text: string }> {
  const lines = md.split('\n');
  const out: Array<{ title: string; text: string }> = [];
  let currentTitle = '';
  let buf: string[] = [];

  const flush = () => {
    const text = buf.join('\n').trim();
    if (text && currentTitle) out.push({ title: currentTitle, text });
    buf = [];
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      flush();
      currentTitle = m[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

async function tryEmbed(_text: string): Promise<number[] | null> {
  try {
    const sdk: any = await import('@qvac/sdk');
    if (!sdk.loadModel || !sdk.embed) return null;
    const modelSrc = sdk.EMBED_NOMIC_V1_5 ?? sdk.EMBED_BGE_SMALL_EN;
    if (!modelSrc) return null;
    if (!(globalThis as any).__embedModelId) {
      (globalThis as any).__embedModelId = await sdk.loadModel({ modelSrc, modelType: 'embed' });
    }
    const out = await sdk.embed({ modelId: (globalThis as any).__embedModelId, text: _text });
    return Array.isArray(out) ? out : out?.vector ?? null;
  } catch {
    return null;
  }
}

async function main() {
  let entries: string[] = [];
  try {
    entries = await readdir(SOURCES_DIR);
  } catch {
    console.log('[build-rag] No rag/sources/ directory yet — keeping hand-curated index.json untouched.');
    return;
  }

  const chunks: Chunk[] = [];
  for (const file of entries) {
    if (!file.endsWith('.md')) continue;
    const md = await readFile(join(SOURCES_DIR, file), 'utf8');
    const source = parseSourceFromFilename(file);
    const sections = splitByHeadings(md);
    for (const sec of sections) {
      const id = `${source}-${sec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`;
      const embedding = (await tryEmbed(sec.text)) ?? undefined;
      chunks.push({ id, source, title: sec.title, text: sec.text, embedding });
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(chunks, null, 2));
  console.log(`[build-rag] Wrote ${chunks.length} chunks to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
