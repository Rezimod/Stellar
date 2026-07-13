'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { X, Sparkles, MessageSquare, Telescope } from 'lucide-react';
import type { SolarBodyId } from '@/lib/solar-system/ephemeris';
import { PLANET_DATA, formatDiameter, formatTemperature, formatOrbitalPeriod, formatDayLength, formatGravity } from '@/lib/solar-system/planet-data';
import { getPlanetVisibility, type VisibilityWindow } from '@/lib/solar-system/planet-visibility';
import { useObserverLocation } from '@/hooks/useObserverLocation';

export interface PlanetDetailPanelProps {
  bodyId: SolarBodyId;
  bodyName: string;
  bodyBlurb: string;
  onClose: () => void;
}

export function PlanetDetailPanel({
  bodyId,
  bodyName,
  bodyBlurb,
  onClose,
}: PlanetDetailPanelProps) {
  const t = useTranslations('solarSystem.detail');
  const tPlanet = useTranslations('solarSystem.bodies');
  const format = useFormatter();
  const router = useRouter();
  const { lat, lng } = useObserverLocation();

  const [visibility, setVisibility] = useState<VisibilityWindow | null>(null);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  const data = useMemo(() => PLANET_DATA[bodyId], [bodyId]);

  // Load visibility data
  useEffect(() => {
    if (!lat || !lng) return;
    setVisibilityLoading(true);
    try {
      const vis = getPlanetVisibility(bodyId, lat, lng);
      setVisibility(vis);
    } catch (err) {
      console.error('visibility error:', err);
    } finally {
      setVisibilityLoading(false);
    }
  }, [bodyId, lat, lng]);

  const formatTime = (date: Date | null | undefined) => {
    if (!date) return '—';
    try {
      return format.dateTime(date, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return date.toLocaleTimeString();
    }
  };

  const handleAskTheSky = useCallback(() => {
    const query = `Tell me about observing ${bodyName} tonight`;
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }, [bodyName, router]);

  const handleGearRecommender = useCallback(() => {
    // For now, link to gear page with planet interest pre-selected
    const planetMap: Record<SolarBodyId, string> = {
      sun: 'moon', // Sun doesn't make sense, default to moon
      mercury: 'planets',
      venus: 'planets',
      earth: 'moon',
      mars: 'planets',
      jupiter: 'planets',
      saturn: 'planets',
      uranus: 'planets',
      neptune: 'planets',
      pluto: 'planets',
    };
    const interest = planetMap[bodyId] || 'planets';
    router.push(`/gear?interest=${interest}`);
  }, [bodyId, router]);

  return (
    <aside className="solar-system__sheet" aria-label={t('title')}>
      <div className="solar-system__sheet-head">
        <h2 className="solar-system__sheet-title">
          <Sparkles size={16} aria-hidden className="text-accent" />
          {bodyName}
        </h2>
        <button
          type="button"
          className="solar-system__sheet-x"
          onClick={onClose}
          aria-label={t('closeSheet')}
        >
          <X size={20} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <p className="solar-system__sheet-blurb">{bodyBlurb}</p>

      {/* Core physical data */}
      <div className="solar-system__data-section">
        <h3 className="solar-system__data-title">{t('physicalData')}</h3>
        <dl className="solar-system__dl solar-system__dl--sheet">
          <div>
            <dt>{t('diameter')}</dt>
            <dd>{formatDiameter(data.diameterKm)}</dd>
          </div>
          {data.surfaceGravityMs2 !== null && (
            <div>
              <dt>{t('gravity')}</dt>
              <dd>{formatGravity(data.surfaceGravityMs2)}</dd>
            </div>
          )}
          {data.meanSurfaceTempC !== null && (
            <div>
              <dt>{t('meanTemp')}</dt>
              <dd>{formatTemperature(data.meanSurfaceTempC)}</dd>
            </div>
          )}
          <div>
            <dt>{t('dayLength')}</dt>
            <dd>{formatDayLength(data.dayLengthHours)}</dd>
          </div>
          <div>
            <dt>{t('moons')}</dt>
            <dd>{data.numberOfMoons}</dd>
          </div>
          <div>
            <dt>{t('orbitalPeriod')}</dt>
            <dd>{formatOrbitalPeriod(data)}</dd>
          </div>
        </dl>
      </div>

      {/* Atmosphere */}
      {data.atmosphereComposition.length > 0 && (
        <div className="solar-system__data-section">
          <h3 className="solar-system__data-title">{t('atmosphere')}</h3>
          <p className="solar-system__data-value">{data.atmosphereComposition.join(', ')}</p>
        </div>
      )}

      {/* Visibility tonight */}
      {visibility && (
        <div className="solar-system__data-section">
          <h3 className="solar-system__data-title">{t('visibleTonight')}</h3>
          {visibilityLoading ? (
            <p className="text-sm text-muted">{t('loading')}</p>
          ) : (
            <dl className="solar-system__dl solar-system__dl--compact">
              {visibility.riseTime && (
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t('rises')}</dt>
                  <dd className="text-sm font-medium">{formatTime(visibility.riseTime)}</dd>
                </div>
              )}
              {visibility.transitTime && (
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t('peaks')}</dt>
                  <dd className="text-sm font-medium">{formatTime(visibility.transitTime)}</dd>
                </div>
              )}
              {visibility.setTime && (
                <div>
                  <dt className="text-xs uppercase tracking-wide">{t('sets')}</dt>
                  <dd className="text-sm font-medium">{formatTime(visibility.setTime)}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide">{t('maxAltitude')}</dt>
                <dd className="text-sm font-medium">{visibility.maxAltitude.toFixed(1)}°</dd>
              </div>
            </dl>
          )}
        </div>
      )}

      {/* AI feature buttons */}
      <div className="solar-system__ai-actions">
        <button
          type="button"
          className="solar-system__ai-btn"
          onClick={handleAskTheSky}
          title={`Ask ASTRA about observing ${bodyName}`}
        >
          <MessageSquare size={16} aria-hidden />
          <span>{t('askTheSky')}</span>
        </button>
        <button
          type="button"
          className="solar-system__ai-btn"
          onClick={handleGearRecommender}
          title={`Get gear recommendations for observing ${bodyName}`}
        >
          <Telescope size={16} aria-hidden />
          <span>{t('gearRecommender')}</span>
        </button>
      </div>

      <Link href="/sky" className="solar-system__sheet-link">
        {tPlanet('back' as any)}
      </Link>
    </aside>
  );
}
