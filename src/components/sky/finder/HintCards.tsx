'use client';

import { useTranslations } from 'next-intl';
import { moonPhaseKey, type CompassDir } from '@/lib/sky/directions';
import type { SkyObject } from './types';

interface HintCardsProps {
  object: SkyObject;
}

function fmtHHmm(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

export function HintCards({ object }: HintCardsProps) {
  const t = useTranslations('sky');
  const phaseKey = object.id === 'moon' ? moonPhaseKey(object.phase ?? 0.5) : null;
  const phaseText = phaseKey ? t(`moonPhase.${phaseKey}`) : '';

  const recognize =
    object.id === 'moon'
      ? t('hints.recognize.moon', { phase: phaseText })
      : t(`hints.recognize.${object.id}`);

  const compassWord = t(`directions.compass.${object.compassDirection as CompassDir}`);
  const setLabel = fmtHHmm(object.setTime);
  const riseLabel = fmtHHmm(object.riseTime);

  let bestWindow: string;
  if (object.visible && setLabel) {
    bestWindow = t('hints.bestWindow.untilSet', { time: setLabel, direction: compassWord });
  } else if (!object.visible && riseLabel) {
    bestWindow = t('hints.bestWindow.untilRise', { time: riseLabel, direction: compassWord });
  } else {
    bestWindow = t('hints.bestWindow.allNight');
  }

  return (
    <div className="finder-hints">
      <FistTrickCard label={t('hints.fistTrick.label')} body={t('hints.fistTrick.body')} />
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

function FistDiagram() {
  return (
    <div className="finder-hint__fist-diagram" aria-hidden="true">
      <svg width={68} height={36} viewBox="0 0 68 36" fill="none">
        {/* Horizon */}
        <line
          x1={4}
          y1={28}
          x2={64}
          y2={28}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1}
        />
        {/* Arm */}
        <path
          d="M6 30 L26 22 L34 14"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Fist */}
        <circle cx={36} cy={11} r={4.5} fill="rgba(255,255,255,0.55)" />
        {/* Arc showing 10° angle */}
        <path
          d="M22 28 A 18 18 0 0 1 30 14"
          stroke="var(--terracotta, #FFD166)"
          strokeWidth={1}
          strokeDasharray="2 2"
          fill="none"
        />
      </svg>
      <span className="finder-hint__fist-caption">≈ 10°</span>
    </div>
  );
}
