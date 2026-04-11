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
  { id: 'moon', name: 'The Moon', emoji: '🌕', difficulty: 'Beginner',
    stars: 50, type: 'naked_eye',
    desc: 'Observe the lunar surface. Identify at least 3 craters.',
    hint: 'Best viewed during first/last quarter for crater shadow detail.',
    context: 'lunar_surface_observation' },
  { id: 'jupiter', name: 'Jupiter', emoji: '🪐', difficulty: 'Beginner',
    stars: 75, type: 'telescope',
    desc: 'Locate Jupiter and observe its Galilean moons.',
    hint: "Look for the bright 'star' that doesn't twinkle.",
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

export const TELESCOPE_BRANDS = ['Celestron', 'National Geographic', 'Meade', 'Sky-Watcher', 'Orion', 'Other'];

export const AGENT_META = {
  name: 'STELLAR Observer Agent',
  version: '1.0.0',
  description: 'The global astronomy app — observe anywhere, earn Stars, collect discovery NFTs on Solana. You serve astronomers worldwide, not just in Georgia.',
  capabilities: ['capture', 'verify', 'mint'],
  oracle: 'open-meteo-v1',
  network: 'solana_devnet',
};

export const CONTEXT_ENGINE = {
  provider: 'scriptonia',
  version: '1.0',
  model: 'mission-context-v1',
  url: 'https://scriptonia.xyz',
};
