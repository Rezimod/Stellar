// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { toast } from '@/components/ui/Toast';
import { track } from '@/lib/track';
import { Compass, Crosshair, Telescope, Hand, Box, Lightbulb, MapPin, ChevronRight, Eye, Sparkles, Sunrise, Sunset, Search, UserRound } from 'lucide-react';
import { TelescopeIcon } from '@/components/sky/CosmicIcons';
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
import { zoneForLocation } from '@/lib/sky/timezones';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import EventBanner from '@/components/sky/EventBanner';
import SkyLocationModal from '@/components/sky/SkyLocationModal';
import { SkyMap } from '@/components/sky/finder/SkyMap';
import { PlanetIcon } from '@/components/sky/finder/PlanetIcon';
import { MoonGlyph } from '@/components/sky/finder/MoonGlyph';
import { ARFinder } from '@/components/sky/finder/ARFinder';
import { SevenDayForecast, FourNightStrip } from '@/components/sky/forecast/SevenDayForecast';
import { SkyEvents2026 } from '@/components/sky/SkyEvents2026';
import { SpaceGallery } from '@/components/sky/SpaceGallery';
import type { FinderResponse, ObjectId, SkyObject } from '@/components/sky/finder/types';
import './sky.css';

const REFRESH_MS = 60_000;
const TOUR_KEY = 'stellar.sky.tour.v1';
const LOC_PROMPT_KEY = 'stellar.sky.locprompt.v1';

function fmtClock(iso: string | null, tz?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz });
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

/** Priority for the "best targets" rail: Sun (daytime) → Moon → bright planets → DSO/stars. */
function targetRank(o: SkyObject): number {
  if (o.id === 'sun') return -1;
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
  const tDir = useTranslations('sky.directions.compass');

  const { address, authenticated, ready } = useStellarUser({ ignoreDemoBypass: false });
  const tAuth = useTranslations('sky.auth');
  const [authOpen, setAuthOpen] = useState(false);
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

  const handleArSelect = useCallback((id: ObjectId | null) => {
    setArActiveId(id);
    if (id) setActiveId(id);
  }, []);

  const fallbackUsed =
    location.source === 'default' &&
    location.lat === DEFAULT_OBSERVER.lat &&
    location.lon === DEFAULT_OBSERVER.lon;

  const locationLabel = location.city || (fallbackUsed ? 'Tbilisi' : '—');
  const tz = useMemo(() => zoneForLocation(location), [location]);
  const bortle = useMemo(() => estimateBortle(location.lat, location.lon), [location.lat, location.lon]);

  // Header date + time, in the observing location's zone.
  const dateLabel = skyTime
    .toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric', timeZone: tz })
    .toUpperCase();
  const timeLabel = skyTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone: tz });

  // Observing window from twilight (astronomical dark → dawn).
  const windowOpen = finder?.twilight?.astronomicalDusk ?? finder?.twilight?.nauticalDusk ?? finder?.twilight?.civilDusk ?? null;
  const windowClose = finder?.twilight?.astronomicalDawn ?? finder?.twilight?.nauticalDawn ?? finder?.twilight?.civilDawn ?? null;
  const windowDuration = fmtDuration(windowOpen, windowClose);

  // Sun rise/set for the summary strip + night-overview bar.
  const sunObj = finder?.objects.find((o) => o.id === 'sun') ?? null;
  const sunsetISO = sunObj?.setTime ?? finder?.twilight?.civilDusk ?? null;
  const sunriseISO = sunObj?.riseTime ?? finder?.twilight?.civilDawn ?? null;

  // Objects above the horizon, ranked Sun (daytime) → Moon → planets → DSO.
  const bestTargets = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    return finder.objects
      .filter((o) => o.visible)
      .sort((a, b) => {
        const ra = targetRank(a);
        const rb = targetRank(b);
        if (ra !== rb) return ra - rb;
        return b.altitude - a.altitude;
      })
      .slice(0, 6);
  }, [finder]);

  const visibleCount = useMemo(
    () => tableObjects.filter((o) => o.visible && o.id !== 'sun').length,
    [tableObjects],
  );

  // Moon phase + illumination.
  const moonObj = finder?.objects.find((o) => o.id === 'moon') ?? null;
  const moonPhase = moonObj?.phase ?? forecast.days[0]?.moonPhase ?? 0.5;
  const moonIllum = Math.round(((1 - Math.cos(moonPhase * 2 * Math.PI)) / 2) * 100);
  const moonName = MOON_NAMES[moonPhaseKey(moonPhase)] ?? 'Moon';

  const cloudPct = finder?.conditions?.cloudCoverPct ?? null;

  // Sky-quality score (1–10): the finder verdict, dragged down by cloud cover,
  // moonlight, and light pollution — the four things that actually limit a night.
  const skyScore = useMemo(() => {
    const base = ({ Excellent: 9.2, Good: 8, Fair: 5.2, Poor: 3 } as Record<string, number>)[finder?.conditions?.quality ?? 'Good'] ?? 7;
    let s = base;
    if (cloudPct != null) s -= (cloudPct / 100) * 2.5;
    s -= (moonIllum / 100) * 1.2;
    s -= Math.max(0, bortle - 4) * 0.35;
    return Math.max(1, Math.min(10, Math.round(s)));
  }, [finder?.conditions?.quality, cloudPct, moonIllum, bortle]);
  const skyWord = skyScore >= 9 ? 'Excellent' : skyScore >= 7 ? 'Very good' : skyScore >= 5 ? 'Fair' : 'Poor';

  // Dark-window quality note for the "next best time" card.
  const darkNote = moonIllum < 35 ? 'Milky Way visible' : moonIllum < 70 ? 'Some moonlight' : 'Bright moon tonight';

  // Contextual tips, derived from the night's conditions and targets.
  const tips = useMemo<string[]>(() => {
    const out: string[] = [];
    const planet = bestTargets.find((o) => o.type === 'planet' && o.nakedEye && o.altitude > 5);
    if (planet) out.push(`Look ${tDir(planet.compassDirection)} after dark for bright ${planet.name}, about ${Math.round(planet.altitude)}° up.`);
    if (moonIllum < 30) out.push('Near-new Moon — faint nebulae and the Milky Way are at their best. Let your eyes adapt for 20 minutes.');
    else if (moonIllum > 70) out.push(`A ${moonName.toLowerCase()} lights the sky — favour the Moon, planets, and bright double stars tonight.`);
    const scope = bestTargets.find((o) => o.instrument === 'telescope' && o.altitude > 5);
    if (scope) out.push(`Aim a telescope ${tDir(scope.compassDirection)}, about ${Math.round(scope.altitude)}° up, to catch ${scope.name}.`);
    if (cloudPct != null && cloudPct > 60) out.push(`${cloudPct}% cloud cover tonight — watch for clear gaps and keep your gear covered.`);
    return out.length ? out : ['Clear skies make all the difference — find a spot away from direct lights and let your eyes adapt.'];
  }, [bestTargets, moonIllum, moonName, cloudPct, tDir]);

  if (ready && !authenticated) {
    return (
      <div className="sky-page-v2 sky-v3 sky-obs">
        <div className="sky-obs__wrap">
          <div className="sky-auth-gate">
            <h1 className="sky-auth-gate__title">{tAuth('title')}</h1>
            <p className="sky-auth-gate__body">{tAuth('body')}</p>
            <button
              type="button"
              className="sky-auth-gate__btn"
              onClick={() => setAuthOpen(true)}
            >
              {tAuth('signIn')}
            </button>
            <p className="sky-auth-gate__sub">{tAuth('sub')}</p>
          </div>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </div>
    );
  }

  return (
    <div className="sky-page-v2 sky-v3 sky-obs skx">
      <div className="sky-obs__wrap">
        <header className="skx__topbar">
          <Link href="/" className="skx__brand" aria-label="Stellar home">
            <span className="skx__comet" aria-hidden="true" />
            <span>STELLAR</span>
          </Link>
          <div className="skx__top-actions">
            <Link href="/hub" className="skx__icon-btn" aria-label="Open hub">
              <Search size={21} aria-hidden="true" />
            </Link>
            <Link href="/profile" className="skx__avatar" aria-label="Open profile">
              <UserRound size={18} aria-hidden="true" />
            </Link>
          </div>
        </header>

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
            {/* ── Header ── */}
            <header className="skx__head">
              <div className="skx__head-titles">
                <h1 className="skx__title">Sky Tonight</h1>
                <p className="skx__subtitle">{dateLabel} · {timeLabel}</p>
              </div>
              <button
                type="button"
                className="skx__loc"
                onClick={() => setShowLocModal(true)}
                aria-label="Change observing location"
              >
                <MapPin size={14} aria-hidden="true" />
                <span className="skx__loc-city">{locationLabel}</span>
                <ChevronRight size={15} aria-hidden="true" />
              </button>
            </header>

            {/* ── Summary strip — visible · moon · sky quality · sun ── */}
            <section className="skx__summary" aria-label="Tonight at a glance">
              <div className="skx__sum-cell skx__sum-cell--lead">
                <span className="skx__sum-lead-top">
                  <span className="skx__sum-count">{visibleCount}</span>
                  <Eye size={15} aria-hidden="true" />
                  <span className="skx__sum-head">Visible now</span>
                </span>
                <span className="skx__sum-sub">Best targets to see</span>
              </div>

              <div className="skx__sum-cell">
                <span className="skx__sum-icon skx__sum-moon"><MoonGlyph phase={moonPhase} size={40} /></span>
                <span className="skx__sum-body">
                  <span className="skx__sum-head">{moonName}</span>
                  <span className="skx__sum-val">{moonIllum}<em>%</em></span>
                  <span className="skx__sum-sub">Illumination</span>
                </span>
              </div>

              <div className="skx__sum-cell">
                <QualityRing score={skyScore} />
                <span className="skx__sum-body">
                  <span className="skx__sum-head">Sky quality</span>
                  <span className="skx__sum-val">{skyScore}<em>/10</em></span>
                  <span className="skx__sum-sub" data-tone={skyScore >= 7 ? 'good' : skyScore >= 5 ? 'mid' : 'bad'}>{skyWord}</span>
                </span>
              </div>

              <div className="skx__sum-cell">
                <span className="skx__sum-icon skx__sum-sunic"><Sunset size={22} aria-hidden="true" /></span>
                <span className="skx__sum-body">
                  <span className="skx__sum-head">Sunset</span>
                  <span className="skx__sum-val skx__sum-val--time">{fmtClock(sunsetISO, tz) ?? '—'}</span>
                  <span className="skx__sum-sub">Sunrise {fmtClock(sunriseISO, tz) ?? '—'}</span>
                </span>
              </div>
            </section>

            {/* ── Sky map ── */}
            <section className="skx__map">
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
                    aria-label="3D solar system"
                    title="3D solar system"
                  >
                    <Box size={14} aria-hidden="true" />
                    <span className="sky-v3__solar-launch-label">3D View</span>
                  </Link>
                  <button
                    type="button"
                    className="sky-v3__ar-launch"
                    onClick={toggleField}
                    aria-label="Night mode — red light"
                    aria-pressed={field}
                    title="Night mode — red light"
                    style={field ? { color: '#FF3B30', borderColor: 'rgba(255,59,48,0.45)' } : undefined}
                  >
                    <Lightbulb size={14} aria-hidden="true" />
                    <span className="sky-v3__ar-launch-label">Night</span>
                  </button>
                </div>
              </div>
              <AzimuthStrip activeObject={activeObject} />
            </section>

            {/* ── Next best time · what to look for ── */}
            <div className="skx__duo">
              <section className="skx__card skx__nbt">
                <span className="skx__card-label">Next best time</span>
                <div className="skx__nbt-row">
                  <RingGauge pct={0.82} color="var(--seafoam, #5EEAD4)">
                    <TelescopeIcon size={20} />
                  </RingGauge>
                  <div className="skx__nbt-body">
                    <strong className="skx__nbt-window">{fmtClock(windowOpen, tz) ?? '—'} – {fmtClock(windowClose, tz) ?? '—'}</strong>
                    <span className="skx__nbt-dur">{windowDuration ?? 'Dark window'} window</span>
                    <span className="skx__nbt-note"><Sparkles size={13} aria-hidden="true" /> {darkNote}</span>
                  </div>
                </div>
              </section>

              <section className="skx__card skx__look">
                <span className="skx__card-label">What to look for</span>
                <ul className="skx__look-list">
                  {bestTargets.length === 0 && (
                    <li className="skx__look-empty">Nothing above the horizon right now.</li>
                  )}
                  {bestTargets.slice(0, 3).map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        className={`skx__look-row${o.id === activeId ? ' is-active' : ''}`}
                        onClick={() => handleSelect(o.id)}
                        aria-pressed={o.id === activeId}
                      >
                        <span className="skx__look-dot" style={{ background: objectAccent(o) }} aria-hidden="true" />
                        <span className="skx__look-name">{o.name}</span>
                        <span className="skx__look-where">{lookPhrase(o, tDir)}</span>
                        <span className="skx__look-ic" aria-hidden="true">
                          {o.instrument === 'naked' ? <Eye size={14} /> : <Telescope size={14} />}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* ── Visible now rail ── */}
            <section className="skx__visible" aria-label="Visible now">
              <header className="skx__sec-head">
                <h2 className="skx__sec-title">Visible now <span className="skx__sec-count">({visibleCount})</span></h2>
                {compass.status !== 'unavailable' && (
                  <button type="button" className="skx__viewall" onClick={handleArOpen}>
                    View all <ChevronRight size={14} aria-hidden="true" />
                  </button>
                )}
              </header>
              <ol className="skx__vis-rail">
                {bestTargets.length === 0 && (
                  <li className="skx__vis-empty">Nothing above the horizon right now.</li>
                )}
                {bestTargets.map((o, i) => (
                  <VisCard
                    key={o.id}
                    obj={o}
                    active={o.id === activeId}
                    top={i === 0}
                    onSelect={handleSelect}
                  />
                ))}
              </ol>
            </section>

            {/* ── Tonight overview · tips ── */}
            <div className="skx__duo">
              <section className="skx__card skx__overview">
                <span className="skx__card-label">Tonight overview</span>
                <NightOverview sunsetISO={sunsetISO} sunriseISO={sunriseISO} openISO={windowOpen} closeISO={windowClose} tz={tz} />
              </section>
              <TipsCard tips={tips} />
            </div>

            {/* ── Multi-day outlook (retained below the new hero) ── */}
            <SevenDayForecast
              variant="rail"
              days={forecast.days}
              loading={forecast.loading}
              locationLabel={locationLabel}
            />
            <FourNightStrip
              days={forecast.days}
              loading={forecast.loading}
              locationLabel={locationLabel}
            />
          </>
        )}

        {/* === Year-in-the-sky 2026 events rail === */}
        <SkyEvents2026 />

        {/* === Daily telescope imagery (NASA / ESA / Webb) === */}
        <SpaceGallery />
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

/* ── Accent colour for an object's dot — by catalog type. ── */
function objectAccent(o: SkyObject): string {
  if (o.id === 'moon') return '#CFD6E4';
  if (o.id === 'sun') return '#FFD166';
  if (o.type === 'planet') return '#F4D98C';
  if (o.type === 'nebula' || o.type === 'galaxy' || o.type === 'cluster') return '#B98CFF';
  return '#FF9B54'; // stars / doubles
}

/* ── Plain-language "where to look" for the what-to-look-for list. ── */
function lookPhrase(o: SkyObject, tDir: (k: string) => string): string {
  if (o.instrument === 'telescope') return 'Telescope';
  if (o.instrument === 'binoculars') return 'Binoculars';
  const dir = tDir(o.compassDirection);
  if (o.altitude >= 50) return `High in the ${dir}`;
  if (o.altitude >= 20) return `In the ${dir}`;
  return `Low in the ${dir}`;
}

/* ── Visible-now badge — best / good / telescope / later. ── */
function visBadge(o: SkyObject, top: boolean): { label: string; tone: string } {
  if (o.instrument === 'telescope') return { label: 'Telescope', tone: 'scope' };
  if (o.instrument === 'binoculars') return { label: 'Binoculars', tone: 'scope' };
  if (o.altitude < 18) return { label: 'Later', tone: 'later' };
  if (top) return { label: 'Best now', tone: 'best' };
  return { label: 'Good', tone: 'good' };
}

/* ── Sky-quality ring — arc fills to score/10. ── */
function QualityRing({ score }: { score: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 10));
  const color = score >= 7 ? 'var(--seafoam, #5EEAD4)' : score >= 5 ? 'var(--terracotta, #FFB347)' : '#FF8A6A';
  return (
    <span className="skx__qring" aria-hidden="true">
      <svg width={44} height={44} viewBox="0 0 44 44">
        <circle cx={22} cy={22} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={3.5} />
        <circle
          cx={22} cy={22} r={r} fill="none"
          stroke={color} strokeWidth={3.5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform="rotate(-90 22 22)"
        />
      </svg>
    </span>
  );
}

/* ── Azimuth ruler under the map — marks where the active target sits along
   the southern arc (E → S → W), the band where most objects culminate. ── */
function AzimuthStrip({ activeObject }: { activeObject: SkyObject | null }) {
  const ticks: Array<{ dir: string; deg: number }> = [
    { dir: 'E', deg: 90 }, { dir: 'SE', deg: 135 }, { dir: 'S', deg: 180 },
    { dir: 'SW', deg: 225 }, { dir: 'W', deg: 270 },
  ];
  const az = activeObject?.azimuth ?? null;
  // Map 90..270 → 0..1; objects in the northern half clamp to the nearest end.
  const marker = az == null ? null : Math.max(0, Math.min(1, (az - 90) / 180));
  return (
    <div className="skx__azim" role="presentation">
      {marker != null && (
        <span className="skx__azim-marker" style={{ left: `${marker * 100}%` }} aria-hidden="true" />
      )}
      {ticks.map((t) => (
        <span key={t.dir} className="skx__azim-tick">
          <span className="skx__azim-dir">{t.dir}</span>
          <span className="skx__azim-deg">{t.deg}°</span>
        </span>
      ))}
    </div>
  );
}

/* ── Visible-now card — photo · name · direction·altitude · badge. ── */
function VisCard({ obj, active, top, onSelect }: {
  obj: SkyObject;
  active: boolean;
  top: boolean;
  onSelect: (id: ObjectId) => void;
}) {
  const photo = getTargetPhoto(obj.id);
  const badge = visBadge(obj, top);
  return (
    <li>
      <button
        type="button"
        className={`skx__vis-card${active ? ' is-active' : ''}`}
        onClick={() => onSelect(obj.id)}
        aria-pressed={active}
      >
        <span className="skx__vis-thumb">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
          ) : (
            <PlanetIcon id={obj.id} type={obj.type} magnitude={obj.magnitude} phase={obj.phase} size={48} glow={false} />
          )}
        </span>
        <span className="skx__vis-name">{obj.name}</span>
        <span className="skx__vis-pos">{obj.compassDirection} · {Math.round(obj.altitude)}°</span>
        <span className={`skx__vis-badge skx__vis-badge--${badge.tone}`}>{badge.label}</span>
      </button>
    </li>
  );
}

/* ── Circular progress ring with centred content ── */
function RingGauge({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  return (
    <span className="skx__ring">
      <svg width={52} height={52} viewBox="0 0 52 52" aria-hidden="true">
        <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={3.5} />
        <circle
          cx={26} cy={26} r={r} fill="none"
          stroke={color} strokeWidth={3.5} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - clamped)}
          transform="rotate(-90 26 26)"
        />
      </svg>
      <span className="skx__ring-center" style={{ color }}>{children}</span>
    </span>
  );
}

/* ── Night overview bar — sunset → sunrise with the dark window highlighted. ── */
function NightOverview({ sunsetISO, sunriseISO, openISO, closeISO, tz }: {
  sunsetISO: string | null;
  sunriseISO: string | null;
  openISO: string | null;
  closeISO: string | null;
  tz?: string;
}) {
  const sunset = sunsetISO ? new Date(sunsetISO).getTime() : null;
  let sunrise = sunriseISO ? new Date(sunriseISO).getTime() : null;
  if (sunset != null && sunrise != null && sunrise <= sunset) sunrise += 24 * 3600 * 1000;
  const span = sunset != null && sunrise != null ? sunrise - sunset : null;
  const frac = (iso: string | null): number | null => {
    if (!iso || sunset == null || !span) return null;
    let t = new Date(iso).getTime();
    if (t < sunset) t += 24 * 3600 * 1000;
    return Math.max(0, Math.min(1, (t - sunset) / span));
  };
  const a = frac(openISO);
  const b = frac(closeISO);
  const hasWindow = a != null && b != null && b > a;
  return (
    <div className="skx__ov">
      <div className="skx__ov-track" aria-hidden="true">
        {hasWindow && (
          <span className="skx__ov-window" style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}>
            <span className="skx__ov-window-label">Best window</span>
          </span>
        )}
      </div>
      <div className="skx__ov-ends">
        <span className="skx__ov-end">
          <Sunset size={14} aria-hidden="true" />
          <span className="skx__ov-end-time">{fmtClock(sunsetISO, tz) ?? '—'}</span>
          <span className="skx__ov-end-label">Sunset</span>
        </span>
        {hasWindow && (
          <span className="skx__ov-mid">{fmtClock(openISO, tz)} – {fmtClock(closeISO, tz)}</span>
        )}
        <span className="skx__ov-end skx__ov-end--right">
          <Sunrise size={14} aria-hidden="true" />
          <span className="skx__ov-end-time">{fmtClock(sunriseISO, tz) ?? '—'}</span>
          <span className="skx__ov-end-label">Sunrise</span>
        </span>
      </div>
    </div>
  );
}

/* ── Tips card — rotates through contextual advice for tonight. ── */
function TipsCard({ tips }: { tips: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [tips]);
  useEffect(() => {
    if (tips.length < 2) return;
    const id = window.setInterval(() => setI((p) => (p + 1) % tips.length), 7000);
    return () => window.clearInterval(id);
  }, [tips.length]);
  const current = tips[Math.min(i, tips.length - 1)] ?? '';
  return (
    <section className="skx__card skx__tips">
      <span className="skx__card-label"><Lightbulb size={13} aria-hidden="true" /> Tips for tonight</span>
      <p className="skx__tips-text">{current}</p>
      {tips.length > 1 && (
        <div className="skx__tips-dots">
          {tips.map((_, n) => (
            <button
              key={n}
              type="button"
              className={`skx__tips-dot${n === i ? ' is-active' : ''}`}
              onClick={() => setI(n)}
              aria-label={`Tip ${n + 1}`}
            />
          ))}
        </div>
      )}
    </section>
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
