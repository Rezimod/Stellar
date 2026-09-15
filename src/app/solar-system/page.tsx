import type { Viewport } from 'next';
import SolarSystemPageClient from '@/components/solar-system/SolarSystemPageClient';
import './solar-system.css';

/** Explore Mode is flown with two thumbs: a second finger on the deck is a
 *  second key, never a pinch. Only this page gives up zooming. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#050812',
};

export default function SolarSystemPage() {
  return (
    <>
      <h1 className="sr-only">Solar System Guide — Explore the Planets, Moons and Sun</h1>
      <SolarSystemPageClient />
    </>
  );
}
