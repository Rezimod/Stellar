/**
 * Fixed deep-sky objects and bright stars with J2000 coordinates, so the agent
 * can locate any of them live (alt/az computed on-device by astronomy-engine).
 * Precession/proper-motion drift since J2000 is < ~0.4° — negligible for a
 * "where is it / is it up" answer. Covers the Messier objects in the RAG corpus
 * plus popular naked-eye stars.
 */

export type Dso = {
  id: string;
  name: string;
  aliases: string[]; // lowercase match terms (besides the Messier id)
  ra: number; // J2000 right ascension, hours
  dec: number; // J2000 declination, degrees
  mag: number;
  type: 'galaxy' | 'nebula' | 'cluster' | 'double' | 'star';
  constellation: string;
};

export const DSO_CATALOG: Dso[] = [
  // Messier — deep sky
  { id: 'm1', name: 'Crab Nebula', aliases: ['crab nebula', 'crab'], ra: 5.575, dec: 22.017, mag: 8.4, type: 'nebula', constellation: 'Taurus' },
  { id: 'm3', name: 'M3', aliases: [], ra: 13.703, dec: 28.377, mag: 6.2, type: 'cluster', constellation: 'Canes Venatici' },
  { id: 'm5', name: 'M5', aliases: [], ra: 15.309, dec: 2.081, mag: 5.6, type: 'cluster', constellation: 'Serpens' },
  { id: 'm8', name: 'Lagoon Nebula', aliases: ['lagoon nebula', 'lagoon'], ra: 18.06, dec: -24.383, mag: 6.0, type: 'nebula', constellation: 'Sagittarius' },
  { id: 'm11', name: 'Wild Duck Cluster', aliases: ['wild duck'], ra: 18.851, dec: -6.27, mag: 6.3, type: 'cluster', constellation: 'Scutum' },
  { id: 'm13', name: 'Hercules Globular Cluster', aliases: ['hercules cluster', 'great hercules cluster', 'hercules globular'], ra: 16.695, dec: 36.46, mag: 5.8, type: 'cluster', constellation: 'Hercules' },
  { id: 'm16', name: 'Eagle Nebula', aliases: ['eagle nebula', 'eagle'], ra: 18.313, dec: -13.792, mag: 6.0, type: 'nebula', constellation: 'Serpens' },
  { id: 'm17', name: 'Omega Nebula', aliases: ['omega nebula', 'swan nebula'], ra: 18.346, dec: -16.177, mag: 6.0, type: 'nebula', constellation: 'Sagittarius' },
  { id: 'm20', name: 'Trifid Nebula', aliases: ['trifid nebula', 'trifid'], ra: 18.038, dec: -23.03, mag: 6.3, type: 'nebula', constellation: 'Sagittarius' },
  { id: 'm22', name: 'M22', aliases: [], ra: 18.607, dec: -23.904, mag: 5.1, type: 'cluster', constellation: 'Sagittarius' },
  { id: 'm27', name: 'Dumbbell Nebula', aliases: ['dumbbell nebula', 'dumbbell'], ra: 19.994, dec: 22.721, mag: 7.4, type: 'nebula', constellation: 'Vulpecula' },
  { id: 'm31', name: 'Andromeda Galaxy', aliases: ['andromeda galaxy', 'andromeda'], ra: 0.712, dec: 41.269, mag: 3.4, type: 'galaxy', constellation: 'Andromeda' },
  { id: 'm33', name: 'Triangulum Galaxy', aliases: ['triangulum galaxy', 'triangulum', 'pinwheel galaxy'], ra: 1.564, dec: 30.66, mag: 5.7, type: 'galaxy', constellation: 'Triangulum' },
  { id: 'm35', name: 'M35', aliases: [], ra: 6.151, dec: 24.336, mag: 5.3, type: 'cluster', constellation: 'Gemini' },
  { id: 'm42', name: 'Orion Nebula', aliases: ['orion nebula', 'great orion nebula'], ra: 5.588, dec: -5.391, mag: 4.0, type: 'nebula', constellation: 'Orion' },
  { id: 'm44', name: 'Beehive Cluster', aliases: ['beehive', 'praesepe'], ra: 8.67, dec: 19.667, mag: 3.7, type: 'cluster', constellation: 'Cancer' },
  { id: 'm45', name: 'Pleiades', aliases: ['pleiades', 'seven sisters', 'subaru'], ra: 3.79, dec: 24.117, mag: 1.6, type: 'cluster', constellation: 'Taurus' },
  { id: 'm51', name: 'Whirlpool Galaxy', aliases: ['whirlpool galaxy', 'whirlpool'], ra: 13.498, dec: 47.195, mag: 8.4, type: 'galaxy', constellation: 'Canes Venatici' },
  { id: 'm57', name: 'Ring Nebula', aliases: ['ring nebula', 'ring'], ra: 18.886, dec: 33.029, mag: 8.8, type: 'nebula', constellation: 'Lyra' },
  { id: 'm63', name: 'Sunflower Galaxy', aliases: ['sunflower galaxy'], ra: 13.264, dec: 42.029, mag: 8.6, type: 'galaxy', constellation: 'Canes Venatici' },
  { id: 'm64', name: 'Black Eye Galaxy', aliases: ['black eye galaxy', 'black eye'], ra: 12.945, dec: 21.683, mag: 8.5, type: 'galaxy', constellation: 'Coma Berenices' },
  { id: 'm67', name: 'M67', aliases: [], ra: 8.855, dec: 11.813, mag: 6.1, type: 'cluster', constellation: 'Cancer' },
  { id: 'm81', name: "Bode's Galaxy", aliases: ['bodes galaxy', "bode's galaxy"], ra: 9.926, dec: 69.065, mag: 6.9, type: 'galaxy', constellation: 'Ursa Major' },
  { id: 'm82', name: 'Cigar Galaxy', aliases: ['cigar galaxy'], ra: 9.931, dec: 69.68, mag: 8.4, type: 'galaxy', constellation: 'Ursa Major' },
  { id: 'm101', name: 'Pinwheel Galaxy', aliases: ['pinwheel'], ra: 14.053, dec: 54.349, mag: 7.9, type: 'galaxy', constellation: 'Ursa Major' },
  { id: 'm104', name: 'Sombrero Galaxy', aliases: ['sombrero galaxy', 'sombrero'], ra: 12.667, dec: -11.623, mag: 8.0, type: 'galaxy', constellation: 'Virgo' },
  // Bright stars
  { id: 'sirius', name: 'Sirius', aliases: ['sirius', 'dog star'], ra: 6.752, dec: -16.716, mag: -1.46, type: 'star', constellation: 'Canis Major' },
  { id: 'canopus', name: 'Canopus', aliases: ['canopus'], ra: 6.399, dec: -52.696, mag: -0.74, type: 'star', constellation: 'Carina' },
  { id: 'arcturus', name: 'Arcturus', aliases: ['arcturus'], ra: 14.261, dec: 19.182, mag: -0.05, type: 'star', constellation: 'Boötes' },
  { id: 'vega', name: 'Vega', aliases: ['vega'], ra: 18.616, dec: 38.784, mag: 0.03, type: 'star', constellation: 'Lyra' },
  { id: 'capella', name: 'Capella', aliases: ['capella'], ra: 5.278, dec: 45.998, mag: 0.08, type: 'star', constellation: 'Auriga' },
  { id: 'rigel', name: 'Rigel', aliases: ['rigel'], ra: 5.242, dec: -8.202, mag: 0.13, type: 'star', constellation: 'Orion' },
  { id: 'betelgeuse', name: 'Betelgeuse', aliases: ['betelgeuse'], ra: 5.919, dec: 7.407, mag: 0.5, type: 'star', constellation: 'Orion' },
  { id: 'altair', name: 'Altair', aliases: ['altair'], ra: 19.846, dec: 8.868, mag: 0.76, type: 'star', constellation: 'Aquila' },
  { id: 'aldebaran', name: 'Aldebaran', aliases: ['aldebaran'], ra: 4.599, dec: 16.509, mag: 0.85, type: 'star', constellation: 'Taurus' },
  { id: 'antares', name: 'Antares', aliases: ['antares'], ra: 16.49, dec: -26.432, mag: 1.0, type: 'star', constellation: 'Scorpius' },
  { id: 'spica', name: 'Spica', aliases: ['spica'], ra: 13.42, dec: -11.161, mag: 1.04, type: 'star', constellation: 'Virgo' },
  { id: 'pollux', name: 'Pollux', aliases: ['pollux'], ra: 7.755, dec: 28.026, mag: 1.14, type: 'star', constellation: 'Gemini' },
  { id: 'deneb', name: 'Deneb', aliases: ['deneb'], ra: 20.69, dec: 45.28, mag: 1.25, type: 'star', constellation: 'Cygnus' },
  { id: 'polaris', name: 'Polaris', aliases: ['polaris', 'north star', 'pole star'], ra: 2.53, dec: 89.264, mag: 1.98, type: 'star', constellation: 'Ursa Minor' },
  { id: 'albireo', name: 'Albireo', aliases: ['albireo'], ra: 19.512, dec: 27.96, mag: 3.1, type: 'double', constellation: 'Cygnus' },
  { id: 'mizar', name: 'Mizar', aliases: ['mizar', 'mizar and alcor'], ra: 13.399, dec: 54.925, mag: 2.27, type: 'double', constellation: 'Ursa Major' },
];

const BY_ID = new Map(DSO_CATALOG.map((d) => [d.id, d]));

/** Find a DSO/star referenced in free text: a Messier number (M31, M 31) or a name/alias. */
export function findDso(text: string): Dso | null {
  const lower = text.toLowerCase();

  // Messier id, e.g. "m31", "m 31", "messier 31"
  const mm = lower.match(/\b(?:messier\s*|m\s*)(\d{1,3})\b/);
  if (mm) {
    const hit = BY_ID.get(`m${mm[1]}`);
    if (hit) return hit;
  }

  // Name / alias — match the longest alias to avoid 'orion' beating 'orion nebula'.
  let best: { d: Dso; len: number } | null = null;
  for (const d of DSO_CATALOG) {
    for (const a of [d.name.toLowerCase(), ...d.aliases]) {
      if (lower.includes(a) && (!best || a.length > best.len)) best = { d, len: a.length };
    }
  }
  return best?.d ?? null;
}
