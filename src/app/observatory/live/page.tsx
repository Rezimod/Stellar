import type { Metadata } from 'next';
import { getSunAltitude } from '@/lib/dark-window';
import { getNodesWithReadiness } from '@/lib/observatory/nodes';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import LiveBroadcast from '@/components/observatory/LiveBroadcast';

export const metadata: Metadata = {
  title: 'Live — Node 01 · Sidera',
  description:
    'Watch the sky live through Node 01 — a real telescope on a rooftop in Tbilisi, Georgia. No booking required.',
};

// Readiness and sun position change on the scale of minutes, not requests.
export const revalidate = 60;

export default async function LivePage() {
  const now = new Date();
  const nodes = await getNodesWithReadiness(now);
  const node = nodes[0] ?? null;
  const sunAlt = getSunAltitude(DEFAULT_OBSERVER.lat, DEFAULT_OBSERVER.lon, now);

  return <LiveBroadcast node={node} sunAltInit={sunAlt} />;
}
