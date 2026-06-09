// src/components/sky/TonightTimeline.tsx
//
// "Tonight's Timeline" — a dusk-to-dawn strip that answers WHEN to observe,
// not just whether. One shared time axis (18:00 → 06:00) carries:
//   • the real dark window (astronomical twilight → twilight)
//   • hourly cloud cover overlaid on top of it (clear + dark = the gap)
//   • a bar per planet/Moon showing when it's actually above the horizon
// Tapping a body selects it on the dome above. No compass/camera needed.

'use client';

import { useMemo } from 'react';
import type { ObjectId, SkyObject, TwilightTimes } from '@/components/sky/finder/types';
import './TonightTimeline.css';

interface NightHour { hour: number; cloudCover: number }

interface TonightTimelineProps {
  nowISO: string;
  twilight?: TwilightTimes;
  objects: SkyObject[];
  nightHours: NightHour[];
  onSelect: (id: ObjectId) => void;
}

const BODY_COLOR: Record<string, string> = {
  moon: '#E2D5B0', mercury: '#C9C2B0', venus: '#F4D9A0', mars: '#E8836A',
  jupiter: '#C8A96E', saturn: '#D4BE8A', uranus: '#9FD8E5', neptune: '#6F8FE2',
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmtClock(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface BodySeg {
  id: ObjectId;
  name: string;
  color: string;
  startF: number;
  endF: number;
  title: string;
}

export function TonightTimeline({ nowISO, twilight, objects, nightHours, onSelect }: TonightTimelineProps) {
  const { start, span } = useMemo(() => {
    const now = new Date(nowISO);
    const s = new Date(now);
    if (s.getHours() < 12) s.setDate(s.getDate() - 1); // small hours → night began last evening
    s.setHours(18, 0, 0, 0);
    const e = new Date(s.getTime() + 12 * 3600 * 1000); // 18:00 → 06:00
    return { start: s, span: e.getTime() - s.getTime() };
  }, [nowISO]);

  const frac = (d: Date) => clamp01((d.getTime() - start.getTime()) / span);
  const fracISO = (iso: string | null | undefined) => (iso ? frac(new Date(iso)) : null);

  // Hour cell (e.g. 20, 0, 4) → fraction of its left edge along the axis.
  const hourFrac = (hour: number) => {
    const d = new Date(start);
    if (hour < 12) d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return frac(d);
  };

  const duskISO = twilight?.astronomicalDusk ?? twilight?.nauticalDusk ?? twilight?.civilDusk ?? null;
  const dawnISO = twilight?.astronomicalDawn ?? twilight?.nauticalDawn ?? twilight?.civilDawn ?? null;
  const duskF = fracISO(duskISO);
  const dawnF = fracISO(dawnISO);
  const nowF = frac(new Date(nowISO));

  const bodies = useMemo<BodySeg[]>(() => {
    const out: BodySeg[] = [];
    for (const o of objects) {
      if (o.id !== 'moon' && o.type !== 'planet') continue;
      let s = fracISO(o.riseTime);
      let e = fracISO(o.setTime);
      if (o.circumpolar) { s = 0; e = 1; }
      if (s == null && e == null) {
        if (o.visible || o.altitude > 0) { s = 0; e = 1; } else continue;
      } else if (s == null) {
        s = 0;
      } else if (e == null) {
        e = 1;
      }
      if (e! < s!) e = 1; // rises in the evening, sets past our window
      if (e! - s! < 0.012) continue;
      const rise = fmtClock(o.riseTime);
      const set = fmtClock(o.setTime);
      out.push({
        id: o.id,
        name: o.name,
        color: BODY_COLOR[o.id] ?? '#9FB2D6',
        startF: s!,
        endF: e!,
        title: [rise ? `Rises ${rise}` : 'Up at dusk', set ? `Sets ${set}` : 'Up till dawn'].join(' · '),
      });
    }
    return out.sort((a, b) => a.startF - b.startF).slice(0, 6);
  }, [objects, start, span]); // eslint-disable-line react-hooks/exhaustive-deps

  const ticks = [
    { f: 0.25, label: '9 PM' },
    { f: 0.5, label: '12 AM' },
    { f: 0.75, label: '3 AM' },
  ];

  const darkRange =
    duskISO && dawnISO ? `${fmtClock(duskISO)} – ${fmtClock(dawnISO)}` : 'Dusk to dawn';

  return (
    <section className="tl" aria-label="Tonight's timeline">
      <header className="tl__head">
        <p className="tl__eyebrow">Tonight&apos;s timeline</p>
        <p className="tl__sub">Dark window · {darkRange}</p>
      </header>

      <div className="tl__grid">
        {/* Axis */}
        <div className="tl__row tl__row--axis">
          <span className="tl__label" aria-hidden />
          <div className="tl__track tl__axis">
            {ticks.map((t) => (
              <span key={t.label} className="tl__tick" style={{ left: `${t.f * 100}%` }}>{t.label}</span>
            ))}
          </div>
        </div>

        {/* Sky strip: dark window + hourly cloud + now */}
        <div className="tl__row">
          <span className="tl__label">Sky</span>
          <div className="tl__track tl__sky">
            {duskF != null && dawnF != null && dawnF > duskF && (
              <div
                className="tl__darkband"
                style={{ left: `${duskF * 100}%`, width: `${(dawnF - duskF) * 100}%` }}
                title={`Dark window ${darkRange}`}
              />
            )}
            {nightHours.map((h) => (
              <div
                key={h.hour}
                className="tl__cloud"
                style={{
                  left: `${hourFrac(h.hour) * 100}%`,
                  width: `${(1 / 12) * 100}%`,
                  opacity: Math.min(0.85, h.cloudCover / 115),
                }}
                title={`${h.cloudCover}% cloud`}
              />
            ))}
            <span className="tl__now" style={{ left: `${nowF * 100}%` }} aria-label="Now" />
          </div>
        </div>

        {/* Bodies */}
        {bodies.map((b) => (
          <button
            key={b.id}
            type="button"
            className="tl__row tl__row--body"
            onClick={() => onSelect(b.id)}
            title={b.title}
          >
            <span className="tl__label tl__label--body">
              <i className="tl__dot" style={{ background: b.color, color: b.color }} aria-hidden="true" />
              {b.name}
            </span>
            <span className="tl__track">
              <span
                className="tl__bar"
                style={{ left: `${b.startF * 100}%`, width: `${(b.endF - b.startF) * 100}%`, background: b.color, color: b.color }}
              />
            </span>
          </button>
        ))}
      </div>

      <div className="tl__legend">
        <span className="tl__leg"><i className="tl__leg-dot tl__leg-dot--dark" /> Dark</span>
        <span className="tl__leg"><i className="tl__leg-dot tl__leg-dot--cloud" /> Cloud</span>
        <span className="tl__leg"><i className="tl__leg-dot tl__leg-dot--now" /> Now</span>
      </div>
    </section>
  );
}
