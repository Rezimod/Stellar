'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { AuthModal } from '@/components/auth/AuthModal';
import { useSideraHolder } from './useSideraHolder';
import SideraPay, { type SideraOrder } from './SideraPay';
import SideraReveal, { type Draw } from './SideraReveal';
import DataRow from './ui/DataRow';

type Receipt = { nonce: string; purchaseHash: string; purchaseMessage: string };

function freshNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Buying and opening one capsule.
 *
 * The nonce is drawn here, in the buyer's own browser, and sent with the
 * commitment they can see published. Neither side can choose the outcome
 * alone: the secret was committed to before the sale, the nonce after it. The
 * receipt — the purchase message and its hash — is shown so it can be kept.
 */
export default function SideraBuyCapsule({
  capsuleId,
  sequence,
  commitment,
  priceGel,
  cardsPerCapsule,
}: {
  capsuleId: string;
  sequence: number;
  commitment: string;
  priceGel: number;
  cardsPerCapsule: number;
}) {
  const { getAccessToken } = usePrivy();
  const { authenticated, ready, address } = useSideraHolder();
  const [authOpen, setAuthOpen] = useState(false);
  const [order, setOrder] = useState<SideraOrder | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [paid, setPaid] = useState(false);
  const [cards, setCards] = useState<Draw | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const post = async (path: string, body: unknown) => {
    const token = await getAccessToken();
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    return { res, data: await res.json().catch(() => ({})) };
  };

  const reserve = async () => {
    if (!address) {
      setError('This account has no Solana wallet yet.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const nonce = freshNonce();
      const { res, data } = await post('/api/sidera/capsules/buy', { walletAddress: address, capsuleId, commitment, nonce });
      if (!res.ok) {
        setError(data.error ?? 'The capsule could not be reserved.');
        return;
      }
      setReceipt({ nonce, purchaseHash: data.purchaseHash, purchaseMessage: data.purchaseMessage });
      setOrder(data as SideraOrder);
    } catch {
      setError('The capsule could not be reserved. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  const open = async () => {
    setBusy(true);
    setError('');
    try {
      const { res, data } = await post('/api/sidera/capsules/open', { capsuleId });
      if (!res.ok) {
        setError(data.error ?? 'The capsule could not be opened.');
        return;
      }
      setCards({
        sequence: data.sequence as number,
        secret: String(data.secret ?? ''),
        nonce: String(data.nonce ?? ''),
        cards: data.cards as Draw['cards'],
      });
    } catch {
      setError('The capsule could not be opened. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  if (cards) {
    return (
      <div className="sd-section">
        <SideraReveal draw={cards} />
        <p className="sd-pay__actions sd-section">
          <Link href={`/capsule/${capsuleId}`} className="sd-btn">
            Public record
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="sd-section">
      {receipt && (
        <div className="sd-section">
          <h3 className="sd-section__title">Your receipt — keep it</h3>
          <DataRow
            layout="stacked"
            items={[
              { label: 'Capsule', value: String(sequence) },
              { label: 'Commitment', value: commitment },
              { label: 'Your nonce', value: receipt.nonce },
              { label: 'Purchase hash', value: receipt.purchaseHash },
            ]}
          />
          <p className="sd-note">
            This capsule is yours from here. Its{' '}
            <Link href={`/capsule/${capsuleId}`} className="sd-link">
              public record
            </Link>{' '}
            is the way back to it, and where it can be opened if this page is closed.
          </p>
        </div>
      )}

      {paid ? (
        <div className="sd-pay__actions">
          <button type="button" className="sd-btn sd-btn--primary" onClick={open} disabled={busy}>
            {busy ? 'Opening' : 'Crack it open'}
          </button>
        </div>
      ) : order ? (
        <SideraPay order={order} onConfirmed={() => setPaid(true)} />
      ) : (
        <div className="sd-pay__actions">
          {ready && authenticated ? (
            <button type="button" className="sd-btn sd-btn--primary" onClick={reserve} disabled={busy}>
              {busy ? 'Reserving' : `Take this capsule — ${priceGel} GEL`}
            </button>
          ) : (
            <button type="button" className="sd-btn sd-btn--primary" onClick={() => setAuthOpen(true)}>
              Sign in to buy
            </button>
          )}
          <span className="sd-data">{cardsPerCapsule} cards</span>
        </div>
      )}

      {error && <p className="sd-data">{error}</p>}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
