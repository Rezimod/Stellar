'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import CardPlate from './CardPlate';
import type { Rarity } from '@/lib/rarity';
import { RARITIES, isRarity, rarityInfo } from '@/lib/rarity';

export type RevealedCard = {
  drawIndex: number;
  designation: string;
  name: string;
  rarity: string;
  editionNumber: number;
  editionSize: number;
};

export type Draw = {
  sequence: number;
  secret: string;
  nonce: string;
  cards: RevealedCard[];
};

const pad = (n: number) => String(n).padStart(3, '0');
const rarityOf = (c: RevealedCard): Rarity => (isRarity(c.rarity) ? (c.rarity as Rarity) : 'common');

/** How long the stone takes to arrive, by the scarcest thing it carries. */
const FALL_MS: Record<Rarity, number> = { common: 550, rare: 700, epic: 900, legendary: 1150 };
const DRAW_STAGGER_MS = 350;
const DRAW_MS = 500;

/** The scarcest thing in the capsule — what the descent is pitched to. */
function best(cards: RevealedCard[]): Rarity {
  return cards.reduce<Rarity>((top, c) => {
    const r = rarityOf(c);
    return RARITIES.indexOf(r) > RARITIES.indexOf(top) ? r : top;
  }, 'common');
}

/**
 * What was inside, in three beats: the stone falls, the cards are drawn out of
 * it in turn, and the draw prints its own provenance so the holder can check
 * it. Commonest first so the last card out is the best one — it is drawn
 * centred and a little higher than the rest.
 *
 * CSS keyframes only, and every beat is in the server markup — the provenance
 * line and the two actions are timed by animation-delay, not by a client
 * timer, so a holder whose JS never arrives still sees what they drew and can
 * still check it. A click, a tap or Escape goes straight to the end, and under
 * prefers-reduced-motion the cards are simply already there.
 */
export default function SideraReveal({ draw }: { draw: Draw }) {
  const { cards, sequence, secret, nonce } = draw;
  const top = best(cards);

  /* Commonest first: the reveal should climb. */
  const ordered = useMemo(
    () => [...cards].sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b))),
    [cards],
  );

  const [done, setDone] = useState(false);
  const firstCard = useRef<HTMLLIElement>(null);
  const skip = useCallback(() => setDone(true), []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDone(true);
      return;
    }
    const total = FALL_MS[top] + (ordered.length - 1) * DRAW_STAGGER_MS + DRAW_MS;
    const timer = window.setTimeout(() => setDone(true), total);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDone(true);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [top, ordered.length]);

  useEffect(() => {
    if (done) firstCard.current?.focus();
  }, [done]);

  return (
    <div
      className={`sd-reveal sd-reveal--${top} ${done ? 'is-done' : ''}`.trim()}
      onClick={done ? undefined : skip}
      style={{ '--sd-fall': `${FALL_MS[top]}ms` } as CSSProperties}
    >
      {!done && (
        <button type="button" className="sd-skip" onClick={skip}>
          Skip
        </button>
      )}

      <div className="sd-reveal__descent" aria-hidden="true">
        <span className="sd-reveal__streak" />
        <span className="sd-reveal__stone" style={{ color: rarityInfo(top).color }}>
          <svg viewBox="0 0 64 64" width="64" height="64">
            <path
              d="M32 4 L52 16 L58 38 L44 56 L20 58 L6 40 L10 16 Z"
              fill="var(--sd-plate)"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path d="M22 18 L36 28 L28 44" fill="none" stroke="var(--sd-ink-4)" strokeWidth="1" />
            <path d="M40 22 L46 36" fill="none" stroke="var(--sd-ink-4)" strokeWidth="1" />
          </svg>
        </span>
      </div>

      <p className="sd-reveal__caption sd-label" aria-hidden="true">
        Something came back.
      </p>

      <ul className="sd-grid sd-reveal__cards">
        {ordered.map((c, i) => {
          const isBest = i === ordered.length - 1 && rarityOf(c) === top;
          return (
            <li
              key={c.drawIndex}
              ref={i === 0 ? firstCard : undefined}
              tabIndex={-1}
              className={`sd-reveal__card ${isBest ? 'sd-reveal__card--best' : ''}`.trim()}
              style={{ '--sd-i': i } as CSSProperties}
            >
              <CardPlate
                size="sm"
                designation={c.designation}
                name={c.name}
                rarity={rarityOf(c)}
                artUrl="/cards/placeholder.svg"
                href={`/card/${c.designation}`}
                data={[{ label: 'Edition', value: `No. ${pad(c.editionNumber)}` }]}
              />
            </li>
          );
        })}
      </ul>

      <p aria-live="polite" className="sr-only">
        {done ? `${ordered.length} cards drawn: ${ordered.map((c) => c.name).join(', ')}.` : ''}
      </p>

      <div className="sd-reveal__after" style={{ '--sd-i': ordered.length } as CSSProperties}>
        <p className="sd-data sd-reveal__provenance">
          <span>Draw {sequence}</span>
          <span>seed {secret.slice(0, 8)}</span>
          <span>client {nonce.slice(0, 8)}</span>
          <a href="/capsules/log">verify</a>
        </p>
        <div className="sd-pay__actions">
          <a className="sd-btn sd-btn--primary" href="/collection">
            Add to Collection
          </a>
          <a className="sd-btn" href="/capsules">
            Open another
          </a>
        </div>
      </div>
    </div>
  );
}
