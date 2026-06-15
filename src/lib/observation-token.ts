import { createHmac } from 'crypto';

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
}

export type ObservationTokenResult =
  | { ok: true; payload: ObservationTokenPayload }
  | { ok: false; status: 401 | 503; reason: string };

export interface ObservationTokenPayload extends ObservationTokenFields {
  exp: number;
}

// Dedicated HMAC secret. Falls back to ANTHROPIC_API_KEY for compat with tokens
// issued before the dedicated secret existed; if both are empty we refuse rather
// than sign/validate with '' (which would be trivially forgeable).
export function getObservationTokenSecret(): string {
  return process.env.OBSERVATION_TOKEN_SECRET || process.env.ANTHROPIC_API_KEY || '';
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
    exp: fields.exp,
  });
}

function signPayload(payload: ObservationTokenPayload, secret: string): string {
  return createHmac('sha256', secret).update(canonicalPayload(payload)).digest('hex');
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

export function verifyObservationToken(
  token: string | undefined | null,
  fields: ObservationTokenFields,
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
  const expected = signPayload(payload, secret);
  if (sig !== expected) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }

  const expectedFields: ObservationTokenFields = {
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
