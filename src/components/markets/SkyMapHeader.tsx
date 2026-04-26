'use client';

import { useMemo } from 'react';
import type { Market } from '@/lib/markets';
import { getOracleKeyForMarketId } from '@/lib/observer-advantage';

interface Props {
  markets: Market[];
  advantageByMarketId?: Record<number, boolean>;
}

type NodeColor = 'live' | 'open' | 'upcoming' | 'resolved';

interface SkyNode {
  marketId: number;
  title: string;
  yesPct: number;
  color: NodeColor;
  x: number;
  y: number;
  advantage: boolean;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function positionFor(market: Market, rng: () => number): { x: number; y: number } {
  const key = getOracleKeyForMarketId(market.onChain.marketId) ?? market.metadata.id;
  const category = key.split('-')[0];
  const slug = key.toLowerCase();

  if (slug.includes('lyrid')) return { x: 28, y: 18 };
  if (slug.includes('eta-aquar')) return { x: 22, y: 32 };
  if (slug.includes('aurora') || slug.includes('kp5')) return { x: 14, y: 72 };
  if (slug.includes('solar') || slug.includes('mclass') || slug.includes('xclass')) {
    return { x: 86, y: 64 };
  }
  if (slug.includes('vandenberg') || slug.includes('falcon')) {
    return { x: 50 + (rng() - 0.5) * 8, y: 50 + (rng() - 0.5) * 10 };
  }
  if (slug.includes('volcanic') || slug.includes('reykjanes')) {
    return { x: 18 + rng() * 8, y: 74 + rng() * 6 };
  }
  if (slug.includes('wildfire')) return { x: 78 + rng() * 8, y: 72 + rng() * 6 };
  if (slug.includes('cyclone')) return { x: 66 + rng() * 10, y: 60 + rng() * 8 };
  if (slug.includes('m5') || slug.includes('m6') || slug.includes('swarm')) {
    return { x: 10 + rng() * 14, y: 60 + rng() * 12 };
  }

  switch (category) {
    case 'weather':
      return { x: 30 + rng() * 40, y: 20 + rng() * 28 };
    case 'sky':
      return { x: 50 + rng() * 22, y: 28 + rng() * 20 };
    case 'natural':
      return { x: 60 + rng() * 22, y: 12 + rng() * 22 };
    default:
      return { x: 50, y: 40 };
  }
}

function colorForNode(market: Market): NodeColor {
  if (market.status === 'resolved' || market.status === 'cancelled') return 'resolved';
  const msToClose = market.metadata.closeTime.getTime() - Date.now();
  if (market.status === 'open' && msToClose > 0 && msToClose <= 24 * 60 * 60 * 1000) {
    return 'live';
  }
  if (market.status === 'open') return 'open';
  return 'upcoming';
}

const COLOR_MAP: Record<NodeColor, { bg: string; ring: string; label: string }> = {
  live: { bg: 'var(--success)', ring: 'rgba(52,211,153,0.4)', label: 'Live' },
  open: { bg: '#F59E0B', ring: 'rgba(245,158,11,0.32)', label: 'Open' },
  upcoming: { bg: 'rgba(56,240,255,0.55)', ring: 'rgba(56,240,255,0.25)', label: 'Upcoming' },
  resolved: { bg: 'rgba(148,163,184,0.5)', ring: 'rgba(148,163,184,0.2)', label: 'Resolved' },
};

const STAR_DOTS = Array.from({ length: 28 }).map((_, i) => {
  const rng = seededRandom(i * 97 + 11);
  return {
    x: rng() * 100,
    y: rng() * 80,
    size: 1 + rng() * 1.6,
    baseOpacity: 0.1 + rng() * 0.25,
    dur: 2.4 + rng() * 3,
    delay: rng() * 3,
  };
});

export default function SkyMapHeader({ markets, advantageByMarketId = {} }: Props) {
  const nodes: SkyNode[] = useMemo(() => {
    const rng = seededRandom(20260420);
    return markets.map((m) => {
      const pos = positionFor(m, rng);
      return {
        marketId: m.onChain.marketId,
        title: m.metadata.title,
        yesPct: Math.round(m.impliedYesOdds * 100),
        color: colorForNode(m),
        x: Math.max(6, Math.min(94, pos.x)),
        y: Math.max(8, Math.min(82, pos.y)),
        advantage: Boolean(advantageByMarketId[m.onChain.marketId]),
      };
    });
  }, [markets, advantageByMarketId]);

  const nowLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        height: 300,
        borderRadius: 16,
        overflow: 'hidden',
        background:
          'linear-gradient(180deg, #060A12 0%, #0A1020 65%, #050810 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <style>{`
        @keyframes stellar-market-pulse {
          0% { box-shadow: 0 0 0 0 rgba(52,211,153,0.45); }
          70% { box-shadow: 0 0 0 10px rgba(52,211,153,0); }
          100% { box-shadow: 0 0 0 0 rgba(52,211,153,0); }
        }
        .stellar-market-node-live {
          animation: stellar-market-pulse 2.1s ease-out infinite;
        }
        @keyframes stellar-twinkle {
          0%, 100% { opacity: var(--base-op, 0.15); }
          50% { opacity: calc(var(--base-op, 0.15) + 0.35); }
        }
        .stellar-star-dot {
          animation: stellar-twinkle var(--twinkle-dur, 3s) ease-in-out infinite;
          animation-delay: var(--twinkle-delay, 0s);
        }
      `}</style>

      {/* Star dots */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      >
        {STAR_DOTS.map((s, i) => (
          <span
            key={i}
            className="stellar-star-dot"
            style={
              {
                position: 'absolute',
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                '--base-op': s.baseOpacity,
                '--twinkle-dur': `${s.dur}s`,
                '--twinkle-delay': `${s.delay}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Horizon gradient */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '30%',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(10,16,32,0.8) 60%, rgba(5,8,16,1) 100%)',
        }}
      />
      {/* Horizon line */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '4%',
          right: '4%',
          bottom: '18%',
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(255,209,102,0.25) 20%, rgba(255,209,102,0.25) 80%, transparent)',
        }}
      />

      {/* Compass labels */}
      {(['N', 'E', 'S', 'W'] as const).map((d, i) => {
        const positions = [
          { left: '50%', top: 10, transform: 'translateX(-50%)' },
          { right: 14, top: '52%' },
          { left: '50%', bottom: '14%', transform: 'translateX(-50%)' },
          { left: 14, top: '52%' },
        ][i];
        return (
          <span
            key={d}
            style={{
              position: 'absolute',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: 'rgba(255,255,255,0.3)',
              ...positions,
            }}
          >
            {d}
          </span>
        );
      })}

      {/* Time label */}
      <span
        style={{
          position: 'absolute',
          top: 12,
          right: 14,
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.1em',
        }}
      >
        {nowLabel} local · sky map
      </span>

      {/* Market nodes */}
      {nodes.map((n) => {
        const c = COLOR_MAP[n.color];
        const isLive = n.color === 'live';
        return (
          <a
            key={n.marketId}
            href={`#market-${n.marketId}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(`market-${n.marketId}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.animate(
                  [
                    { outline: '2px solid rgba(255,209,102,0.6)' },
                    { outline: '2px solid rgba(255,209,102,0)' },
                  ],
                  { duration: 1400, easing: 'ease-out' },
                );
              }
            }}
            style={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.y}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              textDecoration: 'none',
              cursor: 'pointer',
              zIndex: 2,
            }}
            title={n.title}
          >
            <span
              className={isLive ? 'stellar-market-node-live' : ''}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: c.bg,
                boxShadow: n.advantage
                  ? `0 0 0 2px #FFD166, 0 0 10px ${c.bg}`
                  : `0 0 8px ${c.bg}`,
                outline: n.advantage ? '1px solid rgba(255,209,102,0.8)' : 'none',
                outlineOffset: n.advantage ? 2 : 0,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '2px 7px',
                borderRadius: 999,
                background: 'rgba(6,10,20,0.78)',
                border: `1px solid ${c.ring}`,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '0.01em',
                backdropFilter: 'blur(2px)',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 110,
                }}
              >
                {n.title}
              </span>
              <span style={{ color: 'var(--success)', fontWeight: 700 }}>{n.yesPct}%</span>
            </span>
          </a>
        );
      })}

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          fontFamily: 'var(--font-mono)',
          fontSize: 9.5,
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: '0.04em',
        }}
      >
        {(['live', 'open', 'upcoming', 'resolved'] as NodeColor[]).map((k) => {
          const c = COLOR_MAP[k];
          return (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: c.bg,
                  display: 'inline-block',
                }}
              />
              {c.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
