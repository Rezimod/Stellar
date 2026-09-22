'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import CardPlate from './CardPlate';
import type { Rarity } from '@/lib/rarity';
import { RARITIES, isRarity, rarityInfo } from '@/lib/rarity';
import { PLACEHOLDER_ART } from '@/lib/sets/build';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';

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
const FALL_MS: Record<Rarity, number> = { common: 900, rare: 1100, epic: 1350, legendary: 1700 };
/** From impact to the first card leaving the stone. */
const OPEN_MS = 700;
const DRAW_STAGGER_MS = 520;
/** One card's rise and turn. */
const DRAW_MS = 1100;

/** The scarcest thing in the capsule — what the descent is pitched to. */
function best(cards: RevealedCard[]): Rarity {
  return cards.reduce<Rarity>((top, c) => {
    const r = rarityOf(c);
    return RARITIES.indexOf(r) > RARITIES.indexOf(top) ? r : top;
  }, 'common');
}

/**
 * What was inside, told as a stone coming home. It enters the atmosphere over
 * a night sky and burns in the colour of the scarcest card it carries; it
 * strikes, cools and cracks; the cards rise out of it face down and turn over
 * one by one, commonest first, so the last card out is the best. Then the draw
 * prints its own provenance, so the holder can check it.
 *
 * It plays on a stage over the whole screen; closing it leaves the cards in
 * the page. CSS keyframes only, timed by variables. A click, a tap or Escape
 * goes straight to the end, and under prefers-reduced-motion the cards are
 * simply already there.
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
  const [staged, setStaged] = useState(true);
  const firstCard = useRef<HTMLLIElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const skip = useCallback(() => setDone(true), []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDone(true);
      return;
    }
    const total = FALL_MS[top] + OPEN_MS + (ordered.length - 1) * DRAW_STAGGER_MS + DRAW_MS;
    const timer = window.setTimeout(() => setDone(true), total);
    return () => window.clearTimeout(timer);
  }, [top, ordered.length]);

  useEffect(() => {
    if (!staged) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (done) setStaged(false);
      else setDone(true);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [staged, done]);

  useEffect(() => {
    if (!done) return;
    if (staged) close.current?.focus();
    else firstCard.current?.focus();
  }, [done, staged]);

  const timing = {
    '--sd-fall': `${FALL_MS[top]}ms`,
    '--sd-open': `${OPEN_MS}ms`,
    '--sd-stagger': `${DRAW_STAGGER_MS}ms`,
    '--sd-heat': rarityInfo(top).color,
  } as CSSProperties;

  return (
    <div
      className={`sd-reveal sd-reveal--${top} ${staged ? 'sd-reveal--staged' : ''} ${done ? 'is-done' : ''}`.trim()}
      role={staged ? 'dialog' : undefined}
      aria-modal={staged ? true : undefined}
      aria-label={staged ? `Capsule ${sequence}, opened` : undefined}
      onClick={done ? undefined : skip}
      style={timing}
    >
      <div className="sd-reveal__stage">
        {staged && (
          <button
            ref={close}
            type="button"
            className="sd-skip"
            onClick={(e) => {
              e.stopPropagation();
              if (done) setStaged(false);
              else skip();
            }}
          >
            {done ? 'Close' : 'Skip'}
          </button>
        )}

        <div className="sd-reveal__sky" aria-hidden="true">
          <span className="sd-reveal__limb" />
          <span className="sd-reveal__meteor">
            <span className="sd-reveal__tail" />
            <span className="sd-reveal__head" />
          </span>
          <span className="sd-reveal__flash" />
          <span className="sd-reveal__shock" />
        </div>

        <div className="sd-reveal__descent" aria-hidden="true">
          <span className="sd-reveal__stone">
            <svg viewBox="0 0 64 64" width="72" height="72">
              <path
                d="M32 4 L52 16 L58 38 L44 56 L20 58 L6 40 L10 16 Z"
                fill="#141b2e"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path d="M22 18 L36 28 L28 44" fill="none" stroke="var(--sd-ink-4)" strokeWidth="1" />
              <path d="M40 22 L46 36" fill="none" stroke="var(--sd-ink-4)" strokeWidth="1" />
              <path className="sd-reveal__crack" d="M31 5 L34 20 L27 31 L35 42 L30 57" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
        </div>

        <p className="sd-reveal__caption" aria-hidden="true">
          <span className="sd-label">Capsule {sequence}</span>
          <span className="sd-reveal__line">Something came back.</span>
        </p>

        <ul className="sd-reveal__cards">
          {ordered.map((c, i) => {
            const isBest = i === ordered.length - 1 && rarityOf(c) === top;
            return (
              <li
                key={c.drawIndex}
                ref={i === 0 ? firstCard : undefined}
                tabIndex={-1}
                className={`sd-reveal__card ${isBest ? 'sd-reveal__card--best' : ''}`.trim()}
                data-rarity={rarityOf(c)}
                style={{ '--sd-i': i } as CSSProperties}
              >
                {isBest && <span className="sd-reveal__aura" aria-hidden="true" />}
                <div className="sd-flip">
                  <div className="sd-flip__back" aria-hidden="true">
                    <span className="sd-sealed__mark">Sidera</span>
                  </div>
                  <div className="sd-flip__front">
                    <CardPlate
                      size="sm"
                      designation={c.designation}
                      name={c.name}
                      rarity={rarityOf(c)}
                      artUrl={SET_001_CARD_BY_DESIGNATION.get(c.designation)?.seed.artUrl ?? PLACEHOLDER_ART}
                      href={`/card/${c.designation}`}
                      data={[{ label: 'Edition', value: `No. ${pad(c.editionNumber)}` }]}
                    />
                  </div>
                </div>
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
    </div>
  );
}
