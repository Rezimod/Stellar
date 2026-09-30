'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { RARITIES, rarityInfo } from '@/lib/rarity';
import { CARDS_PER_TIER, type Tier } from '@/lib/stellar/tiers';
import StellarBuyCapsule from './StellarBuyCapsule';
import TierCapsule from './TierCapsule';

type OnSale = { id: string; sequence: number; commitment: string; priceUsd: number; cardsPerCapsule: number };

const pct = (bps: number) => (bps === 0 ? '—' : `${(bps / 100).toFixed(bps < 100 ? 1 : 0)}%`);

/**
 * One tier, taken off the shelf: its odds in full, and the next capsule of it
 * on sale — read at the moment the sheet opens, so the commitment the buyer
 * sends is the one published now. Everything, the buy button included, sits
 * on one screen. The preview stays one press away.
 */
export default function CapsuleTierSheet({ tier, onPreview, onClose }: { tier: Tier; onPreview: () => void; onClose: () => void }) {
  const [next, setNext] = useState<OnSale | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  // Lifted to the page's .stellar root: opened from a sticky panel, the sheet
  // would otherwise stack inside it, under the card grid beside it.
  const [host] = useState(() => (typeof document === 'undefined' ? null : (document.querySelector<HTMLElement>('.stellar') ?? document.body)));

  useEffect(() => {
    let live = true;
    fetch(`/api/stellar/capsules?tier=${tier.key}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { capsules: OnSale[] }) => live && setNext(d.capsules[0] ?? null))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [tier.key]);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      // The reveal, when it is up, takes Escape for itself.
      if (e.key === 'Escape' && !document.querySelector('.sd-reveal--staged')) onClose();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const top = Math.max(...RARITIES.map((r) => tier.oddsBps[r]));

  const sheet = (
    <div className="sd-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panel}
        className="sd-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${tier.name} capsule`}
        tabIndex={-1}
        style={{ '--tier': rarityInfo(tier.lit).color } as CSSProperties}
      >
        <button type="button" className="sd-sheet__close" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="sd-sheet__art">
          <span className="sd-sheet__rays" aria-hidden="true" />
          <TierCapsule tier={tier} />
          <span className="sd-sheet__count">{CARDS_PER_TIER} cards inside</span>
        </div>

        <div className="sd-sheet__body">
          <p className="sd-label">Capsule · First Light</p>
          <div className="sd-sheet__head">
            <h2 className="sd-sheet__name">{tier.name}</h2>
            <span className="sd-sheet__price">${tier.priceUsd}</span>
          </div>
          <p className="sd-sheet__line">{tier.line}</p>

          <ul className="sd-sheet__odds" aria-label="Odds per card">
            {[...RARITIES].reverse().map((r) => (
              <li key={r} data-zero={tier.oddsBps[r] === 0 || undefined} style={{ '--r': rarityInfo(r).color, '--w': tier.oddsBps[r] / top } as CSSProperties}>
                <span className="sd-sheet__rarity">{rarityInfo(r).label}</span>
                <span className="sd-sheet__bar" aria-hidden="true" />
                <span className="sd-sheet__pct">{pct(tier.oddsBps[r])}</span>
              </li>
            ))}
          </ul>

          <div className="sd-sheet__buy">
            {failed ? (
              <p className="sd-buyflow__error">The sale cannot be read at the moment.</p>
            ) : next === undefined ? (
              <div className="sd-sheet__wait" aria-label="Reading the sale">
                <span />
                <span />
              </div>
            ) : next === null ? (
              <p className="sd-buyflow__error">No {tier.name} capsule is on sale right now.</p>
            ) : (
              <>
                <p className="sd-sheet__lot">
                  <span>No. {String(next.sequence).padStart(3, '0')}</span>
                  <span title={next.commitment}>commitment {next.commitment.slice(0, 10)}…</span>
                </p>
                <StellarBuyCapsule
                  capsuleId={next.id}
                  sequence={next.sequence}
                  commitment={next.commitment}
                  priceUsd={next.priceUsd}
                  cardsPerCapsule={next.cardsPerCapsule}
                  onClose={onClose}
                />
              </>
            )}
          </div>

          <button type="button" className="sd-sheet__preview" onClick={onPreview}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
            </svg>
            Preview the opening — nothing is bought
          </button>
        </div>
      </div>
    </div>
  );

  return host ? createPortal(sheet, host) : sheet;
}
