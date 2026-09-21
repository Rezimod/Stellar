import Link from 'next/link';
import CardArt from './CardArt';
import { rarityInfo, type Rarity } from '@/lib/rarity';
import type { Datum } from './ui/DataRow';
import RarityMark from './ui/RarityMark';

export type CardPlateProps = {
  designation: string;
  name: string;
  rarity: Rarity;
  /** A real capture. Null draws the outline plate: an edition nobody holds yet.
   *  The placeholder path means no frame exists, so the plate is drawn instead. */
  artUrl?: string | null;
  /** One short figure beside the name, in mono. Edition number first, where there is one. */
  data?: Datum[];
  /** The card page. Without it the plate is not a link. */
  href?: string;
  /** Type and padding scale. The grid still decides the width. */
  size?: 'sm' | 'md' | 'lg';
};

/**
 * One object on black, and a single line beneath it: the name, the rarity
 * glyph, one figure. The drawn plate already prints rarity and name across the
 * art, so the caption carries nothing it repeats. Observation status and the
 * rest of the record live on the card page.
 */
export default function CardPlate({ designation, name, rarity, artUrl, data, href, size = 'md' }: CardPlateProps) {
  const { color } = rarityInfo(rarity);
  const ranked = rarity === 'epic' || rarity === 'legendary';
  const body = (
    <article
      className={`sd-plate ${artUrl ? '' : 'sd-plate--outline'}`.trim()}
      data-size={size}
      data-rarity={rarity}
      style={ranked ? { borderColor: color } : undefined}
    >
      <div className="sd-plate__frame">
        {!artUrl ? (
          <span className="sd-label">Not held</span>
        ) : artUrl.startsWith('/cards/') ? (
          <CardArt designation={designation} />
        ) : (
          <img src={artUrl} alt="" loading="lazy" decoding="async" />
        )}
      </div>
      <div className="sd-plate__body">
        <h3 className="sd-plate__name">{name}</h3>
        <p className="sd-plate__meta">
          <RarityMark rarity={rarity} glyphOnly />
          {data?.map((d) => (
            <span key={d.label}>
              <span className="sr-only">{d.label} </span>
              {d.value}
            </span>
          ))}
        </p>
      </div>
    </article>
  );

  return href ? (
    <Link href={href} className="sd-plate__link">
      {body}
    </Link>
  ) : (
    body
  );
}
