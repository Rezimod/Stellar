import type { Metadata } from 'next';
import DemoReveal from '@/components/discovery/DemoReveal';
import RevealExperience from '@/components/discovery/RevealExperience';
import RevealSequence from '@/components/discovery/RevealSequence';
import Starfield from '@/components/discovery/Starfield';
import { isDemoMode } from '@/lib/discovery/demo';
import { parsePreviewTier } from '@/lib/discovery/mockReveal';

export const metadata: Metadata = {
  title: 'Your Reveal — Stellarr Discovery',
  description:
    'Every Cosmic Discovery Pass reveals its celestial object at the same moment: 21 October 2026, at the peak of the Orionids.',
  alternates: { canonical: '/discovery/reveal' },
  // Holder-specific and wallet-gated — nothing here belongs in an index.
  robots: { index: false, follow: false },
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function RevealPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const previewTier = parsePreviewTier(first(params.preview));
  const demo = isDemoMode(new URLSearchParams({ demo: first(params.demo) ?? '' }));

  return (
    <div className="dsc-root">
      <Starfield />

      <div className="relative z-10 mx-auto flex w-full max-w-[560px] flex-col items-center px-5 py-8 sm:py-10">
        {demo && (
          <div className="mb-7 flex w-full justify-end">
            <span className="dsc-badge dsc-badge--demo">Demo Mode</span>
          </div>
        )}

        {!demo && previewTier && (
          <span
            className="mb-7 w-full text-right"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--dsc-amber)',
            }}
          >
            Preview &middot; {previewTier} &middot; mock data
          </span>
        )}

        {/* Demo bypasses RevealExperience entirely: that component's whole job
            is deciding what a connected wallet is entitled to see, and the demo
            is defined by having no wallet. seenKey is null so the sequence
            replays on every load — what a recording needs. */}
        {demo ? (
          <RevealSequence seenKey={null}>
            <DemoReveal />
          </RevealSequence>
        ) : (
          <RevealExperience previewTier={previewTier} />
        )}
      </div>
    </div>
  );
}
