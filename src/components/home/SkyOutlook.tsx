'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLocation } from '@/lib/location';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';

interface ForecastHour {
  time: string;
  cloudCover: number;
  visibility: number;
  temp: number;
  humidity: number;
  wind: number;
}
interface ForecastDay { date: string; hours: ForecastHour[]; }

type Quality = 'clear' | 'patchy' | 'overcast';
type Verdict = 'go' | 'maybe' | 'skip';

interface Night {
  date: string;
  dayLabel: string;
  quality: Quality;
  verdict: Verdict;
  label: string;
  targets: string;
  isToday: boolean;
}

interface MeteorEvent {
  date: string;
  label: string;
}

const METEOR_SHOWERS: MeteorEvent[] = [
  { date: '2026-04-22', label: 'Lyrids peak' },
  { date: '2026-05-05', label: 'Eta Aquariids peak' },
  { date: '2026-08-12', label: 'Perseids peak' },
];

function dayLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Tonight';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short' });
}

function avgNightClouds(hours: ForecastHour[]): number {
  const night = hours.filter((h) => {
    const hr = parseInt(h.time.slice(11, 13));
    return hr >= 20 || hr < 4;
  });
  const src = night.length ? night : hours;
  if (!src.length) return 100;
  return src.reduce((s, h) => s + h.cloudCover, 0) / src.length;
}

function qualityFor(clouds: number): { quality: Quality; verdict: Verdict; label: string } {
  if (clouds < 25) return { quality: 'clear', verdict: 'go', label: 'Clear' };
  if (clouds < 60) return { quality: 'patchy', verdict: 'maybe', label: 'Patchy' };
  return { quality: 'overcast', verdict: 'skip', label: 'Overcast' };
}

function targetsFor(dateStr: string, verdict: Verdict): string {
  const shower = METEOR_SHOWERS.find((e) => e.date === dateStr);
  if (shower) return shower.label;
  if (verdict === 'skip') return 'Stay in';
  if (verdict === 'maybe') return 'Bright planets';
  return 'Jupiter, Saturn';
}

function ClearSvg() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="home-sky-circle-icon">
      <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1" />
      <path d="M7 2v1.5M7 10.5V12M2 7h1.5M10.5 7H12" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function CloudSvg() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="home-sky-circle-icon">
      <path d="M5 11a3 3 0 01-.5-5.96A5 5 0 0114 7a3 3 0 01.5 5.96H5z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
    </svg>
  );
}

function CloudRainSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="home-sky-circle-icon">
      <path d="M5 9a3 3 0 01-.5-5.96A5 5 0 0114 5a3 3 0 01.5 5.96H5z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M6 12l-1 2.5M9 12l-1 2.5M12 12l-1 2.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export default function SkyOutlook() {
  const { location } = useLocation();
  const [nights, setNights] = useState<Night[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const lat = location.lat ?? DEFAULT_OBSERVER.lat;
    const lng = location.lon ?? DEFAULT_OBSERVER.lon;
    fetch(`/api/sky/forecast?lat=${lat}&lng=${lng}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;
        const today = new Date().toISOString().slice(0, 10);
        const out: Night[] = (data as ForecastDay[]).slice(0, 7).map((d, i) => {
          const clouds = avgNightClouds(d.hours);
          const q = qualityFor(clouds);
          const isToday = i === 0 || d.date === today;
          return {
            date: d.date,
            dayLabel: dayLabel(d.date, isToday),
            quality: q.quality,
            verdict: q.verdict,
            label: q.label,
            targets: targetsFor(d.date, q.verdict),
            isToday,
          };
        });
        setNights(out);
      })
      .catch(() => { if (!cancelled) setNights([]); });

    return () => { cancelled = true; };
  }, [location.lat, location.lon]);

  return (
    <section className="home-section home-section-border">
      <div className="home-col-head">
        <h2 className="home-col-title">7-night sky outlook</h2>
        <Link href="/sky" className="home-col-link">Full forecast</Link>
      </div>
      <div className="home-sky-strip">
        {!nights && Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="home-sky-card">
            <div className="home-skel" style={{ height: 10, width: 34 }} />
            <div className="home-skel" style={{ height: 38, width: 38, borderRadius: '50%' }} />
            <div className="home-skel" style={{ height: 10, width: 40 }} />
            <div className="home-skel" style={{ height: 10, width: 54 }} />
          </div>
        ))}
        {nights?.map((n) => (
          <div key={n.date} className={`home-sky-card ${n.isToday ? 'home-sky-card-today' : ''}`}>
            <span className="home-sky-day-label">{n.dayLabel}</span>
            <div className={`home-sky-circle ${n.quality}`}>
              {n.quality === 'clear' && <div className="home-sky-stars" />}
              {n.quality === 'clear' ? <ClearSvg /> : n.quality === 'patchy' ? <CloudSvg /> : <CloudRainSvg />}
            </div>
            <span className={`home-sky-label ${n.verdict}`}>{n.label}</span>
            <span className="home-sky-targets">{n.targets}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
