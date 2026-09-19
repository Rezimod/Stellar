import { rarityInfo, type Rarity } from '@/lib/rarity';

type RarityMarkProps = {
  rarity: Rarity;
  /** Hide the visible word (the glyph stays, a screen reader still hears it). Only where space forbids the word. */
  glyphOnly?: boolean;
  className?: string;
};

/** Diamonds filling up, then the star: one family, so a rarity never reads as a status (circles). */
function Glyph({ rarity }: { rarity: Rarity }) {
  const diamond = 'M6 1 L11 6 L6 11 L1 6 Z';
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      {rarity === 'common' && <path d={diamond} fill="none" stroke="currentColor" strokeWidth="1" />}
      {rarity === 'rare' && (
        <>
          <path d={diamond} fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M6 4 L8 6 L6 8 L4 6 Z" fill="currentColor" />
        </>
      )}
      {rarity === 'epic' && <path d={diamond} fill="currentColor" />}
      {rarity === 'legendary' && (
        <path d="M6 0 L7.3 4.7 L12 6 L7.3 7.3 L6 12 L4.7 7.3 L0 6 L4.7 4.7 Z" fill="currentColor" />
      )}
    </svg>
  );
}

/**
 * A card's rarity, in brass — the only place brass appears. Four steps along
 * one ramp (common nearest the neutrals, legendary brightest), a glyph and the
 * word, so it never depends on colour alone.
 */
export default function RarityMark({ rarity, glyphOnly = false, className = '' }: RarityMarkProps) {
  const { label } = rarityInfo(rarity);
  return (
    <span className={`sd-rarity sd-rarity--${rarity} ${className}`.trim()}>
      <Glyph rarity={rarity} />
      <span className="sr-only">Rarity: </span>
      {glyphOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  );
}
