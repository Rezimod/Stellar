export type DeviceTier = 'camera' | 'smartphone' | 'unknown';

const CAMERA_MAKES = new Set([
  'canon', 'nikon', 'sony', 'fujifilm', 'fuji', 'panasonic', 'olympus',
  'om digital solutions', 'pentax', 'leica', 'hasselblad', 'sigma', 'ricoh',
]);

const SMARTPHONE_MAKES = new Set([
  'apple', 'samsung', 'google', 'xiaomi', 'huawei', 'oneplus', 'oppo',
  'vivo', 'motorola', 'realme', 'honor',
]);

export function classifyDevice(make: string | null, model: string | null): DeviceTier {
  const m = (make ?? '').trim().toLowerCase();
  if (!m) return 'unknown';
  if (CAMERA_MAKES.has(m)) return 'camera';
  if (SMARTPHONE_MAKES.has(m)) return 'smartphone';

  // Fallback by model heuristic: "iPhone" appears under make=Apple, but defensively check
  const md = (model ?? '').trim().toLowerCase();
  if (md.includes('iphone') || md.includes('pixel') || md.includes('galaxy')) return 'smartphone';
  return 'unknown';
}

export function tierToChar(tier: DeviceTier): 'C' | 'S' | 'U' {
  if (tier === 'camera') return 'C';
  if (tier === 'smartphone') return 'S';
  return 'U';
}
