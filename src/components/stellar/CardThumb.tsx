import { plateFor } from '@/lib/stellar/plate';
import FadeImg from './FadeImg';

export default function CardThumb({ designation, eager = false }: { designation: string; eager?: boolean }) {
  const plate = plateFor(designation);
  if (!plate) return <span className="sd-thumb sd-thumb--blank" aria-hidden="true">{designation}</span>;
  return (
    <div className="sd-thumb" role="img" aria-label={`${plate.name}, ${plate.rname}, Genesis ${plate.num} of ${plate.total}`}>
      <FadeImg src={`${plate.art}/card.webp?v=fieldnotes1`} width={520} height={726} priority={eager} />
    </div>
  );
}
