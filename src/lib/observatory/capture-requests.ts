/**
 * Asking for a photograph instead of driving the telescope yourself.
 *
 * A live session needs three things at once: a customer awake, a clear sky and
 * a free instrument. In a country with perhaps a hundred clear nights that
 * coincidence is most of why a night goes unsold. A capture request needs none
 * of it — *photograph the Orion Nebula for me, any night in the next fortnight*
 * — so it fills the gaps between booked sessions and gives a node something to
 * do at three in the morning when nobody booked it.
 *
 * See docs/stellar-v2-plan.md §5.2. This module is pure: it prices a request
 * and decides which slot it should take. Nothing here touches the database.
 */

import { buildSlots, type Slot } from './availability';
import { evaluateSafety } from './safety';
import { SIM_TARGET_BY_ID, targetAltAz } from './sim-targets';
import type { ObservatoryNode } from './types';

export type RequestState =
  | 'queued' // waiting for a slot in its window
  | 'scheduled' // holds a slot; the instrument will work it
  | 'delivered' // a frame came back
  | 'expired' // the window closed with nothing captured — refunds in full
  | 'cancelled'; // the customer withdrew it

/**
 * Price follows the target, not the clock.
 *
 * Someone buying a photograph does not care how long the mount was busy, and
 * charging by the minute would punish exactly the faint objects that are worth
 * the most. First-pass figures from docs/stellar-v2-plan.md §5.2, meant to move
 * once real utilisation is known.
 */
export type RequestClass = 'bright' | 'deep_short' | 'deep_long';

export const REQUEST_CLASSES: Record<RequestClass, { label: string; priceTetri: number }> = {
  bright: { label: 'Bright', priceTetri: 3000 },
  deep_short: { label: 'Deep sky', priceTetri: 5000 },
  deep_long: { label: 'Deep sky, long', priceTetri: 8000 },
};

/**
 * Which class each target falls in.
 *
 * Kept here rather than on `SimTarget` because it is commercial, not optical:
 * `sim-targets.ts` describes what the sky does, and what a photograph of it
 * costs is a different question that will change more often.
 */
const CLASS_BY_TARGET: Record<string, RequestClass> = {
  moon: 'bright',
  jupiter: 'bright',
  saturn: 'bright',
  mars: 'bright',
  venus: 'bright',
  m42: 'deep_short',
  m31: 'deep_short',
  m57: 'deep_long',
};

export function classOf(targetId: string): RequestClass | null {
  return CLASS_BY_TARGET[targetId] ?? null;
}

/** Null when the target is not one this network sells. */
export function priceTetriFor(targetId: string): number | null {
  const cls = classOf(targetId);
  return cls ? REQUEST_CLASSES[cls].priceTetri : null;
}

/** A window shorter than this cannot be filled reliably; longer is unbounded patience. */
export const MIN_WINDOW_HOURS = 12;
export const MAX_WINDOW_DAYS = 21;

export type WindowVerdict = { ok: true } | { ok: false; reason: string };

export function checkWindow(start: Date, end: Date, now = new Date()): WindowVerdict {
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return { ok: false, reason: 'That window ends before it begins.' };
  if (end.getTime() <= now.getTime()) return { ok: false, reason: 'That window has already closed.' };
  if (hours < MIN_WINDOW_HOURS) {
    return {
      ok: false,
      reason: `A window needs at least ${MIN_WINDOW_HOURS} hours — one night of weather is not enough to promise a photograph.`,
    };
  }
  if ((end.getTime() - now.getTime()) / 86_400_000 > MAX_WINDOW_DAYS) {
    return { ok: false, reason: `Windows run to ${MAX_WINDOW_DAYS} days at most.` };
  }
  return { ok: true };
}

/**
 * The first slot inside the window where this node could actually photograph
 * this target, skipping anything already held.
 *
 * Booked live sessions are immovable and requests fill the gaps between them.
 * That ordering is not enforced here — it falls out of the reservation table's
 * unique index on the slot, which is the only lock in the system. This function
 * proposes; the insert disposes.
 */
export function planRequest(input: {
  node: ObservatoryNode;
  targetId: string;
  windowStart: Date;
  windowEnd: Date;
  /** Slot ids that are already spoken for, live or requested. */
  taken: ReadonlySet<string>;
  now?: Date;
}): Slot | null {
  const { node, targetId, windowStart, windowEnd, taken } = input;
  const now = input.now ?? new Date();

  const target = SIM_TARGET_BY_ID.get(targetId);
  if (!target) return null;

  const from = Math.max(windowStart.getTime(), now.getTime());
  if (from >= windowEnd.getTime()) return null;

  // Slots are built from now, so the search has to cover the whole window.
  const nights = Math.ceil((windowEnd.getTime() - now.getTime()) / 86_400_000) + 1;
  const slots = buildSlots(node, { now, nights: Math.min(nights, MAX_WINDOW_DAYS + 1) });

  for (const slot of slots) {
    const startsAt = new Date(slot.startsAt);
    const endsAt = new Date(slot.endsAt);
    if (startsAt.getTime() < from) continue;
    if (endsAt.getTime() > windowEnd.getTime()) continue;
    if (taken.has(slot.id)) continue;

    // Observable for the whole slot, not merely at the moment it opens — a
    // target that sets ten minutes in is a slot sold for half a photograph.
    if (!observableThroughout(node, targetId, startsAt, endsAt)) continue;

    return slot;
  }

  return null;
}

function observableThroughout(
  node: ObservatoryNode,
  targetId: string,
  startsAt: Date,
  endsAt: Date,
): boolean {
  const target = SIM_TARGET_BY_ID.get(targetId);
  if (!target) return false;

  for (const at of [startsAt, new Date((startsAt.getTime() + endsAt.getTime()) / 2), endsAt]) {
    const verdict = evaluateSafety(node, targetAltAz(target, node, at), at);
    if (!verdict.ok) return false;
  }
  return true;
}
