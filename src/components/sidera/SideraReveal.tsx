'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import CardPlate from './CardPlate';
import SideraCard from './SideraCard';
import { PLACEHOLDER_ART } from '@/lib/sets/build';
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001';
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

/**
 * What came out. A capsule carries its sequence and the two halves of its
 * seed, which the provenance strip prints; a card bought outright has neither.
 */
export type Draw = {
  sequence?: number;
  secret?: string;
  nonce?: string;
  cards: RevealedCard[];
};

const pad = (n: number) => String(n).padStart(3, '0');
const rarityOf = (c: RevealedCard): Rarity => (isRarity(c.rarity) ? (c.rarity as Rarity) : 'common');

/** How long the stone takes to arrive, by the scarcest thing it carries. */
const FALL_MS: Record<Rarity, number> = { common: 1000, rare: 1200, epic: 1450, legendary: 1800 };
/** From impact to the first card leaving the stone. */
const OPEN_MS = 900;
const DRAW_STAGGER_MS = 620;
/** A legendary card is held back a beat before it comes out. */
const HOLD_MS: Record<Rarity, number> = { common: 0, rare: 0, epic: 250, legendary: 800 };
/** One card's rise, turn and sheen. */
const DRAW_MS = 1500;

/** Embers shed by the stone on the way down, and the sparks thrown at impact. */
const EMBERS = 7;
const SPARKS = 12;

/** The scarcest thing in the capsule — what the descent is pitched to. */
function best(cards: RevealedCard[]): Rarity {
  return cards.reduce<Rarity>((top, c) => {
    const r = rarityOf(c);
    return RARITIES.indexOf(r) > RARITIES.indexOf(top) ? r : top;
  }, 'common');
}

/**
 * What was inside, told as a stone coming home. It falls through a night of
 * drifting nebulae, burning in the colour of the scarcest card it carries and
 * shedding embers; it strikes with a flash, shock rings and a burst of light;
 * it cools and cracks; the cards rise out of it face down, arc into place and
 * turn over one by one, commonest first, a foil sheen crossing each face. A
 * legendary card is held back a beat and arrives in a ring of gold. Then the
 * draw prints its own provenance.
 *
 * It plays on a stage over the whole screen; closing it leaves the cards in
 * the page. CSS keyframes only, timed by variables. A click, a tap or Escape
 * goes straight to the end, and under prefers-reduced-motion the cards are
 * simply already there.
 */
export default function SideraReveal({ draw }: { draw: Draw }) {
  const { cards, sequence, secret, nonce } = draw;
  const top = best(cards);
  const outright = secret === undefined;

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
    const total = FALL_MS[top] + OPEN_MS + HOLD_MS[top] + (ordered.length - 1) * DRAW_STAGGER_MS + DRAW_MS;
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
    '--sd-hold': `${HOLD_MS[top]}ms`,
    '--sd-heat': rarityInfo(top).color,
  } as CSSProperties;

  const only = ordered.length === 1 ? ordered[0] : null;
  const label = outright ? `${only?.name ?? 'Card'}, bought` : `Capsule ${sequence}, opened`;

  return (
    <div
      className={`sd-reveal sd-reveal--${top} ${staged ? 'sd-reveal--staged' : ''} ${done ? 'is-done' : ''}`.trim()}
      role={staged ? 'dialog' : undefined}
      aria-modal={staged ? true : undefined}
      aria-label={staged ? label : undefined}
      onClick={done ? undefined : skip}
      style={timing}
    >
      <div className="sd-reveal__sky" aria-hidden="true">
        <span className="sd-reveal__nebula sd-reveal__nebula--a" />
        <span className="sd-reveal__nebula sd-reveal__nebula--b" />
        <span className="sd-reveal__nebula sd-reveal__nebula--c" />
        <span className="sd-reveal__stars sd-reveal__stars--far" />
        <span className="sd-reveal__stars sd-reveal__stars--near" />
        <span className="sd-reveal__warp" />
        <span className="sd-reveal__limb" />
      </div>

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

        <div className="sd-reveal__fx" aria-hidden="true">
          <span className="sd-reveal__meteor">
            <span className="sd-reveal__plasma" />
            <span className="sd-reveal__tail" />
            <span className="sd-reveal__head" />
            {Array.from({ length: EMBERS }, (_, k) => (
              <span key={k} className="sd-reveal__ember" style={{ '--k': k } as CSSProperties} />
            ))}
          </span>
          <span className="sd-reveal__rays" />
          <span className="sd-reveal__flash" />
          <span className="sd-reveal__shock" />
          <span className="sd-reveal__shock sd-reveal__shock--2" />
          <span className="sd-reveal__shock sd-reveal__shock--3" />
          {Array.from({ length: SPARKS }, (_, k) => (
            <span key={k} className="sd-reveal__spark" style={{ '--k': k, '--n': SPARKS } as CSSProperties} />
          ))}
        </div>

        <div className="sd-reveal__descent" aria-hidden="true">
          <span className="sd-reveal__stone">
            <svg viewBox="0 0 64 64" width="72" height="72">
              <defs>
                <radialGradient id="sd-stone-core" cx="38%" cy="34%" r="70%">
                  <stop offset="0%" stopColor="#2a3452" />
                  <stop offset="100%" stopColor="#0c1120" />
                </radialGradient>
              </defs>
              <path
                d="M32 4 L52 16 L58 38 L44 56 L20 58 L6 40 L10 16 Z"
                fill="url(#sd-stone-core)"
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
          <span className="sd-label">{outright ? 'Bought outright' : `Capsule ${sequence}`}</span>
          <span className="sd-reveal__line">{outright ? 'It came down for you.' : 'Something came back.'}</span>
        </p>

        <ul className="sd-reveal__cards">
          {ordered.map((c, i) => {
            const rarity = rarityOf(c);
            const isBest = i === ordered.length - 1 && rarity === top;
            return (
              <li
                key={c.drawIndex}
                ref={i === 0 ? firstCard : undefined}
                tabIndex={-1}
                className={`sd-reveal__card ${isBest ? 'sd-reveal__card--best' : ''}`.trim()}
                data-rarity={rarity}
                style={{ '--sd-i': i, '--sd-side': i - (ordered.length - 1) / 2 } as CSSProperties}
              >
                {isBest && <span className="sd-reveal__aura" aria-hidden="true" />}
                {isBest && rarity === 'legendary' && (
                  <span className="sd-reveal__crown" aria-hidden="true">
                    {Array.from({ length: 14 }, (_, k) => (
                      <span key={k} style={{ '--k': k } as CSSProperties} />
                    ))}
                  </span>
                )}
                <div className="sd-flip">
                  <div className="sd-flip__back" aria-hidden="true">
                    <span className="sd-sealed__mark">Sidera</span>
                  </div>
                  <div className="sd-flip__front">
                    {SET_001_CARD_BY_DESIGNATION.has(c.designation) ? (
                      <a href={`/card/${c.designation}`} className="sd-card-link">
                        <SideraCard designation={c.designation} edition={c.editionNumber} />
                      </a>
                    ) : (
                      <CardPlate
                        size="sm"
                        designation={c.designation}
                        name={c.name}
                        rarity={rarity}
                        artUrl={PLACEHOLDER_ART}
                        href={`/card/${c.designation}`}
                        data={[{ label: 'Edition', value: `No. ${pad(c.editionNumber)}` }]}
                      />
                    )}
                  </div>
                </div>
                {SET_001_CARD_BY_DESIGNATION.has(c.designation) && (
                  <p className="sd-data sd-reveal__edition">
                    {c.name} · No. {pad(c.editionNumber)}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <p aria-live="polite" className="sr-only">
          {done ? `${ordered.length} ${ordered.length === 1 ? 'card' : 'cards'} drawn: ${ordered.map((c) => c.name).join(', ')}.` : ''}
        </p>

        <div className="sd-reveal__after" style={{ '--sd-i': ordered.length } as CSSProperties}>
          {outright && only ? (
            <p className="sd-data sd-reveal__provenance">
              <span>
                Edition No. {pad(only.editionNumber)} of {only.editionSize}
              </span>
              <span>bought outright</span>
            </p>
          ) : (
            <p className="sd-data sd-reveal__provenance">
              <span>Draw {sequence}</span>
              <span>seed {secret?.slice(0, 8)}</span>
              <span>client {nonce?.slice(0, 8)}</span>
              <a href="/capsules/log">verify</a>
            </p>
          )}
          <div className="sd-pay__actions">
            <a className="sd-btn sd-btn--primary" href="/collection">
              {outright ? 'See it in your Collection' : 'Add to Collection'}
            </a>
            <a className="sd-btn" href={outright ? '/set/001' : '/capsules'}>
              {outright ? 'Back to the set' : 'Open another'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
