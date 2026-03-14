import type { FarmHawkResult } from './types';

export async function verifyWithFarmHawk(lat: number, lon: number): Promise<FarmHawkResult> {
  console.log('[FarmHawk] Verifying observation at', lat, lon);
  await new Promise(r => setTimeout(r, 1500));
  const cloud = Math.floor(Math.random() * 25);
  return {
    verified: cloud < 40,
    cloudCover: cloud,
    visibility: cloud < 15 ? 'Excellent' : cloud < 30 ? 'Good' : 'Poor',
    conditions: cloud < 15 ? 'Clear skies, low humidity' : 'Partly cloudy, acceptable',
    oracleHash: '0x' + [...Array(40)].map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join(''),
  };
}
