// When a photo was taken, as the client reports it, and how far that claim
// can be trusted. The visibility cross-check in /api/observe/verify is computed
// at this instant, so it has to be bounded: an unbounded value would let a
// client pick the hour at which the object happened to be above the horizon.

/** Gallery uploads may be this old. Matches the EXIF age check. */
export const CAPTURE_MAX_AGE_MS = 24 * 60 * 60_000;
/** Clock skew a phone is allowed. */
export const CAPTURE_FUTURE_SLACK_MS = 10 * 60_000;
/** An in-app capture is verified within seconds; this is generous. */
export const LIVE_CAPTURE_WINDOW_MS = 15 * 60_000;

export type CaptureTime =
  | { ok: false; reason: 'unparseable' | 'future' | 'too_old' }
  | { ok: true; at: Date; live: boolean };

export function classifyCaptureTime(capturedAt: string, now = Date.now()): CaptureTime {
  const ms = Date.parse(capturedAt);
  if (!Number.isFinite(ms)) return { ok: false, reason: 'unparseable' };
  if (ms > now + CAPTURE_FUTURE_SLACK_MS) return { ok: false, reason: 'future' };
  if (ms < now - CAPTURE_MAX_AGE_MS) return { ok: false, reason: 'too_old' };
  return { ok: true, at: new Date(ms), live: now - ms <= LIVE_CAPTURE_WINDOW_MS };
}

/**
 * 'camera' is a claim about how the photo entered the flow, and it doubles the
 * Stars. It is honoured only for a capture fresh enough to have been taken
 * in-app; anything else is an upload, whatever the client called it.
 */
export function normalizeUploadSource(declared: string, time: CaptureTime): 'camera' | 'upload' {
  return declared === 'camera' && time.ok && time.live ? 'camera' : 'upload';
}
