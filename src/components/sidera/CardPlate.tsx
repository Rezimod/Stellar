import Link from 'next/link';
import CardArt from './CardArt';
import { rarityInfo, type Rarity } from '@/lib/rarity';
import type { ObservationStatus } from '@/lib/sidera/observability';
import DataRow, { type Datum } from './ui/DataRow';
import ObservationStatusMark from './ui/ObservationStatusMark';
import RarityMark from './ui/RarityMark';

export type CardPlateProps = {
  designation: string;
  name: string;
  rarity: Rarity;
  observationStatus: ObservationStatus;
  /** A real capture. Null draws the outline plate: an edition nobody holds yet.
   *  The placeholder path means no frame exists, so the plate is drawn instead. */
  artUrl?: string | null;
  /** Metadata beneath the image, in mono. Edition number first, where there is one. */
  data?: Datum[];
  /** The card page. Without it the plate is not a link. */
  href?: string;
  /** Type and padding scale. The grid still decides the width. */
  size?: 'sm' | 'md' | 'lg';
};

/**
 * One object shot on black, captioned the way a survey captions a detection.
 *
 * Image, then designation, name, the two marks side by side, then the data.
 * Until a card has been photographed the plate is drawn from its own record
 * (CardArt); epic and legendary take their rarity colour in the plate's edge,
 * so scarcity reads before the words do.
 */
export default function CardPlate({ designation, name, rarity, observationStatus, artUrl, data, href, size = 'md' }: CardPlateProps) {
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
      <hr className="sd-rule sd-rule--strong" />
      <div className="sd-plate__body">
        <p className="sd-label">{designation}</p>
        <h3 className="sd-plate__name">{name}</h3>
        <p className="sd-plate__marks">
          <RarityMark rarity={rarity} />
          <ObservationStatusMark status={observationStatus} />
        </p>
        {data && data.length > 0 && <DataRow items={data} />}
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
