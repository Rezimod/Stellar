'use client';

/**
 * /moon — interactive Moon detail.
 * Scrub the date (drag the timeline or use the arrows); the moon drawing and every
 * value recompute from astronomy-engine (real ephemeris) for the selected date.
 * Location fixed to Tbilisi for rise/set; phase/illumination/distance are global.
 */

import { useMemo, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  Body, Illumination, MoonPhase, SearchRiseSet, SearchMoonQuarter,
  NextMoonQuarter, Observer, GeoMoon, Equator, Horizon,
} from 'astronomy-engine';
import './moon.css';

const TBILISI = new Observer(41.7151, 44.8271, 380);
const AU_KM = 149_597_870.7;
const KM_MI = 0.621371;
const PPD = 26; // px per day on the scrubber
const RANGE = 45; // ± days

const fmtTime = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Tbilisi' }).format(d) : '—';
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Asia/Tbilisi' }).format(d);
const fmtWkd = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Asia/Tbilisi' }).format(d).toUpperCase();

function phaseName(angle: number): string {
  if (angle < 11.25 || angle >= 348.75) return 'New Moon';
  if (angle < 78.75) return 'Waxing Crescent';
  if (angle < 101.25) return 'First Quarter';
  if (angle < 168.75) return 'Waxing Gibbous';
  if (angle < 191.25) return 'Full Moon';
  if (angle < 258.75) return 'Waning Gibbous';
  if (angle < 281.25) return 'Last Quarter';
  return 'Waning Crescent';
}

// SVG path of the illuminated region for fraction f (0..1); waxing → lit on the right.
function litPath(cx: number, cy: number, r: number, f: number, waxing: boolean): string {
  const arx = r * Math.abs(1 - 2 * f);
  const outer = waxing ? 1 : 0;
  const inner = f < 0.5 ? (waxing ? 0 : 1) : (waxing ? 1 : 0);
  return `M ${cx},${cy - r} A ${r},${r} 0 0,${outer} ${cx},${cy + r} A ${arx},${r} 0 0,${inner} ${cx},${cy - r} Z`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function MoonPage() {
  const [today] = useState(() => new Date());
  const [offset, setOffset] = useState(0);
  const drag = useRef<{ x: number; base: number } | null>(null);

  const selected = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  }, [today, offset]);

  const data = useMemo(() => {
    const d = selected;
    const angle = MoonPhase(d);
    const illum = Illumination(Body.Moon, d).phase_fraction;
    const waxing = angle < 180;
    const d0 = startOfDay(d);
    let rise: Date | null = null, set: Date | null = null;
    try { rise = SearchRiseSet(Body.Moon, TBILISI, +1, d0, 1)?.date ?? null; } catch {}
    try { set = SearchRiseSet(Body.Moon, TBILISI, -1, d0, 1)?.date ?? null; } catch {}
    let fullDays = 0;
    try {
      let mq = SearchMoonQuarter(d);
      let guard = 0;
      while (mq.quarter !== 2 && guard++ < 8) mq = NextMoonQuarter(mq);
      fullDays = Math.max(0, Math.round((mq.time.date.getTime() - d.getTime()) / 86_400_000));
    } catch {}
    const v = GeoMoon(d);
    const mi = Math.round(Math.hypot(v.x, v.y, v.z) * AU_KM * KM_MI);
    let up = false;
    try {
      const eq = Equator(Body.Moon, d, TBILISI, true, true);
      up = Horizon(d, TBILISI, eq.ra, eq.dec, 'normal').altitude > 0;
    } catch {}
    return { angle, illum, waxing, rise, set, fullDays, mi, up };
  }, [selected]);

  const onDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, base: offset };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [offset]);
  const onMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    const delta = Math.round((drag.current.x - e.clientX) / PPD);
    setOffset(Math.max(-RANGE, Math.min(RANGE, drag.current.base + delta)));
  }, []);
  const onUp = useCallback(() => { drag.current = null; }, []);
  const step = (n: number) => setOffset((o) => Math.max(-RANGE, Math.min(RANGE, o + n)));

  const R = 118, C = 118;
  const marks = [-3, -2, -1, 0, 1, 2, 3];
  const isToday = offset === 0;

  return (
    <div className="moonpg">
      <div className="moonpg__col">
        <div className="moonpg__bar">
          <div className="moonpg__ctx">Moon · Sky Tonight</div>
          <button className="moonpg__x" aria-label="Close"><X size={16} /></button>
        </div>

        <div className="moonpg__hero">
          <svg width="236" height="236" viewBox="0 0 236 236" role="img" aria-label={phaseName(data.angle)}>
            <defs>
              <clipPath id="moonlit"><path d={litPath(C, C, R, data.illum, data.waxing)} /></clipPath>
              <clipPath id="moondisc"><circle cx={C} cy={C} r={R} /></clipPath>
            </defs>
            <g clipPath="url(#moondisc)">
              <image href="/sky/targets/moon.jpg" width="236" height="236" style={{ filter: 'brightness(0.13)' }} />
              <image href="/sky/targets/moon.jpg" width="236" height="236" clipPath="url(#moonlit)" />
            </g>
            <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,.06)" />
          </svg>
        </div>

        <h1 className="moonpg__title">{phaseName(data.angle)}</h1>
        <p className="moonpg__sub">{isToday ? 'Today · ' : ''}{fmtDate(selected)}</p>
        {isToday && data.up && (
          <div className="moonpg__chipwrap"><span className="moonpg__chip"><span className="moonpg__dot" />Visible now</span></div>
        )}

        <div className="moonpg__scrub">
          <div className="moonpg__steprow">
            <button className="moonpg__step" onClick={() => step(-1)} aria-label="Previous day"><ChevronLeft size={18} /></button>
            <div
              className="moonpg__ticks"
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
            >
              {Array.from({ length: 29 }).map((_, i) => (
                <i key={i} className={i % 4 === 0 ? 'tall' : ''} />
              ))}
              <span className="moonpg__caret" />
            </div>
            <button className="moonpg__step" onClick={() => step(1)} aria-label="Next day"><ChevronRight size={18} /></button>
          </div>
          <div className="moonpg__marks">
            {marks.map((m) => {
              const dd = new Date(selected); dd.setDate(dd.getDate() + m);
              return (
                <span key={m} className={m === 0 ? 'today' : ''} onClick={() => step(m)}>
                  {m === 0 && isToday ? 'TODAY' : fmtWkd(dd)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="moonpg__card">
          <div className="moonpg__row"><span className="moonpg__k">Illumination</span><span className="moonpg__v hi">{Math.round(data.illum * 100)}%</span></div>
          <div className="moonpg__row"><span className="moonpg__k">Moonrise</span><span className="moonpg__v">{fmtTime(data.rise)}</span></div>
          <div className="moonpg__row"><span className="moonpg__k">Moonset</span><span className="moonpg__v">{fmtTime(data.set)}</span></div>
          <div className="moonpg__row"><span className="moonpg__k">Next Full Moon</span><span className="moonpg__v">{data.fullDays}<small>{data.fullDays === 1 ? 'DAY' : 'DAYS'}</small></span></div>
          <div className="moonpg__row"><span className="moonpg__k">Distance</span><span className="moonpg__v">{data.mi.toLocaleString('en-US')}<small>MI</small></span></div>
        </div>
      </div>
    </div>
  );
}
