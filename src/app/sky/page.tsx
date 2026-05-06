// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
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

const FALLBACK_COORDS = { lat: 41.6941, lon: 44.8337 };
const REFRESH_MS = 60_000;
const TOUR_KEY = 'stellar.sky.tour.v1';

export default function SkyPage() {
  const { location } = useLocation();
  const tErrors = useTranslations('sky.errors');
  const tAr = useTranslations('sky.ar');

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
  const [tier, setTier] = useState<TierFilter>('all');
  const [arOpen, setArOpen] = useState(false);
  const [arStream, setArStream] = useState<MediaStream | null>(null);

  // Both motion AND camera permissions need a user-gesture chain on iOS.
  // Firing them from the same click handler keeps the chain valid; awaiting
  // one before the other works on iOS Safari as long as no async hop runs in
  // between. setArOpen(true) is called immediately so the overlay appears
  // even if the camera stream is still resolving.
  const handleArOpen = useCallback(async () => {
    if (compass.heading == null) {
      // Fire iOS motion-permission prompt; on Android this is a no-op. We
      // intentionally don't await the result — the camera permission below
      // needs to remain in the same gesture window.
      void compass.request();
    }
    setArOpen(true);
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        setArStream(stream);
      } catch {
        // Camera denied or unavailable — AR falls back to a starfield bg.
      }
    }
  }, [compass]);

  const handleArClose = useCallback(() => {
    if (arStream) arStream.getTracks().forEach((t) => t.stop());
    setArStream(null);
    setArOpen(false);
  }, [arStream]);

  // Stop camera on unmount in case the user navigates away while AR is open.
  useEffect(() => {
    return () => {
      if (arStream) arStream.getTracks().forEach((t) => t.stop());
    };
  }, [arStream]);

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
  }, []);

  const fallbackUsed =
    location.source === 'default' &&
    location.lat === FALLBACK_COORDS.lat &&
    location.lon === FALLBACK_COORDS.lon;

  const locationLabel = location.city || (fallbackUsed ? 'Tbilisi' : '—');

  return (
    <div className="sky-page-v2 sky-v3">
      <div className="sky-v3__container">
        <LocationFallbackBanner />
        <EventBanner />

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

        {finderLoading && !finder && (
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
                <SkyMap
                  objects={tableObjects}
                  activeId={activeId}
                  onSelect={handleSelect}
                  heading={compass.heading}
                  userAltitude={compass.altitude}
                  headingStatus={compass.status}
                  accuracy={compass.accuracy}
                  onCalibrate={compass.request}
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
                {compass.status !== 'unavailable' && (
                  <button
                    type="button"
                    className="sky-v3__ar-launch"
                    onClick={handleArOpen}
                  >
                    <Camera size={14} />
                    <span>{tAr('openAr')}</span>
                  </button>
                )}
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
          accuracy={compass.accuracy}
          headingStatus={compass.status}
          cameraStream={arStream}
          activeId={activeId}
          onSelectActive={handleSelect}
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
