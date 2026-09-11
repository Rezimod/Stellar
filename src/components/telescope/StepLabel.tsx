import { Check } from 'lucide-react';

export type StepState = 'todo' | 'active' | 'done';

/** "Step 2 — Calibrate": a numbered badge that becomes a tick when the step is behind you. */
export default function StepLabel({ n, state, children }: { n: number; state: StepState; children: string }) {
  return (
    <div className={`tel-step tel-step--${state}`}>
      <span className="tel-step__badge" aria-hidden="true">
        {state === 'done' ? <Check size={12} strokeWidth={3} /> : n}
      </span>
      <span className="tel-step__text">{children}</span>
    </div>
  );
}
