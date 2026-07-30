import type { ObservationTarget, VerificationConfidence } from '@/lib/types'

// Daytime subjects anyone can shoot with a bare phone: the Sun, the Moon while
// the Sun is still up, atmospheric optics (halo, sundog, rainbow, crepuscular
// rays, iridescence), and a plain log of today's sky.
const DAYTIME: ReadonlySet<ObservationTarget> = new Set<ObservationTarget>([
  'sun', 'daytime_moon', 'atmospheric', 'day_sky',
])

export function isDaytimeTarget(target: ObservationTarget): boolean {
  return DAYTIME.has(target)
}

// Confidence ceiling per subject. A daytime shot is genuinely verifiable — the
// Sun's altitude, the Moon's altitude and the cloud-cover cross-check all
// confirm it — but it is far easier to capture than Saturn through a telescope
// at 1am, so it tops out lower and therefore pays fewer Stars. Reward tables
// stay driven by confidence alone, so nothing downstream has to change.
const CEILING: Partial<Record<ObservationTarget, VerificationConfidence>> = {
  sun: 'low',
  day_sky: 'low',
  daytime_moon: 'medium',
  atmospheric: 'medium',
}

const RANK: Record<VerificationConfidence, number> = { rejected: 0, low: 1, medium: 2, high: 3 }

export function capConfidence(
  confidence: VerificationConfidence,
  target: ObservationTarget,
): VerificationConfidence {
  const ceiling = CEILING[target]
  if (!ceiling || confidence === 'rejected') return confidence
  return RANK[confidence] > RANK[ceiling] ? ceiling : confidence
}

// Subjects that cloud cover must never veto. A halo, a sundog, iridescence and
// crepuscular rays all *require* cloud — rejecting them for an overcast sky
// would be backwards — and a sky log is a record of whatever is up there.
export function overcastGateApplies(target: ObservationTarget): boolean {
  return target !== 'atmospheric' && target !== 'day_sky'
}
