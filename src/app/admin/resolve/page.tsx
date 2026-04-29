'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import PageTransition from '@/components/ui/PageTransition';
import { useReadOnlyProgram, useStellarSigner } from '@/lib/markets/privy-adapter';
import {
  getAllMarkets,
  findMetadataByMarketId,
  type MarketOnChain,
  type MarketMetadata,
} from '@/lib/markets';

interface Row {
  onChain: MarketOnChain;
  meta: MarketMetadata | null;
}

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_WALLET ?? '';

export default function AdminResolvePage() {
  const program = useReadOnlyProgram();
  const signer = useStellarSigner();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [status, setStatus] = useState<Record<number, string>>({});
  const [adminSecret, setAdminSecret] = useState<string>('');
  const [refreshCounter, setRefreshCounter] = useState(0);

  const userAddress = signer.publicKey?.toBase58() ?? null;
  const authorized = useMemo(
    () => Boolean(userAddress && ADMIN && userAddress === ADMIN),
    [userAddress],
  );

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    getAllMarkets(program)
      .then((all) => {
        if (cancelled) return;
        const now = Date.now();
        const pending = all
          .filter((m) => !m.resolved && !m.cancelled && m.resolutionTime.getTime() <= now)
          .map((on) => ({ onChain: on, meta: findMetadataByMarketId(on.marketId) }))
          .sort((a, b) => a.onChain.marketId - b.onChain.marketId);
        setRows(pending);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load markets');
      });
    return () => {
      cancelled = true;
    };
  }, [program, refreshCounter]);

  const resolve = useCallback(
    async (marketId: number, outcome: 'yes' | 'no') => {
      if (!authorized) return;
      if (!adminSecret) {
        setStatus((s) => ({ ...s, [marketId]: 'Enter admin secret first' }));
        return;
      }
      setBusyId(marketId);
      setStatus((s) => ({ ...s, [marketId]: 'Submitting…' }));
      try {
        const res = await fetch('/api/admin/resolve-market', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-admin-secret': adminSecret,
          },
          body: JSON.stringify({ marketId, outcome, caller: userAddress }),
        });
        const json = await res.json();
        if (!res.ok) {
          setStatus((s) => ({ ...s, [marketId]: `Error: ${json.error ?? res.statusText}` }));
          return;
        }
        setStatus((s) => ({ ...s, [marketId]: `Resolved ${outcome.toUpperCase()} · ${json.txSignature.slice(0, 8)}…` }));
        setRefreshCounter((n) => n + 1);
      } catch (e) {
        setStatus((s) => ({ ...s, [marketId]: `Error: ${(e as Error).message}` }));
      } finally {
        setBusyId(null);
      }
    },
    [authorized, adminSecret, userAddress],
  );

  return (
    <PageTransition>
      <PageContainer variant="wide" className="py-3 sm:py-6 flex flex-col gap-5">
        <header className="flex flex-col gap-1.5">
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 38,
              lineHeight: 1.05,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.012em',
              margin: 0,
            }}
          >
            Admin · Resolve
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '0.04em',
              margin: 0,
            }}
          >
            Manual resolution for markets past resolution_time.
          </p>
        </header>

        {!authorized && (
          <div
            className="rounded-xl px-4 py-6 text-center"
            style={{
              background: 'rgba(251, 113, 133,0.06)',
              border: '1px solid rgba(251, 113, 133,0.2)',
              color: 'rgba(252,165,165,0.85)',
              fontFamily: 'var(--font-display)',
              fontSize: 13,
            }}
          >
            Not authorized. Sign in with the admin wallet
            {ADMIN ? <> (<span style={{ fontFamily: 'var(--font-mono)' }}>{ADMIN.slice(0, 8)}…</span>)</> : ' (NEXT_PUBLIC_ADMIN_WALLET not set)'}.
            {userAddress && <div style={{ opacity: 0.7, marginTop: 4 }}>Currently: {userAddress.slice(0, 8)}…</div>}
          </div>
        )}

        {authorized && (
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <label
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Admin secret
            </label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="ADMIN_SECRET"
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '6px 10px',
                color: 'var(--text)',
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                outline: 'none',
              }}
            />
          </div>
        )}

        {error && (
          <div style={{ color: 'var(--negative)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
            Couldn’t load markets — {error}
          </div>
        )}

        {authorized && rows && rows.length === 0 && (
          <div
            className="rounded-xl px-4 py-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'var(--font-display)',
              fontSize: 14,
            }}
          >
            No pending markets.
          </div>
        )}

        {authorized && rows && rows.length > 0 && (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const title = r.meta?.title ?? r.onChain.question;
              const source = r.meta?.resolutionSource ?? 'On-chain market — no metadata';
              const yesCond = r.meta?.yesCondition ?? '';
              const total = r.onChain.yesPool + r.onChain.noPool;
              const line = status[r.onChain.marketId];
              const busy = busyId === r.onChain.marketId;
              return (
                <div
                  key={r.onChain.marketId}
                  className="rounded-xl p-4 flex flex-col gap-3"
                  style={{
                    background: 'linear-gradient(145deg, rgba(20,24,40,0.75), rgba(8,10,20,0.95))',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 17,
                        color: 'var(--text)',
                        fontWeight: 600,
                        lineHeight: 1.25,
                      }}
                    >
                      #{r.onChain.marketId} · {title}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Source: {source}
                    </div>
                    {yesCond && (
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.6)',
                        }}
                      >
                        <span style={{ color: 'var(--success)' }}>YES if</span> {yesCond}
                      </div>
                    )}
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 11,
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      Pool: YES {r.onChain.yesPool} · NO {r.onChain.noPool} · Total {total}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={busy}
                      onClick={() => resolve(r.onChain.marketId, 'yes')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(94, 234, 212,0.4)',
                        background: 'rgba(94, 234, 212,0.12)',
                        color: 'var(--success)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        cursor: busy ? 'default' : 'pointer',
                        opacity: busy ? 0.5 : 1,
                      }}
                    >
                      Resolve YES
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => resolve(r.onChain.marketId, 'no')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(251, 113, 133,0.4)',
                        background: 'rgba(251, 113, 133,0.12)',
                        color: 'var(--negative)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        cursor: busy ? 'default' : 'pointer',
                        opacity: busy ? 0.5 : 1,
                      }}
                    >
                      Resolve NO
                    </button>
                    {line && (
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 11,
                          color: line.startsWith('Error') ? 'var(--negative)' : 'rgba(255,255,255,0.7)',
                        }}
                      >
                        {line}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PageContainer>
    </PageTransition>
  );
}
