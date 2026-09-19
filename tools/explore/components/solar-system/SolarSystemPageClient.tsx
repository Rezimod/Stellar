'use client';

import dynamic from 'next/dynamic';
import { SolarLoadingScreen } from './SolarLoadingScreen';

const SolarSystemExplorer = dynamic(() => import('./SolarSystemExplorer'), {
  ssr: false,
  loading: () => <SolarLoadingScreen />,
});

export default function SolarSystemPageClient() {
  return <SolarSystemExplorer />;
}
