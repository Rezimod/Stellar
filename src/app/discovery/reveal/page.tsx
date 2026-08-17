import type { Metadata } from 'next';
import Link from 'next/link';
import RevealExperience from '@/components/discovery/RevealExperience';
import Starfield from '@/components/discovery/Starfield';
import { parsePreviewTier } from '@/lib/discovery/mockReveal';

export const metadata: Metadata = {
  title: 'Your Reveal — Stellarr Discovery',
  description:
    'Every Cosmic Discovery Pass reveals its celestial object at the same moment: 21 October 2026, at the peak of the Orionids.',
  alternates: { canonical: '/discovery/reveal' },
  // Holder-specific and wallet-gated — nothing here belongs in an index.
  robots: { index: false, follow: false },
};

export default async function RevealPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = params.preview;
  const previewTier = parsePreviewTier(Array.isArray(raw) ? raw[0] : raw);

  return (
    <div className="dsc-root">
      <Starfield />

      <div className="relative z-10 mx-auto flex w-full max-w-[560px] flex-col items-center px-5 py-8 sm:py-10">
        <div className="mb-7 flex w-full items-center justify-between gap-4">
          <Link
            href="/discovery"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11.5,
              letterSpacing: '0.06em',
              color: 'var(--dsc-ghost-dim)',
            }}
          >
            &larr; Back
          </Link>

          {previewTier && (
            <span
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
        </div>

        <RevealExperience previewTier={previewTier} />
      </div>
    </div>
  );
}
