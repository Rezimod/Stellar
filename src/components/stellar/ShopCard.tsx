import Link from 'next/link';
import CardThumb from './CardThumb';
import type { Rarity } from '@/lib/rarity';
import { glowFor, plateFor } from '@/lib/stellar/plate';
import { rarityInfo } from '@/lib/rarity';
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
};

/** A card on the shelf: the card on its object's own light, its rarity and number above it, its name and price, one line under. */
export default function ShopCard({ designation, name, rarity, sub, price, tag }: ShopCardProps) {
  const num = plateFor(designation)?.num;
  const perk = perkFor(designation, rarity);
  return (
    <Link
      href={`/card/${designation}`}
      className="sd-tile"
      data-rarity={rarity}
      aria-label={`${name}, ${price}`}
      data-zoom={designation}
      data-zoom-price={price}
      style={{ '--tile-glow': glowFor(designation) } as CSSProperties}
    >
      <span className="sd-tile__head" aria-hidden="true">
        {num && <span className="sd-tile__num">No. {num}</span>}
        <span className="sd-chip">
          <i>{rarityInfo(rarity).glyph}</i>
          {rarityInfo(rarity).label}
        </span>
      </span>
      <span className="sd-tile__stage">
        <CardThumb designation={designation} />
        {tag && <span className="sd-tile__tag">{tag}</span>}
      </span>
      <span className="sd-tile__foot">
        <span className="sd-tile__name">{name}</span>
        <span className="sd-tile__price">{price}</span>
        <span className="sd-tile__sub">{sub}</span>
        <span className="sd-tile__perk">
          {perk.short}
          {perk.soon && <em>Soon</em>}
        </span>
      </span>
    </Link>
  );
}
