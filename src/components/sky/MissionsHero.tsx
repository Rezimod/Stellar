'use client';

import { useMemo, useEffect, useState } from 'react';
import { MISSIONS } from '@/lib/constants';
import { useAppState } from '@/hooks/useAppState';
import type { Mission } from '@/lib/types';
import { getVisiblePlanets } from '@/lib/planets';
import { useLocation } from '@/lib/location';
import JupiterArt from '@/components/sky/art/JupiterArt';
import SaturnArt from '@/components/sky/art/SaturnArt';
import MoonArt from '@/components/sky/art/MoonArt';
import NebulaArt from '@/components/sky/art/NebulaArt';
import GalaxyArt from '@/components/sky/art/GalaxyArt';
import StarCatalogArt from '@/components/sky/art/StarCatalogArt';

interface MissionsHeroProps {
  onStart: (mission: Mission) => void;
}

const ART_BY_ID: Record<string, React.ComponentType<{ className?: string }>> = {
  'jupiter': JupiterArt,
  'quick-jupiter': JupiterArt,
  'saturn': SaturnArt,
  'quick-saturn': SaturnArt,
  'moon': MoonArt,
  'orion': NebulaArt,
  'andromeda': GalaxyArt,
  'crab': NebulaArt,
  'pleiades': StarCatalogArt,
  'demo': JupiterArt,
  'free-observation': StarCatalogArt,
};

const COPY_BY_ID: Record<string, { kicker: string; tagline: string; equipment: string }> = {
  'jupiter':         { kicker: 'GAS GIANT · MAG −2.4',     tagline: 'Four Galilean moons visible tonight — a solar system in miniature, steady and bright.', equipment: 'Binoculars · Telescope 60mm+' },
  'quick-jupiter':   { kicker: 'GAS GIANT · MAG −2.4',     tagline: 'Four Galilean moons visible tonight — a solar system in miniature, steady and bright.', equipment: 'Binoculars · Telescope 60mm+' },
  'saturn':          { kicker: 'RINGED PLANET · MAG +0.6', tagline: 'The rings sit at their widest tilt this decade. A single glimpse will make you an astronomer for life.', equipment: 'Telescope 70mm+' },
  'quick-saturn':    { kicker: 'RINGED PLANET · MAG +0.6', tagline: 'The rings sit at their widest tilt this decade. A single glimpse will make you an astronomer for life.', equipment: 'Telescope 70mm+' },
  'moon':            { kicker: 'EARTH SATELLITE',          tagline: 'Low-angle sunlight on the terminator carves craters into sharp relief. Best detail of the month.', equipment: 'Naked eye · Any telescope' },
  'orion':           { kicker: 'M42 · DEEP SKY',           tagline: 'A star nursery, 1,344 light-years out. The fuzzy middle of Orion\'s sword.', equipment: 'Binoculars · Dark sky helps' },
  'andromeda':       { kicker: 'M31 · GALAXY',             tagline: 'The farthest thing you can see with the naked eye — a trillion suns, 2.5M light-years away.', equipment: 'Dark sky · Binoculars' },
  'pleiades':        { kicker: 'M45 · OPEN CLUSTER',       tagline: 'Seven sisters, bound by gravity and 100M years of shared history.', equipment: 'Naked eye · Binoculars' },
  'crab':            { kicker: 'M1 · SUPERNOVA REMNANT',   tagline: 'The ghost of a star that exploded in 1054 AD. Chinese astronomers logged it for 23 days.', equipment: 'Telescope 150mm+ · Dark sky' },
  'demo':            { kicker: 'DEMO · SEE THE FLOW',      tagline: 'Walk through the full Stellar loop without leaving the couch — real NFT, real Stars, no camera.', equipment: 'No equipment needed' },
  'free-observation':{ kicker: 'ANY SKY',                  tagline: 'Photograph anything above — stars, clouds, the Moon. The oracle seals the moment.', equipment: 'Any camera' },
};

export default function MissionsHero({ onStart }: MissionsHeroProps) {
  const { state } = useAppState();
  const { location } = useLocation();
  const [planetTimes, setPlanetTimes] = useState<Record<string, { rise: string; transit: string; altitude: number }>>({});

  const completedIds = useMemo(
    () => new Set(state.completedMissions.filter(m => m.status === 'completed').map(m => m.id)),
    [state.completedMissions]
  );

  const heroMission: Mission = useMemo(() => {
    const incomplete = MISSIONS.filter(m => m.repeatable || !completedIds.has(m.id));
    const demo = incomplete.find(m => m.demo && m.id !== 'free-observation');
    return demo ?? incomplete[0] ?? MISSIONS[0];
  }, [completedIds]);

  useEffect(() => {
    try {
      const res = getVisiblePlanets(location.lat ?? 41.7151, location.lon ?? 44.8271, new Date());
      const map: Record<string, { rise: string; transit: string; altitude: number }> = {};
      res.forEach(p => {
        const rise = p.rise instanceof Date ? p.rise : p.rise ? new Date(p.rise) : null;
        const transit = p.transit instanceof Date ? p.transit : p.transit ? new Date(p.transit) : null;
        map[p.key] = {
          rise: rise ? rise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          transit: transit ? transit.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
          altitude: Math.round(p.altitude ?? 0),
        };
      });
      setPlanetTimes(map);
    } catch { /* ignore */ }
  }, [location.lat, location.lon]);

  const Art = ART_BY_ID[heroMission.id] ?? StarCatalogArt;
  const copy = COPY_BY_ID[heroMission.id] ?? { kicker: heroMission.difficulty.toUpperCase(), tagline: heroMission.desc, equipment: heroMission.type === 'telescope' ? 'Telescope' : 'Naked eye' };
  const planetKey = heroMission.target?.toLowerCase() ?? heroMission.id;
  const times = planetTimes[planetKey] ?? null;

  const diffDots = heroMission.difficulty === 'Beginner' ? 1 : heroMission.difficulty === 'Intermediate' ? 2 : heroMission.difficulty === 'Hard' ? 3 : 4;

  return (
    <div
      className="relative grid grid-cols-1 md:grid-cols-[1.15fr_1fr] rounded-[20px] overflow-hidden mb-4"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'linear-gradient(135deg, rgba(132,101,203,0.08), rgba(56,240,255,0.04) 60%, transparent)',
      }}
    >
      <div className="relative px-6 py-7 sm:px-8 sm:py-8 min-h-[280px] sm:min-h-[340px] flex flex-col justify-between overflow-hidden">
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 pointer-events-none opacity-90">
          <Art className="w-[320px] h-[320px] sm:w-[440px] sm:h-[440px]" />
        </div>

        <div className="relative z-[2] flex flex-wrap items-center gap-2">
          <span
            className="text-[10px] uppercase px-2.5 py-1 rounded"
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.2em',
              color: 'var(--stars)',
              border: '1px solid rgba(255,209,102,0.35)',
            }}
          >
            PRIME TARGET
          </span>
          {times && (
            <span
              className="text-[10px]"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.5)' }}
            >
              RISES {times.rise} · PEAKS {times.transit}
            </span>
          )}
        </div>

        <div className="relative z-[2] mt-auto">
          <div
            className="text-[10px] mb-1.5"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)' }}
          >
            {copy.kicker}
          </div>
          <h2
            className="text-white leading-[0.9] m-0"
            style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 8vw, 68px)', fontWeight: 300 }}
          >
            {heroMission.name}
          </h2>
          <p
            className="mt-2.5 max-w-[340px]"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 15, color: 'rgba(242,240,234,0.65)', fontWeight: 300, lineHeight: 1.4 }}
          >
            {copy.tagline}
          </p>
        </div>
      </div>

      <div
        className="px-6 py-7 sm:px-8 sm:py-8 flex flex-col justify-between"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(6,9,18,0.4)' }}
      >
        <div>
          <div
            className="text-[10px] mb-3.5"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.4)' }}
          >
            MISSION PARAMETERS
          </div>

          <div
            className="flex flex-col gap-3 py-3.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ParamRow label="EQUIPMENT" value={copy.equipment} />
            {times && <ParamRow label="ALTITUDE" value={`${times.altitude}°`} mono />}
            <ParamRow label="DIFFICULTY" custom={
              <div className="flex gap-[3px]">
                {[0,1,2,3].map(i => (
                  <div key={i} className="w-4 h-[3px] rounded-[1px]" style={{ background: i < diffDots ? 'var(--stars)' : 'rgba(255,255,255,0.12)' }} />
                ))}
              </div>
            } />
            <ParamRow label="NFT RARITY" value="STELLAR · ASTRAL" mono color="var(--stl-teal)" />
          </div>

          <div className="flex items-baseline gap-3 mt-4">
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 44, color: 'var(--stars)', fontWeight: 400, lineHeight: 1 }}>
              +{heroMission.stars}
            </span>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', color: 'rgba(255,209,102,0.7)' }}>
                STARS EARNED
              </div>
              <div className="mt-0.5" style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
                +COSMIC BONUS ×1.0
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={() => onStart(heroMission)}
            className="flex-1 transition-all hover:-translate-y-[1px] active:scale-[0.98]"
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              background: '#F2F0EA',
              color: '#0A0E1A',
              border: 'none',
              padding: '14px 18px',
              fontSize: 15,
              fontWeight: 400,
              letterSpacing: '0.02em',
              borderRadius: 10,
            }}
          >
            Begin observation →
          </button>
        </div>
      </div>
    </div>
  );
}

function ParamRow({ label, value, custom, mono, color }: { label: string; value?: string; custom?: React.ReactNode; mono?: boolean; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
      {custom ?? (
        <span style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: mono ? 11 : 13, letterSpacing: mono ? '0.1em' : undefined, color: color ?? '#E8ECF4' }}>
          {value}
        </span>
      )}
    </div>
  );
}
