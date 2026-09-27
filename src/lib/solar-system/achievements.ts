// What the crew actually did up there, kept as records rather than rewards.
//
// A finished mission writes one achievement — an id, the moment, and what it
// was about. Nothing here awards Stars, mints anything or touches the
// network: the sink is an interface so that a server-verified one can take
// its place without the Moon knowing, and until then the records live on the
// device and are shown in the mission log.
//
// TODO(explore-slice): server-verified achievement sync — the records here
// are self-reported and worth nothing on chain. See docs/reputation-economy.md
// for what a verified one has to carry.

export interface Achievement {
  /** `explore.telescope_calibrated` and the like: stable, and namespaced. */
  id: string;
  /** Unix milliseconds. */
  at: number;
  /** What it was about — the object observed, the crater sampled. */
  detail?: string;
}

export interface RewardSink {
  /** Write one, unless it is already held. True when it was new. */
  record: (id: string, detail?: string) => boolean;
  list: () => Achievement[];
}

/** A finished mission's record. */
export const MISSION_ACHIEVEMENTS: Record<string, string> = {
  firstSteps: 'explore.first_steps',
  power: 'explore.power_restored',
  telescope: 'explore.telescope_calibrated',
  comms: 'explore.comms_restored',
  expedition: 'explore.lunar_geology',
};

/** Objectives worth a record of their own, by objective id. */
export const OBJECTIVE_ACHIEVEMENTS: Record<string, string> = {
  earthrise: 'explore.earthrise_photo',
};

const KEY = 'stellar_explore_achievements_v1';
const CAP = 32;

function parse(raw: string | null): Achievement[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .filter((a): a is Achievement =>
        !!a && typeof a === 'object'
        && typeof (a as Achievement).id === 'string'
        && Number.isFinite((a as Achievement).at))
      .map((a) => (typeof a.detail === 'string' ? { id: a.id, at: a.at, detail: a.detail } : { id: a.id, at: a.at }))
      .slice(0, CAP);
  } catch {
    return [];
  }
}

/** The device's own log. A window that refuses storage still plays: the
 *  records live for the session and are simply not there next time. */
export function localRewardSink(now: () => number = Date.now): RewardSink {
  let cache: Achievement[] | null = null;
  const all = () => {
    if (!cache) {
      try { cache = parse(localStorage.getItem(KEY)); } catch { cache = []; }
    }
    return cache;
  };
  return {
    record(id, detail) {
      const list = all();
      if (list.some((a) => a.id === id)) return false;
      list.push(detail ? { id, at: now(), detail } : { id, at: now() });
      if (list.length > CAP) list.splice(0, list.length - CAP);
      try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* private window */ }
      return true;
    },
    list: () => all(),
  };
}

/** A sink that keeps nothing, for tests and for scenes without storage. */
export function memoryRewardSink(now: () => number = Date.now): RewardSink {
  const list: Achievement[] = [];
  return {
    record(id, detail) {
      if (list.some((a) => a.id === id)) return false;
      list.push(detail ? { id, at: now(), detail } : { id, at: now() });
      return true;
    },
    list: () => list,
  };
}
