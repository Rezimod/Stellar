// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Compass, Crosshair, Telescope, Hand, Orbit } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { useDeviceHeading } from '@/lib/sky/use-device-heading';
import { useForecast } from '@/lib/sky/use-forecast';
import { CONSTELLATION_LINES, STAR_TO_CONSTELLATION, positionStars } from '@/lib/sky/stars';
import type { ConstellationStar } from '@/components/sky/finder/SkyMap';
import { azimuthToCompass, altitudeToFists } from '@/lib/sky/directions';
import { LocationFallbackBanner } from '@/components/sky/LocationFallbackBanner';
import EventBanner from '@/components/sky/EventBanner';
import { DirectionHero } from '@/components/sky/finder/DirectionHero';
import { SkyMap } from '@/components/sky/finder/SkyMap';
import { SkyHeaderStrip } from '@/components/sky/finder/SkyHeaderStrip';
import { ARFinder } from '@/components/sky/finder/ARFinder';
import {
  TargetBelowGrid,
  TargetFilters,
  TargetVisibleGrid,
  type TierFilter,
} from '@/components/sky/finder/TargetPicker';
import { SevenDayForecast } from '@/components/sky/forecast/SevenDayForecast';
import { PointIdentify } from '@/components/sky/PointIdentify';
import { SkyEvents2026 } from '@/components/sky/SkyEvents2026';
import type { FinderResponse, ObjectId, SkyObject } from '@/components/sky/finder/types';
import './sky.css';

const REFRESH_MS = 60_000;
const TOUR_KEY = 'stellar.sky.tour.v1';

export default function SkyPage() {
  const { location, locationReady, requestLocation, ensureLocation, gpsState, loading: locationLoading } = useLocation();
  const tErrors = useTranslations('sky.errors');

  // Opening the sky finder is a clear intent to use the observer's position —
  // prompt for GPS here rather than on site entry.
  useEffect(() => { ensureLocation(); }, [ensureLocation]);
  const tAr = useTranslations('sky.ar');
  const tSolar = useTranslations('sky.solarFromSky');

  const compass = useDeviceHeading(location.lat, location.lon);
  // Calibrate compass should also request browser location if we don't have it
  // yet. The browser will only show a single permission UI per origin so this
  // is safe to call any time the user wants to actually use the finder.
  const handleCalibrate = useCallback(() => {
    if (location.source !== 'gps' && gpsState !== 'resolved') {
      requestLocation();
    }
    compass.request();
  }, [compass, requestLocation, location.source, gpsState]);
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
  const [tier, setTier] = useState<TierFilter>('all');
  const [arOpen, setArOpen] = useState(false);
  const [arActiveId, setArActiveId] = useState<ObjectId | null>(null);

  // Fire the iOS motion prompt on tap so the AR view opens already tracking
  // the user's heading.
  const handleArOpen = useCallback(() => {
    if (compass.heading == null) void compass.request();
    setArActiveId(null);
    setArOpen(true);
  }, [compass]);

  const handleArClose = useCallback(() => {
    setArOpen(false);
    setArActiveId(null);
  }, []);

  const [skyTime, setSkyTime] = useState(() => new Date());

  // Star positions are driven exclusively by the finder's `generatedAt`, so
  // bright-stars and the planet/DSO layer always reflect the same instant.
  // Earlier we ticked an independent 30s clock here — that drifted the two
  // layers up to half a minute apart between fetches (≈0.125° rotation) and
  // produced subtle "stars marching past static planets" wobble.
  useEffect(() => {
    if (finder?.generatedAt) setSkyTime(new Date(finder.generatedAt));
  }, [finder?.generatedAt]);

  // Start compass as soon as observer coords are confirmed for this session.
  useEffect(() => {
    if (!locationReady) return;
    if (compass.status === 'idle') void compass.request();
  }, [locationReady, compass]);

  const fetchFinder = useCallback(async () => {
    if (!locationReady) return;
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
  }, [location.lat, location.lon, locationReady, tErrors]);

  useEffect(() => {
    if (!locationReady) return;
    setFinderLoading(true);
    fetchFinder();
  }, [fetchFinder, locationReady]);

  // Re-fetch every minute so live state stays current — but skip the
  // refresh while the tab is hidden (no-one is looking) and resume on
  // visibility change so we never go more than ~one minute stale once
  // the user comes back. Also refetch on window focus so returning from a
  // background tab gives the user a fresh sky immediately.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const tick = () => {
      if (document.visibilityState === 'visible') {
        setSkyTime(new Date());
        fetchFinder();
      }
    };
    const id = window.setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        setSkyTime(new Date());
        fetchFinder();
      }
    };
    const onFocus = () => {
      setSkyTime(new Date());
      fetchFinder();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
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

  // The brightest, easiest non-Moon, non-Sun target above the horizon — the
  // single thing tonight a beginner should walk outside and look at first.
  const primeTarget = useMemo<SkyObject | null>(() => {
    if (!finder) return null;
    const candidates = finder.objects.filter(
      (o) => o.visible && o.id !== 'moon' && o.id !== 'sun' && o.altitude >= 10,
    );
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => a.magnitude - b.magnitude)[0];
  }, [finder]);

  // Constellation stars projected once per finder refresh — the angular
  // drift across a few minutes is below dome resolution, so this is fine.
  // Any star id already present in the finder API response is dropped so
  // the same body doesn't render twice (e.g. Sirius and Arcturus, which
  // live in both the catalog and the bright-star list).
  const constellationStars = useMemo<ConstellationStar[]>(() => {
    if (!finder) return [];
    const finderIds = new Set(finder.objects.map((o) => o.id));
    return positionStars(location.lat, location.lon, skyTime)
      .filter((s) => !finderIds.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        altitude: s.altitude,
        azimuth: s.azimuth,
        mag: s.mag,
        constellation: STAR_TO_CONSTELLATION[s.id],
      }));
  }, [finder, location.lat, location.lon, skyTime]);

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
  }, []);

  const handleArSelect = useCallback((id: ObjectId | null) => {
    setArActiveId(id);
    if (id) setActiveId(id);
  }, []);

  const fallbackUsed =
    location.source === 'default' &&
    location.lat === DEFAULT_OBSERVER.lat &&
    location.lon === DEFAULT_OBSERVER.lon;

  const locationLabel = location.city || (fallbackUsed ? 'Tbilisi' : '—');

  return (
    <div className="sky-page-v2 sky-v3">
      <div className="sky-v3__container">
        <LocationFallbackBanner />
        <EventBanner />

        {fallbackUsed && finder && (
          <div className="sky-v3__fallback">
            <span>{tErrors('locationFallback')}</span>
            <button type="button" onClick={() => requestLocation({ fresh: true })}>{tErrors('useMyLocation')}</button>
          </div>
        )}

        {finderError && (
          <div className="sky-v3__error">
            <span>{finderError}</span>
            <button type="button" onClick={fetchFinder}>{tErrors('retry')}</button>
          </div>
        )}

        {showTour && <FinderTour onDismiss={dismissTour} />}

        {/* === Prime target + difficulty filters (centered above the split) === */}
        {finder && !finderError && (
          <TargetFilters
            objects={finder.objects}
            tier={tier}
            onTierChange={setTier}
            primeTarget={primeTarget}
            primeActive={activeId === primeTarget?.id}
            onPrimeSelect={() => primeTarget && setActiveId(primeTarget.id)}
          />
        )}

        {(locationLoading || !locationReady || (finderLoading && !finder)) && (
          <SkyLoadingSkeleton />
        )}

        {/* === Split: dome chart on the left, visible targets on the right === */}
        {finder && !finderError && (
          <>
            <section className="sky-v3__split sky-v3__split--finder">
              <div className="sky-v3__map-wrap">
                <SkyHeaderStrip
                  locationLabel={locationLabel}
                  nowISO={finder.generatedAt}
                  visibleCount={tableObjects.filter((o) => o.visible && o.id !== 'sun').length}
                  activeName={activeObject?.name ?? null}
                />
                <div className="sky-v3__map-stage">
                  <SkyMap
                    objects={tableObjects}
                    activeId={activeId}
                    onSelect={handleSelect}
                    heading={compass.heading}
                    userAltitude={compass.altitude}
                    headingStatus={compass.status}
                    accuracy={compass.accuracy}
                    onCalibrate={handleCalibrate}
                    calibrationOffset={compass.offset}
                    onNudge={compass.nudge}
                    onProximityChange={compass.setProximityDeg}
                    constellationStars={constellationStars}
                    constellationLines={CONSTELLATION_LINES}
                    hopAnchor={hopAnchor ? {
                      id: hopAnchor.id,
                      name: hopAnchor.name,
                      azimuth: hopAnchor.azimuth,
                      altitude: hopAnchor.altitude,
                    } : null}
                  />
                  <div className="sky-v3__map-tools">
                    <Link
                      href="/solar-system"
                      className="sky-v3__solar-launch"
                      aria-label={tSolar('title')}
                      title={tSolar('title')}
                    >
                      <Orbit size={14} aria-hidden="true" />
                      <span className="sky-v3__solar-launch-label">{tSolar('short')}</span>
                    </Link>
                  {compass.status !== 'unavailable' && (
                    <button
                      type="button"
                      className="sky-v3__ar-launch"
                      onClick={handleArOpen}
                      aria-label={tAr('openAr')}
                      title={tAr('openAr')}
                    >
                      <Telescope size={14} aria-hidden="true" />
                      <span className="sky-v3__ar-launch-label">AR</span>
                    </button>
                  )}
                  </div>
                </div>
              </div>
              <TargetVisibleGrid
                objects={finder.objects}
                tier={tier}
                activeId={activeId}
                onSelect={handleSelect}
              />
            </section>

            <TargetBelowGrid
              objects={finder.objects}
              tier={tier}
              activeId={activeId}
              onSelect={handleSelect}
            />

            {activeObject && (
              <section className="sky-v3__active">
                <DirectionHero object={activeObject} />
              </section>
            )}
          </>
        )}

        {/* === Reverse compass: identify whatever the phone is aimed at === */}
        {finder && !finderError && (
          <PointIdentify
            objects={finder.objects}
            observerLat={location.lat}
            observerLon={location.lon}
            compass={compass}
          />
        )}

        {/* === Year-in-the-sky 2026 events rail === */}
        <SkyEvents2026 />

        {/* === 7-day sky forecast === */}
        <SevenDayForecast
          days={forecast.days}
          loading={forecast.loading}
          locationLabel={locationLabel}
        />
      </div>

      {arOpen && finder && (
        <ARFinder
          objects={finder.objects}
          observerLat={location.lat}
          observerLon={location.lon}
          heading={compass.heading}
          altitude={compass.altitude}
          roll={compass.roll}
          accuracy={compass.accuracy}
          headingStatus={compass.status}
          activeId={arActiveId}
          onSelectActive={handleArSelect}
          onClose={handleArClose}
        />
      )}
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
      <header className="sky-v3__tour-head">
        <span className="sky-v3__tour-eyebrow">3 STEPS</span>
        <h3 className="sky-v3__tour-title">{t('aria')}</h3>
      </header>
      <ol className="sky-v3__tour-steps">
        <li className="sky-v3__tour-step">
          <span className="sky-v3__tour-num"><Compass size={14} aria-hidden /></span>
          <span className="sky-v3__tour-text"><b>1.</b> {t('step1')}</span>
        </li>
        <li className="sky-v3__tour-step">
          <span className="sky-v3__tour-num"><Crosshair size={14} aria-hidden /></span>
          <span className="sky-v3__tour-text"><b>2.</b> {t('step2')}</span>
        </li>
        <li className="sky-v3__tour-step">
          <span className="sky-v3__tour-num"><Hand size={14} aria-hidden /></span>
          <span className="sky-v3__tour-text"><b>3.</b> {t('step3')}</span>
        </li>
      </ol>
      <button type="button" className="sky-v3__tour-cta" onClick={onDismiss} aria-label={t('dismiss')}>
        {t('dismiss')}
      </button>
    </aside>
  );
}

