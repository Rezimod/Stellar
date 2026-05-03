export type ObjectId =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune';

export interface SkyObject {
  id: ObjectId;
  name: string;
  altitude: number;
  azimuth: number;
  magnitude: number;
  visible: boolean;
  nakedEye: boolean;
  compassDirection: string;
  fistsAboveHorizon: number;
  riseTime: string | null;
  setTime: string | null;
  phase: number | null;
}

export interface TwilightTimes {
  civilDusk: string | null;
  nauticalDusk: string | null;
  astronomicalDusk: string | null;
  astronomicalDawn: string | null;
  nauticalDawn: string | null;
  civilDawn: string | null;
}

export interface FinderResponse {
  observerLocation: { lat: number; lon: number; name: string | null };
  generatedAt: string;
  conditions: {
    cloudCoverPct: number;
    quality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    summary: string;
  };
  objects: SkyObject[];
  twilight?: TwilightTimes;
}
