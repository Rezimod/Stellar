import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import HomeHeroSaturn from '@/components/home/HomeHeroSaturn';
import Panel from '@/components/home/Panel';
import CosmicBackdrop from '@/components/home/CosmicBackdrop';

/* ─── Home — cosmic panel stack ──────────────────────────────────────
   A vertical sequence of full-viewport starfield-and-gradient panels,
   each anchoring a single uppercase headline and two cosmic CTAs. One
   consistent night-sky style throughout; a soft per-section accent tint
   gives subtle variety while keeping every headline fully legible. */

const TINT = {
  steps: 'radial-gradient(55% 45% at 50% 18%, rgba(74,108,255,0.08) 0%, transparent 72%)',
  sky: 'radial-gradient(56% 46% at 50% 20%, rgba(94,234,212,0.1) 0%, transparent 72%)',
  missions: 'radial-gradient(56% 46% at 50% 80%, rgba(74,108,255,0.1) 0%, transparent 72%)',
  astra: 'radial-gradient(56% 46% at 50% 20%, rgba(255,179,71,0.1) 0%, transparent 72%)',
  marketplace: 'radial-gradient(56% 46% at 50% 80%, rgba(255,179,71,0.09) 0%, transparent 72%)',
  field: 'radial-gradient(56% 46% at 50% 20%, rgba(74,108,255,0.09) 0%, transparent 72%)',
  community: 'radial-gradient(56% 46% at 50% 80%, rgba(94,234,212,0.1) 0%, transparent 72%)',
};

function HowItWorks({
  eyebrow,
  title,
  cta,
  steps,
}: {
  eyebrow: string;
  title: string;
  cta: string;
  steps: { label: string; desc: string }[];
}) {
  return (
    <section className="relative w-full overflow-hidden" style={{ minHeight: '100svh' }}>
      <CosmicBackdrop tint={TINT.steps} />

      <div className="relative z-10 flex min-h-[100svh] w-full flex-col items-center justify-center px-6 py-24 text-center sm:px-8">
        <div
          className="font-body text-[11px] font-semibold uppercase sm:text-[12px]"
          style={{ letterSpacing: '0.26em', color: 'rgba(255,255,255,0.62)' }}
        >
          {eyebrow}
        </div>
        <h2
          className="mt-4 max-w-[15ch] font-display uppercase text-white"
          style={{
            fontSize: 'clamp(2rem, 4.6vw, 3.6rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            fontWeight: 500,
            textShadow: '0 2px 30px rgba(5,7,15,0.8)',
          }}
        >
          {title}
        </h2>

        <ol className="mt-14 grid w-full max-w-[1000px] grid-cols-1 gap-12 sm:grid-cols-3 sm:gap-8">
          {steps.map((s, i) => (
            <li key={s.label} className="flex flex-col items-center">
              <span className="cosmic-num font-mono text-[20px] font-semibold tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="mt-6 font-display text-[18px] font-medium uppercase tracking-[-0.005em] text-white sm:text-[19px]">
                {s.label}
              </div>
              <p className="mt-3 max-w-[300px] font-body text-[13.5px] leading-[1.6] text-white/65">
                {s.desc}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-14">
          <Link
            href="/missions"
            className="panel-cta panel-cta-primary inline-flex items-center justify-center rounded-full px-8 py-3.5 text-center font-body text-[11.5px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition-all duration-300 sm:text-[12.5px]"
          >
            {cta}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const t = await getTranslations('homepage');

  return (
    <div className="relative -mt-14 overflow-x-hidden bg-[#05070F] text-white">
      {/* Panel 1 — Hero */}
      <HomeHeroSaturn />

      {/* Panel 2 — How it works */}
      <HowItWorks
        eyebrow={t('howItWorks.eyebrow')}
        title={t('howItWorks.title')}
        cta={t('howItWorks.cta')}
        steps={[
          { label: t('howItWorks.step1'), desc: t('howItWorks.desc1') },
          { label: t('howItWorks.step2'), desc: t('howItWorks.desc2') },
          { label: t('howItWorks.step3'), desc: t('howItWorks.desc3') },
        ]}
      />

      {/* Panel 3 — Sky forecast */}
      <Panel
        tint={TINT.sky}
        eyebrow={t('panels.sky.eyebrow')}
        title={t('skyPage.title')}
        sub={t('panels.sky.sub')}
        primary={{ label: t('panels.sky.cta1'), href: '/sky' }}
        secondary={{ label: t('panels.sky.cta2'), href: '/sky' }}
      />

      {/* Panel 4 — Observation missions */}
      <Panel
        tint={TINT.missions}
        eyebrow={t('panels.missions.eyebrow')}
        title={t('missions.title')}
        sub={t('panels.missions.sub')}
        primary={{ label: t('panels.missions.cta1'), href: '/missions' }}
        secondary={{ label: t('panels.missions.cta2'), href: '/missions' }}
      />

      {/* Panel 5 — ASTRA */}
      <Panel
        tint={TINT.astra}
        eyebrow={t('panels.astra.eyebrow')}
        title={t('panels.astra.title')}
        sub={t('panels.astra.sub')}
        primary={{ label: t('panels.astra.cta1'), href: '/chat' }}
        secondary={{ label: t('panels.astra.cta2'), href: '/chat' }}
      />

      {/* Panel 6 — Marketplace */}
      <Panel
        tint={TINT.marketplace}
        eyebrow={t('panels.marketplace.eyebrow')}
        title={t('marketplace.title')}
        sub={t('panels.marketplace.sub')}
        primary={{ label: t('panels.marketplace.cta1'), href: '/marketplace' }}
        secondary={{ label: t('panels.marketplace.cta2'), href: '/marketplace' }}
      />

      {/* Panel 7 — Stellar Field */}
      <Panel
        tint={TINT.field}
        eyebrow={t('panels.field.eyebrow')}
        title={t('panels.field.title')}
        sub={t('panels.field.sub')}
        primary={{ label: t('panels.field.cta1'), href: '/field' }}
        secondary={{ label: t('panels.field.cta2'), href: '/field' }}
      />

      {/* Panel 8 — Community */}
      <Panel
        tint={TINT.community}
        eyebrow={t('community.eyebrow')}
        title={t('community.title')}
        sub={t('panels.community.sub')}
        primary={{ label: t('community.cta'), href: '/feed' }}
        secondary={{ label: t('panels.community.cta2'), href: '/missions' }}
      />
    </div>
  );
}
