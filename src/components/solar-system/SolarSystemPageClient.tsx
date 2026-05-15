'use client';

import dynamic from 'next/dynamic';

const SolarSystemExplorer = dynamic(() => import('./SolarSystemExplorer'), {
  ssr: false,
  loading: () => (
    <div
      className="solar-system solar-system--immersive solar-system--loading"
      aria-busy="true"
      aria-label="Loading solar system"
    />
  ),
});

export default function SolarSystemPageClient() {
  return <SolarSystemExplorer />;
}
