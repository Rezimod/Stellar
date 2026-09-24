import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PageContainer from '@/components/layout/PageContainer';
import CaptureCard from '@/components/observatory/CaptureCard';
import { recentCaptures } from '@/lib/observatory/gallery';

export const metadata: Metadata = {
  title: 'Captures — Stellar Observatory',
  description:
    'Every frame the network has taken, with the instrument that took it and where it came from.',
};

// The gallery grows a row at a time, not a request at a time.
export const revalidate = 120;

export default async function CapturesPage() {
  const t = await getTranslations('observatory.captures');
  const captures = await recentCaptures(24);
  const instrument = captures.filter((c) => c.provenance === 'instrument').length;

  return (
    <PageContainer variant="fullscreen" className="obs-below" style={{ paddingTop: '1rem' }}>
      {/* No photograph over this page on purpose: a NASA picture over "what
          the network has photographed" would imply the very thing this page
          exists to disprove. The frames arrive at first light. */}
      <header className="obs-float obs-float--section">
        <div className="obs-float__head">
          <h1 className="obs-float__title" style={{ marginTop: 0 }}>{t('title')}</h1>
          {captures.length > 0 && (
            <span className="obs-pill">
              {t.rich('count', {
                count: captures.length,
                instrument,
                n: (chunks) => <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{chunks}</b>,
              })}
            </span>
          )}
        </div>
        <p className="obs-float__text" style={{ maxWidth: '64ch' }}>{t('intro')}</p>
        <Link href="/observatory/how-it-works" className="obs-ghost mt-5">
          {t('howLink')}
        </Link>
      </header>

      {captures.length === 0 ? (
        <EmptyGallery />
      ) : (
        <div className="obs-gallery">
          {captures.map((capture) => (
            <CaptureCard key={capture.id} capture={capture} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

/**
 * The empty state says why it is empty, which is the only interesting thing
 * about it. A gallery seeded with frames nobody asked for would be the July
 * mistake in a friendlier shape.
 */
async function EmptyGallery() {
  const t = await getTranslations('observatory.captures');

  return (
    <section className="obs-float obs-float--section">
      <h2 className="obs-h2">{t('emptyTitle')}</h2>
      <p className="obs-float__text" style={{ maxWidth: '64ch' }}>{t('emptyWhy')}</p>
      <p className="obs-float__text" style={{ maxWidth: '64ch' }}>{t('emptyNext')}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/observatory" className="obs-ghost obs-ghost--primary">
          {t('book')}
        </Link>
        <Link href="/observatory/simulator" className="obs-ghost">
          {t('simulator')}
        </Link>
      </div>
    </section>
  );
}
