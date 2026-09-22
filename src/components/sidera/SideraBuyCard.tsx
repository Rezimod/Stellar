'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useSideraHolder } from './useSideraHolder';
import SideraPay, { type Confirmation, type SideraOrder } from './SideraPay';
import SideraReveal from './SideraReveal';
import type { Rarity } from '@/lib/rarity';

/**
 * Buying one card on its own. The edition number is allocated when the
 * payment is confirmed, so nothing is held back by an order left unpaid.
 */
export default function SideraBuyCard({
  designation,
  name,
  rarity,
  priceUsd,
  available,
  released,
}: {
  designation: string;
  name: string;
  rarity: Rarity;
  priceUsd: number;
  available: boolean;
  /** A draft set sells nothing. Set 001 is draft until it is released. */
  released: boolean;
}) {
  const { getAccessToken } = usePrivy();
  const { authenticated, ready, address } = useSideraHolder();
  const [authOpen, setAuthOpen] = useState(false);
  const [order, setOrder] = useState<SideraOrder | null>(null);
  const [done, setDone] = useState<Confirmation | null>(null);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  if (!released) {
    return <p className="sd-note">Set 001 is not on sale yet. Nothing in it can be bought, by capsule or on its own.</p>;
  }

  if (!available) {
    return (
      <p className="sd-note">
        No edition of {name} can be sold on its own right now. Every remaining edition is owed to a capsule, or the card
        is complete.
      </p>
    );
  }

  // Paid: the card comes down the way a capsule's do, on its own.
  if (done?.edition) {
    return (
      <SideraReveal
        draw={{
          cards: [
            {
              drawIndex: 0,
              designation: done.edition.designation,
              name,
              rarity,
              editionNumber: done.edition.editionNumber,
              editionSize: done.edition.editionSize,
            },
          ],
        }}
      />
    );
  }

  const place = async () => {
    if (!address) {
      setError('This account has no Solana wallet yet.');
      return;
    }
    setPlacing(true);
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/sidera/cards/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ walletAddress: address, designation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'The order could not be placed.');
        return;
      }
      setOrder(data as SideraOrder);
    } catch {
      setError('The order could not be placed. Try again in a moment.');
    } finally {
      setPlacing(false);
    }
  };

  if (order) return <SideraPay order={order} onConfirmed={setDone} />;

  return (
    <>
      <div className="sd-pay__actions">
        {ready && authenticated ? (
          <button type="button" className="sd-btn sd-btn--primary" onClick={place} disabled={placing}>
            {placing ? 'Placing' : `Buy this one outright — $${priceUsd}`}
          </button>
        ) : (
          <button type="button" className="sd-btn sd-btn--primary" onClick={() => setAuthOpen(true)}>
            Sign in to buy
          </button>
        )}
      </div>
      {error && <p className="sd-data">{error}</p>}
      {done?.error && <p className="sd-data">{done.error}</p>}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
