import type { Metadata } from 'next';
import Link from 'next/link';
import BackButton from '@/components/shared/BackButton';
import PageContainer from '@/components/layout/PageContainer';
import CaptureCard from '@/components/observatory/CaptureCard';
import { recentCaptures } from '@/lib/observatory/gallery';
import '../observatory.css';

export const metadata: Metadata = {
  title: 'Captures — Stellar Observatory',
  description:
    'Every frame the network has taken, with the instrument that took it and where it came from.',
};

// The gallery grows a row at a time, not a request at a time.
export const revalidate = 120;

export default async function CapturesPage() {
  const captures = await recentCaptures(24);
  const instrument = captures.filter((c) => c.provenance === 'instrument').length;

  return (
    <PageContainer variant="wide" className="obs py-6 sm:py-10">
      <BackButton />

      <header className="mt-4 max-w-2xl">
        <h1 className="text-2xl font-medium sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Captures
        </h1>
        <p className="mt-2 text-base" style={{ color: 'var(--text-secondary)' }}>
          Every frame the network has taken, with the instrument that took it and what it is
          worth. Simulated frames are shown and labelled; they are never mixed in quietly.
        </p>
        <Link
          href="/observatory/how-it-works"
          className="mt-3 inline-block text-sm underline"
          style={{ color: 'var(--text-secondary)' }}
        >
          How a capture is proved
        </Link>
      </header>

      {captures.length === 0 ? (
        <EmptyGallery />
      ) : (
        <>
          <p className="mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              {captures.length}
            </span>{' '}
            {captures.length === 1 ? 'frame' : 'frames'} ·{' '}
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
              {instrument}
            </span>{' '}
            from an instrument
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {captures.map((capture) => (
              <CaptureCard key={capture.id} capture={capture} />
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
}

/**
 * The empty state says why it is empty, which is the only interesting thing
 * about it. A gallery seeded with frames nobody asked for would be the July
 * mistake in a friendlier shape.
 */
function EmptyGallery() {
  return (
    <section
      className="mt-6 border p-5"
      style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}
    >
      <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
        No frames yet
      </h2>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
        Nothing has been captured through a booked session. The simulator keeps its frames in
        your browser on purpose — a sandbox that filed its output would fill this page with
        pictures no telescope took.
      </p>
      <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
        The first node is under commissioning. From its first light, every frame appears here
        with its instrument, its integration and its provenance.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/observatory"
          className="inline-block rounded-md border px-3 py-2 text-sm"
          style={{
            borderColor: 'var(--accent-border)',
            background: 'var(--accent-dim)',
            color: 'var(--accent-text)',
          }}
        >
          Book a session
        </Link>
        <Link
          href="/observatory/simulator"
          className="inline-block rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--obs-rule-strong)', color: 'var(--text-primary)' }}
        >
          Open the simulator
        </Link>
      </div>
    </section>
  );
}
