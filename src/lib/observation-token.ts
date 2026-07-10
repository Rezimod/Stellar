import { createHmac, timingSafeEqual } from 'crypto';

// HMAC verification token shared by /api/observe/verify (issuer),
// /api/observe/log and /api/mint (validators). The token signs the
// AI-derived observation facts so a client cannot fabricate a "verified"
// observation when minting an NFT or logging Stars.

export interface ObservationTokenFields {
  target: string;
  identifiedObject: string;
  confidence: string;
  capturedAt: string;
  fileHash: string;
  lat: number;
  lon: number;
  deviceTier: string;
  deviceMake: string;
  deviceModel: string;
  isInternetSourced: boolean;
  wallet: string;
  // Server-fetched cloud cover (0–100) at verify time. Signed here so /api/mint
  // can trust it (the client can't claim a clear sky) and reject overcast nights.
  cloudCover: number;
}

export type ObservationTokenResult =
  | { ok: true; payload: ObservationTokenPayload }
  | { ok: false; status: 401 | 503; reason: string };

export interface ObservationTokenPayload extends ObservationTokenFields {
  exp: number;
}

// Dedicated HMAC secret. Must be set to its own value — no third-party-key
// fallback, since anyone able to read that shared key could forge verification
// tokens for any wallet. If empty we refuse to sign/validate (callers 503)
// rather than use '' (which would be trivially forgeable).
export function getObservationTokenSecret(): string {
  return process.env.OBSERVATION_TOKEN_SECRET || '';
}

function canonicalPayload(fields: ObservationTokenPayload): string {
  return JSON.stringify({
    target: fields.target,
    identifiedObject: fields.identifiedObject,
    confidence: fields.confidence,
    capturedAt: fields.capturedAt,
    fileHash: fields.fileHash,
    lat: Number(fields.lat.toFixed(6)),
    lon: Number(fields.lon.toFixed(6)),
    deviceTier: fields.deviceTier,
    deviceMake: fields.deviceMake,
    deviceModel: fields.deviceModel,
    isInternetSourced: fields.isInternetSourced,
    wallet: fields.wallet,
    cloudCover: Math.round(fields.cloudCover),
    exp: fields.exp,
  });
}

function signPayload(payload: ObservationTokenPayload, secret: string): string {
  return createHmac('sha256', secret).update(canonicalPayload(payload)).digest('hex');
}

// Constant-time signature comparison — avoids leaking byte-match timing that
// could aid forging a token over many attempts (mirrors agent-token.ts).
function signaturesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function encodePayload(payload: ObservationTokenPayload): string {
  return Buffer.from(canonicalPayload(payload), 'utf8').toString('base64url');
}

function decodePayload(encoded: string): ObservationTokenPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ObservationTokenPayload;
    if (
      typeof parsed.target !== 'string' ||
      typeof parsed.identifiedObject !== 'string' ||
      typeof parsed.confidence !== 'string' ||
      typeof parsed.capturedAt !== 'string' ||
      typeof parsed.fileHash !== 'string' ||
      typeof parsed.lat !== 'number' ||
      typeof parsed.lon !== 'number' ||
      typeof parsed.deviceTier !== 'string' ||
      typeof parsed.deviceMake !== 'string' ||
      typeof parsed.deviceModel !== 'string' ||
      typeof parsed.isInternetSourced !== 'boolean' ||
      typeof parsed.wallet !== 'string' ||
      typeof parsed.cloudCover !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createObservationToken(fields: ObservationTokenFields): string | null {
  const secret = getObservationTokenSecret();
  if (!secret) return null;
  const payload: ObservationTokenPayload = {
    ...fields,
    lat: Number(fields.lat.toFixed(6)),
    lon: Number(fields.lon.toFixed(6)),
    exp: Date.now() + 30 * 60_000,
  };
  return `${encodePayload(payload)}.${signPayload(payload, secret)}`;
}

// Lightweight verification for observation-triggered rewards (cosmic_bonus,
// weekly_challenge). We only need proof that a genuine, unexpired observation
// token was issued for THIS wallet — not a re-match of every field. The HMAC
// signature makes the payload unforgeable, so the decoded confidence/fileHash/
// target can be trusted as inputs to the server-side reward decision.
export function verifyObservationTokenForWallet(
  token: string | undefined | null,
  wallet: string,
): ObservationTokenResult {
  if (!token) {
    return { ok: false, status: 401, reason: 'Missing verification token' };
  }
  const secret = getObservationTokenSecret();
  if (!secret) {
    return { ok: false, status: 503, reason: 'Server misconfigured' };
  }
  const [payloadPart, sig] = token.split('.');
  if (!payloadPart || !sig) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  const payload = decodePayload(payloadPart);
  if (!payload) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, status: 401, reason: 'Verification token expired' };
  }
  if (!signaturesEqual(signPayload(payload, secret), sig)) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  if (payload.wallet !== wallet) {
    return { ok: false, status: 401, reason: 'Verification token wallet mismatch' };
  }
  return { ok: true, payload };
}

// `cloudCover` is omitted from the match set: it is server-derived and read
// from the verified payload, never echoed by the caller. The HMAC signature
// (which covers cloudCover) already guarantees it wasn't tampered with.
export function verifyObservationToken(
  token: string | undefined | null,
  fields: Omit<ObservationTokenFields, 'cloudCover'>,
): ObservationTokenResult {
  if (!token) {
    return { ok: false, status: 401, reason: 'Missing verification token' };
  }
  const secret = getObservationTokenSecret();
  if (!secret) {
    return { ok: false, status: 503, reason: 'Server misconfigured' };
  }

  const [payloadPart, sig] = token.split('.');
  if (!payloadPart || !sig) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  const payload = decodePayload(payloadPart);
  if (!payload) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  if (payload.exp < Date.now()) {
    return { ok: false, status: 401, reason: 'Verification token expired' };
  }
  if (!signaturesEqual(signPayload(payload, secret), sig)) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }

  const expectedFields = {
    ...fields,
    lat: Number(fields.lat.toFixed(6)),
    lon: Number(fields.lon.toFixed(6)),
  };
  const matches =
    payload.target === expectedFields.target &&
    payload.identifiedObject === expectedFields.identifiedObject &&
    payload.confidence === expectedFields.confidence &&
    payload.capturedAt === expectedFields.capturedAt &&
    payload.fileHash === expectedFields.fileHash &&
    payload.lat === expectedFields.lat &&
    payload.lon === expectedFields.lon &&
    payload.deviceTier === expectedFields.deviceTier &&
    payload.deviceMake === expectedFields.deviceMake &&
    payload.deviceModel === expectedFields.deviceModel &&
    payload.isInternetSourced === expectedFields.isInternetSourced &&
    payload.wallet === expectedFields.wallet;

  if (!matches) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  return { ok: true, payload };
}
