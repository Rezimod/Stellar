'use client';

import { useCallback, useEffect, useMemo, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import type { PublicKey } from '@solana/web3.js';
import PageContainer from '@/components/layout/PageContainer';
import PageTransition from '@/components/ui/PageTransition';
import MarketDetail from '@/components/markets/MarketDetail';
import {
  useReadOnlyProgram,
  usePrivySigner,
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

const POLL_MS = 5000;

export default function MarketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const program = useReadOnlyProgram();
  const signer = usePrivySigner();
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

  useEffect(() => {
    if (loading || notFound) return;
    const id = window.setInterval(() => {
      setRefreshCounter((n) => n + 1);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [loading, notFound]);

  return (
    <PageTransition>
      <PageContainer variant="wide" className="py-3 sm:py-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          {/* TODO(day-9): fix SSR hydration mismatch — styled-jsx class differs server vs client */}
          <button
            onClick={() => router.push('/markets')}
            className="inline-flex items-center gap-1.5"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              letterSpacing: '0.04em',
            }}
          >
            <ArrowLeft size={13} /> Back to markets
          </button>
          {!loading && !notFound && (
            <button
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.45)',
                background: 'transparent',
                border: 'none',
                cursor: refreshing ? 'wait' : 'pointer',
                padding: 0,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
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
        </div>

        {loading ? (
          <div
            className="animate-pulse rounded-xl"
            style={{
              minHeight: 320,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        ) : notFound ? (
          <div
            className="rounded-xl px-4 py-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'var(--font-display)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
            }}
          >
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
          <div
            className="rounded-xl px-4 py-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'var(--font-display)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: 13,
            }}
          >
            Config not initialized on-chain.
          </div>
        )}
      </PageContainer>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageTransition>
  );
}
