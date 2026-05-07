'use client';

import { useMemo } from 'react';
import type { Mission } from '@/lib/types';
import { ArrowRight, ExternalLink, Share2, Bookmark, Send } from 'lucide-react';
import MissionRotateArt from './MissionRotateArt';

interface Props {
  mission: Mission;
  starsBase: number;
  starsBonus: number;
  streakMultiplier: number;
  skyScore: number;
  nftNumber: number;
  solanaTxShort: string;
  solanaExplorerUrl: string;
  onViewCollection: () => void;
  onShare: () => void;
  onSave: () => void;
  onContinue: () => void;
  onPostToFeed?: () => void;
}

const TAGLINES: Record<string, string> = {
  jupiter:   'Four Galilean moons, captured',
  'quick-jupiter': 'Four Galilean moons, captured',
  saturn:    'Rings at their widest',
  'quick-saturn': 'Rings at their widest',
  moon:      'Craters sharp at the terminator',
  venus:     'The evening star, claimed',
  mars:      'Rust-red and unmistakable',
  mercury:   'Caught the fleeting one',
  pleiades:  'Seven sisters, one glance',
  orion:     'A stellar nursery, 1,344 ly close',
  andromeda: 'A trillion suns',
  crab:      'Ghost of a 1054 AD supernova',
};

const META_LINES: Record<string, string> = {
  jupiter:   'GAS GIANT',
  'quick-jupiter': 'GAS GIANT',
  saturn:    'RINGED PLANET',
  'quick-saturn': 'RINGED PLANET',
  moon:      'SATELLITE · EARTH',
  venus:     'EVENING STAR',
  mars:      'TERRESTRIAL',
  mercury:   'INNER PLANET',
  pleiades:  'M45 · CLUSTER',
  orion:     'M42 · NEBULA',
  andromeda: 'M31 · GALAXY',
  crab:      'M1 · REMNANT',
};

function scoreLabel(score: number) {
  if (score >= 85) return 'EXCEPTIONAL';
  if (score >= 70) return 'GOOD';
  if (score >= 50) return 'FAIR';
  return 'POOR';
}

export default function DiscoverySealed({
  mission,
  starsBase,
  starsBonus,
  streakMultiplier,
  skyScore,
  nftNumber,
  solanaTxShort,
  solanaExplorerUrl,
  onViewCollection,
  onShare,
  onSave,
  onContinue,
  onPostToFeed,
}: Props) {
  const totalStars = starsBase + starsBonus;
  const tagline = TAGLINES[mission.id] ?? 'Sealed on Solana';
  const metaLine = META_LINES[mission.id] ?? 'CELESTIAL';

  const scoreDash = useMemo(() => {
    const circumference = 2 * Math.PI * 20;
    const filled = (skyScore / 100) * circumference;
    return `${filled} ${circumference}`;
  }, [skyScore]);

  return (
    <div
      className="relative min-h-full w-full overflow-hidden"
      style={{
        background: [
          'radial-gradient(ellipse 480px 360px at 50% 18%, rgba(255, 179, 71,0.07) 0%, transparent 55%)',
          'var(--canvas)',
        ].join(', '),
      }}
    >
      {BG_STARS.map((s, i) => (
        <div
          key={i}
          className="stl-tw"
          style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            background: '#fff',
            borderRadius: '50%',
            animationDelay: s.delay,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        className="relative z-[1] mx-auto flex flex-col items-center text-center"
        style={{ maxWidth: 420, padding: '10px 20px 14px' }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1 h-1 rounded-full" style={{ background: 'var(--stl-gold)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              color: 'var(--stl-gold)',
              letterSpacing: '0.28em',
              fontWeight: 500,
            }}
          >
            DISCOVERY SEALED
          </span>
          <div className="w-1 h-1 rounded-full" style={{ background: 'var(--stl-gold)' }} />
        </div>

        <SealStamp missionId={mission.id} />

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 24,
            color: 'var(--text)',
            fontWeight: 500,
            margin: 0,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            marginTop: 8,
          }}
        >
          {mission.name}{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.55)' }}>
            sealed
          </span>
        </h1>

        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'rgba(255,255,255,0.42)',
              letterSpacing: '0.14em',
            }}
          >
            {metaLine}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>·</span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 11,
              color: 'rgba(255,255,255,0.65)',
              fontStyle: 'italic',
              fontWeight: 400,
            }}
          >
            {tagline}
          </span>
        </div>

        <div
          className="w-full relative overflow-hidden flex items-center justify-between"
          style={{
            marginTop: 10,
            padding: '8px 14px',
            borderRadius: 12,
            background: 'linear-gradient(145deg, rgba(255, 179, 71,0.1) 0%, rgba(255, 179, 71,0.02) 100%)',
            border: '1px solid rgba(255, 179, 71,0.28)',
          }}
        >
          <div className="flex items-center gap-2.5">
            {streakMultiplier > 1 && (
              <span
                className="px-1.5 py-0.5 rounded-full"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: '#C9B8F0',
                  letterSpacing: '0.1em',
                  fontWeight: 500,
                  background: 'rgba(181,163,232,0.14)',
                  border: '1px solid rgba(181,163,232,0.3)',
                }}
              >
                {streakMultiplier}× STREAK
              </span>
            )}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                color: 'rgba(255, 179, 71,0.65)',
                letterSpacing: '0.2em',
                fontWeight: 500,
              }}
            >
              STARS
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 26,
                color: 'var(--stl-gold)',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              +{totalStars}
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" fill="var(--stl-gold)" />
            </svg>
          </div>
        </div>

        <div
          className="w-full relative overflow-hidden"
          style={{
            marginTop: 8,
            padding: 9,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-left">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: 'rgba(255,255,255,0.38)',
                  letterSpacing: '0.18em',
                  marginBottom: 1,
                }}
              >
                CERTIFICATE
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 13,
                  color: 'var(--text)',
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                Stellar Observation{nftNumber > 0 ? ` #${nftNumber}` : ''}
              </div>
            </div>

            <div className="relative" style={{ width: 36, height: 36 }}>
              <svg width="36" height="36" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke={skyScore >= 70 ? 'var(--stl-gold)' : skyScore >= 50 ? 'var(--stl-teal)' : 'var(--negative)'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={scoreDash}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                  {skyScore}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 5.5,
                    color: 'rgba(255,255,255,0.5)',
                    letterSpacing: '0.1em',
                    marginTop: 1,
                  }}
                >
                  {scoreLabel(skyScore)}
                </span>
              </div>
            </div>
          </div>

          <div
            className="w-full relative overflow-hidden flex items-center justify-center"
            style={{
              aspectRatio: '21 / 9',
              borderRadius: 9,
              background: [
                'radial-gradient(circle at 50% 50%, rgba(184,212,255,0.16) 0%, rgba(255, 179, 71,0.06) 35%, transparent 60%)',
                'linear-gradient(135deg, #080414 0%, #02050E 100%)',
              ].join(', '),
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <MissionRotateArt missionId={mission.id} size={56} />
          </div>

          <div
            className="flex items-center justify-between mt-1.5 pt-1.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: 'linear-gradient(135deg, #00FFA3, #DC1FFF)' }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: '0.05em',
                }}
              >
                {solanaTxShort}
              </span>
            </div>
            <a
              href={solanaExplorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{
                fontSize: 10.5,
                color: 'var(--stl-teal)',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              View on Solana
              <ExternalLink size={9} />
            </a>
          </div>
        </div>

        <button
          onClick={onViewCollection}
          className="w-full flex items-center justify-center gap-2"
          style={{
            marginTop: 8,
            padding: '10px 18px',
            background: 'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)',
            color: 'var(--canvas)',
            border: 'none',
            borderRadius: 11,
            fontSize: 13.5,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            transition: 'transform 180ms cubic-bezier(.2,.7,.2,1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          View in collection
          <ArrowRight size={13} strokeWidth={2.5} />
        </button>

        <div className={`grid ${onPostToFeed ? 'grid-cols-4' : 'grid-cols-3'} gap-1.5 w-full mt-1.5`}>
          <SecondaryButton icon={<Share2 size={11} />} label="Share" onClick={onShare} />
          {onPostToFeed && (
            <SecondaryButton
              icon={<Send size={11} />}
              label="Post"
              onClick={onPostToFeed}
              accent
            />
          )}
          <SecondaryButton icon={<Bookmark size={11} />} label="Save" onClick={onSave} />
          <SecondaryButton
            icon={<ArrowRight size={11} />}
            label="Next"
            iconPosition="right"
            onClick={onContinue}
          />
        </div>
      </div>
    </div>
  );
}

function SecondaryButton({
  icon,
  label,
  onClick,
  iconPosition = 'left',
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  iconPosition?: 'left' | 'right';
  accent?: boolean;
}) {
  const baseBg = accent ? 'rgba(94, 234, 212,0.08)' : 'rgba(255,255,255,0.04)';
  const hoverBg = accent ? 'rgba(94, 234, 212,0.14)' : 'rgba(255,255,255,0.07)';
  const borderColor = accent ? 'rgba(94, 234, 212,0.28)' : 'rgba(255,255,255,0.1)';
  const hoverBorder = accent ? 'rgba(94, 234, 212,0.42)' : 'rgba(255,255,255,0.18)';
  const color = accent ? '#7DEAD8' : 'rgba(255,255,255,0.8)';

  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
      style={{
        padding: '7px 4px',
        background: baseBg,
        border: `1px solid ${borderColor}`,
        color,
        borderRadius: 10,
        fontSize: 10.5,
        fontWeight: 500,
        fontFamily: 'var(--font-display)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.borderColor = hoverBorder;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = baseBg;
        e.currentTarget.style.borderColor = borderColor;
      }}
    >
      {iconPosition === 'left' && icon}
      {label}
      {iconPosition === 'right' && icon}
    </button>
  );
}

const BG_STARS: Array<{ top: string; left: string; size: number; delay: string }> = [
  { top: '8%',  left: '12%', size: 1.5, delay: '0s' },
  { top: '18%', left: '85%', size: 1,   delay: '1.2s' },
  { top: '52%', left: '6%',  size: 1,   delay: '2.4s' },
  { top: '68%', left: '92%', size: 1,   delay: '0.8s' },
  { top: '82%', left: '18%', size: 1.2, delay: '3s' },
];

function SealStamp({ missionId }: { missionId: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 112, height: 112 }}>
      <div
        className="stl-seal-glow absolute inset-0"
        style={{
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 179, 71,0.22) 0%, transparent 65%)',
        }}
      />

      <svg
        className="stl-seal-ring absolute inset-0"
        width="112"
        height="112"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255, 179, 71,0.22)" strokeWidth="1" strokeDasharray="2 4" />
        <g stroke="rgba(255, 179, 71,0.45)" strokeWidth="1">
          <line x1="100" y1="10" x2="100" y2="14" />
          <line x1="100" y1="186" x2="100" y2="190" />
          <line x1="10" y1="100" x2="14" y2="100" />
          <line x1="186" y1="100" x2="190" y2="100" />
        </g>
      </svg>

      <div
        className="relative flex items-center justify-center"
        style={{
          width: 86,
          height: 86,
          borderRadius: '50%',
          background: [
            'radial-gradient(circle at 30% 25%, rgba(255,232,164,0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, #1a1408 0%, #0a0a14 100%)',
          ].join(', '),
          border: '1px solid rgba(255, 179, 71,0.32)',
          boxShadow: 'inset 0 0 22px rgba(255, 179, 71,0.1), 0 0 18px rgba(255, 179, 71,0.13)',
          overflow: 'hidden',
        }}
      >
        <MissionRotateArt missionId={missionId} size={78} />

        <div
          className="absolute flex items-center justify-center"
          style={{
            bottom: -2,
            right: -2,
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--seafoam), #0E6E56)',
            border: '2px solid var(--canvas)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24">
            <polyline
              className="stl-check-path"
              points="20 6 9 17 4 12"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
