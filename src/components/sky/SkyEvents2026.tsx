// src/components/sky/SkyEvents2026.tsx
//
// Year-in-the-sky rail. Each card is mostly illustration: a small inline
// SVG animation tuned to the event type. Tap to expand a sheet with date,
// location, peak time hint, moon phase note, and three-line "how to observe".

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import './SkyEvents2026.css';

type EventKind =
  | 'lunarEclipse'
  | 'solarEclipse'
  | 'meteorShower'
  | 'opposition'
  | 'conjunction';

interface SkyEvent {
  id: string;
  kind: EventKind;
  date: string;       // ISO date, primary day
  endDate?: string;   // optional end of multi-day event
}

const EVENTS: SkyEvent[] = [
  { id: 'lunar_eclipse_mar3',  kind: 'lunarEclipse',  date: '2026-03-03' },
  { id: 'lyrids',              kind: 'meteorShower',  date: '2026-04-22', endDate: '2026-04-23' },
  { id: 'mars_saturn_conj',    kind: 'conjunction',   date: '2026-05-12' },
  { id: 'perseids',            kind: 'meteorShower',  date: '2026-08-12', endDate: '2026-08-13' },
  { id: 'solar_eclipse_aug12', kind: 'solarEclipse',  date: '2026-08-12' },
  { id: 'saturn_opp',          kind: 'opposition',    date: '2026-10-04' },
  { id: 'geminids',            kind: 'meteorShower',  date: '2026-12-13', endDate: '2026-12-14' },
];

export function SkyEvents2026() {
  const t = useTranslations('sky.events');
  const [openId, setOpenId] = useState<string | null>(null);

  const opened = EVENTS.find((e) => e.id === openId) ?? null;

  // Lock body scroll while sheet open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!openId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [openId]);

  return (
    <section className="ev" aria-label={t('aria')}>
      <header className="ev__head">
        <p className="ev__eyebrow">{t('eyebrow')}</p>
        <h2 className="ev__title">{t('title')}</h2>
        <p className="ev__sub">{t('subtitle')}</p>
      </header>

      <ol className="ev__rail" role="list">
        {EVENTS.map((ev) => (
          <li key={ev.id} className="ev__cell">
            <button
              type="button"
              className={`ev__card ev__card--${ev.kind}`}
              onClick={() => setOpenId(ev.id)}
              aria-label={t(`names.${ev.id}`)}
            >
              <div className="ev__art">
                <EventArt kind={ev.kind} />
              </div>
              <div className="ev__caption">
                <span className="ev__date">{formatDateRange(ev.date, ev.endDate)}</span>
                <span className="ev__name">{t(`names.${ev.id}`)}</span>
              </div>
            </button>
          </li>
        ))}
      </ol>

      {opened && (
        <div className="ev__sheet-backdrop" onClick={() => setOpenId(null)}>
          <div className="ev__sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ev__sheet-close"
              aria-label={t('close')}
              onClick={() => setOpenId(null)}
            >
              <X size={18} />
            </button>
            <div className="ev__sheet-art">
              <EventArt kind={opened.kind} large />
            </div>
            <p className="ev__sheet-eyebrow">{formatDateRange(opened.date, opened.endDate)}</p>
            <h3 className="ev__sheet-title">{t(`names.${opened.id}`)}</h3>
            <p className="ev__sheet-body">{t(`details.${opened.id}.body`)}</p>
            <ul className="ev__sheet-meta">
              <li>
                <span className="ev__sheet-key">{t('peak')}</span>
                <span className="ev__sheet-val">{t(`details.${opened.id}.peak`)}</span>
              </li>
              <li>
                <span className="ev__sheet-key">{t('moon')}</span>
                <span className="ev__sheet-val">{t(`details.${opened.id}.moon`)}</span>
              </li>
              <li>
                <span className="ev__sheet-key">{t('gear')}</span>
                <span className="ev__sheet-val">{t(`details.${opened.id}.gear`)}</span>
              </li>
            </ul>
            <p className="ev__sheet-tip">{t(`details.${opened.id}.tip`)}</p>
          </div>
        </div>
      )}
    </section>
  );
}

function formatDateRange(start: string, end?: string): string {
  const s = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (!end) return s.toLocaleDateString('en-US', opts);
  const e = new Date(end);
  const sameMonth = s.getMonth() === e.getMonth();
  if (sameMonth) {
    return `${s.toLocaleDateString('en-US', opts)}–${e.getDate()}`;
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}`;
}

interface EventArtProps {
  kind: EventKind;
  large?: boolean;
}

function EventArt({ kind, large = false }: EventArtProps) {
  switch (kind) {
    case 'lunarEclipse':
      return <LunarEclipseArt large={large} />;
    case 'solarEclipse':
      return <SolarEclipseArt large={large} />;
    case 'meteorShower':
      return <MeteorShowerArt large={large} />;
    case 'opposition':
      return <SaturnOppositionArt large={large} />;
    case 'conjunction':
      return <ConjunctionArt large={large} />;
  }
}

function LunarEclipseArt({ large }: { large: boolean }) {
  // Earth's umbral shadow (faint disc, fixed) + the Moon sliding into and
  // through it. As the Moon enters the umbra, it crossfades from grey to
  // copper-red, then back as it exits. Astronomically faithful at card scale.
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <defs>
        <radialGradient id="moonNorm" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f4ede0" />
          <stop offset="60%" stopColor="#c8c2b5" />
          <stop offset="100%" stopColor="#6a665e" />
        </radialGradient>
        <radialGradient id="moonBlood" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFB28A" />
          <stop offset="55%" stopColor="#C84A2E" />
          <stop offset="100%" stopColor="#3F0E0A" />
        </radialGradient>
        <radialGradient id="umbra" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(80, 20, 20, 0.50)" />
          <stop offset="70%" stopColor="rgba(40, 12, 12, 0.30)" />
          <stop offset="100%" stopColor="rgba(20, 6, 6, 0)" />
        </radialGradient>
      </defs>
      <BackgroundDots />
      {/* Earth's umbra — a soft, fixed disc the Moon traverses. */}
      <circle cx="100" cy="60" r="46" fill="url(#umbra)" />
      <circle cx="100" cy="60" r="34" fill="rgba(0,0,0,0)" stroke="rgba(180, 60, 50, 0.18)" strokeDasharray="1.5 3" strokeWidth="0.7" />
      <g className="ev-le__moon">
        <circle cx="0" cy="60" r="22" fill="url(#moonNorm)" className="ev-le__pre" />
        <circle cx="0" cy="60" r="22" fill="url(#moonBlood)" className="ev-le__blood" />
      </g>
    </svg>
  );
}

function SolarEclipseArt({ large }: { large: boolean }) {
  // Moon slides across the Sun. At totality the corona blooms wide and
  // a brief diamond-ring flashes on the trailing edge before second contact.
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <defs>
        <radialGradient id="se-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbe1" />
          <stop offset="50%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#ff7b1a" />
        </radialGradient>
        <radialGradient id="se-corona" cx="50%" cy="50%" r="65%">
          <stop offset="38%" stopColor="rgba(255,233,180,0)" />
          <stop offset="46%" stopColor="rgba(255,233,180,0.85)" />
          <stop offset="60%" stopColor="rgba(255,209,102,0.45)" />
          <stop offset="100%" stopColor="rgba(255,209,102,0)" />
        </radialGradient>
        <radialGradient id="se-diamond" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 255, 255, 1)" />
          <stop offset="40%" stopColor="rgba(255, 240, 180, 0.85)" />
          <stop offset="100%" stopColor="rgba(255, 240, 180, 0)" />
        </radialGradient>
      </defs>
      <BackgroundDots />
      <g transform="translate(100,60)">
        {/* Long, soft corona rays — only fully visible at mid-totality. */}
        <g className="ev-se__rays">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line
              key={a}
              x1={0} y1={0}
              x2={Math.cos((a * Math.PI) / 180) * 60}
              y2={Math.sin((a * Math.PI) / 180) * 60}
              stroke="rgba(255, 233, 180, 0.45)"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          ))}
        </g>
        <circle r="46" fill="url(#se-corona)" className="ev-se__corona" />
        <circle r="26" fill="url(#se-sun)" />
        <circle r="26" cx="0" cy="0" fill="#06101F" className="ev-se__moon" />
        <circle r="6" cx="22" cy="0" fill="url(#se-diamond)" className="ev-se__diamond" />
      </g>
    </svg>
  );
}

function MeteorShowerArt({ large }: { large: boolean }) {
  // Streaks radiate from a single point (the radiant) and fade. Mixed
  // length / brightness / timing — this is what real showers look like.
  const radiantX = 150;
  const radiantY = 18;
  const streaks = [
    { angle: 200, len: 60, delay: '0s',   dur: '1.6s', width: 1.6, opacity: 0.9 },
    { angle: 215, len: 42, delay: '0.4s', dur: '1.2s', width: 1.0, opacity: 0.7 },
    { angle: 195, len: 78, delay: '0.8s', dur: '1.9s', width: 1.8, opacity: 1   },
    { angle: 230, len: 36, delay: '0.2s', dur: '1.0s', width: 0.9, opacity: 0.6 },
    { angle: 220, len: 54, delay: '1.3s', dur: '1.5s', width: 1.3, opacity: 0.85 },
    { angle: 205, len: 30, delay: '1.0s', dur: '0.9s', width: 0.8, opacity: 0.55 },
  ];
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <BackgroundDots dense />
      <defs>
        <linearGradient id="ms-streak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="100%" stopColor="#FFE3A1" />
        </linearGradient>
      </defs>
      {/* Faint radiant marker so the geometry reads. */}
      <circle cx={radiantX} cy={radiantY} r={1.4} fill="rgba(255, 226, 180, 0.7)" />
      {streaks.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * s.len;
        const dy = Math.sin(rad) * s.len;
        return (
          <g
            key={i}
            className="ev-ms__streak"
            style={{
              animationDelay: s.delay,
              animationDuration: s.dur,
              opacity: s.opacity,
              transformOrigin: `${radiantX}px ${radiantY}px`,
            }}
          >
            <line
              x1={radiantX}
              y1={radiantY}
              x2={radiantX + dx}
              y2={radiantY + dy}
              stroke="url(#ms-streak)"
              strokeWidth={s.width}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

function SaturnOppositionArt({ large }: { large: boolean }) {
  // Steady Saturn — rings tilted ~8° (where they actually sit in 2026), with
  // a slow brightness pulse and a gentle glow halo to suggest opposition
  // surge (when the rings briefly shine brighter than the disc itself).
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <BackgroundDots />
      <defs>
        <radialGradient id="op-saturn" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f0dc9a" />
          <stop offset="55%" stopColor="#c89a3e" />
          <stop offset="100%" stopColor="#6b5020" />
        </radialGradient>
        <radialGradient id="op-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 230, 160, 0.35)" />
          <stop offset="100%" stopColor="rgba(255, 230, 160, 0)" />
        </radialGradient>
      </defs>
      <g transform="translate(100,60) rotate(-8)" className="ev-op__saturn">
        <circle r="44" fill="url(#op-glow)" className="ev-op__glow" />
        {/* Outer ring — the bright A-ring edge. */}
        <ellipse cx="0" cy="0" rx="52" ry="11" fill="none" stroke="rgba(245, 222, 168, 0.85)" strokeWidth="1.4" />
        {/* Cassini division — the dark gap between A and B rings. */}
        <ellipse cx="0" cy="0" rx="46" ry="9.5" fill="none" stroke="rgba(0, 0, 0, 0.45)" strokeWidth="0.8" />
        {/* Inner ring — B-ring + crepe-ring fade. */}
        <ellipse cx="0" cy="0" rx="42" ry="8.5" fill="none" stroke="rgba(212, 169, 84, 0.55)" strokeWidth="1.0" />
        <ellipse cx="0" cy="0" rx="35" ry="6.5" fill="none" stroke="rgba(212, 169, 84, 0.28)" strokeWidth="0.6" strokeDasharray="2 3" />
        <circle r="22" fill="url(#op-saturn)" />
        {/* Subtle banding on the disc. */}
        <ellipse cx="0" cy="-4" rx="20" ry="1.6" fill="rgba(140, 100, 50, 0.30)" />
        <ellipse cx="0" cy="6" rx="20" ry="1.6" fill="rgba(140, 100, 50, 0.22)" />
      </g>
    </svg>
  );
}

function ConjunctionArt({ large }: { large: boolean }) {
  // Mars (red) and Saturn (gold) glide together until they nearly touch —
  // a single eyepiece field at closest approach — then drift apart again.
  // A faint guide dotted line traces the ecliptic to ground the geometry.
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <BackgroundDots />
      <defs>
        <radialGradient id="cj-mars" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff8a64" />
          <stop offset="60%" stopColor="#c2451f" />
          <stop offset="100%" stopColor="#5a1d08" />
        </radialGradient>
        <radialGradient id="cj-saturn" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f0dc9a" />
          <stop offset="55%" stopColor="#c89a3e" />
          <stop offset="100%" stopColor="#6b5020" />
        </radialGradient>
        <radialGradient id="cj-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 220, 170, 0.45)" />
          <stop offset="100%" stopColor="rgba(255, 220, 170, 0)" />
        </radialGradient>
      </defs>
      {/* Faint ecliptic — keeps both bodies on the same line. */}
      <line x1="20" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" strokeDasharray="2 4" />
      <g className="ev-cj__a">
        <circle cx="40" cy="60" r="14" fill="url(#cj-halo)" className="ev-cj__halo" />
        <circle cx="40" cy="60" r="6.5" fill="url(#cj-mars)" />
      </g>
      <g className="ev-cj__b">
        <circle cx="160" cy="60" r="16" fill="url(#cj-halo)" className="ev-cj__halo" />
        <circle cx="160" cy="60" r="8" fill="url(#cj-saturn)" />
        {/* Tiny ring nub — just enough to read as Saturn at this size. */}
        <ellipse cx="160" cy="60" rx="13" ry="2.4" fill="none" stroke="rgba(212, 169, 84, 0.65)" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

function BackgroundDots({ dense = false }: { dense?: boolean }) {
  // Stable pseudo-random dots — adds depth without making the art noisy.
  const stars = dense
    ? [[12,12,0.7],[28,40,0.6],[44,18,0.5],[60,55,0.7],[84,10,0.6],[110,30,0.7],[132,8,0.5],[150,40,0.6],[170,16,0.7],[188,50,0.5],[24,90,0.5],[68,100,0.6],[120,95,0.5],[176,98,0.6]]
    : [[18,20,0.6],[52,12,0.5],[92,32,0.6],[140,18,0.6],[178,28,0.5],[30,90,0.5],[80,100,0.6],[150,92,0.5]];
  return (
    <g aria-hidden="true">
      {stars.map(([cx, cy, op], i) => (
        <circle key={i} cx={cx} cy={cy} r={1} fill="#fff" opacity={op} />
      ))}
    </g>
  );
}
