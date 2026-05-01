// src/app/sky/page.tsx
'use client';

import { useMemo } from 'react';
import { useSkyData } from '@/lib/use-sky-data';
import { useLocation } from '@/lib/location';
import { SkyHero } from '@/components/sky/SkyHero';
import { SkyCompass } from '@/components/sky/SkyCompass';
import { VisibleNow } from '@/components/sky/VisibleNow';
import { ObservationTimeline } from '@/components/sky/ObservationTimeline';
import { PlanetCard } from '@/components/sky/PlanetCard';
import { ForecastRow } from '@/components/sky/ForecastRow';
import { ConditionsDetail } from '@/components/sky/ConditionsDetail';
import { LocationFallbackBanner } from '@/components/sky/LocationFallbackBanner';
import { getOrbStyle } from '@/lib/planet-styles';
import './sky.css';

export default function SkyPage() {
  const { location } = useLocation();
  const initialCoords = useMemo(
    () => ({ lat: location.lat, lon: location.lon, city: location.city }),
    [location.lat, location.lon, location.city],
  );
  const sky = useSkyData(initialCoords);

  const featuredTarget = sky.score?.bestTargets[0];

  const darkWindowLabel = useMemo(() => {
    const dw = sky.timeline.darkWindow;
    if (!dw) return null;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    return `${fmt(dw.start)} → ${fmt(dw.end)}`;
  }, [sky.timeline.darkWindow]);

  if (sky.error) {
    return (
      <div className="sky-page-v2">
        <div className="sky-container">
          <div className="panel" style={{ textAlign: 'center', padding: 40, marginTop: 80 }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 12 }}>
              Could not load sky data
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>{sky.error}</p>
            <button
              onClick={sky.refresh}
              style={{
                padding: '8px 16px',
                background: 'rgba(56,240,255,0.1)',
                border: '1px solid rgba(56,240,255,0.3)',
                borderRadius: 8,
                color: 'var(--teal)',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sky-page-v2">
      <div className="sky-container">
        <LocationFallbackBanner />
        <SkyHero score={sky.score} location={sky.location} loading={sky.loading} />

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Where to look right now</h2>
            <span className="section-meta">
              Live · {sky.refreshedAt ? sky.refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'}
            </span>
          </div>
          <div className="observe-row">
            <SkyCompass
              planets={sky.planets}
              featuredTarget={featuredTarget}
              refreshedAt={sky.refreshedAt}
            />
            <VisibleNow planets={sky.planets} featuredTarget={featuredTarget} />
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Tonight&apos;s observation timeline</h2>
            <span className="section-meta dark-window-meta">
              <span>Dark window</span>
              <span className="times">{darkWindowLabel ?? '—'}</span>
            </span>
          </div>
          <ObservationTimeline data={sky.timeline} />
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Planets tonight</h2>
            <span className="section-meta">Calculated · astronomy-engine</span>
          </div>
          <div className="planets-grid">
            {sky.planets.map((p) => (
              <PlanetCard key={p.name} planet={p} orbStyle={getOrbStyle(p.name)} />
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Next 7 nights</h2>
            <span className="section-meta">Open-Meteo · hourly</span>
          </div>
          <ForecastRow forecast={sky.forecast} />
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">Tonight in detail</h2>
            <span className="section-meta">
              {sky.conditions ? `Best window ${sky.conditions.bestWindow}` : ''}
            </span>
          </div>
          <ConditionsDetail conditions={sky.conditions} />
        </section>
      </div>
    </div>
  );
}
