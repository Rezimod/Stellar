'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import type { PublicKey } from '@solana/web3.js';
import PageContainer from '@/components/layout/PageContainer';
import PageTransition from '@/components/ui/PageTransition';
import {
  useReadOnlyProgram,
  useStellarProgram,
  useStellarSigner,
} from '@/lib/markets/privy-adapter';
import {
  getConfig,
  getAllMarkets,
  getUserPositions,
  findMetadataByMarketId,
  type MarketOnChain,
  type MarketMetadata,
  type Position,
} from '@/lib/markets';
import { claimWinningsFromUI } from '@/lib/markets/claim-ui';
import { useAppState } from '@/hooks/useAppState';
import {
  checkObserverAdvantage,
  getOracleKeyForMarketId,
  missionsToObservations,
  calculateBonusStars,
  type ObserverAdvantage,
} from '@/lib/observer-advantage';
import MyActiveBets from '@/components/markets/MyActiveBets';

type Bucket = 'active' | 'won' | 'lost' | 'claimed' | 'cashed';

interface CashoutRecord {
  id: string;
  marketId: number;
  side: 'yes' | 'no';
  originalStake: number;
  refundedAmount: number;
}

interface ClaimResult {
  base: number;
  bonus: number;
  total: number;
  advantage: ObserverAdvantage;
}

interface Row {
  position: Position;
  onChain: MarketOnChain | null;
  meta: MarketMetadata | null;
  bucket: Bucket;
  cashout: CashoutRecord | null;
}

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  sky_event: { label: 'SKY', color: 'var(--stl-gold)', bg: 'rgba(255, 179, 71,0.12)', border: 'rgba(255, 179, 71,0.25)', emoji: '🔭' },
  weather_event: { label: 'WEATHER', color: 'var(--seafoam)', bg: 'rgba(94, 234, 212,0.10)', border: 'rgba(94, 234, 212,0.25)', emoji: '🌧' },
  natural_phenomenon: { label: 'NATURE', color: 'var(--terracotta)', bg: 'rgba(255, 179, 71,0.10)', border: 'rgba(255, 179, 71,0.25)', emoji: '⚡' },
};

function fmtInt(n: number): string {
  return n.toLocaleString('en-US');
}

function bucketOf(p: Position, on: MarketOnChain | null): Bucket {
  if (p.claimed) return 'claimed';
  if (!on) return 'active';
  if (!on.resolved && !on.cancelled) return 'active';
  if (on.cancelled) return 'won';
  return on.outcome === p.side ? 'won' : 'lost';
}

export default function MyPositionsPage() {
  const { getAccessToken } = usePrivy();
  const { authenticated, ready } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);
  const readOnly = useReadOnlyProgram();
  const signerProgram = useStellarProgram();
  const signer = useStellarSigner();
  const { state } = useAppState();

  const [mint, setMint] = useState<PublicKey | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [claimStatus, setClaimStatus] = useState<Record<number, string>>({});
  const [starsBalance, setStarsBalance] = useState<number | null>(null);
  const [claimResults, setClaimResults] = useState<Record<number, ClaimResult>>({});

  const observations = useMemo(
    () => missionsToObservations(state.completedMissions ?? []),
    [state.completedMissions],
  );

  const advantageByMarketId = useMemo(() => {
    const map: Record<number, ObserverAdvantage> = {};
    for (const r of rows) {
      const oracleKey = getOracleKeyForMarketId(r.position.marketId);
      map[r.position.marketId] = checkObserverAdvantage(oracleKey, observations);
    }
    return map;
  }, [rows, observations]);

  useEffect(() => {
    let cancelled = false;
    if (!authenticated || !signer.publicKey) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const load = async () => {
      const addr = signer.publicKey!.toBase58();
      const [cfg, positions, onChainAll, cashoutResp] = await Promise.all([
        getConfig(readOnly),
        getUserPositions(readOnly, signer.publicKey!),
        getAllMarkets(readOnly),
        fetch(`/api/markets/cashouts?address=${addr}`).then((r) => r.json()).catch(() => ({ cashouts: [] })),
      ]);
      if (cancelled) return;
      setMint(cfg?.mint ?? null);
      const onById = new Map<number, MarketOnChain>(onChainAll.map((m) => [m.marketId, m]));
      const cashouts = (cashoutResp?.cashouts ?? []) as CashoutRecord[];
      const cashoutByKey = new Map<string, CashoutRecord>(
        cashouts.map((c) => [`${c.marketId}:${c.side}`, c]),
      );
      const out: Row[] = positions.map((p) => {
        const on = onById.get(p.marketId) ?? null;
        const cashout = cashoutByKey.get(`${p.marketId}:${p.side}`) ?? null;
        // A cashed-out position outranks the on-chain bucket. Even if the on-chain
        // side ends up winning, we don't want the user to hit "Claim" again.
        const bucket: Bucket = cashout ? 'cashed' : bucketOf(p, on);
        return {
          position: p,
          onChain: on,
          meta: findMetadataByMarketId(p.marketId),
          bucket,
          cashout,
        };
      });
      out.sort((a, b) => {
        const order: Record<Bucket, number> = { won: 0, active: 1, cashed: 2, lost: 3, claimed: 4 };
        if (order[a.bucket] !== order[b.bucket]) return order[a.bucket] - order[b.bucket];
        return b.position.marketId - a.position.marketId;
      });
      setRows(out);
    };

    load()
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load positions');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, signer.publicKey, readOnly, refreshCounter]);

  const wallet = signer.publicKey?.toBase58() ?? null;
  useEffect(() => {
    if (!wallet) {
      setStarsBalance(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/stars-balance?address=${wallet}`)
      .then((r) => r.json())
      .then((j: { balance?: number }) => {
        if (!cancelled) setStarsBalance(typeof j.balance === 'number' ? j.balance : 0);
      })
      .catch(() => {
        if (!cancelled) setStarsBalance(0);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet, refreshCounter]);

  const summary = useMemo(() => {
    let active = 0;
    let activeStake = 0;
    let claimable = 0;
    for (const r of rows) {
      if (r.bucket === 'active') {
        active++;
        activeStake += r.position.amount;
      }
      if (r.bucket === 'won') claimable += r.position.projectedPayout;
    }
    return { active, activeStake, claimable, total: rows.length };
  }, [rows]);

  const onClaim = useCallback(
    async (marketId: number, basePayout: number) => {
      if (!signerProgram || !mint) return;
      setBusyId(marketId);
      setClaimStatus((s) => ({ ...s, [marketId]: 'Signing…' }));
      try {
        const res = await claimWinningsFromUI(signerProgram, signer, mint, marketId);
        setClaimStatus((s) => ({ ...s, [marketId]: `Claimed · ${res.txSignature.slice(0, 8)}…` }));

        const advantage = advantageByMarketId[marketId];
        const bonus = advantage?.hasAdvantage ? calculateBonusStars(basePayout) : 0;
        setClaimResults((r) => ({
          ...r,
          [marketId]: {
            base: basePayout,
            bonus,
            total: basePayout + bonus,
            advantage: advantage ?? {
              hasAdvantage: false,
              multiplier: 1,
              reason: '',
              observedTarget: '',
              relatedOracleKeys: [],
            },
          },
        }));

        if (advantage?.hasAdvantage && bonus > 0 && signer.publicKey) {
          const walletAddr = signer.publicKey.toBase58();
          const oracleKey = getOracleKeyForMarketId(marketId) ?? `market-${marketId}`;
          getAccessToken()
            .then((token) => {
              if (!token) return;
              return fetch('/api/award-stars', {
                method: 'POST',
                headers: {
                  'content-type': 'application/json',
                  authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  recipientAddress: walletAddr,
                  amount: bonus,
                  reason: `Observer advantage: ${advantage.observedTarget} × ${oracleKey}`,
                  idempotencyKey: `obs-adv-${marketId}-${walletAddr}`,
                }),
              });
            })
            .catch(() => {});
        }

        setRefreshCounter((n) => n + 1);
      } catch (e) {
        setClaimStatus((s) => ({ ...s, [marketId]: `Error: ${(e as Error).message}` }));
      } finally {
        setBusyId(null);
      }
    },
    [signerProgram, mint, signer, advantageByMarketId, getAccessToken],
  );

  if (!ready) {
    return (
      <PageTransition>
        <PageContainer variant="wide" className="py-6">
          <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>Loading…</div>
        </PageContainer>
      </PageTransition>
    );
  }

  if (!authenticated) {
    return (
      <PageTransition>
        <PageContainer variant="wide" className="py-3 sm:py-6 flex flex-col gap-5">
          <header className="flex flex-col gap-1.5">
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1.05, fontWeight: 600, color: 'var(--stl-text-bright)', letterSpacing: '-0.012em', margin: 0 }}>
              My Positions
            </h1>
          </header>
          <div
            className="rounded-xl px-4 py-10 text-center flex flex-col items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span style={{ fontSize: 28, opacity: 0.6 }}>✦</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--stl-text-bright)', margin: 0 }}>Sign in to see your positions</p>
            <button
              onClick={() => setAuthOpen(true)}
              style={{
                marginTop: 4,
                padding: '9px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255, 179, 71,0.5)',
                background: 'var(--stl-gold)',
                color: 'var(--canvas)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Sign in
            </button>
          </div>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </PageContainer>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageContainer variant="wide" className="py-3 sm:py-6 flex flex-col gap-5">
        <header className="flex flex-col gap-1.5">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 38, lineHeight: 1.05, fontWeight: 600, color: 'var(--stl-text-bright)', letterSpacing: '-0.012em', margin: 0 }}>
            My Positions
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.04em', margin: 0 }}>
            {loading ? 'Loading on-chain state…' : `${summary.total} total · ${summary.active} active`}
          </p>
        </header>

        {/* Portfolio summary */}
        <div
          className="rounded-xl p-4 grid grid-cols-3 gap-3"
          style={{
            background: 'var(--surface)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Stat label="Active" value={fmtInt(summary.active)} />
          <Stat label="Staked ✦" value={fmtInt(summary.activeStake)} />
          <Stat label="Claimable ✦" value={fmtInt(summary.claimable)} accent />
        </div>

        {/* Active bets — double down or cash out */}
        <MyActiveBets variant="full" title="Manage open bets" />

        {error && (
          <div style={{ color: 'var(--negative)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Couldn’t load positions — {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, minHeight: 74 }}
              />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div
            className="rounded-xl px-4 py-10 text-center flex flex-col items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span style={{ fontSize: 28, opacity: 0.6 }}>✦</span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--stl-text-bright)', margin: 0 }}>No positions yet</p>
            <Link
              href="/markets"
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid rgba(255, 179, 71,0.5)',
                background: 'var(--stl-gold)',
                color: 'var(--canvas)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Browse markets
            </Link>
          </div>
        ) : (
          (() => {
            // Active rows are managed in the MyActiveBets section above. Show
            // everything else (won / cashed / lost / claimed) here as history.
            const historyRows = rows.filter((r) => r.bucket !== 'active');
            if (historyRows.length === 0) return null;
            return (
              <div className="flex flex-col gap-2">
                <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '4px 0 0' }}>
                  History
                </h3>
                {historyRows.map((r) => (
                  <PositionRow
                    key={`${r.position.marketId}-${r.position.side}`}
                    row={r}
                    busy={busyId === r.position.marketId}
                    status={claimStatus[r.position.marketId]}
                    advantage={advantageByMarketId[r.position.marketId]}
                    claimResult={claimResults[r.position.marketId]}
                    onClaim={() => onClaim(r.position.marketId, r.position.projectedPayout)}
                  />
                ))}
              </div>
            );
          })()
        )}

        <RedeemSection
          wallet={wallet}
          starsBalance={starsBalance}
          hasClaimed={rows.some((r) => r.bucket === 'claimed')}
          getAccessToken={getAccessToken}
        />
      </PageContainer>
    </PageTransition>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          color: accent ? 'var(--stl-gold)' : 'var(--stl-text-bright)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
    </div>
  );
}

const BUCKET_META: Record<Bucket, { label: string; color: string; bg: string; border: string }> = {
  won:     { label: 'Won',         color: 'var(--stl-gold)', bg: 'rgba(255, 179, 71,0.12)', border: 'rgba(255, 179, 71,0.30)' },
  active:  { label: 'Active',      color: 'var(--terracotta)', bg: 'rgba(94, 234, 212,0.10)',  border: 'rgba(94, 234, 212,0.25)' },
  cashed:  { label: 'Cashed out',  color: 'var(--terracotta)', bg: 'rgba(255, 179, 71,0.10)',  border: 'rgba(255, 179, 71,0.30)' },
  lost:    { label: 'Lost',        color: 'var(--negative)', bg: 'rgba(251, 113, 133, 0.10)', border: 'rgba(251, 113, 133, 0.25)' },
  claimed: { label: 'Claimed',     color: 'var(--text-muted)', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)' },
};

function PositionRow({
  row,
  busy,
  status,
  advantage,
  claimResult,
  onClaim,
}: {
  row: Row;
  busy: boolean;
  status?: string;
  advantage?: ObserverAdvantage;
  claimResult?: ClaimResult;
  onClaim: () => void;
}) {
  const { position: p, onChain, meta, bucket } = row;
  const title = meta?.title ?? onChain?.question ?? `Market #${p.marketId}`;
  const cat = meta ? CATEGORY_META[meta.category] : null;
  const b = BUCKET_META[bucket];
  const isYes = p.side === 'yes';
  const showAdvantageBadge =
    advantage?.hasAdvantage && (bucket === 'active' || bucket === 'won');

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {cat && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                fontWeight: 600,
                letterSpacing: '0.14em',
                color: cat.color,
                background: cat.bg,
                border: `1px solid ${cat.border}`,
                borderRadius: 4,
                padding: '2.5px 6px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                lineHeight: 1,
              }}
            >
              {cat.emoji} {cat.label}
            </span>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              color: b.color,
              background: b.bg,
              border: `1px solid ${b.border}`,
              borderRadius: 4,
              padding: '2.5px 6px',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {b.label}
          </span>
        </div>
        <Link
          href={`/markets/${p.marketId}`}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'underline',
            letterSpacing: '0.04em',
          }}
        >
          View market →
        </Link>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 16,
          color: 'var(--stl-text-bright)',
          fontWeight: 600,
          lineHeight: 1.25,
          letterSpacing: '-0.005em',
        }}
      >
        {title}
      </div>

      {showAdvantageBadge && advantage && (
        <ObserverAdvantageBadge reason={advantage.reason} compact />
      )}

      {claimResult && (
        <ClaimResultCard result={claimResult} />
      )}

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: isYes ? 'var(--terracotta)' : 'var(--negative)',
              background: isYes ? 'rgba(94, 234, 212,0.10)' : 'rgba(251, 113, 133, 0.10)',
              border: `1px solid ${isYes ? 'rgba(94, 234, 212,0.25)' : 'rgba(251, 113, 133, 0.25)'}`,
              borderRadius: 4,
              padding: '3px 7px',
            }}
          >
            {p.side.toUpperCase()} · {fmtInt(p.amount)} ✦
          </span>
          {bucket === 'active' && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Projected {fmtInt(p.projectedPayout)} ✦
            </span>
          )}
          {bucket === 'won' && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--stl-gold)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Payout {fmtInt(p.projectedPayout)} ✦
            </span>
          )}
          {bucket === 'lost' && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              No payout
            </span>
          )}
          {bucket === 'cashed' && row.cashout && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--terracotta)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Received {fmtInt(row.cashout.refundedAmount)} ✦ · forfeit{' '}
              {fmtInt(row.cashout.originalStake - row.cashout.refundedAmount)} ✦
            </span>
          )}
        </div>

        {bucket === 'won' && (
          <button
            onClick={onClaim}
            disabled={busy}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid rgba(255, 179, 71,0.5)',
              background: 'var(--stl-gold)',
              color: 'var(--canvas)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.5 : 1,
            }}
          >
            Claim {fmtInt(p.projectedPayout)} ✦
          </button>
        )}
      </div>
      {status && (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: status.startsWith('Error') ? 'var(--negative)' : 'rgba(255,255,255,0.6)',
          }}
        >
          {status}
          {status.startsWith('Claimed') && (
            <>
              {' · '}
              <a
                href="#redeem"
                style={{ color: 'var(--stl-gold)', textDecoration: 'underline' }}
              >
                Redeem Stars for telescope gear →
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ObserverAdvantageBadge({
  reason,
  compact = false,
}: {
  reason: string;
  compact?: boolean;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        fontFamily: 'var(--font-mono)',
        fontSize: compact ? 9.5 : 10.5,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--stl-gold)',
        background: 'rgba(255, 179, 71,0.10)',
        border: '1px solid rgba(255, 179, 71,0.32)',
        borderRadius: 999,
        padding: compact ? '2.5px 7px' : '3.5px 9px',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}
    >
      <span aria-hidden>🔭</span>
      <span>1.5×</span>
      <span style={{ color: 'rgba(255, 179, 71,0.75)', fontWeight: 500, textTransform: 'none', letterSpacing: '0.02em' }}>
        {reason}
      </span>
    </span>
  );
}

function ClaimResultCard({ result }: { result: ClaimResult }) {
  const { base, bonus, total, advantage } = result;
  if (advantage.hasAdvantage && bonus > 0) {
    return (
      <div
        className="rounded-lg px-3 py-2.5 flex flex-col gap-1.5"
        style={{
          background: 'rgba(255, 179, 71,0.06)',
          border: '1px solid rgba(255, 179, 71,0.3)',
        }}
      >
        <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
          <span>Base payout</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtInt(base)} ✦</span>
        </div>
        <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stl-gold)' }}>
          <span>Observer bonus (1.5×)</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>+{fmtInt(bonus)} ✦</span>
        </div>
        <div
          style={{ height: 1, background: 'rgba(255, 179, 71,0.2)', margin: '2px 0' }}
        />
        <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--stl-gold)', fontWeight: 700 }}>
          <span>Total</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtInt(total)} ✦</span>
        </div>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.6)',
            margin: '4px 0 0',
            lineHeight: 1.4,
          }}
        >
          🔭 {advantage.reason}. Your observation gave you an edge.
        </p>
      </div>
    );
  }
  return (
    <div
      className="rounded-lg px-3 py-2.5 flex flex-col gap-1"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--stl-gold)', fontWeight: 700 }}>
        <span>Claimed</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtInt(total)} ✦</span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 11,
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
          lineHeight: 1.4,
        }}
      >
        💡 Complete a related sky mission next time for 1.5× payout —{' '}
        <Link href="/missions" style={{ color: 'var(--stl-gold)', textDecoration: 'underline' }}>
          start a mission →
        </Link>
      </p>
    </div>
  );
}

type Tier = 'basic' | 'plus' | 'premium';

interface TierMeta {
  tier: Tier;
  stars: number;
  headline: string;
  sub: string;
}

const TIER_META: TierMeta[] = [
  { tier: 'basic',   stars: 250,  headline: '10% OFF', sub: 'Any Astroman product' },
  { tier: 'plus',    stars: 500,  headline: '20% OFF', sub: 'Any Astroman product' },
  { tier: 'premium', stars: 1000, headline: 'FREE ACCESSORY', sub: 'Eyepiece kit or moon filter + 15% off telescopes' },
];

interface RedeemCodeResponse {
  code: string;
  tier: Tier;
  discount: string;
  validAt: string[];
  expiresIn: string;
  instruction: string;
}

function RedeemSection({
  wallet,
  starsBalance,
  hasClaimed,
  getAccessToken,
}: {
  wallet: string | null;
  starsBalance: number | null;
  hasClaimed: boolean;
  getAccessToken: () => Promise<string | null>;
}) {
  const [busy, setBusy] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<RedeemCodeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  if (!hasClaimed || !wallet) return null;

  const balance = starsBalance ?? 0;

  const onRedeem = async (tier: Tier) => {
    setBusy(tier);
    setError(null);
    const cfg = TIER_META.find((t) => t.tier === tier)!;
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('Not signed in');
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          walletAddress: wallet,
          starsAmount: Math.max(cfg.stars, balance),
          tier,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? res.statusText);
      setIssued(json as RedeemCodeResponse);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const copyCode = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      id="redeem"
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid rgba(255, 179, 71,0.18)',
      }}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              color: 'var(--stl-text-bright)',
              margin: 0,
              letterSpacing: '-0.005em',
            }}
          >
            Redeem your Stars at Astroman
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              margin: 0,
              letterSpacing: '0.04em',
            }}
          >
            {starsBalance === null
              ? 'Checking balance…'
              : `You have ${starsBalance.toLocaleString('en-US')} ✦ available to redeem`}
          </p>
        </div>
        <a
          href="https://astroman.ge"
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--stl-gold)',
            textDecoration: 'underline',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          astroman.ge →
        </a>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {TIER_META.map((t) => {
          const unlocked = balance >= t.stars;
          const busyThis = busy === t.tier;
          return (
            <div
              key={t.tier}
              className="rounded-lg p-3 flex flex-col gap-2"
              style={{
                background: unlocked ? 'rgba(255, 179, 71,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${unlocked ? 'rgba(255, 179, 71,0.28)' : 'rgba(255,255,255,0.06)'}`,
                opacity: unlocked ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: unlocked ? 'var(--stl-gold)' : 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.14em',
                  fontWeight: 700,
                }}
              >
                {t.headline}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 14,
                  color: 'var(--stl-text-bright)',
                  lineHeight: 1.3,
                }}
              >
                {t.sub}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.55)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {t.stars.toLocaleString('en-US')} ✦
              </div>
              <button
                onClick={() => onRedeem(t.tier)}
                disabled={!unlocked || busyThis}
                style={{
                  marginTop: 'auto',
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: `1px solid ${unlocked ? 'rgba(255, 179, 71,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  background: unlocked ? 'var(--stl-gold)' : 'rgba(255,255,255,0.04)',
                  color: unlocked ? 'var(--canvas)' : 'rgba(255,255,255,0.5)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: unlocked && !busyThis ? 'pointer' : 'default',
                  opacity: busyThis ? 0.6 : 1,
                }}
              >
                {busyThis ? 'Issuing…' : unlocked ? 'Redeem' : `Need ${(t.stars - balance).toLocaleString('en-US')} more ✦`}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--negative)' }}>
          {error}
        </div>
      )}

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.4)',
          margin: 0,
          letterSpacing: '0.04em',
        }}
      >
        Codes valid at astroman.ge + Tbilisi store · 30-day expiry
      </p>

      {issued && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIssued(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-xl p-5 flex flex-col gap-3 max-w-md w-full"
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(255, 179, 71,0.35)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                letterSpacing: '0.14em',
                color: 'var(--stl-gold)',
                textTransform: 'uppercase',
              }}
            >
              {issued.tier} tier · {issued.discount}
            </div>
            <div
              className="rounded-lg p-3 flex items-center justify-between gap-3"
              style={{ background: 'rgba(255, 179, 71,0.08)', border: '1px solid rgba(255, 179, 71,0.3)' }}
            >
              <code
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  color: 'var(--stl-gold)',
                  letterSpacing: '0.04em',
                  wordBreak: 'break-all',
                }}
              >
                {issued.code}
              </code>
              <button
                onClick={copyCode}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid rgba(255, 179, 71,0.5)',
                  background: copied ? 'var(--terracotta)' : 'var(--stl-gold)',
                  color: 'var(--canvas)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copied' : 'Copy code'}
              </button>
            </div>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                color: 'rgba(255,255,255,0.75)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {issued.instruction}.
              <br />
              Valid at: {issued.validAt.join(' · ')}
              <br />
              Expires: {issued.expiresIn}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <a
                href="https://astroman.ge"
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255, 179, 71,0.5)',
                  background: 'var(--stl-gold)',
                  color: 'var(--canvas)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                }}
              >
                Open astroman.ge
              </a>
              <button
                onClick={() => setIssued(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.7)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
