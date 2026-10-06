import { plateFor } from '@/lib/stellar/plate';
import RarityChip from './card/RarityChip';
import './card/rarity-chip.css';

/**
 * A card as a picture: the face, frame and all, pre-rendered at rest
 * (scripts/stellar-plates/thumbs.mjs). Shelves and the home fan use it, so a
 * hundred cards on screen are a hundred images, not a hundred live cards. The
 * card you can hold and turn over is StellarCard, on the card's own page.
 */
export default function CardThumb({ designation, eager = false }: { designation: string; eager?: boolean }) {
  const plate = plateFor(designation);
  if (!plate)
    return (
      <span className="sd-thumb sd-thumb--blank" aria-hidden="true">
        {designation}
      </span>
    );
  return (
    <span className="sd-thumb">
      <img
        src={`${plate.art}/card.webp?v=poster7`}
        alt=""
        width={520}
        height={726}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : undefined}
        decoding="async"
      />
      <span className="sd-thumb__live" aria-hidden="true" />
      <RarityChip rarity={plate.rarity} label={plate.rname} />
    </span>
  );
}
