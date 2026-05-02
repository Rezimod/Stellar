'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ExternalLink, Telescope } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import PageTransition from '@/components/ui/PageTransition';
import { Avatar } from '@/lib/avatars';
import FollowButton from '@/components/feed/FollowButton';
import { useStellarUser } from '@/hooks/useStellarUser';

type PublicUser = {
  walletAddress: string;
  username: string | null;
  avatar: string | null;
  createdAt: string | null;
};
type Discovery = {
  id: string;
  type: 'photo' | 'achievement' | string;
  body: string | null;
  imageUrl: string | null;
  observationTarget: string | null;
  observationNftAddress: string | null;
  achievementTarget: string | null;
  achievementMintTx: string | null;
  createdAt: string;
};
type Snapshot = {
  user: PublicUser | null;
  followers: number;
  following: number;
  discoveries: Discovery[];
};

function shortWallet(w: string): string {
  return `${w.slice(0, 4)}…${w.slice(-4)}`;
}

export default function PublicProfilePage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = use(params);
  const { address: myAddress } = useStellarUser();
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<Discovery | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/users/${encodeURIComponent(wallet)}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ user: null, followers: 0, following: 0, discoveries: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wallet]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const isMine = myAddress && myAddress === wallet;
  const user = data?.user;
  const displayName = user?.username && user.username.length > 0
    ? user.username
    : shortWallet(wallet);
  const initial = displayName[0]?.toUpperCase() ?? '✦';
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';

  return (
    <PageTransition>
      <PageContainer variant="content" className="py-6 pb-10">
        <div style={{ marginBottom: 18 }}>
          <Link
            href="/feed"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
              color: 'var(--stl-text-dim)', textDecoration: 'none',
            }}
          >
            <ArrowLeft size={12} /> Back to feed
          </Link>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 12, paddingBottom: 24,
        }}>
          <Avatar avatarId={user?.avatar} initial={initial} size={96} />
          <div style={{ textAlign: 'center' }}>
            <h1
              className="stl-display-lg"
              style={{ color: 'var(--stl-text-bright)', margin: 0, fontSize: 26, lineHeight: 1.1 }}
            >
              {loading ? '…' : displayName}
            </h1>
            <p
              className="stl-mono-data"
              style={{ color: 'var(--stl-text-dim)', margin: '6px 0 0' }}
            >
              {shortWallet(wallet)}
              <a
                href={`https://explorer.solana.com/address/${wallet}?cluster=${cluster}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on Solana Explorer"
                style={{ marginLeft: 6, color: 'var(--stl-text-dim)' }}
              >
                <ExternalLink size={11} style={{ verticalAlign: -1 }} />
              </a>
            </p>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 4 }}>
            <Stat label="Followers" value={data?.followers ?? 0} />
            <span style={{ width: 1, height: 22, background: 'var(--stl-border-soft)' }} />
            <Stat label="Following" value={data?.following ?? 0} />
            <span style={{ width: 1, height: 22, background: 'var(--stl-border-soft)' }} />
            <Stat label="Discoveries" value={data?.discoveries.length ?? 0} />
          </div>

          <div style={{ marginTop: 6 }}>
            {isMine ? (
              <Link
                href="/profile"
                style={{
                  display: 'inline-block', padding: '8px 18px', borderRadius: 999,
                  border: '1px solid var(--stl-border-regular)',
                  color: 'var(--stl-text-bright)', textDecoration: 'none',
                  fontSize: 13, fontFamily: 'var(--font-display)',
                }}
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton wallet={wallet} size="md" />
            )}
          </div>
        </div>

        <div className="stl-cat-header" style={{ marginBottom: 12 }}>
          <span className="stl-cat-name">Discoveries</span>
          <span className="stl-cat-count">{data?.discoveries.length ?? 0}</span>
        </div>

        {loading ? (
          <DiscoveryGridSkeleton />
        ) : !data?.discoveries.length ? (
          <div className="stl-card" style={{ padding: '28px 20px', textAlign: 'center' }}>
            <Telescope size={22} color="var(--stl-text-whisper)" style={{ marginBottom: 8 }} />
            <p className="stl-body-sm" style={{ color: 'var(--stl-text-dim)', margin: 0 }}>
              No public discoveries yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: 8,
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            }}
          >
            {data.discoveries.map(d => (
              <button
                key={d.id}
                onClick={() => setLightbox(d)}
                className="stl-card"
                style={{
                  position: 'relative', aspectRatio: '1', overflow: 'hidden',
                  padding: 0, cursor: d.imageUrl ? 'pointer' : 'default',
                  background: 'var(--stl-bg-surface)',
                }}
              >
                {d.imageUrl ? (
                  <Image
                    src={d.imageUrl}
                    alt={d.observationTarget ?? d.achievementTarget ?? 'Discovery'}
                    fill
                    sizes="(max-width: 600px) 33vw, 200px"
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                ) : (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 6,
                    padding: 12,
                  }}>
                    <Telescope size={22} color="var(--stl-gold)" />
                    <span style={{
                      fontSize: 11, color: 'var(--stl-text-bright)',
                      fontFamily: 'var(--font-display)', textAlign: 'center',
                    }}>
                      {d.achievementTarget ?? d.body ?? 'Sealed observation'}
                    </span>
                  </div>
                )}
                {(d.observationNftAddress || d.achievementMintTx) && (
                  <span style={{
                    position: 'absolute', top: 6, left: 6,
                    padding: '2px 7px', borderRadius: 999,
                    background: 'rgba(11,17,32,0.75)',
                    border: '1px solid var(--stl-border-green)',
                    color: 'var(--stl-green)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>NFT</span>
                )}
              </button>
            ))}
          </div>
        )}
      </PageContainer>

      {lightbox && lightbox.imageUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: 'rgba(3,6,18,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={() => setLightbox(null)}
        >
          <div
            style={{
              position: 'relative', maxWidth: 480, width: '100%',
              borderRadius: 'var(--stl-r-lg)', overflow: 'hidden',
              border: '1px solid var(--stl-border-strong)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={lightbox.imageUrl}
              alt={lightbox.observationTarget ?? 'Discovery'}
              width={480}
              height={480}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              unoptimized
            />
            {(lightbox.observationTarget || lightbox.body) && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '14px 18px',
                background: 'linear-gradient(0deg,rgba(3,6,18,0.92),transparent)',
              }}>
                <p style={{ color: 'var(--stl-text-bright)', fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {lightbox.observationTarget ?? lightbox.body}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </PageTransition>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          color: 'var(--stl-text-bright)',
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          lineHeight: 1.1,
        }}
      >
        {value.toLocaleString()}
      </div>
      <div
        className="stl-mono-kicker"
        style={{ color: 'var(--stl-text-muted)', marginTop: 2 }}
      >
        {label}
      </div>
    </div>
  );
}

function DiscoveryGridSkeleton() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
      }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="stl-card"
          style={{
            aspectRatio: '1', padding: 0,
            background: 'var(--stl-bg-surface)',
          }}
        />
      ))}
    </div>
  );
}
