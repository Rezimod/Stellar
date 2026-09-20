'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useStellarUser } from '@/hooks/useStellarUser';
import SideraReveal, { type RevealedCard } from './SideraReveal';

/**
 * Opening a capsule from its own public record.
 *
 * A capsule bought and paid for, whose buyer closed the tab before opening
 * it, is no longer on sale and so appears nowhere else. Its record is the way
 * back to it. Someone else's capsule and a capsule that does not exist answer
 * the same way, which is what the route itself does.
 */
export default function SideraOpen({ capsuleId }: { capsuleId: string }) {
  const { getAccessToken } = usePrivy();
  const { authenticated, ready } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);
  const [cards, setCards] = useState<RevealedCard[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (cards) return <SideraReveal cards={cards} />;

  const open = async () => {
    setBusy(true);
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/sidera/capsules/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ capsuleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 404 ? 'This capsule is not yours to open.' : (data.error ?? 'The capsule could not be opened.'));
        return;
      }
      setCards(data.cards as RevealedCard[]);
    } catch {
      setError('The capsule could not be opened. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sd-section">
      <div className="sd-pay__actions">
        {ready && authenticated ? (
          <button type="button" className="sd-btn" onClick={open} disabled={busy}>
            {busy ? 'Opening' : 'Open the capsule'}
          </button>
        ) : (
          <button type="button" className="sd-btn" onClick={() => setAuthOpen(true)}>
            Sign in to open it
          </button>
        )}
      </div>
      <p className="sd-note">Only its holder can open it, and only once its payment is confirmed.</p>
      {error && <p className="sd-data">{error}</p>}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
