'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface OnChainObservation {
  pda: string;
  targetCode: number;
  confidence: number;
  observedAt: number;
  starsAwarded: number;
  revoked: boolean;
}

interface OnChainData {
  profilePda: string;
  profile: {
    totalObservations: number;
    totalStars: number;
    firstSeen: number;
    revokedCount: number;
  } | null;
  observations: OnChainObservation[];
  cluster: string;
}

const TARGET_LABEL = ['Moon', 'Planet', 'Stars', 'Constellation', 'Deep sky', 'Unknown'];
const CONFIDENCE_LABEL = ['Rejected', 'Low', 'Medium', 'High'];

const CARD_STYLE: CSSProperties = {
  background:
    'radial-gradient(ellipse 70% 100% at 0% 0%, rgba(94,234,212,0.06) 0%, transparent 60%), ' +
    'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.015) 100%)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 28px -18px rgba(0,0,0,0.55)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  overflow: 'hidden',
};

const KICKER_STYLE: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.18em',
  color: 'var(--stl-text-muted)',
};

const MONO_DIM: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  color: 'var(--stl-text-dim)',
};

function shortPda(pda: string): string {
  return `${pda.slice(0, 4)}…${pda.slice(-4)}`;
}

export function OnChainRecord({ wallet }: { wallet: string }) {
  const [data, setData] = useState<OnChainData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    setStatus('loading');
    fetch(`/api/observe/onchain/${wallet}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('read failed'))))
      .then((d: OnChainData) => {
        if (active) {
          setData(d);
          setStatus('ready');
        }
      })
      .catch(() => active && setStatus('error'));
    return () => {
      active = false;
    };
  }, [wallet]);

  // Hide entirely on error or when the observer has no on-chain record yet —
  // keeps the profile clean for users who haven't observed.
  if (status === 'error') return null;
  if (status === 'ready' && (!data?.profile || data.profile.totalObservations === 0)) {
    return null;
  }

  const cluster = data?.cluster ?? 'devnet';
  const explorer = (addr: string) =>
    `https://explorer.solana.com/address/${addr}?cluster=${cluster}`;

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px', marginBottom: 8 }}>
        <ShieldCheck size={12} color="var(--stl-green)" />
        <span style={KICKER_STYLE}>On-chain record · Proof of Observation</span>
      </div>

      <div style={CARD_STYLE}>
        {/* Summary row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {status === 'loading' || !data?.profile ? (
            <span style={MONO_DIM}>Reading registry…</span>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--stl-text-bright)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1,
                  }}
                >
                  {data.profile.totalObservations}
                </span>
                <span style={KICKER_STYLE}>verified on Solana</span>
              </div>
              <a
                href={explorer(data.profilePda)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 11px',
                  borderRadius: 999,
                  background: 'rgba(94,234,212,0.10)',
                  border: '1px solid rgba(94,234,212,0.25)',
                  color: 'var(--stl-green)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  textDecoration: 'none',
                }}
              >
                Observer account <ExternalLink size={10} />
              </a>
            </>
          )}
        </div>

        {/* Recent observation accounts */}
        {data?.observations && data.observations.length > 0 && (
          <div>
            {data.observations
              .sort((a, b) => b.observedAt - a.observedAt)
              .slice(0, 5)
              .map((o, i, arr) => (
                <a
                  key={o.pda}
                  href={explorer(o.pda)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: o.revoked ? 'var(--stl-text-dim)' : 'var(--stl-text-bright)',
                        fontFamily: 'var(--font-display)',
                        fontSize: 13,
                        fontWeight: 500,
                        margin: 0,
                        textDecoration: o.revoked ? 'line-through' : 'none',
                      }}
                    >
                      {TARGET_LABEL[o.targetCode] ?? 'Unknown'}
                    </p>
                    <p style={{ ...MONO_DIM, margin: '2px 0 0' }}>
                      {CONFIDENCE_LABEL[o.confidence] ?? '—'} · {shortPda(o.pda)}
                      {o.revoked ? ' · revoked' : ''}
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: 'var(--stl-gold)',
                      fontVariantNumeric: 'tabular-nums',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ✦ {o.starsAwarded}
                    <ExternalLink size={10} color="var(--stl-text-dim)" />
                  </span>
                </a>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
