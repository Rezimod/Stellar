import type { Mission } from './types';

export const ECOSYSTEM = {
  store: 'https://astroman.ge',
  club: 'https://club.astroman.ge',
  sky: 'https://sky.astroman.ge',
  app: '/',
};

export const SPONSORS = {
  farmhawk: 'https://farmhawk.ai',
  pollinet: 'https://github.com/pollinet/pollinet',
  scriptonia: 'https://scriptonia.xyz',
  cyreneai: 'https://cyreneai.com',
  superteam: 'https://superteam.fun',
  solana: 'https://solana.com',
};

export const MISSIONS: Mission[] = [
  { id: 'moon', name: 'The Moon', emoji: '🌕', difficulty: 'Beginner',
    points: 50, type: 'naked_eye',
    desc: 'Observe the lunar surface. Identify at least 3 craters.',
    hint: 'Best viewed during first/last quarter for crater shadow detail.' },
  { id: 'jupiter', name: 'Jupiter', emoji: '🪐', difficulty: 'Beginner',
    points: 75, type: 'telescope',
    desc: 'Locate Jupiter and observe its Galilean moons.',
    hint: "Look for the bright 'star' that doesn't twinkle." },
  { id: 'orion', name: 'Orion Nebula', emoji: '✨', difficulty: 'Intermediate',
    points: 100, type: 'telescope',
    desc: "Find M42 in Orion's sword. Photograph the nebula.",
    hint: "Below the three belt stars — middle 'star' of the sword." },
  { id: 'saturn', name: 'Saturn', emoji: '🪐', difficulty: 'Intermediate',
    points: 100, type: 'telescope',
    desc: "Observe Saturn's rings.",
    hint: "Even a small telescope shows rings. Yellowish 'star'." },
  { id: 'pleiades', name: 'Pleiades (M45)', emoji: '💫', difficulty: 'Beginner',
    points: 60, type: 'naked_eye',
    desc: 'Locate the Seven Sisters star cluster.',
    hint: 'Fuzzy patch to naked eye. Binoculars show dozens of stars.' },
];

export const TELESCOPE_BRANDS = ['Celestron', 'National Geographic', 'Meade', 'Sky-Watcher', 'Orion', 'Other'];
