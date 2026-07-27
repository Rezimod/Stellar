// Codes /api/observe/verify can return alongside its English `reason` text.
// The client re-renders the message from `observeFlow.verify.rejection.<code>`
// so an unverified outcome reads in the user's language.
export const REJECTION_CODES = [
  'duplicate_image',
  'gps_mismatch',
  'photo_too_old',
  'stock_image_detected',
  'verification_unavailable',
  'ai_generated',
  'screenshot_detected',
  'too_cloudy',
] as const;

export function isRejectionCode(code: string | undefined): boolean {
  return !!code && (REJECTION_CODES as readonly string[]).includes(code);
}
