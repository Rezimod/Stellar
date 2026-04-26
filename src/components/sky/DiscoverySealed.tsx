'use client';

import { useMemo, type ComponentType } from 'react';
import type { Mission } from '@/lib/types';
import { ArrowRight, ExternalLink, Share2, Bookmark } from 'lucide-react';
import JupiterNode from './chart-nodes/JupiterNode';
import SaturnNode from './chart-nodes/SaturnNode';
import MoonNode from './chart-nodes/MoonNode';
import VenusNode from './chart-nodes/VenusNode';
import MarsNode from './chart-nodes/MarsNode';
import MercuryNode from './chart-nodes/MercuryNode';
import PleiadesNode from './chart-nodes/PleiadesNode';
import OrionNode from './chart-nodes/OrionNode';
import AndromedaNode from './chart-nodes/AndromedaNode';
import CrabNode from './chart-nodes/CrabNode';

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
}

const TAGLINES: Record<string, string> = {
  jupiter:   'Four Galilean moons, forever yours',
  'quick-jupiter': 'Four Galilean moons, forever yours',
  saturn:    'Rings at their widest, captured',
  'quick-saturn': 'Rings at their widest, captured',
  moon:      'Craters sharp at the terminator',
  venus:     'The evening star, claimed',
  mars:      'Rust-red and unmistakable',
  mercury:   'Caught the fleeting one',
  pleiades:  'Seven sisters, one glance, forever yours',
  orion:     'A stellar nursery, 1,344 light-years close',
  andromeda: 'A trillion suns, now yours',
  crab:      'The ghost of a 1054 AD supernova',
};

const META_LINES: Record<string, string> = {
  jupiter:   'GAS GIANT · PLANET',
  'quick-jupiter': 'GAS GIANT · PLANET',
  saturn:    'RINGED · PLANET',
  'quick-saturn': 'RINGED · PLANET',
  moon:      'SATELLITE · EARTH',
  venus:     'PLANET · EVENING STAR',
  mars:      'PLANET · TERRESTRIAL',
  mercury:   'PLANET · INNER',
  pleiades:  'M45 · DEEP SKY',
  orion:     'M42 · NEBULA',
  andromeda: 'M31 · GALAXY',
  crab:      'M1 · SUPERNOVA',
};

const NODE_MAP: Record<string, ComponentType<{ size?: number }>> = {
  jupiter: JupiterNode,
  'quick-jupiter': JupiterNode,
  saturn: SaturnNode,
  'quick-saturn': SaturnNode,
  moon: MoonNode,
  venus: VenusNode,
  mars: MarsNode,
  mercury: MercuryNode,
  pleiades: PleiadesNode,
  orion: OrionNode,
  andromeda: AndromedaNode,
  crab: CrabNode,
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
}: Props) {
  const totalStars = starsBase + starsBonus;
  const tagline = TAGLINES[mission.id] ?? 'Sealed on Solana, yours forever';
  const metaLine = META_LINES[mission.id] ?? 'CELESTIAL · OBJECT';

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
          'radial-gradient(ellipse 480px 360px at 50% 20%, rgba(255,209,102,0.06) 0%, transparent 55%)',
          'radial-gradient(ellipse 420px 320px at 50% 70%, rgba(132,101,203,0.06) 0%, transparent 60%)',
          '#050810',
        ].join(', '),
      }}
    >
      <Particles />

      <div className="stl-shoot" style={{ top: '18%', left: '-40px', animationDelay: '2s' }} />

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
        style={{ maxWidth: 420, padding: '28px 20px 32px' }}
      >
        <div className="flex items-center gap-1.5 mb-3.5">
          <div className="w-1.5 h-1.5 rounded-full stl-tw" style={{ background: 'var(--stl-gold)' }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--stl-gold)',
              letterSpacing: '0.26em',
              fontWeight: 500,
            }}
          >
            DISCOVERY SEALED
          </span>
          <div className="w-1.5 h-1.5 rounded-full stl-tw" style={{ background: 'var(--stl-gold)' }} />
        </div>

        <SealStamp missionId={mission.id} />

        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 38,
            color: '#F2F0EA',
            fontWeight: 500,
            margin: 0,
            lineHeight: 1,
            letterSpacing: '-0.015em',
            marginTop: 20,
          }}
        >
          {mission.name}{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
            sealed
          </span>
        </h1>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            color: 'rgba(255,255,255,0.55)',
            fontStyle: 'italic',
            fontWeight: 400,
            marginTop: 6,
          }}
        >
          {tagline}
        </div>

        <div className="flex items-center gap-2.5 mt-3.5">
          <div
            className="flex items-center px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'rgba(255,255,255,0.5)',
                letterSpacing: '0.12em',
              }}
            >
              {metaLine}
            </span>
          </div>
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.22)' }}
          >
            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--stl-green)' }} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: '#86efac',
                letterSpacing: '0.12em',
                fontWeight: 500,
              }}
            >
              ONCHAIN
            </span>
          </div>
        </div>

        <div
          className="w-full relative overflow-hidden"
          style={{
            marginTop: 24,
            padding: '22px 20px',
            borderRadius: 20,
            background: 'linear-gradient(145deg, rgba(255,209,102,0.1) 0%, rgba(255,209,102,0.02) 60%, transparent 100%)',
            border: '1px solid rgba(255,209,102,0.3)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute rounded-full" style={{ top: '20%', left: '12%', width: 1, height: 1, background: 'var(--stl-gold)' }} />
            <div className="absolute rounded-full" style={{ top: '60%', left: '85%', width: 1, height: 1, background: '#fff' }} />
            <div className="absolute rounded-full" style={{ top: '35%', left: '90%', width: 1.5, height: 1.5, background: 'var(--stl-gold)' }} />
            <div className="absolute rounded-full" style={{ top: '80%', left: '20%', width: 1, height: 1, background: '#fff' }} />
          </div>

          <div className="relative flex items-center justify-between mb-1.5">
            {streakMultiplier > 1 ? (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(132,101,203,0.18)', border: '1px solid rgba(132,101,203,0.35)' }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12">
                  <path d="M 6 1 A 5 5 0 1 0 10 8.5 A 4 4 0 1 1 6 1 Z" fill="#B5A3E8" />
                </svg>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    color: '#C9B8F0',
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                  }}
                >
                  {streakMultiplier}× STREAK
                </span>
              </div>
            ) : (
              <div />
            )}
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'rgba(255,209,102,0.6)',
                letterSpacing: '0.2em',
                fontWeight: 500,
              }}
            >
              STARS EARNED
            </span>
          </div>

          <div className="stl-star-reveal relative flex items-center justify-center gap-2">
            <span
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 64,
                color: 'var(--stl-gold)',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              +{totalStars}
            </span>
            <svg width="32" height="32" viewBox="0 0 24 24" style={{ marginBottom: 8 }}>
              <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z" fill="var(--stl-gold)" />
            </svg>
          </div>

          {starsBonus > 0 && (
            <div className="relative flex justify-center gap-3.5 mt-2">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.06em',
                }}
              >
                {starsBase} BASE
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'rgba(255,255,255,0.3)' }}>+</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: '#C9B8F0',
                  letterSpacing: '0.06em',
                }}
              >
                {starsBonus} BONUS
              </span>
            </div>
          )}
        </div>

        <div
          className="w-full relative overflow-hidden"
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-left">
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.18em',
                  marginBottom: 2,
                }}
              >
                CERTIFICATE
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  color: '#F2F0EA',
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                Stellar Observation{nftNumber > 0 ? ` #${nftNumber}` : ''}
              </div>
            </div>

            <div className="relative" style={{ width: 50, height: 50 }}>
              <svg width="50" height="50" viewBox="0 0 50 50" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  fill="none"
                  stroke={skyScore >= 70 ? 'var(--stl-gold)' : skyScore >= 50 ? 'var(--stl-teal)' : '#ef4444'}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={scoreDash}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: '#fff', fontWeight: 700, lineHeight: 1 }}>
                  {skyScore}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 7,
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
              aspectRatio: '16 / 9',
              borderRadius: 10,
              background: [
                'radial-gradient(circle at 50% 50%, rgba(184,212,255,0.18) 0%, rgba(132,101,203,0.08) 35%, transparent 60%)',
                'radial-gradient(circle at 20% 30%, rgba(132,101,203,0.15) 0%, transparent 40%)',
                'linear-gradient(135deg, #080414 0%, #02050E 100%)',
              ].join(', '),
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <NFTPreviewArt missionId={mission.id} />
          </div>

          <div
            className="flex items-center justify-between mt-2.5 pt-2.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-3.5 h-3.5 rounded-full"
                style={{ background: 'linear-gradient(135deg, #00FFA3, #DC1FFF)' }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
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
                fontSize: 11,
                color: 'var(--stl-teal)',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              View on Solana
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <button
          onClick={onViewCollection}
          className="w-full flex items-center justify-center gap-2"
          style={{
            marginTop: 18,
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #FFD166 0%, #CC9A33 100%)',
            color: '#0a0a0a',
            border: 'none',
            borderRadius: 14,
            fontSize: 15,
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            cursor: 'pointer',
            transition: 'transform 180ms cubic-bezier(.2,.7,.2,1)',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          View in collection
          <ArrowRight size={16} strokeWidth={2.5} />
        </button>

        <div className="grid grid-cols-3 gap-2 w-full mt-2.5">
          <SecondaryButton icon={<Share2 size={12} />} label="Share" onClick={onShare} />
          <SecondaryButton icon={<Bookmark size={12} />} label="Save" onClick={onSave} />
          <SecondaryButton
            icon={<ArrowRight size={12} />}
            label="Continue"
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  iconPosition?: 'left' | 'right';
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
      style={{
        padding: '11px 10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.8)',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'var(--font-display)',
        cursor: 'pointer',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
      }}
    >
      {iconPosition === 'left' && icon}
      {label}
      {iconPosition === 'right' && icon}
    </button>
  );
}

function Particles() {
  const particles = [
    { left: '8%',  dur: '16s', delay: '0s',  drift: '40px',  color: 'var(--stl-gold)' },
    { left: '22%', dur: '19s', delay: '3s',  drift: '-30px', color: 'var(--stl-gold)' },
    { left: '35%', dur: '14s', delay: '6s',  drift: '20px',  color: 'var(--stl-gold)' },
    { left: '48%', dur: '22s', delay: '1s',  drift: '-10px', color: 'var(--stl-teal)' },
    { left: '62%', dur: '17s', delay: '4s',  drift: '50px',  color: 'var(--stl-gold)' },
    { left: '76%', dur: '15s', delay: '7s',  drift: '-25px', color: 'var(--stl-lilac)' },
    { left: '88%', dur: '20s', delay: '2s',  drift: '15px',  color: 'var(--stl-gold)' },
    { left: '15%', dur: '18s', delay: '9s',  drift: '-40px', color: 'var(--stl-teal)' },
    { left: '55%', dur: '21s', delay: '5s',  drift: '30px',  color: 'var(--stl-gold)' },
    { left: '70%', dur: '16s', delay: '11s', drift: '-20px', color: 'var(--stl-gold)' },
  ];
  return (
    <>
      {particles.map((p, i) => (
        <div
          key={i}
          className="stl-particle"
          style={{
            left: p.left,
            background: p.color,
            ['--stl-dur' as string]: p.dur,
            ['--stl-delay' as string]: p.delay,
            ['--stl-drift' as string]: p.drift,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

const BG_STARS: Array<{ top: string; left: string; size: number; delay: string }> = [
  { top: '12%', left: '10%', size: 2,   delay: '0s' },
  { top: '25%', left: '82%', size: 1,   delay: '1.2s' },
  { top: '55%', left: '6%',  size: 1.5, delay: '2.4s' },
  { top: '72%', left: '90%', size: 1,   delay: '0.8s' },
  { top: '85%', left: '42%', size: 1,   delay: '3s' },
];

function SealStamp({ missionId }: { missionId: string }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <div
        className="stl-seal-glow absolute inset-0"
        style={{
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,209,102,0.25) 0%, transparent 65%)',
        }}
      />

      <svg
        className="stl-seal-ring absolute inset-0"
        width="200"
        height="200"
        viewBox="0 0 200 200"
      >
        <defs>
          <path id="stl-seal-circle" d="M 100,100 m -84,0 a 84,84 0 1,1 168,0 a 84,84 0 1,1 -168,0" />
        </defs>
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,209,102,0.25)" strokeWidth="1" strokeDasharray="2 4" />
        <text style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: 6, fill: 'rgba(255,209,102,0.7)' }}>
          <textPath href="#stl-seal-circle" startOffset="0">
            STELLAR · OBSERVED ON SOLANA · SEALED ETERNAL ·
          </textPath>
        </text>
        <g stroke="rgba(255,209,102,0.5)" strokeWidth="1">
          <line x1="100" y1="10" x2="100" y2="14" />
          <line x1="100" y1="186" x2="100" y2="190" />
          <line x1="10" y1="100" x2="14" y2="100" />
          <line x1="186" y1="100" x2="190" y2="100" />
        </g>
      </svg>

      <div
        className="relative flex items-center justify-center"
        style={{
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: [
            'radial-gradient(circle at 30% 25%, rgba(255,232,164,0.2) 0%, transparent 50%)',
            'radial-gradient(circle at 50% 50%, #1a1408 0%, #0a0a14 100%)',
          ].join(', '),
          border: '1px solid rgba(255,209,102,0.4)',
          boxShadow: 'inset 0 0 40px rgba(255,209,102,0.12), 0 0 30px rgba(255,209,102,0.15)',
        }}
      >
        <NFTPreviewArt missionId={missionId} sealMode />

        <div
          className="absolute flex items-center justify-center"
          style={{
            bottom: -4,
            right: -4,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #34d399, #0E6E56)',
            border: '2px solid #050810',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
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

function NFTPreviewArt({ missionId, sealMode = false }: { missionId: string; sealMode?: boolean }) {
  const size = sealMode ? 100 : 80;
  const Node = NODE_MAP[missionId];

  if (Node) {
    return (
      <div
        style={{
          filter: sealMode ? 'drop-shadow(0 0 10px rgba(255,209,102,0.25))' : 'drop-shadow(0 0 12px rgba(184,212,255,0.4))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Node size={size} />
      </div>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 80 80" style={{ filter: sealMode ? 'none' : 'drop-shadow(0 0 12px rgba(184,212,255,0.4))' }}>
      <defs>
        <radialGradient id={`nft-${missionId}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#B8D4FF" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#8465CB" stopOpacity="0.2" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="40" cy="40" r="32" fill={`url(#nft-${missionId})`} />
      <circle cx="40" cy="34" r="2.5" fill="#fff" />
      <circle cx="30" cy="42" r="2" fill="#fff" />
      <circle cx="50" cy="44" r="2" fill="#fff" />
      <circle cx="36" cy="48" r="1.5" fill="#fff" />
      <circle cx="46" cy="32" r="1.5" fill="#fff" />
      <circle cx="26" cy="32" r="1.2" fill="#fff" />
      <circle cx="54" cy="36" r="1.3" fill="#fff" />
    </svg>
  );
}
