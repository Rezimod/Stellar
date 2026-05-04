import { qvac } from './qvac';
import corpusJson from '../rag/corpus/index.json';

type RagChunk = {
  id: string;
  source: 'messier' | 'constellation' | 'telescope-faq' | 'astroman' | 'observation-tips';
  title: string;
  text: string;
  embedding?: number[];
};

const CHUNKS = corpusJson as RagChunk[];

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function keywordScore(text: string, query: string): number {
  const q = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const lower = text.toLowerCase();
  let score = 0;
  for (const word of q) {
    if (lower.includes(word)) score += 1;
  }
  return score;
}

export async function retrieveContext(query: string, k = 3): Promise<string | null> {
  if (CHUNKS.length === 0) return null;

  let scored: { chunk: RagChunk; score: number }[];

  if (qvac.hasEmbedder()) {
    const queryVec = await qvac.embed(query);
    if (queryVec) {
      scored = CHUNKS
        .filter((c) => c.embedding && c.embedding.length === queryVec.length)
        .map((c) => ({ chunk: c, score: cosine(c.embedding!, queryVec) }));
    } else {
      scored = CHUNKS.map((c) => ({ chunk: c, score: keywordScore(c.text, query) }));
    }
  } else {
    scored = CHUNKS.map((c) => ({ chunk: c, score: keywordScore(c.text, query) }));
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).filter((s) => s.score > 0);
  if (top.length === 0) return null;

  return top.map((s) => `[${s.chunk.title}] ${s.chunk.text}`).join('\n\n');
}
