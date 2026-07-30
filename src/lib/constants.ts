import type { Mission } from './types';

export const ECOSYSTEM = {
  store: 'https://astroman.ge',
  sky: 'https://sky.astroman.ge',
  app: '/',
};

export const SPONSORS = {
  superteam: 'https://superteam.fun',
  solana: 'https://solana.com',
};

export const MISSIONS: Mission[] = [
  {
    id: 'demo',
    name: 'Demo Observation',
    emoji: '🎯',
    difficulty: 'Beginner',
    stars: 50,
    type: 'naked_eye',
    desc: 'See the full Stellar flow — simulates an observation and mints a real NFT on Solana.',
    hint: 'Uses a pre-generated sky photo. Perfect for demos and presentations.',
    target: 'Jupiter',
    repeatable: true,
    demo: true,
  },
  {
    id: 'quick-jupiter',
    name: 'Jupiter',
    emoji: '🪐',
    difficulty: 'Beginner',
    stars: 75,
    type: 'naked_eye',
    desc: 'Photograph Jupiter — the brightest "star" in the sky tonight. Upload any clear shot.',
    hint: 'Upload a photo of Jupiter or the night sky. Sky conditions are ignored — your NFT mints regardless.',
    target: 'Jupiter',
    repeatable: true,
    demo: true,
    demoPhoto: '/images/planets/jupiter.jpg',
  },
  {
    id: 'quick-saturn',
    name: 'Saturn',
    emoji: '🪐',
    difficulty: 'Beginner',
    stars: 100,
    type: 'naked_eye',
    desc: 'Photograph Saturn and its iconic rings. Upload any photo — guaranteed mint.',
    hint: 'Upload a photo of Saturn or the night sky. Sky conditions are ignored — your NFT mints regardless.',
    target: 'Saturn',
    repeatable: true,
    demo: true,
    demoPhoto: '/images/planets/saturn.jpg',
  },
  {
    id: 'free-observation',
    name: "Tonight's Sky",
    emoji: '🌌',
    difficulty: 'Beginner',
    stars: 25,
    type: 'naked_eye',
    desc: 'Photograph any part of the night sky. No telescope needed — just look up.',
    hint: 'Find a spot away from bright lights. Point your camera straight up or at the brightest thing you see.',
    target: null,
    repeatable: true,
  },
  // ── Daytime missions ──────────────────────────────────────────────────
  // Available while the Sun is up, so there is something to observe at any
  // hour and any weather. Each one is checked against the Sun's real altitude
  // at the observer's coordinates plus a cloud-cover cross-check against
  // Open-Meteo, so they certify honestly — they simply pay less than a
  // telescope target at 1am (see src/lib/observation-kind.ts).
  { id: 'day-sky', name: "Today's Sky", emoji: '⛅️', difficulty: 'Beginner',
    stars: 10, type: 'naked_eye',
    desc: 'Photograph the sky above you right now — clouds, blue, storm front, whatever it is doing.',
    hint: 'Point the camera up and include plenty of sky. We check it against the live weather over your coordinates, so shoot what is actually there.',
    target: 'day sky',
    cloudTolerant: true,
    repeatable: true,
    context: 'daytime_sky_log' },
  { id: 'daytime-moon', name: 'Daytime Moon', emoji: '🌗', difficulty: 'Beginner',
    stars: 25, type: 'naked_eye',
    desc: 'Catch the Moon in a blue daylight sky — most people never notice it is there.',
    hint: 'Best in the afternoon around first quarter, or the morning around last quarter. Look for a pale chalk mark high up.',
    target: 'daytime moon',
    repeatable: true,
    context: 'daytime_moon_observation' },
  { id: 'sky-optics', name: 'Halos & Sundogs', emoji: '🌈', difficulty: 'Intermediate',
    stars: 25, type: 'naked_eye',
    desc: 'Photograph a real atmospheric optic: a 22° halo, a sundog, a rainbow, crepuscular rays, iridescent cloud.',
    hint: 'Thin high cirrus is what makes halos and sundogs. Block the Sun with your hand or a building and look either side of it.',
    target: 'atmospheric optics',
    cloudTolerant: true,
    repeatable: true,
    context: 'atmospheric_optics_observation' },
  { id: 'sunset', name: 'Sunset & Blue Hour', emoji: '🌇', difficulty: 'Beginner',
    stars: 10, type: 'naked_eye',
    desc: 'Photograph the colour of the sky as the Sun goes down — the start of every observing night.',
    hint: 'The best colour is usually 10–20 minutes after the Sun drops below the horizon. Keep the horizon in frame.',
    target: 'sunset sky',
    cloudTolerant: true,
    repeatable: true,
    context: 'twilight_sky_observation' },
  { id: 'the-sun', name: 'The Sun', emoji: '☀️', difficulty: 'Beginner',
    stars: 10, type: 'naked_eye',
    desc: 'Photograph the Sun itself — low over the horizon, through cloud, or behind a building.',
    hint: 'Never look at the Sun through a telescope, binoculars or a viewfinder without a certified solar filter — it causes permanent blindness. A phone held at arm’s length, pointed at a low or veiled Sun, is what this mission is for.',
    target: 'sun',
    repeatable: true,
    context: 'solar_observation' },

{ id: 'moon', name: 'The Moon', emoji: '🌕', difficulty: 'Beginner',
    stars: 50, type: 'naked_eye',
    desc: 'Observe the lunar surface. Identify at least 3 craters.',
    hint: 'Best viewed during first/last quarter for crater shadow detail.',
    context: 'lunar_surface_observation' },
  { id: 'mercury', name: 'Mercury', emoji: '☿️', difficulty: 'Beginner',
    stars: 60, type: 'naked_eye',
    desc: 'Catch the swiftest planet low on the horizon at twilight.',
    hint: 'Always near the Sun — look just after sunset or before sunrise, low to the horizon.',
    target: 'Mercury',
    context: 'inner_planet_horizon_observation' },
  { id: 'venus', name: 'Venus', emoji: '🌟', difficulty: 'Beginner',
    stars: 40, type: 'naked_eye',
    desc: 'Photograph the evening (or morning) star — brightest object after the Moon.',
    hint: "Brighter than any star and doesn't twinkle. West after sunset, or east before dawn.",
    target: 'Venus',
    context: 'inner_planet_phase_observation' },
  { id: 'mars', name: 'Mars', emoji: '🔴', difficulty: 'Intermediate',
    stars: 120, type: 'telescope',
    desc: 'Capture the red planet. Look for surface markings or a polar ice cap.',
    hint: "Distinctly orange-red. Doesn't twinkle. Best near opposition.",
    target: 'Mars',
    context: 'inner_planet_surface_observation' },
  { id: 'jupiter', name: 'Jupiter', emoji: '🪐', difficulty: 'Beginner',
    stars: 75, type: 'telescope',
    desc: 'Locate Jupiter and observe its Galilean moons.',
    hint: "Look for the bright 'star' that doesn't twinkle.",
    target: 'Jupiter',
    context: 'gas_giant_galilean_moons' },
  { id: 'orion', name: 'Orion Nebula', emoji: '✨', difficulty: 'Intermediate',
    stars: 100, type: 'telescope',
    desc: "Find M42 in Orion's sword. Photograph the nebula.",
    hint: "Below the three belt stars — middle 'star' of the sword.",
    context: 'deep_sky_m42_nebula' },
  { id: 'saturn', name: 'Saturn', emoji: '🪐', difficulty: 'Intermediate',
    stars: 100, type: 'telescope',
    desc: "Observe Saturn's rings.",
    hint: "Even a small telescope shows rings. Yellowish 'star'.",
    context: 'ring_system_observation' },
  { id: 'pleiades', name: 'Pleiades (M45)', emoji: '💫', difficulty: 'Beginner',
    stars: 60, type: 'naked_eye',
    desc: 'Locate the Seven Sisters star cluster.',
    hint: 'Fuzzy patch to naked eye. Binoculars show dozens of stars.',
    context: 'open_cluster_m45_seven_sisters' },
  { id: 'andromeda', name: 'Andromeda Galaxy', emoji: '🌌', difficulty: 'Hard',
    stars: 175, type: 'telescope',
    desc: 'Locate M31 — the nearest major galaxy at 2.5 million light-years.',
    hint: 'Find the Great Square of Pegasus, then hop two stars north-east. Dark skies required.',
    context: 'deep_sky_m31_andromeda_galaxy' },
  { id: 'crab', name: 'Crab Nebula', emoji: '🔭', difficulty: 'Expert',
    stars: 250, type: 'telescope',
    desc: 'Capture M1 — the supernova remnant in Taurus. One of the hardest deep-sky targets.',
    hint: 'Requires at least 8" aperture and dark skies. Located 1° NW of ζ Tauri.',
    context: 'deep_sky_m1_supernova_remnant' },
];

// Star payout per mission tier. Mission rows on /missions and the Sky page
// drive their reward hint from this table — keep it the single source of truth.
export type MissionTier = 'easy' | 'medium' | 'hard' | 'expert';

export const STAR_PAYOUT_BY_TIER: Record<MissionTier, number> = {
  easy: 50,
  medium: 100,
  hard: 175,
  expert: 250,
};

// 2x bonus when the observation timestamp lands within ±24h of a matching
// AstroEvent (eclipse, opposition, conjunction, etc). Wired in /api/observe/log
// and mirrored in /api/observe/verify so the UI estimate matches the mint.
export const EVENT_BONUS_MULTIPLIER = 2;

// Cloud cover above which an observation can't be certified. The bar is "the
// sky is effectively closed", not "the sky is imperfect" — a Tbilisi summer
// night sits at 70–90% on plenty of evenings where the Moon and the bright
// planets are still perfectly observable through gaps. Enforced in
// /api/observe/verify, backstopped in /api/mint against the signed token, and
// mirrored by /api/sky/verify so the observe flow agrees end to end.
export const CLOUD_COVER_CERTIFY_MAX = 90;

export const TELESCOPE_BRANDS = ['Celestron', 'National Geographic', 'Meade', 'Sky-Watcher', 'Orion', 'Other'];

export const AGENT_META = {
  name: 'STELLAR Observer Agent',
  version: '1.0.0',
  description: 'The global astronomy app — observe anywhere, earn Stars, collect discovery NFTs on Solana. You serve astronomers worldwide, not just in Georgia.',
  capabilities: ['capture', 'verify', 'mint'],
  oracle: 'open-meteo-v1',
  network: (process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'mainnet-beta').startsWith('mainnet')
    ? 'solana_mainnet'
    : 'solana_devnet',
};
