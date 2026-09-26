/**
 * The Frontier: ten worlds of Sidera's own, in the tradition of the great
 * space films — the ideas those films made famous, never their designs or
 * names. Fiction, and every card says so. Where a real object inspired one,
 * the two are paired.
 */

import { authorFiction, type AuthoredCard } from '../build';

const ref = (n: number) => `Frontier · ${String(n).padStart(2, '0')}`;

export const FRONTIER_CARDS: AuthoredCard[] = [
  authorFiction(
    { designation: 'WORMHOLE', name: 'The Wormhole', objectType: 'fiction · wormhole', rarity: 'legendary', catalogRef: ref(1), blurb: 'A door in space, hanging beside a ringed giant.' },
    {
      stats: [['KIND', 'Traversable'], ['SHAPE', 'A sphere'], ['LEADS TO', 'Another galaxy']],
      line: 'A door in space, hanging beside a ringed giant.',
      story: ['Look into it and you see another galaxy’s stars.', 'Physics allows it. No one has found one.'],
      glow: '#b8d0ff',
    },
  ),
  authorFiction(
    { designation: 'TWIN-SUNS', name: 'The Twin Suns', objectType: 'fiction · desert world', rarity: 'epic', catalogRef: ref(2), blurb: 'A desert where every dusk has two sunsets.' },
    {
      stats: [['SUNS', '2'], ['SURFACE', 'Sand and stone'], ['REAL KIN', 'Kepler-16b']],
      line: 'A desert where every dusk has two sunsets.',
      story: ['Films imagined it long before we found one.', 'Kepler-16b proved a world can circle two suns.'],
      glow: '#ffb060',
      pairsWith: 'KEPLER-16B',
    },
  ),
  authorFiction(
    { designation: 'HOUR-SEA', name: 'The Hour Sea', objectType: 'fiction · ocean world', rarity: 'epic', catalogRef: ref(3), blurb: 'An ocean so near a black hole that time runs slow.' },
    {
      stats: [['SKY', 'A black hole'], ['WAVES', '~1 km high'], ['ONE HOUR', 'Years elsewhere']],
      line: 'An ocean so near a black hole that time runs slow.',
      story: ['Gravity this strong stretches time itself.', 'Stay an hour, and years pass for everyone else.'],
      glow: '#ffc890',
    },
  ),
  authorFiction(
    { designation: 'ORBITAL-RING', name: 'The Orbital Ring', objectType: 'fiction · megastructure', rarity: 'rare', catalogRef: ref(4), blurb: 'A band of metal built all the way round a world.' },
    {
      stats: [['CIRCUMFERENCE', '~42,000 km'], ['TETHERS', 'Dozens'], ['BUILDERS', 'Unknown']],
      line: 'A band of metal built all the way round a world.',
      story: ['Lifts climb from the ground to the ring by the hour.', 'Its shadow draws a line across the clouds.'],
      glow: '#cfe0ff',
    },
  ),
  authorFiction(
    { designation: 'DYSON-SWARM', name: 'The Dyson Swarm', objectType: 'fiction · megastructure', rarity: 'rare', catalogRef: ref(5), blurb: 'A star wrapped in a cloud of machines.' },
    {
      stats: [['COLLECTORS', 'Billions'], ['CAPTURES', 'Most of a star'], ['IDEA', '1960']],
      line: 'A star wrapped in a cloud of machines.',
      story: ['A civilisation that wants all of its sun’s light.', 'Astronomers have searched for one; none found yet.'],
      glow: '#ffd890',
    },
  ),
  authorFiction(
    { designation: 'ECUMENOPOLIS', name: 'The City World', objectType: 'fiction · planet-city', rarity: 'rare', catalogRef: ref(6), blurb: 'A planet that is one city, pole to pole.' },
    {
      stats: [['COAST', 'None left'], ['NIGHT', 'Never dark'], ['PEOPLE', 'Uncounted']],
      line: 'A planet that is one city, pole to pole.',
      story: ['From orbit, its night side is a web of gold.', 'No sky there has shown a star in centuries.'],
      glow: '#ffcf70',
    },
  ),
  authorFiction(
    { designation: 'FROZEN-CLOUDS', name: 'The Frozen Clouds', objectType: 'fiction · ice world', rarity: 'common', catalogRef: ref(7), blurb: 'A world so cold the clouds froze solid.' },
    {
      stats: [['SURFACE', 'Ice sea'], ['CLOUDS', 'Frozen'], ['SUN', 'Small and pale']],
      line: 'A world so cold the clouds froze solid.',
      story: ['Shelves of frozen cloud float over an icy sea.', 'Walk out onto one, and do not look down.'],
      glow: '#e0f0ff',
    },
  ),
  authorFiction(
    { designation: 'GREEN-MOON', name: 'The Green Moon', objectType: 'fiction · forest moon', rarity: 'common', catalogRef: ref(8), blurb: 'A forested moon under a giant planet.' },
    {
      stats: [['SURFACE', 'Forest, ocean'], ['SKY', 'A gas giant'], ['REAL KIN', 'Europa, Enceladus']],
      line: 'A forested moon under a giant planet.',
      story: ['Half its sky is the banded planet it circles.', 'Our own giant moons hide oceans; this one wears them.'],
      glow: '#8ae0a0',
    },
  ),
  authorFiction(
    { designation: 'DERELICT', name: 'The Derelict', objectType: 'fiction · artefact', rarity: 'common', catalogRef: ref(9), blurb: 'Something old, left adrift by makers unknown.' },
    {
      stats: [['AGE', 'Unknown'], ['MAKERS', 'Unknown'], ['LIGHT', 'Still inside']],
      line: 'Something old, left adrift by makers unknown.',
      story: ['No shape we would ever build.', 'Something in it still gives off a little light.'],
      glow: '#a8b0ff',
    },
  ),
  authorFiction(
    { designation: 'GENERATION-SHIP', name: 'The Generation Ship', objectType: 'fiction · starship', rarity: 'common', catalogRef: ref(10), blurb: 'A ship where people are born, live and die on the way.' },
    {
      stats: [['VOYAGE', 'Centuries'], ['CREW', 'Generations'], ['GRAVITY', 'By spin']],
      line: 'A ship where people are born, live and die on the way.',
      story: ['No one who left will arrive.', 'Their great-grandchildren will see the new sun.'],
      glow: '#ffe0b0',
      pairsWith: 'ALPHA-CEN',
    },
  ),
];
