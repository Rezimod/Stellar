'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CosmicLoader } from './CosmicLoader';

/** The screen between pressing 3D and the scene: full-bleed, site chrome
 *  hidden exactly as the explorer hides it, so the hand-off is seamless. */
export function SolarLoadingScreen() {
  const t = useTranslations('solarSystem.loading');
  useEffect(() => {
    document.body.setAttribute('data-solar-immersive', '1');
    return () => document.body.removeAttribute('data-solar-immersive');
  }, []);
  return (
    <div className="solar-system solar-system--immersive solar-system--loading" aria-busy="true">
      <CosmicLoader label={t('title')} detail={t('detail')} />
    </div>
  );
}
