// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { toast } from '@/components/ui/Toast';
import { track } from '@/lib/track';
import { Compass, Crosshair, Telescope, Hand, Orbit, Flashlight, MapPin, Cloud, Wind } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useTranslations } from 'next-intl';
import { useLocation } from '@/lib/location';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { LOCATIONS } from '@/lib/darksky-locations';
import { useDeviceHeading } from '@/lib/sky/use-device-heading';
import { useForecast } from '@/lib/sky/use-forecast';
import { CONSTELLATION_LINES, STAR_TO_CONSTELLATION, positionStars } from '@/lib/sky/stars';
import type { ConstellationStar } from '@/components/sky/finder/SkyMap';
import { azimuthToCompass, altitudeToFists, moonPhaseKey } from '@/lib/sky/directions';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import EventBanner from '@/components/sky/EventBanner';
import SkyLocationModal from '@/components/sky/SkyLocationModal';
import { SkyMap } from '@/components/sky/finder/SkyMap';
import { SkyHeaderStrip } from '@/components/sky/finder/SkyHeaderStrip';
import { PlanetIcon } from '@/components/sky/finder/PlanetIcon';
import { MoonGlyph } from '@/components/sky/finder/MoonGlyph';
import { ARFinder } from '@/components/sky/finder/ARFinder';
import { SevenDayForecast } from '@/components/sky/forecast/SevenDayForecast';
import { TonightTimeline } from '@/components/sky/TonightTimeline';
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
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return null;
  }
}

function fmtDuration(aISO: string | null, bISO: string | null): string | null {
  if (!aISO || !bISO) return null;
  try {
    let ms = new Date(bISO).getTime() - new Date(aISO).getTime();
    if (ms < 0) ms += 24 * 3600 * 1000;
    const mins = Math.round(ms / 60000);
    return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
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

function bortleLabel(b: number): string {
  if (b <= 2) return 'Truly dark';
  if (b === 3) return 'Rural';
  if (b === 4) return 'Rural/Suburban';
  if (b === 5) return 'Suburban';
  if (b === 6) return 'Bright suburb';
  if (b === 7) return 'Suburban/City';
  return 'City sky';
}

/** Plain-language light-pollution rating derived from the Bortle estimate.
 *  Telescope buyers don't know what "Bortle 8" means — they know "Severe". */
function lightPollutionLevel(b: number): { word: string; tone: 'good' | 'mid' | 'bad' } {
  if (b <= 2) return { word: 'Pristine', tone: 'good' };
  if (b <= 4) return { word: 'Low', tone: 'good' };
  if (b === 5) return { word: 'Moderate', tone: 'mid' };
  if (b <= 7) return { word: 'High', tone: 'bad' };
  return { word: 'Severe', tone: 'bad' };
}

const MOON_NAMES: Record<string, string> = {
  new: 'New Moon',
  thinCrescent: 'Waxing Crescent',
  firstQuarter: 'First Quarter',
  waxingGibbous: 'Waxing Gibbous',
  full: 'Full Moon',
  waningGibbous: 'Waning Gibbous',
  lastQuarter: 'Last Quarter',
  thinWaning: 'Waning Crescent',
};

/** Priority for the "best targets" rail: Moon → bright planets → DSO/stars. */
function targetRank(o: SkyObject): number {
  if (o.id === 'moon') return 0;
  const planets: Record<string, number> = {
    venus: 10, jupiter: 11, mars: 12, saturn: 13, mercury: 14, uranus: 15, neptune: 16,
  };
  if (o.id in planets) return planets[o.id];
  if (o.type === 'star' || o.type === 'double') return 20 + Math.max(0, Math.min(8, o.magnitude + 2));
  return 30 + Math.max(0, Math.min(8, o.magnitude));
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

  // First-entry location chooser. Replaces the inline location pill.
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
    } catch { /* private mode */ }
  }, []);
  const dismissTour = useCallback(() => {
    setShowTour(false);
    try { window.localStorage.setItem(TOUR_KEY, '1'); } catch { /* ignore */ }
  }, []);

  const [finder, setFinder] = useState<FinderResponse | null>(null);
  const [finderLoading, setFinderLoading] = useState(true);
  const [finderError, setFinderError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<ObjectId | null>(null);
  const [arOpen, setArOpen] = useState(false);
  const [arActiveId, setArActiveId] = useState<ObjectId | null>(null);

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

  useEffect(() => {
    if (finder?.generatedAt) setSkyTime(new Date(finder.generatedAt));
  }, [finder?.generatedAt]);

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

  // ── Earn-on-aim ──────────────────────────────────────────────
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
      try { authToken = await getAccessToken(); } catch { /* external wallet */ }
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

  // Verdict CTA — select the recommended target and bring the dome into view.
  const handleChooseTarget = useCallback((id: ObjectId) => {
    setActiveId(id);
    if (typeof document !== 'undefined') {
      document.querySelector('.sky-obs__dome')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
  const coordLabel = `${Math.abs(location.lat).toFixed(2)}°${location.lat >= 0 ? 'N' : 'S'} · ${Math.abs(location.lon).toFixed(2)}°${location.lon >= 0 ? 'E' : 'W'}`;
  const bortle = useMemo(() => estimateBortle(location.lat, location.lon), [location.lat, location.lon]);

  // Observing window from twilight (astronomical dark → dawn).
  const windowOpen = finder?.twilight?.astronomicalDusk ?? finder?.twilight?.nauticalDusk ?? finder?.twilight?.civilDusk ?? null;
  const windowClose = finder?.twilight?.astronomicalDawn ?? finder?.twilight?.nauticalDawn ?? finder?.twilight?.civilDawn ?? null;
  const windowDuration = fmtDuration(windowOpen, windowClose);

  // Top five targets above the horizon, ranked Moon → planets → DSO.
  const bestTargets = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    return finder.objects
      .filter((o) => o.visible && o.id !== 'sun')
      .sort((a, b) => {
        const ra = targetRank(a);
        const rb = targetRank(b);
        if (ra !== rb) return ra - rb;
        return b.altitude - a.altitude;
      })
      .slice(0, 5);
  }, [finder]);

  // Moon phase for the conditions card.
  const moonObj = finder?.objects.find((o) => o.id === 'moon') ?? null;
  const moonPhase = moonObj?.phase ?? forecast.days[0]?.moonPhase ?? 0.5;
  const moonIllum = Math.round(((1 - Math.cos(moonPhase * 2 * Math.PI)) / 2) * 100);
  const moonName = MOON_NAMES[moonPhaseKey(moonPhase)] ?? 'Moon';

  // Seeing estimate from tonight's evening wind (lower wind ⇒ steadier air).
  const windKmh = forecast.days[0]?.windKmh;
  const seeingArc = windKmh != null ? Math.min(5, Math.max(1, 1.2 + windKmh * 0.06)) : null;
  const seeingLabel =
    seeingArc == null ? '—'
    : seeingArc < 2 ? 'Excellent'
    : seeingArc < 2.8 ? 'Good'
    : seeingArc < 3.6 ? 'Fair'
    : 'Poor';

  const cloudPct = finder?.conditions?.cloudCoverPct ?? null;
  const cloudLabel =
    cloudPct == null ? '—'
    : cloudPct < 20 ? 'Clear'
    : cloudPct < 50 ? 'Partly cloudy'
    : cloudPct < 80 ? 'Mostly cloudy'
    : 'Overcast';

  const dateLabel = skyTime
    .toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
  const timeLabel = skyTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="sky-page-v2 sky-v3 sky-obs">
      <div className="sky-obs__wrap">
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
          <>
            <header className="sky-obs__top">
              <div className="sky-obs__title-block">
                <h1 className="sky-obs__title">Sky Tonight</h1>
                <p className="sky-obs__date">{dateLabel} · {timeLabel}</p>
              </div>
              <button
                type="button"
                className="sky-obs__loc"
                onClick={() => setShowLocModal(true)}
                aria-label="Change observing location"
              >
                <MapPin size={13} aria-hidden="true" />
                <span className="sky-obs__loc-city">{locationLabel}</span>
                <span className="sky-obs__loc-coord">{coordLabel}</span>
              </button>
            </header>

            <div className="sky-obs__main">
              <div className="sky-obs__dome">
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
                <SkyHeaderStrip
                  locationLabel={locationLabel}
                  nowISO={finder.generatedAt}
                  visibleCount={tableObjects.filter((o) => o.visible && o.id !== 'sun').length}
                  activeName={activeObject?.name ?? null}
                />
              </div>

              <section className="sky-obs__targets">
                <header className="sky-obs__panel-head">Tonight&apos;s best targets</header>
                <ol className="sky-obs__target-list">
                  {bestTargets.length === 0 && (
                    <li className="sky-obs__target-empty">Nothing above the horizon right now.</li>
                  )}
                  {bestTargets.map((o, i) => (
                    <BestTargetRow
                      key={o.id}
                      index={i + 1}
                      obj={o}
                      active={o.id === activeId}
                      onSelect={handleSelect}
                    />
                  ))}
                </ol>
              </section>

              <div className="sky-obs__cards">
                <ConditionCard label="Observing window">
                  <div className="sky-obs__window">
                    <RingGauge pct={0.78} color="var(--seafoam, #5EEAD4)">
                      <Telescope size={18} aria-hidden="true" />
                    </RingGauge>
                    <div className="sky-obs__window-body">
                      <span className="sky-obs__window-times">
                        <span className="sky-obs__window-time">{fmtClock(windowOpen) ?? '—'}</span>
                        <span className="sky-obs__window-time sky-obs__window-time--to">
                          <span className="sky-obs__window-dash" aria-hidden>–</span> {fmtClock(windowClose) ?? '—'}
                        </span>
                      </span>
                      <span className="sky-obs__window-dur">{windowDuration ?? 'Dark window'}</span>
                    </div>
                  </div>
                </ConditionCard>

                <ConditionCard label="Cloud cover">
                  <div className="sky-obs__metric">
                    <RingGauge pct={cloudPct != null ? cloudPct / 100 : 0} color="var(--terracotta, #FFB347)">
                      <Cloud size={18} aria-hidden="true" />
                    </RingGauge>
                    <div className="sky-obs__metric-body">
                      <span className="sky-obs__metric-value">{cloudPct ?? '—'}<span className="sky-obs__metric-unit">%</span></span>
                      <span className="sky-obs__metric-sub">{cloudLabel}</span>
                    </div>
                  </div>
                </ConditionCard>

                <ConditionCard label="Moon phase">
                  <div className="sky-obs__metric">
                    <span className="sky-obs__moon"><MoonGlyph phase={moonPhase} size={48} /></span>
                    <div className="sky-obs__metric-body">
                      <span className="sky-obs__metric-value">{moonIllum}<span className="sky-obs__metric-unit">%</span></span>
                      <span className="sky-obs__metric-sub">{moonName}</span>
                    </div>
                  </div>
                </ConditionCard>

                <ConditionCard label="Seeing">
                  <div className="sky-obs__metric">
                    <RingGauge pct={seeingArc != null ? 1 - (seeingArc - 1) / 4 : 0} color="var(--seafoam, #5EEAD4)">
                      <Wind size={17} aria-hidden="true" />
                    </RingGauge>
                    <div className="sky-obs__metric-body">
                      <span className="sky-obs__metric-value sky-obs__metric-value--sm">{seeingArc != null ? `${seeingArc.toFixed(1)}″` : '—'}</span>
                      <span className="sky-obs__metric-sub">{seeingLabel}</span>
                    </div>
                  </div>
                </ConditionCard>

                <ConditionCard label="Light pollution">
                  <div className="sky-obs__metric">
                    <LightPollutionSwatch bortle={bortle} />
                    <div className="sky-obs__metric-body">
                      <span
                        className="sky-obs__metric-value sky-obs__metric-value--sm"
                        data-tone={lightPollutionLevel(bortle).tone}
                      >
                        {lightPollutionLevel(bortle).word}
                      </span>
                      <span className="sky-obs__metric-sub">{bortleLabel(bortle)}</span>
                    </div>
                  </div>
                </ConditionCard>
              </div>

              <SevenDayForecast
                variant="rail"
                days={forecast.days}
                loading={forecast.loading}
                locationLabel={locationLabel}
              />
            </div>

          </>
        )}

        {/* === Tonight's timeline — when, across the night, to observe === */}
        {finder && !finderError && (
          <TonightTimeline
            nowISO={finder.generatedAt}
            twilight={finder.twilight}
            objects={finder.objects}
            nightHours={forecast.days[0]?.nightHours ?? []}
            onSelect={handleChooseTarget}
          />
        )}

        {/* === Year-in-the-sky 2026 events rail === */}
        <SkyEvents2026 />
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

/* ── Best-target row — number · photo · name · constellation · timing ── */
function BestTargetRow({
  index,
  obj,
  active,
  onSelect,
}: {
  index: number;
  obj: SkyObject;
  active: boolean;
  onSelect: (id: ObjectId) => void;
}) {
  const photo = getTargetPhoto(obj.id);
  const setLabel = fmtClock(obj.setTime);
  const riseLabel = fmtClock(obj.riseTime);
  const timing = obj.circumpolar
    ? 'All night'
    : setLabel
      ? `↓ ${setLabel}`
      : riseLabel
        ? `↑ ${riseLabel}`
        : 'All night';

  return (
    <li>
      <button
        type="button"
        className={`sky-obs__target${active ? ' is-active' : ''}`}
        onClick={() => onSelect(obj.id)}
        aria-pressed={active}
      >
        <span className="sky-obs__target-thumb">
          <span className="sky-obs__target-num">{String(index).padStart(2, '0')}</span>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
          ) : (
            <PlanetIcon id={obj.id} type={obj.type} magnitude={obj.magnitude} phase={obj.phase} size={42} glow={false} />
          )}
        </span>
        <span className="sky-obs__target-body">
          <span className="sky-obs__target-top">
            <span className="sky-obs__target-name">{obj.name}</span>
            <span className="sky-obs__target-alt-val">{Math.round(obj.altitude)}°</span>
          </span>
          <span className="sky-obs__target-meta">
            {timing}
            <span className="sky-obs__target-sep" aria-hidden>·</span>
            {obj.compassDirection}
            <span className="sky-obs__target-sep" aria-hidden>·</span>
            {obj.constellation || obj.type}
          </span>
        </span>
      </button>
    </li>
  );
}

/* ── Small condition card shell ── */
function ConditionCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="sky-obs__card">
      <span className="sky-obs__card-label">{label}</span>
      <div className="sky-obs__card-body">{children}</div>
    </section>
  );
}

/* ── Circular progress ring with centred content ── */
function RingGauge({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <span className="sky-obs__ring">
      <svg width={52} height={52} viewBox="0 0 52 52" aria-hidden="true">
        <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={3.5} />
        <circle
          cx={26} cy={26} r={r} fill="none"
          stroke={color} strokeWidth={3.5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span className="sky-obs__ring-center" style={{ color }}>{children}</span>
    </span>
  );
}

/* ── Light-pollution swatch — a literal patch of sky. As pollution rises,
   skyglow creeps up from the horizon and fewer stars survive, so the
   metric is understood at a glance without knowing the Bortle scale. ── */
const LP_STARS: Array<[number, number, number]> = [
  [12, 13, 0.9], [33, 10, 0.7], [22, 20, 0.6], [38, 22, 0.8],
  [9, 26, 0.7], [28, 30, 0.6], [17, 33, 0.7], [40, 33, 0.5],
  [24, 14, 0.5], [14, 19, 0.5], [34, 28, 0.6], [20, 26, 0.5],
];
function LightPollutionSwatch({ bortle }: { bortle: number }) {
  const t = Math.max(0, Math.min(1, (bortle - 1) / 8)); // 0 = dark, 1 = bright
  const visibleStars = Math.max(2, Math.round(LP_STARS.length * (1 - t * 0.8)));
  return (
    <span className="sky-obs__lp-swatch" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="48" height="48">
        <defs>
          <radialGradient id="lpSkyglow" cx="50%" cy="100%" r="95%">
            <stop offset="0%" stopColor="#FFC074" stopOpacity={0.12 + t * 0.6} />
            <stop offset="55%" stopColor="#FFB347" stopOpacity={t * 0.18} />
            <stop offset="100%" stopColor="#FFB347" stopOpacity="0" />
          </radialGradient>
          <clipPath id="lpClip"><circle cx="24" cy="24" r="22" /></clipPath>
        </defs>
        <g clipPath="url(#lpClip)">
          <rect x="0" y="0" width="48" height="48" fill="#0a1430" />
          {LP_STARS.slice(0, visibleStars).map(([x, y, o], i) => (
            <circle key={i} cx={x} cy={y} r={i % 4 === 0 ? 1 : 0.7} fill="#E8F0FF" opacity={o * (1 - t * 0.55)} />
          ))}
          <rect x="0" y="0" width="48" height="48" fill="url(#lpSkyglow)" />
        </g>
        <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      </svg>
    </span>
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
