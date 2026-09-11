import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import PageContainer from '@/components/layout/PageContainer';
import TelescopeConsole from '@/components/telescope/TelescopeConsole';
import './telescope.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('observatory.telescope');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

/**
 * The live console: connect to a telescope, park, calibrate, choose a target,
 * point, observe, capture. Every frame is drawn by the sky model and says so.
 */
export default function TelescopePage() {
  return (
    <PageContainer variant="fullscreen">
      <TelescopeConsole />
    </PageContainer>
  );
}
