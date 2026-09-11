import Image from 'next/image';
import type { TargetKind, TelescopeTarget } from '@/lib/observatory/telescope-targets';

/**
 * A photograph where one exists; otherwise the object drawn from its kind —
 * a tilted glow, a scatter of stars, a ring — never a photograph of something
 * else.
 */
export default function TargetArt({ target, sizes }: { target: TelescopeTarget; sizes: string }) {
  if (target.photo) {
    return <Image src={target.photo} alt="" fill sizes={sizes} className="tel-art__photo" />;
  }
  return <Glyph kind={target.kind} seed={target.id} />;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let n = 0; n < s.length; n++) h = Math.imul(h ^ s.charCodeAt(n), 16777619);
  return h >>> 0;
}

function Glyph({ kind, seed }: { kind: TargetKind; seed: string }) {
  let a = hash(seed);
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const field = Array.from({ length: 40 }, () => ({ x: rnd() * 100, y: rnd() * 100, r: 0.3 + rnd() * 0.5 }));
  const id = `g-${hash(seed).toString(36)}`;

  return (
    <svg viewBox="0 0 100 100" className="tel-art__glyph" aria-hidden="true">
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {field.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="currentColor" opacity="0.7" />
      ))}
      {kind === 'galaxy' && (
        <ellipse cx="50" cy="50" rx="34" ry="13" fill={`url(#${id})`} transform={`rotate(${-20 + rnd() * 40} 50 50)`} />
      )}
      {kind === 'nebula' && (
        <>
          <circle cx="44" cy="52" r="26" fill={`url(#${id})`} opacity="0.7" />
          <circle cx="58" cy="44" r="20" fill={`url(#${id})`} opacity="0.6" />
        </>
      )}
      {kind === 'cluster' &&
        Array.from({ length: 70 }, (_, i) => {
          const r = 30 * Math.sqrt(rnd());
          const t = rnd() * Math.PI * 2;
          return <circle key={`c${i}`} cx={50 + Math.cos(t) * r} cy={50 + Math.sin(t) * r} r={0.6 + rnd() * 1.4} fill="currentColor" />;
        })}
      {(kind === 'star' || kind === 'planet' || kind === 'moon') && (
        <>
          <circle cx="50" cy="50" r="22" fill={`url(#${id})`} />
          <circle cx="50" cy="50" r="3.5" fill="currentColor" />
        </>
      )}
    </svg>
  );
}
