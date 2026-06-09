import { createHmac } from 'crypto';

// HMAC verification token shared by /api/observe/verify (issuer),
// /api/observe/log and /api/mint (validators). The token signs the
// AI-derived observation facts so a client cannot fabricate a "verified"
// observation when minting an NFT or logging Stars.

export interface ObservationTokenFields {
  identifiedObject: string;
  confidence: string;
  capturedAt: string;
  fileHash: string;
  deviceTier: string;
  deviceMake: string;
  deviceModel: string;
  isInternetSourced: boolean;
  wallet: string;
}

export type ObservationTokenResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; reason: string };

// Dedicated HMAC secret. Falls back to ANTHROPIC_API_KEY for compat with tokens
// issued before the dedicated secret existed; if both are empty we refuse rather
// than sign/validate with '' (which would be trivially forgeable).
export function getObservationTokenSecret(): string {
  return process.env.OBSERVATION_TOKEN_SECRET || process.env.ANTHROPIC_API_KEY || '';
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

  const v2 = [
    fields.identifiedObject,
    fields.confidence,
    fields.capturedAt,
    fields.fileHash,
    fields.deviceTier,
    fields.deviceMake,
    fields.deviceModel,
    fields.isInternetSourced ? '1' : '0',
    fields.wallet,
  ].join(':');
  // Legacy tokens omitted wallet binding — disabled by default.
  // Set ALLOW_LEGACY_OBSERVE_TOKEN=true only for rollback.
  const legacy = [
    fields.identifiedObject,
    fields.confidence,
    fields.capturedAt,
    fields.fileHash,
    fields.deviceTier,
    fields.deviceMake,
    fields.deviceModel,
    fields.isInternetSourced ? '1' : '0',
  ].join(':');

  const expectedV2 = createHmac('sha256', secret).update(v2).digest('hex');
  const allowLegacy = process.env.ALLOW_LEGACY_OBSERVE_TOKEN === 'true';
  const expectedLegacy = createHmac('sha256', secret).update(legacy).digest('hex');

  if (token !== expectedV2 && (!allowLegacy || token !== expectedLegacy)) {
    return { ok: false, status: 401, reason: 'Invalid verification token' };
  }
  return { ok: true };
}
