import Link from 'next/link';
import SideraCard from './SideraCard';
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

/**
 * A card on the floor: the printed card itself, then one line and the price.
 * The card already carries its name and rarity, so the tile does not repeat them.
 */
export default function ShopCard({ designation, name, rarity, sub, price, tag, dim }: ShopCardProps) {
  return (
    <Link href={`/card/${designation}`} className={dim ? 'sd-tile sd-tile--card sd-tile--dim' : 'sd-tile sd-tile--card'} data-rarity={rarity}>
      <SideraCard designation={designation} detail="tile" className="sd-tile__card" />
      <span className="sd-tile__foot">
        <span className="sd-tile__sub">
          <span className="sr-only">{name} · </span>
          {sub}
        </span>
        {tag && <span className="sd-pill sd-pill--tag">{tag}</span>}
        <span className="sd-tile__price">{price}</span>
      </span>
    </Link>
  );
}
