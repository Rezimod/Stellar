'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useStellarUser } from '@/hooks/useStellarUser';
import type { Slot } from '@/lib/observatory/availability';

type BookableSlot = Slot & { taken: boolean; mine: boolean };

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
        <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
          {priceGel} ₾
        </span>{' '}
        when sessions open. Holding a slot costs nothing today — no card, no payment.
      </p>

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
                    <SlotButton
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

function SlotButton({
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
    : taken
      ? { fg: 'var(--text-muted)', bg: 'var(--surface)', bd: 'var(--border)' }
      : { fg: 'var(--text-primary)', bg: 'var(--surface)', bd: 'var(--border)' };

  return (
    <button
      type="button"
      disabled={taken || busy}
      onClick={onSelect}
      title={localClock(slot.startsAt)}
      className="flex flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed"
      style={{ color: tone.fg, background: tone.bg, borderColor: tone.bd }}
    >
      <span className="font-mono text-sm">{siteClock(slot.startsAt, timezone)}</span>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {slot.mine
          ? busy
            ? 'Releasing…'
            : 'Held · release'
          : taken
            ? 'Taken'
            : busy
              ? 'Holding…'
              : slot.cloudCover === null
                ? 'Free'
                : `${Math.round(slot.cloudCover)}% cloud`}
      </span>
      {clouded && !taken && !slot.mine && (
        <span className="text-xs" style={{ color: 'var(--no)' }}>
          Likely clouded
        </span>
      )}
    </button>
  );
}
