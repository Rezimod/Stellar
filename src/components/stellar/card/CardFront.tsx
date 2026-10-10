import { memo, type CSSProperties, type ReactNode } from 'react';
import FadeImg from '../FadeImg';
import { lightFor, type Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { perkFor } from '@/lib/stellar/perks';
import { cardPriceUsd } from '@/lib/stellar/economics';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { rarityInfo } from '@/lib/rarity';
import ART from '@/lib/stellar/art.json';

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

/** The object's light, made bold enough for a rim; the greys stay silver. */
export function accentFor(designation: string) {
  const hex = lightFor(designation);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  if (s < 0.2) return '#d9dde4';
  const h = max === r ? ((g - b) / (max - min) + 6) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
  return `hsl(${Math.round(h * 60)} 78% 60%)`;
}

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
      style={{ '--card-accent': accentFor(plate.designation), '--rarity': rarityInfo(plate.rarity).color } as CSSProperties}
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
