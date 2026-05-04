// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import { useDeviceHeading } from '@/lib/sky/use-device-heading';
import { useForecast } from '@/lib/sky/use-forecast';
import { CONSTELLATION_LINES, STAR_TO_CONSTELLATION, positionStars } from '@/lib/sky/stars';
import type { ConstellationStar } from '@/components/sky/finder/SkyMap';
import { azimuthToCompass, altitudeToFists } from '@/lib/sky/directions';
import { LocationFallbackBanner } from '@/components/sky/LocationFallbackBanner';
import { DirectionHero } from '@/components/sky/finder/DirectionHero';
import { SkyMap } from '@/components/sky/finder/SkyMap';
import { SkyStateStrip } from '@/components/sky/finder/SkyStateStrip';
import { TargetPicker } from '@/components/sky/finder/TargetPicker';
import { SevenDayForecast } from '@/components/sky/forecast/SevenDayForecast';
import type { FinderResponse, ObjectId, SkyObject } from '@/components/sky/finder/types';
import './sky.css';

const FALLBACK_COORDS = { lat: 41.6941, lon: 44.8337 };
const REFRESH_MS = 60_000;
const TOUR_KEY = 'stellar.sky.tour.v1';

export default function SkyPage() {
  const { location } = useLocation();
  const tErrors = useTranslations('sky.errors');

  const compass = useDeviceHeading();
  const forecast = useForecast(location.lat, location.lon);

  const [showTour, setShowTour] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (!window.localStorage.getItem(TOUR_KEY)) setShowTour(true);
    } catch { /* private mode — just don't show */ }
  }, []);
  const dismissTour = useCallback(() => {
    setShowTour(false);
    try { window.localStorage.setItem(TOUR_KEY, '1'); } catch { /* ignore */ }
  }, []);

  const [finder, setFinder] = useState<FinderResponse | null>(null);
  const [finderLoading, setFinderLoading] = useState(true);
  const [finderError, setFinderError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<ObjectId | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  const fetchFinder = useCallback(async () => {
    setFinderError(null);
    try {
      const res = await fetch(`/api/sky/finder?lat=${location.lat}&lon=${location.lon}`);
      if (!res.ok) throw new Error('fetch failed');
      const data: FinderResponse = await res.json();
      setFinder(data);
      setActiveId((prev) => {
        if (prev && data.objects.some((o) => o.id === prev)) return prev;
        const visible = data.objects
          .filter((o) => o.visible && o.id !== 'sun')
          .sort((a, b) => a.magnitude - b.magnitude);
        return visible[0]?.id ?? null;
      });
    } catch {
      setFinderError(tErrors('fetchFailed'));
    } finally {
      setFinderLoading(false);
    }
  }, [location.lat, location.lon, tErrors]);

  useEffect(() => {
    fetchFinder();
  }, [fetchFinder]);

  // Re-fetch every minute so live state stays current — but skip the
  // refresh while the tab is hidden (no-one is looking) and resume on
  // visibility change so we never go more than ~one minute stale once
  // the user comes back.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const tick = () => {
      if (document.visibilityState === 'visible') fetchFinder();
    };
    const id = window.setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') fetchFinder();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchFinder]);

  // Bodies for the dome chart + target picker — hide Sun at night.
  const tableObjects = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    const sun = finder.objects.find((o) => o.id === 'sun');
    const sunVisible = !!sun?.visible;
    return finder.objects.filter((o) => (o.id === 'sun' ? sunVisible : true));
  }, [finder]);

  const activeObject = useMemo(() => {
    if (!finder || !activeId) return null;
    return finder.objects.find((o) => o.id === activeId) ?? null;
  }, [finder, activeId]);

  // Constellation stars projected once per finder refresh — the angular
  // drift across a few minutes is below dome resolution, so this is fine.
  const constellationStars = useMemo<ConstellationStar[]>(() => {
    if (!finder) return [];
    const t = new Date(finder.generatedAt);
    return positionStars(location.lat, location.lon, t).map((s) => ({
      id: s.id,
      name: s.name,
      altitude: s.altitude,
      azimuth: s.azimuth,
      mag: s.mag,
      constellation: STAR_TO_CONSTELLATION[s.id],
    }));
  }, [finder, location.lat, location.lon]);

  // Hop anchor: prefer a catalog match (e.g. when the anchor is itself a
  // tracked target), otherwise fall back to the bright-star catalog so M31
  // can lean on Mirach even though Mirach isn't in the finder catalog.
  const hopAnchor = useMemo<SkyObject | null>(() => {
    if (!finder || !activeObject?.hopFromId) return null;
    const id = activeObject.hopFromId;
    const catalogHit = finder.objects.find((o) => o.id === id);
    if (catalogHit) return catalogHit;
    const star = constellationStars.find((s) => s.id === id);
    if (!star) return null;
    return {
      id: star.id,
      name: star.name,
      altitude: star.altitude,
      azimuth: star.azimuth,
      magnitude: star.mag,
      visible: star.altitude > 0,
      nakedEye: star.mag <= 6,
      compassDirection: azimuthToCompass(star.azimuth),
      fistsAboveHorizon: altitudeToFists(star.altitude),
      riseTime: null,
      setTime: null,
      phase: null,
      type: 'star',
      difficulty: 'easy',
      instrument: 'naked',
      constellation: star.constellation ?? '',
    };
  }, [finder, activeObject, constellationStars]);

  const handleSelect = useCallback((id: ObjectId) => {
    setActiveId(id);
    if (autoRotate) setAutoRotate(false);
  }, [autoRotate]);

  const fallbackUsed =
    location.source === 'default' &&
    location.lat === FALLBACK_COORDS.lat &&
    location.lon === FALLBACK_COORDS.lon;

  const locationLabel = location.city || (fallbackUsed ? 'Tbilisi' : '—');

  return (
    <div className="sky-page-v2 sky-v3">
      <div className="sky-v3__container">
        <LocationFallbackBanner />

        {/* === Live status strip === */}
        <SkyStateStrip
          finder={finder}
          locationLabel={locationLabel}
          fallbackLocation={fallbackUsed}
          lat={location.lat}
          lon={location.lon}
        />

        {fallbackUsed && finder && (
          <div className="sky-v3__fallback">
            <span>{tErrors('locationFallback')}</span>
            <button type="button" onClick={fetchFinder}>{tErrors('useMyLocation')}</button>
          </div>
        )}

        {finderError && (
          <div className="sky-v3__error">
            <span>{finderError}</span>
            <button type="button" onClick={fetchFinder}>{tErrors('retry')}</button>
          </div>
        )}

        {showTour && <FinderTour onDismiss={dismissTour} />}

        {/* === Target picker === */}
        {finder && !finderError && (
          <TargetPicker
            objects={finder.objects}
            activeId={activeId}
            onSelect={handleSelect}
            autoRotate={autoRotate}
            onToggleAuto={() => setAutoRotate((v) => !v)}
          />
        )}

        {finderLoading && !finder && (
          <SkyLoadingSkeleton />
        )}

        {/* === Dome chart === */}
        {finder && !finderError && (
          <>
            <section className="sky-v3__dome-only">
              <SkyMap
                objects={tableObjects}
                activeId={activeId}
                onSelect={handleSelect}
                heading={compass.heading}
                userAltitude={compass.altitude}
                headingStatus={compass.status}
                onCalibrate={compass.request}
                calibrationOffset={compass.offset}
                onNudge={compass.nudge}
                constellationStars={constellationStars}
                constellationLines={CONSTELLATION_LINES}
                hopAnchor={hopAnchor ? {
                  id: hopAnchor.id,
                  name: hopAnchor.name,
                  azimuth: hopAnchor.azimuth,
                  altitude: hopAnchor.altitude,
                } : null}
              />
            </section>

            {activeObject && (
              <section className="sky-v3__active">
                <DirectionHero object={activeObject} />
              </section>
            )}
          </>
        )}

        {/* === 7-day sky forecast === */}
        <SevenDayForecast
          days={forecast.days}
          loading={forecast.loading}
          locationLabel={locationLabel}
        />
      </div>
    </div>
  );
}

function SkyLoadingSkeleton() {
  return (
    <div className="sky-v3__skeleton" aria-hidden="true">
      <div className="sky-v3__skel-card sky-v3__skel-card--lg" />
      <div className="sky-v3__skel-card" />
    </div>
  );
}

function FinderTour({ onDismiss }: { onDismiss: () => void }) {
  const t = useTranslations('sky.tour');
  return (
    <aside className="sky-v3__tour" role="note" aria-label={t('aria')}>
      <ol className="sky-v3__tour-steps">
        <li>
          <span className="sky-v3__tour-num">1</span>
          <span className="sky-v3__tour-text">{t('step1')}</span>
        </li>
        <li>
          <span className="sky-v3__tour-num">2</span>
          <span className="sky-v3__tour-text">{t('step2')}</span>
        </li>
        <li>
          <span className="sky-v3__tour-num">3</span>
          <span className="sky-v3__tour-text">{t('step3')}</span>
        </li>
      </ol>
      <button type="button" className="sky-v3__tour-dismiss" onClick={onDismiss} aria-label={t('dismiss')}>
        {t('dismiss')}
      </button>
    </aside>
  );
}
