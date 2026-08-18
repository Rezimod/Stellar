import { REVEAL_AT_MS } from '@/lib/discovery/constants';
import { generateVisualGradient, type CelestialObject, type Rarity } from '@/lib/discovery/rarityEngine';

/**
 * The 1200x630 discovery share card.
 *
 * Rendered two ways from one set of tokens: this component for in-app display
 * (real CSS, animated legendary ring) and /api/discovery/share-card for the
 * Open Graph image (satori, static). The layout is written twice on purpose —
 * satori accepts only inline styles and a subset of flexbox — but everything
 * that must agree between the two, the palette and the star field, is exported
 * from here so the OG image cannot drift from what the holder saw.
 */

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

/** Deep space ground, matching the /discovery palette. */
export const SHARE_CARD_BG = 'linear-gradient(160deg, #04061A 0%, #0A0F28 100%)';

export type RarityVisual = {
  /** Pill text, ring and glow hue. */
  accent: string;
  /** Complete box-shadow for the object disc. */
  glow: string;
  /** Pill fill. */
  tint: string;
  /** Pill border. */
  edge: string;
  ring: 'none' | 'static' | 'animated';
};

export const RARITY_VISUAL: Record<Rarity, RarityVisual> = {
  COMMON: {
    accent: '#FFFFFF',
    glow: '0 0 60px 6px rgba(255, 255, 255, 0.10), 0 0 140px 30px rgba(255, 255, 255, 0.05)',
    tint: 'rgba(255, 255, 255, 0.08)',
    edge: 'rgba(255, 255, 255, 0.28)',
    ring: 'none',
  },
  UNCOMMON: {
    accent: '#00C8F0',
    glow: '0 0 70px 8px rgba(0, 200, 240, 0.26), 0 0 170px 40px rgba(0, 200, 240, 0.12)',
    tint: 'rgba(0, 200, 240, 0.12)',
    edge: 'rgba(0, 200, 240, 0.42)',
    ring: 'none',
  },
  RARE: {
    accent: '#9152D7',
    glow: '0 0 78px 10px rgba(145, 82, 215, 0.32), 0 0 190px 46px rgba(145, 82, 215, 0.15)',
    tint: 'rgba(145, 82, 215, 0.16)',
    edge: 'rgba(145, 82, 215, 0.5)',
    ring: 'none',
  },
  EPIC: {
    accent: '#FFB200',
    glow: '0 0 86px 12px rgba(255, 178, 0, 0.34), 0 0 210px 52px rgba(255, 178, 0, 0.16)',
    tint: 'rgba(255, 178, 0, 0.14)',
    edge: 'rgba(255, 178, 0, 0.52)',
    ring: 'static',
  },
  LEGENDARY: {
    accent: '#FFDA6B',
    glow: '0 0 96px 14px rgba(255, 218, 107, 0.4), 0 0 240px 60px rgba(255, 178, 0, 0.18)',
    tint: 'rgba(255, 218, 107, 0.16)',
    edge: 'rgba(255, 218, 107, 0.58)',
    ring: 'animated',
  },
};

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
 * be the same picture.
 */
export function shareCardStars(visualSeed: number, count = 84): ShareStar[] {
  const rand = mulberry32(visualSeed || 1);
  return Array.from({ length: count }, () => {
    const x = Math.round(rand() * SHARE_CARD_WIDTH);
    const y = Math.round(rand() * SHARE_CARD_HEIGHT);
    // Dimmer under the text column: at full brightness a dot lands on a glyph
    // often enough to look like a rendering fault rather than a star.
    const cap = x > SHARE_CARD_WIDTH * 0.58 ? 0.16 : 0.64;
    return {
      x,
      y,
      r: Number((0.9 + rand() * 1.5).toFixed(2)),
      o: Number(Math.min(0.14 + rand() * 0.5, cap).toFixed(2)),
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
 * The text column is 368px of usable width, so at 58px roughly twelve
 * characters fit on a line. The longest name in the pool ("The Pillars of
 * Creation", 23) still wraps at the smallest step — deliberately, since
 * shrinking far enough to hold it on one line would leave it whispering next
 * to a "Vega".
 */
export function shareCardNameSize(name: string): number {
  if (name.length > 17) return 40;
  if (name.length > 12) return 48;
  return 58;
}

export const SHARE_CARD_URL = 'stellarr.club/discovery';

type Props = {
  object: CelestialObject;
  /** Multiply for in-app display: 0.4 renders a 480x252 card. */
  scale?: number;
  /** Defaults to the fixed reveal moment. */
  discoveredAtMs?: number;
};

export default function ShareCard({ object, scale = 1, discoveredAtMs = REVEAL_AT_MS }: Props) {
  const v = RARITY_VISUAL[object.rarity] ?? RARITY_VISUAL.COMMON;
  const stars = shareCardStars(object.visualSeed);

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
          background: SHARE_CARD_BG,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
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

        {/* Left 60% — the object */}
        <div
          style={{
            position: 'relative',
            width: '60%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: 380, height: 380 }}>
            {v.ring === 'static' && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: -26,
                  borderRadius: 999,
                  border: `1px solid ${v.edge}`,
                }}
              />
            )}
            {v.ring === 'animated' && (
              <div
                aria-hidden="true"
                className="dsc-share-ring"
                style={{
                  position: 'absolute',
                  inset: -26,
                  borderRadius: 999,
                  background:
                    'conic-gradient(from 0deg, rgba(255,218,107,0) 0deg, #FFDA6B 70deg, rgba(255,218,107,0) 150deg, rgba(255,178,0,0) 210deg, #FFB200 280deg, rgba(255,178,0,0) 350deg)',
                  WebkitMask:
                    'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                  mask: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 2px))',
                }}
              />
            )}
            <div
              aria-hidden="true"
              style={{
                width: '100%',
                height: '100%',
                borderRadius: 999,
                background: generateVisualGradient(object.visualSeed, object.rarity),
                boxShadow: v.glow,
              }}
            />
          </div>
        </div>

        {/* Right 40% — the identity */}
        <div
          style={{
            position: 'relative',
            width: '40%',
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
                fontFamily: 'var(--font-body)',
                fontSize: shareCardNameSize(object.name),
                fontWeight: 700,
                lineHeight: 1.06,
                letterSpacing: '-0.02em',
                color: '#FFFFFF',
              }}
            >
              {object.name}
            </div>
            <div
              style={{
                marginTop: 20,
                padding: '8px 18px',
                borderRadius: 999,
                background: v.tint,
                border: `1px solid ${v.edge}`,
                color: v.accent,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.18em',
              }}
            >
              {object.rarity}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14,
                letterSpacing: '0.04em',
                color: 'rgba(255, 255, 255, 0.34)',
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
