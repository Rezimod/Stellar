import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { objectArt } from '@/lib/discovery/passArt';
import {
  RARITY_TO_TIER,
  generateVisualGradient,
  type CelestialObject,
  type Rarity,
} from '@/lib/discovery/rarityEngine';
import { TIER_BY_ID } from '@/lib/discovery/tiers';

/**
 * The 1200x630 discovery share card.
 *
 * It shows the same object as the reveal card, as the same object: the tier's
 * material as the surface it is lying on, the artifact itself tilted on the
 * left, its contact shadow underneath, and the identity set beside it. A glowing
 * disc on a starfield was a picture OF a result; this is a photograph of the
 * thing you own.
 *
 * Rendered two ways from one set of tokens: this component for in-app display
 * and /api/discovery/share-card for the Open Graph image (satori, static). The
 * layout is written twice on purpose — satori accepts only inline styles and a
 * subset of flexbox — but everything that must agree between the two, the
 * materials, the geometry, the star field and the type scale, is exported from
 * here so the OG image cannot drift from what the holder saw.
 *
 * Nothing here animates, in either rendering. The OG image is one frame, and a
 * card that shimmered in-app but not in the tweet would be two artifacts again.
 */

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

/** Deep space ground, for the sealed cards — those have no tier to draw on. */
export const SHARE_CARD_BG = 'linear-gradient(160deg, #04061A 0%, #0A0F28 100%)';

/* ── The artifact ─────────────────────────────────────────────────────────
   Poker proportions, 2.5 x 3.5. The gallery cards are taller than that (they
   carry an odds row), but a card being photographed on its own reads as a
   physical object only at the proportion a physical card actually has. */
export const ARTIFACT_WIDTH = 336;
export const ARTIFACT_HEIGHT = 470;
/** Laid down, not pinned up. Enough to read as an object, not enough to fight
 *  the type beside it. */
export const ARTIFACT_TILT = -8;
/** Inner gutter, and the height of the rail above the plate. The four blocks
 *  are placed from these by arithmetic in both renderers. */
export const ARTIFACT_PAD = 18;
export const ARTIFACT_RAIL_H = 42;
/** Centred in the left 55% of the canvas. */
export const ARTIFACT_LEFT = Math.round(SHARE_CARD_WIDTH * 0.275 - ARTIFACT_WIDTH / 2);
export const ARTIFACT_TOP = Math.round((SHARE_CARD_HEIGHT - ARTIFACT_HEIGHT) / 2);

/** Two-sided bevel for thickness, then the contact shadow — neutral black,
 *  never a tier-coloured glow. Same construction as `.dsc-pass`. */
export const ARTIFACT_SHADOW = [
  'inset 2px 2px 1px -1px rgba(255, 255, 255, 0.09)',
  'inset -2px -2px 1px -1px rgba(0, 0, 0, 0.6)',
  '0 24px 34px -16px rgba(0, 0, 0, 0.72)',
  '0 56px 86px -28px rgba(0, 0, 0, 0.7)',
].join(', ');

/* ── Materials ────────────────────────────────────────────────────────────
   The five materials from discovery.css, restated for the two renderers that
   cannot read a stylesheet. discovery.css owns the animated versions; these
   are the still frames, flattened to gradients satori can rasterise.

   `ground` is the surface the card is lying on: the same material taken down
   several stops, so the card separates from it by being lit rather than by
   being a different colour. */
export type ShareMaterial = {
  ground: string;
  surface: string;
  /** Finish painted over the face, or null for a matte one. */
  sheen: string | null;
  /** Machined rim. */
  edge: string;
  /** Rim colour at full strength — tier name, rarity mark. */
  ink: string;
  /** Hairline mat around the print. */
  frame: string;
  /** The material compressed to a swatch, for the rarity mark. */
  chip: string;
};

export const SHARE_MATERIAL: Record<Rarity, ShareMaterial> = {
  COMMON: {
    ground: 'linear-gradient(160deg, #16181d 0%, #0a0b0e 56%, #101216 100%)',
    surface: 'linear-gradient(170deg, #131519 0%, #0c0d10 52%, #070809 100%)',
    sheen: null,
    edge: 'rgba(255, 255, 255, 0.09)',
    ink: '#97A0AD',
    frame: 'rgba(255, 255, 255, 0.13)',
    chip: 'linear-gradient(135deg, #2f343c 0%, #16181c 52%, #0a0b0e 100%)',
  },
  UNCOMMON: {
    ground: 'linear-gradient(160deg, #171d26 0%, #0c1015 58%, #1a212b 100%)',
    surface: 'linear-gradient(180deg, #191e26 0%, #11151c 55%, #0b0e13 100%)',
    sheen:
      'linear-gradient(90deg, transparent 8%, rgba(205, 220, 235, 0.06) 32%, rgba(235, 244, 252, 0.04) 50%, rgba(205, 220, 235, 0.06) 70%, transparent 94%)',
    edge: 'rgba(200, 212, 226, 0.26)',
    ink: '#C8D4E2',
    frame: 'rgba(200, 212, 226, 0.36)',
    chip: 'linear-gradient(135deg, #8b9aad 0%, #232a33 46%, #6f8093 78%, #aebdcd 100%)',
  },
  RARE: {
    ground: 'linear-gradient(160deg, #0d1738 0%, #060b1f 58%, #12205a 100%)',
    surface: 'linear-gradient(160deg, #0b1533 0%, #0d1c4a 44%, #060d24 100%)',
    sheen:
      'linear-gradient(115deg, transparent 32%, rgba(150, 190, 255, 0.1) 46%, rgba(215, 235, 255, 0.14) 50%, rgba(150, 190, 255, 0.1) 54%, transparent 68%)',
    edge: 'rgba(130, 168, 255, 0.32)',
    ink: '#92B0FF',
    frame: 'rgba(130, 168, 255, 0.44)',
    chip: 'linear-gradient(135deg, #6f97ff 0%, #16255c 44%, #0b1435 72%, #5b83f0 100%)',
  },
  EPIC: {
    ground: 'linear-gradient(160deg, #2a1607 0%, #120902 58%, #331b08 100%)',
    surface: 'linear-gradient(170deg, #251507 0%, #190d04 52%, #100802 100%)',
    sheen:
      'radial-gradient(120% 85% at 50% 88%, rgba(255, 138, 52, 0.18) 0%, rgba(255, 96, 32, 0.07) 42%, transparent 68%)',
    edge: 'rgba(255, 168, 92, 0.3)',
    ink: '#FFB673',
    frame: 'rgba(255, 168, 92, 0.44)',
    chip: 'linear-gradient(135deg, #ffb673 0%, #7a3d0d 46%, #3a1c05 72%, #ff9a45 100%)',
  },
  LEGENDARY: {
    ground: 'linear-gradient(160deg, #2c1d07 0%, #120c03 58%, #372509 100%)',
    surface: 'linear-gradient(160deg, #211505 0%, #171004 58%, #0e0a03 100%)',
    sheen:
      'linear-gradient(105deg, rgba(247, 231, 206, 0.05) 0%, rgba(255, 215, 110, 0.16) 18%, rgba(255, 190, 120, 0.09) 34%, rgba(232, 160, 150, 0.15) 50%, rgba(255, 215, 110, 0.14) 66%, rgba(247, 231, 206, 0.05) 84%, rgba(232, 160, 150, 0.11) 100%)',
    edge: 'rgba(255, 213, 118, 0.44)',
    ink: '#FFD576',
    frame: 'rgba(255, 213, 118, 0.52)',
    chip: 'linear-gradient(135deg, #fff3c4 0%, #ffd576 22%, #8a6320 48%, #ffd576 72%, #e8a096 100%)',
  },
};

/** Keeps the lit edge of the ground under the card and darkens the corners, so
 *  the surface reads as a lit table rather than a flat fill. */
export const SHARE_GROUND_VEIL =
  'radial-gradient(80% 76% at 27% 44%, rgba(255, 255, 255, 0.07) 0%, transparent 64%), radial-gradient(130% 105% at 38% 50%, transparent 30%, rgba(0, 0, 0, 0.6) 100%)';

export type ShareStar = { x: number; y: number; r: number; o: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Star dots in card pixel space, drawn from the object's visualSeed so the same
 * pass always renders the same sky — the in-app card and the OG image have to
 * be the same picture. Dim: they are the room the card is sitting in, not the
 * subject, and they are the only thing carrying over from the old layout.
 */
export function shareCardStars(visualSeed: number, count = 84): ShareStar[] {
  const rand = mulberry32(visualSeed || 1);
  return Array.from({ length: count }, () => {
    const x = Math.round(rand() * SHARE_CARD_WIDTH);
    const y = Math.round(rand() * SHARE_CARD_HEIGHT);
    // Dimmer under the text column: at full brightness a dot lands on a glyph
    // often enough to look like a rendering fault rather than a star.
    const cap = x > SHARE_CARD_WIDTH * 0.58 ? 0.16 : 0.42;
    return {
      x,
      y,
      r: Number((0.9 + rand() * 1.5).toFixed(2)),
      o: Number(Math.min(0.1 + rand() * 0.4, cap).toFixed(2)),
    };
  });
}

/** "Oct 21, 2026" — fixed to UTC so every holder reads the same reveal date. */
export function formatDiscoveredOn(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Type scale for the name, stepped down by length.
 *
 * The text column is 428px of usable width and the name is set in the display
 * face, which is considerably wider per character than the old body setting —
 * roughly twelve characters fit on a line at 52px. The longest name in the pool
 * ("The Pillars of Creation", 23) still wraps at the smallest step,
 * deliberately: shrinking far enough to hold it on one line would leave it
 * whispering next to a "Vega".
 */
export function shareCardNameSize(name: string): number {
  if (name.length > 17) return 34;
  if (name.length > 12) return 42;
  return 52;
}

export const SHARE_CARD_URL = 'stellarr.club/discovery';

type Props = {
  object: CelestialObject;
  /** Multiply for in-app display: 0.4 renders a 480x252 card. */
  scale?: number;
  /** Defaults to the fixed reveal moment. */
  discoveredAtMs?: number;
  /** Printed in the card's rail, where a gallery card prints its position in
   *  the set. */
  passNumber: number;
};

export default function ShareCard({
  object,
  scale = 1,
  discoveredAtMs = REVEAL_AT_MS,
  passNumber,
}: Props) {
  const m = SHARE_MATERIAL[object.rarity] ?? SHARE_MATERIAL.COMMON;
  const tier = TIER_BY_ID[RARITY_TO_TIER[object.rarity]];
  const stars = shareCardStars(object.visualSeed);
  const art = objectArt(object.id);
  const legendary = object.rarity === 'LEGENDARY';

  return (
    <div
      style={{
        width: SHARE_CARD_WIDTH * scale,
        height: SHARE_CARD_HEIGHT * scale,
        overflow: 'hidden',
      }}
    >
      <div
        role="img"
        aria-label={`${object.name}, ${object.rarity.toLowerCase()} discovery, revealed ${formatDiscoveredOn(discoveredAtMs)}`}
        style={{
          position: 'relative',
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: m.ground,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: SHARE_GROUND_VEIL }} />

        {stars.map((s, i) => (
          <span
            key={i}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: s.x,
              top: s.y,
              width: s.r * 2,
              height: s.r * 2,
              borderRadius: 999,
              background: '#FFFFFF',
              opacity: s.o,
            }}
          />
        ))}

        {/* Left 55% — the artifact, laid on the material and lit from above.

            Its blocks are placed absolutely rather than stacked in a column.
            Every dimension inside this card is fixed, so flex buys no reflow it
            could use, and the OG renderer cannot do it any other way: satori
            collapses an absolutely-positioned flex ROW to a hairline, and drops
            every child declared before the plate if the card clips. Hence two
            half-width rail boxes, a rule of its own, and `overflow: hidden` on
            the plate rather than on the card. Two renderers, one arithmetic. */}
        <div
          style={{
            position: 'absolute',
            left: ARTIFACT_LEFT,
            top: ARTIFACT_TOP,
            width: ARTIFACT_WIDTH,
            height: ARTIFACT_HEIGHT,
            transform: `rotate(${ARTIFACT_TILT}deg)`,
            display: 'flex',
            borderRadius: 16,
            background: m.sheen ? `${m.sheen}, ${m.surface}` : m.surface,
            border: `1px solid ${m.edge}`,
            boxShadow: ARTIFACT_SHADOW,
          }}
        >
          {/* 1. Rail */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: ARTIFACT_WIDTH / 2,
              height: ARTIFACT_RAIL_H,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingLeft: ARTIFACT_PAD,
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: m.ink,
            }}
          >
            {tier.name.toUpperCase()}
          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              left: ARTIFACT_WIDTH / 2,
              width: ARTIFACT_WIDTH / 2,
              height: ARTIFACT_RAIL_H,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'flex-end',
              paddingRight: ARTIFACT_PAD,
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              letterSpacing: '0.04em',
              color: 'rgba(255, 255, 255, 0.5)',
            }}
          >
            {`Pass #${passNumber}`}
          </div>

          <div
            style={{
              position: 'absolute',
              top: ARTIFACT_RAIL_H - 1,
              left: 0,
              width: ARTIFACT_WIDTH,
              height: 1,
              background: 'rgba(255, 255, 255, 0.07)',
            }}
          />

          {/* 2. The plate, full width of the slab, square, matted */}
          <div
            style={{
              position: 'absolute',
              top: ARTIFACT_RAIL_H,
              left: 0,
              width: ARTIFACT_WIDTH,
              height: ARTIFACT_WIDTH,
              display: 'flex',
              overflow: 'hidden',
              background: '#04060C',
            }}
          >
            {art ? (
              <img
                src={art.src}
                alt=""
                width={ARTIFACT_WIDTH}
                height={ARTIFACT_WIDTH}
                style={{
                  width: ARTIFACT_WIDTH,
                  height: ARTIFACT_WIDTH,
                  objectFit: 'cover',
                  transform: `scale(${art.scale ?? 1})`,
                }}
              />
            ) : (
              <div
                style={{
                  width: ARTIFACT_WIDTH,
                  height: ARTIFACT_WIDTH,
                  background: generateVisualGradient(object.visualSeed, object.rarity),
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                width: ARTIFACT_WIDTH - 24,
                height: ARTIFACT_WIDTH - 24,
                border: `1px solid ${m.frame}`,
              }}
            />
            {legendary && (
              <div
                style={{
                  position: 'absolute',
                  top: 15,
                  left: 15,
                  width: ARTIFACT_WIDTH - 30,
                  height: ARTIFACT_WIDTH - 30,
                  border: `1px solid ${m.frame}`,
                }}
              />
            )}
          </div>

          {/* 3. Specimen label.
              There is no fourth block here. A gallery card ends in a value
              block because it is being compared with four others; a share card
              is one object on a table, and the reward it carries is already
              said by the rarity beside it. It also does not fit: poker
              proportions minus a square plate leave room for a placard, not a
              placard and a price. */}
          <div
            style={{
              position: 'absolute',
              top: ARTIFACT_RAIL_H + ARTIFACT_WIDTH,
              left: 0,
              width: ARTIFACT_WIDTH,
              height: ARTIFACT_HEIGHT - ARTIFACT_RAIL_H - ARTIFACT_WIDTH,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: `0 ${ARTIFACT_PAD}px`,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
              }}
            >
              {object.name}
            </div>
            <div
              style={{
                marginTop: 4,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                lineHeight: 1.3,
                letterSpacing: '0.05em',
                color: 'rgba(255, 255, 255, 0.54)',
              }}
            >
              {art ? art.instrument.toUpperCase() : 'NOT YET IMAGED'}
            </div>
          </div>
        </div>

        {/* Right 45% — the identity */}
        <div
          style={{
            position: 'absolute',
            left: SHARE_CARD_WIDTH * 0.55,
            top: 0,
            width: SHARE_CARD_WIDTH * 0.45,
            height: SHARE_CARD_HEIGHT,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: '52px 56px',
            textAlign: 'right',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.32em',
              color: 'rgba(255, 255, 255, 0.55)',
            }}
          >
            STELLARR
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: shareCardNameSize(object.name),
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
              }}
            >
              {object.name}
            </div>

            {/* The rarity, said the way the board says it: the material first. */}
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 5,
                  background: m.chip,
                  border: `1px solid ${m.edge}`,
                }}
              />
              <div
                style={{
                  marginLeft: 10,
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.2em',
                  color: m.ink,
                }}
              >
                {object.rarity}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                letterSpacing: '0.04em',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              Discovered {formatDiscoveredOn(discoveredAtMs)}
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: 'var(--font-mono)',
                fontSize: 15,
                letterSpacing: '0.06em',
                color: 'rgba(255, 255, 255, 0.62)',
              }}
            >
              {SHARE_CARD_URL}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
