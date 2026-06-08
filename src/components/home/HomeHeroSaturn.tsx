'use client';

import dynamic from 'next/dynamic';

const HeroSaturn = dynamic(() => import('./HeroSaturn'), {
  ssr: false,
  loading: () => (
    <section
      className="relative w-full overflow-hidden"
      style={{
        minHeight: '100dvh',
        height: '100dvh',
        background: 'linear-gradient(180deg, #04081A 0%, #08122A 48%, #050A1C 100%)',
      }}
      aria-hidden
    />
  ),
});

export default function HomeHeroSaturn() {
  return <HeroSaturn />;
}
