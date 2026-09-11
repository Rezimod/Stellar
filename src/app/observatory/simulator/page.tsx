import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import PageContainer from '@/components/layout/PageContainer';
import SessionConsole from '@/components/observatory/SessionConsole';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';

export const metadata: Metadata = {
  title: 'Telescope simulator — Stellar',
  description:
    'Drive a simulated 150 mm telescope with real field of view, real slew times and a real safety envelope. Nothing here is a photograph presented as your own.',
};

export const revalidate = 300;

/**
 * The simulator is the console and nothing else — the frame fills the page,
 * the controls float on it. What is left over is the note explaining how the
 * frame is built, which belongs under the instrument rather than beside it.
 */
export default async function SimulatorPage() {
  const [node] = await getNodesWithReadiness();
  const t = await getTranslations('observatory.simulator');

  return (
    <>
      <SessionConsole node={node} cloudCover={node.readiness.cloudCover} />

      <PageContainer variant="fullscreen" className="obs-below">
        <section className="obs-float obs-float--section">
          <div className="obs-section__head">
            <h1 className="obs-card__title" style={{ fontSize: '1.0625rem' }}>{t('howTitle')}</h1>
            <Link href={`/observatory/${node.id}`} className="obs-ghost">
              {t('hold', { name: node.name })}
            </Link>
          </div>
          <p className="obs-float__text" style={{ maxWidth: '76ch' }}>{t('how1')}</p>
          <p className="obs-float__text" style={{ maxWidth: '76ch' }}>{t('how2')}</p>
        </section>
      </PageContainer>
    </>
  );
}
