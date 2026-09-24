'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import CardPlate from './CardPlate';
import CardBack from './card/CardBack';
import type { Rarity } from '@/lib/rarity';
import { RARITIES, isRarity, rarityInfo } from '@/lib/rarity';
import { plateFor } from '@/lib/sidera/plate';

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

function SealedBack({ designation, u }: { designation: string; u: string }) {
  const plate = plateFor(designation);
  return plate ? <CardBack plate={plate} sealed u={u} /> : null;
}
const rarityOf = (c: RevealedCard): Rarity => (isRarity(c.rarity) ? (c.rarity as Rarity) : 'common');

/** How long the stone takes to arrive, by the scarcest thing it carries. */
const FALL_MS: Record<Rarity, number> = { common: 1000, rare: 1200, epic: 1450, legendary: 1800 };
/** From impact to the stone breaking: it cools, cracks and parts. */
const OPEN_MS = 1100;
const DRAW_STAGGER_MS = 1150;
/** A legendary card is held back a beat before it comes out. */
const HOLD_MS: Record<Rarity, number> = { common: 0, rare: 0, epic: 250, legendary: 800 };
/** One card's rise to the centre, turn, hold and walk to its place. */
const DRAW_MS = 1550;

/** Embers shed by the stone on the way down, and the sparks thrown at impact. */
const EMBERS = 7;
const SPARKS = 12;

/**
 * Where each card comes to rest, in the order they are drawn: the outermost
 * places first, left before right, so the last card out — the best — takes
 * the middle.
 */
function places(n: number): number[] {
  return Array.from({ length: n }, (_, k) => k - (n - 1) / 2).sort((a, b) => Math.abs(b) - Math.abs(a) || a - b);
}

/** The crack the stone breaks along, in its 120 × 120 box. */
const SEAM = [
  [57, 7],
  [63, 30],
  [51, 50],
  [66, 70],
  [55, 92],
  [62, 113],
] as const;
const seamPath = `M${SEAM.map(([x, y]) => `${x} ${y}`).join(' L')}`;
const seamClip = SEAM.map(([x, y]) => `${((x / 120) * 100).toFixed(1)}% ${((y / 120) * 100).toFixed(1)}%`);
const HALF_CLIP = {
  left: `polygon(0 0, ${seamClip[0].split(' ')[0]} 0, ${seamClip.join(', ')}, ${seamClip[seamClip.length - 1].split(' ')[0]} 100%, 0 100%)`,
  right: `polygon(${seamClip[0].split(' ')[0]} 0, 100% 0, 100% 100%, ${seamClip[seamClip.length - 1].split(' ')[0]} 100%, ${[...seamClip].reverse().join(', ')})`,
};

/** Thumbprint pits left by the air on the way down. */
const PITS = [
  [38, 34, 9, 7],
  [74, 26, 7, 5],
  [86, 54, 10, 7],
  [42, 70, 11, 8],
  [28, 88, 7, 5],
  [76, 88, 9, 6],
  [97, 76, 5, 4],
  [22, 56, 5, 4],
] as const;

const OUTLINE =
  'M52 8 C64 3 80 9 90 17 C101 25 112 36 113 52 C115 66 108 76 110 88 C111 100 98 110 84 112 C70 115 62 108 48 112 C33 116 18 106 12 92 C6 79 11 68 7 55 C3 40 12 26 24 18 C33 12 42 11 52 8 Z';

/** Grains of lighter stone showing through the crust. */
const GRAINS = [
  [60, 40, 1.4],
  [30, 46, 1],
  [92, 38, 1.2],
  [64, 98, 1.1],
  [100, 64, 0.9],
  [56, 82, 1.3],
] as const;

/** The gradients and glow the stone is painted with, once per reveal. */
function StoneDefs({ id }: { id: string }) {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-core`} cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#5d544b" />
          <stop offset="40%" stopColor="#2b2622" />
          <stop offset="100%" stopColor="#0a0807" />
        </radialGradient>
        <radialGradient id={`${id}-pit`} cx="60%" cy="62%" r="62%">
          <stop offset="0%" stopColor="#050403" stopOpacity="0.7" />
          <stop offset="70%" stopColor="#120f0d" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8a7f72" stopOpacity="0.28" />
        </radialGradient>
        <linearGradient id={`${id}-crust`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
    </svg>
  );
}

/** A meteorite: fusion crust, thumbprints, grains, and the seam it breaks along. Each half of the break draws it whole and shows its own side. */
function Stone({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <path d={OUTLINE} fill={`url(#${id}-core)`} />
      {PITS.map(([cx, cy, rx, ry], k) => (
        <ellipse key={k} cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${id}-pit)`} />
      ))}
      {GRAINS.map(([cx, cy, r], k) => (
        <circle key={k} cx={cx} cy={cy} r={r} fill="#a89c8c" opacity="0.35" />
      ))}
      <path d={OUTLINE} fill={`url(#${id}-crust)`} stroke="currentColor" strokeWidth="1.4" className="sd-reveal__rim" />
      <g className="sd-reveal__crack" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d={seamPath} strokeWidth="6" filter={`url(#${id}-glow)`} opacity="0.8" />
        <path d={seamPath} strokeWidth="2" />
        <path d="M51 50 L34 58 L26 55" strokeWidth="1.3" />
        <path d="M66 70 L86 77" strokeWidth="1.3" />
      </g>
    </svg>
  );
}

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
 * shedding embers; it strikes with a flash and a shock ring; it cools, cracks
 * along its seam and breaks in two, light coming out of the break. The cards
 * come out one by one, commonest first: each rises to the middle face down,
 * turns over under a foil sheen, holds, then steps aside to its place. The
 * last and best keeps the middle; a legendary one is held back a beat and
 * arrives in a ring of gold. Then the draw prints its own provenance.
 *
 * It plays on a stage over the whole screen; closing it leaves the cards in
 * the page. CSS keyframes only, timed by variables. A click, a tap or Escape
 * goes straight to the end, and under prefers-reduced-motion the cards are
 * simply already there.
 */
export default function SideraReveal({ draw }: { draw: Draw }) {
  const { cards, sequence, secret, nonce } = draw;
  const stoneId = `sd-stone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
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
    '--sd-draw': `${DRAW_MS}ms`,
    '--sd-heat': rarityInfo(top).color,
  } as CSSProperties;

  const only = ordered.length === 1 ? ordered[0] : null;
  const place = places(ordered.length);
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

        <p className="sd-reveal__caption" aria-hidden="true">
          <span className="sd-label">{outright ? 'Bought outright' : `Capsule No. ${pad(sequence ?? 0)} · Set 001`}</span>
          <span className="sd-reveal__line">{outright ? 'It came down for you.' : 'Something came back.'}</span>
        </p>

        <div className="sd-reveal__field">
          <div className="sd-reveal__fx" aria-hidden="true">
            <span className="sd-reveal__meteor">
              <span className="sd-reveal__plasma" />
              <span className="sd-reveal__tail" />
              {Array.from({ length: EMBERS }, (_, k) => (
                <span key={k} className="sd-reveal__ember" style={{ '--k': k } as CSSProperties} />
              ))}
            </span>
            <span className="sd-reveal__flash" />
            <span className="sd-reveal__shock" />
            <span className="sd-reveal__shock sd-reveal__shock--2" />
            {Array.from({ length: SPARKS }, (_, k) => (
              <span key={k} className="sd-reveal__spark" style={{ '--k': k, '--n': SPARKS } as CSSProperties} />
            ))}
          </div>

          <div className="sd-reveal__stone" aria-hidden="true">
            <StoneDefs id={stoneId} />
            <span className="sd-reveal__breach" />
            <span className="sd-reveal__half sd-reveal__half--l" style={{ clipPath: HALF_CLIP.left }}>
              <Stone id={stoneId} />
            </span>
            <span className="sd-reveal__half sd-reveal__half--r" style={{ clipPath: HALF_CLIP.right }}>
              <Stone id={stoneId} />
            </span>
          </div>

          <ul className="sd-reveal__cards">
            {ordered.map((c, i) => {
              const rarity = rarityOf(c);
              const info = rarityInfo(rarity);
              const isBest = i === ordered.length - 1 && rarity === top;
              return (
                <li
                  key={c.drawIndex}
                  ref={i === 0 ? firstCard : undefined}
                  tabIndex={-1}
                  className={`sd-reveal__card ${isBest ? 'sd-reveal__card--best' : ''}`.trim()}
                  data-rarity={rarity}
                  style={{ '--sd-i': i, '--sd-side': place[i], zIndex: i + 1 } as CSSProperties}
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
                      <SealedBack designation={c.designation} u={`rv${i}`} />
                    </div>
                    <div className="sd-flip__front">
                      <CardPlate size="sm" designation={c.designation} edition={c.editionNumber} href={`/card/${c.designation}`} />
                    </div>
                  </div>
                  <p className="sd-reveal__tag" aria-hidden="true">
                    <span style={{ color: info.color }}>
                      {info.glyph} {info.label}
                    </span>
                    <span>
                      No. {pad(c.editionNumber)} / {c.editionSize}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <p aria-live="polite" className="sr-only">
          {done ? `${ordered.length} ${ordered.length === 1 ? 'card' : 'cards'} drawn: ${ordered.map((c) => c.name).join(', ')}.` : ''}
        </p>

        <div className="sd-reveal__after" style={{ '--sd-i': ordered.length - 1 } as CSSProperties}>
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
