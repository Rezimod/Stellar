import Link from 'next/link';
import CardThumb from './CardThumb';
import type { Rarity } from '@/lib/rarity';
import { glowFor } from '@/lib/stellar/plate';
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

/** A card on the shelf: the card on its object's own light, its name and price, one line under. */
export default function ShopCard({ designation, name, rarity, sub, price, tag }: ShopCardProps) {
  return (
    <Link
      href={`/card/${designation}`}
      className="sd-tile"
      data-rarity={rarity}
      aria-label={`${name}, ${price}`}
      style={{ '--tile-glow': glowFor(designation) } as CSSProperties}
    >
      <span className="sd-tile__stage">
        <CardThumb designation={designation} />
        {tag && <span className="sd-tile__tag">{tag}</span>}
      </span>
      <span className="sd-tile__foot">
        <span className="sd-tile__name">{name}</span>
        <span className="sd-tile__price">{price}</span>
        <span className="sd-tile__sub">{sub}</span>
      </span>
    </Link>
  );
}
