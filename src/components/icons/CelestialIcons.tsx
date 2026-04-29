'use client';

import React, { useId } from 'react';

export interface CelestialIconProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

function uid(raw: string) {
  return raw.replace(/[^a-zA-Z0-9]/g, '');
}

// ── Moon ──────────────────────────────────────────────────────────────────────
export function MoonIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ filter: 'drop-shadow(0 0 6px rgba(232,224,208,0.3))', overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .mg${id}{animation:mgp${id} 4s ease-in-out infinite}
          @keyframes mgp${id}{0%,100%{filter:drop-shadow(0 0 6px rgba(232,224,208,0.3))}50%{filter:drop-shadow(0 0 14px rgba(232,224,208,0.65))}}
        `}</style>
      )}
      <defs>
        <radialGradient id={`mrg${id}`} cx="68%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#EEE8D8"/>
          <stop offset="55%" stopColor="#CEC6B4"/>
          <stop offset="100%" stopColor="#A0988A"/>
        </radialGradient>
        <mask id={`mm${id}`}>
          <rect width="48" height="48" fill="white"/>
          <circle cx="15" cy="21" r="17.5" fill="black"/>
        </mask>
      </defs>
      <circle cx="24" cy="24" r="20" fill={`url(#mrg${id})`} mask={`url(#mm${id})`}
        className={animate ? `mg${id}` : ''}/>
      {/* craters */}
      <circle cx="33" cy="17" r="2.2" fill="rgba(0,0,0,0.07)" mask={`url(#mm${id})`}/>
      <circle cx="38" cy="27" r="1.5" fill="rgba(0,0,0,0.06)" mask={`url(#mm${id})`}/>
      <circle cx="31" cy="31" r="1.3" fill="rgba(0,0,0,0.05)" mask={`url(#mm${id})`}/>
      <circle cx="36" cy="21" r="1"   fill="rgba(0,0,0,0.06)" mask={`url(#mm${id})`}/>
    </svg>
  );
}

// ── Jupiter ───────────────────────────────────────────────────────────────────
export function JupiterIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(224,174,111,0.25))', overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .jb${id}{animation:jba${id} 60s ease-in-out infinite alternate;transform-origin:24px 24px}
          @keyframes jba${id}{0%{transform:rotate(0deg)}100%{transform:rotate(2.5deg)}}
        `}</style>
      )}
      <defs>
        <linearGradient id={`jlg${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E0AE6F"/>
          <stop offset="18%"  stopColor="#C48050"/>
          <stop offset="36%"  stopColor="#E8C088"/>
          <stop offset="52%"  stopColor="#D4915A"/>
          <stop offset="68%"  stopColor="#E0B870"/>
          <stop offset="84%"  stopColor="#C07845"/>
          <stop offset="100%" stopColor="#D8A460"/>
        </linearGradient>
        <clipPath id={`jcp${id}`}><circle cx="24" cy="24" r="20"/></clipPath>
      </defs>
      <circle cx="24" cy="24" r="20" fill={`url(#jlg${id})`} className={animate ? `jb${id}` : ''}/>
      {/* Great Red Spot */}
      <ellipse cx="29" cy="29" rx="4" ry="2.5" fill="#C45A3A" opacity="0.65"
        clipPath={`url(#jcp${id})`} className={animate ? `jb${id}` : ''}/>
    </svg>
  );
}

// ── Saturn ────────────────────────────────────────────────────────────────────
export function SaturnIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ filter: 'drop-shadow(0 0 6px rgba(234,214,184,0.2))', overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .sr${id}{animation:srp${id} 3s ease-in-out infinite}
          @keyframes srp${id}{0%,100%{opacity:.55}50%{opacity:.75}}
        `}</style>
      )}
      <defs>
        <radialGradient id={`srg${id}`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#F0E0C0"/>
          <stop offset="100%" stopColor="#C8A870"/>
        </radialGradient>
        <clipPath id={`srb${id}`}><rect x="0" y="0" width="48" height="24"/></clipPath>
        <clipPath id={`srf${id}`}><rect x="0" y="24" width="48" height="24"/></clipPath>
      </defs>
      {/* Ring back half */}
      <ellipse cx="24" cy="26" rx="26" ry="7" stroke="#C8B090" strokeWidth="2.5" fill="none"
        opacity="0.55" clipPath={`url(#srb${id})`} transform="rotate(-8,24,26)"
        className={animate ? `sr${id}` : ''}/>
      {/* Planet */}
      <circle cx="24" cy="24" r="16" fill={`url(#srg${id})`}/>
      {/* Ring front half */}
      <ellipse cx="24" cy="26" rx="26" ry="7" stroke="#C8B090" strokeWidth="2.5" fill="none"
        opacity="0.55" clipPath={`url(#srf${id})`} transform="rotate(-8,24,26)"
        className={animate ? `sr${id}` : ''}/>
    </svg>
  );
}

// ── Orion Nebula ──────────────────────────────────────────────────────────────
export function OrionNebulaIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .oc${id}{animation:ocd${id} 5s ease-in-out infinite alternate}
          @keyframes ocd${id}{from{transform:translateX(0)}to{transform:translateX(1px)}}
        `}</style>
      )}
      <defs>
        <filter id={`of${id}`}><feGaussianBlur stdDeviation="2.8"/></filter>
        <radialGradient id={`oc${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#FF6B9D" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`op${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--terracotta)" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="var(--terracotta)" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id={`ob${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <g filter={`url(#of${id})`} className={animate ? `oc${id}` : ''}>
        <circle cx="23" cy="22" r="15" fill={`url(#oc${id})`}/>
        <circle cx="30" cy="27" r="12" fill={`url(#op${id})`}/>
        <circle cx="16" cy="28" r="11" fill={`url(#ob${id})`}/>
      </g>
      {/* Stars */}
      <circle cx="24" cy="20" r="1.2" fill="white" opacity="0.9"/>
      <circle cx="28" cy="25" r="0.9" fill="white" opacity="0.85"/>
      <circle cx="20" cy="27" r="0.8" fill="white" opacity="0.8"/>
      <circle cx="27" cy="31" r="0.7" fill="white" opacity="0.7"/>
      <circle cx="21" cy="16" r="0.6" fill="white" opacity="0.75"/>
      <circle cx="32" cy="21" r="0.6" fill="white" opacity="0.65"/>
    </svg>
  );
}

// ── Pleiades ──────────────────────────────────────────────────────────────────
export function PleiadesIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  const stars = [
    { cx: 24, cy: 13, r: 3.2 },
    { cx: 32, cy: 18, r: 2.8 },
    { cx: 17, cy: 20, r: 2.4 },
    { cx: 28, cy: 27, r: 2.0 },
    { cx: 21, cy: 31, r: 1.8 },
    { cx: 35, cy: 29, r: 1.6 },
    { cx: 14, cy: 29, r: 1.6 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ filter: 'drop-shadow(0 0 4px rgba(147,197,253,0.5))', overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          ${stars.map((_, i) => `.ps${id}${i}{animation:pt${id} ${(2 + i * 0.4).toFixed(1)}s ease-in-out infinite;animation-delay:${(i * 0.3).toFixed(1)}s}`).join('')}
          @keyframes pt${id}{0%,100%{opacity:.7}50%{opacity:1}}
        `}</style>
      )}
      <circle cx="24" cy="22" r="18" fill="rgba(147,197,253,0.04)"/>
      <line x1="24" y1="13" x2="32" y2="18" stroke="rgba(147,197,253,0.12)" strokeWidth="0.5"/>
      <line x1="32" y1="18" x2="28" y2="27" stroke="rgba(147,197,253,0.10)" strokeWidth="0.5"/>
      <line x1="24" y1="13" x2="17" y2="20" stroke="rgba(147,197,253,0.10)" strokeWidth="0.5"/>
      <line x1="17" y1="20" x2="21" y2="31" stroke="rgba(147,197,253,0.08)" strokeWidth="0.5"/>
      {stars.map(({ cx, cy, r }, i) => {
        const si = r * 0.36;
        return (
          <path key={i}
            className={animate ? `ps${id}${i}` : ''}
            d={`M${cx},${cy - r} L${cx + si},${cy - si} L${cx + r},${cy} L${cx + si},${cy + si} L${cx},${cy + r} L${cx - si},${cy + si} L${cx - r},${cy} L${cx - si},${cy - si}Z`}
            fill="#E8E8FF"/>
        );
      })}
    </svg>
  );
}

// ── Andromeda Galaxy ──────────────────────────────────────────────────────────
export function AndromedaIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,248,231,0.15))', overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .ag${id}{animation:agr${id} 8s ease-in-out infinite alternate;transform-origin:24px 24px}
          @keyframes agr${id}{from{transform:rotate(-40deg)}to{transform:rotate(-39deg)}}
        `}</style>
      )}
      <defs>
        <radialGradient id={`ag${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFF8E7" stopOpacity="1"/>
          <stop offset="28%"  stopColor="#E8D8B0" stopOpacity="0.85"/>
          <stop offset="65%"  stopColor="#B8A88F" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#B8A88F" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <g transform="rotate(-40,24,24)" className={animate ? `ag${id}` : ''}>
        <ellipse cx="24" cy="24" rx="22" ry="5.5" fill={`url(#ag${id})`}/>
        <ellipse cx="24" cy="24" rx="18" ry="4" stroke="rgba(255,248,231,0.12)" strokeWidth="0.8" fill="none"/>
        <ellipse cx="24" cy="24" rx="13" ry="2.8" stroke="rgba(255,248,231,0.09)" strokeWidth="0.5" fill="none"/>
      </g>
      <circle cx="24" cy="24" r="2.8" fill="#FFF8E7" opacity="0.95"/>
      <circle cx="24" cy="24" r="1.3" fill="white"/>
    </svg>
  );
}

// ── Crab Nebula ───────────────────────────────────────────────────────────────
export function CrabNebulaIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  const fils = [
    { d: 'M24,24 L27,9',  c: '#38BDF8', o: 0.65 },
    { d: 'M24,24 L37,15', c: 'var(--negative)', o: 0.60 },
    { d: 'M24,24 L39,27', c: 'var(--terracotta)', o: 0.55 },
    { d: 'M24,24 L34,37', c: '#38BDF8', o: 0.60 },
    { d: 'M24,24 L19,39', c: 'var(--negative)', o: 0.65 },
    { d: 'M24,24 L9,34',  c: 'var(--terracotta)', o: 0.55 },
    { d: 'M24,24 L9,19',  c: '#38BDF8', o: 0.60 },
    { d: 'M24,24 L15,9',  c: 'var(--negative)', o: 0.50 },
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .cf${id}{animation:cfp${id} 2s ease-in-out infinite;transform-origin:24px 24px}
          @keyframes cfp${id}{0%,100%{transform:scale(1)}50%{transform:scale(1.02)}}
        `}</style>
      )}
      <defs>
        <filter id={`cff${id}`}><feGaussianBlur stdDeviation="0.8"/></filter>
      </defs>
      <g filter={`url(#cff${id})`} className={animate ? `cf${id}` : ''}>
        {fils.map((f, i) => (
          <path key={i} d={f.d} stroke={f.c} strokeWidth="2.5" opacity={f.o} strokeLinecap="round"/>
        ))}
      </g>
      <circle cx="24" cy="24" r="2.8" fill="#A5F3FC"
        style={{ filter: 'drop-shadow(0 0 5px rgba(165,243,252,0.9))' }}/>
      <circle cx="24" cy="24" r="1.2" fill="white"/>
    </svg>
  );
}

// ── Night Sky — Premium ───────────────────────────────────────────────────────
export function NightSkyIcon({ size = 48, className }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ filter: 'drop-shadow(0 0 6px rgba(153,69,255,0.2))', overflow: 'visible' }}>
      <style>{`@media(prefers-reduced-motion:no-preference){
        .nt${id}{animation:ntp${id} 2.2s ease-in-out infinite}
        .nt2${id}{animation:ntp${id} 3.1s ease-in-out infinite;animation-delay:.8s}
        @keyframes ntp${id}{0%,100%{opacity:.45}50%{opacity:1}}
      `}</style>
      <defs>
        {/* Deep space radial background */}
        <radialGradient id={`nbg${id}`} cx="45%" cy="40%" r="60%">
          <stop offset="0%"   stopColor="#13103A"/>
          <stop offset="60%"  stopColor="#0C0E22"/>
          <stop offset="100%" stopColor="#06080F"/>
        </radialGradient>
        {/* Milky Way band */}
        <radialGradient id={`nmw${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(200,185,255,0.12)"/>
          <stop offset="100%" stopColor="rgba(200,185,255,0)"/>
        </radialGradient>
        {/* Solana aurora */}
        <radialGradient id={`naur${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(94, 234, 212,0.18)"/>
          <stop offset="100%" stopColor="rgba(94, 234, 212,0)"/>
        </radialGradient>
        {/* Moon */}
        <radialGradient id={`nmo${id}`} cx="65%" cy="35%" r="60%">
          <stop offset="0%"  stopColor="#EEE8D8"/>
          <stop offset="100%" stopColor="#B0A898"/>
        </radialGradient>
        <mask id={`nm${id}`}>
          <rect width="48" height="48" fill="white"/>
          <circle cx="37" cy="10" r="6.2" fill="black"/>
        </mask>
        <clipPath id={`ncp${id}`}><circle cx="24" cy="24" r="22"/></clipPath>
      </defs>

      {/* Background */}
      <circle cx="24" cy="24" r="22" fill={`url(#nbg${id})`}/>

      {/* Milky Way band — diagonal blurred strip */}
      <g clipPath={`url(#ncp${id})`}>
        <ellipse cx="22" cy="26" rx="20" ry="7" fill={`url(#nmw${id})`}
          transform="rotate(-40,22,26)" opacity="0.8"/>
      </g>

      {/* Solana aurora — lower left */}
      <g clipPath={`url(#ncp${id})`}>
        <ellipse cx="10" cy="36" rx="14" ry="8" fill={`url(#naur${id})`} opacity="0.7"/>
      </g>

      {/* Crescent moon — upper right */}
      <circle cx="33" cy="9" r="7.2" fill={`url(#nmo${id})`} mask={`url(#nm${id})`}/>

      {/* 4-pointed star shapes */}
      {/* Large twinkling star */}
      {(() => {
        const cx=12,cy=15,r=1.8,si=r*0.36;
        return <path className={`nt${id}`}
          d={`M${cx},${cy-r} L${cx+si},${cy-si} L${cx+r},${cy} L${cx+si},${cy+si} L${cx},${cy+r} L${cx-si},${cy+si} L${cx-r},${cy} L${cx-si},${cy-si}Z`}
          fill="white"/>;
      })()}
      {/* Medium star */}
      {(() => {
        const cx=35,cy=33,r=1.4,si=r*0.36;
        return <path className={`nt2${id}`}
          d={`M${cx},${cy-r} L${cx+si},${cy-si} L${cx+r},${cy} L${cx+si},${cy+si} L${cx},${cy+r} L${cx-si},${cy+si} L${cx-r},${cy} L${cx-si},${cy-si}Z`}
          fill="#E0E8FF"/>;
      })()}
      {/* Small dot stars */}
      <circle cx="20" cy="34" r="0.9" fill="white" opacity="0.65"/>
      <circle cx="10" cy="27" r="0.7" fill="white" opacity="0.55"/>
      <circle cx="40" cy="22" r="0.8" fill="white" opacity="0.60"/>
      <circle cx="28" cy="38" r="0.6" fill="rgba(94, 234, 212,0.9)" opacity="0.75"/>

      {/* Border ring */}
      <circle cx="24" cy="24" r="22" stroke="rgba(153,69,255,0.12)" strokeWidth="1" fill="none"/>
    </svg>
  );
}

// ── Telescope — Premium ───────────────────────────────────────────────────────
export function TelescopeIcon({ size = 48, className, animate }: CelestialIconProps) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className}
      style={{ overflow: 'visible' }}>
      {animate && (
        <style>{`@media(prefers-reduced-motion:no-preference){
          .tfl${id}{animation:tflp${id} 2.5s ease-in-out infinite}
          @keyframes tflp${id}{0%,100%{opacity:.75}50%{opacity:1}}
        `}</style>
      )}
      <defs>
        {/* Solana gradient — purple → teal → green */}
        <linearGradient id={`tg${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="var(--terracotta)"/>
          <stop offset="55%"  stopColor="var(--terracotta)"/>
          <stop offset="100%" stopColor="var(--seafoam)"/>
        </linearGradient>
        <linearGradient id={`tb${id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#18103A"/>
          <stop offset="100%" stopColor="#0C0820"/>
        </linearGradient>
        <linearGradient id={`tl${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="var(--seafoam)" stopOpacity="0.9"/>
          <stop offset="100%" stopColor="var(--terracotta)" stopOpacity="0.7"/>
        </linearGradient>
        <filter id={`tglow${id}`}>
          <feGaussianBlur stdDeviation="1.2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* ── Tripod ── */}
      <line x1="22" y1="35" x2="14" y2="46" stroke="rgba(147,197,253,0.35)" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="22" y1="35" x2="30" y2="46" stroke="rgba(147,197,253,0.35)" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="22" y1="35" x2="22" y2="46" stroke="rgba(147,197,253,0.25)" strokeWidth="1"   strokeLinecap="round"/>
      {/* Crossbar */}
      <line x1="17" y1="41" x2="27" y2="41" stroke="rgba(147,197,253,0.2)" strokeWidth="0.8" strokeLinecap="round"/>

      {/* ── Mount head ── */}
      <circle cx="22" cy="35" r="2.2" fill={`url(#tb${id})`} stroke={`url(#tg${id})`} strokeWidth="1.2"/>

      {/* ── Main tube body (rotated rect) ── */}
      {/* shadow / depth */}
      <rect x="9" y="21.5" width="29" height="8" rx="4"
        fill="rgba(0,0,0,0.5)" transform="rotate(-36,24,24) translate(0.5,0.8)"/>
      {/* tube fill */}
      <rect x="9" y="21.5" width="29" height="8" rx="4"
        fill={`url(#tb${id})`} stroke={`url(#tg${id})`} strokeWidth="1.4"
        transform="rotate(-36,24,24)"/>
      {/* highlight sheen */}
      <rect x="10" y="22" width="27" height="2.5" rx="1.25"
        fill="rgba(255,255,255,0.11)" transform="rotate(-36,24,24)"/>

      {/* ── Dew shield / objective end ── */}
      {/* wide outer ring */}
      <circle cx="36" cy="15" r="5.5" fill={`url(#tb${id})`} stroke={`url(#tg${id})`} strokeWidth="1.4"/>
      {/* lens glass inner */}
      <circle cx="36" cy="15" r="3.8" fill="rgba(153,69,255,0.18)" stroke="rgba(232, 130, 107,0.5)" strokeWidth="0.8"/>
      {/* glass reflex */}
      <circle cx="36" cy="15" r="2.2" fill="rgba(94, 234, 212,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5"/>
      <circle cx="34.8" cy="13.8" r="0.8" fill="rgba(255,255,255,0.35)"/>

      {/* ── Eyepiece / focuser ── */}
      <rect x="7" y="27" width="5.5" height="5" rx="1.8"
        fill={`url(#tb${id})`} stroke="rgba(147,197,253,0.45)" strokeWidth="1"
        transform="rotate(-36,10,30)"/>

      {/* ── Finderscope (small parallel tube) ── */}
      <rect x="16" y="19" width="12" height="3.5" rx="1.75"
        fill="rgba(12,8,32,0.9)" stroke="rgba(153,69,255,0.35)" strokeWidth="0.8"
        transform="rotate(-36,24,22)"/>

      {/* ── Lens flare starburst ── */}
      <g filter={`url(#tglow${id})`} className={animate ? `tfl${id}` : ''}>
        {/* primary cross */}
        <path d="M36,15 L36.5,12 L37,15 L36.5,18Z" fill="white" opacity="0.95"/>
        <path d="M36,15 L33,14.5 L36,14 L39,14.5Z" fill="white" opacity="0.95"/>
        {/* secondary diagonals — Solana colors */}
        <path d="M36,15 L37.4,12.2 L37.8,15.2 L35.2,16.4Z" fill={`url(#tl${id})`} opacity="0.6"/>
        <path d="M36,15 L33.2,13.6 L35.2,12.2 L37.8,14.8Z" fill={`url(#tl${id})`} opacity="0.5"/>
        {/* halo */}
        <circle cx="36" cy="15" r="2" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.6"/>
      </g>
    </svg>
  );
}

// ── Star Token (inline ✦ replacement) ─────────────────────────────────────────
export function StarTokenIcon({ size = 12, className }: { size?: number; className?: string }) {
  const id = uid(useId());
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', filter: 'drop-shadow(0 0 3px rgba(232, 130, 107,0.6)) drop-shadow(0 0 6px rgba(153,69,255,0.25))' }}>
      <defs>
        <linearGradient id={`stg${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="var(--terracotta)"/>
          <stop offset="60%"  stopColor="var(--stars)"/>
          <stop offset="100%" stopColor="var(--terracotta)"/>
        </linearGradient>
      </defs>
      <path d="M6 0.8L7.15 4.85L11.2 6L7.15 7.15L6 11.2L4.85 7.15L0.8 6L4.85 4.85Z" fill={`url(#stg${id})`}/>
    </svg>
  );
}

// ── Difficulty Dots ───────────────────────────────────────────────────────────
export function DifficultyDots({ level }: { level: 1 | 2 | 3 | 4 }) {
  const count = level <= 2 ? level : 3;
  const color =
    level === 4 ? 'rgba(251, 113, 133,0.85)'
    : level === 3 ? 'rgba(232, 130, 107,0.8)'
    : 'rgba(232, 130, 107,0.7)';
  const glow = level === 4 ? '0 0 4px rgba(251, 113, 133,0.6)' : 'none';
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          backgroundColor: color, boxShadow: glow, flexShrink: 0,
        }}/>
      ))}
    </div>
  );
}
