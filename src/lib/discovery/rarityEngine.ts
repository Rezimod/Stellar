import { TIER_BY_ID, type TierId } from '@/lib/discovery/tiers';

/**
 * Deterministic rarity + object assignment for Cosmic Discovery Passes.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠ SECURITY: this is NOT safe to use as the live reveal in its current form.
 *
 * The draw is `hash(walletAddress, passNumber, salt)`. The wallet address is
 * public, the pass number is public, and REVEAL_SALT is a constant in a public
 * repository — so anyone can compute any pass's outcome the moment this ships,
 * long before reveal day. Worse, because the buyer chooses their own wallet,
 * they can generate addresses until one hashes to LEGENDARY for the pass they
 * intend to buy. At 0.1% odds that is ~1,000 keypairs, which is seconds of work.
 *
 * The fix is a commit-and-reveal, and this module is shaped for it: `salt` is a
 * parameter, not a constant. Before the sale, publish `sha256(secretSalt)` and
 * keep `secretSalt` offline. On reveal day, publish `secretSalt` and pass it in
 * here. Everyone can then verify every draw, and nobody could predict one.
 * Swapping REVEAL_SALT for the revealed secret is the only change needed.
 * ─────────────────────────────────────────────────────────────────────────
 */

export type ObjectType =
  | 'STAR'
  | 'NEBULA'
  | 'PLANET'
  | 'EXOPLANET'
  | 'BLACK_HOLE'
  | 'PULSAR'
  | 'SUPERNOVA';

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export type CelestialObject = {
  id: string;
  name: string;
  type: ObjectType;
  rarity: Rarity;
  rarityColor: string;
  tokens: number;
  physicalReward: string | null;
  description: string;
  /** J2000 right ascension / declination. */
  coordinates: { ra: string; dec: string };
  /** Drives generateVisualGradient — unique per (wallet, pass). */
  visualSeed: number;
};

/** Placeholder salt. Replace with the revealed secret on reveal day — see the
 *  security note above. */
export const REVEAL_SALT = 'ORIONIDS_2026';

const RARITY_TO_TIER: Record<Rarity, TierId> = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

/* ── Hashing ──────────────────────────────────────────────────────────────
   xmur3: a small, well-mixed 32-bit string hash. Chosen over sha256 because
   it is synchronous in both the browser and Node — WebCrypto's digest is
   async, which would push a Promise through every call site for no benefit at
   this security level (the salt, not the hash, is what protects the draw). */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Buckets ──────────────────────────────────────────────────────────────
   Ten thousand slots, one per pass, matching the odds in tiers.ts exactly:
     0    – 8999  COMMON     (9,000 = 90%)
     9000 – 9699  UNCOMMON   (  700 =  7%)
     9700 – 9949  RARE       (  250 =  2.5%)
     9950 – 9989  EPIC       (   40 =  0.4%)
     9990 – 9999  LEGENDARY  (   10 =  0.1%)
   rarity-engine.test.ts asserts these stay in step with TIERS. */
export const ROLL_SPACE = 10_000;

export function rarityForRoll(roll: number): Rarity {
  if (roll < 9_000) return 'COMMON';
  if (roll < 9_700) return 'UNCOMMON';
  if (roll < 9_950) return 'RARE';
  if (roll < 9_990) return 'EPIC';
  return 'LEGENDARY';
}

/** The 0–9999 draw for a given pass. Exported so the reveal can be audited. */
export function rollFor(
  walletAddress: string,
  passNumber: number,
  salt: string = REVEAL_SALT,
): number {
  const next = xmur3(`${walletAddress}:${passNumber}:${salt}`);
  // Scaling the full 32-bit range avoids the modulo bias of `% 10000`.
  return Math.floor((next() / 4294967296) * ROLL_SPACE);
}

/* ── Object pools ─────────────────────────────────────────────────────────
   Real objects, J2000 coordinates. Compact tuples rather than object literals
   purely so 110 entries stay readable.

   Note on `type`: the union has no GALAXY or CLUSTER member, so galaxies map
   to NEBULA (M31 was "the Andromeda Nebula" for three centuries) and star
   clusters map to STAR. Worth adding both types if this pool grows. */
type Entry = [id: string, name: string, type: ObjectType, ra: string, dec: string, description: string];

const COMMON_POOL: Entry[] = [
  ['sirius', 'Sirius', 'STAR', '06h 45m 09s', '-16° 42′ 58″', 'The brightest star in the night sky, and one of the nearest at 8.6 light years.'],
  ['canopus', 'Canopus', 'STAR', '06h 23m 57s', '-52° 41′ 44″', 'Second-brightest star in the sky, long used as a navigation beacon by spacecraft.'],
  ['alpha-centauri', 'Alpha Centauri', 'STAR', '14h 39m 36s', '-60° 50′ 02″', 'The closest star system to the Sun — three stars bound together, 4.4 light years away.'],
  ['arcturus', 'Arcturus', 'STAR', '14h 15m 40s', '+19° 10′ 56″', 'An orange giant racing perpendicular to the plane of the galaxy.'],
  ['vega', 'Vega', 'STAR', '18h 36m 56s', '+38° 47′ 01″', 'The zero point of the brightness scale, and the pole star of 12,000 BC.'],
  ['capella', 'Capella', 'STAR', '05h 16m 41s', '+45° 59′ 53″', 'Appears as one star but is four — two giant pairs orbiting a common centre.'],
  ['rigel', 'Rigel', 'STAR', '05h 14m 32s', '-08° 12′ 06″', 'A blue supergiant in Orion, radiating over 100,000 times the light of the Sun.'],
  ['procyon', 'Procyon', 'STAR', '07h 39m 18s', '+05° 13′ 30″', 'The "before the dog" star, rising just ahead of Sirius. Eleven light years away.'],
  ['betelgeuse', 'Betelgeuse', 'STAR', '05h 55m 10s', '+07° 24′ 25″', 'A red supergiant so large it would swallow Jupiter. It will go supernova.'],
  ['achernar', 'Achernar', 'STAR', '01h 37m 43s', '-57° 14′ 12″', 'Spinning so fast it is flattened into an oblate spheroid.'],
  ['hadar', 'Hadar', 'STAR', '14h 03m 49s', '-60° 22′ 23″', 'Beta Centauri — the fainter of the two Southern Pointers to the Cross.'],
  ['altair', 'Altair', 'STAR', '19h 50m 47s', '+08° 52′ 06″', 'Completes a rotation in nine hours, giving it a visibly squashed shape.'],
  ['aldebaran', 'Aldebaran', 'STAR', '04h 35m 55s', '+16° 30′ 33″', 'The red eye of Taurus, seen against but not part of the Hyades cluster.'],
  ['antares', 'Antares', 'STAR', '16h 29m 24s', '-26° 25′ 55″', '"Rival of Mars" — a red supergiant at the heart of Scorpius.'],
  ['spica', 'Spica', 'STAR', '13h 25m 12s', '-11° 09′ 41″', 'Two stars so close they orbit each other in four days and are pulled into eggs.'],
  ['pollux', 'Pollux', 'STAR', '07h 45m 19s', '+28° 01′ 34″', 'The nearest giant star to the Sun, with a confirmed orbiting planet.'],
  ['fomalhaut', 'Fomalhaut', 'STAR', '22h 57m 39s', '-29° 37′ 20″', 'Ringed by a vast debris disc — one of the first ever directly imaged.'],
  ['deneb', 'Deneb', 'STAR', '20h 41m 26s', '+45° 16′ 49″', 'One of the most luminous stars known, blazing from over 1,500 light years away.'],
  ['regulus', 'Regulus', 'STAR', '10h 08m 22s', '+11° 58′ 02″', 'The "little king", sitting almost exactly on the ecliptic.'],
  ['polaris', 'Polaris', 'STAR', '02h 31m 49s', '+89° 15′ 51″', 'The North Star — a Cepheid variable that sits within one degree of the pole.'],
  ['castor', 'Castor', 'STAR', '07h 34m 36s', '+31° 53′ 18″', 'A six-star system masquerading as a single point of light.'],
  ['bellatrix', 'Bellatrix', 'STAR', '05h 25m 08s', '+06° 20′ 59″', 'The "female warrior" marking the left shoulder of Orion.'],
];

const UNCOMMON_POOL: Entry[] = [
  ['m42-orion', 'The Orion Nebula', 'NEBULA', '05h 35m 17s', '-05° 23′ 28″', 'A stellar nursery in Orion’s sword, forming more than a thousand young stars.'],
  ['m45-pleiades', 'The Pleiades', 'STAR', '03h 47m 24s', '+24° 07′ 00″', 'The Seven Sisters — hot blue stars drifting through a dust cloud they light up.'],
  ['m31-andromeda', 'The Andromeda Galaxy', 'NEBULA', '00h 42m 44s', '+41° 16′ 09″', 'Our nearest large galactic neighbour, on a collision course with the Milky Way.'],
  ['ngc5139-omega-cen', 'Omega Centauri', 'STAR', '13h 26m 46s', '-47° 28′ 37″', 'The largest globular cluster in the galaxy — possibly a stripped dwarf galaxy core.'],
  ['m13-hercules', 'The Hercules Cluster', 'STAR', '16h 41m 41s', '+36° 27′ 37″', 'Target of the 1974 Arecibo message, a third of a million stars bound by gravity.'],
  ['m8-lagoon', 'The Lagoon Nebula', 'NEBULA', '18h 03m 37s', '-24° 23′ 12″', 'A vast glowing cloud in Sagittarius, split by a dark dust lane.'],
  ['m20-trifid', 'The Trifid Nebula', 'NEBULA', '18h 02m 23s', '-23° 01′ 48″', 'Emission, reflection and dark nebula in one object — hence the three lobes.'],
  ['m57-ring', 'The Ring Nebula', 'NEBULA', '18h 53m 35s', '+33° 01′ 45″', 'A dying star’s shed atmosphere, seen face-on as a perfect smoke ring.'],
  ['m27-dumbbell', 'The Dumbbell Nebula', 'NEBULA', '19h 59m 36s', '+22° 43′ 16″', 'The first planetary nebula ever discovered, found by Messier in 1764.'],
  ['m51-whirlpool', 'The Whirlpool Galaxy', 'NEBULA', '13h 29m 53s', '+47° 11′ 43″', 'The first galaxy recognised as a spiral, caught mid-interaction with a companion.'],
  ['m81-bode', 'Bode’s Galaxy', 'NEBULA', '09h 55m 33s', '+69° 03′ 55″', 'A grand-design spiral with a supermassive black hole 15 times the Milky Way’s.'],
  ['m104-sombrero', 'The Sombrero Galaxy', 'NEBULA', '12h 39m 59s', '-11° 37′ 23″', 'A brilliant bulge wrapped in a dust lane, seen almost exactly edge-on.'],
  ['ngc7293-helix', 'The Helix Nebula', 'NEBULA', '22h 29m 39s', '-20° 50′ 14″', 'A sun-like star casting off its outer layers. Often called the Eye of God.'],
  ['m17-omega', 'The Omega Nebula', 'NEBULA', '18h 20m 26s', '-16° 10′ 36″', 'One of the brightest star-forming regions in the galaxy.'],
  ['ngc253-sculptor', 'The Sculptor Galaxy', 'NEBULA', '00h 47m 33s', '-25° 17′ 18″', 'A starburst galaxy forming new suns far faster than our own.'],
  ['m33-triangulum', 'The Triangulum Galaxy', 'NEBULA', '01h 33m 51s', '+30° 39′ 37″', 'Third-largest in the Local Group, and the most distant object visible unaided.'],
  ['ngc869-double', 'The Double Cluster', 'STAR', '02h 19m 00s', '+57° 08′ 00″', 'Two open clusters side by side in Perseus, both only ~13 million years old.'],
  ['m44-beehive', 'The Beehive Cluster', 'STAR', '08h 40m 24s', '+19° 40′ 00″', 'Known since antiquity as a hazy patch; Galileo resolved it into 40 stars.'],
  ['ngc3372-carina', 'The Carina Nebula', 'NEBULA', '10h 45m 08s', '-59° 52′ 04″', 'Four times larger than Orion and home to some of the galaxy’s heaviest stars.'],
  ['m78', 'Messier 78', 'NEBULA', '05h 46m 46s', '+00° 04′ 45″', 'The brightest reflection nebula in the sky — dust lit by two hot blue stars.'],
  ['ngc6960-veil', 'The Veil Nebula', 'NEBULA', '20h 45m 38s', '+30° 43′ 00″', 'Filaments of a supernova that exploded over the Earth some 10,000 years ago.'],
  ['m97-owl', 'The Owl Nebula', 'NEBULA', '11h 14m 48s', '+55° 01′ 09″', 'Two dark hollows in the shell give this planetary nebula a pair of eyes.'],
];

const RARE_POOL: Entry[] = [
  ['kepler-452b', 'Kepler-452b', 'EXOPLANET', '19h 44m 01s', '+44° 16′ 39″', 'Earth’s "older cousin" — a similar-sized world in a similar orbit around a similar star.'],
  ['hd209458b', 'HD 209458 b', 'EXOPLANET', '22h 03m 11s', '+18° 53′ 04″', 'The first exoplanet seen to transit its star, and the first with a detected atmosphere.'],
  ['55-cancri-e', '55 Cancri e', 'EXOPLANET', '08h 52m 36s', '+28° 19′ 51″', 'A super-Earth so hot its surface may be a permanent ocean of lava.'],
  ['gj1214b', 'GJ 1214 b', 'EXOPLANET', '17h 15m 19s', '+04° 57′ 50″', 'A water world candidate — possibly an ocean planet under a thick steam atmosphere.'],
  ['trappist-1e', 'TRAPPIST-1e', 'EXOPLANET', '23h 06m 29s', '-05° 02′ 29″', 'One of seven Earth-sized planets around a single dim star, and the likeliest habitable one.'],
  ['proxima-b', 'Proxima Centauri b', 'EXOPLANET', '14h 29m 43s', '-62° 40′ 46″', 'The nearest exoplanet to Earth, orbiting our closest stellar neighbour.'],
  ['hd189733b', 'HD 189733 b', 'EXOPLANET', '20h 00m 44s', '+22° 42′ 39″', 'Deep blue, with 7,000 km/h winds and a likely rain of molten glass.'],
  ['wasp-12b', 'WASP-12b', 'EXOPLANET', '06h 30m 33s', '+29° 40′ 20″', 'Being devoured by its star, stretched into an egg and losing mass every second.'],
  ['kepler-186f', 'Kepler-186f', 'EXOPLANET', '19h 54m 36s', '+43° 57′ 18″', 'The first Earth-sized planet found in another star’s habitable zone.'],
  ['kepler-22b', 'Kepler-22b', 'EXOPLANET', '19h 16m 52s', '+47° 53′ 04″', 'The first habitable-zone planet Kepler confirmed, on a 290-day year.'],
  ['hd80606b', 'HD 80606 b', 'EXOPLANET', '09h 22m 37s', '+50° 36′ 13″', 'A wildly eccentric orbit swings it from freezing to 1,200°C in six hours.'],
  ['gliese-581g', 'Gliese 581g', 'EXOPLANET', '15h 19m 26s', '-07° 43′ 20″', 'A contested world — claimed, disputed, and still argued over two decades on.'],
  ['kelt-9b', 'KELT-9b', 'EXOPLANET', '20h 31m 26s', '+39° 56′ 20″', 'The hottest known planet, at 4,300°C — hotter than most stars.'],
  ['wasp-121b', 'WASP-121b', 'EXOPLANET', '07h 10m 24s', '-39° 05′ 51″', 'Its atmosphere glows, and heavy metals stream away into space.'],
  ['lhs1140b', 'LHS 1140 b', 'EXOPLANET', '00h 44m 59s', '-15° 16′ 18″', 'A dense rocky super-Earth, one of the best targets for atmospheric study.'],
  ['k2-18b', 'K2-18b', 'EXOPLANET', '11h 30m 14s', '+07° 35′ 18″', 'The first habitable-zone planet found with water vapour in its atmosphere.'],
  ['hr8799e', 'HR 8799 e', 'EXOPLANET', '23h 07m 29s', '+21° 08′ 03″', 'Part of the first multi-planet system ever directly photographed.'],
  ['beta-pic-b', 'Beta Pictoris b', 'EXOPLANET', '05h 47m 17s', '-51° 03′ 59″', 'A young giant still glowing from the heat of its own formation.'],
  ['51-peg-b', '51 Pegasi b', 'EXOPLANET', '22h 57m 28s', '+20° 46′ 08″', 'The first planet found around a sun-like star — the discovery that opened the field.'],
  ['toi-700d', 'TOI-700 d', 'EXOPLANET', '06h 28m 23s', '-65° 34′ 43″', 'TESS’s first Earth-sized habitable-zone find, 100 light years away.'],
  ['gj357d', 'GJ 357 d', 'EXOPLANET', '09h 36m 02s', '-21° 39′ 39″', 'A super-Earth receiving about as much energy as Mars does from the Sun.'],
  ['kepler-16b', 'Kepler-16b', 'EXOPLANET', '19h 16m 18s', '+51° 45′ 27″', 'A real Tatooine — a planet orbiting two stars, with two sunsets.'],
];

const EPIC_POOL: Entry[] = [
  ['sgr-a-star', 'Sagittarius A*', 'BLACK_HOLE', '17h 45m 40s', '-29° 00′ 28″', 'The supermassive black hole at the galactic centre. Everything you know orbits it.'],
  ['stephans-quintet', 'Stephan’s Quintet', 'NEBULA', '22h 35m 58s', '+33° 57′ 36″', 'Four galaxies locked in a slow collision, and one interloper in the foreground.'],
  ['pillars-of-creation', 'The Pillars of Creation', 'NEBULA', '18h 18m 48s', '-13° 49′ 00″', 'Towers of gas light years tall, being sculpted away by the stars they birthed.'],
  ['m1-crab', 'The Crab Nebula', 'SUPERNOVA', '05h 34m 32s', '+22° 00′ 52″', 'The wreckage of a star that Chinese astronomers watched explode in 1054.'],
  ['cygnus-x1', 'Cygnus X-1', 'BLACK_HOLE', '19h 58m 22s', '+35° 12′ 06″', 'The first object widely accepted as a black hole, and the subject of a famous bet.'],
  ['vela-pulsar', 'The Vela Pulsar', 'PULSAR', '08h 35m 21s', '-45° 10′ 35″', 'A city-sized neutron star spinning eleven times every second.'],
  ['sn1987a', 'SN 1987A', 'SUPERNOVA', '05h 35m 28s', '-69° 16′ 11″', 'The nearest supernova in four centuries, and the first detected by its neutrinos.'],
  ['m87-star', 'M87*', 'BLACK_HOLE', '12h 30m 49s', '+12° 23′ 28″', 'The first black hole ever photographed — six and a half billion solar masses.'],
  ['cas-a', 'Cassiopeia A', 'SUPERNOVA', '23h 23m 24s', '+58° 48′ 54″', 'The brightest radio source beyond the solar system, expanding since about 1680.'],
  ['tycho-sn', 'Tycho’s Supernova', 'SUPERNOVA', '00h 25m 18s', '+64° 09′ 00″', 'The 1572 star that proved the heavens were not immutable.'],
  ['kepler-sn', 'Kepler’s Supernova', 'SUPERNOVA', '17h 30m 42s', '-21° 29′ 00″', 'The last supernova seen with the naked eye inside our own galaxy, in 1604.'],
  ['geminga', 'Geminga', 'PULSAR', '06h 33m 54s', '+17° 46′ 13″', 'A gamma-ray pulsar that stayed unidentified for twenty years.'],
  ['crab-pulsar', 'The Crab Pulsar', 'PULSAR', '05h 34m 32s', '+22° 00′ 52″', 'The collapsed heart of the 1054 supernova, flashing 30 times a second.'],
  ['bullet-cluster', 'The Bullet Cluster', 'NEBULA', '06h 58m 38s', '-55° 57′ 00″', 'Two clusters that passed through each other, leaving dark matter behind as proof.'],
  ['hoags-object', 'Hoag’s Object', 'NEBULA', '15h 17m 14s', '+21° 35′ 08″', 'A perfect ring of blue stars around a golden core, with nothing between them.'],
  ['boomerang', 'The Boomerang Nebula', 'NEBULA', '12h 44m 46s', '-54° 31′ 13″', 'At one kelvin, the coldest known natural place in the universe.'],
  ['homunculus', 'The Homunculus Nebula', 'NEBULA', '10h 45m 04s', '-59° 41′ 04″', 'Twin lobes thrown off by Eta Carinae during its 1840s eruption.'],
  ['westerlund-1', 'Westerlund 1', 'STAR', '16h 47m 04s', '-45° 51′ 05″', 'The most massive young cluster known in the galaxy, hidden behind thick dust.'],
  ['ss433', 'SS 433', 'BLACK_HOLE', '19h 11m 50s', '+04° 58′ 58″', 'A microquasar firing corkscrew jets at a quarter of the speed of light.'],
  ['cygnus-a', 'Cygnus A', 'BLACK_HOLE', '19h 59m 28s', '+40° 44′ 02″', 'The brightest radio galaxy in the sky, with jets spanning half a million light years.'],
  ['abell-2744', 'Pandora’s Cluster', 'NEBULA', '00h 14m 21s', '-30° 23′ 50″', 'A pile-up of four galaxy clusters, used as a lens to see the early universe.'],
  ['gw170817', 'GW170817', 'SUPERNOVA', '13h 09m 48s', '-23° 23′ 02″', 'Two neutron stars merging — seen in gravitational waves and light at once.'],
];

const LEGENDARY_POOL: Entry[] = [
  ['ton-618', 'TON 618', 'BLACK_HOLE', '12h 28m 24s', '+31° 28′ 38″', 'Among the most massive black holes known — roughly 40 billion solar masses.'],
  ['psr-j0437', 'PSR J0437-4715', 'PULSAR', '04h 37m 16s', '-47° 15′ 09″', 'The nearest and brightest millisecond pulsar, and a clock rivalling atomic standards.'],
  ['r136a1', 'R136a1', 'STAR', '05h 38m 42s', '-69° 06′ 03″', 'The most massive star known, shining millions of times brighter than the Sun.'],
  ['eta-carinae', 'Eta Carinae', 'STAR', '10h 45m 04s', '-59° 41′ 04″', 'A hypernova waiting to happen. It briefly became the second-brightest star in 1843.'],
  ['ngc1277', 'NGC 1277', 'BLACK_HOLE', '03h 19m 51s', '+41° 34′ 25″', 'A "relic" galaxy that stopped forming stars 10 billion years ago.'],
  ['uy-scuti', 'UY Scuti', 'STAR', '18h 27m 36s', '-12° 27′ 59″', 'One of the largest stars ever measured — light takes hours to cross it.'],
  ['stephenson-2-18', 'Stephenson 2-18', 'STAR', '18h 39m 02s', '-06° 05′ 11″', 'A red supergiant of contested but possibly record-breaking size.'],
  ['vy-cma', 'VY Canis Majoris', 'STAR', '07h 22m 58s', '-25° 46′ 03″', 'A hypergiant shedding so much mass it has wrapped itself in its own nebula.'],
  ['phoenix-a', 'Phoenix A', 'BLACK_HOLE', '23h 44m 44s', '-42° 43′ 12″', 'At the centre of a cluster forming stars at a furious, unexplained rate.'],
  ['oj287', 'OJ 287', 'BLACK_HOLE', '08h 54m 49s', '+20° 06′ 31″', 'A binary black hole whose smaller partner punches through the larger one’s disc.'],
  ['3c273', '3C 273', 'BLACK_HOLE', '12h 29m 07s', '+02° 03′ 09″', 'The first quasar ever identified, and still the optically brightest.'],
  ['psr-b1919', 'PSR B1919+21', 'PULSAR', '19h 21m 45s', '+21° 53′ 02″', 'The first pulsar discovered — briefly and half-jokingly labelled LGM-1.'],
  ['sgr1806-20', 'SGR 1806-20', 'PULSAR', '18h 08m 39s', '-20° 24′ 40″', 'A magnetar whose 2004 flare briefly outshone everything else in gamma rays.'],
  ['grb080319b', 'GRB 080319B', 'SUPERNOVA', '14h 31m 41s', '+36° 18′ 09″', 'A gamma-ray burst visible to the naked eye from 7.5 billion light years away.'],
  ['asassn-15lh', 'ASASSN-15lh', 'SUPERNOVA', '22h 02m 15s', '-61° 39′ 35″', 'Possibly the most luminous supernova ever recorded.'],
  ['holmberg-15a', 'Holmberg 15A', 'BLACK_HOLE', '01h 26m 06s', '+01° 20′ 42″', 'Hosts one of the largest black holes ever directly measured.'],
  ['ic1101', 'IC 1101', 'NEBULA', '15h 10m 56s', '+05° 44′ 41″', 'One of the largest known galaxies, spanning millions of light years.'],
  ['wr104', 'WR 104', 'STAR', '18h 02m 04s', '-23° 37′ 41″', 'A pinwheel of dust spun by two massive stars, once feared aimed at Earth.'],
  ['lbv1806-20', 'LBV 1806-20', 'STAR', '18h 08m 40s', '-20° 24′ 41″', 'A luminous blue variable, among the brightest stars in the galaxy.'],
  ['cyg-ob2-12', 'Cygnus OB2-12', 'STAR', '20h 32m 41s', '+41° 14′ 29″', 'A hypergiant so obscured by dust that its true brightness was long underestimated.'],
  ['psr-j1748', 'PSR J1748-2446ad', 'PULSAR', '17h 48m 05s', '-24° 46′ 38″', 'The fastest known pulsar — 716 rotations every second.'],
  ['gn-z11', 'GN-z11', 'NEBULA', '12h 36m 25s', '+62° 14′ 31″', 'One of the most distant galaxies ever seen, shining from the early universe.'],
];

function buildPool(rarity: Rarity, entries: Entry[]): Omit<CelestialObject, 'visualSeed'>[] {
  const tier = TIER_BY_ID[RARITY_TO_TIER[rarity]];
  return entries.map(([id, name, type, ra, dec, description]) => ({
    id,
    name,
    type,
    rarity,
    rarityColor: tier.color,
    tokens: tier.strllr,
    physicalReward: tier.physical,
    description,
    coordinates: { ra, dec },
  }));
}

export const OBJECT_POOLS: Record<Rarity, Omit<CelestialObject, 'visualSeed'>[]> = {
  COMMON: buildPool('COMMON', COMMON_POOL),
  UNCOMMON: buildPool('UNCOMMON', UNCOMMON_POOL),
  RARE: buildPool('RARE', RARE_POOL),
  EPIC: buildPool('EPIC', EPIC_POOL),
  LEGENDARY: buildPool('LEGENDARY', LEGENDARY_POOL),
};

/**
 * Resolve a pass to its object. Pure and deterministic: the same three inputs
 * always produce the same result, on any machine, forever.
 */
export function determineObject(
  walletAddress: string,
  passNumber: number,
  salt: string = REVEAL_SALT,
): CelestialObject {
  const next = xmur3(`${walletAddress}:${passNumber}:${salt}`);

  const roll = Math.floor((next() / 4294967296) * ROLL_SPACE);
  const rarity = rarityForRoll(roll);

  // Separate draws for tier, object and visual, so which object you get is not
  // correlated with where in the bucket your roll landed.
  const pool = OBJECT_POOLS[rarity];
  const object = pool[next() % pool.length];
  const visualSeed = next();

  return { ...object, visualSeed };
}

/* ── Visuals ──────────────────────────────────────────────────────────────
   Each rarity owns a hue range; the seed jitters hue, position and spread so
   two holders of the same object still get visibly different art. */
const PALETTES: Record<Rarity, { hue: number; spread: number; sat: number; light: number }> = {
  COMMON: { hue: 215, spread: 26, sat: 46, light: 62 },
  UNCOMMON: { hue: 189, spread: 24, sat: 72, light: 58 },
  RARE: { hue: 275, spread: 30, sat: 62, light: 60 },
  EPIC: { hue: 36, spread: 20, sat: 88, light: 56 },
  LEGENDARY: { hue: 46, spread: 16, sat: 92, light: 64 },
};

/**
 * A CSS `background` value unique to this object, as layered radial gradients.
 * Accepts a plain string for `rarity` and falls back to the Common palette for
 * anything unrecognised, so a bad value degrades instead of throwing.
 */
export function generateVisualGradient(visualSeed: number, rarity: string): string {
  const key = rarity.toUpperCase() as Rarity;
  const p = PALETTES[key] ?? PALETTES.COMMON;
  const rand = mulberry32(visualSeed);

  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
  const hue = (offset: number) => Math.round(p.hue + between(-p.spread, p.spread) + offset);

  const coreX = Math.round(between(38, 62));
  const coreY = Math.round(between(36, 58));
  const midX = Math.round(between(24, 76));
  const midY = Math.round(between(28, 72));
  const armX = Math.round(between(20, 80));
  const armY = Math.round(between(24, 78));

  const core = `hsl(${hue(0)} ${p.sat}% ${Math.round(p.light + 22)}%)`;
  const mid = `hsl(${hue(-14)} ${p.sat}% ${p.light}%)`;
  const arm = `hsl(${hue(18)} ${Math.round(p.sat * 0.8)}% ${Math.round(p.light - 16)}%)`;
  const halo = `hsl(${hue(-28)} ${Math.round(p.sat * 0.6)}% ${Math.round(p.light * 0.24)}%)`;

  const coreStop = Math.round(between(14, 26));
  const midStop = Math.round(between(40, 56));
  const armStop = Math.round(between(34, 50));

  return [
    `radial-gradient(circle at ${coreX}% ${coreY}%, ${core} 0%, transparent ${coreStop}%)`,
    `radial-gradient(circle at ${midX}% ${midY}%, ${mid} 0%, transparent ${midStop}%)`,
    `radial-gradient(circle at ${armX}% ${armY}%, ${arm} 0%, transparent ${armStop}%)`,
    `radial-gradient(circle at 50% 50%, ${halo} 0%, #01020a 78%)`,
  ].join(', ');
}
