import { memo, type CSSProperties, type ReactNode } from 'react';
import FadeImg from '../FadeImg';
import type { Plate } from '@/lib/stellar/plate';
import { perkFor } from '@/lib/stellar/perks';
import { cardPriceUsd } from '@/lib/stellar/economics';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import ACCENTS from '@/lib/stellar/accents.json';
import AgencyBadge, { MISSION } from './AgencyBadge';

type Props = {
  plate: Plate;
  capture?: string | null;
  lite?: boolean;
  priority?: boolean;
  u: string;
  /** '$8', or 'Sealed'. Defaults to the card's list price. */
  price?: string;
  /** The line at the foot: how many are left, or an Almanac card's date. */
  sub?: ReactNode;
};

/** The card's painted scene (scripts/stellar-plates/art-prompts.json). */
export const artFor = (designation: string) => `/cards/art/${designation}.webp?v=3`;

/** The card's colour, sampled from its own picture (scripts/stellar-plates/accents.ts). */
export const accentFor = (designation: string) => (ACCENTS as Record<string, string>)[designation] ?? '#dfe3ea';

/** The pictures a full-size card face loads, to fetch ahead of opening it. */
export function faceSources(plate: Plate) {
  return [artFor(plate.designation)];
}

function CardFront({ plate, capture, priority = false, price, sub }: Props) {
  const source = capture ?? artFor(plate.designation);
  const seed = SET_001_CARD_BY_DESIGNATION.get(plate.designation)?.seed;
  const perk = perkFor(plate.designation, plate.rarity);
  const shown = price ?? `$${cardPriceUsd(plate.designation, plate.rarity)}`;
  const foot = sub ?? `${Number(plate.of)} editions`;

  return (
    <div
      className="sdc-card sdc-card--front"
      data-rarity={plate.rarity}
      style={{ '--card-accent': accentFor(plate.designation) } as CSSProperties}
    >
      <header className="sdc-top">
        <span className="sdc-no">No. {plate.num}</span>
        <span className="sdc-tier">{plate.rname}<i aria-hidden="true" /></span>
      </header>
      <div className="sdc-panel">
        <div className="sdc-art">
          <FadeImg src={source} alt="" priority={priority} />
          {MISSION[plate.designation] && <AgencyBadge agencies={['NASA']} label={MISSION[plate.designation]} className="sdc-mission" />}
        </div>
        <div className="sdc-caption">
          <div className="sdc-title">
            <strong className="sdc-name" style={{ '--card-name-size': `${Math.min(10.5, 150 / plate.name.length)}cqw` } as CSSProperties}>{plate.name}</strong>
            <span className="sdc-price">{shown}</span>
          </div>
          <span className="sdc-kind">{seed?.objectType ?? plate.poster.headline}</span>
          <div className="sdc-foot">
            <span className="sdc-perk">{perk.short}</span>
            <span className="sdc-left">{foot}</span>
          </div>
        </div>
      </div>
      <div className="sdc-glare" aria-hidden="true" />
    </div>
  );
}

export default memo(CardFront);
