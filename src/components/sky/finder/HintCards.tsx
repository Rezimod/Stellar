'use client';

import { useTranslations } from 'next-intl';
import { moonPhaseKey, type CompassDir } from '@/lib/sky/directions';
import type { SkyObject } from './types';

interface HintCardsProps {
  object: SkyObject;
  /** Optional anchor target — used to render a star-hop hint for hard objects. */
  hopAnchor?: SkyObject | null;
}

const PLANET_RECOGNIZE = new Set([
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune',
]);

function fmtHHmm(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

/** Approximate angular distance between two points on the sky (degrees). */
function angularSeparation(a: SkyObject, b: SkyObject): number {
  const DEG = Math.PI / 180;
  const lat1 = a.altitude * DEG;
  const lat2 = b.altitude * DEG;
  const dLon = (b.azimuth - a.azimuth) * DEG;
  const cos = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG;
}

const FIST_KEY_BY_INDEX = [
  'half', 'one', 'oneAndHalf', 'two', 'twoAndHalf',
  'three', 'threeAndHalf', 'four', 'fourAndHalf', 'five',
] as const;

function fistKeyForDegrees(deg: number): { key: string; n?: number } {
  const fists = Math.max(0.5, Math.round(deg / 5) / 2);
  if (fists >= 5.5) return { key: 'many', n: Math.round(fists) };
  const idx = Math.min(9, Math.max(0, Math.round(fists * 2) - 1));
  return { key: FIST_KEY_BY_INDEX[idx] };
}

export function HintCards({ object, hopAnchor }: HintCardsProps) {
  const t = useTranslations('sky');
  const phaseKey = object.id === 'moon' ? moonPhaseKey(object.phase ?? 0.5) : null;
  const phaseText = phaseKey ? t(`moonPhase.${phaseKey}`) : '';

  let recognize: string;
  if (object.id === 'moon') {
    recognize = t('hints.recognize.moon', { phase: phaseText });
  } else if (PLANET_RECOGNIZE.has(object.id)) {
    recognize = t(`hints.recognize.${object.id}`);
  } else if (object.constellation) {
    recognize = t(`hints.recognizeType.${object.type}WithConstellation`, { constellation: object.constellation });
  } else {
    recognize = t(`hints.recognizeType.${object.type}`);
  }

  const compassWord = t(`directions.compass.${object.compassDirection as CompassDir}`);
  const setLabel = fmtHHmm(object.setTime);
  const riseLabel = fmtHHmm(object.riseTime);

  let bestWindow: string;
  if (object.circumpolar && object.visible) {
    bestWindow = t('hints.bestWindow.allNight');
  } else if (object.visible && setLabel) {
    bestWindow = t('hints.bestWindow.untilSet', { time: setLabel, direction: compassWord });
  } else if (!object.visible && riseLabel) {
    bestWindow = t('hints.bestWindow.untilRise', { time: riseLabel, direction: compassWord });
  } else {
    bestWindow = t('hints.bestWindow.allNight');
  }

  // Star-hop card replaces the fist trick for hard catalog targets when an
  // anchor body is present and currently visible.
  const showHop = object.difficulty === 'hard' && hopAnchor && hopAnchor.visible;

  return (
    <div className="finder-hints">
      {showHop && hopAnchor ? (() => {
        const sep = angularSeparation(object, hopAnchor);
        const fk = fistKeyForDegrees(sep);
        const distance = fk.n != null
          ? t(`directions.fists.${fk.key}`, { n: fk.n })
          : t(`directions.fists.${fk.key}`);
        return (
          <StarHopCard
            object={object}
            anchor={hopAnchor}
            label={t('hints.hop.label')}
            body={t('hints.hop.body', { anchor: hopAnchor.name, distance })}
          />
        );
      })() : (
        <FistTrickCard label={t('hints.fistTrick.label')} body={t('hints.fistTrick.body')} />
      )}
      <HintCard label={t('hints.recognize.label')} body={recognize} />
      <HintCard label={t('hints.bestWindow.label')} body={bestWindow} />
    </div>
  );
}

function HintCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="finder-hint">
      <div className="finder-hint__label">{label}</div>
      <div className="finder-hint__body">{body}</div>
    </div>
  );
}

function FistTrickCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="finder-hint finder-hint--fist">
      <div className="finder-hint__label">{label}</div>
      <div className="finder-hint__body">{body}</div>
      <FistDiagram />
    </div>
  );
}

function StarHopCard({
  object,
  anchor,
  label,
  body,
}: {
  object: SkyObject;
  anchor: SkyObject;
  label: string;
  body: string;
}) {
  const sep = angularSeparation(object, anchor);
  return (
    <div className="finder-hint finder-hint--hop">
      <div className="finder-hint__label">{label}</div>
      <div className="finder-hint__body">{body}</div>
      <HopDiagram from={anchor.name} to={object.name} degrees={sep} />
    </div>
  );
}

function FistDiagram() {
  return (
    <div className="finder-hint__fist-diagram" aria-hidden="true">
      <svg width={68} height={36} viewBox="0 0 68 36" fill="none">
        <line x1={4} y1={28} x2={64} y2={28} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
        <path d="M6 30 L26 22 L34 14" stroke="rgba(255,255,255,0.45)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={36} cy={11} r={4.5} fill="rgba(255,255,255,0.55)" />
        <path d="M22 28 A 18 18 0 0 1 30 14" stroke="var(--terracotta, #FFB347)" strokeWidth={1} strokeDasharray="2 2" fill="none" />
      </svg>
      <span className="finder-hint__fist-caption">≈ 10°</span>
    </div>
  );
}

function HopDiagram({ from, to, degrees }: { from: string; to: string; degrees: number }) {
  return (
    <div className="finder-hint__hop-diagram" aria-hidden="true">
      <svg width={120} height={42} viewBox="0 0 120 42" fill="none">
        <circle cx={14} cy={28} r={4.5} fill="#FFB347" />
        <circle cx={14} cy={28} r={8} fill="none" stroke="rgba(255,241,210,0.25)" strokeWidth={0.8} />
        <path d="M22 26 Q 60 6 100 22" stroke="var(--terracotta, #FFB347)" strokeWidth={1} strokeDasharray="2 2" fill="none" />
        <circle cx={104} cy={22} r={2.6} fill="none" stroke="var(--terracotta, #FFB347)" strokeWidth={1.1} />
        <line x1={104} y1={15} x2={104} y2={11} stroke="var(--terracotta, #FFB347)" strokeWidth={1.1} />
        <line x1={104} y1={29} x2={104} y2={33} stroke="var(--terracotta, #FFB347)" strokeWidth={1.1} />
      </svg>
      <div className="finder-hint__hop-caption">
        <span className="finder-hint__hop-from">{from}</span>
        <span className="finder-hint__hop-deg">≈ {Math.round(degrees)}°</span>
        <span className="finder-hint__hop-to">{to}</span>
      </div>
    </div>
  );
}
