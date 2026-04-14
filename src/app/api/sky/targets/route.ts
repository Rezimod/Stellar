import { NextRequest, NextResponse } from 'next/server';
import { Observer, Horizon, Equator, Body } from 'astronomy-engine';
import { getVisiblePlanets } from '@/lib/planets';
import { MISSIONS } from '@/lib/constants';

export type EquipmentType = 'naked_eye' | 'binoculars' | 'telescope';

export interface TargetResult {
  missionId: string;
  name: string;
  emoji: string;
  target: string | null;
  visible: boolean;
  altitude: number | null;
  difficulty: string;
  stars: number;
  equipment: EquipmentType;
  reason: string;
}

// Fixed RA/Dec for deep sky objects (RA in hours, Dec in degrees)
const DSO_COORDS: Record<string, { ra: number; dec: number }> = {
  orion:    { ra: 5.588, dec: -5.39  }, // M42 Orion Nebula
  pleiades: { ra: 3.783, dec: 24.12  }, // M45 Pleiades
  andromeda:{ ra: 0.712, dec: 41.27  }, // M31 Andromeda Galaxy
  crab:     { ra: 5.575, dec: 22.01  }, // M1 Crab Nebula
};

const EQUIPMENT_MAP: Record<string, EquipmentType> = {
  'free-observation': 'naked_eye',
  moon:       'naked_eye',
  pleiades:   'naked_eye',
  jupiter:    'binoculars',
  saturn:     'telescope',
  orion:      'telescope',
  andromeda:  'telescope',
  crab:       'telescope',
  mars:       'telescope',
  mercury:    'naked_eye',
  venus:      'naked_eye',
};

function getDSOAltitude(id: string, lat: number, lon: number, date: Date): number | null {
  const coords = DSO_COORDS[id];
  if (!coords) return null;
  try {
    const observer = new Observer(lat, lon, 0);
    const horiz = Horizon(date, observer, coords.ra, coords.dec, 'normal');
    return Math.round(horiz.altitude * 10) / 10;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  const lat = Number(latParam);
  const lon = Number(lonParam);

  if (!latParam || !lonParam || !isFinite(lat) || !isFinite(lon)) {
    return NextResponse.json({ error: 'lat and lon are required' }, { status: 400 });
  }

  const now = new Date();

  // Get current planet positions
  const planets = getVisiblePlanets(lat, lon, now);
  const planetMap = new Map(planets.map(p => [p.key, p]));

  // Skip demo mission; process all others
  const targets: TargetResult[] = MISSIONS
    .filter(m => !m.demo)
    .map(mission => {
      const equipment = EQUIPMENT_MAP[mission.id] ?? 'telescope';

      // Free observation — always available
      if (mission.target === null) {
        return {
          missionId: mission.id,
          name: mission.name,
          emoji: mission.emoji,
          target: null,
          visible: true,
          altitude: null,
          difficulty: mission.difficulty,
          stars: mission.stars,
          equipment,
          reason: 'Available any clear night',
        };
      }

      // Planet missions
      const planetKey = ['moon', 'jupiter', 'saturn', 'mars', 'mercury', 'venus'].find(k => mission.id === k);
      if (planetKey) {
        const planet = planetMap.get(planetKey);
        const altitude = planet ? planet.altitude : null;
        const visible = altitude !== null && altitude > 10;
        let reason: string;
        if (altitude === null) {
          reason = 'Position unknown';
        } else if (!visible) {
          reason = 'Below horizon';
        } else {
          reason = `${altitude}° altitude, ${altitude > 30 ? 'excellent' : 'good'} viewing`;
        }
        return {
          missionId: mission.id,
          name: mission.name,
          emoji: mission.emoji,
          target: mission.id,
          visible,
          altitude,
          difficulty: mission.difficulty,
          stars: mission.stars,
          equipment,
          reason,
        };
      }

      // DSO missions
      const dsoAlt = getDSOAltitude(mission.id, lat, lon, now);
      const visible = dsoAlt !== null && dsoAlt > 15;
      let reason: string;
      if (dsoAlt === null) {
        reason = 'Visibility unknown';
      } else if (!visible) {
        reason = 'Below horizon tonight';
      } else if (['andromeda', 'crab'].includes(mission.id)) {
        reason = `${dsoAlt}° altitude — requires dark skies`;
      } else {
        reason = `${dsoAlt}° altitude — visible tonight`;
      }

      return {
        missionId: mission.id,
        name: mission.name,
        emoji: mission.emoji,
        target: mission.id,
        visible,
        altitude: dsoAlt,
        difficulty: mission.difficulty,
        stars: mission.stars,
        equipment,
        reason,
      };
    });

  // Sort: visible first (by stars desc), then non-visible
  targets.sort((a, b) => {
    if (a.visible !== b.visible) return a.visible ? -1 : 1;
    return b.stars - a.stars;
  });

  return NextResponse.json(targets.slice(0, 6), {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  });
}
