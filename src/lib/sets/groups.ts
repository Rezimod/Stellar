/** Set 001 in the order a night is observed: the Moon, the planets, the stars, then the deep sky. */
export const SET_GROUPS: Array<{ key: string; title: string; short: string; cover: string; types: string[] }> = [
  { key: 'moon', title: 'The Moon', short: 'Moon', cover: 'TYCHO', types: ['lunar crater', 'lunar landing site'] },
  { key: 'planets', title: 'Planets and their worlds', short: 'Planets', cover: 'SATURN', types: ['planet', 'atmospheric feature', 'moon of Jupiter', 'dwarf planet'] },
  { key: 'stars', title: 'Stars', short: 'Stars', cover: 'ALBIREO', types: ['double star', 'star'] },
  { key: 'deep', title: 'The deep sky', short: 'Deep sky', cover: 'M42', types: ['emission nebula', 'planetary nebula', 'globular cluster', 'spiral galaxy'] },
];

export const groupOf = (objectType: string) => SET_GROUPS.find((g) => g.types.includes(objectType))?.key ?? 'deep';
