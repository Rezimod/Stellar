/**
 * Reading the capsule log for what it should not contain.
 *
 * Pure: it takes the published rows and nothing else, so anyone holding a copy
 * of the log can run it. What it looks for is the evidence a selective abort
 * leaves behind. A capsule is listed, with a sequence number and a
 * commitment, before it can be sold; so a server that throws away an outcome
 * it does not like has three options, and each is visible here:
 *
 *   - erase the capsule from the log  → a gap in the listing sequence
 *   - sell it and never open it        → purchased, not opened
 *   - sell it and void it              → voided after purchase
 *
 * None of these is proof of bad faith on its own — an unpaid order is voided
 * after purchase too — which is why a void reveals the secret and a reason.
 */

import type { Rarity } from '@/lib/rarity';
import { commitmentOf, purchaseHash, verifyCapsule, type SupplyEntry } from './randomness';

export type CapsuleEvent = 'listed' | 'purchased' | 'opened' | 'voided';

export type LogRow = {
  seq: number;
  capsuleId: string;
  capsuleSequence: number;
  event: CapsuleEvent;
  commitment: string;
  buyerWallet: string | null;
  buyerNonce: string | null;
  purchaseHash: string | null;
  outcome: unknown;
  at: string;
};

/** What an 'opened' row's outcome carries. */
export type OpenedOutcome = {
  secret: string;
  draws: number;
  oddsBps: Record<Rarity, number>;
  supply: SupplyEntry[];
  pulls: Array<{ drawIndex: number; designation: string; rarity: string; editionNumber: number }>;
};

/** What a 'voided' row's outcome carries. */
export type VoidedOutcome = { secret: string; reason: string; priorState: 'listed' | 'purchased' };

export type AuditFlag = {
  kind:
    | 'sequence_gap'
    | 'unlisted_event'
    | 'out_of_order'
    | 'commitment_changed'
    | 'nonce_changed'
    | 'purchased_not_opened'
    | 'voided_after_purchase'
    | 'verification_failed';
  capsuleSequence?: number;
  capsuleId?: string;
  detail: string;
};

export type Audit = {
  listed: number;
  purchased: number;
  opened: number;
  voided: number;
  verified: number;
  flags: AuditFlag[];
};

const ORDER: Record<CapsuleEvent, number> = { listed: 0, purchased: 1, opened: 2, voided: 2 };

export function auditLog(rows: LogRow[]): Audit {
  const flags: AuditFlag[] = [];
  const byCapsule = new Map<string, LogRow[]>();
  for (const r of [...rows].sort((a, b) => a.seq - b.seq)) {
    const list = byCapsule.get(r.capsuleId) ?? [];
    list.push(r);
    byCapsule.set(r.capsuleId, list);
  }

  // Every listing number from 1 to the highest must be present. A capsule
  // that vanished from the log leaves its number behind.
  const listedSeqs = new Set(rows.filter((r) => r.event === 'listed').map((r) => r.capsuleSequence));
  const highest = Math.max(0, ...rows.map((r) => r.capsuleSequence));
  for (let n = 1; n <= highest; n++) {
    if (!listedSeqs.has(n)) flags.push({ kind: 'sequence_gap', capsuleSequence: n, detail: `no 'listed' entry for capsule ${n}` });
  }

  let verified = 0;
  const counts = { listed: 0, purchased: 0, opened: 0, voided: 0 };
  for (const [capsuleId, events] of byCapsule) {
    const at = (e: CapsuleEvent) => events.find((x) => x.event === e);
    const listed = at('listed');
    const purchased = at('purchased');
    const opened = at('opened');
    const voided = at('voided');
    const capsuleSequence = events[0].capsuleSequence;
    const flag = (kind: AuditFlag['kind'], detail: string) => flags.push({ kind, capsuleId, capsuleSequence, detail });
    for (const e of events) counts[e.event]++;

    if (!listed) flag('unlisted_event', `'${events[0].event}' with no 'listed' entry before it`);
    for (let i = 1; i < events.length; i++) {
      if (ORDER[events[i].event] <= ORDER[events[i - 1].event]) {
        flag('out_of_order', `'${events[i].event}' after '${events[i - 1].event}'`);
      }
    }
    if (events.some((e) => e.commitment !== events[0].commitment)) {
      flag('commitment_changed', 'the commitment differs between entries');
    }
    // The purchase hash binds the nonce to this capsule, its commitment and
    // its holder; recomputing it from the logged fields must give the logged hash.
    if (purchased && purchased.purchaseHash !== purchaseHash({
      capsuleId,
      sequence: capsuleSequence,
      commitment: purchased.commitment,
      wallet: purchased.buyerWallet ?? '',
      nonce: purchased.buyerNonce ?? '',
    })) {
      flag('verification_failed', 'the purchase hash does not match the logged capsule, holder and nonce');
    }
    if (purchased && opened && purchased.buyerNonce !== opened.buyerNonce) {
      flag('nonce_changed', 'the nonce at opening is not the nonce recorded at purchase');
    }

    if (purchased && !opened && !voided) {
      flag('purchased_not_opened', `purchased at ${purchased.at}, not opened`);
    }
    if (purchased && voided) {
      const v = voided.outcome as VoidedOutcome | null;
      flag('voided_after_purchase', `voided after purchase: ${v?.reason ?? 'no reason given'}`);
    }
    if (voided) {
      const v = voided.outcome as VoidedOutcome | null;
      if (!v?.secret || commitmentOf(v.secret) !== voided.commitment) {
        flag('verification_failed', 'the secret revealed at void does not match the commitment');
      }
    }

    if (opened) {
      const o = opened.outcome as OpenedOutcome | null;
      const result = o
        ? verifyCapsule({
            commitment: opened.commitment,
            secret: o.secret,
            nonce: opened.buyerNonce ?? '',
            capsuleId,
            pulls: o.pulls ?? [],
            supply: o.supply ?? [],
            draws: o.draws,
            oddsBps: o.oddsBps,
          })
        : { ok: false, problems: ['no outcome recorded'] };
      if (result.ok) verified++;
      else flag('verification_failed', result.problems.join('; '));
    }
  }

  return { ...counts, verified, flags };
}
