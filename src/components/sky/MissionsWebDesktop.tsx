'use client';

import { useMemo, type ComponentType } from 'react';
import { Body, Observer, SearchRiseSet } from 'astronomy-engine';
import type { Mission } from '@/lib/types';
import type { QuizDef } from '@/lib/quizzes';
import SkyChart from './SkyChart';
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

const NODE: Record<string, ComponentType<{ size?: number }>> = {
  moon: MoonNode, jupiter: JupiterNode, saturn: SaturnNode,
  venus: VenusNode, mars: MarsNode, mercury: MercuryNode,
  pleiades: PleiadesNode, orion: OrionNode, andromeda: AndromedaNode, crab: CrabNode,
};

const GLYPH: Record<string, string> = {
  saturn: '♄', jupiter: '♃', moon: '☽', venus: '♀', mars: '♂', mercury: '☿',
  pleiades: 'M45', andromeda: 'M31', orion: 'Ori', crab: 'M1',
};

const TAGLINE: Record<string, string> = {
  saturn: 'Rings at their widest tilt',
  jupiter: 'Four Galilean moons visible',
  moon: 'Terminator cuts sharp craters',
  venus: 'Brightest object in the sky',
  mars: 'Rust-red and unmistakable',
  mercury: 'Low and fleeting — catch it fast',
  pleiades: 'Seven sisters, one glance',
  orion: 'Stellar nursery, 1,344 ly out',
  andromeda: 'Trillion suns, 2.5M ly away',
  crab: 'Ghost of a 1054 AD supernova',
};

const SUB_LINE: Record<string, string> = {
  saturn: 'Planet', jupiter: 'Planet', moon: 'Moon',
  venus: 'Planet', mars: 'Planet', mercury: 'Planet',
  pleiades: 'Open cluster', andromeda: 'Galaxy',
  orion: 'Nebula', crab: 'Supernova remnant',
};

export interface ChartStatus {
  aboveHorizon: boolean;
  altitude: number;
  azDir: string;
  azDeg?: number;
  peakTime: string | null;
  metaLine: string;
  riseTime?: string | null;
  setTime?: string | null;
  magnitude?: number | null;
}

interface Props {
  lat: number;
  lon: number;
  now: Date;
  city: string;
  chartableMissions: Mission[];
  primeMission: Mission | null;
  statusById: Record<string, ChartStatus>;
  completedIds: Set<string>;
  onStart: (m: Mission) => void;
  skyConditions: { cloudCover: number; visibility: string; verified: boolean } | null;
  streak: number;
  quizzes: QuizDef[];
  onStartQuiz: (q: QuizDef) => void;
  completedQuizIds: Set<string>;
}

function fmtHM(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function useSunTimes(lat: number, lon: number, date: Date) {
  return useMemo(() => {
    try {
      const obs = new Observer(lat, lon, 0);
      const midnight = new Date(date);
      midnight.setHours(0, 0, 0, 0);
      const noon = new Date(midnight);
      noon.setHours(12, 0, 0, 0);
      const set = SearchRiseSet(Body.Sun, obs, -1, noon, 1)?.date ?? null;
      const riseTomorrow = set
        ? SearchRiseSet(Body.Sun, obs, +1, set, 1)?.date ?? null
        : null;
      return { sunset: set, sunrise: riseTomorrow };
    } catch {
      return { sunset: null, sunrise: null };
    }
  }, [lat, lon, date]);
}

export default function MissionsWebDesktop({
  lat, lon, now, city,
  chartableMissions, primeMission, statusById, completedIds,
  onStart, skyConditions, streak, quizzes, onStartQuiz, completedQuizIds,
}: Props) {
  const { sunset, sunrise } = useSunTimes(lat, lon, now);
  const sunsetStr = fmtHM(sunset) ?? '19:42';
  const sunriseStr = fmtHM(sunrise) ?? '04:18';
  const windowHours = sunset && sunrise
    ? Math.max(0, (sunrise.getTime() - sunset.getTime()) / 3_600_000)
    : 0;
  const winH = Math.floor(windowHours);
  const winM = Math.round((windowHours - winH) * 60);

  const liveTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const liveDateStr = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  const primeStatus = primeMission ? statusById[primeMission.id] : null;
  const PrimeArt = primeMission ? NODE[primeMission.id] ?? JupiterNode : null;

  const targetsSorted = useMemo(() => {
    return [...chartableMissions].sort((a, b) => {
      const pa = a.id === primeMission?.id ? -1 : 0;
      const pb = b.id === primeMission?.id ? -1 : 0;
      if (pa !== pb) return pa - pb;
      const sa = statusById[a.id];
      const sb = statusById[b.id];
      if ((sa?.aboveHorizon ?? false) !== (sb?.aboveHorizon ?? false))
        return sa?.aboveHorizon ? -1 : 1;
      return (sb?.altitude ?? -100) - (sa?.altitude ?? -100);
    });
  }, [chartableMissions, statusById, primeMission]);

  const visibleCount = targetsSorted.filter(m => statusById[m.id]?.aboveHorizon).length;
  const settingCount = targetsSorted.filter(m => {
    const s = statusById[m.id];
    return s?.aboveHorizon && s.altitude < 20;
  }).length;

  const upNextMission = useMemo(() => {
    for (const m of chartableMissions) {
      if (m.id === primeMission?.id) continue;
      const s = statusById[m.id];
      if (!s?.aboveHorizon && s?.riseTime) return { m, rise: s.riseTime };
    }
    return null;
  }, [chartableMissions, primeMission, statusById]);

  const nextQuiz = useMemo(() => {
    return quizzes.find(q => !completedQuizIds.has(q.id)) ?? quizzes[0] ?? null;
  }, [quizzes, completedQuizIds]);

  // Scrubber thumb position (percent of 24h)
  const nowPct = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
  // Day block in SVG viewBox 1000 units maps 6:00 → 125, 18:00 → 625
  // (approx from design); we tick at 06/12/18/00. Night bands ~00:00-06:00 and 18:00-24:00.

  // Moon illumination: fallback 52% from design (skyConditions doesn't carry it)
  const moonPct = 52;

  return (
    <div className="hidden lg:block" style={{ fontFamily: 'var(--font-display)' }}>
      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px 1fr 320px',
          gap: 18,
          alignItems: 'start',
        }}
      >
        {/* ──────── LEFT RAIL ──────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* PRIME CARD */}
          {primeMission && PrimeArt && (
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid rgba(232, 130, 107,0.32)',
                borderRadius: 18,
                padding: '16px 16px 14px',
                background:
                  'linear-gradient(135deg, rgba(232, 130, 107,0.09) 0%, rgba(232, 130, 107,0.02) 55%, transparent 100%), rgba(18,14,4,0.55)',
                boxShadow:
                  '0 0 0 1px rgba(232, 130, 107,0.05) inset, 0 10px 30px rgba(0,0,0,0.35)',
              }}
            >
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background:
                    'radial-gradient(250px 160px at 80% -10%, rgba(232, 130, 107,0.18), transparent 60%)',
                }}
              />
              {/* kicker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: 'var(--stars)',
                    boxShadow:
                      '0 0 0 3px rgba(232, 130, 107,0.14), 0 0 10px rgba(232, 130, 107,0.6)',
                    animation: 'stl-pulse 2.4s ease-in-out infinite',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    letterSpacing: '0.26em',
                    color: 'var(--stars)',
                    fontWeight: 500,
                  }}
                >
                  PRIME · TONIGHT
                </span>
                {primeStatus?.aboveHorizon && (
                  <>
                    <span style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)', fontSize: 9 }}>·</span>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9.5,
                        color: 'rgba(255,255,255,0.45)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      ALT {Math.round(primeStatus.altitude)}°
                    </span>
                  </>
                )}
              </div>

              {/* target row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0 14px' }}>
                <div style={{ flexShrink: 0 }}>
                  <PrimeArt size={78} />
                </div>
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 500,
                      fontSize: 36,
                      lineHeight: 1,
                      color: 'var(--text)',
                      letterSpacing: '-0.015em',
                      margin: 0,
                    }}
                  >
                    {primeMission.name}
                  </h2>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontWeight: 400,
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.7)',
                      marginTop: 4,
                      lineHeight: 1.25,
                    }}
                  >
                    {TAGLINE[primeMission.id] ?? primeMission.desc}
                  </div>
                </div>
              </div>

              {/* stats 3-up */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 1,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  marginBottom: 12,
                }}
              >
                <StatCell label="Mag" value={
                  primeStatus?.magnitude != null
                    ? `${primeStatus.magnitude > 0 ? '+' : ''}${primeStatus.magnitude.toFixed(1)}`
                    : '—'
                } />
                <StatCell label="Alt" value={
                  primeStatus?.aboveHorizon ? `${primeStatus.altitude.toFixed(1)}°` : '—'
                } />
                <StatCell label="Az" value={
                  primeStatus?.azDeg != null ? `${Math.round(primeStatus.azDeg)}°` : primeStatus?.azDir ?? '—'
                } />
              </div>

              {/* riseset */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  padding: '6px 2px 10px',
                  borderTop: '1px dashed rgba(255,255,255,0.08)',
                  letterSpacing: '0.04em',
                }}
              >
                <span>Rises <span style={{ color: 'rgba(255,255,255,0.7)' }}>{primeStatus?.riseTime ?? '—'}</span></span>
                <span>Transit <span style={{ color: 'rgba(255,255,255,0.7)' }}>{primeStatus?.peakTime ?? '—'}</span></span>
                <span>Sets <span style={{ color: 'rgba(255,255,255,0.7)' }}>{primeStatus?.setTime ?? '—'}</span></span>
              </div>

              <button
                onClick={() => onStart(primeMission)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  height: 42,
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))',
                  color: 'var(--canvas)',
                  fontWeight: 600,
                  fontSize: 13,
                  letterSpacing: '0.01em',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.15), 0 6px 20px rgba(232, 130, 107,0.22)',
                }}
              >
                <span>Observe {primeMission.name}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 6,
                    background: 'rgba(0,0,0,0.18)',
                    color: 'var(--canvas)',
                  }}
                >
                  +{primeMission.stars} ★
                </span>
              </button>
            </div>
          )}

          {/* TARGETS LIST */}
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18,
              background: 'rgba(10,15,30,0.55)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: 'var(--text)',
                }}
              >
                Tonight&apos;s targets
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                {String(visibleCount).padStart(2, '0')} visible · {String(settingCount).padStart(2, '0')} low
              </span>
            </div>

            {targetsSorted.map((m, i) => {
              const s = statusById[m.id];
              const isActive = m.id === primeMission?.id;
              const dim = !s?.aboveHorizon || completedIds.has(m.id);
              const altPct = s?.aboveHorizon
                ? Math.max(6, Math.min(100, (s.altitude / 90) * 100))
                : 6;
              return (
                <button
                  key={m.id}
                  onClick={() => onStart(m)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '9px 14px',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(232, 130, 107,0.04)' : 'transparent',
                    opacity: dim ? 0.45 : 1,
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    color: 'inherit',
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontFamily: 'var(--font-display)',
                      fontSize: 15,
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    {GLYPH[m.id] ?? '★'}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-display)',
                        fontWeight: 500,
                        fontSize: 15,
                        color: 'var(--text)',
                        lineHeight: 1.1,
                      }}
                    >
                      {m.name}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9.5,
                        color: 'rgba(255,255,255,0.25)',
                        letterSpacing: '0.08em',
                        marginTop: 2,
                        textTransform: 'uppercase',
                      }}
                    >
                      {SUB_LINE[m.id] ?? ''}
                      {s?.magnitude != null ? ` · ${s.magnitude > 0 ? '+' : ''}${s.magnitude.toFixed(1)} mag` : ''}
                    </span>
                  </span>
                  <span
                    style={{
                      width: 56,
                      height: 3,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.06)',
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        height: '100%',
                        width: `${altPct}%`,
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, rgba(232, 130, 107,0.4), rgba(232, 130, 107,0.9))',
                      }}
                    />
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: s?.aboveHorizon ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                      width: 32,
                      textAlign: 'right',
                    }}
                  >
                    {s?.aboveHorizon ? `${Math.round(s.altitude)}°` : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ──────── CENTER : SKY CHART ──────── */}
        <section
          style={{
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 22,
            background:
              'radial-gradient(ellipse at 50% 35%, var(--canvas) 0%, var(--canvas) 45%, var(--canvas) 100%)',
            overflow: 'hidden',
            aspectRatio: '16 / 10',
            minHeight: 520,
          }}
        >
          {/* Overlays */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 5,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              padding: '18px 20px',
              pointerEvents: 'none',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 22,
                  letterSpacing: '-0.005em',
                  color: 'var(--text)',
                }}
              >
                Sky tonight
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                  marginTop: 4,
                }}
              >
                {city} · {liveTimeStr} · {liveDateStr}
              </div>
            </div>
            <div style={{ textAlign: 'right', pointerEvents: 'auto' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.14em',
                  color: 'rgba(255,255,255,0.7)',
                  padding: '5px 10px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 999,
                  background: 'rgba(10,15,30,0.5)',
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: 'var(--success)',
                    boxShadow: '0 0 6px var(--seafoam)',
                    animation: 'stl-pulse 2.4s ease-in-out infinite',
                  }}
                />
                LIVE · {liveTimeStr} · {liveDateStr}
              </div>
              {upNextMission && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                    padding: '6px 10px',
                    border: '1px solid rgba(232, 130, 107,0.18)',
                    borderRadius: 8,
                    background: 'rgba(232, 130, 107,0.04)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: 'var(--terracotta)',
                    textTransform: 'uppercase',
                  }}
                >
                  ↑ Up next ·{' '}
                  <b style={{ color: 'var(--stars)', fontWeight: 500 }}>{upNextMission.m.name}</b> · {upNextMission.rise}
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div style={{ position: 'absolute', inset: 0 }}>
            <SkyChart
              lat={lat}
              lon={lon}
              date={now}
              missions={chartableMissions.filter(m => statusById[m.id]?.aboveHorizon)}
              primeId={primeMission?.id ?? null}
              city={city}
              onSelect={onStart}
            />
          </div>

          {/* Legend */}
          <div
            style={{
              position: 'absolute',
              left: 16,
              bottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              zIndex: 5,
            }}
          >
            <LegendItem swatch={<span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--stars)', boxShadow: '0 0 6px rgba(232, 130, 107,0.6)' }} />}>Prime</LegendItem>
            <LegendItem swatch={<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', opacity: 0.7 }} />}>Target</LegendItem>
            <LegendItem swatch={
              <span style={{ width: 18, height: 1, background: 'repeating-linear-gradient(90deg,rgba(232, 130, 107,0.7) 0 4px,transparent 4px 8px)' }} />
            }>Ecliptic</LegendItem>
          </div>

          <div
            style={{
              position: 'absolute',
              right: 16,
              bottom: 14,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(6,10,24,0.8)',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.45)',
              zIndex: 5,
            }}
          >
            Click an object to observe
          </div>
        </section>

        {/* ──────── RIGHT RAIL ──────── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 1. OBSERVING WINDOW */}
          <div
            style={{
              padding: '14px 16px',
              border: '1px solid rgba(94, 234, 212,0.22)',
              borderRadius: 18,
              background:
                'radial-gradient(300px 160px at 100% 0%, rgba(94, 234, 212,0.07),transparent 60%), rgba(4,16,10,0.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: 'var(--success)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                }}
              >
                <span
                  style={{
                    width: 5, height: 5, borderRadius: 999, background: 'var(--success)',
                    boxShadow: '0 0 6px var(--seafoam)',
                    animation: 'stl-pulse 2s ease-in-out infinite',
                  }}
                />
                Observing window
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>
                {windowHours > 0 ? `Open · ${winH}h ${winM}m` : '—'}
              </span>
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 28,
                lineHeight: 1,
                color: 'var(--text)',
                letterSpacing: '-0.015em',
              }}
            >
              {sunsetStr}
              <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 8px', fontWeight: 300 }}>→</span>
              {sunriseStr}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 14,
                color: 'rgba(255,255,255,0.7)',
                marginTop: 4,
              }}
            >
              A <em>fair night</em>, with patience.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <WindowChip label="Start" primary />
              <WindowChip label="Capture" />
              <WindowChip label="Remind" />
            </div>
          </div>

          {/* 2. CONDITIONS */}
          <div
            style={{
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18,
              background: 'rgba(10,15,30,0.55)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px 10px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontStyle: 'italic',
                  fontSize: 17,
                  color: 'var(--text)',
                }}
              >
                Conditions
              </h3>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                {skyConditions?.verified ? 'Verified' : 'Estimated'}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.05)' }}>
              <CondCell
                label="Clear"
                value={skyConditions ? `${skyConditions.cloudCover}` : '—'}
                suffix="%"
                sub={skyConditions ? (skyConditions.cloudCover < 20 ? 'Near cloudless' : skyConditions.cloudCover < 60 ? 'Scattered cloud' : 'Heavy cloud') : 'No data'}
                tone={skyConditions ? (skyConditions.cloudCover < 30 ? 'ok' : skyConditions.cloudCover < 70 ? undefined : 'warn') : undefined}
              />
              <CondCell label="Moon" value={String(moonPct)} suffix="%" sub="Waxing gibbous" tone="warn" />
              <CondCell label="Seeing" value="4" suffix="/5" sub="Steady air" />
              <CondCell label="Transparency" value="3" suffix="/5" sub="Low haze" />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.45)',
                  flex: 1,
                }}
              >
                Bortle · Suburban
              </span>
              <span style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: 9 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 7,
                      height: 12,
                      borderRadius: 2,
                      background: i < 6 ? 'var(--stars)' : 'rgba(255,255,255,0.06)',
                      boxShadow: i < 6 ? '0 0 6px rgba(232, 130, 107,0.5)' : 'none',
                    }}
                  />
                ))}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stars)', letterSpacing: '0.1em' }}>
                6 / 9
              </span>
            </div>
          </div>

          {/* 3. SKY QUIZ */}
          {nextQuiz && (
            <button
              onClick={() => onStartQuiz(nextQuiz)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: 16,
                border: '1px solid rgba(167,139,232,0.22)',
                borderRadius: 18,
                textAlign: 'left',
                cursor: 'pointer',
                color: 'inherit',
                background:
                  'radial-gradient(circle at 85% 25%, rgba(167,139,232,0.18) 0%, transparent 55%), radial-gradient(circle at 15% 85%, rgba(255,143,184,0.10) 0%, transparent 55%), linear-gradient(145deg,var(--canvas) 0%,var(--canvas) 100%)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: 'var(--terracotta)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      width: 5, height: 5, borderRadius: 999, background: 'var(--terracotta)',
                      boxShadow: '0 0 6px var(--terracotta)',
                      animation: 'stl-pulse 2.4s ease-in-out infinite',
                    }}
                  />
                  Sky quiz · Daily
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9,
                    letterSpacing: '0.14em',
                    padding: '3px 7px',
                    borderRadius: 5,
                    background: 'rgba(255,143,184,0.14)',
                    border: '1px solid rgba(255,143,184,0.3)',
                    color: 'var(--negative)',
                    textTransform: 'uppercase',
                  }}
                >
                  {completedQuizIds.has(nextQuiz.id) ? 'Replay' : 'New'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    flexShrink: 0,
                    position: 'relative',
                    background:
                      'radial-gradient(circle at 30% 30%, rgba(167,139,232,0.45), rgba(30,20,60,0.9))',
                    border: '1px solid rgba(167,139,232,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--terracotta)',
                  }}
                >
                  <svg viewBox="0 0 24 24" width={26} height={26} fill="none">
                    <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".85"/>
                    <ellipse cx="12" cy="12" rx="10" ry="3.5" stroke="currentColor" strokeWidth="1.2"/>
                    <ellipse cx="12" cy="12" rx="8" ry="2.2" stroke="currentColor" strokeWidth="0.8" opacity=".5"/>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h4
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 500,
                      fontSize: 19,
                      color: 'var(--text)',
                      lineHeight: 1.1,
                      margin: 0,
                    }}
                  >
                    {nextQuiz.title.en ?? 'Sky quiz'}
                  </h4>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.7)',
                      marginTop: 4,
                      lineHeight: 1.3,
                    }}
                  >
                    {nextQuiz.description.en ?? ''}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  letterSpacing: '0.08em',
                  marginBottom: 12,
                }}
              >
                <span><b style={{ color: 'var(--terracotta)', fontWeight: 500 }}>{nextQuiz.questions?.length ?? 10}</b> questions</span>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }} />
                <span><b style={{ color: 'var(--terracotta)', fontWeight: 500 }}>~3 min</b></span>
                <span style={{ width: 3, height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.25)' }} />
                <span>+100 ★</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid rgba(167,139,232,0.4)',
                  background: 'rgba(167,139,232,0.14)',
                  color: 'var(--terracotta)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}
              >
                <svg width="11" height="11" viewBox="0 0 11 11" fill="currentColor">
                  <path d="M2 1l7 4.5L2 10V1z" />
                </svg>
                Start quiz
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    padding: '2px 6px',
                    borderRadius: 5,
                    background: 'rgba(232, 130, 107,0.14)',
                    border: '1px solid rgba(232, 130, 107,0.3)',
                    color: 'var(--stars)',
                    marginLeft: 4,
                  }}
                >
                  +100 ★
                </span>
              </div>
            </button>
          )}

          {/* 4. ASK ASTRA */}
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              padding: '14px 16px',
              border: '1px solid rgba(94, 234, 212,0.22)',
              borderRadius: 18,
              background:
                'radial-gradient(circle at 85% 25%, rgba(94, 234, 212,0.12) 0%, transparent 55%), linear-gradient(145deg,var(--canvas) 0%,var(--canvas) 100%)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: 'var(--stl-teal)',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 5, height: 5, borderRadius: 999, background: 'var(--stl-teal)',
                  boxShadow: '0 0 6px var(--seafoam)',
                  animation: 'stl-pulse 2.4s ease-in-out infinite',
                }}
              />
              Astra · AI astronomer
            </div>
            <div
              style={{
                background: 'rgba(94, 234, 212,0.06)',
                border: '1px solid rgba(94, 234, 212,0.14)',
                borderRadius: '12px 12px 12px 4px',
                padding: '10px 12px',
                fontFamily: 'var(--font-display)',
                fontSize: 13.5,
                lineHeight: 1.4,
                color: 'rgba(255,255,255,0.7)',
                fontStyle: 'italic',
                marginBottom: 10,
              }}
            >
              <b style={{ color: 'var(--seafoam)', fontStyle: 'normal', fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 12.5 }}>
                Tip:
              </b>{' '}
              {primeMission?.id === 'saturn'
                ? <>Saturn rises at <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--seafoam)', fontStyle: 'normal' }}>{primeStatus?.riseTime ?? sunsetStr}</span> — rings are near widest this week.</>
                : primeMission
                ? <>{primeMission.name} is tonight&apos;s best target. Best at {primeStatus?.peakTime ?? '—'}.</>
                : <>Sky opens at <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--seafoam)', fontStyle: 'normal' }}>{sunsetStr}</span>. Check back after sunset.</>
              }
            </div>
            <a
              href="/chat"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                border: '1px solid rgba(94, 234, 212,0.22)',
                borderRadius: 10,
                background: 'rgba(3,10,18,0.5)',
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                textDecoration: 'none',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1l1.5 3 3.5.5-2.5 2.5.5 3.5L6 9l-3 1.5.5-3.5L1 4.5 4.5 4 6 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
              </svg>
              <span style={{ flex: 1, color: 'rgba(255,255,255,0.7)' }}>What&apos;s worth a look tonight?</span>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: 'linear-gradient(135deg,var(--seafoam),var(--seafoam))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--canvas)',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            </a>
          </div>

          {/* 5. STREAK */}
          <div
            style={{
              padding: '14px 16px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 18,
              background: 'rgba(10,15,30,0.55)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h4
                style={{
                  margin: 0,
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontWeight: 500,
                  fontSize: 16,
                  color: 'var(--text)',
                }}
              >
                Observing streak
              </h4>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--stars)', letterSpacing: '0.12em' }}>
                {streak} nights
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
              {(() => {
                const cells = [];
                const todayIdx = 6;
                const litDays = Math.min(6, Math.max(0, streak));
                const startLit = todayIdx - litDays;
                for (let i = 0; i < 7; i++) {
                  const isToday = i === todayIdx;
                  const isOn = !isToday && i >= startLit;
                  cells.push(
                    <div
                      key={i}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 7,
                        background: isToday
                          ? 'rgba(94, 234, 212,0.14)'
                          : isOn
                          ? 'rgba(232, 130, 107,0.14)'
                          : 'rgba(255,255,255,0.04)',
                        border: isToday
                          ? '1px solid rgba(94, 234, 212,0.35)'
                          : isOn
                          ? '1px solid rgba(232, 130, 107,0.3)'
                          : '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 10,
                        color: isToday ? 'var(--success)' : isOn ? 'var(--stars)' : 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {isToday ? '●' : isOn ? '✦' : ''}
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                color: 'rgba(255,255,255,0.25)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <span key={d}>{d}</span>)}
            </div>
          </div>
        </aside>
      </div>

      {/* ──────── BOTTOM SCRUBBER ──────── */}
      <div
        style={{
          marginTop: 18,
          padding: '12px 18px 14px',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18,
          background: 'rgba(10,15,30,0.55)',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 18,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
            Now
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.005em' }}>
            {liveTimeStr}
          </span>
        </div>
        <div style={{ position: 'relative', height: 40 }}>
          <svg viewBox="0 0 1000 40" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            <rect x="0" y="15" width="180" height="10" fill="rgba(232, 130, 107,0.18)" rx="3"/>
            <rect x="820" y="15" width="180" height="10" fill="rgba(232, 130, 107,0.18)" rx="3"/>
            <rect x="180" y="15" width="640" height="10" fill="rgba(255,255,255,0.04)" rx="3"/>
            <path d="M0 25 Q 500 -40 1000 25" stroke="rgba(232, 130, 107,0.25)" strokeWidth="1" fill="none" strokeDasharray="2 4"/>
            <g stroke="rgba(255,255,255,0.15)" strokeWidth="1">
              <line x1="125" y1="12" x2="125" y2="28"/>
              <line x1="375" y1="12" x2="375" y2="28"/>
              <line x1="500" y1="12" x2="500" y2="28"/>
              <line x1="625" y1="12" x2="625" y2="28"/>
              <line x1="875" y1="12" x2="875" y2="28"/>
            </g>
            <text x="125" y="40" fill="rgba(255,255,255,0.35)" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" letterSpacing="1">06:00</text>
            <text x="375" y="40" fill="rgba(255,255,255,0.35)" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" letterSpacing="1">12:00</text>
            <text x="625" y="40" fill="rgba(255,255,255,0.35)" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" letterSpacing="1">18:00</text>
            <text x="875" y="40" fill="rgba(255,255,255,0.35)" fontFamily="JetBrains Mono" fontSize="9" textAnchor="middle" letterSpacing="1">00:00</text>
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${nowPct}%`,
              transform: 'translate(-50%,-50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 30%,var(--terracotta),var(--terracotta) 55%,var(--terracotta))',
              boxShadow: '0 0 0 2px rgba(232, 130, 107,0.25), 0 0 20px rgba(232, 130, 107,0.4)',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
          <button
            aria-label="play"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 2l7 4-7 4V2z" fill="currentColor"/></svg>
          </button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 22, color: 'var(--text)', letterSpacing: '-0.005em' }}>
            {sunriseStr}
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes stl-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'rgba(12,10,4,0.5)', padding: '8px 10px' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.25)',
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}

function LegendItem({ swatch, children }: { swatch: React.ReactNode; children: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {swatch}
      {children}
    </span>
  );
}

function WindowChip({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <button
      style={{
        flex: 1,
        padding: '9px 10px',
        borderRadius: 10,
        border: primary ? '1px solid rgba(94, 234, 212,0.4)' : '1px solid rgba(255,255,255,0.08)',
        background: primary
          ? 'linear-gradient(135deg, rgba(94, 234, 212,0.22), rgba(94, 234, 212,0.08))'
          : 'rgba(255,255,255,0.02)',
        color: primary ? 'var(--seafoam)' : 'rgba(255,255,255,0.7)',
        fontWeight: primary ? 500 : 400,
        fontSize: 11.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function CondCell({
  label, value, suffix, sub, tone,
}: {
  label: string; value: string; suffix?: string; sub: string; tone?: 'ok' | 'warn';
}) {
  const valColor =
    tone === 'ok' ? 'var(--seafoam)' :
    tone === 'warn' ? 'var(--terracotta)' :
    'var(--text)';
  return (
    <div style={{ background: 'rgba(8,12,24,0.65)', padding: '12px 14px' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1,
          color: valColor,
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'baseline',
          gap: 3,
        }}
      >
        {value}
        {suffix && <small style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'rgba(255,255,255,0.45)', fontWeight: 400 }}>{suffix}</small>}
      </div>
      <div style={{ marginTop: 4, fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>
        {sub}
      </div>
    </div>
  );
}
