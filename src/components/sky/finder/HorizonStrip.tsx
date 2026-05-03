'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { SkyObject, ObjectId } from './types';

interface HorizonStripProps {
  objects: SkyObject[];
  highlightedId?: ObjectId | null;
  onObjectClick?: (id: ObjectId) => void;
}

const STRIP_WIDTH = 1600;
const STRIP_HEIGHT = 280;
const COMPASS_BAND = 28;
const SKY_FRACTION = 0.78; // top 78% = sky, bottom 22% (above compass band) = ground

const COMPASS_LABELS: { dir: string; az: number }[] = [
  { dir: 'N', az: 0 },
  { dir: 'NE', az: 45 },
  { dir: 'E', az: 90 },
  { dir: 'SE', az: 135 },
  { dir: 'S', az: 180 },
  { dir: 'SW', az: 225 },
  { dir: 'W', az: 270 },
  { dir: 'NW', az: 315 },
  { dir: 'N', az: 360 },
];

const ACCENT: Record<ObjectId, string> = {
  sun:     '#ffd166',
  moon:    '#f4ede0',
  mercury: '#d6cdb1',
  venus:   '#f7e7a8',
  mars:    '#ff7b54',
  jupiter: '#fbe9b7',
  saturn:  '#d4a574',
  uranus:  '#9ad4d4',
  neptune: '#8db7e8',
};

const GLOW: Record<ObjectId, string> = {
  sun:     '0 0 18px rgba(255,209,102,0.70), 0 0 36px rgba(255,123,26,0.25)',
  moon:    '0 0 14px rgba(244,237,224,0.55), 0 0 28px rgba(244,237,224,0.18)',
  mercury: '0 0 8px rgba(214,205,177,0.35)',
  venus:   '0 0 14px rgba(247,231,168,0.55), 0 0 26px rgba(247,231,168,0.18)',
  mars:    '0 0 12px rgba(255,123,84,0.50), 0 0 24px rgba(255,123,84,0.18)',
  jupiter: '0 0 14px rgba(255,209,102,0.55), 0 0 28px rgba(255,209,102,0.20)',
  saturn:  '0 0 12px rgba(212,165,116,0.50), 0 0 24px rgba(212,165,116,0.18)',
  uranus:  '0 0 10px rgba(154,212,212,0.40)',
  neptune: '0 0 10px rgba(141,183,232,0.40)',
};

interface PlottedObject extends SkyObject {
  xPx: number;
  yPx: number;
  size: number;
  isAbove: boolean;
}

const skyHeightPx = (STRIP_HEIGHT - COMPASS_BAND) * SKY_FRACTION;
const groundHeightPx = (STRIP_HEIGHT - COMPASS_BAND) - skyHeightPx;
const horizonY = skyHeightPx;

function discSizeForMag(mag: number, active: boolean): number {
  // Brighter = larger. Mag scale roughly -27 (Sun) … +8 (Neptune).
  const base = mag <= -2 ? 14 : mag <= 0 ? 12 : mag <= 2 ? 10 : mag <= 4 ? 9 : 8;
  return active ? base + 4 : base;
}

function plot(objects: SkyObject[]): PlottedObject[] {
  return objects.map((o) => {
    const xPx = (o.azimuth / 360) * STRIP_WIDTH;
    const altClamped = Math.max(-90, Math.min(90, o.altitude));
    let yPx: number;
    let isAbove: boolean;
    if (altClamped >= 0) {
      yPx = horizonY - (altClamped / 90) * skyHeightPx;
      isAbove = true;
    } else {
      // Below horizon: place 0..|alt|/90 of groundHeight downward.
      // Cap at 80% into ground so the dot doesn't sit on the compass row.
      const depth = Math.min(0.8, Math.abs(altClamped) / 90);
      yPx = horizonY + depth * groundHeightPx;
      isAbove = false;
    }
    return {
      ...o,
      xPx,
      yPx,
      size: discSizeForMag(o.magnitude, false),
      isAbove,
    };
  });
}

export function HorizonStrip({ objects, highlightedId, onObjectClick }: HorizonStripProps) {
  const t = useTranslations('sky.horizon');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const plotted = useMemo(() => plot(objects), [objects]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const focus = highlightedId ? plotted.find((p) => p.id === highlightedId) : null;
    const az = focus?.azimuth ?? 180;
    const el = scrollRef.current;
    const target = (az / 360) * STRIP_WIDTH - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [highlightedId, plotted]);

  return (
    <div className="horizon-strip">
      <div ref={scrollRef} className="horizon-strip__scroll">
        <div className="horizon-strip__inner" style={{ width: STRIP_WIDTH, height: STRIP_HEIGHT }}>
          <div className="horizon-strip__bg" />
          <StarField />

          {/* Altitude grid */}
          <div
            className="horizon-strip__grid"
            style={{ top: horizonY - skyHeightPx * (60 / 90) }}
            aria-hidden="true"
          />
          <div
            className="horizon-strip__grid"
            style={{ top: horizonY - skyHeightPx * (30 / 90) }}
            aria-hidden="true"
          />
          <div className="horizon-strip__alt-label" style={{ top: horizonY - skyHeightPx * (60 / 90) - 10 }}>
            60°
          </div>
          <div className="horizon-strip__alt-label" style={{ top: horizonY - skyHeightPx * (30 / 90) - 10 }}>
            30°
          </div>
          <div className="horizon-strip__alt-label" style={{ top: 4 }}>
            {t('zenith')}
          </div>

          {/* Horizon line */}
          <div className="horizon-strip__horizon" style={{ top: horizonY }} />

          {/* Ground band tint */}
          <div
            className="horizon-strip__ground"
            style={{ top: horizonY, height: groundHeightPx + COMPASS_BAND }}
          />

          {/* Object marks */}
          {plotted.map((p) => {
            const isHl = p.id === highlightedId;
            const accent = ACCENT[p.id];
            const radius = isHl ? p.size + 4 : p.size;
            const opacity = p.isAbove ? 1 : 0.32;
            return (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: p.xPx,
                  top: p.yPx,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isHl ? 5 : p.isAbove ? 3 : 2,
                }}
              >
                {isHl && p.isAbove && (
                  <div
                    className="horizon-strip__beam"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: 1,
                      height: horizonY - p.yPx,
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => onObjectClick?.(p.id)}
                  aria-label={p.name}
                  className={`horizon-strip__mark${isHl ? ' is-active' : ''}${p.isAbove ? '' : ' is-below'}`}
                  style={{
                    width: radius,
                    height: radius,
                    background: p.isAbove ? accent : 'rgba(255,255,255,0.45)',
                    boxShadow: p.isAbove ? GLOW[p.id] : 'none',
                    opacity,
                  }}
                />
                <div
                  className="horizon-strip__mark-label"
                  style={{
                    color: isHl ? 'var(--terracotta, #ffd166)' : p.isAbove ? '#f4ede0' : 'rgba(244,237,224,0.45)',
                    transform: `translate(-50%, ${-radius - 18}px)`,
                    fontWeight: isHl ? 600 : 500,
                  }}
                >
                  {p.name}
                </div>
                <div
                  className="horizon-strip__mark-alt"
                  style={{
                    color: isHl ? 'var(--terracotta, #ffd166)' : p.isAbove ? 'rgba(244,237,224,0.55)' : 'rgba(244,237,224,0.35)',
                    transform: `translate(-50%, ${radius / 2 + 6}px)`,
                  }}
                >
                  {p.isAbove ? `${Math.round(p.altitude)}°` : t('below')}
                </div>
              </div>
            );
          })}

          {/* Compass row */}
          <div className="horizon-strip__compass-row" style={{ height: COMPASS_BAND }}>
            {COMPASS_LABELS.map((c, i) => {
              const xPct = (c.az / 360) * 100;
              const isFocus = highlightedId
                ? plotted.find((p) => p.id === highlightedId)?.compassDirection === c.dir
                : false;
              return (
                <span
                  key={`${c.dir}-${i}`}
                  className={`horizon-strip__compass${isFocus ? ' is-focus' : ''}`}
                  style={{ left: `${xPct}%` }}
                >
                  {c.dir}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StarField() {
  const stars = useMemo(() => {
    const out: { x: number; y: number; o: number }[] = [];
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < 90; i++) {
      out.push({
        x: rand() * STRIP_WIDTH,
        y: rand() * skyHeightPx,
        o: 0.18 + rand() * 0.45,
      });
    }
    return out;
  }, []);
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="horizon-strip__star"
          style={{ left: s.x, top: s.y, opacity: s.o }}
        />
      ))}
    </>
  );
}
