'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { RARITIES, rarityInfo } from '@/lib/rarity';
import { CARDS_PER_TIER, type Tier } from '@/lib/sidera/tiers';
import SideraBuyCapsule from './SideraBuyCapsule';

type OnSale = { id: string; sequence: number; commitment: string; priceUsd: number; cardsPerCapsule: number };

const pct = (bps: number) => (bps === 0 ? '—' : `${(bps / 100).toFixed(bps < 100 ? 1 : 0)}%`);

/**
 * One tier, taken off the shelf: its odds in full, and the next capsule of it
 * on sale — read at the moment the sheet opens, so the commitment the buyer
 * sends is the one published now. The preview stays one press away.
 */
export default function CapsuleTierSheet({ tier, onPreview, onClose }: { tier: Tier; onPreview: () => void; onClose: () => void }) {
  const [next, setNext] = useState<OnSale | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/sidera/capsules?tier=${tier.key}`)
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

  return (
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
        <button type="button" className="sd-sheet__close" onClick={onClose}>
          Close
        </button>
        <p className="sd-label">Capsule · First Light</p>
        <div className="sd-tier__head">
          <h2 className="sd-tier__name">{tier.name}</h2>
          <span className="sd-tier__price">${tier.priceUsd}</span>
        </div>
        <p className="sd-tier__line">
          {tier.line} · {CARDS_PER_TIER} cards
        </p>

        <ul className="sd-sheet__odds">
          {[...RARITIES].reverse().map((r) => (
            <li key={r} data-rarity={r}>
              <span style={{ color: rarityInfo(r).color }}>{rarityInfo(r).label}</span>
              <span>{pct(tier.oddsBps[r])}</span>
            </li>
          ))}
        </ul>
        <p className="sd-strip-note">Odds per card, fixed when the capsule was listed and logged with it</p>

        {failed ? (
          <p className="sd-note">The sale cannot be read at the moment.</p>
        ) : next === undefined ? (
          <p className="sd-data">Reading the sale</p>
        ) : next === null ? (
          <p className="sd-note">No {tier.name} capsule is on sale right now.</p>
        ) : (
          <>
            <p className="sd-data">
              Capsule No. {String(next.sequence).padStart(3, '0')} · commitment {next.commitment.slice(0, 12)}…
            </p>
            <SideraBuyCapsule
              capsuleId={next.id}
              sequence={next.sequence}
              commitment={next.commitment}
              priceUsd={next.priceUsd}
              cardsPerCapsule={next.cardsPerCapsule}
            />
          </>
        )}

        <button type="button" className="sd-link sd-sheet__preview" onClick={onPreview}>
          Preview the opening — nothing is bought
        </button>
      </div>
    </div>
  );
}
