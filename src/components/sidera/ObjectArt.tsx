import CardArt from './CardArt';
import { PLACEHOLDER_ART, isRendered } from '@/lib/sets/build';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';

/** A card's art alone, without the plate around it: the render where one exists, else the drawn plate. */
export default function ObjectArt({ designation, className = '' }: { designation: string; className?: string }) {
  const card = SET_001_CARD_BY_DESIGNATION.get(designation);
  const art = card?.seed.artUrl ?? PLACEHOLDER_ART;
  return (
    <span className={`sd-art ${isRendered(art) ? 'sd-art--render' : ''} ${className}`.trim()} aria-hidden="true">
      {art === PLACEHOLDER_ART ? <CardArt designation={designation} /> : <img src={art} alt="" loading="lazy" decoding="async" />}
    </span>
  );
}
