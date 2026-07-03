import Link from 'next/link';
import CosmicBackdrop from './CosmicBackdrop';

/* ─── Cosmic panel ───────────────────────────────────────────────────
   One panel = one full-viewport starfield-and-gradient section with a
   centred uppercase headline and up to two minimal CTAs. Stacked
   vertically, these read as a clean, consistent night-sky flow.
   Presentational + server-safe. */

type Cta = { label: string; href: string; external?: boolean };

export function PanelCta({
  href,
  label,
  variant = 'primary',
  external = false,
}: {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
  external?: boolean;
}) {
  const base =
    'panel-cta inline-flex items-center justify-center rounded-full font-body font-semibold uppercase no-underline text-[11.5px] sm:text-[12.5px] tracking-[0.18em] px-7 py-3.5 min-w-[200px] text-center transition-all duration-300';
  const cls =
    variant === 'primary'
      ? `${base} panel-cta-primary text-white`
      : `${base} panel-cta-secondary text-white/85 hover:text-white`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
    </Link>
  );
}

export default function Panel({
  tint,
  eyebrow,
  title,
  sub,
  primary,
  secondary,
}: {
  tint?: string;
  eyebrow?: string;
  title: React.ReactNode;
  sub?: string;
  primary?: Cta;
  secondary?: Cta;
}) {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: '100svh' }}>
      <CosmicBackdrop tint={tint} />

      {/* Content — vertically centred */}
      <div className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-6 py-24 text-center sm:px-8">
        {eyebrow && (
          <div
            className="font-body text-[11px] font-semibold uppercase sm:text-[12px]"
            style={{ letterSpacing: '0.26em', color: 'rgba(255,255,255,0.62)' }}
          >
            {eyebrow}
          </div>
        )}

        <h2
          className="mt-4 font-display uppercase text-white"
          style={{
            fontSize: 'clamp(2.1rem, 5.2vw, 4.25rem)',
            lineHeight: 1.02,
            letterSpacing: '-0.01em',
            fontWeight: 500,
            textShadow: '0 2px 30px rgba(5,7,15,0.8)',
          }}
        >
          {title}
        </h2>

        {sub && (
          <p className="mt-5 max-w-[560px] font-body text-[13px] leading-[1.6] text-white/75 sm:text-[15px]">
            {sub}
          </p>
        )}

        {(primary || secondary) && (
          <div className="mt-9 flex w-full max-w-[480px] flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
            {primary && (
              <PanelCta href={primary.href} label={primary.label} external={primary.external} variant="primary" />
            )}
            {secondary && (
              <PanelCta href={secondary.href} label={secondary.label} external={secondary.external} variant="secondary" />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
