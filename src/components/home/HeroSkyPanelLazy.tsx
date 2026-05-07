'use client';

import dynamic from 'next/dynamic';

const HeroSkyPanel = dynamic(() => import('./HeroSkyPanel'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden
      className="w-full max-w-[520px] md:max-w-[600px] lg:max-w-[680px] aspect-square mx-auto"
      style={{
        background:
          'radial-gradient(circle at 50% 50%, rgba(255,179,71,0.06) 0%, rgba(176,127,232,0.04) 35%, transparent 70%)',
      }}
    />
  ),
});

export default HeroSkyPanel;
