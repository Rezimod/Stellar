'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocation } from '@/lib/location';
import { LOCATIONS } from '@/lib/darksky-locations';
import { getUpcomingEvents, type AstroEvent } from '@/lib/astro-events';
import type { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from '@/lib/planets';
import { PlanetViz } from '@/components/sky/PlanetViz';
import {
  MeteorIcon,
  TelescopeIcon,
  CloudIcon,
  StarBurstIcon,
} from '@/components/icons/MarketIcons';

type Theme = 'light' | 'dark';
const THEME_KEY = 'stellar-sky-theme';

const PLANET_ORDER = ['moon', 'venus', 'mars', 'jupiter', 'saturn', 'mercury'];

interface MoonSunData {
  sunRise: string | null;
  sunSet: string | null;
  moonRise?: string | null;
  moonSet?: string | null;
  illuminationPct: number;
  moonPhaseDeg: number;
}

interface SkyScore {
  score: number;
  grade: string;
}

interface NightSummary {
  date: string;
  label: string;
  tier: 'go' | 'maybe' | 'skip';
  cloudCover: number;
  target: string;
  event?: AstroEvent;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateBortle(lat: number, lon: number): number {
  let minDist = Infinity;
  let nearest = 5;
  for (const loc of LOCATIONS) {
    const d = haversineKm(lat, lon, loc.lat, loc.lon);
    if (d < minDist) {
      minDist = d;
      nearest = loc.bortle;
    }
  }
  return minDist <= 50 ? nearest : 5;
}

function fmtTime(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtCoord(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(2)}${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}${lon >= 0 ? 'E' : 'W'}`;
}

function averageCloud(hours: SkyHour[]): number {
  if (!hours.length) return 0;
  const evening = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr <= 4;
  });
  const pool = evening.length ? evening : hours;
  const total = pool.reduce((s, h) => s + h.cloudCover, 0);
  return Math.round(total / pool.length);
}

function pickBestHour(hours: SkyHour[]): SkyHour | null {
  if (!hours.length) return null;
  const pool = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr <= 4;
  });
  const src = pool.length ? pool : hours;
  return src.reduce((a, b) => (a.cloudCover <= b.cloudCover ? a : b));
}

function tierFromCloud(c: number): 'go' | 'maybe' | 'skip' {
  if (c < 25) return 'go';
  if (c <= 60) return 'maybe';
  return 'skip';
}

function dayLabel(iso: string, idx: number): string {
  if (idx === 0) return 'Tonight';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short' });
}

function fullDateLabel(d: Date): string {
  return d.toLocaleDateString([], { weekday: 'short', month: 'long', day: 'numeric' });
}

function buildVerdictHead(score: number): string {
  if (score >= 70) return 'Clear night — go observe';
  if (score >= 40) return 'Fair night — pick your moment';
  return 'Tough night — maybe tomorrow';
}

function buildVerdictBody(args: {
  score: number;
  cloud: number;
  moonSet: string | null;
  moonIllum: number;
  planetsUp: PlanetInfo[];
  nextEvent?: AstroEvent;
}): string {
  const { cloud, moonSet, moonIllum, planetsUp, nextEvent } = args;
  const parts: string[] = [];

  if (cloud < 25) parts.push(`${cloud}% cloud — skies are open.`);
  else if (cloud <= 60) parts.push(`${cloud}% cloud with gaps expected.`);
  else parts.push(`${cloud}% cloud — mostly covered.`);

  if (moonSet && moonIllum > 25) {
    parts.push(`Moon sets at ${moonSet}, opening a dark window.`);
  } else if (moonIllum < 25) {
    parts.push(`Moon is thin — dark skies all night.`);
  }

  const bright = planetsUp
    .filter((p) => p.key !== 'moon')
    .slice(0, 2)
    .map((p) => p.key.charAt(0).toUpperCase() + p.key.slice(1));
  if (bright.length) {
    parts.push(`Best targets: ${bright.join(' and ')}.`);
  }

  if (nextEvent) {
    parts.push(`${nextEvent.name} on ${new Date(nextEvent.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}.`);
  }

  return parts.join(' ');
}

function scoreColorClass(score: number): string {
  if (score >= 70) return '';
  if (score >= 40) return 'fair';
  return 'poor';
}

export default function SkyPage() {
  const { location } = useLocation();
  const { lat, lon, city } = location;

  const [theme, setTheme] = useState<Theme>('light');
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets, setPlanets] = useState<PlanetInfo[] | null>(null);
  const [moonSun, setMoonSun] = useState<MoonSunData | null>(null);
  const [score, setScore] = useState<SkyScore | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') setTheme('dark');
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(false);

    Promise.all([
      fetch(`/api/sky/forecast?lat=${lat}&lng=${lon}`).then((r) => r.json()),
      fetch(`/api/sky/planets?lat=${lat}&lng=${lon}`).then((r) => r.json()),
      fetch(`/api/sky/sun-moon?lat=${lat}&lng=${lon}`).then((r) => r.json()),
      fetch(`/api/sky/score?lat=${lat}&lon=${lon}`).then((r) => r.json()),
    ])
      .then(([f, p, m, s]) => {
        if (cancelled) return;
        setForecast(Array.isArray(f) ? (f as SkyDay[]) : []);
        setPlanets(Array.isArray(p) ? (p as PlanetInfo[]) : []);
        setMoonSun(m && typeof m === 'object' ? (m as MoonSunData) : null);
        setScore(
          s && typeof s.score === 'number'
            ? { score: s.score, grade: s.grade ?? '' }
            : null,
        );
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  const bortle = useMemo(() => estimateBortle(lat, lon), [lat, lon]);

  const upcomingEvents = useMemo(() => getUpcomingEvents(new Date()), []);
  const nextEvent = upcomingEvents[0];

  const tonightCloud = useMemo(() => {
    if (!forecast || !forecast.length) return 0;
    return averageCloud(forecast[0].hours);
  }, [forecast]);

  const bestHour = useMemo(() => {
    if (!forecast || !forecast.length) return null;
    return pickBestHour(forecast[0].hours);
  }, [forecast]);

  const visibilityKm = useMemo(() => {
    if (!bestHour) return 0;
    return Math.round(bestHour.visibility / 1000);
  }, [bestHour]);

  const windKmh = useMemo(() => {
    if (!bestHour) return 0;
    return Math.round(bestHour.wind);
  }, [bestHour]);

  const bestWindow = useMemo(() => {
    if (!bestHour) return '—';
    return bestHour.time.slice(11, 16);
  }, [bestHour]);

  const sortedPlanets = useMemo(() => {
    if (!planets) return [];
    const order = (k: string) => {
      const idx = PLANET_ORDER.indexOf(k);
      return idx === -1 ? 99 : idx;
    };
    return [...planets].sort((a, b) => {
      const ua = a.altitude > 0 ? 0 : 1;
      const ub = b.altitude > 0 ? 0 : 1;
      if (ua !== ub) return ua - ub;
      if (ua === 0) return b.altitude - a.altitude;
      return order(a.key) - order(b.key);
    });
  }, [planets]);

  const verdictHead = useMemo(() => {
    if (!score) return 'Reading the sky…';
    return buildVerdictHead(score.score);
  }, [score]);

  const verdictBody = useMemo(() => {
    if (!score || !planets) return '';
    return buildVerdictBody({
      score: score.score,
      cloud: tonightCloud,
      moonSet: fmtTime(moonSun?.moonSet ?? null),
      moonIllum: moonSun?.illuminationPct ?? 0,
      planetsUp: planets.filter((p) => p.altitude > 10),
      nextEvent,
    });
  }, [score, tonightCloud, moonSun, planets, nextEvent]);

  const nights: NightSummary[] = useMemo(() => {
    if (!forecast) return [];
    return forecast.slice(0, 7).map((day, idx) => {
      const cloud = averageCloud(day.hours);
      const tier = tierFromCloud(cloud);
      const event = upcomingEvents.find((e) => e.date === day.date);
      let target = '';
      if (event) {
        target = event.name.replace(' Meteor Shower', '').replace(' at Opposition', '');
      } else if (tier === 'go') {
        target = 'Deep sky';
      } else if (tier === 'maybe') {
        target = 'Planets';
      } else {
        target = 'Stay in';
      }
      return {
        date: day.date,
        label: dayLabel(day.date, idx),
        tier,
        cloudCover: cloud,
        target,
        event,
      };
    });
  }, [forecast, upcomingEvents]);

  const tip = useMemo(() => {
    const soon = upcomingEvents.find((e) => {
      const diff =
        new Date(e.date + 'T00:00:00').getTime() - Date.now();
      return diff >= 0 && diff <= 3 * 24 * 60 * 60 * 1000;
    });
    if (soon) {
      return {
        kind: 'event' as const,
        event: soon,
      };
    }
    return null;
  }, [upcomingEvents]);

  const dateLabel = fullDateLabel(new Date());
  const loading = !forecast || !planets || !score;

  return (
    <div className={`sky-page ${theme === 'dark' ? 'dark' : ''}`}>
      {/* ── HERO — full-width dark starfield ─────────────────────────── */}
      <section className="sky-hero">
        <div className="sky-hero-inner">
          <div className="sky-hero-head">
            <div className="sky-hero-loc">
              <span className="sky-hero-dot" />
              <span className="sky-hero-city">{city || 'Tbilisi'}</span>
              <span className="sky-hero-coords">
                {fmtCoord(lat, lon)} · Bortle {bortle}
              </span>
            </div>
            <div className="sky-hero-head-right">
              <span className="sky-hero-date">{dateLabel}</span>
              <button
                type="button"
                className="sky-theme-toggle"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              />
            </div>
          </div>

          <div className="sky-verdict-row">
            <div
              className={`sky-score-ring ${score ? scoreColorClass(score.score) : ''}`}
            >
              <span className="sky-score-num">{score ? score.score : '—'}</span>
              <span className="sky-score-sub">/100</span>
            </div>
            <div className="sky-verdict-text">
              <div className="sky-verdict-head">{verdictHead}</div>
              {verdictBody && <div className="sky-verdict-body">{verdictBody}</div>}
              {error && !loading && (
                <div className="sky-verdict-body" style={{ color: '#FB7185' }}>
                  Couldn&apos;t reach the forecast service. Showing what we have.
                </div>
              )}
            </div>
          </div>

          <div className="sky-planets" role="list">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="sky-planet-card" aria-hidden>
                  <div className="sky-planet-viz" />
                  <div className="sky-planet-name" style={{ opacity: 0.3 }}>
                    —
                  </div>
                </div>
              ))}

            {!loading &&
              sortedPlanets.map((p) => {
                const below = p.altitude <= 0;
                const low = p.altitude > 0 && p.altitude <= 15;
                const dotClass = below ? '' : low ? 'low' : 'up';
                const transit = p.transit
                  ? fmtTime(typeof p.transit === 'string' ? p.transit : p.transit.toISOString())
                  : null;
                const set = p.set
                  ? fmtTime(typeof p.set === 'string' ? p.set : p.set.toISOString())
                  : null;
                const rise = p.rise
                  ? fmtTime(typeof p.rise === 'string' ? p.rise : p.rise.toISOString())
                  : null;

                const timeLine = below
                  ? rise
                    ? `rises ${rise}`
                    : 'below horizon'
                  : set
                    ? `sets ${set}`
                    : transit
                      ? `transits ${transit}`
                      : '';

                return (
                  <div
                    key={p.key}
                    role="listitem"
                    className={`sky-planet-card ${below ? 'below' : ''}`}
                  >
                    <div className="sky-planet-viz">
                      <PlanetViz name={p.key} />
                    </div>
                    <div className="sky-planet-name">
                      {dotClass && <span className={`sky-planet-dot ${dotClass}`} />}
                      <span>{p.key}</span>
                    </div>
                    <div className="sky-planet-meta">
                      {below ? (
                        <>below horizon</>
                      ) : (
                        <>
                          alt {Math.round(p.altitude)}° · mag {p.magnitude.toFixed(1)}
                          <br />
                          {timeLine}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </section>

      {/* ── 7-NIGHT FORECAST ─────────────────────────────────────────── */}
      <section className="sky-section">
        <div className="sky-content">
          <div className="sky-section-head">
            <h2 className="sky-section-title">Next 7 nights</h2>
            <span className="sky-section-meta">Open-Meteo · updated hourly</span>
          </div>

          <div className="sky-nights-grid">
            {(nights.length ? nights : Array.from({ length: 7 }).map((_, i) => null)).map(
              (n, i) => {
                const placeholder = !n;
                const viewClass = placeholder
                  ? 'clear'
                  : n!.tier === 'go'
                    ? 'clear'
                    : n!.tier === 'maybe'
                      ? 'partial'
                      : 'overcast';
                const isToday = i === 0;

                return (
                  <div
                    key={placeholder ? `ph-${i}` : n!.date}
                    className={`sky-night-tile ${isToday ? 'today' : ''}`}
                  >
                    <div className={`sky-night-viewport ${viewClass}`}>
                      {(viewClass === 'clear' || viewClass === 'partial') && (
                        <div className="sky-night-stars" />
                      )}
                      {viewClass !== 'clear' && <div className="sky-night-cloud" />}
                      <div className="sky-night-icon">
                        {!placeholder && n!.event ? (
                          n!.event.name.includes('Meteor') ? (
                            <MeteorIcon size={18} />
                          ) : (
                            <StarBurstIcon size={18} />
                          )
                        ) : viewClass === 'overcast' ? (
                          <CloudIcon size={18} />
                        ) : viewClass === 'partial' ? (
                          <TelescopeIcon size={16} />
                        ) : (
                          <StarBurstIcon size={14} />
                        )}
                      </div>
                      <div className="sky-night-horizon" />
                    </div>
                    <div className="sky-night-info">
                      <span className="sky-night-day">
                        {placeholder ? '—' : n!.label}
                      </span>
                      {!placeholder && (
                        <>
                          <span className={`sky-night-tag ${n!.tier}`}>
                            {n!.tier === 'go' ? 'Go' : n!.tier === 'maybe' ? 'Maybe' : 'Skip'}
                          </span>
                          <span className="sky-night-target">{n!.target}</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ── TONIGHT IN DETAIL ────────────────────────────────────────── */}
      <section className="sky-section">
        <div className="sky-content">
          <div className="sky-section-head">
            <h2 className="sky-section-title">Tonight in detail</h2>
            <span className="sky-section-meta">
              {bestHour ? `best near ${bestWindow}` : ''}
            </span>
          </div>

          <div className="sky-detail-grid">
            <div className="sky-detail-card">
              <span className="sky-detail-label">Cloud cover</span>
              <span
                className={`sky-detail-value ${
                  tonightCloud < 25 ? 'good' : tonightCloud <= 60 ? 'fair' : 'poor'
                }`}
              >
                {tonightCloud}%
              </span>
              <span className="sky-detail-sub">
                {tonightCloud < 25
                  ? 'Mostly open skies'
                  : tonightCloud <= 60
                    ? 'Gaps after midnight'
                    : 'Mostly overcast'}
              </span>
            </div>

            <div className="sky-detail-card">
              <span className="sky-detail-label">Visibility</span>
              <span
                className={`sky-detail-value ${
                  visibilityKm > 10 ? 'good' : visibilityKm >= 5 ? 'fair' : 'poor'
                }`}
              >
                {visibilityKm} km
              </span>
              <span className="sky-detail-sub">
                {visibilityKm > 10
                  ? 'Good transparency'
                  : visibilityKm >= 5
                    ? 'Fair transparency'
                    : 'Low transparency'}
              </span>
            </div>

            <div className="sky-detail-card">
              <span className="sky-detail-label">Best window</span>
              <span className="sky-detail-value">{bestWindow}</span>
              <span className="sky-detail-sub">
                {moonSun?.moonSet
                  ? `After moonset ${fmtTime(moonSun.moonSet)}`
                  : 'Clearest hour tonight'}
              </span>
            </div>

            <div className="sky-detail-card">
              <span className="sky-detail-label">Wind</span>
              <span
                className={`sky-detail-value ${
                  windKmh < 10 ? 'good' : windKmh <= 20 ? 'fair' : 'poor'
                }`}
              >
                {windKmh} km/h
              </span>
              <span className="sky-detail-sub">
                {windKmh < 10
                  ? 'Steady seeing'
                  : windKmh <= 20
                    ? 'Light wind'
                    : 'Unsteady air'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TIP BAR ──────────────────────────────────────────────────── */}
      <section className="sky-section">
        <div className="sky-content">
          {tip ? (
            <div className="sky-tip">
              <span className="sky-tip-icon">
                <MeteorIcon size={18} />
              </span>
              <span className="sky-tip-body">
                <strong>{tip.event.name}</strong> —{' '}
                {new Date(tip.event.date + 'T12:00:00').toLocaleDateString([], {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
                . {tip.event.viewingTip}
              </span>
              <Link href="/markets" className="sky-tip-cta">
                Trade this market →
              </Link>
            </div>
          ) : (
            <div className="sky-tip">
              <span className="sky-tip-icon">
                <StarBurstIcon size={18} />
              </span>
              <span className="sky-tip-body">
                <strong>Start a sky mission</strong> — log a verified observation and earn Stars.
              </span>
              <Link href="/missions" className="sky-tip-cta">
                Open missions →
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
