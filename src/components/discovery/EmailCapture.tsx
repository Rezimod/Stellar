'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'stellar_discovery_waitlist';

/** Shape of the locally-held waitlist. Phase 1 only — this moves to
 *  /api/discovery/waitlist once the sale surface lands. */
type Entry = { email: string; at: string };

function readList(): Entry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Entry[]) : [];
  } catch {
    // Private-mode Safari throws on access, and a hand-edited value can be
    // malformed. Either way: start clean rather than blocking the form.
    return [];
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = 'idle' | 'invalid' | 'saved' | 'already' | 'error';

const MESSAGES: Record<Exclude<Status, 'idle'>, string> = {
  invalid: 'That address does not look right.',
  saved: "You're on the list. We'll reach you before the reveal.",
  already: "This address is already on the list.",
  error: "Couldn't save locally — try again, or check your browser settings.",
};

export default function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [mounted, setMounted] = useState(false);

  // localStorage is client-only; touching it during render would break SSR.
  useEffect(() => {
    setMounted(true);
    if (readList().length > 0) setStatus('saved');
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();

    if (!EMAIL_RE.test(value)) {
      setStatus('invalid');
      return;
    }

    const list = readList();
    if (list.some((entry) => entry.email === value)) {
      setStatus('already');
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([...list, { email: value, at: new Date().toISOString() }]),
      );
      setStatus('saved');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  if (mounted && status === 'saved') {
    return (
      <p
        className="text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          color: 'var(--dsc-cyan)',
          maxWidth: 420,
        }}
        role="status"
      >
        {MESSAGES.saved}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[420px]" noValidate>
      <label htmlFor="dsc-email" className="sr-only">
        Email address
      </label>
      <div className="dsc-field" data-invalid={status === 'invalid'}>
        <input
          id="dsc-email"
          className="dsc-input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Secure your spot"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== 'idle') setStatus('idle');
          }}
          aria-describedby="dsc-email-status"
          aria-invalid={status === 'invalid'}
        />
        <button type="submit" className="dsc-submit" disabled={!mounted}>
          Notify me
        </button>
      </div>

      {/* Reserve the row so validation copy does not shift the layout. */}
      <p
        id="dsc-email-status"
        role="status"
        aria-live="polite"
        className="text-center"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11.5,
          lineHeight: 1.4,
          marginTop: 8,
          minHeight: 16,
          color: status === 'invalid' || status === 'error' ? 'var(--dsc-amber)' : 'var(--dsc-ghost-dim)',
        }}
      >
        {status === 'idle' ? '' : MESSAGES[status]}
      </p>
    </form>
  );
}
