/**
 * Which card the observatory photographs tonight.
 *
 * One object per night, and the rule for now is the plainest defensible one:
 * of the cards Node 01 can photograph, the one whose object stands highest in
 * the dark window, measured only where the safety envelope would let the
 * instrument point. Less atmosphere is a better photograph. Voting replaces
 * this rule later; the shape of the answer — a card, an instant, a reason in
 * words — stays.
 */

import { getTonightDarkWindow } from '@/lib/dark-window'
import type { card } from '@/lib/schema'
import { evaluateSafety } from '@/lib/observatory/safety'
import { SIM_TARGET_BY_ID, targetAltAz } from '@/lib/observatory/sim-targets'
import { siteDateStamp, siteLocalHours } from '@/lib/observatory/site-time'
import type { ObservatoryNode } from '@/lib/observatory/types'

type Card = typeof card.$inferSelect
type Candidate = Pick<Card, 'designation' | 'targetId' | 'observationStatus'>

export type TonightsTarget<C extends Candidate> = {
  card: C
  /** The instant the object is highest inside the envelope. */
  at: Date
  altitudeDeg: number
  decisionBasis: string
}

/** How finely the dark window is walked. The Moon moves half a degree in fifteen minutes. */
const STEP_MS = 15 * 60_000

/**
 * The night `now` belongs to, as the site's own date — "YYYY-MM-DD".
 *
 * A night is filed under the evening it starts on, so 01:00 on the 20th in
 * Tbilisi is still the night of the 19th. Before noon on the site's clock
 * counts as the night before, the same rule the dark window uses.
 */
export function siteNightDate(timezone: string, now: Date): string {
  return siteDateStamp(timezone, new Date(now.getTime() - 12 * 3_600_000))
}

/**
 * The dark window for the night that begins on `night` at the node, on the
 * site's clock rather than the server's.
 */
export function siteDarkWindow(node: ObservatoryNode, night: string) {
  return getTonightDarkWindow(node.lat, node.lon, siteNoon(node.timezone, night), node.timezone)
}

/**
 * Noon of `night` on the site's clock, as an instant.
 *
 * Midday UTC will not do: west of Greenwich it is still the morning of that
 * date, and the window search would walk back to the night before.
 */
function siteNoon(timezone: string, night: string): Date {
  const utcNoon = new Date(`${night}T12:00:00Z`)
  // The site's wall clock at UTC noon, counted in hours from midnight of
  // `night` — past 24 or below 0 when the site is already on another date.
  const stamp = siteDateStamp(timezone, utcNoon)
  const day = stamp === night ? 0 : stamp > night ? 24 : -24
  const offsetHours = siteLocalHours(timezone, utcNoon) + day - 12
  return new Date(utcNoon.getTime() - offsetHours * 3_600_000)
}

/** The instants of that night the node would actually work. */
function nightSamples(node: ObservatoryNode, night: string): Date[] {
  const dark = siteDarkWindow(node, night)
  if (!dark.duskStart || !dark.dawnEnd) return []

  const samples: Date[] = []
  for (let t = dark.duskStart.getTime(); t <= dark.dawnEnd.getTime(); t += STEP_MS) {
    const at = new Date(t)
    if (withinAvailability(node, at)) samples.push(at)
  }
  return samples
}

/** The operator's own hours, which may run past midnight (20 → 2). */
function withinAvailability(node: ObservatoryNode, at: Date): boolean {
  if (!node.availability) return true
  const { fromHourLocal: from, toHourLocal: to } = node.availability
  const hours = siteLocalHours(node.timezone, at)
  return from <= to ? hours >= from && hours < to : hours >= from || hours < to
}

export function pickTonightsTarget<C extends Candidate>(
  cards: C[],
  node: ObservatoryNode,
  night: string,
): TonightsTarget<C> | null {
  const candidates = cards
    .filter((c) => c.observationStatus === 'eligible' || c.observationStatus === 'dedicated')
    .filter((c) => SIM_TARGET_BY_ID.has(c.targetId))
    // Settled order, so a tie is decided the same way every time it is asked.
    .sort((a, b) => a.designation.localeCompare(b.designation))

  const samples = nightSamples(node, night)

  let best: Omit<TonightsTarget<C>, 'decisionBasis'> | null = null
  for (const c of candidates) {
    const target = SIM_TARGET_BY_ID.get(c.targetId)!
    for (const at of samples) {
      const position = targetAltAz(target, node, at)
      if (!evaluateSafety(node, position, at).ok) continue
      if (!best || position.altitude > best.altitudeDeg) {
        best = { card: c, at, altitudeDeg: position.altitude }
      }
    }
  }
  if (!best) return null

  const localTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: node.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(best.at)

  return {
    ...best,
    decisionBasis:
      `${best.card.designation}: ${SIM_TARGET_BY_ID.get(best.card.targetId)!.name} reaches ` +
      `${best.altitudeDeg.toFixed(1)}° at ${localTime} local time at ${node.site}, the highest safe altitude ` +
      `among ${candidates.length} observable ${candidates.length === 1 ? 'card' : 'cards'} ` +
      `on the night of ${night}.`,
  }
}
