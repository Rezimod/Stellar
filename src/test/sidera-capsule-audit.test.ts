// @vitest-environment node
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RARITIES } from '@/lib/rarity';
import { auditLog, type LogRow } from '@/lib/sidera/audit';
import { RARITY_ODDS_BPS } from '@/lib/sidera/economics';
import { commitmentOf, planPulls, purchaseHash, type SupplyEntry } from '@/lib/sidera/randomness';

const hex = (label: string) => createHash('sha256').update(label).digest('hex');
const idOf = (i: number) => `00000000-0000-4000-8000-${i.toString(16).padStart(12, '0')}`;
const SUPPLY: SupplyEntry[] = RARITIES.map((rarity) => ({ designation: rarity.toUpperCase(), rarity, remaining: 1000 }));

/**
 * A log as an honest server writes it: `n` capsules listed in order, each
 * bought and opened. Nothing here is the server's code; it is what the
 * published log would contain.
 */
function honestLog(n: number): LogRow[] {
  const rows: LogRow[] = [];
  let seq = 0;
  const row = (r: Omit<LogRow, 'seq' | 'at'>) => rows.push({ ...r, seq: ++seq, at: new Date(Date.UTC(2026, 8, 20, 0, seq)).toISOString() });
  const capsules = Array.from({ length: n }, (_, i) => ({ id: idOf(i + 1), sequence: i + 1, secret: hex(`secret-${i}`) }));
  for (const c of capsules) {
    row({ capsuleId: c.id, capsuleSequence: c.sequence, event: 'listed', commitment: commitmentOf(c.secret), buyerWallet: null, buyerNonce: null, purchaseHash: null, outcome: null });
  }
  for (const c of capsules) {
    const commitment = commitmentOf(c.secret);
    const wallet = `holder-${c.sequence}`;
    const nonce = hex(`nonce-${c.sequence}`);
    const hash = purchaseHash({ capsuleId: c.id, sequence: c.sequence, commitment, wallet, nonce });
    const buyer = { buyerWallet: wallet, buyerNonce: nonce, purchaseHash: hash };
    row({ capsuleId: c.id, capsuleSequence: c.sequence, event: 'purchased', commitment, ...buyer, outcome: null });
    const pulls = planPulls({ secret: c.secret, nonce, capsuleId: c.id, supply: SUPPLY }).map((p, i) => ({ ...p, editionNumber: i + 1 }));
    row({
      capsuleId: c.id,
      capsuleSequence: c.sequence,
      event: 'opened',
      commitment,
      ...buyer,
      outcome: { secret: c.secret, draws: 3, oddsBps: RARITY_ODDS_BPS, supply: SUPPLY, pulls },
    });
  }
  return rows;
}

describe('auditing the capsule log', () => {
  it('finds nothing in an honest log, and verifies every opened capsule', () => {
    const audit = auditLog(honestLog(6));
    expect(audit.flags).toEqual([]);
    expect(audit).toMatchObject({ listed: 6, purchased: 6, opened: 6, voided: 0, verified: 6 });
  });

  it('shows a suppressed outcome erased from the log as a gap in the listing sequence', () => {
    const rows = honestLog(6).filter((r) => r.capsuleSequence !== 4);
    const audit = auditLog(rows);
    expect(audit.flags).toEqual([expect.objectContaining({ kind: 'sequence_gap', capsuleSequence: 4 })]);
  });

  it('shows an outcome withheld by never opening a sold capsule', () => {
    const rows = honestLog(6).filter((r) => !(r.capsuleSequence === 3 && r.event === 'opened'));
    const audit = auditLog(rows);
    expect(audit.flags).toEqual([expect.objectContaining({ kind: 'purchased_not_opened', capsuleSequence: 3 })]);
  });

  it('shows an outcome withheld by voiding a sold capsule, and checks the secret it reveals', () => {
    const log = honestLog(6);
    const opened = log.find((r) => r.capsuleSequence === 5 && r.event === 'opened')!;
    const secret = (opened.outcome as { secret: string }).secret;
    const rows = log.map((r) =>
      r === opened ? { ...r, event: 'voided' as const, outcome: { secret, reason: 'unpaid', priorState: 'purchased' } } : r,
    );
    expect(auditLog(rows).flags).toEqual([
      expect.objectContaining({ kind: 'voided_after_purchase', capsuleSequence: 5, detail: expect.stringMatching(/unpaid/) }),
    ]);

    const lying = rows.map((r) => (r.capsuleSequence === 5 && r.event === 'voided' ? { ...r, outcome: { secret: hex('x'), reason: 'unpaid', priorState: 'purchased' } } : r));
    expect(auditLog(lying).flags.map((f) => f.kind)).toContain('verification_failed');
  });

  it('fails an opened capsule whose logged cards are not what its secret and nonce draw', () => {
    const rows = honestLog(3).map((r) => {
      if (r.capsuleSequence !== 2 || r.event !== 'opened') return r;
      const o = r.outcome as { pulls: Array<{ designation: string; rarity: string }> };
      const pulls = o.pulls.map((p, i) => (i === 0 ? { ...p, designation: 'LEGENDARY', rarity: p.rarity === 'legendary' ? 'common' : 'legendary' } : p));
      return { ...r, outcome: { ...o, pulls } };
    });
    expect(auditLog(rows).flags).toEqual([expect.objectContaining({ kind: 'verification_failed', capsuleSequence: 2 })]);
  });

  it('catches a nonce changed between purchase and opening', () => {
    const rows = honestLog(2).map((r) => (r.capsuleSequence === 1 && r.event === 'opened' ? { ...r, buyerNonce: hex('swapped') } : r));
    expect(auditLog(rows).flags.map((f) => f.kind)).toContain('nonce_changed');
  });

  it('catches a nonce rewritten at purchase, against the purchase hash', () => {
    const rows = honestLog(2).map((r) => (r.capsuleSequence === 2 && r.event === 'purchased' ? { ...r, buyerNonce: hex('swapped') } : r));
    expect(auditLog(rows).flags.map((f) => f.kind)).toContain('verification_failed');
  });

  it('flags a purchase logged before its listing', () => {
    const rows = honestLog(2);
    const listing = rows.findIndex((r) => r.capsuleSequence === 2 && r.event === 'listed');
    const purchase = rows.findIndex((r) => r.capsuleSequence === 2 && r.event === 'purchased');
    const swapped = rows.map((r, i) => (i === listing ? { ...r, seq: rows[purchase].seq } : i === purchase ? { ...r, seq: rows[listing].seq } : r));
    expect(auditLog(swapped).flags.map((f) => f.kind)).toContain('out_of_order');
  });
});

describe('capsule_log is append-only', () => {
  function sources(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) return sources(full);
      return /\.(ts|tsx)$/.test(name) && !name.endsWith('.test.ts') ? [full] : [];
    });
  }

  it('is never updated, deleted or truncated anywhere in src', () => {
    const offenders = sources(path.resolve(__dirname, '..')).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return (
        /\bUPDATE\s+capsule_log\b/i.test(text) ||
        /\bDELETE\s+FROM\s+capsule_log\b/i.test(text) ||
        /\bTRUNCATE\b[^;]*\bcapsule_log\b/i.test(text) ||
        /\.(update|delete)\(\s*capsuleLog\b/.test(text)
      );
    });
    // The schema's own comment block creates the trigger that refuses them.
    expect(offenders.map((f) => path.relative(process.cwd(), f)).filter((f) => f !== 'src/lib/schema.ts')).toEqual([]);
    expect(readFileSync(path.resolve(__dirname, '../lib/schema.ts'), 'utf8')).toMatch(
      /BEFORE UPDATE OR DELETE ON capsule_log[\s\S]*BEFORE TRUNCATE ON capsule_log/,
    );
  });
});
