'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePrivySafe as usePrivy } from './usePrivySafe';
import { useStellarHolder } from './useStellarHolder';
import dynamic from 'next/dynamic';
import type { StellarOrder } from './StellarPay';
import type { Draw } from './StellarReveal';
import DataRow from './ui/DataRow';

type Receipt = { nonce: string; purchaseHash: string; purchaseMessage: string };

function freshNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const StellarPay = dynamic(() => import('./StellarPay'), { ssr: false });
const StellarReveal = dynamic(() => import('./StellarReveal'), { ssr: false });

/** A deployment that rehearses instead of selling. Set at build, not by the page. */
const REHEARSAL = process.env.NEXT_PUBLIC_STELLAR_SIMULATED_PAYMENT === '1';
const STEPS = ['Buy', 'Pay', 'Open'] as const;

/**
 * Buying and opening one capsule, as one run: reserve, pay, and the capsule
 * cracks open by itself the moment the payment is confirmed.
 *
 * The nonce is drawn here, in the buyer's own browser, and sent with the
 * commitment they can see published. Neither side can choose the outcome
 * alone: the secret was committed to before the sale, the nonce after it. The
 * receipt — the purchase message and its hash — stays one press away.
 */
export default function StellarBuyCapsule({
  capsuleId,
  sequence,
  commitment,
  priceUsd,
  cardsPerCapsule,
  onClose,
}: {
  capsuleId: string;
  sequence: number;
  commitment: string;
  priceUsd: number;
  cardsPerCapsule: number;
  /** Passed on to the reveal: where closing it goes, instead of leaving the cards in the page. */
  onClose?: () => void;
}) {
  const { getAccessToken, login } = usePrivy();
  const { authenticated, ready, address } = useStellarHolder();
  const [order, setOrder] = useState<StellarOrder | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [paid, setPaid] = useState(false);
  const [cards, setCards] = useState<Draw | null>(null);
  const [launchNow, setLaunchNow] = useState(false);
  const [busy, setBusy] = useState('');
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

  const open = async () => {
    setBusy('Opening your capsule');
    setError('');
    try {
      const { res, data } = await post('/api/stellar/capsules/open', { capsuleId });
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
      setBusy('');
    }
  };

  const confirmed = () => {
    setPaid(true);
    void open();
  };

  const reserve = async () => {
    if (!address) {
      setError('This account has no Solana wallet yet.');
      return;
    }
    setBusy('Reserving');
    setError('');
    try {
      const nonce = freshNonce();
      const { res, data } = await post('/api/stellar/capsules/buy', { walletAddress: address, capsuleId, commitment, nonce });
      if (!res.ok) {
        setError(data.error ?? 'The capsule could not be reserved.');
        return;
      }
      setReceipt({ nonce, purchaseHash: data.purchaseHash, purchaseMessage: data.purchaseMessage });
      const next = data as StellarOrder;
      if (!REHEARSAL) {
        setOrder(next);
        return;
      }
      // A rehearsal has no wallet step: settle, then open, in the same press.
      setBusy('Settling');
      const settled = await post('/api/stellar/orders/confirm', { orderId: next.orderId });
      if (!settled.data.confirmed) {
        setOrder(next);
        setError(settled.data.error ?? 'The order could not be settled.');
        return;
      }
      setPaid(true);
      setBusy('');
      await open();
    } catch {
      setError('The capsule could not be reserved. Try again in a moment.');
    } finally {
      setBusy('');
    }
  };

  if (cards) {
    return (
      <div className="sd-buyflow">
        <StellarReveal draw={cards} onClose={onClose} autoLaunch={launchNow} />
        {!onClose && (
          <p className="sd-pay__actions">
            <Link href={`/capsule/${capsuleId}`} className="sd-btn">
              Public record
            </Link>
          </p>
        )}
      </div>
    );
  }

  const step = paid ? 2 : order ? 1 : 0;

  return (
    <div className="sd-buyflow">
      <ol className="sd-steps" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'is-done' : i === step ? 'is-now' : undefined} aria-current={i === step ? 'step' : undefined}>
            <span className="sd-steps__dot">
              {i < step ? (
                <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
                  <path d="M2.5 6.2 5 8.6l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            {s}
          </li>
        ))}
      </ol>

      {paid ? (
        <button
          type="button"
          className="sd-btn sd-btn--primary sd-btn--block"
          onClick={() => {
            setLaunchNow(true);
            void open();
          }}
          disabled={!!busy}
        >
          {busy ? <Working label={busy} /> : 'Fly it'}
        </button>
      ) : order ? (
        <StellarPay order={order} onConfirmed={confirmed} compact />
      ) : ready && authenticated ? (
        <button type="button" className="sd-btn sd-btn--primary sd-btn--block" onClick={reserve} disabled={!!busy}>
          {busy ? <Working label={busy} /> : `Buy & fly — $${priceUsd}`}
        </button>
      ) : (
        <button type="button" className="sd-btn sd-btn--primary sd-btn--block" onClick={() => login()}>
          Sign in to buy — ${priceUsd}
        </button>
      )}

      {!order && !paid && (
        <p className="sd-buyflow__note">
          {cardsPerCapsule === 1 ? 'One card' : `${cardsPerCapsule} cards`} · {REHEARSAL ? 'rehearsal — nothing is charged' : 'ready to fly the moment it is paid'}
        </p>
      )}
      {error && (
        <p className="sd-buyflow__error" role="alert">
          {error}
        </p>
      )}

      {receipt && (
        <details className="sd-receipt">
          <summary>Receipt — keep it</summary>
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
            This capsule is yours. Its{' '}
            <Link href={`/capsule/${capsuleId}`} className="sd-link">
              public record
            </Link>{' '}
            is the way back to it if this page is closed.
          </p>
        </details>
      )}
    </div>
  );
}

function Working({ label }: { label: string }) {
  return (
    <>
      <span className="sd-spin" aria-hidden="true" />
      {label}
    </>
  );
}
