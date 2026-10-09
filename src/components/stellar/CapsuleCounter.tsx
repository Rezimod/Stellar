'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { RARITIES, rarityInfo, type Rarity } from '@/lib/rarity';
import { CARDS_PER_TIER, TIERS, formatOdds, rarityAt, tierByKey, type Tier } from '@/lib/stellar/tiers';
import type { Draw } from './StellarReveal';
import { SET_001_CARDS } from '@/lib/sets/set-001';

// The sheet carries the wallet and payment code; it is fetched on first
// intent (a pointer over the button, a touch) rather than with the page.
const loadSheet = () => import('./CapsuleTierSheet');
const CapsuleTierSheet = dynamic(loadSheet, { ssr: false });
const loadReveal = () => import('./StellarReveal');
const StellarReveal = dynamic(loadReveal, { ssr: false });

export type TierCard = { designation: string; name: string; rarity: Rarity; editionSize: number };

const pct = (bps: number) => (bps === 0 ? '—' : formatOdds(bps));

/** A capsule's cards at a tier's odds, drawn here in the browser. Preview only. */
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
 * opens the sheet with the next capsule of that tier; the preview draws its
 * card here in the browser — no account, no payment, nothing recorded.
 */
export default function CapsuleCounter({ cards, onSale }: { cards: TierCard[]; onSale: Record<string, number> | null }) {
  const [tier, setTier] = useState<Tier>(TIERS[1]);
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

  return (
    <aside className="sd-counter" id="capsules" aria-label="Capsules" style={{ '--tier': rarityInfo(tier.lit).color } as CSSProperties}>
      <div className="sd-counter__visual">
        <img src="/cards/photo/SUN.webp" alt="The Sun photographed by NASA’s Solar Dynamics Observatory" width={600} height={600} fetchPriority="high" />
        <span>One capsule. One piece of the cosmos.</span>
      </div>
      <div className="sd-counter__content">
        <p className="sd-counter__eyebrow">Genesis set · {SET_001_CARDS.length} cards</p>
        <h2 className="sd-counter__headline">Pull a piece of the sky.</h2>
        <p className="sd-counter__intro">Real objects. Numbered editions. Rarer cards unlock telescope time, a visitor seat, or a meteorite you can hold.</p>
        <div className="sd-counter__tabs" role="group" aria-label="Choose a capsule">
          {TIERS.map((option) => (
            <button key={option.key} type="button" className="sd-counter__tab" aria-pressed={option.key === tier.key} onClick={() => setTier(option)}>
              <span className="sd-counter__tabname">{option.name}</span>
              <span className="sd-counter__tabprice">${option.priceUsd}</span>
            </button>
          ))}
        </div>
        <div className="sd-counter__oddshead"><span>Odds per card</span><Link href="/capsules/log">Provably fair · verify ↗</Link></div>
        <div className="sd-counter__distribution" aria-hidden="true">
          {[...RARITIES].reverse().map((rarity) => <i key={rarity} style={{ flexGrow: tier.oddsBps[rarity], background: rarityInfo(rarity).color }} />)}
        </div>
        <ul className="sd-counter__odds">
          {[...RARITIES].reverse().map((rarity) => (
            <li key={rarity} style={{ '--r': rarityInfo(rarity).color } as CSSProperties}>
              <span className="sd-counter__rarity"><i aria-hidden="true" />{rarityInfo(rarity).label}</span>
              <span className="sd-counter__pct">{pct(tier.oddsBps[rarity])}</span>
            </li>
          ))}
        </ul>
        <div className="sd-counter__buy">
          <button type="button" className="sd-btn sd-btn--light" disabled={stock === 0} onPointerEnter={loadSheet} onTouchStart={loadSheet} onFocus={loadSheet} onClick={() => setSheet(tier)}>
            {stock === 0 ? 'None on sale' : `Open ${tier.name} capsule — $${tier.priceUsd}`}
          </button>
          <button type="button" className="sd-btn sd-counter__preview" onPointerEnter={loadReveal} onTouchStart={loadReveal} onFocus={loadReveal} onClick={() => start(tier)}>Preview opening</button>
        </div>
        <p className="sd-counter__note">Preview is free — nothing is charged. Telescope experiences are coming soon.</p>
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
      {open && <StellarReveal key={open.n} draw={open.draw} onClose={() => setOpen(null)} />}
    </aside>
  );
}
