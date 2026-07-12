import { getVisiblePlanets } from '@/lib/planets';

export type ZodiacSign =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

const ZODIAC_SIGNS: ZodiacSign[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

const ZODIAC_DATES: Record<ZodiacSign, { start: [number, number]; end: [number, number] }> = {
  aries: { start: [3, 21], end: [4, 19] },
  taurus: { start: [4, 20], end: [5, 20] },
  gemini: { start: [5, 21], end: [6, 20] },
  cancer: { start: [6, 21], end: [7, 22] },
  leo: { start: [7, 23], end: [8, 22] },
  virgo: { start: [8, 23], end: [9, 22] },
  libra: { start: [9, 23], end: [10, 22] },
  scorpio: { start: [10, 23], end: [11, 21] },
  sagittarius: { start: [11, 22], end: [12, 21] },
  capricorn: { start: [12, 22], end: [1, 19] },
  aquarius: { start: [1, 20], end: [2, 18] },
  pisces: { start: [2, 19], end: [3, 20] },
};

function getSunSign(month: number, day: number): ZodiacSign {
  for (const sign of ZODIAC_SIGNS) {
    const { start, end } = ZODIAC_DATES[sign];
    const [startMonth, startDay] = start;
    const [endMonth, endDay] = end;

    if (startMonth === endMonth) {
      if (month === startMonth && day >= startDay && day <= endDay) return sign;
    } else if (startMonth < endMonth) {
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return sign;
      }
    } else {
      if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
        return sign;
      }
    }
  }
  return 'aries';
}

function getMoonSign(sunSign: ZodiacSign, hour: number, minute: number): ZodiacSign {
  const timeOfDay = hour + minute / 60;
  const dayPhase = timeOfDay / 24;
  const moonAdvance = (dayPhase * 13.2) % 12;
  const sunIndex = ZODIAC_SIGNS.indexOf(sunSign);
  const moonIndex = (sunIndex + Math.floor(moonAdvance)) % 12;
  return ZODIAC_SIGNS[moonIndex];
}

function getRisingSign(
  sunSign: ZodiacSign,
  hour: number,
  minute: number,
  lat: number,
): ZodiacSign {
  const timeOfDay = hour + minute / 60;
  const latFactor = Math.abs(lat) / 90;
  const timeAdvance = (timeOfDay / 24) * 12;
  const risingAdvance = (timeAdvance + latFactor * 6) % 12;
  const sunIndex = ZODIAC_SIGNS.indexOf(sunSign);
  const risingIndex = (sunIndex + Math.floor(risingAdvance)) % 12;
  return ZODIAC_SIGNS[risingIndex];
}

function getPlanetSigns(
  date: Date,
  lat: number,
  lon: number,
): Record<string, ZodiacSign> {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const planets = getVisiblePlanets(lat, lon, date);
  const planetSigns: Record<string, ZodiacSign> = {};

  for (const planet of planets) {
    const altitude = planet.altitude || 0;
    const altitudeNorm = (altitude + 90) / 180;
    const zodiacOffset = Math.floor(altitudeNorm * 12) % 12;
    const sunSign = getSunSign(month, day);
    const sunIndex = ZODIAC_SIGNS.indexOf(sunSign);
    const planetSignIndex = (sunIndex + zodiacOffset) % 12;
    planetSigns[planet.key] = ZODIAC_SIGNS[planetSignIndex];
  }

  return planetSigns;
}

export interface NatalChart {
  birthDate: Date;
  location: {
    lat: number;
    lon: number;
    name: string;
  };
  sunSign: ZodiacSign;
  moonSign: ZodiacSign;
  risingSign: ZodiacSign;
  planetSigns: Record<string, ZodiacSign>;
  houses: Record<string, ZodiacSign>;
}

export function computeNatalChart(
  birthDate: Date,
  birthTime: string,
  lat: number,
  lon: number,
  locationName: string,
): NatalChart {
  const [hour, minute] = birthTime.split(':').map(Number);

  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();

  const sunSign = getSunSign(month, day);
  const moonSign = getMoonSign(sunSign, hour, minute);
  const risingSign = getRisingSign(sunSign, hour, minute, lat);

  const planetSigns = getPlanetSigns(birthDate, lat, lon);

  const houses: Record<string, ZodiacSign> = {};
  for (let i = 1; i <= 12; i++) {
    const houseAdvance = (i * 30) % 12;
    const risingIndex = ZODIAC_SIGNS.indexOf(risingSign);
    const houseIndex = (risingIndex + Math.floor(houseAdvance / 30)) % 12;
    houses[`house_${i}`] = ZODIAC_SIGNS[houseIndex];
  }

  return {
    birthDate,
    location: { lat, lon, name: locationName },
    sunSign,
    moonSign,
    risingSign,
    planetSigns,
    houses,
  };
}

export function getZodiacEmoji(sign: ZodiacSign): string {
  const emojis: Record<ZodiacSign, string> = {
    aries: '♈',
    taurus: '♉',
    gemini: '♊',
    cancer: '♋',
    leo: '♌',
    virgo: '♍',
    libra: '♎',
    scorpio: '♏',
    sagittarius: '♐',
    capricorn: '♑',
    aquarius: '♒',
    pisces: '♓',
  };
  return emojis[sign];
}

export function capitalizeSign(sign: ZodiacSign): string {
  return sign.charAt(0).toUpperCase() + sign.slice(1);
}
