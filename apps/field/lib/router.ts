/**
 * Intent router shared by the chat UI and the eval harness, so both agree on
 * what counts as a "sky-position" question (→ live tool-calling agent) vs a
 * general astronomy question (→ RAG companion).
 */

const BODY_RE = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune)\b/i;
const VIS_RE = /\b(visible|overhead|tonight|right now|what'?s up|where is|how high)\b/i;

export function looksLikeSkyQuery(m: string): boolean {
  return BODY_RE.test(m) || VIS_RE.test(m);
}

export type Route = 'agent' | 'companion';
export function routeFor(m: string): Route {
  return looksLikeSkyQuery(m) ? 'agent' : 'companion';
}
