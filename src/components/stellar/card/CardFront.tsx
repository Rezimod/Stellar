import { memo, type CSSProperties, type ReactNode } from 'react';
import FadeImg from '../FadeImg';
import type { Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { perkFor } from '@/lib/stellar/perks';
import { cardPriceUsd } from '@/lib/stellar/economics';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import ART from '@/lib/stellar/art.json';
import ACCENTS from '@/lib/stellar/accents.json';

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

const WITH_ART = new Set<string>(ART);

/** The card's own art: a painted scene where there is one, the real photograph where not. */
function artFor(designation: string) {
  if (WITH_ART.has(designation)) return { file: `/cards/art/${designation}.webp`, focus: '50% 50%' };
  const photo = photoFor(designation);
  return photo ? { file: photo.file, focus: photo.focus ?? '50% 50%' } : null;
}

/** The card's colour, sampled from its own picture (scripts/stellar-plates/accents.ts). */
export const accentFor = (designation: string) => (ACCENTS as Record<string, string>)[designation] ?? '#dfe3ea';

/** The pictures a full-size card face loads, to fetch ahead of opening it. */
export function faceSources(plate: Plate) {
  const art = artFor(plate.designation);
  return art ? [art.file] : [];
}

function CardFront({ plate, capture, priority = false, price, sub }: Props) {
  const art = artFor(plate.designation);
  const source = capture ?? art?.file;
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
        <span className="sdc-tier">{plate.rname}</span>
      </header>
      <div className="sdc-panel">
        <div className="sdc-art">
          {source && <FadeImg src={source} alt="" priority={priority} style={{ objectPosition: capture ? '50% 50%' : art?.focus }} />}
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
            <span className="sdc-go" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5" /></svg>
            </span>
          </div>
        </div>
      </div>
      <div className="sdc-glare" aria-hidden="true" />
    </div>
  );
}

export default memo(CardFront);
