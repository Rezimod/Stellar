'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { PublicKey } from '@solana/web3.js';
import PageTransition from '@/components/ui/PageTransition';
import MarketDetail from '@/components/markets/MarketDetail';
import {
  useReadOnlyProgram,
  useStellarSigner,
} from '@/lib/markets/privy-adapter';
import {
  getConfig,
  getMarket,
  getUserPositions,
  findMetadataByMarketId,
  type MarketOnChain,
  type MarketMetadata,
  type Position,
} from '@/lib/markets';
import {
  checkObserverAdvantage,
  getOracleKeyForMarketId,
  missionsToObservations,
} from '@/lib/observer-advantage';
import { useAppState } from '@/hooks/useAppState';
import { useVisibleInterval } from '@/hooks/useVisibleInterval';

const POLL_MS = 5000;
const THEME_KEY = 'stellar-markets-theme';
type Theme = 'light' | 'dark';

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const program = useReadOnlyProgram();
  const signer = useStellarSigner();
  const { state } = useAppState();
  const marketId = useMemo(() => Number(id), [id]);

  const observerAdvantage = useMemo(() => {
    if (!Number.isFinite(marketId)) return null;
    const observations = missionsToObservations(state.completedMissions ?? []);
    const oracleKey = getOracleKeyForMarketId(marketId);
    return checkObserverAdvantage(oracleKey, observations);
  }, [marketId, state.completedMissions]);

  const [onChain, setOnChain] = useState<MarketOnChain | null>(null);
  const [meta, setMeta] = useState<MarketMetadata | null>(null);
  const [mint, setMint] = useState<PublicKey | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') setTheme('dark');
  }, []);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
  }

  const userAddress = signer.publicKey?.toBase58() ?? null;

  const refresh = useCallback(() => setRefreshCounter((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!Number.isFinite(marketId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const isInitial = refreshCounter === 0;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setNotFound(false);

    const loadAll = async () => {
      const [cfg, on] = await Promise.all([
        getConfig(program),
        getMarket(program, marketId),
      ]);
      if (cancelled) return;
      if (!on) {
        setNotFound(true);
        return;
      }
      setOnChain(on);
      setMint(cfg?.mint ?? null);
      setMeta(findMetadataByMarketId(marketId));

      if (signer.publicKey) {
        const [all, balResp] = await Promise.all([
          getUserPositions(program, signer.publicKey),
          fetch(`/api/stars-balance?address=${signer.publicKey.toBase58()}`)
            .then((r) => r.json())
            .catch(() => ({ balance: 0 })),
        ]);
        if (cancelled) return;
        setPositions(all.filter((p) => p.marketId === marketId));
        setBalance(
          typeof balResp?.balance === 'number' ? balResp.balance : 0,
        );
      } else {
        setPositions([]);
        setBalance(null);
      }
    };

    loadAll()
      .catch((err) => {
        if (cancelled) return;
        console.error('[market detail] load failed', err);
        setNotFound(true);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [program, marketId, refreshCounter, userAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  useVisibleInterval(
    () => setRefreshCounter((n) => n + 1),
    loading || notFound ? null : POLL_MS,
  );

  return (
    <PageTransition>
      <div className={`markets-page ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="mkt-shell">
          {/* Stats bar — matches /markets layout: back link + refresh + theme toggle */}
          <div className="mkt-stats-bar">
            <button
              type="button"
              onClick={() => router.push('/markets')}
              className="mkt-detail-back"
            >
              <ArrowLeft size={13} /> Back to markets
            </button>
            <div className="flex items-center gap-3">
              {!loading && !notFound && (
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  className="mkt-detail-refresh"
                >
                  <RefreshCw
                    size={11}
                    style={{
                      animation: refreshing ? 'spin 1s linear infinite' : 'none',
                    }}
                  />
                  {refreshing ? 'Refreshing' : 'Refresh'}
                </button>
              )}
              <button
                type="button"
                className="mkt-theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              />
            </div>
          </div>

          <div className="mkt-detail-body">
            {loading ? (
              <div
                className="animate-pulse rounded-xl"
                style={{
                  minHeight: 320,
                  background: 'var(--stl-bg2)',
                  border: '1px solid var(--stl-border)',
                }}
              />
            ) : notFound ? (
              <div className="mkt-detail-notice">
                Market #{id} not found on-chain.
              </div>
            ) : onChain && mint ? (
              <MarketDetail
                onChain={onChain}
                meta={meta}
                mint={mint}
                positions={positions}
                balance={balance}
                onRefresh={refresh}
                observerAdvantage={observerAdvantage}
              />
            ) : (
              <div className="mkt-detail-notice">
                Config not initialized on-chain.
              </div>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageTransition>
  );
}
