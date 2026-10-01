/** The closed beta's codes, from STELLAR_INVITE_CODES. None means there is no gate. */
export const INVITE_COOKIE = 'stellar_invite';

export function inviteCodes(): string[] {
  return (process.env.STELLAR_INVITE_CODES ?? '').split(',').map((c) => c.trim()).filter(Boolean);
}
