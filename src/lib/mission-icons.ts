import type { ComponentType } from 'react';
import type { CelestialIconProps } from '@/components/icons/CelestialIcons';

// Dynamic imports handled by consumers — this file exports the map and lookup function.
// Components are imported directly to avoid circular deps in icon files.

export type CelestialIconComponent = ComponentType<CelestialIconProps>;

// Mapping keyed by mission name (from constants.ts)
// Populated at runtime via getMissionIcon — see below.

const MISSION_ICON_IDS: Record<string, string> = {
  "Tonight's Sky":     'night',
  'The Moon':          'moon',
  'Jupiter':           'jupiter',
  'Saturn':            'saturn',
  'Orion Nebula':      'orion',
  'Pleiades (M45)':    'pleiades',
  'Andromeda Galaxy':  'andromeda',
  'Crab Nebula':       'crab',
};

// Also expose an id-based map for components that know the mission id
export const MISSION_ICON_IDS_BY_ID: Record<string, string> = {
  'free-observation': 'night',
  'moon':             'moon',
  'jupiter':          'jupiter',
  'saturn':           'saturn',
  'orion':            'orion',
  'pleiades':         'pleiades',
  'andromeda':        'andromeda',
  'crab':             'crab',
};

export function getMissionIconKey(missionName: string): string {
  return MISSION_ICON_IDS[missionName] ?? 'telescope';
}

export function getMissionIconKeyById(missionId: string): string {
  return MISSION_ICON_IDS_BY_ID[missionId] ?? 'telescope';
}

const MISSION_IMAGES: Record<string, string> = {
  'demo':             '/images/planets/saturn.jpg',
  'free-observation': '/images/planets/earth.jpg',
  'moon':             '/images/planets/moon.jpg',
  'jupiter':          '/images/planets/jupiter.jpg',
  'quick-jupiter':    '/images/planets/jupiter.jpg',
  'saturn':           '/images/planets/saturn.jpg',
  'quick-saturn':     '/images/planets/saturn.jpg',
  'orion':            '/images/dso/m42.jpg',
  'pleiades':         '/images/dso/m45.jpg',
  'andromeda':        '/images/dso/m31.jpg',
  'crab':             '/images/dso/m1.jpg',
};

export function getMissionImage(id: string): string {
  return MISSION_IMAGES[id] ?? '/images/planets/earth.jpg';
}

// Glow color per mission for hover effects
export const MISSION_GLOW: Record<string, string> = {
  'moon':             'rgba(232,224,208,0.1)',
  'jupiter':          'rgba(224,174,111,0.1)',
  'saturn':           'rgba(234,214,184,0.1)',
  'orion':            'rgba(255,107,157,0.1)',
  'pleiades':         'rgba(147,197,253,0.1)',
  'andromeda':        'rgba(255,248,231,0.1)',
  'crab':             'rgba(239,68,68,0.1)',
  'free-observation': 'rgba(56,240,255,0.1)',
};
