'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useReadOnlyProgram } from '@/lib/markets/privy-adapter';
import { useAppState } from '@/hooks/useAppState';
import { getFullMarkets, type Market } from '@/lib/markets';
import {
  checkObserverAdvantage,
  getOracleKeyForMarketId,
  missionsToObservations,
} from '@/lib/observer-advantage';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function categoryEmoji(category: string, title: string): string {
  const t = title.toLowerCase();
  if (t.includes('lyrid') || t.includes('meteor')) return '☄';
  if (t.includes('launch') || t.includes('falcon') || t.includes('vandenberg')) return '🚀';
  if (t.includes('flare') || t.includes('solar')) return '☀';
  if (t.includes('kp') || t.includes('geomagnetic') || t.includes('aurora')) return '✨';
  if (t.includes('clear') || t.includes('rain') || t.includes('frost') || t.includes('warm') || t.includes('dry')) return '🌧';
  if (t.includes('jupiter')) return '🪐';
  if (t.includes('saturn')) return '🪐';
  if (t.includes('volcanic') || t.includes('eruption')) return '🌋';
  if (t.includes('wildfire') || t.includes('fire')) return '🔥';
  if (t.includes('cyclone') || t.includes('tropical')) return '🌀';
  if (t.includes('earthquake') || t.includes('m5') || t.includes('m6') || t.includes('swarm')) return '🌍';
  if (category === 'sky_event') return '🔭';
  if (category === 'weather_event') return '🌧';
  if (category === 'natural_phenomenon') return '⚡';
  return '✦';
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'closed';
  const sec = Math.floor(ms / 1000);
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function TonightMarkets({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
  const program = useReadOnlyProgram();
  const { state } = useAppState();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getFullMarkets(program)
      .then((ms) => {
        if (!cancelled) setMarkets(ms);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [program]);

  const observations = useMemo(
    () => missionsToObservations(state.completedMissions ?? []),
    [state.completedMissions],
  );

  const tonight = useMemo(() => {
    const now = Date.now();
    return markets
      .filter((m) => m.status === 'open')
      .filter((m) => {
        const ms = m.metadata.closeTime.getTime() - now;
        return ms > 0 && ms <= SEVEN_DAYS_MS;
      })
      .sort(
        (a, b) => a.metadata.closeTime.getTime() - b.metadata.closeTime.getTime(),
      )
      .slice(0, variant === 'compact' ? 3 : 6);
  }, [markets, variant]);

  const urgentCount = useMemo(
    () =>
      tonight.filter(
        (m) =>
          m.metadata.closeTime.getTime() - Date.now() <= TWENTY_FOUR_HOURS_MS,
      ).length,
    [tonight],
  );

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '4px 1px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              minWidth: 220,
              height: 140,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}
          />
        ))}
      </div>
    );
  }

  if (error) return null;

  if (tonight.length === 0) {
    return (
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'var(--font-display)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        No markets tonight — check back tomorrow.
      </div>
    );
  }

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              fontWeight: 600,
              color: '#F2F0EA',
              margin: 0,
              letterSpacing: '-0.005em',
            }}
          >
            Tonight&apos;s Markets
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
            }}
          >
            {tonight.length} open
            {urgentCount > 0 ? ` · ${urgentCount} closing soon` : ''}
          </span>
        </div>
        <Link
          href="/markets"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#FFD166',
            textDecoration: 'none',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          View all →
        </Link>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          padding: '2px 1px 6px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tonight.map((m) => {
          const now = Date.now();
          const msToClose = m.metadata.closeTime.getTime() - now;
          const urgent = msToClose <= TWENTY_FOUR_HOURS_MS;
          const yesPct = Math.round(m.impliedYesOdds * 100);
          const emoji = categoryEmoji(m.metadata.category, m.metadata.title);
          const oracleKey = getOracleKeyForMarketId(m.onChain.marketId);
          const advantage = checkObserverAdvantage(oracleKey, observations);

          return (
            <Link
              key={m.onChain.marketId}
              href={`/markets/${m.onChain.marketId}`}
              style={{
                minWidth: 210,
                maxWidth: 230,
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 12,
                background: 'linear-gradient(145deg, rgba(20,24,40,0.75), rgba(8,10,20,0.95))',
                border: urgent
                  ? '1px solid rgba(52,211,153,0.35)'
                  : '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>{emoji}</span>
                {advantage.hasAdvantage && (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      color: '#FFD166',
                      background: 'rgba(255,209,102,0.10)',
                      border: '1px solid rgba(255,209,102,0.32)',
                      borderRadius: 999,
                      padding: '2px 6px',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}
                  >
                    🔭 1.5×
                  </span>
                )}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 14,
                  color: '#F2F0EA',
                  fontWeight: 600,
                  lineHeight: 1.25,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  minHeight: 36,
                }}
              >
                {m.metadata.title}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.55)',
                }}
              >
                <span style={{ color: '#34D399', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  YES {yesPct}%
                </span>
                <span
                  style={{
                    color: urgent ? '#34D399' : 'rgba(255,255,255,0.5)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  closes {formatCountdown(msToClose)}
                </span>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: '#FFD166',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: 2,
                }}
              >
                Trade →
              </span>
            </Link>
          );
        })}
      </div>

      <Link
        href="/missions"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 12,
          color: 'rgba(255,209,102,0.85)',
          textDecoration: 'none',
          alignSelf: 'flex-start',
        }}
      >
        🔭 Observe tonight for 1.5× on these markets →
      </Link>
    </section>
  );
}
