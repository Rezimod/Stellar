'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import type { NetworkObservation, NodeType } from '@/app/api/network/observations/route';

const NetworkMap = dynamic(() => import('@/components/network/NetworkMap'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="animate-pulse"
      style={{
        height: 420,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>
        Initializing map…
      </span>
    </div>
  ),
});

type Stats = {
  observers: number;
  dataPoints: number;
  darkSites: number;
  countries: number;
  lastUpdated?: string;
};

const NODE_COLOR: Record<NodeType, string> = {
  passive: '#9CA3AF',
  observer: 'var(--stl-teal)',
  advanced: 'var(--stl-gold)',
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then || Number.isNaN(then) || then < 1_000_000_000_000) return '';
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatWallet(w: string | null): string {
  if (!w) return '';
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

function targetEmoji(target: string): string {
  const t = target.toLowerCase();
  if (t.includes('jupiter')) return '🪐';
  if (t.includes('saturn')) return '🪐';
  if (t.includes('mars')) return '🔴';
  if (t.includes('venus')) return '✨';
  if (t.includes('mercury')) return '☿';
  if (t.includes('moon')) return '🌙';
  if (t.includes('sun')) return '☀️';
  if (t.includes('bortle')) return '📡';
  if (t.includes('deep') || t.includes('nebula') || t.includes('galaxy')) return '🌌';
  return '🔭';
}

export default function NetworkPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [observations, setObservations] = useState<NetworkObservation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      fetch('/api/network/stats').then(r => r.json()).then((d: Stats) => setStats(d)),
      fetch('/api/network/observations').then(r => r.json()).then((d: { observations: NetworkObservation[] }) => setObservations(d.observations ?? [])),
    ]).then(() => setLoaded(true));
  }, []);

  const statsDisplay = stats ?? { observers: 0, dataPoints: 0, darkSites: 0, countries: 0 };
  const missionObs = observations.filter(o => o.source === 'mission');
  const recentMissionObs = [...missionObs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const typeCounts = missionObs.reduce(
    (acc, o) => { acc[o.nodeType] = (acc[o.nodeType] ?? 0) + 1; return acc; },
    { passive: 0, observer: 0, advanced: 0 } as Record<NodeType, number>,
  );
  const bortleNodeCount = observations.filter(o => o.source === 'bortle').length;
  typeCounts.advanced = typeCounts.advanced + bortleNodeCount;

  const STAT_ITEMS = [
    { label: 'Observers', value: statsDisplay.observers },
    { label: 'Data Points', value: statsDisplay.dataPoints },
    { label: 'Dark Sites', value: statsDisplay.darkSites },
    { label: 'Countries', value: statsDisplay.countries },
  ];

  return (
    <div className="py-4 sm:py-6" style={{ background: '#030612' }}>
      <style>{`
        @keyframes stl-live-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.55); }
          70% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
        }
        .stl-live-dot { animation: stl-live-pulse 2.2s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <PageContainer variant="wide" className="flex flex-col gap-8">
        <BackButton />

        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="stl-mono-kicker" style={{ color: 'var(--stl-text-dim)' }}>DePIN · SOLANA</span>
            <span
              className="stl-live-dot"
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: 'var(--stl-green)',
                display: 'inline-block',
              }}
              aria-hidden
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--stl-green)', fontWeight: 600 }}>
              LIVE
            </span>
          </div>
          <h1 className="stl-display-lg" style={{ color: 'var(--stl-text-bright)', maxWidth: 680 }}>
            Stellar Observer Network
          </h1>
          <p className="stl-body" style={{ color: 'var(--stl-text-muted)', maxWidth: 540 }}>
            Decentralized sky observation infrastructure. Every phone and telescope is a node.
          </p>
        </div>

        {/* Stats bar */}
        <div className="stl-summary-grid">
          {STAT_ITEMS.map(s => (
            <div key={s.label} className="stl-summary-cell">
              <span className="stl-summary-label">{s.label}</span>
              <span className="stl-summary-value">
                {loaded ? s.value.toLocaleString() : '—'}
              </span>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="stl-card overflow-hidden">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px' }}>
            <span className="stl-label" style={{ color: 'var(--stl-text-bright)' }}>
              Global sky observation grid
            </span>
            <span className="stl-mono-data" style={{ color: 'var(--stl-text-dim)' }}>
              {observations.length} data points
            </span>
          </div>
          <NetworkMap observations={observations} />
          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px', padding: '12px 18px 16px' }}>
            {(
              [
                { label: 'Passive', color: NODE_COLOR.passive, note: 'app check-in' },
                { label: 'Observer', color: NODE_COLOR.observer, note: 'verified photo' },
                { label: 'Advanced', color: NODE_COLOR.advanced, note: 'bortle / scope' },
              ]
            ).map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                <span className="stl-mono-data" style={{ color: 'var(--stl-text-muted)' }}>
                  {item.label}
                </span>
                <span className="stl-mono-data" style={{ color: 'var(--stl-text-dim)' }}>
                  — {item.note}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent observations */}
        <section className="flex flex-col gap-3">
          <div className="stl-cat-header">
            <span className="stl-cat-name">Recent Observations</span>
            <span className="stl-cat-count">{recentMissionObs.length}</span>
          </div>
          {recentMissionObs.length === 0 ? (
            <div
              className="stl-card"
              style={{ padding: '28px 20px', textAlign: 'center' }}
            >
              <p style={{ color: 'var(--stl-text-muted)', fontSize: 14, margin: '0 0 4px' }}>
                No observations yet
              </p>
              <p style={{ color: 'var(--stl-text-dim)', fontSize: 12, margin: 0 }}>
                Become the first observer to contribute to the network
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {recentMissionObs.map(o => {
                const emoji = targetEmoji(o.target);
                const when = timeAgo(o.timestamp);
                return (
                  <div key={o.id} className="stl-row-obs">
                    <span className="stl-row-obs-emoji">{emoji}</span>
                    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span className="stl-row-obs-title">{o.target}</span>
                      {o.wallet && (
                        <span className="stl-mono-data" style={{ color: 'var(--stl-text-dim)' }}>
                          {formatWallet(o.wallet)}
                        </span>
                      )}
                    </div>
                    <div className="stl-row-obs-right">
                      <span
                        className="stl-mono-data"
                        style={{
                          color: NODE_COLOR[o.nodeType],
                          textTransform: 'capitalize',
                          letterSpacing: '0.08em',
                        }}
                      >
                        {o.nodeType}
                      </span>
                      {when && (
                        <span className="stl-row-obs-time">{when}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Node types */}
        <section className="flex flex-col gap-3">
          <div className="stl-cat-header">
            <span className="stl-cat-name">Node Types</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {[
              {
                key: 'passive' as const,
                emoji: '📱',
                label: 'Passive',
                count: typeCounts.passive,
                lines: ['App check-in', 'GPS + timestamp', 'Weather confirmation'],
                reward: '5–25 ✦',
              },
              {
                key: 'observer' as const,
                emoji: '🔭',
                label: 'Observer',
                count: typeCounts.observer,
                lines: ['Photo proof', 'AI verification', 'cNFT sealed on-chain'],
                reward: '50–250 ✦',
              },
              {
                key: 'advanced' as const,
                emoji: '🛸',
                label: 'Advanced',
                count: typeCounts.advanced,
                lines: ['Telescope + camera', 'Bortle readings', 'Multi-band data'],
                reward: '100–500 ✦',
              },
            ].map(card => (
              <div key={card.key} className="stl-card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 20 }}>{card.emoji}</span>
                  <span
                    className="stl-mono-data"
                    style={{
                      color: NODE_COLOR[card.key],
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    {card.label}
                  </span>
                </div>
                <div>
                  <p className="stl-display-lg" style={{ color: 'var(--stl-text-bright)', fontSize: 28, margin: 0, lineHeight: 1 }}>
                    {loaded ? card.count : '—'}
                  </p>
                  <p className="stl-mono-data" style={{ color: 'var(--stl-text-dim)', marginTop: 4 }}>
                    nodes active
                  </p>
                </div>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {card.lines.map(l => (
                    <li key={l} style={{ color: 'var(--stl-text-muted)', fontSize: 12 }}>
                      · {l}
                    </li>
                  ))}
                </ul>
                <p className="stl-mono-data" style={{ color: 'var(--stl-gold)', marginTop: 4 }}>
                  {card.reward} per contribution
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="flex flex-col gap-3">
          <div className="stl-cat-header">
            <span className="stl-cat-name">How it Works</span>
          </div>
          <div className="stl-card" style={{ padding: '20px 22px' }}>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { step: '01', title: 'Observe', body: 'Your phone or telescope captures sky data with GPS and timestamp.' },
                { step: '02', title: 'Verify', body: 'Claude Vision + oracle hash validate the observation.' },
                { step: '03', title: 'Attest', body: 'Proof sealed as a compressed NFT on Solana for ~$0.000005.' },
                { step: '04', title: 'Feed', body: 'Verified data feeds prediction-market resolution.' },
                { step: '05', title: 'Earn', body: 'Stars rewards flow back to the observer who contributed.' },
              ].map(row => (
                <li key={row.step} style={{ display: 'grid', gridTemplateColumns: '44px 1fr', gap: 14, alignItems: 'baseline' }}>
                  <span className="stl-mono-kicker" style={{ color: 'var(--stl-gold)' }}>{row.step}</span>
                  <div>
                    <p className="stl-label" style={{ color: 'var(--stl-text-bright)', margin: 0 }}>{row.title}</p>
                    <p className="stl-body-sm" style={{ color: 'var(--stl-text-muted)', margin: '2px 0 0' }}>{row.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingTop: 4, paddingBottom: 40 }}>
          <Link
            href="/missions"
            className="stl-label"
            style={{
              padding: '12px 22px',
              borderRadius: 'var(--stl-r-md)',
              background: 'var(--stl-gold)',
              color: '#0A0D16',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Become an Observer →
          </Link>
          <Link
            href="/markets"
            className="stl-label"
            style={{
              padding: '12px 22px',
              borderRadius: 'var(--stl-r-md)',
              background: 'transparent',
              border: '1px solid var(--stl-border-strong)',
              color: 'var(--stl-text-bright)',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Browse Markets →
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}
