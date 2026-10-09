import { memo, type CSSProperties } from 'react';
import FadeImg from '../FadeImg';
import { editionLabel, type Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { rarityInfo } from '@/lib/rarity';

type Props = {
  plate: Plate;
  edition?: number | null;
  commitment?: string | null;
  sealed?: boolean;
  priority?: boolean;
  u: string;
};

export const SEALED_SRC = '/cards/sealed.webp?v=odyssey1';

function CardBack({ plate, edition, commitment, sealed = false, priority = false }: Props) {
  if (sealed) return (
    <div className="sdc-card sdc-card--sealed">
      <img className="sdc-sealed" src={SEALED_SRC} alt="" decoding="async" fetchPriority={priority ? 'high' : undefined} />
      <div className="sdc-glare" />
    </div>
  );

  const photo = photoFor(plate.designation);
  const card = SET_001_CARD_BY_DESIGNATION.get(plate.designation)!;
  const rows = [
    ['Type', card.seed.objectType],
    ...card.record.stats.filter(([label]) => label.toLowerCase() !== 'type').slice(0, 2),
    ['Edition', edition == null ? `${Number(plate.of)} cards` : `${editionLabel(edition)} / ${plate.of}`],
  ];

  return (
    <div className="sdc-card sdc-card--back" data-rarity={plate.rarity} style={{ '--card-accent': rarityInfo(plate.rarity).color } as CSSProperties}>
      <div className="sdc-notes">
        <header className="sdc-notes__head"><span>Field notes</span><span>{plate.num} / {plate.total}</span></header>
        <div className="sdc-notes__image"><FadeImg src={photo?.file ?? `${plate.art}/object.webp`} alt="" priority={priority} style={{ objectPosition: photo?.focus ?? '50% 40%' }} /></div>
        <strong className="sdc-notes__name" style={{ fontSize: `${Math.min(9, 160 / plate.name.length)}cqw` }}>{plate.name}</strong>
        <dl className="sdc-notes__data">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <p className="sdc-notes__story">{plate.story[0]}</p>
        {photo && <p className="sdc-notes__credit">{photo.kind === 'impression' ? 'Art' : 'Image'} · {photo.credit}</p>}
        {commitment && <p className="sdc-notes__credit">Record · {commitment.slice(0, 8)}…{commitment.slice(-6)}</p>}
        <footer className="sdc-notes__foot"><span>Stellar · Genesis</span><span>{plate.rname}</span></footer>
      </div>
      <div className="sdc-glare" aria-hidden="true" />
    </div>
  );
}

export default memo(CardBack);
