/**
 * What the poster face of a First Light card says, beyond its record: the title
 * as it runs in the striped letters (a line break where it splits), the line
 * spaced out beneath it, the quote across the top of the sky, and the headline
 * and the line under it in the panel below.
 */

export type Poster = {
  title: string;
  epithet: string;
  quote: string | null;
  headline: string;
  sub: string;
  /** Three figures for the panel, where the poster prints its own instead of the record's: value, then label. */
  figures?: [[string, string], [string, string], [string, string]];
};

type Row = [title: string, epithet: string, quote: string | null, headline: string, sub: string];

const ROWS: Record<string, Row> = {
  'FIRST-LIGHT': ['FIRST\nLIGHT', 'The shutter opens', 'Whatever the sky gives first, you hold.', 'The first frame ever taken', 'One night, one exposure, one image for every holder'],
  IMILAC: ['IMILAC', 'Heart of a broken world', 'Found in the driest desert on Earth, 1822.', 'Green glass set in iron', 'Older than the oceans, younger than nothing near it'],
  'LUNAR-FRAGMENT': ['A PIECE OF\nTHE MOON', 'Thrown across the dark', 'An impact on the Moon. A landing on Earth.', 'It crossed 384,400 km', 'Blasted off the lunar surface, now in your hand'],
  TYCHO: ['TYCHO', 'The bright scar', 'One strike, and the Moon wore rays forever.', 'Rays a thousand km long', 'Struck 108 million years ago, still the brightest mark'],
  SUN: ['THE SUN', 'The star we live beside', 'Every eight minutes, its light reaches you.', 'A million Earths inside', 'Four million tonnes of itself burned every second'],
  MERCURY: ['MERCURY', 'The scorched messenger', 'A year shorter than its own day.', 'A day longer than its year', 'From 430 °C at noon to −180 °C by night'],
  VENUS: ['VENUS', 'Under a lid of cloud', 'The evening star is hot enough to melt lead.', 'The hottest planet of all', 'Its clouds rain acid that never reaches the ground'],
  MARS: ['MARS', 'The red frontier', 'Once it had rivers and a sky that held rain.', 'A day nearly ours', 'The next world people will stand on'],
  'OLYMPUS-MONS': ['OLYMPUS\nMONS', 'The tallest mountain known', 'Three Everests high, wide as France.', 'A mountain past the sky', 'Its summit rises above most of the Martian air'],
  'VALLES-MARINERIS': ['VALLES\nMARINERIS', 'The great rift of Mars', 'Laid across America, it would reach coast to coast.', 'A canyon 4,000 km long', 'Morning fog still pools along its floor'],
  JUPITER: ['JUPITER', 'King of the planets', 'A thousand Earths would fit inside.', 'A storm older than nations', 'Its great red spot has raged for 350 years'],
  IO: ['IO', 'The burning moon', 'Squeezed by Jupiter, it never cools.', 'Four hundred volcanoes', 'Fountains of sulfur rise hundreds of kilometres'],
  EUROPA: ['EUROPA', 'The ocean under ice', 'Under the ice, twice the water of Earth.', 'An ocean no one has seen', 'The best place to look for life we have not met'],
  GANYMEDE: ['GANYMEDE', 'The giant moon', 'Larger than Mercury, and it circles a planet.', 'A moon with its own magnet', 'Beneath its grooves, a buried salt ocean'],
  SATURN: ['SATURN', 'The ringed sentinel', null, 'A world lighter than water', '274 moons circle a planet with no ground to stand on'],
  'KRAKEN-MARE': ['KRAKEN\nMARE', 'A sea on Titan', 'Where the rain is methane and the shore is ice.', 'A sea at −179 °C', 'The only shore beyond Earth where waves may break'],
  ENCELADUS: ['ENCELADUS', 'The fountain moon', 'The whitest thing in the Solar System.', 'An ocean spraying into space', 'Its geysers feed one of Saturn’s rings'],
  URANUS: ['URANUS', 'The sideways giant', 'Something vast once knocked it over.', 'A planet on its side', 'Each pole gets forty-two years of sun'],
  NEPTUNE: ['NEPTUNE', 'Found by arithmetic', 'Predicted on paper before anyone saw it.', 'The windiest world', 'Storms blow at 2,000 km an hour in the dark'],
  PLUTO: ['PLUTO', 'The heart of ice', 'Seen close once, for a single afternoon.', 'A heart of frozen nitrogen', 'Nine years of travel for one pass in 2015'],
  HALLEY: ['HALLEY', 'The card that waits', 'It came in 1986. It comes again in 2061.', 'Back every 76 years', 'Hold the card, and wait with it'],
  OUMUAMUA: ['ʻOUMUAMUA', 'The first visitor', 'It came from between the stars, and did not stay.', 'Not from this Sun', 'We saw it for eleven weeks, then it was gone'],
  'VOYAGER-1': ['VOYAGER 1', 'The farthest hand', 'Launched in 1977, still calling home.', 'Farther than anything made', 'Every year, farther from everyone who ever lived'],
  'ALPHA-CEN': ['ALPHA\nCENTAURI', 'The house next door', 'Their light left home four years ago.', 'Three suns, one neighbour', 'The nearest stars to the Sun, 4.37 light-years out'],
  SIRIUS: ['SIRIUS', 'The dog star', 'Its rising once told Egypt the Nile would flood.', 'Brightest in the night', 'Beside it circles the ember of a dead star'],
  VEGA: ['VEGA', 'The zero star', 'In twelve thousand years it will be the pole star.', 'The measure of brightness', 'Every star’s magnitude was once counted from it'],
  ARCTURUS: ['ARCTURUS', 'The bear watcher', 'Follow the Plough’s handle and arc to it.', 'An old star passing through', 'Twenty-five Suns wide, and moving fast'],
  ALDEBARAN: ['ALDEBARAN', 'Eye of the bull', 'Pioneer 10 is on its way, two million years out.', 'An orange giant, 65 ly away', 'It sits in front of the Hyades, not among them'],
  POLARIS: ['POLARIS', 'The star that waits', 'Every other star wheels; this one waits.', 'The still point of the sky', 'Sailors crossed oceans by its height'],
  MIRA: ['MIRA', 'The wonderful star', 'Bright one season, gone from the eye the next.', 'A star that comes and goes', 'Behind it trails a tail thirteen light-years long'],
  ALBIREO: ['ALBIREO', 'Gold and sapphire', 'One star to the eye, two in any telescope.', 'Two colours, one point', 'The finest pair in the summer sky'],
  BETELGEUSE: ['BETELGEUSE', 'The giant at the end', 'One day it explodes, bright enough to cast shadows.', 'A star that would swallow Mars', 'Orion’s shoulder is running out of time'],
  ANTARES: ['ANTARES', 'Rival of Mars', 'It glows as red as the planet it was named against.', 'The heart of the scorpion', 'A supergiant 680 times the width of the Sun'],
  RIGEL: ['RIGEL', 'The blue foot', 'Far brighter than Betelgeuse, and far younger.', '120,000 Suns of light', 'It lights a faint blue cloud called the Witch Head'],
  'ETA-CARINAE': ['ETA\nCARINAE', 'The star that would not die', 'In 1843 it became the second-brightest star.', 'It survived its own blast', 'Wrapped in the cloud it threw off'],
  'TRAPPIST-1': ['TRAPPIST-1', 'Seven worlds', 'From any one of them, the others hang like moons.', 'Seven Earths, one small sun', 'Three sit where water could stay liquid'],
  '55-CANCRI-E': ['55 CANCRI E', 'The lava world', 'Its year is shorter than one of our days.', 'An ocean of molten rock', 'A world eight times Earth’s mass, 41 light-years out'],
  'HD-189733B': ['HD 189733 B', 'The blue world', 'It may rain glass, sideways, in the wind.', 'A sky of falling glass', 'The first planet of another star whose colour we know'],
  'KEPLER-16B': ['KEPLER-16B', 'The world of two suns', 'Every sunset there comes twice.', 'A real world with two suns', 'Found in 2011, it circles both stars at once'],
  M45: ['PLEIADES', 'The seven sisters', 'Named by every people who ever looked up.', 'A hundred million years young', 'A cluster of hot blue stars, 444 light-years out'],
  M44: ['BEEHIVE', 'The swarm in Cancer', 'To the eye, a small cloud. To Galileo, stars.', 'A thousand stars together', 'Seen since antiquity, counted only with the telescope'],
  HELIX: ['HELIX', 'The eye in the sky', 'One of the nearest dying stars to us.', 'A star turning to glass', 'Its rim is combed with thousands of comet-like knots'],
  M57: ['RING\nNEBULA', 'The smoke ring', 'The Sun will make one of these, in five billion years.', 'A dying star’s last breath', 'At its centre, the small hot core that is left'],
  'CATS-EYE': ['CAT’S EYE', 'Shell inside shell', 'Its star shed a shell every fifteen hundred years.', 'Eleven rings of light', 'The first nebula shown to be glowing gas'],
  M42: ['ORION\nNEBULA', 'Where stars are born', 'A cloud where stars are being made tonight.', 'A nursery you can see', 'Look below Orion’s belt with your own eyes'],
  HORSEHEAD: ['HORSEHEAD', 'The dark rider', 'Dust so thick it blots out the glow behind it.', 'A shadow 3.5 ly tall', 'First noticed on a photographic plate, not by eye'],
  ROSETTE: ['ROSETTE', 'The cosmic rose', 'Young stars at its centre blew the hollow.', 'A rose 130 ly across', 'Dark knots in its petals are stars still forming'],
  'NORTH-AMERICA': ['NORTH\nAMERICA', 'A continent of light', 'Its dark gulf is dust in front of the glow.', 'Drawn in burning hydrogen', 'Its bright wall is a line of new stars forming'],
  VEIL: ['THE VEIL', 'Smoke of a dead star', 'Six full Moons wide, and still expanding.', 'Threads of a shock wave', 'A star exploded here fifteen thousand years ago'],
  M8: ['LAGOON', 'The pink harbour', 'Visible to the eye from a dark summer field.', 'A lagoon 110 ly wide', 'At its heart, a bright knot called the Hourglass'],
  M20: ['TRIFID', 'Split three ways', 'Red gas, blue light and black dust in one field.', 'Three nebulae in one', 'A young cluster lights it from within'],
  M16: ['PILLARS OF\nCREATION', 'Towers of the Eagle', 'Each pillar is taller than the gap to the next star.', 'Where new stars hatch', 'Light from young stars is slowly eating them away'],
  M1: ['CRAB\nNEBULA', 'The star that died', 'In 1054, a star died so bright it shone in daylight.', 'A star died in 1054', 'Its heart still spins 30 times every second'],
  BUTTERFLY: ['BUTTERFLY', 'Wings of fire', 'A dark belt of dust pinches it at the waist.', 'One of the hottest stars', 'Its gas flies outward at 900,000 km an hour'],
  CARINA: ['CARINA', 'Cliffs of creation', 'The brightest nebula in the whole sky.', 'Four times Orion’s size', 'Home to some of the most massive stars known'],
  'JEWEL-BOX': ['JEWEL BOX', 'Gems around a ruby', 'A letter A of bright young stars.', 'A hundred blue jewels', 'One red supergiant sits among them like a ruby'],
  'DOUBLE-CLUSTER': ['DOUBLE\nCLUSTER', 'Twins of Perseus', 'Two young clusters born near each other.', 'Two clusters, side by side', 'A few red supergiants glow among the blue'],
  'OMEGA-CEN': ['OMEGA\nCENTAURI', 'Ten million suns', 'It may be the heart of a galaxy we swallowed.', 'The greatest cluster of all', 'The largest ball of stars around our galaxy'],
  M13: ['HERCULES', 'The great cluster', 'In 1974 a radio message was aimed at it.', 'A message on its way', 'Three hundred thousand stars, older than almost anything'],
  TARANTULA: ['TARANTULA', 'The star factory', 'It lies in another galaxy, and still we see it.', 'The busiest nursery near us', 'Its core holds the most massive star known'],
  'MILKY-WAY': ['MILKY WAY', 'Home, seen from inside', 'The river of light is our galaxy, edge on.', '200 billion suns', 'The Sun has gone round it about twenty times'],
  LMC: ['LARGE\nMAGELLANIC', 'A galaxy in orbit', 'A torn-off piece of the Milky Way.', 'A neighbour galaxy', 'Supernova 1987A exploded here'],
  SMC: ['SMALL\nMAGELLANIC', 'The smaller cloud', 'Named for Magellan’s crew, known long before.', 'Pulled slowly apart', 'Our galaxy is unravelling it star by star'],
  M31: ['ANDROMEDA', 'The coming collision', 'In four billion years, we meet.', 'A trillion stars inbound', 'The farthest thing the naked eye can see'],
  M33: ['TRIANGULUM', 'The third spiral', 'On the darkest nights, the farthest thing the eye can see.', 'Forty billion stars', 'A loose, young spiral, full of pink nurseries'],
  M81: ['BODE’S\nGALAXY', 'The grand spiral', 'Found by Bode in 1774, a smudge in a small telescope.', 'A spiral near the Plough', 'It shares its patch of sky with the Cigar'],
  M82: ['THE CIGAR', 'The galaxy on fire', 'A close pass by M81 set it ablaze with new stars.', 'Stars born ten times faster', 'Winds of red gas pour out above and below'],
  'CEN-A': ['CENTAURUS A', 'The galaxy that ate', 'The dark band is a spiral galaxy it swallowed.', 'Jets a million ly long', 'A black hole of 55 million Suns at its core'],
  M101: ['PINWHEEL', 'The wide spiral', 'Almost twice the width of the Milky Way.', 'A galaxy seen face on', 'Stars exploded in it in 2011 and again in 2023'],
  M51: ['WHIRLPOOL', 'The perfect spiral', 'The first galaxy anyone saw was a spiral.', 'Two galaxies, one dance', 'Its companion is stirring up its arms'],
  M104: ['SOMBRERO', 'The dark brim', 'We see it almost exactly edge on.', 'A brim of black dust', 'Two thousand clusters orbit its glowing bulge'],
  M87: ['M87', 'The shadow seen', 'In 2019 we saw the shadow of its black hole.', 'A black hole photographed', 'Six and a half billion Suns, hidden in the light'],
  'STEPHANS-QUINTET': ['STEPHAN’S\nQUINTET', 'Five in collision', 'One of the five is a stranger in the photo.', 'Four galaxies colliding', 'A shock wave larger than our galaxy runs between them'],
  CARTWHEEL: ['CARTWHEEL', 'The ripple galaxy', 'A smaller galaxy fell straight through its middle.', 'A ring 150,000 ly wide', 'The collision set off a ring of new stars'],
  'SGR-A': ['SAGITTARIUS\nA*', 'The heart of the galaxy', 'Everything in our galaxy turns around it.', 'Four million suns, unseen', 'Its shadow was first imaged in 2022'],
  'CYGNUS-X1': ['CYGNUS X-1', 'The first black hole', 'Hawking bet it was not a black hole, and lost.', 'A star being eaten', 'A blue giant feeding a partner no one can see'],
  MAGNETAR: ['MAGNETAR', 'The strongest magnet', 'Its 2004 flare reached us from across the galaxy.', 'A city-sized dead star', 'Its crust cracks under its own magnetic field'],
  'SN-1987A': ['SUPERNOVA\n1987A', 'The nearest blast', 'Its ghost particles arrived hours before its light.', 'A star died in 1987', 'Its blast now lights a ring of pearls'],
  GW170817: ['GOLDEN\nCOLLISION', 'Where gold is made', 'The gold in your ring was made in a crash like this.', 'Two dead stars collide', 'First felt as a ripple in space, then seen as light'],
  'TON-618': ['TON 618', 'The colossus', 'Its light set out before the Earth existed.', '40 billion Suns of dark', 'The gas falling in outshines a hundred galaxies'],
  'HUBBLE-DEEP-FIELD': ['DEEP\nFIELD', 'A speck full of worlds', 'A speck of sky where nothing seemed to be.', 'Three thousand galaxies', 'Ten days of looking at a patch of apparent nothing'],
  CMB: ['OLDEST\nLIGHT', 'The afterglow', 'Light from when the universe first turned clear.', 'The first light of all', 'Some of the static on an old television was this'],
  WORMHOLE: ['WORMHOLE', 'A door in space', 'Look into it and you see another galaxy’s stars.', 'A shortcut through space', 'Physics allows it. No one has found one'],
  'TWIN-SUNS': ['TWIN SUNS', 'Two sunsets', 'Films imagined it long before we found one.', 'A desert under two suns', 'Kepler-16b proved a world can circle two'],
  'HOUR-SEA': ['HOUR SEA', 'Where time runs slow', 'Stay an hour, and years pass for everyone else.', 'Waves a kilometre high', 'An ocean in the pull of a black hole'],
  'ORBITAL-RING': ['ORBITAL\nRING', 'A band around a world', 'Lifts climb from the ground to the ring by the hour.', 'A ring 42,000 km round', 'Its shadow draws a line across the clouds'],
  'DYSON-SWARM': ['DYSON\nSWARM', 'A star in harness', 'A civilisation that wants all of its sun’s light.', 'Billions of collectors', 'Astronomers have searched for one; none found yet'],
  ECUMENOPOLIS: ['CITY\nWORLD', 'Never dark', 'From orbit, its night side is a web of gold.', 'One city, pole to pole', 'No sky there has shown a star in centuries'],
  'FROZEN-CLOUDS': ['FROZEN\nCLOUDS', 'The ice world', 'Walk out onto one, and do not look down.', 'Clouds frozen solid', 'Shelves of ice float over a frozen sea'],
  'GREEN-MOON': ['GREEN\nMOON', 'Forest under a giant', 'Half its sky is the banded planet it circles.', 'A moon that wears forests', 'Our giant moons hide oceans; this one wears them'],
  DERELICT: ['DERELICT', 'Makers unknown', 'No shape we would ever build.', 'Something left adrift', 'Something inside it still gives off a little light'],
  'GENERATION-SHIP': ['GENERATION\nSHIP', 'The long voyage', 'No one who left will arrive.', 'Centuries between stars', 'Their great-grandchildren will see the new sun'],
  ORIONIDS: ['ORIONIDS', 'Halley’s dust', 'It burns above you at 66 kilometres a second.', 'A comet, falling as light', 'Dust shed by Halley, centuries ago'],
  'HUNTERS-MOON': ['HUNTER’S\nMOON', 'The harvest light', 'The full Moon that rises with the dusk.', 'A Moon to hunt by', 'For a few nights, it lights the whole field'],
  'PLEIADES-OCCULTATION': ['MOON TAKES\nTHE SISTERS', 'An occultation', 'One by one, they vanish and return.', 'The Moon crosses M45', 'The seven sisters slip behind the full Moon'],
  GEMINIDS: ['GEMINIDS', 'Crumbs of an asteroid', 'The richest shower of the year, under no Moon.', 'Up to 120 an hour', 'Not comet dust: the crumbs of an asteroid'],
  'CHRISTMAS-SUPERMOON': ['SUPERMOON', 'Christmas Eve', 'The closest full Moon of the year.', 'Fourteen percent wider', 'Thirty percent brighter, on the longest nights'],
  'DOUBLE-OPPOSITION': ['DOUBLE\nOPPOSITION', 'Two worlds, one week', 'Jupiter, then Mars, at their closest to Earth.', 'Eight days apart', 'The next pair is years away'],
  'SNOW-MOON-ECLIPSE': ['SNOW MOON\nECLIPSE', 'Brushed by shadow', 'A full Moon slips into the edge of Earth’s shadow.', 'One limb goes dusky', 'A super full Moon touched by the penumbra'],
  'GREAT-ECLIPSE': ['GREAT\nECLIPSE', 'Night at midday', 'Six minutes of night at midday.', 'The longest totality', 'The longest darkness on land this century'],
};

const FIGURES: Record<string, Poster['figures']> = {
  SATURN: [['280,000 KM', 'Ring span'], ['1.36 BN KM', 'From Earth'], ['75 MIN', 'Light delay to Earth']],
  M1: [['6,500 LY', 'Away'], ['11 LY', 'Across'], ['1,500 KM/S', 'Still expanding']],
};

export function posterFor(designation: string, fallbackName: string, fallbackLine: string): Poster {
  const row = ROWS[designation];
  if (!row) return { title: fallbackName.toUpperCase(), epithet: '', quote: null, headline: fallbackLine, sub: '' };
  const [title, epithet, quote, headline, sub] = row;
  return { title, epithet, quote, headline, sub, figures: FIGURES[designation] };
}
