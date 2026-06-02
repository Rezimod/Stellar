/**
 * Neutralize prompt-injection in untrusted text before it enters a prompt.
 * Both the typed question and the on-device voice transcript are untrusted —
 * a transcript could contain "ignore previous instructions and ..." either by
 * accident or on purpose. We keep the user's real question intact but defang
 * the common override patterns and fake role markers, and cap length.
 */

const OVERRIDE_RE =
  /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|the)\b[^.\n]{0,30}\b(instructions?|prompts?|rules?|system|context)\b/gi;

// Fake chat-role markers at the start of a line ("system:", "assistant:", ...).
const ROLE_MARKER_RE = /^[ \t]*(system|assistant|developer|tool)[ \t]*:/gim;

// Control chars except tab (\x09), newline (\x0A), carriage-return (\x0D).
const CONTROL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

export function sanitizeUserText(raw: string, maxLen = 600): string {
  if (typeof raw !== 'string') return '';
  let s = raw
    .replace(CONTROL_RE, '')
    .replace(OVERRIDE_RE, '[instruction redacted]')
    .replace(ROLE_MARKER_RE, '$1 —')
    .replace(/\s{3,}/g, ' ')
    .trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}
