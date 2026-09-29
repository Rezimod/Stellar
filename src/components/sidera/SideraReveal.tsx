'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import CardPlate from './CardPlate';
import CardBack from './card/CardBack';
import type { Rarity } from '@/lib/rarity';
import { RARITIES, isRarity, rarityInfo } from '@/lib/rarity';
import { plateFor } from '@/lib/sidera/plate';
import { Impact, Meteor, Stone, StoneDefs } from './reveal/Meteorite';
import Typed from './reveal/Typed';

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
  /** A preview draw from a named capsule: nothing bought, nothing recorded. */
  preview?: string;
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

/* The clock, in milliseconds, pitched to the scarcest card in the capsule. */

/** The descent: from the first glint at the edge of the sky to the strike. */
const FALL_MS: Record<Rarity, number> = { common: 1500, rare: 1700, epic: 1900, legendary: 2200 };
/** From the strike to the burst: the stone cools, cracks, and shudders harder and harder. */
const OPEN_MS: Record<Rarity, number> = { common: 1500, rare: 1800, epic: 2200, legendary: 2600 };
/** One of the lesser cards: up from the break, turn, hold, step aside. */
const DEAL_MS = 1800;
/** The best card is held back: the field dims and waits on it. */
const HOLD_MS: Record<Rarity, number> = { common: 300, rare: 450, epic: 700, legendary: 1000 };
/** The best card's own turn, slower the scarcer it is. */
const BEST_MS: Record<Rarity, number> = { common: 2300, rare: 2700, epic: 3300, legendary: 3800 };

/** Ink speed of the provenance line, per character. */
const TYPE_MS = 18;

/**
 * Where each card comes to rest, in the order they are drawn: the outermost
 * places first, left before right, so the last card out — the best — takes
 * the middle. Two cards sit side by side, the best on the right.
 */
function places(n: number): number[] {
  return Array.from({ length: n }, (_, k) => k - (n - 1) / 2).sort((a, b) => Math.abs(b) - Math.abs(a) || a - b);
}

/** The scarcest thing in the capsule — what the descent is pitched to. */
function best(cards: RevealedCard[]): Rarity {
  return cards.reduce<Rarity>((top, c) => {
    const r = rarityOf(c);
    return RARITIES.indexOf(r) > RARITIES.indexOf(top) ? r : top;
  }, 'common');
}

/**
 * What was inside, told as a stone coming home.
 *
 * It falls out of the top of the sky through star streaks, white-hot, cooling
 * into the colour of the scarcest card it carries, a bow shock ahead of it and
 * embers behind. It strikes: flash, three-coloured shock rings, sparks, dust,
 * the field shaken. It lies in its crater and cools; a crack draws along its
 * seam and glows from inside, pulsing; it shudders harder and harder as the
 * light builds, the field draws a breath, and it bursts — shards, a column of
 * light, a ring. The first card rises out of the break face down, hangs,
 * turns over under a sweep of foil, prints its tag, and steps aside. Then the
 * field dims and waits; a spotlight comes on; a slow pulse; the best card
 * rises, hangs, turns over slower, settles on a bounce in its own light, and
 * takes its place beside the first, a little forward. Both float; a light
 * passes across them; the provenance line prints itself; the buttons arrive.
 *
 * It plays on a stage over the whole screen — lifted out to the page's own
 * .sidera root, since a sheet's backdrop-filter would otherwise pin a fixed
 * stage inside the sheet; closing it leaves the cards in the page. CSS keyframes only, timed by the variables the component sets. A
 * click, a tap or Escape goes straight to the end, and under
 * prefers-reduced-motion the cards are simply already there.
 */
export default function SideraReveal({
  draw,
  onAgain,
  onClose,
}: {
  draw: Draw;
  /** Draws again; the preview's "Open another". */
  onAgain?: () => void;
  /** Called on close instead of leaving the cards in the page. */
  onClose?: () => void;
}) {
  const { cards, sequence, secret, nonce, preview } = draw;
  const stoneId = `sd-stone${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const top = best(cards);
  const outright = secret === undefined && !preview;

  /* Commonest first: the reveal should climb. */
  const ordered = useMemo(
    () => [...cards].sort((a, b) => RARITIES.indexOf(rarityOf(a)) - RARITIES.indexOf(rarityOf(b))),
    [cards],
  );

  /* When each card starts, and when it is all over. */
  const clock = useMemo(() => {
    const burst = FALL_MS[top] + OPEN_MS[top];
    const at: number[] = [];
    let t = burst;
    ordered.forEach((_, i) => {
      const last = i === ordered.length - 1;
      if (last) t += HOLD_MS[top];
      at.push(t);
      t += last ? BEST_MS[top] : DEAL_MS;
    });
    return { burst, at, end: t };
  }, [ordered, top]);

  const [done, setDone] = useState(false);
  const [staged, setStaged] = useState(true);
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.querySelector<HTMLElement>('.sidera') ?? document.body), []);
  const firstCard = useRef<HTMLLIElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const skip = useCallback(() => setDone(true), []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setDone(true);
      return;
    }
    const timer = window.setTimeout(() => setDone(true), clock.end + 1400);
    return () => window.clearTimeout(timer);
  }, [clock.end]);

  /* A phone that can buzz feels the burst, and the best card coming round. */
  useEffect(() => {
    if (done || typeof navigator.vibrate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const turn = clock.at[clock.at.length - 1] + BEST_MS[top] * 0.5;
    const pattern = top === 'legendary' ? [40, 70, 90] : top === 'epic' ? [30, 60, 50] : 25;
    const timers = [window.setTimeout(() => navigator.vibrate(35), clock.burst), window.setTimeout(() => navigator.vibrate(pattern), turn)];
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [done, clock, top]);

  useEffect(() => {
    if (!staged) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (!done) setDone(true);
      else if (onClose) onClose();
      else setStaged(false);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [staged, done, onClose]);

  useEffect(() => {
    if (!done) return;
    if (staged) close.current?.focus();
    else firstCard.current?.focus();
  }, [done, staged]);

  const bestAt = clock.at[clock.at.length - 1];
  const timing = {
    '--sd-fall': `${FALL_MS[top]}ms`,
    '--sd-open': `${OPEN_MS[top]}ms`,
    '--sd-burst': `${clock.burst}ms`,
    '--sd-wait': `${bestAt - HOLD_MS[top]}ms`,
    '--sd-hold': `${HOLD_MS[top]}ms`,
    '--sd-best-at': `${bestAt}ms`,
    '--sd-best-d': `${BEST_MS[top]}ms`,
    '--sd-end': `${clock.end}ms`,
    '--sd-heat': rarityInfo(top).color,
  } as CSSProperties;

  const only = ordered.length === 1 ? ordered[0] : null;
  const place = places(ordered.length);
  const label = preview ? `${preview} capsule, opened` : outright ? `${only?.name ?? 'Card'}, bought` : `Capsule ${sequence}, opened`;

  /* The provenance line, printed a character at a time from --sd-end. */
  const provenance: { text: string; href?: string }[] = preview
    ? [{ text: 'Preview draw' }, { text: 'nothing bought, nothing recorded' }]
    : outright && only
      ? [{ text: `Edition No. ${pad(only.editionNumber)} of ${only.editionSize}` }, { text: 'bought outright' }]
      : [{ text: `Draw ${sequence}` }, { text: `seed ${secret?.slice(0, 8)}` }, { text: `client ${nonce?.slice(0, 8)}` }, { text: 'verify', href: '/capsules/log' }];
  let ink = 300;
  const typed = provenance.map((p) => {
    const at = ink;
    ink += p.text.length * TYPE_MS + 120;
    return { ...p, at };
  });

  const reveal = (
    <div
      className={[
        'sd-reveal',
        `sd-reveal--${top}`,
        ordered.length > 2 ? 'sd-reveal--many' : '',
        staged ? 'sd-reveal--staged' : '',
        done ? 'is-done' : '',
      ]
        .filter(Boolean)
        .join(' ')}
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
        <span className="sd-reveal__streaks sd-reveal__streaks--far" />
        <span className="sd-reveal__streaks sd-reveal__streaks--near" />
        <span className="sd-reveal__limb" />
        <span className="sd-reveal__entry" />
      </div>
      <span className="sd-reveal__negative" aria-hidden="true" />
      <span className="sd-reveal__burst" aria-hidden="true" />
      <span className="sd-reveal__inhale" aria-hidden="true" />

      <div className="sd-reveal__stage">
        {staged && (
          <button
            ref={close}
            type="button"
            className="sd-skip"
            onClick={(e) => {
              e.stopPropagation();
              if (!done) skip();
              else if (onClose) onClose();
              else setStaged(false);
            }}
          >
            {done ? 'Close' : 'Skip'}
          </button>
        )}

        <p className="sd-reveal__caption" aria-hidden="true">
          <span className="sd-label">
            {preview ? `${preview} capsule · First Light` : outright ? 'Bought outright' : `Capsule No. ${pad(sequence ?? 0)} · First Light`}
          </span>
        </p>

        <div className="sd-reveal__field">
          {/* Inside the field, so the best card can stand above the dark it waits in. */}
          <span className="sd-reveal__dim" aria-hidden="true" />
          <span className="sd-reveal__spot" aria-hidden="true" />
          <div className="sd-reveal__fx" aria-hidden="true">
            <Meteor />
            <Impact />
          </div>

          <div className="sd-reveal__stone" aria-hidden="true">
            <StoneDefs id={stoneId} />
            <span className="sd-reveal__core" />
            <span className="sd-reveal__breach" />
            <span className="sd-reveal__body">
              <Stone id={stoneId} half="l" />
              <Stone id={stoneId} half="r" />
            </span>
          </div>

          <span className="sd-reveal__pulse" aria-hidden="true" />
          <span className="sd-reveal__pulse sd-reveal__pulse--2" aria-hidden="true" />
          <span className="sd-reveal__sweep" aria-hidden="true" />

          <ul className="sd-reveal__cards">
            {ordered.map((c, i) => {
              const rarity = rarityOf(c);
              const info = rarityInfo(rarity);
              const isBest = i === ordered.length - 1;
              const tagAt = isBest ? 0.64 : 0.6;
              return (
                <li
                  key={c.drawIndex}
                  ref={i === 0 ? firstCard : undefined}
                  tabIndex={-1}
                  className={`sd-reveal__card ${isBest ? 'sd-reveal__card--best' : ''}`.trim()}
                  data-rarity={rarity}
                  style={
                    {
                      '--sd-side': place[i],
                      '--sd-at': `${clock.at[i]}ms`,
                      '--sd-d': `${isBest ? BEST_MS[top] : DEAL_MS}ms`,
                      '--sd-tone': info.color,
                      zIndex: isBest ? 20 : i + 1,
                    } as CSSProperties
                  }
                >
                  {isBest && <span className="sd-reveal__aura" aria-hidden="true" />}
                  {isBest && (rarity === 'epic' || rarity === 'legendary') && (
                    <span className="sd-reveal__halo" aria-hidden="true">
                      {Array.from({ length: 14 }, (_, k) => (
                        <span key={k} style={{ '--k': k } as CSSProperties} />
                      ))}
                    </span>
                  )}
                  <div className="sd-reveal__lift">
                    {isBest && rarity === 'legendary' && <span className="sd-reveal__ring" aria-hidden="true" />}
                    <div className="sd-flip">
                      <div className="sd-flip__back" aria-hidden="true">
                        <SealedBack designation={c.designation} u={`rv${i}`} />
                      </div>
                      <div className="sd-flip__front">
                        <CardPlate size="sm" designation={c.designation} edition={c.editionNumber} href={`/card/${c.designation}`} />
                      </div>
                    </div>
                  </div>
                  <p className="sd-reveal__tag" aria-hidden="true">
                    <Typed text={`${info.glyph} ${info.label}`} at={`calc(var(--sd-at) + var(--sd-d) * ${tagAt})`} style={{ color: info.color }} />
                    <Typed text={`No. ${pad(c.editionNumber)} / ${c.editionSize}`} at={`calc(var(--sd-at) + var(--sd-d) * ${tagAt} + 260ms)`} />
                  </p>
                </li>
              );
            })}
          </ul>
        </div>

        <p aria-live="polite" className="sr-only">
          {done ? `${ordered.length} ${ordered.length === 1 ? 'card' : 'cards'} drawn: ${ordered.map((c) => c.name).join(', ')}.` : ''}
        </p>

        <div className="sd-reveal__after" style={{ '--sd-ink': `${ink + 200}ms` } as CSSProperties}>
          <p className="sd-data sd-reveal__provenance">
            {typed.map((p) =>
              p.href ? (
                <a key={p.text} href={p.href}>
                  <Typed text={p.text} at={`calc(var(--sd-end) + ${p.at}ms)`} />
                </a>
              ) : (
                <Typed key={p.text} text={p.text} at={`calc(var(--sd-end) + ${p.at}ms)`} />
              ),
            )}
          </p>
          {preview ? (
            <div className="sd-pay__actions">
              <button type="button" className="sd-btn sd-btn--primary" onClick={onAgain}>
                Open another
              </button>
              <button type="button" className="sd-btn" onClick={onClose}>
                Back to the shelf
              </button>
            </div>
          ) : (
            <div className="sd-pay__actions">
              <a className="sd-btn sd-btn--primary" href="/collection">
                {outright ? 'See it in your Collection' : 'Add to Collection'}
              </a>
              <a className="sd-btn" href="/set/001">
                {outright ? 'Back to the set' : 'Open another'}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return staged && host ? createPortal(reveal, host) : reveal;
}
