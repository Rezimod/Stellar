/** Set 001 in the order a night is observed — the Moon, the planets, the stars, the deep sky — and then fiction. */
export const SET_GROUPS: Array<{ key: string; title: string; short: string; cover: string; types: string[] }> = [
  { key: 'moon', title: 'The Moon', short: 'Moon', cover: 'MOON', types: ["Earth's moon", 'lunar landing site'] },
  { key: 'planets', title: 'Planets and comets', short: 'Planets', cover: 'SATURN', types: ['planet', 'dwarf planet', 'comet'] },
  { key: 'stars', title: 'Stars', short: 'Stars', cover: 'SIRIUS', types: ['star', 'red supergiant'] },
  { key: 'deep', title: 'The deep sky', short: 'Deep sky', cover: 'M42', types: ['nebula', 'star cluster', 'galaxy', 'black hole'] },
  { key: 'fiction', title: 'Fiction', short: 'Fiction', cover: 'UNIT-7', types: ['fictional world', 'fictional habitat', 'fictional robot', 'fictional artifact', 'fictional starship', 'fictional phenomenon'] },
];

export const groupOf = (objectType: string) => SET_GROUPS.find((g) => g.types.includes(objectType))?.key ?? 'deep';
