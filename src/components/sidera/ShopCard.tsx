import Link from 'next/link';
import SideraCard from './card/SideraCard';
import type { Rarity } from '@/lib/rarity';

export type ShopCardProps = {
  designation: string;
  name: string;
  rarity: Rarity;
  /** One line under the card: what the object is, how many are left. */
  sub: string;
  price: string;
  /** A pill beside the line: 'Tonight', an edition number. */
  tag?: string;
  /** Shown but not held: the tile steps back. */
  dim?: boolean;
};

/** A card on the floor: the card itself, then one line and the price. */
export default function ShopCard({ designation, name, rarity, sub, price, tag, dim }: ShopCardProps) {
  return (
    <Link href={`/card/${designation}`} className={dim ? 'sd-tile sd-tile--dim' : 'sd-tile'} data-rarity={rarity} aria-label={`${name}, ${price}`}>
      <SideraCard designation={designation} />
      <span className="sd-tile__foot">
        <span className="sd-tile__sub">
          {tag && <span className="sd-pill sd-pill--tag">{tag}</span>}
          {sub}
        </span>
        <span className="sd-tile__price">{price}</span>
      </span>
    </Link>
  );
}
