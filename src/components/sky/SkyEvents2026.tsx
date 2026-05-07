// src/components/sky/SkyEvents2026.tsx
//
// Year-in-the-sky rail. Each card has a small refined icon and a light
// motion accent. Animations pause when the section is offscreen so the
// page stays smooth. Tapping a card opens a centered dialog at the
// viewport — its position is independent of the user's scroll offset.

'use client';

import { useEffect, useRef, useState } from 'react';
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
  date: string;
  endDate?: string;
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
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(true);

  const opened = EVENTS.find((e) => e.id === openId) ?? null;

  // Pause animations when the rail isn't visible — keeps the page snappy.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const node = sectionRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: '120px 0px' },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  // Scroll lock that preserves position (avoids the iOS Safari jump-to-top
  // behaviour that happens when you only set body.overflow = hidden).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!openId) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [openId]);

  // Esc closes.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId]);

  return (
    <section
      ref={sectionRef}
      className="ev"
      aria-label={t('aria')}
      data-anim={active ? 'on' : 'off'}
    >
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
        <div
          className="ev__sheet-backdrop"
          onClick={() => setOpenId(null)}
          role="presentation"
        >
          <div
            className="ev__sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`ev-sheet-title-${opened.id}`}
            onClick={(e) => e.stopPropagation()}
          >
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
            <h3 id={`ev-sheet-title-${opened.id}`} className="ev__sheet-title">
              {t(`names.${opened.id}`)}
            </h3>
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

// Lunar eclipse — a single Moon that crossfades white → copper-red and
// back. No traversal, no shadow disc — reads as a totality icon.
function LunarEclipseArt({ large }: { large: boolean }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <defs>
        <radialGradient id="moonNorm" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#F8F4EC" />
          <stop offset="60%" stopColor="#c8c2b5" />
          <stop offset="100%" stopColor="#6a665e" />
        </radialGradient>
        <radialGradient id="moonBlood" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFB28A" />
          <stop offset="55%" stopColor="#C84A2E" />
          <stop offset="100%" stopColor="#3F0E0A" />
        </radialGradient>
        <radialGradient id="moonHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200, 74, 46, 0.28)" />
          <stop offset="100%" stopColor="rgba(200, 74, 46, 0)" />
        </radialGradient>
      </defs>
      <BackgroundDots />
      <g transform="translate(100,60)">
        <circle r="44" fill="url(#moonHalo)" className="ev-le__halo" />
        <circle r="26" fill="url(#moonNorm)" className="ev-le__pre" />
        <circle r="26" fill="url(#moonBlood)" className="ev-le__blood" />
      </g>
    </svg>
  );
}

// Solar eclipse — Sun with the Moon parked over it; only the corona
// breathes. Cheaper than the previous animated occultation and reads
// instantly as "eclipse" at icon scale.
function SolarEclipseArt({ large }: { large: boolean }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'}>
      <defs>
        <radialGradient id="se-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbe1" />
          <stop offset="50%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#ff7b1a" />
        </radialGradient>
        <radialGradient id="se-corona" cx="50%" cy="50%" r="65%">
          <stop offset="40%" stopColor="rgba(255,233,180,0)" />
          <stop offset="48%" stopColor="rgba(255,233,180,0.85)" />
          <stop offset="60%" stopColor="rgba(255,209,102,0.40)" />
          <stop offset="100%" stopColor="rgba(255,209,102,0)" />
        </radialGradient>
      </defs>
      <BackgroundDots />
      <g transform="translate(100,60)">
        <circle r="46" fill="url(#se-corona)" className="ev-se__corona" />
        <circle r="26" fill="url(#se-sun)" />
        <circle r="22" fill="#06101F" />
      </g>
    </svg>
  );
}

// Meteor shower — three streaks falling from the radiant on a tight
// 1.6s loop. Half the count of the old version, half the duration.
function MeteorShowerArt({ large }: { large: boolean }) {
  const radiantX = 150;
  const radiantY = 18;
  const streaks = [
    { angle: 200, len: 64, delay: '0s',   width: 1.6, opacity: 0.95 },
    { angle: 215, len: 44, delay: '0.5s', width: 1.0, opacity: 0.75 },
    { angle: 225, len: 36, delay: '1s',   width: 0.9, opacity: 0.6 },
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

// Saturn opposition — slow halo glow only. No rotation, no brightness
// filter (which forces a full-frame repaint each tick).
function SaturnOppositionArt({ large }: { large: boolean }) {
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
          <stop offset="0%" stopColor="rgba(255, 230, 160, 0.45)" />
          <stop offset="100%" stopColor="rgba(255, 230, 160, 0)" />
        </radialGradient>
      </defs>
      <g transform="translate(100,60) rotate(-8)">
        <circle r="48" fill="url(#op-glow)" className="ev-op__glow" />
        <ellipse cx="0" cy="0" rx="52" ry="11" fill="none" stroke="rgba(245, 222, 168, 0.85)" strokeWidth="1.4" />
        <ellipse cx="0" cy="0" rx="46" ry="9.5" fill="none" stroke="rgba(0, 0, 0, 0.45)" strokeWidth="0.8" />
        <ellipse cx="0" cy="0" rx="42" ry="8.5" fill="none" stroke="rgba(212, 169, 84, 0.55)" strokeWidth="1.0" />
        <circle r="22" fill="url(#op-saturn)" />
        <ellipse cx="0" cy="-4" rx="20" ry="1.6" fill="rgba(140, 100, 50, 0.30)" />
        <ellipse cx="0" cy="6" rx="20" ry="1.6" fill="rgba(140, 100, 50, 0.22)" />
      </g>
    </svg>
  );
}

// Conjunction — Mars and Saturn sit close. A single shared halo pulses;
// no traversal animation. Reads as "two planets, eyepiece field."
function ConjunctionArt({ large }: { large: boolean }) {
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
          <stop offset="0%" stopColor="rgba(255, 220, 170, 0.40)" />
          <stop offset="100%" stopColor="rgba(255, 220, 170, 0)" />
        </radialGradient>
      </defs>
      <line x1="20" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" strokeDasharray="2 4" />
      <g transform="translate(80,60)">
        <circle r="22" fill="url(#cj-halo)" className="ev-cj__halo" />
        <circle r="7" fill="url(#cj-mars)" />
      </g>
      <g transform="translate(120,60)">
        <circle r="24" fill="url(#cj-halo)" className="ev-cj__halo ev-cj__halo--b" />
        <circle r="8.5" fill="url(#cj-saturn)" />
        <ellipse rx="14" ry="2.6" fill="none" stroke="rgba(212, 169, 84, 0.65)" strokeWidth="0.8" />
      </g>
    </svg>
  );
}

function BackgroundDots({ dense = false }: { dense?: boolean }) {
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
