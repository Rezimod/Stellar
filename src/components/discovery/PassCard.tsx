import Image from 'next/image';
import { PASS_ART } from '@/lib/discovery/passArt';
import { formatTierValueUSD } from '@/lib/discovery/passValue';
import { TIER_BY_ID, rewardLine, type TierId } from '@/lib/discovery/tiers';

/**
 * One pass, composed like a graded collectible — the same four blocks on every
 * tier, top to bottom: rail, plate, specimen label, value block.
 *
 * The previous version gave each tier its own architecture, which meant the two
 * cheapest tiers showed their photograph through a small circular port. An 84px
 * disc reads as an icon, not as an artifact, so the photograph is now the whole
 * middle of every card. Restraint between tiers is carried instead by the
 * MATERIAL (graphite → steel → anodized blue → bronze → gold foil) and by how
 * the mat around the print is treated:
 *
 *   common     desaturated and darkened — it reads archival
 *   uncommon   natural, one steel hairline
 *   rare       natural, blue hairline, one orbit ring
 *   epic       slightly warm, amber hairline
 *   legendary  full colour, double gold hairline, foil sweeping over the print
 */

/**
 * Where a card sits in the desktop fan and how it is staged there: Legendary
 * centre, largest, lifted; Rare and Epic flanking it; the two cheapest tiers
 * outermost, smaller, and tipped away like the ends of a fanned hand.
 *
 * `shift` pulls each card toward the middle so the neighbours overlap; it is
 * also what keeps the tipped ends inside the container, since rotating a tall
 * card about its bottom edge swings its top corner outward by roughly the same
 * amount. The DOM order is value-descending (Legendary first), which is the
 * order the phone's scroll row wants, so the fan reorders with `grid-column`
 * rather than with markup. These variables are only read inside the ≥1080px
 * media query — below that they are declared and ignored.
 */
const FAN: Record<TierId, { col: number; z: number; scale: number; lift: string; rot: string; shift: string }> = {
  common: { col: 1, z: 1, scale: 0.96, lift: '14px', rot: '-2.2deg', shift: '14px' },
  rare: { col: 2, z: 2, scale: 1, lift: '4px', rot: '-1.2deg', shift: '7px' },
  legendary: { col: 3, z: 4, scale: 1.06, lift: '-10px', rot: '0deg', shift: '0px' },
  epic: { col: 4, z: 2, scale: 1, lift: '4px', rot: '1.2deg', shift: '-7px' },
  uncommon: { col: 5, z: 1, scale: 0.96, lift: '14px', rot: '2.2deg', shift: '-14px' },
};

export default function PassCard({ id, index }: { id: TierId; index: number }) {
  const tier = TIER_BY_ID[id];
  const art = PASS_ART[id];
  const fan = FAN[id];

  return (
    <div
      className="dsc-pass-tilt"
      style={
        {
          '--dsc-fan-col': fan.col,
          '--dsc-fan-z': fan.z,
          '--dsc-fan-scale': fan.scale,
          '--dsc-fan-lift': fan.lift,
          '--dsc-fan-rot': fan.rot,
          '--dsc-fan-shift': fan.shift,
        } as React.CSSProperties
      }
    >
      <article
        className="dsc-pass dsc-mat"
        data-tier={id}
        style={
          {
            '--dsc-tier': tier.color,
            /* Stagger the specular sweep so five cards never flash in unison. */
            '--dsc-sweep-delay': `${index * -1.55}s`,
          } as React.CSSProperties
        }
      >
        <header className="dsc-pass-rail">
          <h3 className="dsc-pass-tier">{tier.name}</h3>
          <span className="dsc-pass-serial">{String(index + 1).padStart(2, '0')} / 05</span>
        </header>

        <div className="dsc-pass-plate">
          <Image
            src={art.src}
            alt={`${art.objectName}, imaged by ${art.instrument}`}
            fill
            sizes="(max-width: 1079px) 208px, 200px"
            className="dsc-pass-photo"
            style={{
              objectPosition: `${art.focus.x}% ${art.focus.y}%`,
              transform: `scale(${art.scale})`,
            }}
          />
          {id === 'rare' && <span className="dsc-pass-orbit" aria-hidden="true" />}
        </div>

        {/* Museum placard: what is in frame, and the instrument that took it. */}
        <div className="dsc-pass-label">
          <p className="dsc-pass-object">{art.objectName}</p>
          <p className="dsc-pass-instrument">{art.instrument}</p>
        </div>

        <div className="dsc-pass-values">
          <p className="dsc-pass-value">{formatTierValueUSD(id)}</p>
          <p className="dsc-pass-reward">{rewardLine(id)}</p>
          <div className="dsc-pass-odds">
            <span>{tier.odds.toFixed(1)}% odds</span>
            <span>{tier.count.toLocaleString('en-US')} / 10,000</span>
          </div>
        </div>

        <span className="dsc-pass-sweep" aria-hidden="true" />
      </article>
    </div>
  );
}
