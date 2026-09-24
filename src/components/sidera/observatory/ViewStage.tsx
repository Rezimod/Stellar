'use client';

import type { ReactNode, RefObject } from 'react';
import Icon from './icons';
import { plateArt } from './sky';

export type Train = 'reducer' | 'native' | 'barlow2';
export const TRAIN_K: Record<Train, number> = { reducer: 0.7, native: 1, barlow2: 1.9 };
const TRAIN_LABEL: Record<Train, [string, string]> = { reducer: ['0.63×', 'Focal reducer'], native: ['1×', 'Native'], barlow2: ['2×', 'Barlow'] };

const RULER = (() => {
  const lines: string[] = [];
  for (let i = 0; i <= 900; i += 15) {
    const L = i % 150 === 0 ? 9 : 4;
    lines.push(`M${i} 0v${L}M${i} 600v-${L}`);
  }
  for (let i = 0; i <= 600; i += 15) {
    const L = i % 150 === 0 ? 9 : 4;
    lines.push(`M0 ${i}h${L}M900 ${i}h-${L}`);
  }
  return lines.join('');
})();

function Reticle() {
  return (
    <svg className="sdo-overlay" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g fill="none">
        <circle cx="450" cy="300" r="238" stroke="rgba(190,204,240,.22)" strokeDasharray="1 5" />
        <g className="sdo-spin">
          <circle cx="450" cy="300" r="258" stroke="rgba(139,123,255,.35)" strokeDasharray="40 14 4 14" />
        </g>
        <circle cx="450" cy="300" r="112" stroke="rgba(94,234,212,.55)" />
        <path d="M450 40v90M450 470v90M140 300h150M610 300h150" stroke="rgba(190,204,240,.3)" />
        <path d="M338 188h-22v22M562 188h22v22M338 412h-22v-22M562 412h22v-22" stroke="#ffb347" strokeWidth="1.8" />
        <path d="M444 300h12M450 294v12" stroke="#5eead4" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

export type ViewStageProps = {
  viewRef: RefObject<HTMLDivElement | null>;
  feed: ReactNode | null;
  backdrop: string;
  plate: string | null;
  art: 'none' | 'blur' | 'sharp';
  train: Train;
  onTrain: (t: Train) => void;
  reticle: boolean;
  onReticle: () => void;
  labels: boolean;
  onLabels: () => void;
  full: boolean;
  onFull: () => void;
  status: { text: string; go: boolean; blink: boolean };
  hudLive: [string, string, string];
  hudTarget: [string, string] | null;
  hudField: [string, string];
  idle: { title: string; text: string } | null;
};

export default function ViewStage(p: ViewStageProps) {
  const k = TRAIN_K[p.train];
  const artStyle = { transform: `scale(${k})${p.art === 'blur' ? ' translate(34px,-22px)' : ''}`, filter: p.art === 'blur' ? 'blur(6px) brightness(.75)' : undefined };
  const trains = (Object.keys(TRAIN_K) as Train[]).map((t) => (
    <button key={t} type="button" className={p.train === t ? 'is-on' : ''} aria-pressed={p.train === t} title={TRAIN_LABEL[t][1]} onClick={() => p.onTrain(t)}>
      {TRAIN_LABEL[t][0]}
    </button>
  ));
  const toggles = (
    <>
      <button className={`sdo-ib${p.reticle ? ' is-on' : ''}`} type="button" onClick={p.onReticle} aria-pressed={p.reticle} aria-label="Reticle" title="Reticle"><Icon name="target" /></button>
      <button className={`sdo-ib${p.labels ? ' is-on' : ''}`} type="button" onClick={p.onLabels} aria-pressed={p.labels} aria-label="Survey labels" title="Survey labels"><Icon name="layers" /></button>
    </>
  );

  return (
    <section className={`sdo-view${p.full ? ' is-full' : ''}`} aria-label="Telescope view">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sdo-view__sky" src={p.backdrop} alt="" />
      <div className="sdo-view__feed" ref={p.viewRef}>{p.feed}</div>
      {p.plate && p.art !== 'none' && (
        <div className="sdo-art" style={artStyle}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plateArt(p.plate, 'object')} alt="" />
        </div>
      )}
      {p.reticle && p.art !== 'none' && <Reticle />}
      <svg className="sdo-overlay" viewBox="0 0 900 600" preserveAspectRatio="none" aria-hidden="true">
        <path d={RULER} stroke="rgba(190,204,240,.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="sdo-scan" />
      <div className="sdo-vignette" />
      {p.plate && p.labels && p.art === 'sharp' && (
        <div className="sdo-art" style={{ transform: `scale(${(k * 0.86).toFixed(2)})` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={plateArt(p.plate, 'survey')} alt="" />
        </div>
      )}

      <div className="sdo-tools sdo-glass">
        <span className="sdo-lbl">Optics</span>
        <div className="sdo-seg" role="group" aria-label="Optical train">{trains}</div>
        <span className="sdo-tools__sep" />
        {toggles}
        <button className={`sdo-ib${p.full ? ' is-on' : ''}`} type="button" onClick={p.onFull} aria-pressed={p.full} aria-label="Full view" title="Full view (F)"><Icon name="expand" /></button>
      </div>

      <div className="sdo-status" role="status">
        <span className={`sdo-pill sdo-glass${p.status.go ? ' is-go' : ''}`}>
          <span className={`sdo-led ${p.status.go ? 'is-go' : 'is-hold'}${p.status.blink ? ' sdo-blink' : ''}`} />
          {p.status.text}
        </span>
      </div>
      <div className="sdo-hud sdo-glass sdo-hud--tl"><span style={{ color: '#b3a8ff' }}>{p.hudLive[0]}</span> · {p.hudLive[1]}<br />{p.hudLive[2]}</div>
      {p.hudTarget && (
        <div className="sdo-hud sdo-glass sdo-hud--bl"><span style={{ color: '#ffb347' }}>{p.hudTarget[0]}</span><br />{p.hudTarget[1]}</div>
      )}
      <div className="sdo-hud sdo-glass sdo-hud--br">{p.hudField[0]}<br />{p.hudField[1]}</div>

      {p.idle && (
        <div className="sdo-idle sdo-glass">
          <span className="sdo-idle__icon"><Icon name="camera" size={24} /></span>
          <p className="sdo-idle__title">{p.idle.title}</p>
          <p className="sdo-idle__text">{p.idle.text}</p>
        </div>
      )}

      <div className="sdo-phone sdo-pbar sdo-glass">
        <div className="sdo-seg" role="group" aria-label="Optical train">{trains}</div>
        <div>{toggles}</div>
      </div>
    </section>
  );
}
