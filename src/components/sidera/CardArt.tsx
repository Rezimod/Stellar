import { rarityInfo, type Rarity } from '@/lib/rarity';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';

/**
 * The plate, drawn rather than photographed.
 *
 * Until Node 01 has recorded an object, a card still has to show what it is,
 * so each one is drawn from its own record: a crater field for the Moon, a
 * banded disc for a planet, spikes for a star, a soft field for a nebula. The
 * drawing is deterministic — the same designation always produces the same
 * plate — and it is never passed off as an observation. The moment a real
 * frame exists it replaces this.
 */

/** A small deterministic generator, so a card's plate never changes between renders. */
function seeded(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return ((h >>> 0) % 10000) / 10000;
  };
}

type Kind = 'lunar' | 'planet' | 'moon' | 'star' | 'deepsky';

function kindOf(objectType: string): Kind {
  const t = objectType.toLowerCase();
  if (t.includes('lunar')) return 'lunar';
  if (t.includes('planet')) return 'planet';
  if (t.includes('moon')) return 'moon';
  if (t.includes('star') && !t.includes('cluster')) return 'star';
  return 'deepsky';
}

function Field({ rand, count = 90 }: { rand: () => number; count?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={rand() * 200}
          cy={rand() * 280}
          r={rand() < 0.86 ? 0.5 : 1.1}
          fill="#ffffff"
          opacity={0.2 + rand() * 0.55}
        />
      ))}
    </g>
  );
}

export default function CardArt({ designation, className = '' }: { designation: string; className?: string }) {
  const card = SET_001_CARD_BY_DESIGNATION.get(designation);
  const objectType = card?.seed.objectType ?? 'deep-sky object';
  const rarity = (card?.seed.rarity ?? 'common') as Rarity;
  const tint = rarityInfo(rarity).color;
  const kind = kindOf(objectType);
  const rand = seeded(designation);
  const id = `art-${designation.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  return (
    <svg viewBox="0 0 200 280" className={className} role="img" aria-label={`${card?.seed.name ?? designation}, drawn plate`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={`${id}-sky`} cx="50%" cy="22%" r="85%">
          <stop offset="0%" stopColor="#16254a" />
          <stop offset="70%" stopColor="#0a1329" />
          <stop offset="100%" stopColor="#05091a" />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="34%" cy="30%" r="78%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.95" />
          <stop offset="55%" stopColor={tint} stopOpacity="0.5" />
          <stop offset="100%" stopColor="#060b18" stopOpacity="0.9" />
        </radialGradient>
        <radialGradient id={`${id}-cloud`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tint} stopOpacity="0.55" />
          <stop offset="55%" stopColor={tint} stopOpacity="0.18" />
          <stop offset="100%" stopColor={tint} stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="200" height="280" fill={`url(#${id}-sky)`} />
      <Field rand={rand} count={kind === 'deepsky' ? 120 : 80} />

      {kind === 'lunar' && (
        <g transform={`translate(${-14 + rand() * 28} ${-10 + rand() * 20}) scale(${0.86 + rand() * 0.38})`} transform-origin="100 150">
          <circle cx="100" cy="150" r="78" fill="#cfd6e4" opacity="0.92" />
          <circle cx="100" cy="150" r="78" fill={`url(#${id}-body)`} opacity="0.35" />
          {/* The card's own feature, set where the gazetteer puts it. */}
          <g>
            <circle cx={100 + (card?.seed.surfaceLon ?? 0) * 0.9} cy={150 - (card?.seed.surfaceLat ?? 0) * 0.9} r={16} fill="#05091a" opacity="0.35" />
            <circle cx={100 + (card?.seed.surfaceLon ?? 0) * 0.9 - 2} cy={150 - (card?.seed.surfaceLat ?? 0) * 0.9 - 2} r={14} fill="#f2f6ff" opacity="0.72" />
            <circle cx={100 + (card?.seed.surfaceLon ?? 0) * 0.9} cy={150 - (card?.seed.surfaceLat ?? 0) * 0.9} r={5} fill="#cfd6e4" />
          </g>
          {Array.from({ length: 14 }, (_, i) => {
            const a = rand() * Math.PI * 2;
            const d = rand() * 66;
            const r = 4 + rand() * 13;
            return (
              <g key={i}>
                <circle cx={100 + Math.cos(a) * d} cy={150 + Math.sin(a) * d} r={r} fill="#0a1329" opacity="0.28" />
                <circle cx={100 + Math.cos(a) * d - r * 0.18} cy={150 + Math.sin(a) * d - r * 0.18} r={r * 0.82} fill="#e8edf6" opacity="0.5" />
              </g>
            );
          })}
          <path d="M100 72 A78 78 0 0 1 100 228 A62 78 0 0 0 100 72" fill="#05091a" opacity="0.55" />
        </g>
      )}

      {kind === 'planet' && (
        <g>
          <circle cx="100" cy="150" r="66" fill={`url(#${id}-body)`} />
          {Array.from({ length: 5 }, (_, i) => (
            <ellipse key={i} cx="100" cy={110 + i * 20} rx={64 - Math.abs(i - 2) * 9} ry={4 + rand() * 3} fill="#05091a" opacity={0.12 + rand() * 0.12} />
          ))}
          {designation === 'SATURN' && (
            <g transform="rotate(-18 100 150)">
              <ellipse cx="100" cy="150" rx="104" ry="26" fill="none" stroke={tint} strokeOpacity="0.75" strokeWidth="7" />
              <ellipse cx="100" cy="150" rx="88" ry="21" fill="none" stroke={tint} strokeOpacity="0.4" strokeWidth="3" />
            </g>
          )}
          <path d="M100 84 A66 66 0 0 1 100 216 A50 66 0 0 0 100 84" fill="#05091a" opacity="0.5" />
        </g>
      )}

      {kind === 'moon' && (
        <g>
          <circle cx="100" cy="150" r="44" fill={`url(#${id}-body)`} />
          {Array.from({ length: 10 }, (_, i) => {
            const a = rand() * Math.PI * 2;
            const d = rand() * 36;
            return (
              <path
                key={i}
                d={`M${100 + Math.cos(a) * d} ${150 + Math.sin(a) * d} l${8 + rand() * 20} ${rand() * 10 - 5}`}
                stroke="#05091a"
                strokeOpacity="0.4"
                strokeWidth="1.4"
                fill="none"
              />
            );
          })}
          <path d="M100 106 A44 44 0 0 1 100 194 A34 44 0 0 0 100 106" fill="#05091a" opacity="0.5" />
        </g>
      )}

      {kind === 'star' && (
        <g>
          <circle cx="100" cy="146" r="54" fill={`url(#${id}-cloud)`} />
          <g stroke={tint} strokeOpacity="0.8" strokeLinecap="round">
            <line x1="100" y1="76" x2="100" y2="216" strokeWidth="1.6" />
            <line x1="30" y1="146" x2="170" y2="146" strokeWidth="1.6" />
            <line x1="56" y1="102" x2="144" y2="190" strokeWidth="0.8" strokeOpacity="0.45" />
            <line x1="144" y1="102" x2="56" y2="190" strokeWidth="0.8" strokeOpacity="0.45" />
          </g>
          <circle cx="100" cy="146" r="11" fill="#ffffff" />
          <circle cx="100" cy="146" r="20" fill={tint} opacity="0.35" />
        </g>
      )}

      {kind === 'deepsky' && (
        <g>
          <ellipse cx="100" cy="146" rx="74" ry="56" fill={`url(#${id}-cloud)`} />
          <ellipse cx="100" cy="146" rx="46" ry="34" fill={`url(#${id}-cloud)`} opacity="0.8" transform="rotate(-24 100 146)" />
          {Array.from({ length: 22 }, (_, i) => {
            const a = rand() * Math.PI * 2;
            const d = rand() * 62;
            return <circle key={i} cx={100 + Math.cos(a) * d} cy={146 + Math.sin(a) * d * 0.75} r={0.7 + rand() * 1.5} fill="#ffffff" opacity={0.4 + rand() * 0.5} />;
          })}
        </g>
      )}

      {/* The frame marks: a plate is a measurement, so it carries fiducials. */}
      <g stroke={tint} strokeOpacity="0.5" strokeWidth="1">
        <path d="M12 12 h14 M12 12 v14" />
        <path d="M188 12 h-14 M188 12 v14" />
        <path d="M12 268 h14 M12 268 v-14" />
        <path d="M188 268 h-14 M188 268 v-14" />
      </g>
    </svg>
  );
}
