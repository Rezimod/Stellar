'use client';

import { type CSSProperties, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CardPlate from './CardPlate';
import CardBack from './card/CardBack';
import StellarCard from './card/StellarCard';
import type { Rarity } from '@/lib/rarity';
import { RARITIES, isRarity, rarityInfo } from '@/lib/rarity';
import { plateFor } from '@/lib/stellar/plate';
import Typed from './reveal/Typed';
import type { SupernovaHandle } from './supernova/engine';

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
const rarityOf = (c: RevealedCard): Rarity => (isRarity(c.rarity) ? c.rarity : 'common');
const SOUND_KEY = 'stellar_flight_sound';
/** The supernova's sound is held back for now; the score and the toggle return when this is true. */
const SOUND = false;

/** Ink speed of the provenance line, per character. */
const TYPE_MS = 18;

/**
 * The scarcest card is the one the star gives. A capsule listed before
 * capsules held one card can still hold more; the rest wait beside it.
 */
function split(cards: RevealedCard[]) {
  let best = cards[0];
  for (const c of cards) if (RARITIES.indexOf(rarityOf(c)) >= RARITIES.indexOf(rarityOf(best))) best = c;
  return { flown: best, rest: cards.filter((c) => c !== best) };
}

function SealedBack({ designation, u }: { designation: string; u: string }) {
  const plate = plateFor(designation);
  return plate ? <CardBack plate={plate} sealed u={u} /> : null;
}

/**
 * Ignite: a star goes supernova, and out of the nebula it leaves the card
 * comes forward face down and turns over on its own. One press starts it;
 * Skip goes straight to the card; Escape or Close leaves it.
 *
 * The sky is drawn by ./supernova/engine on the stage this component lays
 * out. It plays over the whole screen, lifted to the page's own .stellar
 * root; closing it without an onClose leaves the card in the page.
 */
export default function StellarReveal({
  draw,
  onAgain,
  onClose,
  autoLaunch = false,
}: {
  draw: Draw;
  /** Draws again; the preview's "Open another". */
  onAgain?: () => void;
  /** Called on close instead of leaving the card in the page. */
  onClose?: () => void;
  /** Ignite as soon as it is shown, for a press that already said so. */
  autoLaunch?: boolean;
}) {
  const { cards, sequence, secret, nonce, preview } = draw;
  const { flown, rest } = useMemo(() => split(cards), [cards]);
  const rarity = rarityOf(flown);
  const info = rarityInfo(rarity);
  const outright = secret === undefined && !preview;
  const u = `sn${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const [phase, setPhase] = useState<'pad' | 'flying' | 'done'>('pad');
  const [staged, setStaged] = useState(true);
  const [sound, setSoundState] = useState(true);
  const [turned, setTurned] = useState(false);
  /** The engine loads after the stage shows; until then Ignite has nothing to start. */
  const [ready, setReady] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const lean = useRef({ x: 0, y: 0 });
  const close = useRef<HTMLButtonElement>(null);
  const nova = useRef<SupernovaHandle | null>(null);
  const done = phase === 'done';

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>('.stellar') ?? document.body);
    try {
      if (window.localStorage.getItem(SOUND_KEY) === 'off') setSoundState(false);
    } catch {
      /* storage can be blocked; the default stands */
    }
  }, []);

  /* The engine runs on the stage once it is in the document. */
  useEffect(() => {
    if (!staged || !host || !root.current) return;
    let live = true;
    let handle: SupernovaHandle | null = null;
    let soundOn = true;
    try {
      soundOn = window.localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      /* default on */
    }
    import('./supernova/engine').then(({ startSupernova }) => {
      if (!live || !root.current) return;
      handle = startSupernova(root.current, {
        rarity,
        tone: info.color,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        sound: SOUND && soundOn,
        onDone: () => setPhase('done'),
        waiting: true,
      });
      nova.current = handle;
      setReady(true);
      if (autoLaunch) {
        setPhase('flying');
        handle.launch();
      }
    });
    return () => {
      live = false;
      handle?.destroy();
      nova.current = null;
    };
  }, [staged, host, rarity, info.color, autoLaunch]);

  const ignite = useCallback(() => {
    if (!nova.current || phase !== 'pad') return;
    setPhase('flying');
    nova.current.launch();
  }, [phase]);

  const leave = useCallback(() => {
    if (onClose) onClose();
    else setStaged(false);
  }, [onClose]);

  const toggleSound = () => {
    const next = !sound;
    setSoundState(next);
    nova.current?.setSound(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* the choice holds for this opening only */
    }
  };

  useEffect(() => {
    if (!staged) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.getElementById('privy-dialog')) return;
      if (phase === 'flying') nova.current?.skip();
      else leave();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [staged, phase, leave]);

  useEffect(() => {
    if (done && staged) close.current?.focus();
  }, [done, staged]);

  /* Once it is down the card leans toward the pointer, and a press turns it over. */
  const lay = useCallback((flipped: boolean) => {
    const { x, y } = lean.current;
    if (tilt.current) tilt.current.style.transform = `${flipped ? 'rotateY(180deg) ' : ''}rotateY(${x * 12}deg) rotateX(${-y * 10}deg)`;
  }, []);
  useEffect(() => lay(turned), [turned, lay]);

  const caption = preview ? `${preview} capsule · preview` : outright ? 'Bought outright · Genesis' : `Capsule No. ${pad(sequence ?? 0)} · First Light`;
  const label = preview ? `${preview} capsule, preview` : outright ? `${flown.name}, bought` : `Capsule ${sequence}, opening`;

  /* The provenance line, printed a character at a time once the card is down. */
  const provenance: { text: string; href?: string }[] = preview
    ? [{ text: 'Preview' }, { text: 'nothing bought, nothing recorded' }]
    : outright
      ? [{ text: `Edition No. ${pad(flown.editionNumber)} of ${flown.editionSize}` }, { text: 'bought outright' }]
      : [{ text: `Draw ${sequence}` }, { text: `seed ${secret?.slice(0, 8)}` }, { text: `client ${nonce?.slice(0, 8)}` }, { text: 'verify', href: '/capsules/log' }];
  let ink = 500;
  const typed = provenance.map((p) => {
    const at = ink;
    ink += p.text.length * TYPE_MS + 120;
    return { ...p, at };
  });

  const actions = preview ? (
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
  );

  const after = (
    <div className="sn-after" hidden={!done}>
      <p className="sd-data sn-provenance">
        {typed.map((p, i) => (
          <span key={p.text} className="sn-provenance__part">
            {i > 0 && <span className="sn-provenance__dot">{"\u00a0·\u00a0"}</span>}
            {p.href ? (
              <a href={p.href}>
                <Typed text={p.text} at={`${p.at}ms`} />
              </a>
            ) : (
              <Typed text={p.text} at={`${p.at}ms`} />
            )}
          </span>
        ))}
      </p>
      {rest.length > 0 && (
        <div className="sn-rest">
          <span className="sd-label">Also in this capsule</span>
          <ul>
            {rest.map((c) => (
              <li key={c.drawIndex}>
                <CardPlate size="sm" designation={c.designation} edition={c.editionNumber} href={`/card/${c.designation}`} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {actions}
    </div>
  );

  const tag = (
    <p className="sn-tag" hidden={!done}>
      <span className="sn-tag__rar" style={{ color: info.color }}>
        {info.label}
      </span>
      <a className="sn-tag__name" href={`/card/${flown.designation}`}>
        {flown.name}
      </a>
      <span className="sn-tag__ed">
        No. {pad(flown.editionNumber)} / {flown.editionSize}
      </span>
    </p>
  );

  if (!staged) {
    return (
      <div className="sn-inpage" data-rarity={rarity}>
        <CardPlate designation={flown.designation} edition={flown.editionNumber} href={`/card/${flown.designation}`} />
        {tag}
        {after}
      </div>
    );
  }

  const stage = (
    <div
      ref={root}
      className={`sn ${done ? 'is-done' : ''} ${phase === 'flying' ? 'is-cine' : ''}`.trim()}
      data-rarity={rarity}
      style={{ '--sn-tone': info.color } as CSSProperties}
      role="dialog"
      aria-modal={true}
      aria-label={label}
      onPointerMove={(e) => {
        if (!done) return;
        const r = e.currentTarget.getBoundingClientRect();
        lean.current = {
          x: Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.4))),
          y: Math.max(-1, Math.min(1, (e.clientY - r.top - r.height * 0.4) / (r.height * 0.4))),
        };
        lay(turned);
      }}
      onPointerLeave={() => {
        lean.current = { x: 0, y: 0 };
        lay(turned);
      }}
    >
      <div className="sn-shake" data-sn="shake">
        <canvas className="sn-sky" data-sn="sky" />
        <div className="sn-center">
          <div className="sn-halo" data-sn="halo" aria-hidden="true" />
          <div className="sn-wrap" data-sn="wrap">
            <div className="sn-flip" data-sn="flip">
              <div className={`sn-tilt${turned ? ' is-turned' : ''}`} ref={tilt}>
                <div
                  className="sn-face sn-face--back"
                  data-sn="back"
                  aria-hidden="true"
                  onClick={() => {
                    if (done) setTurned((v) => !v);
                  }}
                >
                  <SealedBack designation={flown.designation} u={`${u}b`} />
                  <div className="sn-veil" data-sn="veil" />
                </div>
                <div
                  className="sn-face sn-face--front"
                  onClick={() => {
                    if (done) setTurned((v) => !v);
                  }}
                >
                  <StellarCard designation={flown.designation} edition={flown.editionNumber} lite />
                  <div className="sn-burn" data-sn="burn" aria-hidden="true" />
                  <div className="sn-sheen" data-sn="sheen" aria-hidden="true" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sn-lb sn-lb--top" aria-hidden="true" />
      <div className="sn-lb sn-lb--bot" aria-hidden="true" />

      <div className="sn-top">
        <span className="sd-label sn-caption">{caption}</span>
        {SOUND && (
          <button type="button" className="sn-chip" aria-pressed={sound} onClick={toggleSound}>
            {sound ? 'Sound on' : 'Sound off'}
          </button>
        )}
        <button
          ref={close}
          type="button"
          className="sn-chip"
          onClick={() => {
            if (phase === 'flying') nova.current?.skip();
            else leave();
          }}
        >
          {phase === 'flying' ? 'Skip' : 'Close'}
        </button>
      </div>

      <div className="sn-hud">
        <div className="sn-pre" hidden={phase !== 'pad'}>
          <span className="sn-pre__kicker">You are opening</span>
          <h2 className="sn-pre__cap">{preview ? `${preview} capsule` : outright ? flown.name : `Capsule No. ${pad(sequence ?? 0)}`}</h2>
          <button type="button" className="sn-go" onClick={ignite} disabled={!ready} aria-busy={!ready}>
            Ignite
          </button>
          <span className="sn-pre__sub">{preview ? 'Preview · nothing is bought' : 'One card · Genesis'}</span>
        </div>
        {tag}
        {after}
      </div>

      <p aria-live="polite" className="sr-only">
        {done ? `${info.label}: ${flown.name}, edition ${flown.editionNumber} of ${flown.editionSize}.${rest.length ? ` Also in this capsule: ${rest.map((c) => c.name).join(', ')}.` : ''}` : ''}
      </p>
    </div>
  );

  return host ? createPortal(stage, host) : stage;
}
