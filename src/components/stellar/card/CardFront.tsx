import { memo, type CSSProperties } from 'react';
import FadeImg from '../FadeImg';
import type { Plate } from '@/lib/stellar/plate';
import { photoFor } from '@/lib/stellar/photos';
import { rarityInfo } from '@/lib/rarity';

type Props = {
  plate: Plate;
  capture?: string | null;
  lite?: boolean;
  priority?: boolean;
  u: string;
};

const DRAWN = new Set(['IMILAC', 'CHICXULUB', 'TUNGUSKA', 'JWST', 'SL9', 'VOYAGER-1', 'ARCTURUS', 'POLARIS', 'CMB']);
const WHOLE = new Set(['SUN', 'EARTH', 'MOON', 'MERCURY', 'VENUS', 'MARS', 'JUPITER', 'SATURN', 'URANUS', 'NEPTUNE', 'PLUTO', 'IO', 'EUROPA', 'GANYMEDE', 'TITAN', 'ENCELADUS', 'BLOOD-MOON', 'HUNTERS-MOON', 'CHRISTMAS-SUPERMOON', 'SNOW-MOON-ECLIPSE']);

/** Michroma runs wide: the name fits its longest word on one line and the whole on two. */
function nameSize(title: string) {
  const longest = Math.max(...title.split(' ').map((w) => w.length), title.length / 2 + 2);
  return Math.max(6, Math.min(9.5, 86 / longest));
}

function CardFront({ plate, capture, lite = false, priority = false }: Props) {
  const photo = DRAWN.has(plate.designation) ? null : photoFor(plate.designation);
  const title = plate.poster.title.replaceAll('\n', ' ');
  const source = capture ?? photo?.file;
  const extension = lite ? 'webp' : 'svg';

  return (
    <div className="sdc-card sdc-card--front" data-rarity={plate.rarity} style={{ '--card-accent': rarityInfo(plate.rarity).color } as CSSProperties}>
      <div className={`sdc-art${source ? ' sdc-art--photo' : ''}${!capture && WHOLE.has(plate.designation) ? ' sdc-art--whole' : ''}`}>
        {source ? (
          <FadeImg src={source} alt="" priority={priority} style={{ objectPosition: photo?.focus ?? '50% 50%' }} />
        ) : (
          <>
            <FadeImg className="sdc-art__sky" src={`${plate.art}/sky.${extension}`} alt="" priority={priority} />
            <FadeImg className="sdc-art__object" src={`${plate.art}/object.${extension}`} alt="" priority={priority} />
          </>
        )}
      </div>
      <div className="sdc-atmosphere" aria-hidden="true" />
      <div className="sdc-caption">
        <strong className="sdc-name" style={{ '--card-name-size': `${nameSize(title)}cqw` } as CSSProperties}>{title}</strong>
        <span className="sdc-number">{plate.num} / {plate.total}</span>
      </div>
      {!lite && <div className="sdc-glare" aria-hidden="true" />}
    </div>
  );
}

export default memo(CardFront);
