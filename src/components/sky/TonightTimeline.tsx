// src/components/sky/TonightTimeline.tsx
//
// Drag-to-scrub timeline of tonight's dark window. For every observable body
// we draw an altitude curve that arcs from rise → peak → set, and as the
// scrubber moves, a dot rides each curve. The user instantly sees "Saturn
// peaks at 11:42pm" — that's their window — without scrolling tables.

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import './TonightTimeline.css';

interface TimelineObject {
  name: string;
  color: string;
  visibleStart: string;
  visibleEnd: string;
  peakAt: string;
  peakAlt: number;
  peakAzimuth: number;
}

interface TimelineResponse {
  darkWindow: { start: string; end: string } | null;
  objects: TimelineObject[];
  excludedCount: number;
}

interface TonightTimelineProps {
  lat: number;
  lon: number;
}

const SVG_W = 720;
const SVG_H = 240;
const PAD_X = 28;
const PAD_TOP = 26;
const PAD_BOTTOM = 28;
const SNAP_DEG = 0.04; // fraction of width — magnetic snap radius near peaks

export function TonightTimeline({ lat, lon }: TonightTimelineProps) {
  const t = useTranslations('sky.timeline');
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrub, setScrub] = useState(0.5); // 0..1

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/sky/timeline?lat=${lat}&lon=${lon}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then((j: TimelineResponse) => { if (!cancelled) { setData(j); setLoading(false); } })
      .catch(() => { if (!cancelled) { setError(t('error')); setLoading(false); } });
    return () => { cancelled = true; };
  }, [lat, lon, t]);

  const dark = data?.darkWindow;
  const objects = data?.objects ?? [];

  const startMs = dark ? new Date(dark.start).getTime() : 0;
  const endMs = dark ? new Date(dark.end).getTime() : 0;
  const span = endMs - startMs;

  // Initialize scrub at "now" if now is within the dark window.
  useEffect(() => {
    if (!dark || span <= 0) return;
    const now = Date.now();
    if (now >= startMs && now <= endMs) {
      setScrub((now - startMs) / span);
    } else {
      setScrub(0.5);
    }
  }, [dark, span, startMs, endMs]);

  const scrubMs = startMs + scrub * span;

  const planeW = SVG_W - PAD_X * 2;
  const planeH = SVG_H - PAD_TOP - PAD_BOTTOM;

  function tToX(ms: number) {
    if (span <= 0) return PAD_X;
    return PAD_X + ((ms - startMs) / span) * planeW;
  }
  function altToY(alt: number) {
    // 0° → planeH (bottom of plane), 90° → 0 (top). Cap at 90.
    const aa = Math.max(0, Math.min(90, alt));
    return PAD_TOP + (1 - aa / 90) * planeH;
  }

  // Snap targets: each object's peak time, and start/end of the window.
  const snapXs = useMemo(() => {
    const xs: number[] = [];
    if (dark && span > 0) {
      xs.push(0);
      xs.push(1);
      objects.forEach((o) => {
        const t = (new Date(o.peakAt).getTime() - startMs) / span;
        if (t >= 0 && t <= 1) xs.push(t);
      });
    }
    return xs.sort((a, b) => a - b);
  }, [dark, objects, startMs, span]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  function handlePointer(clientX: number) {
    const svg = svgRef.current;
    if (!svg || span <= 0) return;
    const rect = svg.getBoundingClientRect();
    const xLocal = ((clientX - rect.left) / rect.width) * SVG_W;
    let f = (xLocal - PAD_X) / planeW;
    f = Math.max(0, Math.min(1, f));
    // Magnetic snap to nearest peak/edge
    let snapped = f;
    let bestDist = SNAP_DEG;
    for (const sx of snapXs) {
      const d = Math.abs(sx - f);
      if (d < bestDist) {
        bestDist = d;
        snapped = sx;
      }
    }
    setScrub(snapped);
  }

  // Parabolic altitude estimate for an object at time `t` (ms). Fits a curve
  // through (start→0°), (peak→peakAlt), (end→0°). Cheap and visually correct
  // for the scrubber.
  function altAt(o: TimelineObject, ms: number): number {
    const ts = new Date(o.visibleStart).getTime();
    const tp = new Date(o.peakAt).getTime();
    const te = new Date(o.visibleEnd).getTime();
    if (ms < ts || ms > te) return 0;
    // Use piecewise quadratic so peak isn't smeared if start/end are asymmetric.
    if (ms <= tp) {
      const u = (ms - ts) / Math.max(1, tp - ts);
      return o.peakAlt * (1 - (1 - u) * (1 - u));
    }
    const u = (ms - tp) / Math.max(1, te - tp);
    return o.peakAlt * (1 - u * u);
  }

  // Draw object's altitude curve as a polyline of 32 samples.
  function curvePath(o: TimelineObject): string {
    const ts = new Date(o.visibleStart).getTime();
    const te = new Date(o.visibleEnd).getTime();
    const N = 32;
    const pts: string[] = [];
    for (let i = 0; i <= N; i++) {
      const ms = ts + ((te - ts) * i) / N;
      const alt = altAt(o, ms);
      pts.push(`${tToX(ms).toFixed(1)},${altToY(alt).toFixed(1)}`);
    }
    return `M ${pts.join(' L ')}`;
  }

  // Bodies above horizon at the scrub time, with current altitude/azimuth.
  const aboveNow = useMemo(() => {
    if (!data || span <= 0) return [];
    return data.objects
      .map((o) => ({ obj: o, alt: altAt(o, scrubMs) }))
      .filter((row) => row.alt > 1)
      .sort((a, b) => b.alt - a.alt);
  }, [data, span, scrubMs]);

  const scrubX = tToX(scrubMs);

  const fmtTime = (ms: number) => {
    if (!Number.isFinite(ms)) return '—';
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  if (loading) {
    return (
      <section className="tl" aria-busy="true">
        <header className="tl__head">
          <p className="tl__eyebrow">{t('eyebrow')}</p>
          <h2 className="tl__title">{t('title')}</h2>
        </header>
        <div className="tl__skeleton" />
      </section>
    );
  }

  if (error || !dark) {
    return (
      <section className="tl">
        <header className="tl__head">
          <p className="tl__eyebrow">{t('eyebrow')}</p>
          <h2 className="tl__title">{t('title')}</h2>
        </header>
        <p className="tl__empty">{error ?? t('noWindow')}</p>
      </section>
    );
  }

  return (
    <section className="tl" aria-label={t('aria')}>
      <header className="tl__head">
        <div>
          <p className="tl__eyebrow">{t('eyebrow')}</p>
          <h2 className="tl__title">{t('title')}</h2>
          <p className="tl__sub">{t('subtitle')}</p>
        </div>
        <div className="tl__windowChip">
          <span>{fmtTime(startMs)}</span>
          <span className="tl__windowDash">→</span>
          <span>{fmtTime(endMs)}</span>
        </div>
      </header>

      <div className="tl__stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="tl__svg"
          role="application"
          aria-label={t('chartAria')}
          onPointerDown={(e) => {
            draggingRef.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            handlePointer(e.clientX);
          }}
          onPointerMove={(e) => { if (draggingRef.current) handlePointer(e.clientX); }}
          onPointerUp={() => { draggingRef.current = false; }}
          onPointerCancel={() => { draggingRef.current = false; }}
        >
          <defs>
            <linearGradient id="tl-floor" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {/* Plane background */}
          <rect
            x={PAD_X}
            y={PAD_TOP}
            width={planeW}
            height={planeH}
            fill="url(#tl-floor)"
            stroke="rgba(255,255,255,0.05)"
          />

          {/* Altitude grid */}
          {[30, 60].map((alt) => (
            <g key={alt}>
              <line
                x1={PAD_X} x2={SVG_W - PAD_X}
                y1={altToY(alt)} y2={altToY(alt)}
                stroke="rgba(255,255,255,0.045)" strokeDasharray="2 5"
              />
              <text
                x={PAD_X - 4}
                y={altToY(alt) + 3}
                textAnchor="end"
                fontFamily="var(--font-mono, JetBrains Mono)"
                fontSize="9"
                fill="rgba(255,255,255,0.32)"
              >
                {alt}°
              </text>
            </g>
          ))}
          {/* Horizon */}
          <line
            x1={PAD_X} x2={SVG_W - PAD_X}
            y1={altToY(0)} y2={altToY(0)}
            stroke="rgba(255,255,255,0.18)"
          />
          <text
            x={PAD_X - 4}
            y={altToY(0) + 3}
            textAnchor="end"
            fontFamily="var(--font-mono, JetBrains Mono)"
            fontSize="9"
            fill="rgba(255,255,255,0.40)"
          >
            0°
          </text>

          {/* Time gridlines (every 1h, snapped to whole hours within window) */}
          <HourGrid startMs={startMs} endMs={endMs} tToX={tToX} bottomY={SVG_H - PAD_BOTTOM + 12} />

          {/* Object curves + peak markers */}
          {objects.map((o) => {
            const peakX = tToX(new Date(o.peakAt).getTime());
            const peakY = altToY(o.peakAlt);
            return (
              <g key={o.name}>
                <path d={curvePath(o)} fill="none" stroke={o.color} strokeWidth="1.4" opacity="0.55" />
                <circle cx={peakX} cy={peakY} r="2.4" fill={o.color} opacity="0.75" />
              </g>
            );
          })}

          {/* Scrub line */}
          <line
            x1={scrubX} x2={scrubX}
            y1={PAD_TOP - 4} y2={SVG_H - PAD_BOTTOM + 4}
            stroke="rgba(255,179,71,0.85)" strokeWidth="1.4"
          />

          {/* Body dots at scrub time */}
          {objects.map((o) => {
            const alt = altAt(o, scrubMs);
            if (alt <= 0) return null;
            const x = scrubX;
            const y = altToY(alt);
            return (
              <g key={`d-${o.name}`}>
                <circle cx={x} cy={y} r="6" fill={o.color} opacity="0.20" />
                <circle cx={x} cy={y} r="3.5" fill={o.color} />
                <text
                  x={x + 8}
                  y={y + 3}
                  fontFamily="var(--font-sans, Inter)"
                  fontSize="10"
                  fill="var(--text)"
                  fontWeight={500}
                >
                  {o.name}
                </text>
              </g>
            );
          })}
        </svg>

        <div
          className="tl__nowPanel"
          aria-live="polite"
        >
          <div className="tl__nowTime">{fmtTime(scrubMs)}</div>
          <div className="tl__nowLabel">{t('atThisMoment')}</div>
          {aboveNow.length === 0 ? (
            <p className="tl__noneUp">{t('noneUp')}</p>
          ) : (
            <ul className="tl__nowList">
              {aboveNow.slice(0, 4).map(({ obj, alt }) => {
                const peakMs = new Date(obj.peakAt).getTime();
                const isPeakNear = Math.abs(peakMs - scrubMs) <= 6 * 60 * 1000;
                return (
                  <li key={obj.name} className="tl__nowItem">
                    <span className="tl__nowDot" style={{ background: obj.color }} />
                    <span className="tl__nowName">{obj.name}</span>
                    <span className="tl__nowAlt">{Math.round(alt)}°</span>
                    {isPeakNear && (
                      <span className="tl__nowPeak">{t('peak')}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="tl__legend">
        <span>{t('legend.scrub')}</span>
        <span className="tl__legendDot tl__legendDot--snap" /> <span>{t('legend.snap')}</span>
      </div>
    </section>
  );
}

interface HourGridProps {
  startMs: number;
  endMs: number;
  tToX: (ms: number) => number;
  bottomY: number;
}
function HourGrid({ startMs, endMs, tToX, bottomY }: HourGridProps) {
  const ticks: { ms: number; label: string }[] = [];
  const start = new Date(startMs);
  const firstHour = new Date(start);
  firstHour.setMinutes(0, 0, 0);
  if (firstHour.getTime() < startMs) firstHour.setHours(firstHour.getHours() + 1);
  for (let t = firstHour.getTime(); t <= endMs; t += 60 * 60 * 1000) {
    ticks.push({
      ms: t,
      label: new Date(t).toLocaleTimeString([], { hour: '2-digit', hour12: false }),
    });
  }
  return (
    <g>
      {ticks.map((tick) => (
        <g key={tick.ms}>
          <line
            x1={tToX(tick.ms)} x2={tToX(tick.ms)}
            y1={PAD_TOP} y2={SVG_H - PAD_BOTTOM}
            stroke="rgba(255,255,255,0.04)"
          />
          <text
            x={tToX(tick.ms)}
            y={bottomY}
            textAnchor="middle"
            fontFamily="var(--font-mono, JetBrains Mono)"
            fontSize="9"
            fill="rgba(255,255,255,0.40)"
          >
            {tick.label}
          </text>
        </g>
      ))}
    </g>
  );
}
