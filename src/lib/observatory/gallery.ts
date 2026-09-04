/**
 * The network's captures, as anyone can see them.
 *
 * A capture row stores what was asked of the instrument — target, exposure,
 * subs, when — and not a picture, because the simulator's frames are drawn in
 * the browser rather than stored. So the gallery redraws each one from the
 * record, on the same canvas code and the same optics the session used. The
 * arithmetic is identical, which is the point: a frame must not look better
 * here than it did through the eyepiece.
 *
 * Provenance rides every row and is shown on every card. Nothing is filtered
 * out for looking weak — see `provenance.ts` for why hiding the distinction
 * would be the expensive kind of convenience.
 */

import { desc } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { observatoryCapture } from '@/lib/schema'
import { getNode } from './nodes'
import {
  DEFAULT_SEEING_ARCSEC,
  ROIS,
  ROI_BY_ID,
  TRAINS,
  TRAIN_BY_ID,
  fieldOfView,
  resolvingPowerArcsec,
} from './optics'
import type { Provenance } from './provenance'
import {
  SIM_TARGET_BY_ID,
  targetAltAz,
  targetFrameSpan,
  targetPhoto,
  targetSizeArcmin,
} from './sim-targets'

/** Everything the canvas needs to redraw one stored capture. */
export type FrameRecipe = {
  fovArcmin: number
  targetArcmin: number
  seeingArcsec: number
  diffractionArcsec: number
  plateScaleArcsecPx: number
  bortle: number
  subs: number
  gain: number
  rotationDeg: number
  seed: number
  frameSpan: number
  photoSrc: string
  showFieldStars: boolean
}

export type GalleryCapture = {
  id: string
  nodeId: string
  nodeName: string
  site: string
  targetName: string
  provenance: Provenance
  exposureSec: number
  subs: number
  /** Total integration, which is the number an imager actually compares. */
  integrationSec: number
  capturedAt: string
  instrument: string
  apertureMm: number
  /** True once the frame entered the Collection. Only instrument frames can. */
  admitted: boolean
  /** Null when the target or its reference photo is unknown — the card then
   *  shows the record without a picture rather than inventing one. */
  frame: FrameRecipe | null
}

/**
 * Gain is not recorded — it is a knob on the console, not a property of the
 * result — so the redraw uses the console's own default. A thumbnail is a
 * faithful reconstruction of the field, not of every slider position.
 */
const ASSUMED_GAIN = 40

export async function recentCaptures(limit = 24): Promise<GalleryCapture[]> {
  const db = getDb()
  if (!db) return []

  try {
    const rows = await db
      .select()
      .from(observatoryCapture)
      .orderBy(desc(observatoryCapture.capturedAt))
      .limit(limit)

    return rows.map(shape).filter((c): c is GalleryCapture => c !== null)
  } catch (err) {
    console.error('[observatory] cannot read the gallery', err)
    return []
  }
}

function shape(row: typeof observatoryCapture.$inferSelect): GalleryCapture | null {
  const node = getNode(row.nodeId)
  // A capture from a node that has since left the registry has nothing to
  // describe it — no optics, no site, no seeing. Better absent than wrong.
  if (!node) return null

  return {
    id: row.id,
    nodeId: node.id,
    nodeName: node.name,
    site: node.site,
    targetName: row.targetName,
    provenance: row.provenance === 'instrument' ? 'instrument' : 'simulated',
    exposureSec: row.exposureSec,
    subs: row.subs,
    integrationSec: row.exposureSec * row.subs,
    capturedAt: row.capturedAt.toISOString(),
    instrument: node.instrument.optics,
    apertureMm: node.instrument.apertureMm,
    admitted: row.observationLogId !== null,
    frame: recipe(row, node),
  }
}

function recipe(
  row: typeof observatoryCapture.$inferSelect,
  node: NonNullable<ReturnType<typeof getNode>>,
): FrameRecipe | null {
  const target = SIM_TARGET_BY_ID.get(row.targetId)
  if (!target) return null

  const photo = targetPhoto(target)
  if (!photo) return null

  // Redrawn through the configuration it was taken through, so a Barlowed,
  // cropped planet comes back the size the imager saw.
  const train = TRAIN_BY_ID.get(row.opticalTrain) ?? TRAINS[1]
  const roi = ROI_BY_ID.get(row.roi) ?? ROIS[0]
  const fov = fieldOfView(node.instrument, train, roi)
  const at = row.capturedAt
  // The same seed the console used: the pointing, rounded. Redrawing a capture
  // therefore lands on the field it actually recorded, not a fresh one.
  const pointing = targetAltAz(target, node, at)

  return {
    fovArcmin: fov.widthArcmin,
    targetArcmin: targetSizeArcmin(target, at),
    seeingArcsec: DEFAULT_SEEING_ARCSEC,
    diffractionArcsec: resolvingPowerArcsec(node.instrument),
    plateScaleArcsecPx: fov.plateScaleArcsecPx,
    bortle: node.bortle,
    subs: row.subs,
    gain: ASSUMED_GAIN,
    // Field rotation is a function of how long the stack ran, and the row does
    // not say when it began — only when it finished. Zero is the honest floor.
    rotationDeg: 0,
    seed: Math.round(pointing.altitude * 10) * 1000 + Math.round(pointing.azimuth * 10),
    frameSpan: targetFrameSpan(target),
    photoSrc: photo.src,
    // A bright sub is measured in milliseconds; no field star survives it.
    showFieldStars: target.brightness !== 'bright',
  }
}
