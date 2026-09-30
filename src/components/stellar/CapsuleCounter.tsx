'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { RARITIES, rarityInfo, type Rarity } from '@/lib/rarity';
import { DIRECT_CARD_PRICE_USD } from '@/lib/stellar/economics';
import { CARDS_PER_TIER, TIERS, rarityAt, tierByKey, type Tier } from '@/lib/stellar/tiers';
import type { Draw } from './StellarReveal';
import TierCapsule from './TierCapsule';

// The sheet carries the wallet and payment code; it is fetched on first
// intent (a pointer over the button, a touch) rather than with the page.
const loadSheet = () => import('./CapsuleTierSheet');
const CapsuleTierSheet = dynamic(loadSheet, { ssr: false });
const StellarReveal = dynamic(() => import('./StellarReveal'), { ssr: false });

export type TierCard = { designation: string; name: string; rarity: Rarity; editionSize: number };

const pct = (bps: number) => {
  const p = bps / 100;
  return p === 0 ? '—' : p < 1 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`;
};

/** Two cards at a tier's odds, drawn here in the browser. Preview only. */
function drawFrom(tier: Tier, cards: TierCard[]): Draw {
  const picked = Array.from({ length: CARDS_PER_TIER }, (_, i) => {
    const rarity = rarityAt(tier, Math.random());
    const pool = cards.filter((c) => c.rarity === rarity);
    const c = pool[Math.floor(Math.random() * pool.length)] ?? cards[0];
    return {
      drawIndex: i,
      designation: c.designation,
      name: c.name,
      rarity: c.rarity,
      editionNumber: 1 + Math.floor(Math.random() * c.editionSize),
      editionSize: c.editionSize,
    };
  });
  return { preview: tier.name, cards: picked };
}

/**
 * The counter beside the set: the four capsules, cheapest first, one of them
 * on the counter with its price, its odds and how many are on sale. Buying
 * opens the sheet with the next capsule of that tier; the preview draws two
 * cards here in the browser — no account, no payment, nothing recorded.
 */
export default function CapsuleCounter({ cards, onSale }: { cards: TierCard[]; onSale: Record<string, number> | null }) {
  const [tier, setTier] = useState<Tier>(TIERS[0]);
  const [sheet, setSheetState] = useState(false);
  const [open, setOpen] = useState<{ tier: Tier; draw: Draw; n: number } | null>(null);
  const start = useCallback((t: Tier) => setOpen((o) => ({ tier: t, draw: drawFrom(t, cards), n: (o?.n ?? 0) + 1 })), [cards]);

  // The open sheet lives in the address (#iron): a reload, or a link sent on,
  // lands on the same capsule.
  const setSheet = useCallback((t: Tier | null) => {
    if (t) setTier(t);
    setSheetState(t !== null);
    history.replaceState(history.state, '', t ? `#${t.key}` : location.pathname + location.search);
  }, []);
  const closeSheet = useCallback(() => setSheet(null), [setSheet]);
  useEffect(() => {
    const t = tierByKey(location.hash.slice(1));
    if (t) {
      setTier(t);
      setSheetState(true);
    }
  }, []);

  const stock = onSale ? (onSale[tier.key] ?? 0) : null;
  const top = Math.max(...RARITIES.map((r) => tier.oddsBps[r]));

  return (
    <aside className="sd-counter" aria-label="Capsules" style={{ '--tier': rarityInfo(tier.lit).color } as CSSProperties}>
      <div className="sd-counter__tabs" role="group" aria-label="Choose a capsule">
        {TIERS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="sd-counter__tab"
            aria-pressed={t.key === tier.key}
            style={{ '--tier': rarityInfo(t.lit).color } as CSSProperties}
            onClick={() => setTier(t)}
          >
            <span className="sd-counter__tabname">{t.name}</span>
            <span className="sd-counter__tabprice">${t.priceUsd}</span>
          </button>
        ))}
      </div>

      <div className="sd-counter__stage">
        <span className="sd-counter__rays" aria-hidden="true" />
        <TierCapsule tier={tier} />
        <div className="sd-counter__over">
          <div>
            <span className="sd-counter__label">You are opening</span>
            <h2 className="sd-counter__name">
              {tier.name}
              <span className="sr-only"> capsule</span>
            </h2>
          </div>
          <div className="sd-counter__price">
            <strong>${tier.priceUsd}</strong>
            <span>{CARDS_PER_TIER} cards</span>
          </div>
        </div>
      </div>

      <p className="sd-counter__line">{tier.line}</p>

      <div className="sd-counter__buy">
        <button
          type="button"
          className="sd-btn sd-btn--light sd-btn--block"
          disabled={stock === 0}
          onPointerEnter={loadSheet}
          onTouchStart={loadSheet}
          onFocus={loadSheet}
          onClick={() => setSheet(tier)}
        >
          {stock === 0 ? 'None on sale' : `Buy & open — $${tier.priceUsd}`}
        </button>
        <button type="button" className="sd-counter__preview" onClick={() => start(tier)}>
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d="M5 3.5v9l7-4.5z" fill="currentColor" />
          </svg>
          Preview an opening — nothing is bought
        </button>
      </div>

      <h3 className="sd-counter__h">Odds per card</h3>
      <ul className="sd-counter__odds">
        {[...RARITIES].reverse().map((r) => (
          <li
            key={r}
            data-zero={tier.oddsBps[r] === 0 || undefined}
            style={{ '--r': rarityInfo(r).color, '--w': tier.oddsBps[r] / top } as CSSProperties}
          >
            <span className="sd-counter__rarity">
              <i aria-hidden="true" />
              {rarityInfo(r).label}
            </span>
            <span className="sd-counter__worth">${DIRECT_CARD_PRICE_USD[r]} cards</span>
            <span className="sd-counter__pct">{pct(tier.oddsBps[r])}</span>
            <span className="sd-counter__bar" aria-hidden="true" />
          </li>
        ))}
      </ul>

      <div className="sd-counter__foot">
        <span>{stock === null ? 'Sale not read' : `${stock} on sale`}</span>
        <Link href="/capsules/log" className="sd-counter__fair">
          Provably fair
        </Link>
      </div>

      {sheet && (
        <CapsuleTierSheet
          tier={tier}
          onClose={closeSheet}
          onPreview={() => {
            setSheet(null);
            start(tier);
          }}
        />
      )}
      {open && <StellarReveal key={open.n} draw={open.draw} onAgain={() => start(open.tier)} onClose={() => setOpen(null)} />}
    </aside>
  );
}
