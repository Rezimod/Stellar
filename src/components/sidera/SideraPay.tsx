'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { usePrivy } from '@privy-io/react-auth';
import Caption from './ui/Caption';
import DataRow from './ui/DataRow';

export type SideraOrder = {
  orderId: string;
  url: string;
  amountSol: number;
  amountFiat: number;
  currency: string;
  expiresAt: string | null;
};

export type Confirmation = {
  confirmed: boolean;
  capsuleId?: string | null;
  edition?: { designation: string; editionNumber: number; editionSize: number };
  error?: string;
};

function minutesLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000));
}

/** A deployment that rehearses instead of selling. Set at build, not by the page. */
const REHEARSAL = process.env.NEXT_PUBLIC_SIDERA_SIMULATED_PAYMENT === '1';

/**
 * One Solana Pay order, waiting to be paid: the request as a code and as a
 * link, the quote it stands on, and a check that asks the chain whether the
 * transfer arrived. The quote expires; a payment made after it does is
 * recorded as a refund due rather than dropped.
 *
 * On a rehearsal deployment there is no code and no wallet: the order settles
 * on the button, nothing is charged, and the page says so before it is
 * pressed. The capsule behind it is real, and so is everything after.
 */
export default function SideraPay({ order, onConfirmed }: { order: SideraOrder; onConfirmed: (c: Confirmation) => void }) {
  const { getAccessToken } = usePrivy();
  const [checking, setChecking] = useState(false);
  const [note, setNote] = useState('');
  const [left, setLeft] = useState<number | null>(minutesLeft(order.expiresAt));

  useEffect(() => {
    setLeft(minutesLeft(order.expiresAt));
    const t = setInterval(() => setLeft(minutesLeft(order.expiresAt)), 30_000);
    return () => clearInterval(t);
  }, [order.expiresAt]);

  const check = async () => {
    setChecking(true);
    setNote('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/sidera/orders/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ orderId: order.orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as Confirmation;
      if (data.confirmed) {
        onConfirmed(data);
        return;
      }
      setNote(data.error ?? 'No transfer has arrived yet.');
    } catch {
      setNote('The check could not be made. Try again in a moment.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="sd-pay">
      {REHEARSAL ? (
        <div className="sd-pay__rehearsal">
          <p className="sd-label">Rehearsal</p>
          <p className="sd-blurb">
            Nothing is charged. This capsule, its sealed outcome and the editions it draws are real — only the
            payment is stood in for, and the log records that it was.
          </p>
        </div>
      ) : (
        <div className="sd-pay__code">
          <QRCodeSVG value={order.url} size={168} bgColor="#0b0c0e" fgColor="#ece7da" level="M" />
        </div>
      )}
      <div className="sd-pay__side">
        <DataRow
          layout="stacked"
          items={[
            { label: 'Price', value: `${order.amountFiat} ${order.currency}` },
            { label: 'Amount', value: REHEARSAL ? 'Not charged' : `${order.amountSol.toFixed(4)} SOL` },
            { label: 'Quote', value: left === null ? 'Open' : left > 0 ? `${left} min left` : 'Expired' },
          ]}
        />
        <div className="sd-pay__actions">
          {REHEARSAL ? (
            <button type="button" className="sd-btn sd-btn--primary" onClick={check} disabled={checking}>
              {checking ? 'Settling' : 'Settle without paying'}
            </button>
          ) : (
            <>
              <a className="sd-btn sd-btn--primary" href={order.url}>
                Pay in your wallet
              </a>
              <button type="button" className="sd-btn" onClick={check} disabled={checking}>
                {checking ? 'Checking the chain' : 'I have paid'}
              </button>
            </>
          )}
        </div>
        {note && <p className="sd-data">{note}</p>}
        <Caption as="p" parts={[REHEARSAL ? 'No payment taken' : 'Solana Pay', `Order ${order.orderId.slice(0, 8)}`]} />
      </div>
    </div>
  );
}
