/**
 * Where to look when your own sky is shut.
 *
 * The forecast has one honest failure: it tells a clouded-out person to give
 * up. That is the right answer for someone standing in a field with their own
 * telescope, and the wrong answer for a network — somewhere the sky is open,
 * and the whole product is being able to say where.
 *
 * The rule this module will not bend: a node is only offered when its sky is
 * *meaningfully* better than the visitor's. A network of one instrument in the
 * same city as the visitor has nothing to route to, and pretending otherwise
 * would sell a booking that changes nothing. docs/stellar-v2-plan.md §5 P3.
 */

import { count } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryOperatorInterest } from '@/lib/schema'
import { fetchSkyForecast } from '@/lib/sky-data'
import { attachForecast, buildSlots } from './availability'
import { adapterFor } from './nodes'
import { NODES } from './nodes'
import { heldSlots } from './reservations'
import { utcHourStamp } from './site-time'
import type { NodeReadiness, ObservatoryNode } from './types'

/**
 * How much clearer a node's sky must be before it is worth the trip.
 *
 * Percentage points of cloud. Below this the two skies are the same weather
 * system with noise on top, and moving a customer between them is theatre.
 */
export const BETTER_BY_POINTS = 20

export type RouteOption = {
  nodeId: string
  name: string
  site: string
  countryCode: string
  priceGel: number
  sessionMinutes: number
  readiness: NodeReadiness
  /** The soonest slot nobody holds. Null when the night is full or unknown. */
  nextSlot: { id: string; startsAt: string; endsAt: string; cloudCover: number | null } | null
}

export type Routing = {
  /** Cloud where the visitor is, right now. Null when the forecast is unreachable. */
  hereCloud: number | null
  /** Nodes clearly better off than the visitor, clearest first. */
  options: RouteOption[]
  /** A node was considered and shares the visitor's weather — say so, do not sell. */
  sameSky: boolean
  /** Instruments owners have registered that are not yet on the network. */
  registeredNotOnline: number
}

export async function routeFrom(lat: number, lon: number, now = new Date()): Promise<Routing> {
  const [hereCloud, registeredNotOnline] = await Promise.all([
    cloudAt(lat, lon, now),
    registeredCount(),
  ])

  // Readiness decides whether a node can work tonight; this only drops the
  // ones that are not part of the network at all.
  const candidates = NODES.filter((n) => n.status !== 'retired' && n.status !== 'suspended')
  const considered = await Promise.all(candidates.map((node) => consider(node, now)))

  const options: RouteOption[] = []
  let sameSky = false

  for (const option of considered) {
    if (!option) continue

    const cloud = option.readiness.cloudCover
    // Daylight and offline are not weather problems and are not solved by
    // booking: a node whose Sun is up cannot help tonight either.
    if (option.readiness.state === 'daylight' || option.readiness.state === 'offline') continue

    if (hereCloud === null || cloud === null) {
      // Without both numbers there is no comparison to make. Offer the node on
      // its own merits and let the surface avoid claiming it is better.
      options.push(option)
      continue
    }

    if (cloud <= hereCloud - BETTER_BY_POINTS) options.push(option)
    else sameSky = true
  }

  options.sort((a, b) => (a.readiness.cloudCover ?? 100) - (b.readiness.cloudCover ?? 100))

  return { hereCloud, options, sameSky, registeredNotOnline }
}

async function consider(node: ObservatoryNode, now: Date): Promise<RouteOption | null> {
  const readiness = await adapterFor(node).getReadiness(node, now)

  return {
    nodeId: node.id,
    name: node.name,
    site: node.site,
    countryCode: node.countryCode,
    priceGel: node.priceGel,
    sessionMinutes: node.sessionMinutes,
    readiness,
    nextSlot: await nextFreeSlot(node, now),
  }
}

/** The soonest slot on this node that nobody is holding. */
async function nextFreeSlot(node: ObservatoryNode, now: Date) {
  const slots = buildSlots(node, { now, nights: 2 })
  if (slots.length === 0) return null

  const held = await heldSlots(node.id, now, new Date(slots[slots.length - 1].endsAt))
  // A store that cannot answer reads as "everything is free", which would offer
  // a slot somebody already holds. Better to offer no slot than the wrong one.
  if (held === null) return null

  const free = slots.find((s) => !held.has(s.id))
  if (!free) return null

  const [withWeather] = await attachForecast(node, [free])
  return {
    id: withWeather.id,
    startsAt: withWeather.startsAt,
    endsAt: withWeather.endsAt,
    cloudCover: withWeather.cloudCover,
  }
}

/** Cloud over the visitor for the hour containing `now`. */
async function cloudAt(lat: number, lon: number, now: Date): Promise<number | null> {
  try {
    const days = await fetchSkyForecast(lat, lon)
    const stamp = utcHourStamp(now)
    for (const day of days) {
      const hour = day.hours.find((h) => h.time.slice(0, 13) === stamp)
      if (hour) return hour.cloudCover
    }
    return null
  } catch {
    return null
  }
}

/**
 * Telescopes owners have put their names to but that are not yet online.
 *
 * Shown as a count and nothing more. We know their city as free text and not
 * their coordinates, so any claim about *their* sky would be invented — and
 * the number alone is already the honest argument: this is what the network
 * is short of.
 */
async function registeredCount(): Promise<number> {
  const db = getDb()
  if (!db) return 0

  try {
    const [row] = await db.select({ n: count() }).from(observatoryOperatorInterest)
    return Number(row?.n ?? 0)
  } catch {
    return 0
  }
}
