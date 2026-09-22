'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import LiveView, { type MountSample } from './LiveView';
import {
  DEFAULT_SEEING_ARCSEC,
  effectiveFocalLength,
  fieldOfView,
  resolvingPowerArcsec,
  TRAIN_BY_ID,
  ROIS,
} from '@/lib/observatory/optics';
import { SIM_TARGET_BY_ID, targetAltAz } from '@/lib/observatory/sim-targets';
import { skyObjectsNear } from '@/lib/observatory/sky-field';
import { localSiderealHours } from '@/lib/observatory/site-time';
import { getSunAltitude } from '@/lib/dark-window';
import type { NodeWithReadiness } from '@/lib/observatory/types';

/** Refresh the sky state every 5 seconds — planets don't sprint. */
const TICK_MS = 5_000;

/** The target shown to anyone who lands on this page without a session. */
const SHOWCASE_ID = 'saturn';

type Props = {
  /** The first active node in the registry. Null when the registry is empty. */
  node: NodeWithReadiness | null;
  /** Sun altitude in degrees computed server-side for the initial render. */
  sunAltInit: number;
};

export default function LiveBroadcast({ node, sunAltInit }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [sunAlt, setSunAlt] = useState(sunAltInit);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow(d);
      if (node) setSunAlt(getSunAltitude(node.lat, node.lon, d));
    };
    tick();
    const id = setInterval(tick, TICK_MS);
    return () => clearInterval(id);
  }, [node]);

  const target = SIM_TARGET_BY_ID.get(SHOWCASE_ID) ?? SIM_TARGET_BY_ID.get('jupiter')!;
  const instrument = node?.instrument;
  const native = TRAIN_BY_ID.get('native')!;

  const fov = instrument ? fieldOfView(instrument, native, ROIS[0]) : null;
  const diffractionArcsec = instrument ? resolvingPowerArcsec(instrument) : 0.77;
  const plateScaleArcsecPx = instrument
    ? (206265 * (instrument.pixelSizeUm / 1000)) /
      effectiveFocalLength(instrument, native)
    : 0.4;

  const pointing = useMemo(() => {
    if (!now || !node) return { altitude: 30, azimuth: 180 };
    return targetAltAz(target, node, now);
  }, [target, node, now]);

  const lst = useMemo(
    () => (now && node ? localSiderealHours(node.lon, now) : 0),
    [node, now],
  );

  const objects = useMemo(() => {
    if (!now || !node) return [];
    return skyObjectsNear(node, now, pointing, 1.2, lst);
  }, [node, now, pointing, lst]);

  const sample = useCallback(
    (): MountSample => ({ pointing, azRate: 0, altRate: 0 }),
    [pointing],
  );

  // Avoid SSR / hydration mismatch — canvas only renders client-side.
  if (!now) return null;

  const isDark = sunAlt < -12;
  const state = node?.readiness.state;
  const statusLabel =
    !isDark ? 'DAYTIME'
    : state === 'online' ? 'LIVE'
    : state === 'busy' ? 'IN SESSION'
    : state === 'weather' ? 'WEATHER HOLD'
    : 'OFFLINE';
  const isLive = statusLabel === 'LIVE' || statusLabel === 'IN SESSION';

  const altText =
    pointing.altitude > 0
      ? `${pointing.altitude.toFixed(0)}°`
      : 'Below horizon';

  return (
    <div style={{ width: '100%', maxWidth: 1100, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '0.75rem',
        }}
      >
        <span
          className="font-display"
          style={{
            fontFamily: 'var(--font-orbitron, var(--font-geist))',
            fontSize: 13,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          NODE 01
        </span>
        <span style={{ color: 'var(--border)', fontSize: 14 }}>·</span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {node?.site ?? 'Tbilisi, Georgia'}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isLive && <span className="obs-led obs-led--active" />}
          {!isLive && <span className="obs-led" />}
          <span
            className="obs-label"
            style={{ color: isLive ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {statusLabel}
          </span>
        </span>
      </div>

      {/* Telescope frame */}
      <div
        className="obs-frame"
        style={{ width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 2 }}
      >
        {isDark && fov ? (
          <LiveView
            sample={sample}
            objects={objects}
            latDeg={node?.lat ?? 41.7151}
            lstHours={lst}
            sunAltitudeDeg={sunAlt}
            exposureSec={target.brightness === 'bright' ? 0.05 : 10}
            fovArcmin={fov.widthArcmin}
            seeingArcsec={DEFAULT_SEEING_ARCSEC}
            diffractionArcsec={diffractionArcsec}
            plateScaleArcsecPx={plateScaleArcsecPx}
            bortle={node?.bortle ?? 8}
            subs={1}
            gain={300}
            splitAt={null}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#05070c',
              gap: '0.75rem',
            }}
          >
            <span style={{ fontSize: 40, opacity: 0.3 }}>🌙</span>
            <p
              className="obs-label"
              style={{ textAlign: 'center', lineHeight: 1.8 }}
            >
              Node 01 opens at dusk
              <br />
              <span style={{ opacity: 0.6 }}>
                {isDark ? 'Telescope offline' : `Sun at ${sunAlt.toFixed(1)}°`}
              </span>
            </p>
          </div>
        )}

        {/* Corner overlay: target label */}
        <span
          className="obs-frame__corner-note obs-frame__corner-note--left"
          style={{ zIndex: 2, color: isLive ? 'var(--accent)' : undefined }}
        >
          {target.name}
        </span>
        <span
          className="obs-frame__corner-note obs-frame__corner-note--right"
          style={{ zIndex: 2 }}
        >
          {altText}
        </span>
      </div>

      {/* Info row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginTop: '1rem',
          gap: '1.5rem',
          flexWrap: 'wrap',
        }}
      >
        <dl
          style={{
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap',
            margin: 0,
          }}
        >
          {[
            { label: 'Instrument', value: node?.instrument.optics ?? 'Celestron NexStar 6SE' },
            { label: 'Aperture', value: `${node?.instrument.apertureMm ?? 150} mm` },
            { label: 'Sky quality', value: `Bortle ${node?.bortle ?? 8}` },
          ].map(({ label, value }) => (
            <div key={label}>
              <dt className="obs-label" style={{ marginBottom: 4 }}>
                {label}
              </dt>
              <dd
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <Link
          href={`/observatory/${node?.id ?? 'tbilisi-01'}`}
          className="obs-action obs-action--primary"
          style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Book your session →
        </Link>
      </div>

      {/* Expect note */}
      {isDark && (
        <p
          style={{
            marginTop: '0.75rem',
            fontSize: 13,
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            maxWidth: 600,
          }}
        >
          {target.expect}
        </p>
      )}
    </div>
  );
}
