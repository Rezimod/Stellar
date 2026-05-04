// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSkyData } from '@/lib/use-sky-data';
import { useLocation } from '@/lib/location';
import { useDeviceHeading } from '@/lib/sky/use-device-heading';
import { CONSTELLATION_LINES, STAR_TO_CONSTELLATION, positionStars } from '@/lib/sky/stars';
import type { ConstellationStar } from '@/components/sky/finder/SkyMap';
import { azimuthToCompass, altitudeToFists } from '@/lib/sky/directions';
import { ObservationTimeline } from '@/components/sky/ObservationTimeline';
import { LocationFallbackBanner } from '@/components/sky/LocationFallbackBanner';
import { DirectionHero } from '@/components/sky/finder/DirectionHero';
import { SkyMap } from '@/components/sky/finder/SkyMap';
import { BodyTable } from '@/components/sky/finder/BodyTable';
import { ARFinder } from '@/components/sky/finder/ARFinder';
import { SkyStateStrip } from '@/components/sky/finder/SkyStateStrip';
import { TargetPicker } from '@/components/sky/finder/TargetPicker';
import { HintCards } from '@/components/sky/finder/HintCards';
import { HorizonStrip } from '@/components/sky/finder/HorizonStrip';
import type { FinderResponse, ObjectId, SkyObject } from '@/components/sky/finder/types';
import './sky.css';

const FALLBACK_COORDS = { lat: 41.6941, lon: 44.8337 };
const REFRESH_MS = 60_000;
const TOUR_KEY = 'stellar.sky.tour.v1';

export default function SkyPage() {
  const { location } = useLocation();
  const tPage = useTranslations('sky.page');
  const tHeader = useTranslations('sky.header');
  const tErrors = useTranslations('sky.errors');
  const tHorizon = useTranslations('sky.horizon');

  const initialCoords = useMemo(
    () => ({ lat: location.lat, lon: location.lon, city: location.city }),
    [location.lat, location.lon, location.city],
  );
  const sky = useSkyData(initialCoords);
  const compass = useDeviceHeading();

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
  const [arOpen, setArOpen] = useState(false);
  const [extendedOpen, setExtendedOpen] = useState(false);

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

  // Re-fetch every minute so live state stays current.
  useEffect(() => {
    const id = setInterval(fetchFinder, REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchFinder]);

  // Bodies for the dome chart and table — exclude Sun at night, include
  // otherwise (handled by sun.visible flag from the API).
  const tableObjects = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    const sun = finder.objects.find((o) => o.id === 'sun');
    const sunVisible = !!sun?.visible;
    return finder.objects.filter((o) => (o.id === 'sun' ? sunVisible : true));
  }, [finder]);

  // AR gets every body that's currently above the horizon, including Sun.
  const arBodies = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    return finder.objects.filter((o) => o.visible);
  }, [finder]);

  const visibleSorted = useMemo<SkyObject[]>(() => {
    return tableObjects
      .filter((o) => o.visible)
      .sort((a, b) => b.altitude - a.altitude);
  }, [tableObjects]);

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

  const verdict = useMemo(() => {
    if (!finder) return null;
    const visibleCount = visibleSorted.length;
    if (visibleCount === 0) {
      const next = finder.objects
        .filter((o) => !o.visible && o.riseTime)
        .sort((a, b) => (a.riseTime ?? '').localeCompare(b.riseTime ?? ''))[0];
      if (next?.riseTime) {
        const t = new Date(next.riseTime);
        const hh = String(t.getHours()).padStart(2, '0');
        const mm = String(t.getMinutes()).padStart(2, '0');
        return tHeader('nextRise', { object: next.name, time: `${hh}:${mm}` });
      }
      return tHeader('nothingUp');
    }
    const highest = visibleSorted[0];
    const brightest = [...visibleSorted].sort((a, b) => a.magnitude - b.magnitude)[0];
    if (highest.id === brightest.id) {
      return tHeader('oneStandout', {
        count: visibleCount,
        object: highest.name,
        alt: Math.round(highest.altitude),
        compass: highest.compassDirection,
      });
    }
    return tHeader('twoStandouts', {
      count: visibleCount,
      bright: brightest.name,
      high: highest.name,
      alt: Math.round(highest.altitude),
    });
  }, [finder, visibleSorted, tHeader]);

  const fallbackUsed =
    location.source === 'default' &&
    location.lat === FALLBACK_COORDS.lat &&
    location.lon === FALLBACK_COORDS.lon;

  const darkWindowLabel = useMemo(() => {
    const dw = sky.timeline.darkWindow;
    if (!dw) return null;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    return `${fmt(dw.start)} → ${fmt(dw.end)}`;
  }, [sky.timeline.darkWindow]);

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

        {/* === Page heading === */}
        <header className="sky-v3__lede">
          <div className="sky-v3__lede-left">
            <h1 className="sky-v3__title">{tPage('title')}</h1>
            <p className="sky-v3__lede-sub">{tPage('subtitle')}</p>
            {verdict && <p className="sky-v3__verdict">{verdict}</p>}
          </div>
          <button
            type="button"
            className="sky-v3__ar"
            onClick={() => setArOpen(true)}
            disabled={arBodies.length === 0}
          >
            {tHeader('openAr')}
          </button>
        </header>

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

        {/* === Dome chart + table === */}
        {finder && !finderError && (
          <>
            <section className="sky-v3__split">
              <div className="sky-v3__map-wrap">
                <SkyMap
                  objects={tableObjects}
                  activeId={activeId}
                  onSelect={handleSelect}
                  heading={compass.heading}
                  userAltitude={compass.altitude}
                  headingStatus={compass.status}
                  onCalibrate={compass.request}
                  constellationStars={constellationStars}
                  constellationLines={CONSTELLATION_LINES}
                  hopAnchor={hopAnchor ? {
                    id: hopAnchor.id,
                    name: hopAnchor.name,
                    azimuth: hopAnchor.azimuth,
                    altitude: hopAnchor.altitude,
                  } : null}
                />
                <p className="sky-v3__map-caption">{tHeader('mapCaption')}</p>
              </div>
              <div className="sky-v3__table-wrap">
                <BodyTable objects={tableObjects} activeId={activeId} onSelect={handleSelect} />
              </div>
            </section>

            {activeObject && (
              <section className="sky-v3__active">
                <DirectionHero object={activeObject} />
                <HintCards object={activeObject} hopAnchor={hopAnchor} />
              </section>
            )}

            {/* === Looking around — horizon panorama === */}
            <section className="sky-v3__horizon">
              <div className="sky-v3__section-head">
                <span className="sky-v3__section-label">{tHorizon('label')}</span>
                <span className="sky-v3__section-meta">{tHorizon('refresh')}</span>
              </div>
              <HorizonStrip
                objects={finder.objects}
                highlightedId={activeId ?? undefined}
                onObjectClick={handleSelect}
              />
            </section>
          </>
        )}

        {/* === Extended forecast (collapsible) === */}
        <section className="sky-v3__extended">
          <button
            type="button"
            className={`sky-v3__extended-toggle${extendedOpen ? ' is-open' : ''}`}
            onClick={() => setExtendedOpen((v) => !v)}
            aria-expanded={extendedOpen}
          >
            <span className="sky-v3__section-label">{tPage('extendedForecast')}</span>
            <span className="sky-v3__extended-meta">
              {darkWindowLabel ? `${tPage('darkWindow')} ${darkWindowLabel}` : ''}
            </span>
            <span className={`sky-v3__chevron${extendedOpen ? ' is-open' : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>
          {extendedOpen && (
            <div className="sky-v3__extended-body">
              <div className="sky-v3__timeline-head">
                <h2 className="sky-v3__h2">{tPage('tonightTimeline')}</h2>
                <span className="sky-v3__timeline-meta">
                  <span>{tPage('darkWindow')}</span>
                  <span className="times">{darkWindowLabel ?? '—'}</span>
                </span>
              </div>
              <ObservationTimeline data={sky.timeline} />
            </div>
          )}
        </section>
      </div>

      {arOpen && arBodies.length > 0 && (
        <ARFinder
          objects={arBodies}
          observerLat={location.lat}
          observerLon={location.lon}
          onClose={() => setArOpen(false)}
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
