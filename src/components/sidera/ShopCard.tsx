import Link from 'next/link';
import SideraCard from './card/SideraCard';
import type { Rarity } from '@/lib/rarity';
import { glowFor } from '@/lib/sidera/plate';
import type { CSSProperties, ReactNode } from 'react';

export type ShopCardProps = {
  designation: string;
  name: string;
  rarity: Rarity;
  /** One line under the card: how many are left, or an Almanac card's date. */
  sub: ReactNode;
  /** '$8', or 'Sealed' once an Almanac card's event has ended. */
  price: string;
  /** A pill beside the line: 'Tonight', an edition number. */
  tag?: string;
  /** Shown but not held: the tile steps back. */
  dim?: boolean;
};

/** A card on the floor: the card itself, then one line and the price. */
export default function ShopCard({ designation, name, rarity, sub, price, tag, dim }: ShopCardProps) {
  return (
    <Link
      href={`/card/${designation}`}
      className={dim ? 'sd-tile sd-tile--dim' : 'sd-tile'}
      data-rarity={rarity}
      aria-label={`${name}, ${price}`}
      style={{ '--tile-glow': glowFor(designation) } as CSSProperties}
    >
      <span className="sd-tile__stage">
        <span className="sd-tile__glow" aria-hidden="true" />
        <SideraCard designation={designation} lite />
        {tag && <span className="sd-pill sd-pill--tag sd-tile__tag">{tag}</span>}
      </span>
      <span className="sd-tile__foot">
        <span className="sd-tile__sub">{sub}</span>
        <span className="sd-tile__price">{price}</span>
      </span>
    </Link>
  );
}
