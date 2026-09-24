'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { RARITIES, rarityInfo, type Rarity } from '@/lib/rarity';
import { CARDS_PER_TIER, TIERS, rarityAt, type Tier } from '@/lib/sidera/tiers';
import SideraReveal, { type Draw } from './SideraReveal';

export type TierCard = { designation: string; name: string; rarity: Rarity; editionSize: number };

const pct = (bps: number) => {
  const p = bps / 100;
  return p === 0 ? '—' : p < 1 ? `${p.toFixed(1)}%` : `${Math.round(p)}%`;
};

/** Three cards at a tier's odds, drawn here in the browser. Preview only. */
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
 * The four capsules, cheapest first, the odds climbing with the price. Any of
 * them opens straight away — no account, no payment — so the reveal can be
 * seen as it will be; nothing drawn here is recorded.
 */
export default function CapsuleTiers({ cards }: { cards: TierCard[] }) {
  const [open, setOpen] = useState<{ tier: Tier; draw: Draw; n: number } | null>(null);
  const start = useCallback((tier: Tier) => setOpen((o) => ({ tier, draw: drawFrom(tier, cards), n: (o?.n ?? 0) + 1 })), [cards]);

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
              onClick={() => start(t)}
            >
              <span className="sd-tier__capsule" aria-hidden="true">
                <span className="sd-tier__card" />
                <span className="sd-tier__card" />
                <span className="sd-tier__card sd-tier__card--front">
                  <span className="sd-tier__mark">Sidera</span>
                  <span className="sd-tier__kind">{t.name}</span>
                </span>
              </span>
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
              </span>
              <span className="sd-tier__open">Open</span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <SideraReveal key={open.n} draw={open.draw} onAgain={() => start(open.tier)} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
