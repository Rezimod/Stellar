/**
 * The night, run once a day before dusk.
 *
 * First last night is closed: if it ended without a photograph and the sky
 * over the site was above the cloud limit at the hour the card was planned,
 * the night is recorded as lost, with the figure. Then tonight is decided,
 * once: a card carried from a night lost to cloud takes it if its object is
 * still up; otherwise the holders' weighted votes among the cards Node 01 can
 * photograph tonight; with no votes, the object standing highest.
 */

import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { card, cardVote, edition, nightlyTarget, observatoryCapture } from '@/lib/schema'
import { fetchOpenMeteo } from '@/lib/open-meteo'
import { CLOUD_LIMIT } from '@/lib/observatory/adapter'
import { utcHourStamp } from '@/lib/observatory/site-time'
import type { ObservatoryNode } from '@/lib/observatory/types'
import { isRarity } from '@/lib/rarity'
import type { Db } from './attach'
import { VOTE_WEIGHT } from './economics'
import { decideNightlyTarget } from './repo'
import { observableTonight, siteNightDate, standing, type Observable } from './target'

type CardRow = typeof card.$inferSelect
type NightRow = typeof nightlyTarget.$inferSelect

/** Cloud cover at the site for the hour containing `at`, percent, or null when not known. */
export type CloudAt = (node: ObservatoryNode, at: Date) => Promise<number | null>

/** Open-Meteo, one day back and two ahead: the same call serves last night's record and tonight's forecast. */
export const openMeteoCloudAt: CloudAt = async (node, at) => {
  const params = new URLSearchParams({
    latitude: String(node.lat),
    longitude: String(node.lon),
    hourly: 'cloud_cover',
    past_days: '1',
    forecast_days: '3',
  })
  try {
    const { data } = await fetchOpenMeteo<{ hourly: { time: string[]; cloud_cover: number[] } }>(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      { revalidate: 1800 },
    )
    const i = data.hourly.time.findIndex((t) => t.slice(0, 13) === utcHourStamp(at))
    return i >= 0 ? data.hourly.cloud_cover[i] ?? null : null
  } catch {
    return null
  }
}

export function addDays(night: string, days: number): string {
  return new Date(Date.parse(`${night}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)
}

export async function allCards(db: Db): Promise<CardRow[]> {
  return db.select().from(card)
}

export async function nightRow(db: Db, night: string): Promise<NightRow | null> {
  const [row] = await db.select().from(nightlyTarget).where(eq(nightlyTarget.nightDate, night))
  return row ?? null
}

/** The night a vote cast now counts for: tonight, or tomorrow once tonight is decided. */
export async function votingNight(db: Db, node: ObservatoryNode, now: Date): Promise<string> {
  const tonight = siteNightDate(node.timezone, now)
  return (await nightRow(db, tonight)) ? addDays(tonight, 1) : tonight
}

/** A holder's vote weight: VOTE_WEIGHT summed over every edition they hold. */
export async function voteWeight(db: Db, wallet: string): Promise<number> {
  const rows = await db
    .select({ rarity: card.rarity, n: sql<number>`count(*)::int` })
    .from(edition)
    .innerJoin(card, eq(card.id, edition.cardId))
    .where(eq(edition.ownerWallet, wallet))
    .groupBy(card.rarity)
  return rows.reduce((sum, r) => sum + (isRarity(r.rarity) ? VOTE_WEIGHT[r.rarity] * Number(r.n) : 0), 0)
}

/** Weighted votes per card id for a night. */
export async function tallies(db: Db, night: string): Promise<Map<string, number>> {
  const rows = await db
    .select({ cardId: cardVote.cardId, total: sql<number>`sum(${cardVote.weight})::int` })
    .from(cardVote)
    .where(eq(cardVote.nightDate, night))
    .groupBy(cardVote.cardId)
  return new Map(rows.map((r) => [r.cardId, Number(r.total)]))
}

/** Cast, or change, a holder's vote for a night. */
export async function castVote(db: Db, input: { wallet: string; cardId: string; night: string; weight: number }) {
  const values = { wallet: input.wallet, cardId: input.cardId, nightDate: input.night, weight: input.weight }
  await db
    .insert(cardVote)
    .values(values)
    .onConflictDoUpdate({
      target: [cardVote.wallet, cardVote.nightDate],
      set: { cardId: input.cardId, weight: input.weight, createdAt: new Date() },
    })
}

/**
 * The card a night goes to, and why, in words.
 *
 * `carried` is the card of a night lost to cloud; it takes this night if its
 * object is up. Otherwise the most weighted votes; a tie, or no votes at all,
 * goes to the object standing highest.
 */
export function chooseNight<C extends CardRow>(
  observable: Observable<C>[],
  votes: Map<string, number>,
  node: ObservatoryNode,
  night: string,
  carried: { cardId: string; night: string } | null,
): { chosen: Observable<C>; basis: string } | null {
  if (observable.length === 0) return null

  const rolled = carried && observable.find((o) => o.card.id === carried.cardId)
  if (rolled) {
    return {
      chosen: rolled,
      basis: `${rolled.card.designation}: carried from the night of ${carried.night}, which was lost to cloud. ${standing(rolled, node)}.`,
    }
  }

  const cast = observable.reduce((sum, o) => sum + (votes.get(o.card.id) ?? 0), 0)
  // `observable` is highest first, so the first of the most-voted is also the highest of them.
  const chosen = observable.reduce((best, o) => ((votes.get(o.card.id) ?? 0) > (votes.get(best.card.id) ?? 0) ? o : best))
  const own = votes.get(chosen.card.id) ?? 0
  const basis =
    cast === 0
      ? `${chosen.card.designation}: no holder voted for the night of ${night}. ${standing(chosen, node)}, the highest of ${observable.length} observable ${observable.length === 1 ? 'card' : 'cards'}.`
      : `${chosen.card.designation}: ${own} of ${cast} weighted votes cast by holders for the night of ${night}. ${standing(chosen, node)}.`
  return { chosen, basis }
}

/**
 * Close a night that ended without a photograph. Lost when the recorded cloud
 * at the planned hour is over the limit; left open otherwise — a clear night
 * without a photograph is Node 01 not working yet, not weather.
 */
export async function closeNight(db: Db, node: ObservatoryNode, night: string, now: Date, cloudAt: CloudAt): Promise<NightRow | null> {
  const row = await nightRow(db, night)
  if (!row || row.captureId || row.lostAt || !row.plannedAt) return row
  const cloud = await cloudAt(node, row.plannedAt)
  if (cloud === null || cloud <= CLOUD_LIMIT) return row

  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: node.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(row.plannedAt)
  const lostReason = `Cloud cover at ${node.site} was ${Math.round(cloud)}% at ${hour} local time, over the ${CLOUD_LIMIT}% limit.`
  const [lost] = await db
    .update(nightlyTarget)
    .set({ lostAt: now, lostReason })
    .where(and(eq(nightlyTarget.id, row.id), isNull(nightlyTarget.captureId), isNull(nightlyTarget.lostAt)))
    .returning()
  return lost ?? (await nightRow(db, night))
}

/** Close last night, then decide tonight. Safe to run twice. */
export async function runNight(db: Db, node: ObservatoryNode, now: Date, cloudAt: CloudAt = openMeteoCloudAt) {
  const tonight = siteNightDate(node.timezone, now)
  const last = await closeNight(db, node, addDays(tonight, -1), now, cloudAt)

  const existing = await nightRow(db, tonight)
  if (existing) return { night: tonight, last, decided: existing, fresh: false }

  const observable = observableTonight(await allCards(db), node, tonight)
  const carried = last?.lostAt ? { cardId: last.cardId, night: last.nightDate } : null
  const choice = chooseNight(observable, await tallies(db, tonight), node, tonight, carried)
  if (!choice) return { night: tonight, last, decided: null, fresh: false }

  const cloudForecast = await cloudAt(node, choice.chosen.at)
  const decided = await decideNightlyTarget(db, {
    nightDate: tonight,
    cardId: choice.chosen.card.id,
    decisionBasis: choice.basis,
    plannedAt: choice.chosen.at,
    cloudForecast: cloudForecast === null ? null : Math.round(cloudForecast),
  })
  return { night: tonight, last, decided, fresh: true }
}

export type TonightView = {
  night: string
  decided: {
    designation: string
    name: string
    rarity: string
    artUrl: string | null
    basis: string
    plannedAt: string | null
    cloudForecast: number | null
    capture: { capturedAt: string; nodeId: string; provenance: string; exposureSec: number; subs: number; opticalTrain: string } | null
  } | null
  voting: {
    night: string
    /** The card that takes the night regardless of votes, carried from a night lost to cloud. */
    carried: string | null
    candidates: Array<{ designation: string; name: string; altitudeDeg: number; at: string; votes: number }>
  }
  recent: Array<{ night: string; designation: string; name: string; result: 'photographed' | 'lost' | 'none'; lostReason: string | null }>
}

/** Everything /tonight prints, in one read. */
export async function tonightView(db: Db, node: ObservatoryNode, now: Date): Promise<TonightView> {
  const night = siteNightDate(node.timezone, now)
  const cards = await allCards(db)
  const byId = new Map(cards.map((c) => [c.id, c]))

  const row = await nightRow(db, night)
  let decided: TonightView['decided'] = null
  if (row) {
    const c = byId.get(row.cardId)
    const [capture] = row.captureId
      ? await db.select().from(observatoryCapture).where(eq(observatoryCapture.id, row.captureId))
      : []
    decided = {
      designation: c?.designation ?? '—',
      name: c?.name ?? '—',
      rarity: c?.rarity ?? 'common',
      artUrl: c?.artUrl ?? null,
      basis: row.decisionBasis,
      plannedAt: row.plannedAt?.toISOString() ?? null,
      cloudForecast: row.cloudForecast,
      capture: capture
        ? {
            capturedAt: capture.capturedAt.toISOString(),
            nodeId: capture.nodeId,
            provenance: capture.provenance,
            exposureSec: capture.exposureSec,
            subs: capture.subs,
            opticalTrain: capture.opticalTrain,
          }
        : null,
    }
  }

  const vNight = row ? addDays(night, 1) : night
  const before = row?.nightDate === addDays(vNight, -1) ? row : await nightRow(db, addDays(vNight, -1))
  const votes = await tallies(db, vNight)
  const observable = observableTonight(cards, node, vNight)
  const carriedCard = before?.lostAt ? observable.find((o) => o.card.id === before.cardId) : undefined

  const recent = await recentNights(db, night)
  return {
    night,
    decided,
    voting: {
      night: vNight,
      carried: carriedCard?.card.designation ?? null,
      candidates: observable.map((o) => ({
        designation: o.card.designation,
        name: o.card.name,
        altitudeDeg: o.altitudeDeg,
        at: o.at.toISOString(),
        votes: votes.get(o.card.id) ?? 0,
      })),
    },
    recent: recent.map((r) => ({
      night: r.night.nightDate,
      designation: r.designation,
      name: r.name,
      result: r.night.captureId ? 'photographed' : r.night.lostAt ? 'lost' : 'none',
      lostReason: r.night.lostAt ? r.night.lostReason : null,
    })),
  }
}

/** The nights before `night`, most recent first — the record /tonight prints beneath the night. */
export async function recentNights(db: Db, night: string, limit = 7) {
  const rows = await db
    .select({ night: nightlyTarget, designation: card.designation, name: card.name })
    .from(nightlyTarget)
    .innerJoin(card, eq(card.id, nightlyTarget.cardId))
    .where(lt(nightlyTarget.nightDate, night))
    .orderBy(desc(nightlyTarget.nightDate))
    .limit(limit)
  return rows
}
