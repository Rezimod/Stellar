import type { SolarBodyId } from '@/lib/solar-system/ephemeris';

export interface PlanetData {
  id: SolarBodyId;
  diameterKm: number;
  surfaceGravityMs2: number | null; // null for Sun
  meanSurfaceTempC: number | null; // null for gas giants without surface
  dayLengthHours: number;
  numberOfMoons: number;
  distanceFromEarthAu: number; // approximate at epoch
  atmosphereComposition: string[];
  orbitalPeriodDays: number;
  orbitalPeriodYears?: number;
}

/** Real planet data — sources: NASA JPL, Wikipedia Solar System facts.
 *  Distance from Earth varies; these are reasonable approximations.
 *  Atmosphere for bodies with none is empty array.
 */
export const PLANET_DATA: Record<SolarBodyId, PlanetData> = {
  sun: {
    id: 'sun',
    diameterKm: 1_391_000,
    surfaceGravityMs2: null,
    meanSurfaceTempC: 5_500, // photosphere
    dayLengthHours: 24.5, // ~25-35 days depending on latitude
    numberOfMoons: 0,
    distanceFromEarthAu: 1.0,
    atmosphereComposition: ['H', 'He'],
    orbitalPeriodDays: 0, // center of system
  },
  mercury: {
    id: 'mercury',
    diameterKm: 4_879,
    surfaceGravityMs2: 3.7,
    meanSurfaceTempC: 167, // highly variable: -173 to 427 °C
    dayLengthHours: 1_407.6, // 58.6 Earth days
    numberOfMoons: 0,
    distanceFromEarthAu: 0.7, // varies 0.55–1.45 AU
    atmosphereComposition: [],
    orbitalPeriodDays: 87.97,
    orbitalPeriodYears: 0.24,
  },
  venus: {
    id: 'venus',
    diameterKm: 12_104,
    surfaceGravityMs2: 8.87,
    meanSurfaceTempC: 465,
    dayLengthHours: 2_802, // 116.8 Earth days (retrograde)
    numberOfMoons: 0,
    distanceFromEarthAu: 0.4, // varies 0.38–0.62 AU
    atmosphereComposition: ['CO₂', 'N₂'],
    orbitalPeriodDays: 224.7,
    orbitalPeriodYears: 0.615,
  },
  earth: {
    id: 'earth',
    diameterKm: 12_742,
    surfaceGravityMs2: 9.81,
    meanSurfaceTempC: 15,
    dayLengthHours: 24,
    numberOfMoons: 1,
    distanceFromEarthAu: 0,
    atmosphereComposition: ['N₂', 'O₂', 'Ar'],
    orbitalPeriodDays: 365.25,
    orbitalPeriodYears: 1,
  },
  mars: {
    id: 'mars',
    diameterKm: 6_779,
    surfaceGravityMs2: 3.71,
    meanSurfaceTempC: -63,
    dayLengthHours: 24.6,
    numberOfMoons: 2,
    distanceFromEarthAu: 1.5, // varies 0.54–2.4 AU
    atmosphereComposition: ['CO₂', 'N₂', 'Ar'],
    orbitalPeriodDays: 686.971,
    orbitalPeriodYears: 1.88,
  },
  jupiter: {
    id: 'jupiter',
    diameterKm: 139_820,
    surfaceGravityMs2: null, // no solid surface
    meanSurfaceTempC: null,
    dayLengthHours: 9.9,
    numberOfMoons: 95, // as of 2024
    distanceFromEarthAu: 5.2, // varies 4–6 AU
    atmosphereComposition: ['H₂', 'He'],
    orbitalPeriodDays: 4_332.59,
    orbitalPeriodYears: 11.86,
  },
  saturn: {
    id: 'saturn',
    diameterKm: 116_460,
    surfaceGravityMs2: null,
    meanSurfaceTempC: null,
    dayLengthHours: 10.7,
    numberOfMoons: 146, // as of 2024
    distanceFromEarthAu: 9.5, // varies 8–10 AU
    atmosphereComposition: ['H₂', 'He'],
    orbitalPeriodDays: 10_759.22,
    orbitalPeriodYears: 29.46,
  },
  uranus: {
    id: 'uranus',
    diameterKm: 50_724,
    surfaceGravityMs2: null,
    meanSurfaceTempC: null,
    dayLengthHours: 16.1,
    numberOfMoons: 28,
    distanceFromEarthAu: 19.2, // varies 18–20 AU
    atmosphereComposition: ['H₂', 'He', 'CH₄'],
    orbitalPeriodDays: 30_688.5,
    orbitalPeriodYears: 84.01,
  },
  neptune: {
    id: 'neptune',
    diameterKm: 49_244,
    surfaceGravityMs2: null,
    meanSurfaceTempC: null,
    dayLengthHours: 16,
    numberOfMoons: 16,
    distanceFromEarthAu: 30, // varies 29.8–30.3 AU
    atmosphereComposition: ['H₂', 'He', 'CH₄'],
    orbitalPeriodDays: 60_182,
    orbitalPeriodYears: 164.79,
  },
  pluto: {
    id: 'pluto',
    diameterKm: 2_377,
    surfaceGravityMs2: 0.62,
    meanSurfaceTempC: -230,
    dayLengthHours: 153.3, // 6.4 Earth days
    numberOfMoons: 5,
    distanceFromEarthAu: 39.5, // varies 29.7–49.3 AU
    atmosphereComposition: ['N₂', 'CH₄', 'CO'],
    orbitalPeriodDays: 90_465,
    orbitalPeriodYears: 247.94,
  },
};

/** Format planet diameter for display. */
export function formatDiameter(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}M km`;
  if (km >= 1000) return `${(km / 1000).toFixed(1)}K km`;
  return `${Math.round(km)} km`;
}

/** Format temperature for display (null safe). */
export function formatTemperature(celsius: number | null): string {
  if (celsius === null) return '—';
  const f = (celsius * 9) / 5 + 32;
  return `${Math.round(celsius)}°C (${Math.round(f)}°F)`;
}

/** Format orbital period for display. */
export function formatOrbitalPeriod(planet: PlanetData): string {
  if (planet.orbitalPeriodYears) {
    if (planet.orbitalPeriodYears < 1) {
      return `${planet.orbitalPeriodDays.toFixed(0)} days`;
    }
    return `${planet.orbitalPeriodYears.toFixed(2)} years`;
  }
  return `${planet.orbitalPeriodDays.toFixed(0)} days`;
}

/** Format day length (rotation period). */
export function formatDayLength(hours: number): string {
  const days = hours / 24;
  if (days < 1) return `${hours.toFixed(1)} hours`;
  return `${days.toFixed(1)} days`;
}

/** Format surface gravity (null safe). */
export function formatGravity(ms2: number | null): string {
  if (ms2 === null) return '—';
  const earthGs = ms2 / 9.81;
  return `${ms2.toFixed(2)} m/s² (${earthGs.toFixed(2)}g)`;
}
