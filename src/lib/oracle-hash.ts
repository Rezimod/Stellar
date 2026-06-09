// Shared sky-oracle hash. The same construction is used by /api/sky/verify to
// issue the hash and by /api/mint to re-derive and validate it. The hash binds
// an observation to a location + cloud-cover reading within a one-hour slot.

export function currentHourSlot(): number {
  return Math.floor(Date.now() / 3600000);
}

export async function computeOracleHash(
  lat: number,
  lon: number,
  cloudCover: number,
  hourSlot: number,
): Promise<string> {
  const hashInput = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)},${cloudCover},${hourSlot}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
  return '0x' + Array.from(new Uint8Array(hashBuffer)).slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join('');
}
