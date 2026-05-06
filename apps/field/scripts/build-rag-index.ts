/**
 * Build the on-device RAG index for Stellar Field from rag/sources/*.md.
 *
 * Format per source file (filename prefix becomes the chunk source):
 *
 *   ## Title of the chunk
 *
 *   magnitude: 8.4
 *   season: autumn
 *   keywords: galaxy, spiral
 *
 *   Body text of the chunk goes here. Multiple paragraphs allowed,
 *   continuing until the next ## heading or end of file.
 *
 * Run:
 *   npm run build:rag
 *
 * Effect:
 *   - Reads every *.md in rag/sources/
 *   - If @qvac/sdk is loadable in this Node environment, embeds each chunk
 *   - Writes the result to rag/corpus/index.json
 *
 * Note: as of Day 2, the hand-curated rag/corpus/index.json is the source
 * of truth. This script is a forward-compatible scaffold for when the
 * corpus outgrows manual editing. It will refuse to overwrite the
 * existing index.json unless rag/sources/ contains at least one *.md.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

type Chunk = {
  id: string;
  source: string;
  title: string;
  text: string;
  embedding?: number[];
  magnitude?: number;
  season?: string;
  hemisphere?: string;
  instrument?: string;
  keywords?: string[];
};

const ROOT = process.cwd();
const SOURCES_DIR = join(ROOT, 'rag', 'sources');
const OUT_PATH = join(ROOT, 'rag', 'corpus', 'index.json');

const META_KEYS = new Set([
  'magnitude',
  'season',
  'hemisphere',
  'instrument',
  'keywords',
]);

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function parseSourceFromFilename(name: string): string {
  const base = basename(name, extname(name));
  return base.split('-')[0] || 'misc';
}

type ParsedSection = {
  title: string;
  meta: Partial<Chunk>;
  text: string;
};

function parseFile(md: string): ParsedSection[] {
  const lines = md.split('\n');
  const out: ParsedSection[] = [];
  let title = '';
  let metaLines: string[] = [];
  let textLines: string[] = [];
  let inMeta = true;

  const flush = () => {
    if (!title) return;
    const meta: Partial<Chunk> = {};
    for (const ml of metaLines) {
      const m = ml.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
      if (!m) continue;
      const key = m[1].toLowerCase();
      if (!META_KEYS.has(key)) continue;
      const val = m[2].trim();
      if (key === 'magnitude') meta.magnitude = Number(val);
      else if (key === 'keywords') meta.keywords = val.split(',').map((s) => s.trim()).filter(Boolean);
      else (meta as any)[key] = val;
    }
    out.push({ title, meta, text: textLines.join('\n').trim() });
  };

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      flush();
      title = heading[1].trim();
      metaLines = [];
      textLines = [];
      inMeta = true;
      continue;
    }
    if (inMeta) {
      if (line.trim() === '') {
        if (metaLines.length > 0) inMeta = false;
        continue;
      }
      if (/^[a-zA-Z]+\s*:\s*/.test(line)) {
        metaLines.push(line);
      } else {
        inMeta = false;
        textLines.push(line);
      }
    } else {
      textLines.push(line);
    }
  }
  flush();
  return out.filter((s) => s.text.length > 0);
}

async function tryEmbed(text: string): Promise<number[] | null> {
  try {
    const sdk: any = await import('@qvac/sdk').catch(() => null);
    if (!sdk?.loadModel || !sdk?.embed) return null;
    const modelSrc = sdk.EMBED_NOMIC_V1_5 ?? sdk.EMBED_BGE_SMALL_EN;
    if (!modelSrc) return null;
    if (!(globalThis as any).__embedModelId) {
      (globalThis as any).__embedModelId = await sdk.loadModel({
        modelSrc,
        modelType: 'embed',
      });
    }
    const out = await sdk.embed({ modelId: (globalThis as any).__embedModelId, text });
    return Array.isArray(out) ? out : out?.vector ?? null;
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(SOURCES_DIR)) {
    console.error(`[build-rag] ${SOURCES_DIR} does not exist. Nothing to build.`);
    process.exit(0);
  }

  const entries = (await readdir(SOURCES_DIR)).filter((f) => f.endsWith('.md'));
  if (entries.length === 0) {
    console.log(
      '[build-rag] rag/sources/ is empty. Keeping the hand-curated rag/corpus/index.json untouched.',
    );
    process.exit(0);
  }

  const chunks: Chunk[] = [];
  let withEmbeddings = 0;

  for (const file of entries) {
    const md = await readFile(join(SOURCES_DIR, file), 'utf8');
    const source = parseSourceFromFilename(file);
    for (const sec of parseFile(md)) {
      const id = `${source}-${slugify(sec.title)}`;
      const embedding = await tryEmbed(sec.text);
      if (embedding) withEmbeddings += 1;
      chunks.push({
        id,
        source,
        title: sec.title,
        text: sec.text,
        ...sec.meta,
        ...(embedding ? { embedding } : {}),
      });
    }
  }

  await writeFile(OUT_PATH, JSON.stringify(chunks, null, 2));
  console.log(
    `[build-rag] Wrote ${chunks.length} chunks (${withEmbeddings} embedded) to ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
