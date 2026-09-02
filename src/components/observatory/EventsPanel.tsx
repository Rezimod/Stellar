'use client';

import { useEffect, useState } from 'react';
import { galileanMoons, type GalileanMoon } from '@/lib/observatory/jupiter-moons';

type IssPass = { startsAt: string; peakAt: string; peakElevation: number; peakAzimuth: number };

/** A moon on the disc is the event; everything else is just where it sits tonight. */
const MOON_STATE: Record<GalileanMoon['state'], string> = {
  transit: 'ON DISC',
  occulted: 'BEHIND',
  clear: '',
};

export default function EventsPanel({
  lat,
  lon,
  now,
  timezone,
}: {
  lat: number;
  lon: number;
  now: number;
  timezone: string;
}) {
  const [pass, setPass] = useState<IssPass | null>(null);
  const [passState, setPassState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');

  useEffect(() => {
    let live = true;
    fetch(`/api/sky/iss?lat=${lat}&lon=${lon}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('iss'))))
      .then((data) => {
        if (!live) return;
        const next = data?.pass ?? data?.nextPass ?? null;
        setPass(next);
        setPassState(next ? 'ready' : 'none');
      })
      .catch(() => live && setPassState('error'));
    return () => {
      live = false;
    };
  }, [lat, lon]);

  // Recomputed with the console clock, so stepping to tonight moves the moons.
  const moons = galileanMoons(new Date(now));

  const clock = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso));

  return (
    <div className="obs-panel">
      <div className="obs-panel__bar">
        <span className="obs-panel__title">Events</span>
      </div>
      <div className="obs-panel__body">
        <h4 className="obs-label" style={{ marginBottom: '0.4rem' }}>ISS · next pass</h4>
        <dl>
          {passState === 'loading' && (
            <div className="obs-readout">
              <dt className="obs-label">Fetching elements</dt>
              <dd className="obs-readout__value">—</dd>
            </div>
          )}
          {passState === 'error' && (
            <div className="obs-readout obs-readout--alert">
              <dt className="obs-label">Element set</dt>
              <dd className="obs-readout__value">UNAVAILABLE</dd>
            </div>
          )}
          {passState === 'none' && (
            <div className="obs-readout">
              <dt className="obs-label">Next 24 h</dt>
              <dd className="obs-readout__value">NO PASS</dd>
            </div>
          )}
          {passState === 'ready' && pass && (
            <>
              <div className="obs-readout">
                <dt className="obs-label">Rises</dt>
                <dd className="obs-readout__value">{clock(pass.startsAt)}</dd>
              </div>
              <div className="obs-readout">
                <dt className="obs-label">Peak</dt>
                <dd className="obs-readout__value">
                  {clock(pass.peakAt)} · {Math.round(pass.peakElevation)}°
                </dd>
              </div>
              <div className="obs-readout">
                <dt className="obs-label">Bearing</dt>
                <dd className="obs-readout__value">{Math.round(pass.peakAzimuth)}°</dd>
              </div>
            </>
          )}
        </dl>

        <h4 className="obs-label" style={{ margin: '1rem 0 0.4rem' }}>
          Galilean moons · Jupiter radii
        </h4>
        <dl>
          {moons.map((moon) => (
            <div key={moon.id} className={`obs-readout${moon.state !== 'clear' ? ' obs-readout--alert' : ''}`}>
              <dt className="obs-label">{moon.name}</dt>
              <dd className="obs-readout__value">
                {moon.eastArcsec >= 0 ? 'E' : 'W'} {moon.separationRadii.toFixed(1)}
                {MOON_STATE[moon.state] && ` · ${MOON_STATE[moon.state]}`}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
