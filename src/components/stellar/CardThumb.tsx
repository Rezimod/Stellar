import { plateFor } from '@/lib/stellar/plate';
import FadeImg from './FadeImg';

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
      <FadeImg src={`${plate.art}/card.webp?v=poster12`} width={520} height={726} priority={eager} />
    </span>
  );
}
