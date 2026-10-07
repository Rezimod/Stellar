import Link from 'next/link';

type Step = {
  title: string;
  text: string;
  /** A step that is running now is lit; one being prepared stays dim. */
  live: boolean;
  href: string;
  icon: 'capsule' | 'reticle' | 'telescope' | 'meteorite';
};

const ICONS: Record<Step['icon'], React.ReactNode> = {
  capsule: (
    <>
      <rect x="6" y="15" width="36" height="20" rx="10" />
      <path d="M24 15v20" />
      <path d="M12 25h4M32 25h4" opacity="0.6" />
      <path d="M39 4l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" />
    </>
  ),
  reticle: (
    <>
      <circle cx="24" cy="25" r="12" />
      <path d="M24 7v6M24 37v6M6 25h6M36 25h6" />
      <path d="M24 19.5l1.7 3.6 3.8.4-2.9 2.6.8 3.8-3.4-2-3.4 2 .8-3.8-2.9-2.6 3.8-.4z" fill="currentColor" stroke="none" />
    </>
  ),
  telescope: (
    <>
      <path d="M10 21l22-9 3 7-22 9z" />
      <path d="M32 12l3-1.3 3 7-3 1.3" />
      <path d="M8.5 22.2l-2 .8 2 4.7 2-.8" />
      <path d="M22 24.5l-6 15M22 24.5l6 15M22 24.5V40" />
      <circle cx="40" cy="8" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  meteorite: (
    <>
      <path d="M15 17l8-5 10 2 6 8-2 10-9 5-10-2-5-8z" />
      <circle cx="22" cy="21" r="2.6" />
      <circle cx="30" cy="28" r="3.4" />
      <circle cx="20" cy="30" r="1.6" />
      <path d="M8 10l4 4M5 16l3 2" opacity="0.6" />
    </>
  ),
};

/** Four steps from capsule to object, each with its instrument and one line, in four quiet columns. */
export default function FlightPlan({ steps }: { steps: Step[] }) {
  return (
    <ol className="sd-flight">
      {steps.map((s) => (
        <li key={s.title}>
          <Link href={s.href} className={`sd-flight__step${s.live ? ' sd-flight__step--live' : ''}`}>
            <span className="sd-flight__icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                {ICONS[s.icon]}
              </svg>
            </span>
            <span className="sd-flight__title">{s.title}</span>
            <span className="sd-flight__text">{s.text}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export type { Step as FlightStep };
