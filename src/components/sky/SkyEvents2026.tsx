// src/components/sky/SkyEvents2026.tsx
//
// Year-in-the-sky rail. Static cards (no per-card animation) with strong,
// legible illustrations. Tapping a card opens a dialog rendered via a
// portal to document.body so it always centers in the viewport — never
// trapped by parent contain / overflow.

'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const opened = EVENTS.find((e) => e.id === openId) ?? null;

  // Lock body scroll while the dialog is open (preserves position so iOS
  // Safari doesn't jump to the top). Esc closes.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenId(null); };
    document.addEventListener('keydown', onKey);
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
      document.removeEventListener('keydown', onKey);
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
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

      {mounted && opened && createPortal(
        <div
          className="ev-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`ev-sheet-title-${opened.id}`}
          onClick={() => setOpenId(null)}
        >
          <div
            className="ev-modal__sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="ev-modal__close"
              aria-label={t('close')}
              onClick={() => setOpenId(null)}
            >
              <X size={18} />
            </button>
            <div className="ev-modal__art">
              <EventArt kind={opened.kind} large />
            </div>
            <p className="ev-modal__eyebrow">{formatDateRange(opened.date, opened.endDate)}</p>
            <h3 id={`ev-sheet-title-${opened.id}`} className="ev-modal__title">
              {t(`names.${opened.id}`)}
            </h3>
            <p className="ev-modal__body">{t(`details.${opened.id}.body`)}</p>
            <ul className="ev-modal__meta">
              <li>
                <span className="ev-modal__key">{t('peak')}</span>
                <span className="ev-modal__val">{t(`details.${opened.id}.peak`)}</span>
              </li>
              <li>
                <span className="ev-modal__key">{t('moon')}</span>
                <span className="ev-modal__val">{t(`details.${opened.id}.moon`)}</span>
              </li>
              <li>
                <span className="ev-modal__key">{t('gear')}</span>
                <span className="ev-modal__val">{t(`details.${opened.id}.gear`)}</span>
              </li>
            </ul>
            <p className="ev-modal__tip">{t(`details.${opened.id}.tip`)}</p>
          </div>
        </div>,
        document.body,
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

// All art is static — no animations. Solid colors, strong contrast,
// reads instantly at icon scale.

function LunarEclipseArt({ large }: { large: boolean }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="le-blood" cx="38%" cy="36%" r="68%">
          <stop offset="0%" stopColor="#FFC59A" />
          <stop offset="55%" stopColor="#C84A2E" />
          <stop offset="100%" stopColor="#3F0E0A" />
        </radialGradient>
        <radialGradient id="le-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(200, 74, 46, 0.34)" />
          <stop offset="100%" stopColor="rgba(200, 74, 46, 0)" />
        </radialGradient>
      </defs>
      <BackgroundDots />
      <g transform="translate(100,60)">
        <circle r="48" fill="url(#le-halo)" />
        <circle r="30" fill="url(#le-blood)" />
        <circle cx="-9" cy="-7" r="3.2" fill="rgba(0,0,0,0.18)" />
        <circle cx="6"  cy="2"  r="2.4" fill="rgba(0,0,0,0.16)" />
        <circle cx="-2" cy="9"  r="2"   fill="rgba(0,0,0,0.14)" />
      </g>
    </svg>
  );
}

function SolarEclipseArt({ large }: { large: boolean }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="se-corona" cx="50%" cy="50%" r="65%">
          <stop offset="42%" stopColor="rgba(255,233,180,0)" />
          <stop offset="50%" stopColor="rgba(255,233,180,0.95)" />
          <stop offset="62%" stopColor="rgba(255,179,71,0.45)" />
          <stop offset="100%" stopColor="rgba(255,179,71,0)" />
        </radialGradient>
      </defs>
      <BackgroundDots />
      <g transform="translate(100,60)">
        <circle r="50" fill="url(#se-corona)" />
        <circle r="28" fill="#0A1224" />
      </g>
    </svg>
  );
}

function MeteorShowerArt({ large }: { large: boolean }) {
  const radiantX = 152;
  const radiantY = 22;
  const streaks = [
    { angle: 200, len: 86, width: 1.8, opacity: 0.95 },
    { angle: 215, len: 64, width: 1.2, opacity: 0.78 },
    { angle: 225, len: 50, width: 0.9, opacity: 0.6 },
    { angle: 235, len: 38, width: 0.8, opacity: 0.45 },
  ];
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'} preserveAspectRatio="xMidYMid slice">
      <BackgroundDots dense />
      <defs>
        <linearGradient id="ms-streak" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.92)" />
          <stop offset="100%" stopColor="#FFE3A1" />
        </linearGradient>
      </defs>
      <circle cx={radiantX} cy={radiantY} r={1.6} fill="rgba(255, 226, 180, 0.85)" />
      {streaks.map((s, i) => {
        const rad = (s.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * s.len;
        const dy = Math.sin(rad) * s.len;
        return (
          <line
            key={i}
            x1={radiantX}
            y1={radiantY}
            x2={radiantX + dx}
            y2={radiantY + dy}
            stroke="url(#ms-streak)"
            strokeWidth={s.width}
            strokeLinecap="round"
            opacity={s.opacity}
          />
        );
      })}
    </svg>
  );
}

function SaturnOppositionArt({ large }: { large: boolean }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'} preserveAspectRatio="xMidYMid slice">
      <BackgroundDots />
      <defs>
        <radialGradient id="op-saturn" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f4e0a0" />
          <stop offset="55%" stopColor="#c89a3e" />
          <stop offset="100%" stopColor="#5a4318" />
        </radialGradient>
        <radialGradient id="op-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 230, 160, 0.40)" />
          <stop offset="100%" stopColor="rgba(255, 230, 160, 0)" />
        </radialGradient>
      </defs>
      <g transform="translate(100,60) rotate(-10)">
        <circle r="52" fill="url(#op-glow)" />
        <ellipse cx="0" cy="0" rx="56" ry="12" fill="none" stroke="rgba(245, 222, 168, 0.85)" strokeWidth="1.6" />
        <ellipse cx="0" cy="0" rx="50" ry="10.5" fill="none" stroke="rgba(0, 0, 0, 0.50)" strokeWidth="0.9" />
        <ellipse cx="0" cy="0" rx="46" ry="9.5" fill="none" stroke="rgba(212, 169, 84, 0.55)" strokeWidth="1.0" />
        <circle r="24" fill="url(#op-saturn)" />
        <ellipse cx="0" cy="-4" rx="22" ry="1.6" fill="rgba(140, 100, 50, 0.32)" />
        <ellipse cx="0" cy="6" rx="22" ry="1.6" fill="rgba(140, 100, 50, 0.22)" />
      </g>
    </svg>
  );
}

function ConjunctionArt({ large }: { large: boolean }) {
  return (
    <svg viewBox="0 0 200 120" width="100%" height="100%" aria-hidden="true" className={large ? 'ev-art ev-art--lg' : 'ev-art'} preserveAspectRatio="xMidYMid slice">
      <BackgroundDots />
      <defs>
        <radialGradient id="cj-mars" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff9c78" />
          <stop offset="60%" stopColor="#c2451f" />
          <stop offset="100%" stopColor="#5a1d08" />
        </radialGradient>
        <radialGradient id="cj-saturn" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#f4e0a0" />
          <stop offset="55%" stopColor="#c89a3e" />
          <stop offset="100%" stopColor="#6b5020" />
        </radialGradient>
        <radialGradient id="cj-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255, 220, 170, 0.45)" />
          <stop offset="100%" stopColor="rgba(255, 220, 170, 0)" />
        </radialGradient>
      </defs>
      <line x1="14" y1="62" x2="186" y2="62" stroke="rgba(255,255,255,0.10)" strokeWidth="0.6" strokeDasharray="2 4" />
      <g transform="translate(78,58)">
        <circle r="26" fill="url(#cj-halo)" />
        <circle r="8" fill="url(#cj-mars)" />
      </g>
      <g transform="translate(124,58)">
        <circle r="28" fill="url(#cj-halo)" />
        <circle r="10" fill="url(#cj-saturn)" />
        <ellipse rx="17" ry="3" fill="none" stroke="rgba(212, 169, 84, 0.75)" strokeWidth="0.9" />
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
