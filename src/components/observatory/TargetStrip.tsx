'use client';

import Image from 'next/image';
import { SIM_TARGETS, targetAltAz, targetPhoto, targetSizeArcmin, type SimTarget } from '@/lib/observatory/sim-targets';
import type { SafetyVerdict } from '@/lib/observatory/safety';
import type { ObservatoryNode } from '@/lib/observatory/types';

/** Arcminutes when the object is Moon-sized, arcseconds when it is a planet. */
function size(arcmin: number): string {
  return arcmin < 1 ? `${(arcmin * 60).toFixed(0)}″` : `${arcmin.toFixed(0)}′`;
}

/**
 * The eight things the instrument will point at, shown as what they are.
 *
 * A list of names asks the visitor to know what a Ring Nebula is; a row of
 * photographs does not. Each tile also carries the object's altitude on the
 * console clock and its apparent size, which between them are the reason a
 * target is offered or refused tonight.
 */
export default function TargetStrip({
  node,
  date,
  targetId,
  verdicts,
  onGoTo,
}: {
  node: ObservatoryNode;
  date: Date;
  targetId: string | null;
  verdicts: Record<string, SafetyVerdict>;
  onGoTo: (target: SimTarget) => void;
}) {
  return (
    <ul className="obs-targets" aria-label="Targets">
      {SIM_TARGETS.map((target) => {
        const verdict = verdicts[target.id];
        const refused = verdict !== undefined && !verdict.ok;
        const active = targetId === target.id;
        const photo = targetPhoto(target);
        const { altitude } = targetAltAz(target, node, date);

        return (
          <li key={target.id}>
            <button
              type="button"
              className="obs-target"
              aria-pressed={active}
              disabled={refused}
              onClick={() => onGoTo(target)}
              title={refused ? verdict.reason : target.expect}
            >
              <span className="obs-target__disc">
                {photo && <Image src={photo.src} alt="" fill sizes="72px" />}
              </span>
              <span className="obs-target__name">{target.name}</span>
              <span className="obs-target__meta">
                {size(targetSizeArcmin(target, date))} · {altitude > 0 ? `${altitude.toFixed(0)}°` : 'set'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
