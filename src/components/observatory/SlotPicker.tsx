'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useStellarUser } from '@/hooks/useStellarUser';
import type { Slot } from '@/lib/observatory/availability';

type BookableSlot = Slot & { taken: boolean; mine: boolean; sessionId: string | null };

type Props = {
  nodeId: string;
  timezone: string;
  sessionMinutes: number;
  priceGel: number;
};

/** Site-local clock — a slot is quoted in the sky's time, not the visitor's. */
function siteClock(iso: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function nightLabel(night: string, timezone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${night}T12:00:00Z`));
}

/** The visitor's own clock, for the hover title — most people are in one zone, some are not. */
function localClock(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export default function SlotPicker({ nodeId, timezone, sessionMinutes, priceGel }: Props) {
  const { getAccessToken } = usePrivy();
  const { authenticated } = useStellarUser();

  const [slots, setSlots] = useState<BookableSlot[] | null>(null);
  const [holdsKnown, setHoldsKnown] = useState(true);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const token = authenticated ? await getAccessToken() : null;
      const res = await fetch(`/api/observatory/slots?node=${encodeURIComponent(nodeId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setSlots(data.slots as BookableSlot[]);
      setHoldsKnown(data.holdsKnown !== false);
    } catch {
      setSlots([]);
      setError('The timetable could not be loaded. Try again in a moment.');
    }
  }, [authenticated, getAccessToken, nodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (slot: BookableSlot) => {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }

    setPending(slot.id);
    setError('');
    try {
      const token = await getAccessToken();
      const res = slot.mine
        ? await fetch(`/api/observatory/book?slot=${encodeURIComponent(slot.id)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        : await fetch('/api/observatory/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ slotId: slot.id }),
          });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'That did not work. Try again.');
      }
      await load();
    } catch {
      setError('Network error — try again.');
    } finally {
      setPending(null);
    }
  };

  if (slots === null) {
    return (
      <p className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Working out when the sky is dark over the site…
      </p>
    );
  }

  const nights = [...new Set(slots.map((s) => s.night))];

  return (
    <div className="mt-4">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
          {sessionMinutes}
        </span>{' '}
        minutes on the instrument ·{' '}
        <span style={{ color: 'var(--text-primary)' }}>
          <span className="font-mono">{priceGel}</span> ₾
        </span>{' '}
        when sessions open. Holding a slot costs nothing today — no card, no payment.
      </p>

      {!holdsKnown && (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          Bookings are offline, so which slots are already taken is unknown. The nights below
          are still the real ones.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm" style={{ color: 'var(--no)' }} role="alert">
          {error}
        </p>
      )}

      {nights.length === 0 ? (
        <p
          className="mt-4 rounded-xl border p-5 text-sm"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-secondary)',
          }}
        >
          No slots in the next few nights — the operator&apos;s hours and the dark window do not
          overlap yet. Check back tomorrow.
        </p>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {nights.map((night) => (
            <section key={night}>
              <h3
                className="text-xs uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                {nightLabel(night, timezone)} · site time
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {slots
                  .filter((s) => s.night === night)
                  .map((slot) => (
                    <SlotTile
                      key={slot.id}
                      slot={slot}
                      timezone={timezone}
                      busy={pending === slot.id}
                      onSelect={() => act(slot)}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function SlotTile({
  slot,
  timezone,
  busy,
  onSelect,
}: {
  slot: BookableSlot;
  timezone: string;
  busy: boolean;
  onSelect: () => void;
}) {
  const taken = slot.taken && !slot.mine;
  const clouded = slot.cloudCover !== null && slot.cloudCover > 70;

  const tone = slot.mine
    ? { fg: 'var(--yes)', bg: 'var(--yes-dim)', bd: 'var(--yes-border)' }
    : { fg: taken ? 'var(--text-muted)' : 'var(--text-primary)', bg: 'var(--surface)', bd: 'var(--border)' };

  const shell = 'flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left';
  const clock = <span className="font-mono text-sm">{siteClock(slot.startsAt, timezone)}</span>;

  // A held slot carries two actions, so it cannot be one button — nesting a
  // control inside a control is invalid, and the whole tile is no longer a
  // single choice.
  if (slot.mine) {
    return (
      <div className={shell} style={{ color: tone.fg, background: tone.bg, borderColor: tone.bd }}>
        {clock}
        <span className="flex items-center gap-3 text-xs">
          <Link
            href={`/observatory/session/${slot.sessionId}`}
            className="underline"
            style={{ color: 'var(--yes)' }}
          >
            Open session
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={onSelect}
            className="underline disabled:cursor-not-allowed"
            // The global 44px control floor would stretch this line into a pill.
            style={{ color: 'var(--text-muted)', minHeight: 0, padding: 0 }}
          >
            {busy ? 'Releasing…' : 'Release'}
          </button>
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={taken || busy}
      onClick={onSelect}
      title={localClock(slot.startsAt)}
      className={`${shell} transition-colors disabled:cursor-not-allowed`}
      style={{ color: tone.fg, background: tone.bg, borderColor: tone.bd }}
    >
      {clock}
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {taken
          ? 'Taken'
          : busy
            ? 'Holding…'
            : slot.cloudCover === null
              ? 'Free'
              : `${Math.round(slot.cloudCover)}% cloud`}
      </span>
      {clouded && !taken && (
        <span className="text-xs" style={{ color: 'var(--no)' }}>
          Likely clouded
        </span>
      )}
    </button>
  );
}
