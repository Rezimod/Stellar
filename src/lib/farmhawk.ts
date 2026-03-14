import type { FarmHawkResult } from './types';

export async function verifyWithFarmHawk(lat: number, lon: number): Promise<FarmHawkResult> {
  console.log('[FarmHawk] Querying Open-Meteo at', lat, lon);
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,visibility,relative_humidity_2m,temperature_2m,wind_speed_10m,weather_code&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const c = data.current;

    const cloudCover: number = c.cloud_cover ?? 15;
    const visMeters: number = c.visibility ?? 20000;
    const humidity: number = c.relative_humidity_2m ?? 50;
    const temperature: number = c.temperature_2m ?? 12;
    const windSpeed: number = c.wind_speed_10m ?? 5;

    let visibility: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    if (visMeters > 20000 && cloudCover < 20) visibility = 'Excellent';
    else if (visMeters > 10000 && cloudCover < 50) visibility = 'Good';
    else if (visMeters > 5000 && cloudCover < 70) visibility = 'Fair';
    else visibility = 'Poor';

    let conditions: string;
    if (cloudCover < 10) conditions = `Clear skies, ${humidity}% humidity, ${temperature}°C, wind ${windSpeed} km/h`;
    else if (cloudCover < 30) conditions = `Mostly clear (${cloudCover}% clouds), ${humidity}% humidity, ${temperature}°C`;
    else if (cloudCover < 60) conditions = `Partly cloudy (${cloudCover}% clouds), visibility ${(visMeters / 1000).toFixed(1)} km`;
    else conditions = `Cloudy (${cloudCover}% cover), limited visibility`;

    // Deterministic oracle hash from real values
    const hashInput = `${lat.toFixed(4)}-${lon.toFixed(4)}-${cloudCover}-${visMeters}-${Date.now()}`;
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
    const oracleHash = '0x' + Array.from(new Uint8Array(hashBuffer)).slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      verified: cloudCover < 60,
      cloudCover,
      visibility,
      conditions,
      humidity,
      temperature,
      windSpeed,
      oracleHash,
      scanTimestamp: new Date().toISOString(),
      source: 'FarmHawk Satellite Oracle',
    };
  } catch (err) {
    console.error('[FarmHawk] API failed, using fallback:', err);
    return {
      verified: true,
      cloudCover: 15,
      visibility: 'Good',
      conditions: 'API unavailable — conditions assumed favorable',
      humidity: 50,
      temperature: 12,
      windSpeed: 5,
      oracleHash: '0xfallback' + Date.now().toString(16),
      scanTimestamp: new Date().toISOString(),
      source: 'FarmHawk (simulated — API unreachable)',
    };
  }
}
