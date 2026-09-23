import { useId, type CSSProperties } from 'react';
import CardArt from './CardArt';
import { rarityInfo } from '@/lib/rarity';
import { isRendered } from '@/lib/sets/build';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import { FINISH, backSvg, cardFace, frameSvg } from '@/lib/sidera/plate/frame';
import { FULL_ART, SURVEYED, plateUrl, surveyPlate } from '@/lib/sidera/plate/objects';

export type SideraCardProps = {
  designation: string;
  /** The holder's edition number. Null prints the edition size. */
  edition?: number | null;
  side?: 'front' | 'back';
  /** 'tile' leaves out the survey callouts, which are too small to read in a grid. */
  detail?: 'full' | 'tile';
  /** Load the art at once: the card a page is about. Grids load it as it scrolls in. */
  eager?: boolean;
  className?: string;
};

const GLITTER = (u: string) =>
  `<svg width="100%" height="100%" viewBox="0 0 630 880" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><filter id="${u}gl" x="0" y="0" width="100%" height="100%">` +
  `<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  0 0 0 9 -6.2"/></filter></defs>` +
  `<rect width="630" height="880" filter="url(#${u}gl)"/></svg>`;

/**
 * A Set 001 card as a printed object: the art window (sky, object and survey
 * layers, which move apart when the card tilts), the frame in its rarity's
 * metal, and foil, glitter and glare over the top. Everything is drawn; no
 * image is fetched except a card's own render where the set has one.
 *
 * It holds no state. Tilt and flip come from SideraCardStage, through the
 * --px/--py custom properties and the stage's classes.
 */
export default function SideraCard({ designation, edition = null, side = 'front', detail = 'full', eager = false, className = '' }: SideraCardProps) {
  const u = 'c' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const seed = SET_001_CARD_BY_DESIGNATION.get(designation)?.seed;
  // Sky and object are fetched as files; only the survey, which is text in the page's fonts, is
  // inlined, and only at full detail, so a grid never draws a plate it would throw away.
  const surveyed = SURVEYED.includes(designation);
  const survey = surveyed && detail === 'full' && side === 'front' ? surveyPlate(designation, u)?.survey : null;
  const face = cardFace(designation, edition, FULL_ART.has(designation));
  if (!seed || !face) return null;

  const info = rarityInfo(face.rarity);
  const finish = FINISH[face.rarity];
  const label =
    side === 'back'
      ? `Back of ${face.name}`
      : `${face.name}, ${info.label} card, ${edition === null ? `edition of ${face.editionSize}` : `edition ${edition} of ${face.editionSize}`}`;
  const style = { '--sd-foil': finish.foil, '--sd-glitter': finish.glitter } as CSSProperties;

  if (side === 'back') {
    return (
      <div className={`sd-card ${className}`.trim()} data-rarity={face.rarity} role="img" aria-label={label} style={style}>
        <div className="sd-card__svg" dangerouslySetInnerHTML={{ __html: backSvg(face, u + 'b') }} />
        {finish.foil > 0 && <div className="sd-card__foil" />}
        <div className="sd-card__glare" />
      </div>
    );
  }

  return (
    <div className={`sd-card ${className}`.trim()} data-rarity={face.rarity} role="img" aria-label={label} style={style}>
      <div className="sd-card__window" data-full={face.full ? '' : undefined}>
        {surveyed ? (
          <>
            <div className="sd-card__layer sd-card__layer--sky">
              <img src={plateUrl(designation, 'sky')} alt="" decoding="async" loading={eager ? 'eager' : 'lazy'} />
            </div>
            <div className="sd-card__layer sd-card__layer--object">
              <img src={plateUrl(designation, 'object')} alt="" decoding="async" loading={eager ? 'eager' : 'lazy'} />
            </div>
            {survey && <div className="sd-card__layer sd-card__layer--survey" dangerouslySetInnerHTML={{ __html: survey }} />}
          </>
        ) : (
          <div className="sd-card__layer sd-card__layer--object">
            {isRendered(seed.artUrl) ? (
              <img src={seed.artUrl ?? undefined} alt="" loading="lazy" decoding="async" />
            ) : (
              <CardArt designation={designation} bare className="sd-card__drawn" />
            )}
          </div>
        )}
      </div>
      <div className="sd-card__svg" dangerouslySetInnerHTML={{ __html: frameSvg(face, u + 'f') }} />
      {finish.foil > 0 && <div className="sd-card__foil" />}
      {finish.glitter > 0 && <div className="sd-card__glitter" dangerouslySetInnerHTML={{ __html: GLITTER(u) }} />}
      <div className="sd-card__glare" />
    </div>
  );
}
