import Link from 'next/link';
import CardThumb from './CardThumb';
import type { Rarity } from '@/lib/rarity';
import { glowFor } from '@/lib/stellar/plate';
import { perkFor } from '@/lib/stellar/perks';
import type { CSSProperties, ReactNode } from 'react';

export type ShopCardProps = {
  designation: string;
  name: string;
  rarity: Rarity;
  /** One line under the name: how many are left, or an Almanac card's date. */
  sub: ReactNode;
  /** '$8', or 'Sealed' once an Almanac card's event has ended. */
  price: string;
  /** A pill on the card: 'Tonight', an edition number. */
  tag?: string;
  /** Near the top of the shelf: loads at once. */
  eager?: boolean;
  remaining?: number;
  editionSize?: number;
};

/** A card on the shelf: the card on its object's own light, its rarity and number above it, its name and price, one line under. */
export default function ShopCard({ designation, name, rarity, sub, price, tag, eager = false, remaining, editionSize }: ShopCardProps) {
  const perk = perkFor(designation, rarity);
  return (
    <Link
      href={`/card/${designation}`}
      className="sd-tile"
      data-rarity={rarity}
      aria-label={`${name}, ${price}`}
      data-zoom={designation}
      data-zoom-price={price}
      data-zoom-left={remaining}
      style={{ '--tile-glow': glowFor(designation) } as CSSProperties}
    >
      <span className="sd-tile__stage">
        <CardThumb designation={designation} eager={eager} />
        {tag && <span className="sd-tile__tag">{tag}</span>}
      </span>
      <span className="sd-tile__foot">
          <span className="sd-tile__perk">
            Unlocks · {perk.short}
            {perk.soon && <em>Soon</em>}
          </span>
        <span className="sd-tile__price">{price}</span>
        <span className="sd-tile__sub">
          {remaining != null && editionSize != null && <span className="sd-stock" aria-hidden="true"><i style={{ width: `${Math.max(0, Math.min(100, remaining / editionSize * 100))}%` }} /></span>}
          {sub}
        </span>
      </span>
    </Link>
  );
}
