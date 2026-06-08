// src/components/sky/TonightVerdict.tsx
//
// "Tonight's Verdict & Plan" — the answer card. Synthesises the conditions
// already on the Sky page (cloud cover, dark window, Moon) into a single
// GO / MAYBE / SKIP verdict with a plain-English reason, the supporting
// numbers, and the one best target to point at tonight. Works on every
// device (no compass required), unlike the old camera-AR widget.

'use client';

import { ArrowRight, Cloud, Clock, Moon } from 'lucide-react';
import { getTargetPhoto } from '@/lib/sky/target-photos';
import { PlanetIcon } from '@/components/sky/finder/PlanetIcon';
import type { ObjectId, SkyObject } from '@/components/sky/finder/types';
import './TonightVerdict.css';

type Verdict = 'GO' | 'MAYBE' | 'SKIP';

interface TonightVerdictProps {
  cloudPct: number | null;
  windowDuration: string | null;
  moonIllum: number;
  bestTarget: SkyObject | null;
  onChooseTarget: (id: ObjectId) => void;
}

function computeVerdict(
  cloudPct: number | null,
  hasWindow: boolean,
  moonIllum: number,
): { v: Verdict; color: string; reason: string } {
  let score = 100;
  if (cloudPct != null) score -= cloudPct;
  else score -= 20;
  if (!hasWindow) score -= 25;
  score -= moonIllum * 0.1;
  score = Math.max(0, Math.min(100, score));

  const v: Verdict = score >= 60 ? 'GO' : score >= 35 ? 'MAYBE' : 'SKIP';
  const color = v === 'GO' ? '#5EEAD4' : v === 'MAYBE' ? '#FFB347' : '#94A3B8';

  let reason: string;
  if (cloudPct != null && cloudPct >= 70) {
    reason = `${cloudPct}% cloud cover — the sky is mostly closed tonight.`;
  } else if (!hasWindow) {
    reason = `No real darkness tonight — twilight never fully clears.`;
  } else if (cloudPct != null && cloudPct >= 40) {
    reason = `Patchy cloud (${cloudPct}%) — watch for clear gaps.`;
  } else {
    reason = `Clear skies${
      hasWindow ? '' : ''
    } — a good night to set up the scope.`;
  }
  return { v, color, reason };
}

export function TonightVerdict({
  cloudPct,
  windowDuration,
  moonIllum,
  bestTarget,
  onChooseTarget,
}: TonightVerdictProps) {
  const hasWindow = !!windowDuration;
  const { v, color, reason } = computeVerdict(cloudPct, hasWindow, moonIllum);
  const photo = bestTarget ? getTargetPhoto(bestTarget.id) : null;

  return (
    <section className="verdict" aria-label="Tonight's verdict" style={{ ['--v' as string]: color }}>
      <div className="verdict__badge">
        <span className="verdict__badge-v">{v}</span>
        <span className="verdict__badge-sub">tonight</span>
      </div>

      <div className="verdict__body">
        <p className="verdict__eyebrow">Tonight&apos;s verdict</p>
        <p className="verdict__headline">{reason}</p>
        <ul className="verdict__factors">
          <li className="verdict__factor">
            <Cloud size={13} aria-hidden="true" />
            <span>{cloudPct != null ? `${cloudPct}%` : '—'} cloud</span>
          </li>
          <li className="verdict__factor">
            <Clock size={13} aria-hidden="true" />
            <span>{windowDuration ?? 'No'} dark</span>
          </li>
          <li className="verdict__factor">
            <Moon size={13} aria-hidden="true" />
            <span>{moonIllum}% moon</span>
          </li>
        </ul>
      </div>

      {bestTarget && (
        <div className="verdict__target">
          <span className="verdict__target-label">Best target</span>
          <button
            type="button"
            className="verdict__target-btn"
            onClick={() => onChooseTarget(bestTarget.id)}
          >
            <span className="verdict__target-thumb">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" />
              ) : (
                <PlanetIcon
                  id={bestTarget.id}
                  type={bestTarget.type}
                  magnitude={bestTarget.magnitude}
                  phase={bestTarget.phase}
                  size={40}
                  glow={false}
                />
              )}
            </span>
            <span className="verdict__target-body">
              <span className="verdict__target-name">{bestTarget.name}</span>
              <span className="verdict__target-meta">
                {bestTarget.constellation || bestTarget.type}
                <span aria-hidden> · </span>
                {Math.round(bestTarget.altitude)}° {bestTarget.compassDirection}
              </span>
            </span>
            <ArrowRight size={16} aria-hidden="true" className="verdict__target-arrow" />
          </button>
        </div>
      )}
    </section>
  );
}
