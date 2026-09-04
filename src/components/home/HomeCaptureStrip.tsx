import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import CaptureFrame from '@/components/observatory/CaptureFrame';
import { recentCaptures } from '@/lib/observatory/gallery';

/**
 * The most recent frames the network has taken, on the home page.
 *
 * Renders nothing at all when there are none. An empty band promising future
 * photographs is worse than no band: the page already says the first node is
 * under commissioning, and saying it twice in a frame-shaped hole reads as a
 * gallery that failed to load.
 */
export default async function HomeCaptureStrip() {
  const captures = await recentCaptures(4);
  if (captures.length === 0) return null;

  const t = await getTranslations('homepage.observatory');

  return (
    <section className="px-4 md:px-8 pb-14 md:pb-[120px]">
      <div className="max-w-[1200px] mx-auto">
        <div className="max-w-[820px] mx-auto text-center" data-reveal>
          <h2 className="text-white text-[22px] md:text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">
            {t('capturesTitle')}
          </h2>
          <p className="mt-3 text-[15px] md:text-[16px] leading-relaxed text-white/60">
            {t('capturesLead')}
          </p>
        </div>

        <div
          className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
          data-reveal-stagger
        >
          {captures.map((capture) => (
            <figure
              key={capture.id}
              className="m-0 overflow-hidden rounded-xl border border-white/[0.08]"
            >
              {capture.frame ? (
                <CaptureFrame
                  recipe={capture.frame}
                  alt={`${capture.targetName} from ${capture.site}`}
                />
              ) : (
                <div style={{ aspectRatio: '16 / 9', background: '#060B1C' }} />
              )}
              <figcaption className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                <span className="truncate text-[14px] text-white">{capture.targetName}</span>
                <span
                  className="font-mono text-[10.5px] uppercase tracking-[0.14em]"
                  style={{ color: capture.provenance === 'instrument' ? '#34D399' : '#6B7385' }}
                >
                  {capture.provenance}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-6 text-center" data-reveal>
          <Link
            href="/observatory/captures"
            className="font-mono text-[12.5px] text-[#FFB347] no-underline hover:underline"
          >
            {t('capturesCta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
