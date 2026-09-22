import Link from 'next/link';
import ObjectArt from './ObjectArt';
import { rarityInfo, type Rarity } from '@/lib/rarity';

export type ShopCardProps = {
  designation: string;
  name: string;
  rarity: Rarity;
  /** One line under the name: what the object is, how many are left. */
  sub: string;
  price: string;
  /** A second pill under the rarity: 'Tonight', an edition number. */
  tag?: string;
  /** Shown but not held: the tile steps back. */
  dim?: boolean;
};

/** A card as a tile on the floor: rarity pill, the art on its own light, the name, one line, the price. */
export default function ShopCard({ designation, name, rarity, sub, price, tag, dim }: ShopCardProps) {
  return (
    <Link href={`/card/${designation}`} className={dim ? 'sd-tile sd-tile--dim' : 'sd-tile'} data-rarity={rarity}>
      <span className="sd-tile__pills">
        <span className="sd-pill" data-rarity={rarity}>
          {rarityInfo(rarity).label}
        </span>
        {tag && <span className="sd-pill sd-pill--tag">{tag}</span>}
      </span>
      <span className="sd-tile__stage">
        <ObjectArt designation={designation} className="sd-tile__art" />
      </span>
      <span className="sd-tile__name">{name}</span>
      <span className="sd-tile__foot">
        <span className="sd-tile__sub">{sub}</span>
        <span className="sd-tile__price">{price}</span>
      </span>
    </Link>
  );
}
