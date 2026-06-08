// Static content model for the Sky Tonight dashboard. Content is driven from
// here so the components stay presentational (per the spec's acceptance note).

export type IconKind =
  | 'moon'
  | 'jupiter'
  | 'saturn'
  | 'mars'
  | 'sun'
  | 'uranus'
  | 'neptune'
  | 'andromeda'
  | 'pleiades'
  | 'albireo'
  | 'sombrero'
  | 'ring';

export type Target = {
  id: string;
  name: string;
  icon: IconKind;
  type: string;
  magnitude: number;
  altitude: number; // degrees above horizon, 0–90
  setting?: boolean;
};

export type SkyObjectMark = {
  id: string;
  name: string;
  detail: string;
  icon: IconKind;
  glyph: string; // small unicode/ascii glyph used inside the sky map
  x: number; // % across the map
  y: number; // % down the map
  prime?: boolean;
  mission?: boolean;
};

export const location = {
  city: 'Tbilisi, GE',
  coords: '41.72°N · 44.78°E',
};

export const prime = {
  kicker: 'PRIME · TONIGHT',
  alt: 'ALT 28°',
  name: 'Saturn',
  tagline: 'Rings at their widest tilt',
  stats: [
    { label: 'MAG', value: '+0.6' },
    { label: 'ALT', value: '28.4°' },
    { label: 'AZ', value: '142°' },
  ],
  events: [
    { label: 'RISE', value: '18:04' },
    { label: 'TRANSIT', value: '23:41' },
    { label: 'SET', value: '05:18' },
  ],
  reward: '+100 ★',
};

export const targets: Target[] = [
  { id: 'saturn', name: 'Saturn', icon: 'saturn', type: 'Planet', magnitude: 0.6, altitude: 28 },
  { id: 'jupiter', name: 'Jupiter', icon: 'jupiter', type: 'Planet', magnitude: -2.1, altitude: 12 },
  { id: 'moon', name: 'Moon', icon: 'moon', type: 'Satellite', magnitude: -10.4, altitude: 41 },
  { id: 'andromeda', name: 'Andromeda', icon: 'andromeda', type: 'Galaxy · M31', magnitude: 3.4, altitude: 34 },
  { id: 'pleiades', name: 'Pleiades', icon: 'pleiades', type: 'Cluster · M45', magnitude: 1.6, altitude: 22 },
  { id: 'albireo', name: 'Albireo', icon: 'albireo', type: 'Double star', magnitude: 3.1, altitude: 58 },
  { id: 'ring', name: 'Ring Nebula', icon: 'ring', type: 'Nebula · M57', magnitude: 8.8, altitude: 47 },
  { id: 'mars', name: 'Mars', icon: 'mars', type: 'Planet', magnitude: 1.1, altitude: 6, setting: true },
  { id: 'sombrero', name: 'Sombrero', icon: 'sombrero', type: 'Galaxy · M104', magnitude: 8.0, altitude: 4, setting: true },
];

export const skyMarks: SkyObjectMark[] = [
  { id: 'saturn', name: 'SATURN', detail: 'ALT 28°', icon: 'saturn', glyph: '♄', x: 38, y: 58, prime: true },
  { id: 'jupiter', name: 'JUPITER', detail: 'RISING', icon: 'jupiter', glyph: '♃', x: 14, y: 74 },
  { id: 'moon', name: 'MOON', detail: '52%', icon: 'moon', glyph: '☾', x: 72, y: 30 },
  { id: 'andromeda', name: 'M31', detail: 'MISSION', icon: 'andromeda', glyph: '✦', x: 60, y: 22, mission: true },
  { id: 'pleiades', name: 'M45', detail: 'CLUSTER', icon: 'pleiades', glyph: '✷', x: 84, y: 56 },
  { id: 'albireo', name: 'ALBIREO', detail: 'DOUBLE', icon: 'albireo', glyph: '✶', x: 50, y: 40 },
];

export const observingWindow = {
  kicker: '● OBSERVING WINDOW',
  status: 'Open · 6h 42m',
  range: '19:42 → 04:18',
  verdict: ['A ', 'fair night', ', with patience.'] as const,
};

export const conditions = {
  cells: [
    { label: 'Clear', value: '3%', unit: 'cloud', tone: 'green' as const },
    { label: 'Moon', value: '52%', unit: 'illum', tone: 'amber' as const },
    { label: 'Seeing', value: '4', unit: '/ 5', tone: 'ink' as const },
    { label: 'Transparency', value: '3', unit: '/ 5', tone: 'ink' as const },
  ],
  bortle: { lit: 6, total: 9 },
};

export const quiz = {
  kicker: '● SKY QUIZ · DAILY',
  title: 'Rings of Saturn',
  question: 'How many of Saturn’s rings can you resolve in an 8-inch scope?',
  meta: '5 questions · ~3 min · Best —',
  reward: '+25 ★',
};

export const astra = {
  kicker: '● ASTRA · AI ASTRONOMER',
  tip: 'Saturn is your best bet tonight — catch it near transit around 23:41 for the steadiest view.',
  placeholder: 'What’s worth a look tonight?',
};

export const streak = {
  count: '6 nights · +150 ★',
  days: [
    { label: 'Sun', state: 'lit' as const },
    { label: 'Mon', state: 'lit' as const },
    { label: 'Tue', state: 'lit' as const },
    { label: 'Wed', state: 'lit' as const },
    { label: 'Thu', state: 'lit' as const },
    { label: 'Fri', state: 'lit' as const },
    { label: 'Sat', state: 'today' as const },
  ],
};

// 24h scrubber ticks — night band roughly 19:00 → 05:00.
export const scrubber = {
  now: 15.23, // 03:14 PM as decimal hours
  nightStart: 19.7,
  nightEnd: 28.3, // 04:18 next day, wrapped past 24
  marks: ['18', '21', '00', '03', '06'],
};
