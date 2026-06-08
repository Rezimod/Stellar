// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { toast } from '@/components/ui/Toast';
import { track } from '@/lib/track';
import { Compass, Crosshair, Telescope, Hand, Orbit, Flashlight, MapPin, Camera } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { LOCATIONS } from '@/lib/darksky-locations';
import { useDeviceHeading } from '@/lib/sky/use-device-heading';
import { useForecast } from '@/lib/sky/use-forecast';
import { CONSTELLATION_LINES, STAR_TO_CONSTELLATION, positionStars } from '@/lib/sky/stars';
import type { ConstellationStar } from '@/components/sky/finder/SkyMap';
import { azimuthToCompass, altitudeToFists } from '@/lib/sky/directions';
import EventBanner from '@/components/sky/EventBanner';
import SkyAstraCta from '@/components/sky/SkyAstraCta';
import SkyLocationModal from '@/components/sky/SkyLocationModal';
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
const LOC_PROMPT_KEY = 'stellar.sky.locprompt.v1';

function fmtClock(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function fmtDuration(aISO: string | null, bISO: string | null): string | null {
  if (!aISO || !bISO) return null;
  try {
    let ms = new Date(bISO).getTime() - new Date(aISO).getTime();
    if (ms < 0) ms += 24 * 3600 * 1000; // wraps past midnight
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${String(m).padStart(2, '0')}m`;
  } catch {
    return null;
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
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
  return minDist <= 60 ? nearest : 5;
}

export default function SkyPage() {
  const { location, locationReady, requestLocation, gpsState, loading: locationLoading } = useLocation();
  const tErrors = useTranslations('sky.errors');
  const tAr = useTranslations('sky.ar');
  const tSolar = useTranslations('sky.solarFromSky');

  const { address } = useStellarUser();
  const { getAccessToken } = usePrivy();
  const { field, toggleField } = useTheme();
  const compass = useDeviceHeading(location.lat, location.lon);

  // First-entry location chooser. Replaces the inline location pill: prompt
  // for an observing spot once per session if the user hasn't picked one.
  const [showLocModal, setShowLocModal] = useState(false);
  useEffect(() => {
    if (!locationReady) return;
    if (typeof window === 'undefined') return;
    try {
      if (window.sessionStorage.getItem(LOC_PROMPT_KEY)) return;
    } catch { /* private mode */ }
    setShowLocModal(true);
  }, [locationReady]);
  const closeLocModal = useCallback(() => {
    setShowLocModal(false);
    try { window.sessionStorage.setItem(LOC_PROMPT_KEY, '1'); } catch { /* ignore */ }
  }, []);

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

  // Re-fetch every minute so live state stays current — skip while hidden,
  // resume on visibility change and on window focus.
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

  // ── Earn-on-aim: a held lock on a target (compass dome or AR) awards Stars
  // once per target per night.
  const awardedRef = useRef<Set<string>>(new Set());
  const addressRef = useRef<string | null>(null);
  addressRef.current = address;
  const objectsRef = useRef<SkyObject[]>([]);
  objectsRef.current = tableObjects;

  const handleLock = useCallback((id: string) => {
    if (awardedRef.current.has(id)) return;
    awardedRef.current.add(id);
    const name = objectsRef.current.find((o) => o.id === id)?.name ?? id;
    const addr = addressRef.current;
    track('find_aimed', { target: id }, addr);
    if (!addr) {
      toast.reward(`Found ${name}`);
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    void (async () => {
      let authToken: string | null = null;
      try { authToken = await getAccessToken(); } catch { /* external wallet — no token */ }
      try {
        const res = await fetch('/api/award-stars', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            recipientAddress: addr,
            amount: 10,
            reason: `find:${id}`,
            idempotencyKey: `find:${addr}:${id}:${dateStr}`,
          }),
        });
        const data = res.ok ? await res.json().catch(() => null) : null;
        if (res.ok && data && !data.cached) {
          toast.reward(`+10 ✦ Found ${name}`);
          window.dispatchEvent(new Event('stellar:stars-synced'));
        } else {
          toast.success(`Found ${name}`);
        }
      } catch {
        toast.success(`Found ${name}`);
      }
    })();
  }, [getAccessToken]);

  // The brightest, easiest non-Moon, non-Sun target above the horizon.
  const primeTarget = useMemo<SkyObject | null>(() => {
    if (!finder) return null;
    const candidates = finder.objects.filter(
      (o) => o.visible && o.id !== 'moon' && o.id !== 'sun' && o.altitude >= 10,
    );
    if (candidates.length === 0) return null;
    return [...candidates].sort((a, b) => a.magnitude - b.magnitude)[0];
  }, [finder]);

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
  const bortle = useMemo(() => estimateBortle(location.lat, location.lon), [location.lat, location.lon]);

  // Observing window from twilight (astronomical dark → dawn).
  const windowOpen = finder?.twilight?.astronomicalDusk ?? finder?.twilight?.nauticalDusk ?? finder?.twilight?.civilDusk ?? null;
  const windowClose = finder?.twilight?.astronomicalDawn ?? finder?.twilight?.nauticalDawn ?? finder?.twilight?.civilDawn ?? null;
  const windowDuration = fmtDuration(windowOpen, windowClose);

  const heroObject = activeObject ?? primeTarget;

  return (
    <div className="sky-page-v2 sky-v3 sky-dash">
      <div className="sky-dash__wrap">
        <EventBanner />

        {finderError && (
          <div className="sky-v3__error">
            <span>{finderError}</span>
            <button type="button" onClick={fetchFinder}>{tErrors('retry')}</button>
          </div>
        )}

        {showTour && <FinderTour onDismiss={dismissTour} />}

        {(locationLoading || !locationReady || (finderLoading && !finder)) && (
          <SkyLoadingSkeleton />
        )}

        {finder && !finderError && (
          <div className="sky-dash__grid">
            {/* ── LEFT RAIL — prime target + tonight's targets ───────── */}
            <aside className="sky-dash__rail sky-dash__rail--left">
              {heroObject && (
                <section className="sky-dash__card sky-dash__prime">
                  <DirectionHero object={heroObject} />
                  <div className="sky-dash__prime-actions">
                    <Link href="/observe" className="sky-dash__observe">
                      <Camera size={14} aria-hidden="true" />
                      <span>Observe {heroObject.name}</span>
                    </Link>
                  </div>
                </section>
              )}

              <section className="sky-dash__card sky-dash__targets">
                <header className="sky-dash__targets-head">
                  <span className="sky-dash__rail-label">Tonight&apos;s targets</span>
                </header>
                <TargetFilters
                  objects={finder.objects}
                  tier={tier}
                  onTierChange={setTier}
                />
                <div className="sky-dash__targets-scroll">
                  <TargetVisibleGrid
                    objects={finder.objects}
                    tier={tier}
                    activeId={activeId}
                    onSelect={handleSelect}
                  />
                  <TargetBelowGrid
                    objects={finder.objects}
                    tier={tier}
                    activeId={activeId}
                    onSelect={handleSelect}
                  />
                </div>
              </section>
            </aside>

            {/* ── CENTER — the live sky map (dome + 3D + AR) ─────────── */}
            <div className="sky-dash__center">
              <header className="sky-dash__center-head">
                <div className="sky-dash__center-titles">
                  <h1 className="sky-dash__title">Sky tonight</h1>
                  <button
                    type="button"
                    className="sky-dash__loc"
                    onClick={() => setShowLocModal(true)}
                    aria-label="Change observing location"
                  >
                    <MapPin size={12} aria-hidden="true" />
                    <span>{locationLabel}</span>
                    <span className="sky-dash__loc-sep" aria-hidden>·</span>
                    <span>Bortle {bortle}</span>
                  </button>
                </div>
              </header>

              <div className="sky-dash__map-wrap">
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
                    onLock={handleLock}
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
                    <button
                      type="button"
                      className="sky-v3__ar-launch"
                      onClick={toggleField}
                      aria-label="Field mode — red light"
                      aria-pressed={field}
                      title="Field mode — red light"
                      style={field ? { color: '#FF3B30', borderColor: 'rgba(255,59,48,0.45)' } : undefined}
                    >
                      <Flashlight size={14} aria-hidden="true" />
                      <span className="sky-v3__ar-launch-label">Red</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT RAIL — observing window + conditions + ASTRA ── */}
            <aside className="sky-dash__rail sky-dash__rail--right">
              <section className="sky-dash__card sky-dash__window">
                <span className="sky-dash__rail-label">Observing window</span>
                <p className="sky-dash__window-main">
                  {windowDuration ? `Open · ${windowDuration}` : 'Dark window'}
                </p>
                {windowOpen && windowClose && (
                  <p className="sky-dash__window-range">
                    {fmtClock(windowOpen)} → {fmtClock(windowClose)}
                  </p>
                )}
                {finder.conditions?.summary && (
                  <p className="sky-dash__window-verdict">{finder.conditions.summary}</p>
                )}
              </section>

              <section className="sky-dash__card sky-dash__conditions">
                <span className="sky-dash__rail-label">Conditions</span>
                <div className="sky-dash__cond-grid">
                  <div className="sky-dash__cond">
                    <span className="sky-dash__cond-label">Clouds</span>
                    <span className="sky-dash__cond-value">{finder.conditions?.cloudCoverPct ?? '—'}%</span>
                  </div>
                  <div className="sky-dash__cond">
                    <span className="sky-dash__cond-label">Sky</span>
                    <span className="sky-dash__cond-value">{finder.conditions?.quality ?? '—'}</span>
                  </div>
                  <div className="sky-dash__cond">
                    <span className="sky-dash__cond-label">Bortle</span>
                    <span className="sky-dash__cond-value">{bortle}<span className="sky-dash__cond-unit">/9</span></span>
                  </div>
                  <div className="sky-dash__cond">
                    <span className="sky-dash__cond-label">Visible</span>
                    <span className="sky-dash__cond-value">
                      {tableObjects.filter((o) => o.visible && o.id !== 'sun').length}
                    </span>
                  </div>
                </div>
              </section>

              <SkyAstraCta />
            </aside>
          </div>
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

      <SkyLocationModal open={showLocModal} onClose={closeLocModal} />

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
          onLock={handleLock}
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
