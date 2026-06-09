// IANA timezone for each preset observing city, so the Sky page can show the
// *observing location's* local time — not the viewer's browser time. Without
// this, picking "New York" from Tbilisi shows a daytime NY sky under a "22:31"
// label; with it, the clock reads the real local time and matches the sky.

interface LocLike {
  city?: string;
  country?: string;
  lon?: number;
  source?: string;
}

const CITY_TZ: Record<string, string> = {
  'Tbilisi|GE': 'Asia/Tbilisi',
  'Batumi|GE': 'Asia/Tbilisi',
  'Yerevan|AM': 'Asia/Yerevan',
  'Baku|AZ': 'Asia/Baku',
  'Istanbul|TR': 'Europe/Istanbul',
  'Ankara|TR': 'Europe/Istanbul',
  'Tel Aviv|IL': 'Asia/Jerusalem',
  'Amman|JO': 'Asia/Amman',
  'New York|US': 'America/New_York',
  'Los Angeles|US': 'America/Los_Angeles',
  'Chicago|US': 'America/Chicago',
  'Houston|US': 'America/Chicago',
  'San Francisco|US': 'America/Los_Angeles',
  'Seattle|US': 'America/Los_Angeles',
  'Miami|US': 'America/New_York',
  'Denver|US': 'America/Denver',
  'Phoenix|US': 'America/Phoenix',
  'Toronto|CA': 'America/Toronto',
  'Vancouver|CA': 'America/Vancouver',
  'Montréal|CA': 'America/Toronto',
  'Mexico City|MX': 'America/Mexico_City',
  'São Paulo|BR': 'America/Sao_Paulo',
  'Rio de Janeiro|BR': 'America/Sao_Paulo',
  'Buenos Aires|AR': 'America/Argentina/Buenos_Aires',
  'Santiago|CL': 'America/Santiago',
  'Bogotá|CO': 'America/Bogota',
  'Berlin|DE': 'Europe/Berlin',
  'Munich|DE': 'Europe/Berlin',
  'Paris|FR': 'Europe/Paris',
  'London|GB': 'Europe/London',
  'Manchester|GB': 'Europe/London',
  'Dublin|IE': 'Europe/Dublin',
  'Rome|IT': 'Europe/Rome',
  'Milan|IT': 'Europe/Rome',
  'Madrid|ES': 'Europe/Madrid',
  'Barcelona|ES': 'Europe/Madrid',
  'Lisbon|PT': 'Europe/Lisbon',
  'Amsterdam|NL': 'Europe/Amsterdam',
  'Brussels|BE': 'Europe/Brussels',
  'Zürich|CH': 'Europe/Zurich',
  'Vienna|AT': 'Europe/Vienna',
  'Warsaw|PL': 'Europe/Warsaw',
  'Prague|CZ': 'Europe/Prague',
  'Budapest|HU': 'Europe/Budapest',
  'Athens|GR': 'Europe/Athens',
  'Stockholm|SE': 'Europe/Stockholm',
  'Oslo|NO': 'Europe/Oslo',
  'Copenhagen|DK': 'Europe/Copenhagen',
  'Helsinki|FI': 'Europe/Helsinki',
  'Kyiv|UA': 'Europe/Kyiv',
  'Tokyo|JP': 'Asia/Tokyo',
  'Osaka|JP': 'Asia/Tokyo',
  'Seoul|KR': 'Asia/Seoul',
  'Beijing|CN': 'Asia/Shanghai',
  'Shanghai|CN': 'Asia/Shanghai',
  'Hong Kong|HK': 'Asia/Hong_Kong',
  'Taipei|TW': 'Asia/Taipei',
  'Mumbai|IN': 'Asia/Kolkata',
  'Delhi|IN': 'Asia/Kolkata',
  'Bangalore|IN': 'Asia/Kolkata',
  'Karachi|PK': 'Asia/Karachi',
  'Dhaka|BD': 'Asia/Dhaka',
  'Singapore|SG': 'Asia/Singapore',
  'Kuala Lumpur|MY': 'Asia/Kuala_Lumpur',
  'Bangkok|TH': 'Asia/Bangkok',
  'Hanoi|VN': 'Asia/Ho_Chi_Minh',
  'Jakarta|ID': 'Asia/Jakarta',
  'Manila|PH': 'Asia/Manila',
  'Sydney|AU': 'Australia/Sydney',
  'Melbourne|AU': 'Australia/Melbourne',
  'Auckland|NZ': 'Pacific/Auckland',
};

/** Fixed-offset IANA zone from longitude (no DST) — last-resort fallback. */
function etcZoneFromLon(lon: number): string | undefined {
  if (typeof lon !== 'number' || !isFinite(lon)) return undefined;
  const off = Math.round(lon / 15); // hours east of UTC
  if (off === 0) return 'Etc/GMT';
  // Etc/GMT signs are inverted: Etc/GMT-4 == UTC+4.
  return `Etc/GMT${off > 0 ? '-' : '+'}${Math.abs(off)}`;
}

/**
 * IANA timezone to display the sky for. Preset cities use their real zone
 * (DST-correct). For a GPS/default fix the viewer is physically there, so the
 * browser zone (undefined → toLocale* default) is already correct. A manual
 * non-preset pick falls back to a longitude-derived fixed offset.
 */
export function zoneForLocation(loc: LocLike): string | undefined {
  const tz = CITY_TZ[`${loc.city}|${loc.country}`];
  if (tz) return tz;
  if (loc.source === 'gps') return undefined;
  return etcZoneFromLon(loc.lon ?? NaN);
}
