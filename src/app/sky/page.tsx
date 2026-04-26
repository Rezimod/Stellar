'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocation } from '@/lib/location';
import { LOCATIONS } from '@/lib/darksky-locations';
import { getUpcomingEvents, type AstroEvent } from '@/lib/astro-events';
import type { SkyDay, SkyHour } from '@/lib/sky-data';
import type { PlanetInfo } from '@/lib/planets';
import { PRODUCTS, type Product } from '@/lib/products';
import { PlanetViz } from '@/components/sky/PlanetViz';
import {
  MeteorIcon,
  TelescopeIcon,
  CloudIcon,
  StarBurstIcon,
} from '@/components/icons/MarketIcons';

type Theme = 'light' | 'dark';
const THEME_KEY = 'stellar-sky-theme';
const DEFAULT_BADGE_KEY = 'stellar-sky-default-badge-dismissed';

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
  hours: SkyHour[];
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

function bestWindowFromHours(hours: SkyHour[]): { start: string; end: string } | null {
  if (!hours.length) return null;
  const evening = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr <= 4;
  });
  const pool = evening.length ? evening : hours;
  const sorted = [...pool].sort((a, b) => a.cloudCover - b.cloudCover);
  if (!sorted.length) return null;
  const top = sorted.slice(0, Math.min(3, sorted.length));
  top.sort((a, b) => a.time.localeCompare(b.time));
  return { start: top[0].time.slice(11, 16), end: top[top.length - 1].time.slice(11, 16) };
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

function scoreTagline(score: number): { text: string; color: string } {
  if (score >= 85) return { text: 'Perfect night — set up the scope', color: 'var(--success)' };
  if (score >= 65) return { text: 'Good observation window', color: 'var(--success)' };
  if (score >= 45) return { text: 'Fair — pick targets carefully', color: 'var(--stars)' };
  if (score >= 25) return { text: 'Tough night — maybe tomorrow', color: '#f97316' };
  return { text: 'Stay in. Read about telescopes.', color: '#ef4444' };
}

function scoreRingColor(score: number): string {
  if (score >= 65) return '#4ADE80';
  if (score >= 45) return '#FBBF24';
  if (score >= 25) return '#FB923C';
  return '#FB7185';
}

function planetTip(key: string, altitude: number, azimuthDir: string): string {
  const where = altitude > 50
    ? 'high overhead'
    : altitude > 20
      ? `look ${azimuthDir.toLowerCase()}`
      : `low to the ${azimuthDir.toLowerCase()} horizon`;
  switch (key) {
    case 'moon':
      return `Bright surface — ${where}. A 10mm eyepiece reveals craters along the terminator.`;
    case 'venus':
      return `Brightest planet — ${where}. Best in twilight; a 12mm eyepiece shows the phase.`;
    case 'mars':
      return `Reddish disc — ${where}. Wait for steady seeing; an 8mm eyepiece pulls out polar caps.`;
    case 'jupiter':
      return `Steady cream-white target — ${where}. A 10mm eyepiece shows cloud belts and 4 Galilean moons.`;
    case 'saturn':
      return `Rings need at least 50× — ${where}. A 12mm eyepiece on a 700mm scope is the sweet spot.`;
    case 'mercury':
      return `Small and quick — ${where}. Catch it just after sunset or before sunrise.`;
    default:
      return `Currently ${where}.`;
  }
}

function pickRecommendedProduct(planetsUp: PlanetInfo[], cloud: number): {
  product: Product;
  pitch: string;
} {
  const upKeys = new Set(planetsUp.filter((p) => p.altitude > 10).map((p) => p.key));
  const find = (id: string) => PRODUCTS.find((p) => p.id === id)!;

  if (cloud > 65) {
    return {
      product: find('scope-bresser-76-300'),
      pitch:
        'Skies are mostly closed tonight. Browse our beginner kits — perfect for the first clear evening.',
    };
  }
  if (upKeys.has('saturn')) {
    return {
      product: find('acc-eyepiece'),
      pitch:
        "Saturn's rings need at least 50×. A 12mm eyepiece on your scope hits the sweet spot.",
    };
  }
  if (upKeys.has('jupiter')) {
    return {
      product: find('acc-eyepiece'),
      pitch:
        'For Jupiter detail tonight, an 8mm eyepiece pulls cloud belts and the four Galilean moons.',
    };
  }
  if (upKeys.has('mars')) {
    return {
      product: find('scope-foreseen-80'),
      pitch:
        "Mars rewards steady seeing. The Foreseen 80mm refractor is sharp enough to show polar caps.",
    };
  }
  if (upKeys.has('moon')) {
    return {
      product: find('acc-phone'),
      pitch:
        "The Moon is up — perfect for afocal phone shots. Our adapter clips onto any eyepiece.",
    };
  }
  return {
    product: find('scope-celestron-70az'),
    pitch:
      "Wide-field viewing favored tonight. The Celestron 70AZ frames the Pleiades full-edge.",
  };
}

interface PlanetDetailModalProps {
  planet: PlanetInfo;
  onClose: () => void;
}

function PlanetDetailModal({ planet, onClose }: PlanetDetailModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const below = planet.altitude <= 0;
  const rise = planet.rise
    ? fmtTime(typeof planet.rise === 'string' ? planet.rise : planet.rise.toISOString())
    : null;
  const transit = planet.transit
    ? fmtTime(typeof planet.transit === 'string' ? planet.transit : planet.transit.toISOString())
    : null;
  const set = planet.set
    ? fmtTime(typeof planet.set === 'string' ? planet.set : planet.set.toISOString())
    : null;

  let bestWindow = '—';
  if (transit && rise && set) {
    const trH = parseInt(transit.slice(0, 2));
    const trM = parseInt(transit.slice(3, 5));
    const total = trH * 60 + trM;
    const start = total - 60;
    const end = total + 60;
    const fmt = (mins: number) => {
      const m = ((mins % 1440) + 1440) % 1440;
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    };
    bestWindow = `${fmt(start)}–${fmt(end)}`;
  }

  return (
    <div className="sky-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="sky-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="sky-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <div className="sky-modal-head">
          <div className="sky-modal-viz">
            <PlanetViz name={planet.key} />
          </div>
          <div className="sky-modal-title">
            <span className="sky-modal-name">{planet.key}</span>
            <span className="sky-modal-sub">
              {below ? 'Below horizon' : `Currently ${Math.round(planet.altitude)}° above ${planet.azimuthDir}`}
              {planet.constellation ? ` · in ${planet.constellation}` : ''}
            </span>
          </div>
        </div>
        <dl className="sky-modal-grid">
          <div>
            <dt>Altitude</dt>
            <dd>{below ? '—' : `${Math.round(planet.altitude)}°`}</dd>
          </div>
          <div>
            <dt>Magnitude</dt>
            <dd>{planet.magnitude.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Rises</dt>
            <dd>{rise ?? '—'}</dd>
          </div>
          <div>
            <dt>Transits</dt>
            <dd>{transit ?? '—'}</dd>
          </div>
          <div>
            <dt>Sets</dt>
            <dd>{set ?? '—'}</dd>
          </div>
          <div>
            <dt>Best viewed</dt>
            <dd>{bestWindow}</dd>
          </div>
        </dl>
        <p className="sky-modal-tip">
          {planetTip(planet.key, planet.altitude, planet.azimuthDir)}
        </p>
        <div className="sky-modal-actions">
          <Link href="/missions" className="sky-modal-cta primary">
            Start mission
          </Link>
          <Link href="/markets" className="sky-modal-cta">
            Bet on visibility
          </Link>
        </div>
      </div>
    </div>
  );
}

interface AnimatedScoreProps {
  score: number;
}

function AnimatedScore({ score }: AnimatedScoreProps) {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1000;
    let raf = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimated(Math.round(score * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const ringColor = scoreRingColor(score);
  const tagline = scoreTagline(score);

  return (
    <div className="sky-score-block">
      <div
        className="sky-score-ring2"
        style={{
          background: `conic-gradient(${ringColor} ${animated * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
        }}
      >
        <div className="sky-score-ring2-inner">
          <span className="sky-score-num2">{animated}</span>
          <span className="sky-score-sub2">/100</span>
        </div>
      </div>
      <span className="sky-score-tag" style={{ color: tagline.color }}>
        {tagline.text}
      </span>
    </div>
  );
}

export default function SkyPage() {
  const { location } = useLocation();
  const { lat, lon, city, source } = location;
  const isDefaultLocation = source === 'default';

  const [theme, setTheme] = useState<Theme>('light');
  const [forecast, setForecast] = useState<SkyDay[] | null>(null);
  const [planets, setPlanets] = useState<PlanetInfo[] | null>(null);
  const [moonSun, setMoonSun] = useState<MoonSunData | null>(null);
  const [score, setScore] = useState<SkyScore | null>(null);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [openPlanet, setOpenPlanet] = useState<PlanetInfo | null>(null);
  const [selectedNightIdx, setSelectedNightIdx] = useState<number | null>(null);
  const [defaultBadgeDismissed, setDefaultBadgeDismissed] = useState(false);
  const planSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'dark') setTheme('dark');
      const dismissed = localStorage.getItem(DEFAULT_BADGE_KEY);
      if (dismissed === '1') setDefaultBadgeDismissed(true);
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
  }, [lat, lon, retryKey]);

  function toggleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  }

  function dismissDefaultBadge() {
    setDefaultBadgeDismissed(true);
    try {
      localStorage.setItem(DEFAULT_BADGE_KEY, '1');
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
        hours: day.hours,
      };
    });
  }, [forecast, upcomingEvents]);

  const bestNightIdx = useMemo(() => {
    if (!nights.length) return -1;
    let best = -1;
    let lowest = Infinity;
    nights.forEach((n, i) => {
      if (n.cloudCover < lowest) {
        lowest = n.cloudCover;
        best = i;
      }
    });
    return best;
  }, [nights]);

  const recommended = useMemo(() => {
    if (!planets) return null;
    return pickRecommendedProduct(planets, tonightCloud);
  }, [planets, tonightCloud]);

  const selectedNight = selectedNightIdx !== null ? nights[selectedNightIdx] ?? null : null;
  const selectedWindow = useMemo(() => {
    if (!selectedNight) return null;
    return bestWindowFromHours(selectedNight.hours);
  }, [selectedNight]);

  function handleNightClick(idx: number, n: NightSummary) {
    if (n.tier === 'skip') return;
    setSelectedNightIdx(idx);
    requestAnimationFrame(() => {
      planSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

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
              {isDefaultLocation && !defaultBadgeDismissed && (
                <span className="sky-default-badge" role="status">
                  📍 Tbilisi (default) · Allow location for yours
                  <button
                    type="button"
                    className="sky-default-badge-close"
                    onClick={dismissDefaultBadge}
                    aria-label="Dismiss default location notice"
                  >
                    ×
                  </button>
                </span>
              )}
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
            {score ? (
              <AnimatedScore score={score.score} />
            ) : (
              <div className="sky-score-block">
                <div className="sky-score-ring2 sky-score-ring2-skel animate-pulse" aria-hidden />
                <span className="sky-score-tag-skel animate-pulse" aria-hidden />
              </div>
            )}
            <div className="sky-verdict-text">
              {score ? (
                <div className={`sky-verdict-head ${scoreColorClass(score.score)}`}>
                  {verdictHead}
                </div>
              ) : (
                <div className="sky-verdict-skel-head animate-pulse" aria-hidden />
              )}
              {verdictBody ? (
                <div className="sky-verdict-body">{verdictBody}</div>
              ) : (
                !score && (
                  <div className="sky-verdict-skel-body animate-pulse" aria-hidden />
                )
              )}
              {error && !loading && (
                <div className="sky-verdict-body" style={{ color: '#FB7185' }}>
                  Could not load — try again{' '}
                  <button
                    type="button"
                    onClick={() => setRetryKey((k) => k + 1)}
                    className="text-teal-400 hover:underline"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="sky-planets" role="list">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="sky-planet-card sky-planet-card-skel animate-pulse"
                  aria-hidden
                >
                  <div className="sky-planet-viz sky-planet-viz-skel" />
                  <div className="sky-planet-name-skel" />
                  <div className="sky-planet-meta-skel" />
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
                  <button
                    key={p.key}
                    type="button"
                    role="listitem"
                    className={`sky-planet-card ${below ? 'below' : ''}`}
                    onClick={() => setOpenPlanet(p)}
                    aria-label={`Open details for ${p.key}`}
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
                  </button>
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
                const isBest = !placeholder && i === bestNightIdx && n!.tier !== 'skip';
                const clickable = !placeholder && n!.tier !== 'skip';
                const isSelected = selectedNightIdx === i;

                return (
                  <button
                    key={placeholder ? `ph-${i}` : n!.date}
                    type="button"
                    className={`sky-night-tile ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${clickable ? 'clickable' : ''}`}
                    onClick={() => !placeholder && handleNightClick(i, n!)}
                    disabled={!clickable}
                    aria-label={
                      placeholder
                        ? 'Loading night'
                        : `${n!.label}: ${n!.tier === 'go' ? 'Go' : n!.tier === 'maybe' ? 'Maybe' : 'Skip'}, ${n!.cloudCover}% cloud`
                    }
                  >
                    {isBest && (
                      <span className="sky-night-bell" title="Best night this week" aria-label="Best night this week">
                        <BellIcon />
                      </span>
                    )}
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
                  </button>
                );
              },
            )}
          </div>
        </div>
      </section>

      {/* ── PLAN FOR [DAY] ───────────────────────────────────────────── */}
      {selectedNight && (
        <section className="sky-section" ref={planSectionRef}>
          <div className="sky-content">
            <div className="sky-section-head">
              <h2 className="sky-section-title">
                Plan for {selectedNight.label}
                <span className="sky-section-date">
                  {' · '}
                  {new Date(selectedNight.date + 'T12:00:00').toLocaleDateString([], {
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </h2>
              <button
                type="button"
                className="sky-plan-close"
                onClick={() => setSelectedNightIdx(null)}
                aria-label="Close plan"
              >
                Clear
              </button>
            </div>

            <div className="sky-plan-grid">
              <div className="sky-plan-card">
                <span className="sky-detail-label">Cloud</span>
                <span
                  className={`sky-detail-value ${selectedNight.cloudCover < 25 ? 'good' : selectedNight.cloudCover <= 60 ? 'fair' : 'poor'}`}
                >
                  {selectedNight.cloudCover}%
                </span>
                <span className="sky-detail-sub">
                  {selectedNight.tier === 'go' ? 'Open skies' : 'Gaps expected'}
                </span>
              </div>
              <div className="sky-plan-card">
                <span className="sky-detail-label">Best window</span>
                <span className="sky-detail-value">
                  {selectedWindow ? `${selectedWindow.start}–${selectedWindow.end}` : '—'}
                </span>
                <span className="sky-detail-sub">Lowest cloud cover</span>
              </div>
              <div className="sky-plan-card">
                <span className="sky-detail-label">Planets up</span>
                <span className="sky-detail-value sky-detail-value-sm">
                  {planets && planets.filter((p) => p.altitude > 10).length
                    ? planets
                        .filter((p) => p.altitude > 10 && p.key !== 'moon')
                        .slice(0, 3)
                        .map((p) => p.key.charAt(0).toUpperCase() + p.key.slice(1))
                        .join(', ') || 'Moon'
                    : 'None tonight'}
                </span>
                <span className="sky-detail-sub">From your location</span>
              </div>
            </div>

            <div className="sky-plan-actions">
              <Link href="/markets" className="sky-plan-link">
                Markets closing before this night →
              </Link>
              {selectedNight.event && (
                <span className="sky-plan-event">
                  <StarBurstIcon size={14} /> {selectedNight.event.name}
                </span>
              )}
            </div>
          </div>
        </section>
      )}

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

      {/* ── ASTROMAN RECOMMENDATION ──────────────────────────────────── */}
      {recommended && (
        <section className="sky-section">
          <div className="sky-content">
            <div className="sky-section-head">
              <h2 className="sky-section-title">Recommended for tonight</h2>
              <span className="sky-section-meta">From Astroman</span>
            </div>
            <div className="sky-reco-card">
              <div className="sky-reco-body">
                <span className="sky-reco-pitch">{recommended.pitch}</span>
                <span className="sky-reco-product">
                  <strong>{recommended.product.name.en}</strong>
                  <span className="sky-reco-price">
                    {recommended.product.priceGEL} GEL
                  </span>
                </span>
                <Link href="/marketplace" className="sky-reco-cta">
                  Buy at Astroman →
                </Link>
              </div>
              {recommended.product.image && (
                <div
                  className="sky-reco-thumb"
                  style={{ backgroundImage: `url(${recommended.product.image})` }}
                  aria-hidden
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── EVENT TIP (optional) ─────────────────────────────────────── */}
      {tip && (
        <section className="sky-section">
          <div className="sky-content">
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
          </div>
        </section>
      )}

      {/* ── BOTTOM CTA BAR ───────────────────────────────────────────── */}
      <section className="sky-section">
        <div className="sky-content">
          <div className="sky-bottom-ctas">
            <Link href="/missions" className="sky-bottom-cta">
              Start tonight&apos;s mission →
            </Link>
            <Link href="/markets" className="sky-bottom-cta">
              Browse markets closing tonight →
            </Link>
          </div>
        </div>
      </section>

      {openPlanet && (
        <PlanetDetailModal
          planet={openPlanet}
          onClose={() => setOpenPlanet(null)}
        />
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
