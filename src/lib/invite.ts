/** The closed beta's codes, from SIDERA_INVITE_CODES. None means there is no gate. */
export const INVITE_COOKIE = 'sidera_invite';

export function inviteCodes(): string[] {
  return (process.env.SIDERA_INVITE_CODES ?? '').split(',').map((c) => c.trim()).filter(Boolean);
}
