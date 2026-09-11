'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import type { Axis } from '@/lib/observatory/mount-drive';

const KEYS: Array<{ axis: Axis; dir: 1 | -1; labelKey: string; Icon: typeof ChevronLeft }> = [
  { axis: 'az', dir: -1, labelKey: 'left', Icon: ChevronLeft },
  { axis: 'alt', dir: 1, labelKey: 'up', Icon: ChevronUp },
  { axis: 'alt', dir: -1, labelKey: 'down', Icon: ChevronDown },
  { axis: 'az', dir: 1, labelKey: 'right', Icon: ChevronRight },
];

/** Four keys in a row, held rather than clicked: the axis runs while the key is down. */
export default function ArrowPad({
  disabled,
  labels,
  onPress,
  onRelease,
}: {
  disabled: boolean;
  labels: Record<string, string>;
  onPress: (axis: Axis, dir: 1 | -1) => void;
  onRelease: (axis: Axis) => void;
}) {
  return (
    <div className="tel-pad" role="group" aria-label={labels.group}>
      {KEYS.map(({ axis, dir, labelKey, Icon }) => (
        <button
          key={labelKey}
          type="button"
          className="tel-pad__key"
          aria-label={labels[labelKey]}
          disabled={disabled}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onPress(axis, dir);
          }}
          onPointerUp={() => onRelease(axis)}
          onPointerCancel={() => onRelease(axis)}
          onKeyDown={(e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) onPress(axis, dir);
          }}
          onKeyUp={(e) => {
            if (e.key === ' ' || e.key === 'Enter') onRelease(axis);
          }}
        >
          <Icon size={18} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
