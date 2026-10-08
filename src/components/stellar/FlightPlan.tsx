import Link from 'next/link';
import type { CSSProperties } from 'react';

type Step = {
  title: string;
  text: string;
  /** A step that is running now is lit; one being prepared stays dim. */
  live: boolean;
  href: string;
  icon: 'capsule' | 'reticle' | 'telescope' | 'meteorite';
  /** A short note under the line: tonight's target, when a step opens. */
  tag?: string;
};

/** Four instruments on a 32-unit grid, drawn with one 1.5 line. */
const ICONS: Record<Step['icon'], React.ReactNode> = {
  capsule: (
    <>
      <rect x="4" y="10.5" width="24" height="11" rx="5.5" />
      <path d="M16 10.5v11" />
      <path d="M9 16h3.5" opacity="0.55" />
      <path d="M25.5 2.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="currentColor" stroke="none" />
    </>
  ),
  reticle: (
    <>
      <circle cx="16" cy="16" r="9.5" />
      <path d="M16 2.5v4M16 25.5v4M2.5 16h4M25.5 16h4" />
      <path d="M16 11l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill="currentColor" stroke="none" />
    </>
  ),
  telescope: (
    <>
      <path d="M6 15.5l14.5-6 2.2 5.2-14.5 6z" />
      <path d="M20.5 9.5l2.8-1.2 2.2 5.2-2.8 1.2" />
      <path d="M5.2 16.6l-1.6.7 1.4 3.3 1.6-.7" />
      <path d="M14 19.5l-4 9.5M14 19.5l4 9.5M14 19.5V29" />
      <circle cx="27" cy="4" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  meteorite: (
    <>
      <path d="M11 10.5l5.5-3 6.5 1.5 4 5.5-1 6.5-6 3.5-7-1.5-3.5-5.5z" />
      <circle cx="16" cy="13" r="1.7" />
      <circle cx="21.5" cy="18.5" r="2.2" />
      <circle cx="15" cy="20" r="1.1" />
      <path d="M3.5 6.5l3 3M2.5 12.5l2.5 1.2" opacity="0.55" />
    </>
  ),
};

/** Four steps from capsule to object, each with its instrument, one line and a note, on one dotted orbit. */
export default function FlightPlan({ steps }: { steps: Step[] }) {
  return (
    <ol className="sd-flight">
      {steps.map((s, i) => (
        <li key={s.title} style={{ '--i': i } as CSSProperties}>
          <Link href={s.href} className={`sd-flight__step${s.live ? ' sd-flight__step--live' : ''}`}>
            <span className="sd-flight__icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[s.icon]}
              </svg>
            </span>
            <span className="sd-flight__head">
              <span className="sd-flight__n" aria-hidden="true">
                0{i + 1}
              </span>
              <span className="sd-flight__title">{s.title}</span>
            </span>
            <span className="sd-flight__text">{s.text}</span>
            {s.tag && <span className="sd-flight__tag">{s.tag}</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}

export type { Step as FlightStep };
