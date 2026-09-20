// What a surface has to have on disk before it can be built. The arrival
// flies for eleven seconds, and these come down during them, so the loading
// screen after it is a moment rather than a wait. Each file names the
// checklist line it sits behind, and how the scene itself acquires it —
// the key has to match, or the prefetch and the scene miss each other.

import type { PrefetchItem } from '@/game/models';

const MOON: PrefetchItem[] = [
  { url: '/explore/models/base-kit.glb', keepNodes: true, group: 'habitat' },
  { url: '/explore/models/crate.glb', keepNodes: false, group: 'habitat' },
  { url: '/explore/models/lander.glb', keepNodes: true, group: 'vehicle' },
  { url: '/explore/models/rover.glb', keepNodes: true, group: 'vehicle' },
  { url: '/explore/models/cosmonaut.glb', keepNodes: true, group: 'crew' },
];

/** The checklist, in the order the arrival reads it out. */
export const SURFACE_GROUPS = ['habitat', 'vehicle', 'crew'] as const;

/** Mars, Proxima b and Tbilisi are built out of code: they have no files to wait for. */
export const SURFACE_ASSETS: Record<string, PrefetchItem[]> = { moon: MOON };

export const assetsFor = (site: string): PrefetchItem[] => SURFACE_ASSETS[site] ?? [];
