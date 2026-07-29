// Temporary beta certification window: every submitted photo certifies as a
// verified observation. None of the authenticity gates (hash dedup, EXIF GPS /
// age, reverse-image, screenshot / AI detection, overcast) reject a submission
// while this is open — they still run and their findings are still recorded, so
// the observation_log keeps the truth about each photo.
//
// Self-expiring: opened 2026-07-30, closes 2026-08-04T00:00:00Z (5 days). After
// that instant the full pipeline applies again with no code change. Delete this
// module and its two call sites (`src/app/api/observe/verify/route.ts`,
// `src/app/api/mint/route.ts`) once the window has passed.
export const CERTIFY_ALL_UNTIL_MS = Date.UTC(2026, 7, 4, 0, 0, 0);

export function certifyAllObservations(): boolean {
  return Date.now() < CERTIFY_ALL_UNTIL_MS;
}
