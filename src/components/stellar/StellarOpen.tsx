'use client';

import { useState } from 'react';
import { usePrivySafe as usePrivy } from './usePrivySafe';
import { useStellarHolder } from './useStellarHolder';
import dynamic from 'next/dynamic';
import type { Draw } from './StellarReveal';

const StellarReveal = dynamic(() => import('./StellarReveal'), { ssr: false });

/**
 * Opening a capsule from its own public record.
 *
 * A capsule bought and paid for, whose buyer closed the tab before opening
 * it, is no longer on sale and so appears nowhere else. Its record is the way
 * back to it. Someone else's capsule and a capsule that does not exist answer
 * the same way, which is what the route itself does.
 */
export default function StellarOpen({ capsuleId }: { capsuleId: string }) {
  const { getAccessToken, login } = usePrivy();
  const { authenticated, ready } = useStellarHolder();
  const [draw, setDraw] = useState<Draw | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (draw) return <StellarReveal draw={draw} autoLaunch />;

  const open = async () => {
    setBusy(true);
    setError('');
    try {
      const token = await getAccessToken();
      const res = await fetch('/api/stellar/capsules/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ capsuleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(res.status === 404 ? 'This capsule is not yours to open.' : (data.error ?? 'The capsule could not be opened.'));
        return;
      }
      setDraw({
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

  return (
    <div className="sd-section">
      <div className="sd-pay__actions">
        {ready && authenticated ? (
          <button type="button" className="sd-btn sd-btn--primary sd-btn--block" onClick={open} disabled={busy}>
            {busy ? 'Opening' : 'Fly it'}
          </button>
        ) : (
          <button type="button" className="sd-btn sd-btn--primary sd-btn--block" onClick={() => login()}>
            Log in to fly it
          </button>
        )}
      </div>
      <p className="sd-note">Only its holder can open it, and only once its payment is confirmed.</p>
      {error && <p className="sd-data">{error}</p>}
    </div>
  );
}
