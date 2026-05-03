// src/app/sky/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSkyData } from '@/lib/use-sky-data';
import { useLocation } from '@/lib/location';
import { SkyHero } from '@/components/sky/SkyHero';
import { VisibleNow } from '@/components/sky/VisibleNow';
import { ObservationTimeline } from '@/components/sky/ObservationTimeline';
import { LocationFallbackBanner } from '@/components/sky/LocationFallbackBanner';
import { DirectionHero } from '@/components/sky/finder/DirectionHero';
import { HorizonStrip } from '@/components/sky/finder/HorizonStrip';
import { ObjectTabs } from '@/components/sky/finder/ObjectTabs';
import { HintCards } from '@/components/sky/finder/HintCards';
import { ARFinder } from '@/components/sky/finder/ARFinder';
import type { FinderResponse, ObjectId, SkyObject } from '@/components/sky/finder/types';
import './sky.css';

const FALLBACK_COORDS = { lat: 41.6941, lon: 44.8337 };
const AUTO_ROTATE_MS = 8000;

export default function SkyPage() {
  const { location } = useLocation();
  const tPage = useTranslations('sky.page');
  const tErrors = useTranslations('sky.errors');

  const initialCoords = useMemo(
    () => ({ lat: location.lat, lon: location.lon, city: location.city }),
    [location.lat, location.lon, location.city],
  );
  const sky = useSkyData(initialCoords);

  const [finder, setFinder] = useState<FinderResponse | null>(null);
  const [finderLoading, setFinderLoading] = useState(true);
  const [finderError, setFinderError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<ObjectId | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [arOpen, setArOpen] = useState(false);

  const fetchFinder = useCallback(async () => {
    setFinderLoading(true);
    setFinderError(null);
    try {
      const res = await fetch(`/api/sky/finder?lat=${location.lat}&lon=${location.lon}`);
      if (!res.ok) throw new Error('fetch failed');
      const data: FinderResponse = await res.json();
      setFinder(data);
      const visible = data.objects.filter((o) => o.visible).sort((a, b) => a.magnitude - b.magnitude);
      setActiveId((prev) => prev ?? (visible[0]?.id ?? null));
    } catch {
      setFinderError(tErrors('fetchFailed'));
    } finally {
      setFinderLoading(false);
    }
  }, [location.lat, location.lon, tErrors]);

  useEffect(() => {
    fetchFinder();
  }, [fetchFinder]);

  const visibleSorted = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    return finder.objects.filter((o) => o.visible).sort((a, b) => a.magnitude - b.magnitude);
  }, [finder]);

  // Bodies for AR — include Sun even though the finder UI hides it (it's
  // useful to show daytime).
  const arBodies = useMemo<SkyObject[]>(() => {
    if (!finder) return [];
    return finder.objects.filter((o) => o.visible);
  }, [finder]);

  useEffect(() => {
    if (!autoRotate || paused || arOpen || visibleSorted.length < 2) return;
    const interval = setInterval(() => {
      setActiveId((current) => {
        const idx = visibleSorted.findIndex((o) => o.id === current);
        const next = visibleSorted[(idx + 1) % visibleSorted.length];
        return next.id;
      });
    }, AUTO_ROTATE_MS);
    return () => clearInterval(interval);
  }, [autoRotate, paused, arOpen, visibleSorted]);

  const activeObject = useMemo(() => {
    if (!finder || !activeId) return null;
    return finder.objects.find((o) => o.id === activeId) ?? null;
  }, [finder, activeId]);

  const handleSelectTab = useCallback((id: ObjectId) => {
    setActiveId(id);
    setAutoRotate(false);
  }, []);

  const darkWindowLabel = useMemo(() => {
    const dw = sky.timeline.darkWindow;
    if (!dw) return null;
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    return `${fmt(dw.start)} → ${fmt(dw.end)}`;
  }, [sky.timeline.darkWindow]);

  return (
    <div className="sky-page-v2">
      <div className="sky-container">
        <LocationFallbackBanner />
        <SkyHero score={sky.score} location={sky.location} loading={sky.loading} />

        <FinderRegion
          loading={finderLoading}
          error={finderError}
          finder={finder}
          activeObject={activeObject}
          activeId={activeId}
          autoRotate={autoRotate}
          onSelectTab={handleSelectTab}
          onToggleAuto={() => setAutoRotate((v) => !v)}
          onPauseChange={setPaused}
          onRetry={fetchFinder}
          onOpenAr={() => setArOpen(true)}
          arDisabled={arBodies.length === 0}
          fallbackUsed={
            location.source === 'default' &&
            location.lat === FALLBACK_COORDS.lat &&
            location.lon === FALLBACK_COORDS.lon
          }
        />

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{tPage('visibleTonight')}</h2>
            <span className="section-meta">
              {sky.refreshedAt
                ? sky.refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                : '—'}
            </span>
          </div>
          <VisibleNow
            planets={sky.planets}
            featuredTarget={activeObject?.name}
            isCurrentlyDark={sky.isCurrentlyDark}
          />
        </section>

        <section className="section">
          <div className="section-head">
            <h2 className="section-title">{tPage('tonightTimeline')}</h2>
            <span className="section-meta dark-window-meta">
              <span>{tPage('darkWindow')}</span>
              <span className="times">{darkWindowLabel ?? '—'}</span>
            </span>
          </div>
          <ObservationTimeline data={sky.timeline} />
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

interface FinderRegionProps {
  loading: boolean;
  error: string | null;
  finder: FinderResponse | null;
  activeObject: SkyObject | null;
  activeId: ObjectId | null;
  autoRotate: boolean;
  onSelectTab: (id: ObjectId) => void;
  onToggleAuto: () => void;
  onPauseChange: (paused: boolean) => void;
  onRetry: () => void;
  onOpenAr: () => void;
  arDisabled: boolean;
  fallbackUsed: boolean;
}

function FinderRegion({
  loading,
  error,
  finder,
  activeObject,
  activeId,
  autoRotate,
  onSelectTab,
  onToggleAuto,
  onPauseChange,
  onRetry,
  onOpenAr,
  arDisabled,
  fallbackUsed,
}: FinderRegionProps) {
  const tPage = useTranslations('sky.page');
  const tErrors = useTranslations('sky.errors');
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const enter = () => onPauseChange(true);
    const leave = () => onPauseChange(false);
    el.addEventListener('mouseenter', enter);
    el.addEventListener('mouseleave', leave);
    el.addEventListener('focusin', enter);
    el.addEventListener('focusout', leave);
    return () => {
      el.removeEventListener('mouseenter', enter);
      el.removeEventListener('mouseleave', leave);
      el.removeEventListener('focusin', enter);
      el.removeEventListener('focusout', leave);
    };
  }, [onPauseChange]);

  // Filter Sun out of the finder UI — it's daytime-only and the rest of
  // the page is built around night-time targets. Sun stays in arBodies.
  const finderObjects = useMemo(
    () => (finder ? finder.objects.filter((o) => o.id !== 'sun') : []),
    [finder],
  );

  return (
    <section ref={sectionRef} className="finder-section">
      <h2 className="finder-heading">{tPage('title')}</h2>
      <p className="finder-subheading">{tPage('subtitle')}</p>

      {loading && !finder && (
        <>
          <div className="finder-skeleton finder-skeleton--hero" />
          <div className="finder-skeleton finder-skeleton--strip" />
          <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-dim)' }}>
            {tPage('detectingLocation')}
          </p>
        </>
      )}

      {error && (
        <div className="finder-error">
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" onClick={onRetry}>{tErrors('retry')}</button>
        </div>
      )}

      {fallbackUsed && finder && !error && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            background: 'rgba(255,209,102,0.06)',
            border: '1px solid rgba(255,209,102,0.18)',
            borderRadius: 10,
            fontSize: 12.5,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ flex: 1 }}>{tErrors('locationFallback')}</span>
          <button
            type="button"
            onClick={onRetry}
            style={{
              padding: '5px 10px',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              letterSpacing: '0.04em',
            }}
          >
            {tErrors('useMyLocation')}
          </button>
        </div>
      )}

      {finder && !error && (
        <>
          <ObjectTabs
            objects={finderObjects}
            activeId={activeId}
            onSelect={onSelectTab}
            autoRotate={autoRotate}
            onToggleAuto={onToggleAuto}
          />

          {activeObject ? (
            <>
              <DirectionHero object={activeObject} />
              <HintCards object={activeObject} />
            </>
          ) : (
            <div
              style={{
                padding: '32px 20px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 16,
                color: 'var(--text-muted)',
                textAlign: 'center',
                fontFamily: 'var(--serif)',
                fontStyle: 'italic',
                fontSize: 16,
              }}
            >
              {tPage('noVisible')}
            </div>
          )}

          <div className="finder-strip-wrap">
            <div className="finder-strip-head">
              <span>{tPage('horizonLabel')}</span>
              <span>{tPage('scrollHint')}</span>
            </div>
            <HorizonStrip
              objects={finderObjects}
              highlightedId={activeId ?? undefined}
              onObjectClick={onSelectTab}
            />
            <div className="finder-strip-scale">
              <span>{tPage('altitudeScale.horizon')}</span>
              <span>15°</span>
              <span>30°</span>
              <span>45°</span>
              <span>{tPage('altitudeScale.zenith')}</span>
            </div>
          </div>

          <div className="finder-actions">
            <button
              type="button"
              className="finder-action finder-action--primary"
              onClick={onOpenAr}
              disabled={arDisabled}
              aria-disabled={arDisabled}
            >
              {tPage('openArFinder')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
