'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocation } from '@/lib/location';

type PlanetStatus = 'up' | 'setting' | 'down';

interface PlanetApiRow {
  key: string;
  altitude: number;
  azimuth: number;
  azimuthDir: string;
  rise: string | null;
  transit: string | null;
  set: string | null;
  magnitude: number;
  visible: boolean;
}

interface PlanetRow {
  key: string;
  status: PlanetStatus;
  data: string;
}

interface ForecastHour {
  time: string;
  cloudCover: number;
  visibility: number;
  temp: number;
  humidity: number;
  wind: number;
}

interface ForecastDay { date: string; hours: ForecastHour[]; }

interface Conditions {
  clouds: number;
  seeing: 'Good' | 'Fair' | 'Poor';
  humidity: number;
  verdict: string;
  verdictHead: string;
}

const NAMES: Record<string, string> = {
  moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
};

function hm(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function deriveStatus(p: PlanetApiRow): PlanetStatus {
  if (p.altitude <= 0) return 'down';
  const setTs = p.set ? new Date(p.set).getTime() : null;
  if (setTs !== null) {
    const minsToSet = (setTs - Date.now()) / 60000;
    if (minsToSet > 0 && minsToSet < 120) return 'setting';
  }
  if (p.altitude < 15) return 'setting';
  return 'up';
}

function planetDataText(p: PlanetApiRow, status: PlanetStatus): string {
  if (status === 'down') return 'below horizon';
  if (status === 'setting' && p.set) return `sets ${hm(p.set)}`;
  const mag = p.magnitude.toFixed(1).replace(/-0\.0$/, '0.0');
  return `alt ${Math.round(p.altitude)} · mag ${mag}`;
}

function pickConditions(forecast: ForecastDay[]): Conditions | null {
  if (!forecast.length) return null;
  const now = new Date();
  const allHours = forecast.flatMap((d) => d.hours);
  let hour = allHours.find((h) => {
    const t = new Date(h.time).getTime();
    return t >= now.getTime() - 30 * 60_000 && t <= now.getTime() + 30 * 60_000;
  }) ?? allHours[0];
  if (!hour) return null;

  const clouds = Math.round(hour.cloudCover);
  const humidity = Math.round(hour.humidity);
  const visKm = hour.visibility / 1000;

  let seeing: Conditions['seeing'] = 'Poor';
  if (clouds < 25 && visKm > 20) seeing = 'Good';
  else if (clouds < 60 || visKm > 10) seeing = 'Fair';

  let head = 'Skip tonight.';
  let verdict = 'Heavy clouds. Plan for another night.';
  if (clouds < 25 && seeing === 'Good') {
    head = 'Excellent night.';
    verdict = 'Low clouds, clean air. Long observing session ahead.';
  } else if (clouds < 40) {
    head = 'Good night.';
    verdict = 'Patchy cover, but targets should stay visible.';
  } else if (clouds < 70) {
    head = 'Mixed conditions.';
    verdict = 'Clouds will come and go. Pick your windows.';
  }

  return { clouds, humidity, seeing, verdictHead: head, verdict };
}

export default function HeroSection() {
  const { location } = useLocation();
  const [planets, setPlanets] = useState<PlanetRow[] | null>(null);
  const [cond, setCond] = useState<Conditions | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const lat = location.lat ?? 41.6941;
    const lng = location.lon ?? 44.8337;

    Promise.all([
      fetch(`/api/sky/planets?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`).then((r) => r.json()),
    ])
      .then(([pl, fc]) => {
        if (cancelled) return;
        const rows: PlanetRow[] = (pl as PlanetApiRow[])
          .filter((p) => NAMES[p.key])
          .slice(0, 5)
          .map((p) => {
            const status = deriveStatus(p);
            return { key: p.key, status, data: planetDataText(p, status) };
          });
        setPlanets(rows);
        if (Array.isArray(fc)) setCond(pickConditions(fc as ForecastDay[]));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => { cancelled = true; };
  }, [location.lat, location.lon]);

  const city = (location.city || 'Tbilisi').toUpperCase();
  const tonightLabel = cond
    ? (cond.clouds < 25 ? 'Clear' : cond.clouds < 60 ? 'Patchy' : 'Cloudy')
    : '…';

  return (
    <section className="home-hero-wrap">
      <div className="home-hero-inner">
        <div className="home-hero-left">
          <span className="home-hero-badge">
            <span className="home-hero-badge-dot" />
            Live on Solana · Free to use
          </span>

          <h1 className="home-hero-headline">
            Astronomy, <em>on chain</em>
          </h1>

          <p className="home-hero-subtitle">
            The companion app for everyone with a sky above them and a camera in their pocket. Get tonight's forecast, photograph what you see, earn rewards you can redeem for real telescopes at Astroman.
          </p>

          <div className="home-hero-cta-row">
            <Link href="/missions" className="home-hero-cta-primary">Start observing</Link>
            <Link href="/sky" className="home-hero-cta-secondary">Tonight's sky</Link>
          </div>

          <div className="home-hero-trust">
            <span>Free to join</span>
            <span>·</span>
            <span>No wallet needed</span>
            <span>·</span>
            <span>Powered by Solana</span>
          </div>

          {cond && (
            <span className="home-hero-mobile-tonight">
              <span className="home-hero-badge-dot" />
              Tonight: {tonightLabel}
              {planets?.find((p) => p.status === 'up' && p.key === 'jupiter') ? ', Jupiter visible' : ''}
            </span>
          )}
        </div>

        <aside className="home-hero-sky-panel" aria-label="Tonight's sky">
          <div className="home-hero-sky-header">TONIGHT&apos;S SKY · {city}</div>

          <div className="home-hero-planet-list">
            {!planets && !failed && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="home-hero-skel" style={{ height: 18 }} />
            ))}
            {planets?.slice(0, 4).map((p) => (
              <div key={p.key} className="home-hero-planet-row">
                <span className={`home-hero-planet-dot ${p.status}`} />
                <span className="home-hero-planet-name">{NAMES[p.key] ?? p.key}</span>
                <span className="home-hero-planet-data">{p.data}</span>
              </div>
            ))}
          </div>

          <div className="home-hero-divider" />

          <div className="home-hero-cond-row">
            {cond ? (
              <>
                <div className="home-hero-cond-cell">
                  <span className="home-hero-cond-label">Clouds</span>
                  <span className={`home-hero-cond-value ${cond.clouds < 25 ? 'good' : cond.clouds > 60 ? 'warn' : ''}`}>
                    {cond.clouds}%
                  </span>
                </div>
                <div className="home-hero-cond-cell">
                  <span className="home-hero-cond-label">Seeing</span>
                  <span className={`home-hero-cond-value ${cond.seeing === 'Good' ? 'good' : cond.seeing === 'Poor' ? 'warn' : ''}`}>
                    {cond.seeing}
                  </span>
                </div>
                <div className="home-hero-cond-cell">
                  <span className="home-hero-cond-label">Humidity</span>
                  <span className={`home-hero-cond-value ${cond.humidity > 85 ? 'warn' : ''}`}>
                    {cond.humidity}%
                  </span>
                </div>
              </>
            ) : (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="home-hero-cond-cell">
                  <div className="home-hero-skel" style={{ height: 9, width: 40 }} />
                  <div className="home-hero-skel" style={{ height: 14, width: 50, marginTop: 4 }} />
                </div>
              ))
            )}
          </div>

          <div className="home-hero-divider" />

          <p className="home-hero-verdict">
            {cond ? (
              <><strong>{cond.verdictHead}</strong> {cond.verdict}</>
            ) : failed ? (
              'Sky data unavailable.'
            ) : (
              <span className="home-hero-skel" style={{ height: 14, width: '85%', display: 'block' }} />
            )}
          </p>
        </aside>
      </div>
    </section>
  );
}
