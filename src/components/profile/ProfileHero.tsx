'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Copy, Check, ExternalLink } from 'lucide-react';
import { Avatar } from '@/lib/avatars';
import { ProfileStats } from './ProfileStats';
import type { ProfileTokens } from './profileTheme';

interface Props {
  tokens: ProfileTokens;
  avatarId: string | null | undefined;
  initial: string;
  onAvatarClick: () => void;
  /** Editable name component; falls back to displayName as a static heading. */
  nameSlot?: ReactNode;
  displayName: string;
  statusLabel: string;
  tagline: string;
  addrShort: string | null;
  address: string | null;
  explorerHref: string | null;
  clusterLabel: string;
  copied: boolean;
  onCopy: () => void;
  copyLabel: string;
  loaded: boolean;
  balance: number;
  earned: number;
  burned: number;
  statLabels: { total: string; earned: string; burned: string };
}

export function ProfileHero({
  tokens, avatarId, initial, onAvatarClick, nameSlot, displayName, statusLabel, tagline,
  addrShort, address, explorerHref, clusterLabel, copied, onCopy, copyLabel,
  loaded, balance, earned, burned, statLabels,
}: Props) {
  const t = useTranslations('profileUi');
  const { card, hairline, iconButton, isLight } = tokens;

  return (
    <div className="pf-hero" style={{ ...card, position: 'relative', overflow: 'hidden', padding: 28 }}>
      {/* decorative planet glow — top-right, purely visual */}
      {!isLight && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: -60,
            right: -40,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 35%, rgba(255, 179, 71,0.18), rgba(59,130,246,0.10) 45%, transparent 70%)',
            filter: 'blur(8px)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        className="pf-hero-grid"
        style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div className="pf-hero-left" style={{ display: 'flex', alignItems: 'center', gap: 20, flex: '1 1 360px', minWidth: 0 }}>
        {/* AVATAR */}
        <button
          onClick={onAvatarClick}
          aria-label={t('avatar.change')}
          style={{
            position: 'relative',
            width: 96,
            height: 96,
            padding: 0,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            borderRadius: '50%',
            flexShrink: 0,
            boxShadow: isLight ? 'none' : '0 0 0 1px rgba(255,255,255,0.06), 0 12px 40px rgba(59,130,246,0.18)',
          }}
        >
          <Avatar avatarId={avatarId} initial={initial} size={96} />
          <span
            aria-hidden
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--bg-elevated)',
              border: `1px solid ${hairline}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--stars)',
            }}
          >
            <Camera size={13} />
          </span>
        </button>

        {/* IDENTITY */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
            {nameSlot ?? (
              <h1
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 26,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {displayName}
              </h1>
            )}
            <span
              style={{
                padding: '5px 12px',
                borderRadius: 999,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'var(--terracotta)',
                background: isLight ? 'rgba(255, 179, 71,0.08)' : 'rgba(255, 179, 71,0.12)',
                border: '1px solid rgba(255, 179, 71,0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              {statusLabel}
            </span>
          </div>

          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-secondary)',
              margin: '0 0 14px',
              lineHeight: 1.5,
              maxWidth: 460,
            }}
          >
            {tagline}
          </p>

          {/* WALLET ROW */}
          {address && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {addrShort} · {clusterLabel}
              </span>
              <button onClick={onCopy} aria-label={copyLabel} style={{ ...iconButton, width: 30, height: 30 }}>
                {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
              </button>
              {explorerHref && (
                <a
                  href={explorerHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('hero.explorer')}
                  style={{ ...iconButton, width: 30, height: 30, textDecoration: 'none' }}
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}
        </div>
        </div>

        {/* STATS */}
        <div className="pf-hero-stats" style={{ flex: '0 0 auto' }}>
          <ProfileStats
            tokens={tokens}
            loaded={loaded}
            balance={balance}
            earned={earned}
            burned={burned}
            labels={statLabels}
          />
        </div>
      </div>
    </div>
  );
}
