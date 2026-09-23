import { rarityInfo, type Rarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
import CardScene, { resume } from './CardScene';
import { paletteFor } from './cardArtPalette';

/**
 * The plate, drawn rather than photographed.
 *
 * Until Node 01 has recorded an object, a card still has to show what it is,
 * so each one is drawn from its own record and composed like a plate from a
 * set: rarity, name and set number over the object itself, in the object's own
 * colours. The drawing is deterministic — the same designation always produces
 * the same plate — and it is never passed off as an observation. The moment a
 * real frame exists it replaces this.
 */

/** A small deterministic generator, so a card's plate never changes between renders. */
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return resume(h);
}

type Kind = 'lunar' | 'planet' | 'moon' | 'star' | 'deepsky' | 'fiction';

function kindOf(objectType: string): Kind {
  const t = objectType.toLowerCase();
  if (t.startsWith('fictional')) return 'fiction';
  if (t.includes('lunar')) return 'lunar';
  if (t.includes('planet') || t.includes('atmospheric')) return 'planet';
  if (t.includes('moon')) return 'moon';
  if (t.includes('star') && !t.includes('cluster')) return 'star';
  return 'deepsky';
}

/** Two lines where a name is long enough to need them, one where it isn't. */
function titleLines(name: string): string[] {
  const upper = name.toUpperCase();
  if (upper.length <= 10 || !upper.includes(' ')) return [upper];
  const words = upper.split(' ');
  if (words.length === 2) return words;
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

export default function CardArt({
  designation,
  className = '',
  bare = false,
}: {
  designation: string;
  className?: string;
  /** Drop the caption and fiducials, for art that sits inside a card frame that prints its own. */
  bare?: boolean;
}) {
  const card = SET_001_CARD_BY_DESIGNATION.get(designation);
  const name = card?.seed.name ?? designation;
  const objectType = card?.seed.objectType ?? 'deep-sky object';
  const rarity = (card?.seed.rarity ?? 'common') as Rarity;
  const tint = rarityInfo(rarity).color;
  const kind = kindOf(objectType);
  const p = paletteFor(designation);
  const rand = seeded(designation);
  const id = `art-${designation.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const solar = kind === 'lunar' || kind === 'planet';

  const lines = titleLines(name);
  const longest = Math.max(...lines.map((l) => l.length));
  const size = Math.min(lines.length > 1 ? 24 : 30, 164 / (longest * 0.78));
  const top = lines.length > 1 ? 62 : 68;

  /* Drawn in this order, and the scene resumes the sequence after them — the
     scene is a component of its own, so it must not share a generator that a
     second render would advance. */
  const stars = (
    <g>
      {Array.from({ length: 130 }, (_, i) => {
        const r = rand();
        return (
          <circle
            key={i}
            cx={rand() * 200}
            cy={rand() * 280}
            r={r < 0.88 ? 0.45 : 1.1}
            fill={r < 0.75 ? '#ffffff' : p.glow}
            opacity={0.18 + rand() * 0.6}
          />
        );
      })}
    </g>
  );
  // Foreground: rock, close and unlit. Only where there is rock to be near.
  const rocks = solar && (
    <g fill="#03050d">
      {Array.from({ length: 9 }, (_, i) => {
        const x = 6 + i * 23 + rand() * 12;
        const y = 252 + rand() * 26;
        const s = 6 + rand() * 13;
        const pts = Array.from({ length: 7 }, (_, k) => {
          const a = (k / 7) * Math.PI * 2;
          const rr = s * (0.62 + rand() * 0.5);
          return `${(x + Math.cos(a) * rr).toFixed(1)} ${(y + Math.sin(a) * rr).toFixed(1)}`;
        });
        return <polygon key={i} points={pts.join(' ')} opacity={0.75 + rand() * 0.25} />;
      })}
    </g>
  );
  const sceneSeed = rand.state();

  return (
    <svg
      viewBox="0 0 200 280"
      className={className}
      role="img"
      aria-label={`${name}, drawn plate`}
      preserveAspectRatio={bare ? 'xMidYMid slice' : 'xMidYMin slice'}
    >
      <defs>
        <radialGradient id={`${id}-sky`} cx="50%" cy="34%" r="88%">
          <stop offset="0%" stopColor={p.sky[0]} />
          <stop offset="58%" stopColor={p.sky[1]} />
          <stop offset="100%" stopColor={p.sky[2]} />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="33%" cy="28%" r="80%">
          <stop offset="0%" stopColor={p.body} />
          <stop offset="62%" stopColor={p.body} stopOpacity="0.78" />
          <stop offset="100%" stopColor={p.shade} stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={`${id}-wash`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.5" />
          <stop offset="55%" stopColor={p.glow} stopOpacity="0.16" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="40%" stopColor={p.glow} stopOpacity="0.55" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-vignette`} cx="50%" cy="46%" r="72%">
          <stop offset="55%" stopColor="#03050d" stopOpacity="0" />
          <stop offset="100%" stopColor="#03050d" stopOpacity="0.8" />
        </radialGradient>
        <linearGradient id={`${id}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#03050d" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#03050d" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="200" height="280" fill={`url(#${id}-sky)`} />

      {/* A far arm of the galaxy, dust and all, thrown across one corner. */}
      <g opacity="0.55">
        <ellipse cx="172" cy="46" rx="70" ry="26" fill={`url(#${id}-wash)`} transform="rotate(-38 172 46)" />
        <ellipse cx="22" cy="240" rx="58" ry="22" fill={`url(#${id}-wash)`} transform="rotate(-24 22 240)" opacity="0.7" />
      </g>

      {stars}

      <CardScene
        designation={designation}
        kind={kind}
        p={p}
        id={id}
        seed={sceneSeed}
        lat={card?.seed.surfaceLat}
        lon={card?.seed.surfaceLon}
      />

      {rocks}

      <rect width="200" height="280" fill={`url(#${id}-vignette)`} />
      <rect width="200" height="116" fill={`url(#${id}-scrim)`} />

      {!bare && (
        <>
      {/* The caption, set the way a plate is captioned: class, name, set. */}
      <text
        x="100"
        y="26"
        textAnchor="middle"
        fill={tint}
        fontFamily="var(--sd-sans), system-ui, sans-serif"
        fontSize="7"
        fontWeight="600"
        letterSpacing="3.4"
        opacity="0.95"
      >
        {rarity.toUpperCase()}
      </text>

      <g stroke={tint} strokeOpacity="0.55" strokeWidth="0.7">
        <line x1="62" y1="37" x2="88" y2="37" />
        <line x1="112" y1="37" x2="138" y2="37" />
        <ellipse cx="100" cy="37" rx="6" ry="2.2" fill="none" transform="rotate(-18 100 37)" />
        <circle cx="100" cy="37" r="2.6" fill={tint} fillOpacity="0.5" />
      </g>

      {lines.map((line, i) => (
        <text
          key={line}
          x="100"
          y={top + i * (size + 3)}
          textAnchor="middle"
          fill="#f7f9ff"
          fontFamily="var(--sd-display), var(--sd-sans), sans-serif"
          fontSize={size}
          fontWeight="600"
          letterSpacing={size * 0.06}
        >
          {line}
        </text>
      ))}

      <g transform={`translate(0 ${top + (lines.length - 1) * (size + 3) + 14})`}>
        <g stroke={tint} strokeOpacity="0.4" strokeWidth="0.6">
          <line x1="58" y1="-3" x2="80" y2="-3" />
          <line x1="120" y1="-3" x2="142" y2="-3" />
        </g>
        <text
          x="100"
          y="0"
          textAnchor="middle"
          fill="#ffffff"
          fillOpacity="0.72"
          fontFamily="var(--sd-mono), ui-monospace, monospace"
          fontSize="6.5"
          letterSpacing="2.6"
        >
          SET 001
        </text>
      </g>

      {/* The frame marks: a plate is a measurement, so it carries fiducials. */}
      <g stroke={tint} strokeOpacity="0.45" strokeWidth="1">
        <path d="M12 12 h12 M12 12 v12" />
        <path d="M188 12 h-12 M188 12 v12" />
        <path d="M12 268 h12 M12 268 v-12" />
        <path d="M188 268 h-12 M188 268 v-12" />
      </g>
        </>
      )}
    </svg>
  );
}
