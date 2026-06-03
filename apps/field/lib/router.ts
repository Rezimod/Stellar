/**
 * Intent router shared by the chat UI and the eval harness, so both agree on
 * what counts as a "sky-position" question (→ live tool-calling agent) vs a
 * general astronomy question (→ RAG companion).
 */

import { findDso } from './dso';

const BODY_RE = /\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune)\b/i;
const VIS_RE = /\b(visible|overhead|tonight|right now|what'?s up|where is|how high)\b/i;
// Positional cues — used to route a named deep-sky object to the live agent
// ("is M31 up?") while leaving definition questions ("what is M31?") to RAG.
const POS_RE = /\b(up|rise|rises|rising|sets?|setting|where|locate|find|point|see|high|altitude|overhead)\b/i;

export function looksLikeSkyQuery(m: string): boolean {
  if (BODY_RE.test(m) || VIS_RE.test(m)) return true;
  if (POS_RE.test(m) && findDso(m)) return true;
  return false;
}

export type Route = 'agent' | 'companion';
export function routeFor(m: string): Route {
  return looksLikeSkyQuery(m) ? 'agent' : 'companion';
}
