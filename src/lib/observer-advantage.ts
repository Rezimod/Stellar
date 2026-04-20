import bindingsV1 from '@/data/market-id-bindings.json';
import bindingsV2 from '@/data/market-id-bindings-v2.json';
import type { CompletedMission } from './types';

export const OBSERVER_MULTIPLIER = 1.5;

// Mission keyword → oracle slugs eligible for observer bonus.
// Covers both v1 slugs (sky-001-*, weather-001-*, natural-001-*) and v2 slugs
// (meteor-*, solar-*, weather-*, mission-*, comet-*, discovery-*).
const MISSION_MARKET_MAP: Record<string, string[]> = {
  moon: [
    'weather-001-tbilisi-warm-day',
    'weather-002-tbilisi-may-day-rain',
    'weather-003-stockholm-frost',
    'weather-004-london-heathrow-rain',
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-007-nyc-warm-may7',
    'sky-001-lyrids-zhr',
    'sky-002-eta-aquariids-zhr',
    'weather-001-tbilisi-clear-run',
    'weather-003-tbilisi-lyrids',
    'weather-005-perseids-europe',
    'meteor-001-lyrids-zhr',
    'meteor-002-eta-aquariids-zhr',
    'meteor-003-perseids-zhr',
  ],
  jupiter: [
    'weather-001-tbilisi-warm-day',
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
  ],
  saturn: [
    'weather-001-tbilisi-warm-day',
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
  ],
  pleiades: [
    'weather-001-tbilisi-warm-day',
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
  ],
  orion: [
    'weather-001-tbilisi-warm-day',
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
  ],
  andromeda: [
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
  ],
  crab: [
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
  ],
  lyrids: [
    'sky-001-lyrids-zhr',
    'meteor-001-lyrids-zhr',
    'weather-003-tbilisi-lyrids',
  ],
  perseids: [
    'meteor-003-perseids-zhr',
    'weather-005-perseids-europe',
  ],
  meteor: [
    'sky-001-lyrids-zhr',
    'sky-002-eta-aquariids-zhr',
    'meteor-001-lyrids-zhr',
    'meteor-002-eta-aquariids-zhr',
    'meteor-003-perseids-zhr',
    'meteor-004-fireball-april',
    'meteor-005-outburst',
  ],
  fireball: ['meteor-004-fireball-april'],
  aurora: [
    'sky-006-kp5-geomagnetic',
    'solar-002-kp7-june',
    'solar-003-aurora-45n',
  ],
  solar: [
    'sky-005-mclass-flare-judging',
    'sky-007-xclass-flare-window',
    'solar-001-xflare-may',
    'solar-002-kp7-june',
    'solar-004-x5-2026',
    'solar-005-f107-decline',
  ],
  comet: [
    'comet-001-c2025r3-nakedeye',
    'comet-002-new-discovery',
    'comet-005-c2026a1-survives',
  ],
  asteroid: [
    'comet-003-rubin-nea',
    'comet-004-tianwen2-sample',
  ],
  sky: [
    'weather-001-tbilisi-warm-day',
    'weather-005-tbilisi-clear-eta',
    'weather-006-tbilisi-dry-week',
    'weather-001-tbilisi-clear-run',
    'weather-002-spain-eclipse',
    'weather-004-georgia-bortle2',
  ],
  eclipse: ['weather-002-spain-eclipse'],
  darksite: ['weather-004-georgia-bortle2'],
};

export interface ObserverAdvantage {
  hasAdvantage: boolean;
  multiplier: number;
  reason: string;
  observedTarget: string;
  relatedOracleKeys: string[];
}

export interface CompletedObservation {
  target: string;
  timestamp: string;
}

export function missionsToObservations(missions: CompletedMission[]): CompletedObservation[] {
  return missions
    .filter((m) => m.status === 'completed' || m.status === 'gallery')
    .map((m) => ({ target: `${m.id} ${m.name}`, timestamp: m.timestamp }));
}

export function getOracleKeyForMarketId(marketId: number): string | null {
  const merged = {
    ...(bindingsV1 as Record<string, number>),
    ...(bindingsV2 as Record<string, number>),
  };
  for (const [key, id] of Object.entries(merged)) {
    if (id === marketId) return key;
  }
  return null;
}

function matchKeywords(target: string): string[] {
  const t = target.toLowerCase();
  const matched = new Set<string>();
  for (const [keyword, oracleKeys] of Object.entries(MISSION_MARKET_MAP)) {
    if (t.includes(keyword)) {
      for (const k of oracleKeys) matched.add(k);
    }
  }
  return [...matched];
}

export function checkObserverAdvantage(
  oracleKey: string | null,
  observations: CompletedObservation[],
): ObserverAdvantage {
  if (!oracleKey) {
    return {
      hasAdvantage: false,
      multiplier: 1,
      reason: '',
      observedTarget: '',
      relatedOracleKeys: [],
    };
  }
  for (const obs of observations) {
    const related = matchKeywords(obs.target);
    if (related.includes(oracleKey)) {
      const displayTarget = obs.target.split(' ').slice(1).join(' ') || obs.target;
      const when = obs.timestamp
        ? new Date(obs.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : 'recently';
      return {
        hasAdvantage: true,
        multiplier: OBSERVER_MULTIPLIER,
        reason: `You observed ${displayTarget} on ${when} — ${OBSERVER_MULTIPLIER}× payout`,
        observedTarget: displayTarget,
        relatedOracleKeys: related,
      };
    }
  }
  return {
    hasAdvantage: false,
    multiplier: 1,
    reason: 'Complete a related sky mission for 1.5× payout',
    observedTarget: '',
    relatedOracleKeys: [],
  };
}

export function calculateBoostedPayout(baseAmount: number, advantage: ObserverAdvantage): number {
  return Math.round(baseAmount * advantage.multiplier);
}

export function calculateBonusStars(baseAmount: number): number {
  return Math.round(baseAmount * (OBSERVER_MULTIPLIER - 1));
}
