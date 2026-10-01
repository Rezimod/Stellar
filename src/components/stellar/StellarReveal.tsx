'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CardPlate from './CardPlate';
import CardBack from './card/CardBack';
import StellarCard from './card/StellarCard';
import type { Rarity } from '@/lib/rarity';
import { RARITIES, isRarity, rarityInfo } from '@/lib/rarity';
import { plateFor } from '@/lib/stellar/plate';
import Typed from './reveal/Typed';
import type { FlightHandle } from './flight/engine';

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

/** Ink speed of the provenance line, per character. */
const TYPE_MS = 18;

/**
 * The scarcest card is the one that flies. A capsule listed before capsules
 * held one card can still hold more; the rest wait beside it once it lands.
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
 * Fly it: the capsule is launched to orbit and brought home, and the card
 * comes out of its hatch face down and turns over on its own. One press
 * starts it; Skip goes straight to the turn; Escape or Close leaves it.
 *
 * The flight itself is drawn by ./flight/engine on the stage this component
 * lays out. It plays over the whole screen, lifted to the page's own .stellar
 * root; closing it without an onClose leaves the card in the page.
 */
export default function StellarReveal({
  draw,
  onAgain,
  onClose,
  autoLaunch = false,
}: {
  draw: Draw;
  /** Draws again; the preview's "Fly another". */
  onAgain?: () => void;
  /** Called on close instead of leaving the card in the page. */
  onClose?: () => void;
  /** Launch as soon as it is shown, for a press that already said "Fly it". */
  autoLaunch?: boolean;
}) {
  const { cards, sequence, secret, nonce, preview } = draw;
  const { flown, rest } = useMemo(() => split(cards), [cards]);
  const rarity = rarityOf(flown);
  const info = rarityInfo(rarity);
  const outright = secret === undefined && !preview;
  const u = `sf${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const [phase, setPhase] = useState<'pad' | 'flying' | 'done'>('pad');
  const [skippable, setSkippable] = useState(false);
  const [staged, setStaged] = useState(true);
  const [sound, setSoundState] = useState(true);
  const [turned, setTurned] = useState(false);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const grain = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const flight = useRef<FlightHandle | null>(null);
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
    let handle: FlightHandle | null = null;
    let soundOn = true;
    try {
      soundOn = window.localStorage.getItem(SOUND_KEY) !== 'off';
    } catch {
      /* default on */
    }
    import('./flight/engine').then(({ startFlight }) => {
      if (!live || !root.current) return;
      handle = startFlight(root.current, {
        rarity,
        tone: info.color,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        sound: soundOn,
        onDone: () => setPhase('done'),
        onState: (s) => setSkippable(s.skippable),
      });
      flight.current = handle;
      if (autoLaunch) {
        setPhase('flying');
        handle.launch();
      }
    });
    return () => {
      live = false;
      handle?.destroy();
      flight.current = null;
    };
  }, [staged, host, rarity, info.color, autoLaunch]);

  /* Film grain, made once per stage. */
  useEffect(() => {
    if (!staged || !host || !grain.current) return;
    const n = document.createElement('canvas');
    n.width = n.height = 160;
    const x = n.getContext('2d');
    if (!x) return;
    const d = x.createImageData(160, 160);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = Math.random() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    x.putImageData(d, 0, 0);
    grain.current.style.backgroundImage = `url(${n.toDataURL()})`;
  }, [staged, host]);

  const fly = useCallback(() => {
    if (!flight.current || phase !== 'pad') return;
    setPhase('flying');
    flight.current.launch();
  }, [phase]);

  const leave = useCallback(() => {
    if (onClose) onClose();
    else setStaged(false);
  }, [onClose]);

  const toggleSound = () => {
    const next = !sound;
    setSoundState(next);
    flight.current?.setSound(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* the choice holds for this flight only */
    }
  };

  useEffect(() => {
    if (!staged) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.getElementById('privy-dialog')) return;
      if (phase === 'flying' && skippable) flight.current?.skip();
      else leave();
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [staged, phase, skippable, leave]);

  useEffect(() => {
    if (done && staged) close.current?.focus();
  }, [done, staged]);

  const caption = preview ? `${preview} capsule · preview` : outright ? 'Bought outright · First Light' : `Capsule No. ${pad(sequence ?? 0)} · First Light`;
  const label = preview ? `${preview} capsule, preview flight` : outright ? `${flown.name}, bought` : `Capsule ${sequence}, flight`;

  /* The provenance line, printed a character at a time once the card is down. */
  const provenance: { text: string; href?: string }[] = preview
    ? [{ text: 'Preview flight' }, { text: 'nothing bought, nothing recorded' }]
    : outright
      ? [{ text: `Edition No. ${pad(flown.editionNumber)} of ${flown.editionSize}` }, { text: 'bought outright' }]
      : [{ text: `Draw ${sequence}` }, { text: `seed ${secret?.slice(0, 8)}` }, { text: `client ${nonce?.slice(0, 8)}` }, { text: 'verify', href: '/capsules/log' }];
  let ink = 200;
  const typed = provenance.map((p) => {
    const at = ink;
    ink += p.text.length * TYPE_MS + 120;
    return { ...p, at };
  });

  const actions = preview ? (
    <div className="sd-pay__actions">
      <button type="button" className="sd-btn sd-btn--primary" onClick={onAgain}>
        Fly another
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
        {outright ? 'Back to the set' : 'Fly another'}
      </a>
    </div>
  );

  const after = (
    <div className="sf-after" hidden={!done}>
      <p className="sd-data sf-provenance">
        {typed.map((p) =>
          p.href ? (
            <a key={p.text} href={p.href}>
              <Typed text={p.text} at={`${p.at}ms`} />
            </a>
          ) : (
            <Typed key={p.text} text={p.text} at={`${p.at}ms`} />
          ),
        )}
      </p>
      {rest.length > 0 && (
        <div className="sf-rest">
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
    <p className="sf-tag" hidden={!done}>
      <span className="sf-tag__rar" style={{ color: info.color }}>
        {info.glyph} {info.label}
      </span>
      <a className="sf-tag__name" href={`/card/${flown.designation}`}>
        {flown.name}
      </a>
      <span className="sf-tag__ed">
        No. {pad(flown.editionNumber)} / {flown.editionSize}
      </span>
    </p>
  );

  if (!staged) {
    return (
      <div className="sf-inpage" data-rarity={rarity}>
        <CardPlate designation={flown.designation} edition={flown.editionNumber} href={`/card/${flown.designation}`} />
        {tag}
        {after}
      </div>
    );
  }

  const stage = (
    <div
      ref={root}
      className={`sf ${done ? 'is-done' : ''} ${phase === 'flying' ? 'is-flying' : ''}`.trim()}
      data-rarity={rarity}
      role="dialog"
      aria-modal={true}
      aria-label={label}
      onPointerMove={(e) => {
        if (!done || !tilt.current) return;
        const r = e.currentTarget.getBoundingClientRect();
        const nx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / (r.width * 0.4)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height * 0.4) / (r.height * 0.4)));
        tilt.current.style.transform = `rotateY(${nx * 12}deg) rotateX(${-ny * 10}deg)`;
        e.currentTarget.style.setProperty('--sf-sx', `${50 - nx * 60}%`);
      }}
      onPointerLeave={() => {
        if (tilt.current) tilt.current.style.transform = '';
      }}
    >
      <div className="sf-stage" data-sf="stage">
        <div className="sf-cam" data-sf="cam">
          <canvas className="sf-layer" data-sf="bg" />
          <div className="sf-camin">
            <div className="sf-vehicle sf-rocket" data-sf="rocket" />
            <div className="sf-vehicle sf-cap" data-sf="cap">
              <div className="sf-drogues" data-sf="drogues" />
              <div className="sf-chutes" data-sf="chutes" />
              <div className="sf-capart" data-sf="capart" />
              <div className="sf-hatch">
                <div className="sf-hatch__hole" />
                <div className="sf-hatch__light" data-sf="hlight" />
                <div className="sf-hatch__ring" />
                <div className="sf-hatch__door" data-sf="door" />
              </div>
            </div>
            <div className="sf-rays" data-sf="rays" />
          </div>
          <canvas className="sf-layer sf-layer--fx" data-sf="fx" />
        </div>
        <div className="sf-vignette" aria-hidden="true" />

        <div className="sf-reveal">
          <div className="sf-dim" data-sf="dim" aria-hidden="true" />
          <div className="sf-spikes" data-sf="spikes" aria-hidden="true">
            <span className="sf-spk-d1" />
            <span className="sf-spk-d2" />
            <span className="sf-spk-h" />
            <span className="sf-spk-v" />
            <span className="sf-spk-core" />
          </div>
          <div className="sf-mover" data-sf="mover">
            <div className="sf-bob" data-sf="bob">
              <div className="sf-persp">
                <div className="sf-tilt" ref={tilt}>
                  <span className="sf-ring" data-sf="ring" aria-hidden="true" />
                  <span className="sf-rim" data-sf="rim" aria-hidden="true" />
                  <div className={`sf-flipper${turned ? ' is-turned' : ''}`}>
                    <div
                      className="sf-card"
                      data-sf="card"
                      onClick={() => {
                        if (done) setTurned((v) => !v);
                      }}
                    >
                      <div className="sf-face sf-face--front">
                        <StellarCard designation={flown.designation} edition={flown.editionNumber} lite />
                        <div className="sf-foil" aria-hidden="true" />
                        <div className="sf-sheen" data-sf="sheen" aria-hidden="true" />
                      </div>
                      <div className="sf-face sf-face--back" aria-hidden="true">
                        <SealedBack designation={flown.designation} u={`${u}b`} />
                      </div>
                    </div>
                  </div>
                  <svg className="sf-tracer" data-sf="tracer" viewBox="0 0 630 880" preserveAspectRatio="none" aria-hidden="true">
                    <rect x="5" y="5" width="620" height="870" rx="28" pathLength={1} fill="none" stroke={info.color} strokeWidth="6" strokeDasharray=".16 .84" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          {tag}
        </div>

        <div className="sf-flash" data-sf="flash" aria-hidden="true" />
        <div className="sf-grain" ref={grain} aria-hidden="true" />
        <div className="sf-lb sf-lb--top" data-sf="lbT" aria-hidden="true" />
        <div className="sf-lb sf-lb--bot" data-sf="lbB" aria-hidden="true" />
        <div className="sf-tele" data-sf="tele" aria-hidden="true">
          <span className="sf-tele__phase" data-sf="phase" />
          <span className="sf-tele__clock" data-sf="clock" />
          <span className="sf-tele__data" data-sf="tdata" />
        </div>

        <div className="sf-top">
          <span className="sd-label sf-caption">{caption}</span>
          <button type="button" className="sf-chip" aria-pressed={sound} onClick={toggleSound}>
            {sound ? 'Sound on' : 'Sound off'}
          </button>
          <button
            ref={close}
            type="button"
            className="sf-chip"
            hidden={phase === 'flying' && !skippable}
            onClick={() => {
              if (phase === 'flying') flight.current?.skip();
              else leave();
            }}
          >
            {phase === 'flying' ? 'Skip' : 'Close'}
          </button>
        </div>

        <div className="sf-hud">
          {phase === 'pad' && (
            <button type="button" className="sf-fly" onClick={fly}>
              <b>Fly it</b>
              <small>{preview ? 'Preview · nothing is bought' : 'One card · First Light'}</small>
            </button>
          )}
          {after}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {done ? `${info.label}: ${flown.name}, edition ${flown.editionNumber} of ${flown.editionSize}.${rest.length ? ` Also in this capsule: ${rest.map((c) => c.name).join(', ')}.` : ''}` : ''}
      </p>
    </div>
  );

  return host ? createPortal(stage, host) : stage;
}
