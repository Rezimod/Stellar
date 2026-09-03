/**
 * The node registry.
 *
 * Config for now, a table later: until a second operator exists there is
 * nothing to administer, and a `observatory_node` table with one hardcoded row
 * is a migration pretending to be a product. `getNodes()` is the only read
 * path, so moving it to the database is a one-function change.
 */

import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { SimNodeAdapter, type ObservatoryAdapter } from './adapter';
import type { NodeWithReadiness, ObservatoryNode } from './types';

export const NODES: ObservatoryNode[] = [
  {
    id: 'tbilisi-01',
    name: 'Tbilisi One',
    site: 'Tbilisi, Georgia',
    countryCode: 'GE',
    lat: DEFAULT_OBSERVER.lat,
    lon: DEFAULT_OBSERVER.lon,
    timezone: 'Asia/Tbilisi',
    bortle: 8,
    tier: 'first_party',
    status: 'commissioning',
    instrument: {
      optics: 'Celestron NexStar 6SE',
      apertureMm: 150,
      focalLengthMm: 1500,
      mount: 'Single-fork altazimuth, GoTo',
      camera: 'ZWO ASI585MC',
      // 3856 x 2180 at 2.9 um.
      sensorWidthMm: 11.18,
      sensorHeightMm: 6.32,
      pixelSizeUm: 2.9,
      suitedTo: ['Moon', 'Planets', 'Bright deep sky'],
    },
    priceGel: 40,
    sessionMinutes: 20,
    // A roof in a residential district: the operator takes work from dusk
    // until two, not through to dawn.
    availability: { fromHourLocal: 20, toHourLocal: 2 },
  },
];

const adapters: Record<ObservatoryNode['tier'], ObservatoryAdapter> = {
  first_party: new SimNodeAdapter(),
  kitted: new SimNodeAdapter(),
  byo: new SimNodeAdapter(),
};

export function getNode(id: string): ObservatoryNode | null {
  return NODES.find((n) => n.id === id) ?? null;
}

/** Every node the public can see, with live readiness resolved in parallel. */
export async function getNodesWithReadiness(now = new Date()): Promise<NodeWithReadiness[]> {
  const visible = NODES.filter((n) => n.status !== 'retired');

  return Promise.all(
    visible.map(async (node) => ({
      ...node,
      readiness: await adapters[node.tier].getReadiness(node, now),
    })),
  );
}
