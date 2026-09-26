'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { RARITIES, rarityInfo, type Rarity } from '@/lib/rarity';
import { CARDS_PER_TIER, TIERS, rarityAt, tierByKey, type Tier } from '@/lib/sidera/tiers';
import type { Draw } from './SideraReveal';
import TierCapsule from './TierCapsule';

// The sheet carries the wallet and payment code; the shelf fetches it on
// first intent (a pointer over a tile, a touch) rather than with the page.
const loadSheet = () => import('./CapsuleTierSheet');
const CapsuleTierSheet = dynamic(loadSheet, { ssr: false });
const SideraReveal = dynamic(() => import('./SideraReveal'), { ssr: false });

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
 * The four capsules, cheapest first, the odds climbing with the price. A tile
 * opens its sheet: the next capsule of that tier on sale, bought and opened
 * there, or a preview draw — no account, no payment, nothing recorded — so
 * the reveal can be seen as it will be.
 */
export default function CapsuleTiers({ cards, onSale }: { cards: TierCard[]; onSale: Record<string, number> | null }) {
  const [sheet, setSheetState] = useState<Tier | null>(null);
  const [open, setOpen] = useState<{ tier: Tier; draw: Draw; n: number } | null>(null);
  const start = useCallback((tier: Tier) => setOpen((o) => ({ tier, draw: drawFrom(tier, cards), n: (o?.n ?? 0) + 1 })), [cards]);

  // The open sheet lives in the address (#iron), so signing in — which loads
  // Privy and remounts the page — lands the buyer back on the same capsule.
  const setSheet = useCallback((t: Tier | null) => {
    setSheetState(t);
    history.replaceState(history.state, '', t ? `#${t.key}` : location.pathname + location.search);
  }, []);
  const closeSheet = useCallback(() => setSheet(null), [setSheet]);
  useEffect(() => {
    const t = tierByKey(location.hash.slice(1));
    if (t) setSheetState(t);
  }, []);

  return (
    <section className="sd-tiers" aria-label="Capsules">
      <ul className="sd-tiers__row">
        {TIERS.map((t) => (
          <li key={t.key}>
            <button
              type="button"
              className="sd-tier"
              data-tier={t.key}
              style={{ '--tier': rarityInfo(t.lit).color } as CSSProperties}
              onPointerEnter={loadSheet}
              onTouchStart={loadSheet}
              onFocus={loadSheet}
              onClick={() => setSheet(t)}
            >
              <TierCapsule tier={t} />
              <span className="sd-tier__head">
                <span className="sd-tier__name">{t.name}</span>
                <span className="sd-tier__price">${t.priceUsd}</span>
              </span>
              <span className="sd-tier__line">
                {t.line} · {CARDS_PER_TIER} cards
              </span>
              <span className="sd-tier__odds" aria-label={`Odds per card: ${RARITIES.map((r) => `${rarityInfo(r).label} ${pct(t.oddsBps[r])}`).join(', ')}`}>
                {RARITIES.map((r) => (
                  <span key={r} data-rarity={r} style={{ flexGrow: t.oddsBps[r] }} />
                ))}
              </span>
              <span className="sd-tier__best">
                <span style={{ color: rarityInfo('legendary').color }}>✦ Legendary {pct(t.oddsBps.legendary)}</span>
                <span>Epic {pct(t.oddsBps.epic)}</span>
                {onSale && <span className="sd-tier__stock">{onSale[t.key] ? `${onSale[t.key]} on sale` : 'None on sale'}</span>}
              </span>
              <span className="sd-tier__open">Buy &amp; open</span>
            </button>
          </li>
        ))}
      </ul>

      {sheet && (
        <CapsuleTierSheet
          tier={sheet}
          onClose={closeSheet}
          onPreview={() => {
            setSheet(null);
            start(sheet);
          }}
        />
      )}
      {open && (
        <SideraReveal key={open.n} draw={open.draw} onAgain={() => start(open.tier)} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
