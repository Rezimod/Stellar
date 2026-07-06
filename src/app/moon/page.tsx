'use client';

/**
 * /moon — interactive Moon detail.
 * Scrub the date (drag the timeline or use the arrows); the moon drawing and every
 * value recompute from astronomy-engine (real ephemeris) for the selected date.
 * Location fixed to Tbilisi for rise/set; phase/illumination/distance are global.
 * Bilingual: labels/phase names + date formatting switch on the active locale (en/ka).
 */

import { useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
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

// [en, ka]
const STR = {
  ctx:      ['Moon · Sky Tonight', 'მთვარე · ცა ახლა'],
  today:    ['Today', 'დღეს'],
  todayCap: ['TODAY', 'დღეს'],
  visible:  ['Visible now', 'ახლა ხილულია'],
  illum:    ['Illumination', 'განათება'],
  rise:     ['Moonrise', 'ამოსვლა'],
  set:      ['Moonset', 'ჩასვლა'],
  nextFull: ['Next Full Moon', 'შემდეგი სავსემთვარეობა'],
  distance: ['Distance', 'მანძილი'],
  day:      ['DAY', 'დღე'],
  days:     ['DAYS', 'დღე'],
  distUnit: ['MI', 'კმ'],
} as const;

const PHASES: [string, string][] = [
  ['New Moon', 'ახალმთვარეობა'],          // 0
  ['Waxing Crescent', 'მზარდი ნამგალა'],  // 1
  ['First Quarter', 'პირველი მეოთხედი'],   // 2
  ['Waxing Gibbous', 'მზარდი ამოზნექილი'], // 3
  ['Full Moon', 'სავსემთვარეობა'],         // 4
  ['Waning Gibbous', 'კლებადი ამოზნექილი'],// 5
  ['Last Quarter', 'ბოლო მეოთხედი'],       // 6
  ['Waning Crescent', 'კლებადი ნამგალა'],  // 7
];

function phaseIndex(angle: number): number {
  if (angle < 11.25 || angle >= 348.75) return 0;
  if (angle < 78.75) return 1;
  if (angle < 101.25) return 2;
  if (angle < 168.75) return 3;
  if (angle < 191.25) return 4;
  if (angle < 258.75) return 5;
  if (angle < 281.25) return 6;
  return 7;
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
  const router = useRouter();
  const lang = useLocale() === 'ka' ? 1 : 0;
  const tag = lang ? 'ka-GE' : 'en-US';
  const t = (k: keyof typeof STR) => STR[k][lang];

  const fmtTime = (d: Date | null) =>
    d ? new Intl.DateTimeFormat(tag, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Tbilisi' }).format(d) : '—';
  const fmtDate = (d: Date) =>
    new Intl.DateTimeFormat(tag, { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Asia/Tbilisi' }).format(d);
  const fmtWkd = (d: Date) =>
    new Intl.DateTimeFormat(tag, { weekday: 'short', timeZone: 'Asia/Tbilisi' }).format(d).toUpperCase();

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
    const km = Math.round(Math.hypot(v.x, v.y, v.z) * AU_KM);
    const mi = Math.round(km * KM_MI);
    let up = false;
    try {
      const eq = Equator(Body.Moon, d, TBILISI, true, true);
      up = Horizon(d, TBILISI, eq.ra, eq.dec, 'normal').altitude > 0;
    } catch {}
    return { angle, illum, waxing, rise, set, fullDays, km, mi, up };
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
  const phase = PHASES[phaseIndex(data.angle)][lang];
  const dist = lang ? data.km : data.mi;

  return (
    <div className="moonpg">
      <div className="moonpg__col">
        <div className="moonpg__bar">
          <div className="moonpg__ctx">{t('ctx')}</div>
          <button className="moonpg__x" aria-label="Close" onClick={() => router.back()}><X size={16} /></button>
        </div>

        <div className="moonpg__hero">
          <svg width="236" height="236" viewBox="0 0 236 236" role="img" aria-label={phase}>
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

        <h1 className="moonpg__title">{phase}</h1>
        <p className="moonpg__sub">{isToday ? `${t('today')} · ` : ''}{fmtDate(selected)}</p>
        {isToday && data.up && (
          <div className="moonpg__chipwrap"><span className="moonpg__chip"><span className="moonpg__dot" />{t('visible')}</span></div>
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
                  {m === 0 && isToday ? t('todayCap') : fmtWkd(dd)}
                </span>
              );
            })}
          </div>
        </div>

        <div className="moonpg__card">
          <div className="moonpg__row"><span className="moonpg__k">{t('illum')}</span><span className="moonpg__v hi">{Math.round(data.illum * 100)}%</span></div>
          <div className="moonpg__row"><span className="moonpg__k">{t('rise')}</span><span className="moonpg__v">{fmtTime(data.rise)}</span></div>
          <div className="moonpg__row"><span className="moonpg__k">{t('set')}</span><span className="moonpg__v">{fmtTime(data.set)}</span></div>
          <div className="moonpg__row"><span className="moonpg__k">{t('nextFull')}</span><span className="moonpg__v">{data.fullDays}<small>{data.fullDays === 1 ? t('day') : t('days')}</small></span></div>
          <div className="moonpg__row"><span className="moonpg__k">{t('distance')}</span><span className="moonpg__v">{dist.toLocaleString(tag)}<small>{t('distUnit')}</small></span></div>
        </div>
      </div>
    </div>
  );
}
