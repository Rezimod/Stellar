'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { TrendingUp, TrendingDown, Newspaper, Flame, Clock3, Radio } from 'lucide-react';
import PageTransition from '@/components/ui/PageTransition';

type Category =
  | 'sky'
  | 'solar'
  | 'meteor'
  | 'comet'
  | 'mission'
  | 'discovery'
  | 'crypto'
  | 'sports'
  | 'tech'
  | 'weather'
  | 'nature';

interface Market {
  id: string;
  category: Category;
  title: string;
  blurb: string;
  resolvesAt: string;
  yes: number;
  volume: number;
  image: string;
  oracle: string;
}

interface NewsItem {
  id: string;
  source: string;
  headline: string;
  marketId?: string;
  hoursAgo: number;
}

const TODAY = new Date('2026-05-23T00:00:00Z');

const CATEGORIES: { key: Category | 'all'; label: string; emoji: string }[] = [
  { key: 'all',       label: 'All',          emoji: '✦' },
  { key: 'sky',       label: 'Sky',          emoji: '🌌' },
  { key: 'solar',     label: 'Solar',        emoji: '☀' },
  { key: 'meteor',    label: 'Meteors',      emoji: '☄' },
  { key: 'comet',     label: 'Comets',       emoji: '🪐' },
  { key: 'mission',   label: 'Missions',     emoji: '🚀' },
  { key: 'discovery', label: 'Discoveries',  emoji: '🔭' },
  { key: 'weather',   label: 'Weather',      emoji: '⛅' },
  { key: 'nature',    label: 'Earth',        emoji: '🌍' },
  { key: 'crypto',    label: 'Crypto',       emoji: '₿' },
  { key: 'sports',    label: 'Sports',       emoji: '⚽' },
  { key: 'tech',      label: 'Tech',         emoji: '⚙' },
];

const MARKETS: Market[] = [
  // SKY
  {
    id: 'sky-saturn-ringplane',
    category: 'sky',
    title: 'Saturn rings reach max tilt by Sep 21 opposition',
    blurb: 'Tilt angle ≥ 1.7° as Saturn reaches 2026 opposition.',
    resolvesAt: '2026-09-21',
    yes: 0.78,
    volume: 4250,
    image: '/images/markets/sky-007-xclass-flare-window.jpg',
    oracle: 'JPL ephemeris',
  },
  {
    id: 'sky-jupiter-bright',
    category: 'sky',
    title: 'Jupiter reaches magnitude −2.8 or brighter on opposition',
    blurb: 'Naked-eye check on Aug 6 from Bortle 4 site.',
    resolvesAt: '2026-08-07',
    yes: 0.62,
    volume: 2980,
    image: '/images/markets/sky-005-mclass-flare-judging.jpg',
    oracle: 'AAVSO',
  },
  {
    id: 'sky-iss-pass',
    category: 'sky',
    title: 'Visible ISS pass over Tbilisi this week',
    blurb: 'Pass duration ≥ 4 min, max elevation ≥ 30°.',
    resolvesAt: '2026-05-28',
    yes: 0.91,
    volume: 1820,
    image: '/images/markets/mission-004-starship-orbit.jpg',
    oracle: 'Heavens-Above',
  },
  {
    id: 'sky-falcon9-cadence',
    category: 'sky',
    title: 'Falcon 9 logs ≥ 12 launches in June',
    blurb: 'Cadence currently averaging 2.6 launches per week.',
    resolvesAt: '2026-07-01',
    yes: 0.71,
    volume: 3140,
    image: '/images/markets/sky-004-falcon9-cadence.jpg',
    oracle: 'SpaceX manifest',
  },

  // SOLAR
  {
    id: 'solar-xflare-jul',
    category: 'solar',
    title: 'X-class solar flare before Jul 1',
    blurb: 'Cycle 25 still active. Last X-flare logged May 9.',
    resolvesAt: '2026-07-01',
    yes: 0.55,
    volume: 6710,
    image: '/images/markets/solar-001-xflare-may.jpg',
    oracle: 'NOAA SWPC',
  },
  {
    id: 'solar-aurora-45n',
    category: 'solar',
    title: 'Aurora visible south of 45°N before solstice',
    blurb: 'Kp ≥ 7 storm reaching mid-latitudes.',
    resolvesAt: '2026-06-21',
    yes: 0.34,
    volume: 3050,
    image: '/images/markets/solar-003-aurora-45n.jpg',
    oracle: 'NOAA SWPC + reports',
  },
  {
    id: 'solar-kp7',
    category: 'solar',
    title: 'Kp index ≥ 7 in the next 30 days',
    blurb: 'Three-hour Kp index from any station, NOAA-confirmed.',
    resolvesAt: '2026-06-20',
    yes: 0.41,
    volume: 2110,
    image: '/images/markets/sky-006-kp5-geomagnetic.jpg',
    oracle: 'NOAA SWPC',
  },
  {
    id: 'solar-mclass-judging',
    category: 'solar',
    title: 'M-class flare during judging week (May 23 – Jun 1)',
    blurb: 'Active region AR3895 climbed to βγδ classification.',
    resolvesAt: '2026-06-01',
    yes: 0.83,
    volume: 1990,
    image: '/images/markets/sky-005-mclass-flare-judging.jpg',
    oracle: 'NOAA SWPC',
  },

  // METEOR
  {
    id: 'meteor-bootids',
    category: 'meteor',
    title: 'June Boötids ZHR > 50 this year',
    blurb: 'Historical outburst window — 2025 returned ZHR 23.',
    resolvesAt: '2026-07-05',
    yes: 0.22,
    volume: 1280,
    image: '/images/markets/meteor-005-outburst.jpg',
    oracle: 'IMO global flux',
  },
  {
    id: 'meteor-perseids',
    category: 'meteor',
    title: 'Perseids peak ZHR ≥ 90 in August',
    blurb: 'Moon at 26% — favorable conditions for the 2026 peak.',
    resolvesAt: '2026-08-13',
    yes: 0.68,
    volume: 5340,
    image: '/images/markets/meteor-003-perseids-zhr.jpg',
    oracle: 'IMO global flux',
  },
  {
    id: 'meteor-fireball-caucasus',
    category: 'meteor',
    title: 'Fireball ≥ mag −6 reported over Caucasus before Aug 1',
    blurb: 'AMS / IMO confirmed report with ≥ 5 witnesses.',
    resolvesAt: '2026-08-01',
    yes: 0.29,
    volume: 940,
    image: '/images/markets/meteor-004-fireball-april.jpg',
    oracle: 'AMS / IMO',
  },
  {
    id: 'meteor-eta-aquariids-replay',
    category: 'meteor',
    title: 'Eta Aquariids late peak (May 28) ZHR ≥ 30',
    blurb: 'Halley dust trail — late stragglers possible.',
    resolvesAt: '2026-05-30',
    yes: 0.37,
    volume: 880,
    image: '/images/markets/meteor-002-eta-aquariids-zhr.jpg',
    oracle: 'IMO global flux',
  },

  // COMET
  {
    id: 'comet-r3-naked-eye',
    category: 'comet',
    title: 'C/2025 R3 brighter than magnitude 6.0 in June',
    blurb: 'Currently mag 6.8 — favorable orbit, dust-rich.',
    resolvesAt: '2026-07-01',
    yes: 0.57,
    volume: 2160,
    image: '/images/markets/comet-001-c2025r3-nakedeye.jpg',
    oracle: 'COBS database',
  },
  {
    id: 'comet-new-2026',
    category: 'comet',
    title: 'New naked-eye comet discovered in 2026',
    blurb: 'Magnitude < 6.0 at any point during the year.',
    resolvesAt: '2026-12-31',
    yes: 0.38,
    volume: 1730,
    image: '/images/markets/comet-002-new-discovery.jpg',
    oracle: 'IAU MPEC',
  },
  {
    id: 'comet-a1-survives',
    category: 'comet',
    title: 'C/2026 A1 survives perihelion intact',
    blurb: 'Perihelion July 12 at 0.31 AU — sungrazer-class.',
    resolvesAt: '2026-07-15',
    yes: 0.47,
    volume: 1990,
    image: '/images/markets/comet-005-c2026a1-survives.jpg',
    oracle: 'SOHO/JPL',
  },
  {
    id: 'comet-rubin-nea',
    category: 'comet',
    title: 'Rubin Observatory flags a hazardous NEA in 2026',
    blurb: 'First-light survey already finding new bodies weekly.',
    resolvesAt: '2026-12-31',
    yes: 0.59,
    volume: 1430,
    image: '/images/markets/comet-003-rubin-nea.jpg',
    oracle: 'MPC NEA confirmed',
  },
  {
    id: 'comet-tianwen2-sample',
    category: 'comet',
    title: 'Tianwen-2 returns asteroid sample by year end',
    blurb: 'Sample-return to Kamoʻoalewa — landing Q4.',
    resolvesAt: '2026-12-31',
    yes: 0.51,
    volume: 1180,
    image: '/images/markets/comet-004-tianwen2-sample.jpg',
    oracle: 'CNSA confirmed return',
  },

  // MISSION
  {
    id: 'mission-artemis-ii',
    category: 'mission',
    title: 'Artemis II launches in 2026',
    blurb: 'Crewed lunar flyby — schedule slipped to late Q3.',
    resolvesAt: '2026-12-31',
    yes: 0.44,
    volume: 8120,
    image: '/images/markets/mission-001-artemis2-safe.jpg',
    oracle: 'NASA launch manifest',
  },
  {
    id: 'mission-starship-orbit',
    category: 'mission',
    title: 'Starship reaches stable orbit before Jul 1',
    blurb: 'Last test cleared boost-back but ditched short.',
    resolvesAt: '2026-07-01',
    yes: 0.36,
    volume: 4570,
    image: '/images/markets/mission-004-starship-orbit.jpg',
    oracle: 'SpaceX webcast',
  },
  {
    id: 'mission-roman',
    category: 'mission',
    title: 'Roman Space Telescope launches in 2026',
    blurb: 'Falcon Heavy slot tentatively booked for November.',
    resolvesAt: '2026-12-31',
    yes: 0.51,
    volume: 2840,
    image: '/images/markets/mission-002-roman-2026.jpg',
    oracle: 'NASA launch manifest',
  },
  {
    id: 'mission-change7',
    category: 'mission',
    title: "Chang'e-7 returns samples by Sep 30",
    blurb: 'Lunar south-pole sample-return — launch window open.',
    resolvesAt: '2026-09-30',
    yes: 0.40,
    volume: 1560,
    image: '/images/markets/mission-003-change7.jpg',
    oracle: 'CNSA / press release',
  },
  {
    id: 'mission-plato-ready',
    category: 'mission',
    title: 'ESA PLATO declared launch-ready before Dec 31',
    blurb: 'Exoplanet hunter — payload integration in Toulouse.',
    resolvesAt: '2026-12-31',
    yes: 0.46,
    volume: 1340,
    image: '/images/markets/mission-005-plato.jpg',
    oracle: 'ESA mission page',
  },

  // DISCOVERY
  {
    id: 'discovery-jwst-bio',
    category: 'discovery',
    title: 'JWST confirms biosignature on an exoplanet in 2026',
    blurb: 'K2-18b reanalysis + LHS 1140 b campaign in flight.',
    resolvesAt: '2026-12-31',
    yes: 0.14,
    volume: 9210,
    image: '/images/markets/discovery-001-jwst-bio.jpg',
    oracle: 'Peer-reviewed Nature/Science',
  },
  {
    id: 'discovery-ligo-merger',
    category: 'discovery',
    title: 'LIGO/Virgo detect another NS–NS merger by year end',
    blurb: 'Run O5 nominally producing 1 per 6 months.',
    resolvesAt: '2026-12-31',
    yes: 0.66,
    volume: 1480,
    image: '/images/markets/discovery-003-ligo-nsmerger.jpg',
    oracle: 'LIGO/Virgo GraceDB',
  },
  {
    id: 'discovery-gaia-dr4',
    category: 'discovery',
    title: 'Gaia DR4 data release before Q4',
    blurb: '2 billion stars, full radial-velocity catalogue.',
    resolvesAt: '2026-10-01',
    yes: 0.32,
    volume: 1010,
    image: '/images/markets/discovery-004-gaia-dr4.jpg',
    oracle: 'ESA Gaia archive',
  },
  {
    id: 'discovery-nobel-cosmo',
    category: 'discovery',
    title: 'Nobel Physics 2026 awarded to cosmology work',
    blurb: 'JWST early-galaxy results are favourites in Stockholm.',
    resolvesAt: '2026-10-15',
    yes: 0.28,
    volume: 860,
    image: '/images/markets/discovery-002-nobel-cosmo.jpg',
    oracle: 'Nobel committee announcement',
  },
  {
    id: 'discovery-laserseti',
    category: 'discovery',
    title: 'LaserSETI logs a confirmed pulsed candidate',
    blurb: 'Two-station coincidence under 24h verification.',
    resolvesAt: '2026-12-31',
    yes: 0.09,
    volume: 1620,
    image: '/images/markets/discovery-005-laserseti.jpg',
    oracle: 'SETI Institute press release',
  },

  // CRYPTO
  {
    id: 'crypto-btc-150k',
    category: 'crypto',
    title: 'BTC closes ≥ $150,000 by Aug 1',
    blurb: 'Spot ETF flows positive 7 of last 8 weeks.',
    resolvesAt: '2026-08-01',
    yes: 0.43,
    volume: 14520,
    image: '/images/markets/crypto-001-btc-100k.jpg',
    oracle: 'Coinbase 23:59 UTC close',
  },
  {
    id: 'crypto-sol-300',
    category: 'crypto',
    title: 'SOL ≥ $300 by Sep 30',
    blurb: 'Network hit 3.2k TPS daily avg last quarter.',
    resolvesAt: '2026-09-30',
    yes: 0.39,
    volume: 9870,
    image: '/images/markets/crypto-002-sol-300.jpg',
    oracle: 'Coinbase 23:59 UTC close',
  },
  {
    id: 'crypto-eth-flippening',
    category: 'crypto',
    title: 'ETH market cap > BTC at any 23:59 UTC close in 2026',
    blurb: 'Spread currently 2.1× — flippening would be historic.',
    resolvesAt: '2026-12-31',
    yes: 0.07,
    volume: 4230,
    image: '/images/markets/crypto-003-eth-flippening.jpg',
    oracle: 'CoinGecko close-of-day',
  },
  {
    id: 'crypto-stable-volume',
    category: 'crypto',
    title: 'Stablecoin daily volume > $300B before Q4',
    blurb: 'On-chain settlement up 40% YoY — Solana leads.',
    resolvesAt: '2026-10-01',
    yes: 0.58,
    volume: 2780,
    image: '/images/markets/crypto-004-stable-volume.png',
    oracle: 'Artemis / DefiLlama',
  },

  // SPORTS
  {
    id: 'sports-world-cup',
    category: 'sports',
    title: 'France wins 2026 FIFA World Cup',
    blurb: 'Tournament June 11 – July 19, US/CAN/MEX.',
    resolvesAt: '2026-07-19',
    yes: 0.21,
    volume: 11200,
    image: '/images/markets/sports-003-world-cup-host.jpg',
    oracle: 'FIFA official',
  },
  {
    id: 'sports-nba-finals',
    category: 'sports',
    title: 'Boston Celtics win 2026 NBA Finals',
    blurb: 'Up 2–1 in conference finals as of May 20.',
    resolvesAt: '2026-06-22',
    yes: 0.46,
    volume: 7340,
    image: '/images/markets/sports-002-nba-finals.jpg',
    oracle: 'NBA official',
  },
  {
    id: 'sports-cl-final',
    category: 'sports',
    title: 'UEFA Champions League final is decided in extra time',
    blurb: 'Munich, May 30 — historical 18% goes past 90.',
    resolvesAt: '2026-05-30',
    yes: 0.24,
    volume: 5180,
    image: '/images/markets/sports-001-cl-final.jpg',
    oracle: 'UEFA official',
  },
  {
    id: 'sports-f1-driver',
    category: 'sports',
    title: 'Max Verstappen wins 2026 F1 Drivers Championship',
    blurb: 'Currently +37 points clear after Imola.',
    resolvesAt: '2026-11-29',
    yes: 0.62,
    volume: 4620,
    image: '/images/markets/sports-004-f1-driver.jpg',
    oracle: 'FIA standings',
  },

  // TECH
  {
    id: 'tech-gpt5',
    category: 'tech',
    title: 'OpenAI ships GPT-5 publicly by Sep 1',
    blurb: 'Sam Altman teased "next major model" mid-summer.',
    resolvesAt: '2026-09-01',
    yes: 0.52,
    volume: 6620,
    image: '/images/markets/discovery-005-laserseti.jpg',
    oracle: 'OpenAI blog / pricing page',
  },
  {
    id: 'tech-apple-wwdc',
    category: 'tech',
    title: 'Apple announces AI-first iPhone at WWDC 2026',
    blurb: 'WWDC opens June 8 — rumors of on-device GPT tier.',
    resolvesAt: '2026-06-15',
    yes: 0.61,
    volume: 4180,
    image: '/images/markets/discovery-002-nobel-cosmo.jpg',
    oracle: 'WWDC keynote',
  },

  // WEATHER
  {
    id: 'weather-tbilisi-clear-week',
    category: 'weather',
    title: '≥ 3 clear nights in Tbilisi this week',
    blurb: 'Cloud cover < 30% between 22:00 and 02:00.',
    resolvesAt: '2026-05-28',
    yes: 0.58,
    volume: 720,
    image: '/images/markets/weather-001-tbilisi-clear-run.jpg',
    oracle: 'Open-Meteo',
  },
  {
    id: 'weather-perseids-clear',
    category: 'weather',
    title: 'Perseids viewing clear from Caucasus on Aug 12',
    blurb: 'Cloud cover < 40% at observing latitude.',
    resolvesAt: '2026-08-13',
    yes: 0.49,
    volume: 1830,
    image: '/images/markets/weather-005-perseids-europe.jpg',
    oracle: 'Open-Meteo',
  },
  {
    id: 'weather-tbilisi-warmday',
    category: 'weather',
    title: 'Tbilisi hits ≥ 32°C this week',
    blurb: 'Caucasus heat dome strengthening per ECMWF.',
    resolvesAt: '2026-05-30',
    yes: 0.64,
    volume: 540,
    image: '/images/markets/weather-001-tbilisi-warm-day.jpg',
    oracle: 'NOAA / Open-Meteo',
  },
  {
    id: 'weather-georgia-bortle2',
    category: 'weather',
    title: 'Bortle 2 night logged from Tusheti this season',
    blurb: 'SQM ≥ 21.7 mag/arcsec² reading verified.',
    resolvesAt: '2026-09-30',
    yes: 0.71,
    volume: 410,
    image: '/images/markets/weather-004-georgia-bortle2.jpg',
    oracle: 'SQM device upload',
  },

  // NATURE
  {
    id: 'nature-volcanic-eruption',
    category: 'nature',
    title: 'New VEI ≥ 3 volcanic eruption before Aug 1',
    blurb: 'Three candidates trending — Kilauea, Etna, Sakurajima.',
    resolvesAt: '2026-08-01',
    yes: 0.55,
    volume: 1290,
    image: '/images/markets/natural-003-new-volcanic-eruption.jpg',
    oracle: 'Smithsonian GVP',
  },
  {
    id: 'nature-reykjanes-swarm',
    category: 'nature',
    title: 'Reykjanes peninsula erupts again before Q4',
    blurb: 'Magma chamber refilling — IMO raised alert May 18.',
    resolvesAt: '2026-10-01',
    yes: 0.67,
    volume: 970,
    image: '/images/markets/natural-006-reykjanes-swarm.jpg',
    oracle: 'Icelandic Met Office',
  },
  {
    id: 'nature-m6-judging',
    category: 'nature',
    title: 'M6.0+ earthquake during judging week',
    blurb: 'USGS background rate ≈ 2.8 per week worldwide.',
    resolvesAt: '2026-06-01',
    yes: 0.83,
    volume: 1140,
    image: '/images/markets/natural-001-m6-judging-week.jpg',
    oracle: 'USGS catalog',
  },
  {
    id: 'nature-cyclone-named',
    category: 'nature',
    title: 'Named tropical cyclone in Atlantic before Jun 30',
    blurb: 'NHC season opens June 1. Last year had three by July.',
    resolvesAt: '2026-06-30',
    yes: 0.39,
    volume: 880,
    image: '/images/markets/natural-005-named-tropical-cyclone.jpg',
    oracle: 'NHC public advisory',
  },
];

const NEWS: NewsItem[] = [
  {
    id: 'news-1',
    source: 'NOAA SWPC',
    headline: 'AR3895 region grows to βγδ classification — flare watch upgraded',
    marketId: 'solar-xflare-jul',
    hoursAgo: 4,
  },
  {
    id: 'news-2',
    source: 'IMO',
    headline: 'Eta Aquariids late peak (May 28) — Halley trail still active',
    marketId: 'meteor-eta-aquariids-replay',
    hoursAgo: 9,
  },
  {
    id: 'news-3',
    source: 'NASA',
    headline: 'Artemis II static-fire passes; integrated test on schedule',
    marketId: 'mission-artemis-ii',
    hoursAgo: 16,
  },
  {
    id: 'news-4',
    source: 'COBS',
    headline: 'C/2025 R3 brightens to mag 6.5 — naked-eye window opening',
    marketId: 'comet-r3-naked-eye',
    hoursAgo: 22,
  },
  {
    id: 'news-5',
    source: 'Icelandic Met Office',
    headline: 'Reykjanes magma intrusion accelerates — eruption likely',
    marketId: 'nature-reykjanes-swarm',
    hoursAgo: 31,
  },
  {
    id: 'news-6',
    source: 'Open-Meteo',
    headline: 'Caucasus high-pressure ridge: 3 clear nights forecast over Tbilisi',
    marketId: 'weather-tbilisi-clear-week',
    hoursAgo: 38,
  },
];

const FAKE_BETTORS = [
  'astra_42', 'nika.eth', 'kalliope', 'm31_observer', 'photon7', 'sgr_a',
  'tycho', 'lyra_n', 'cosmonshop', 'darkfield', 'kepler9', 'sirius_a',
  'orion.gz', 'm42', 'ngc_628', 'rho.oph', 'caph', 'antares',
];

function daysUntil(iso: string): number {
  const d = new Date(iso).getTime();
  return Math.max(0, Math.round((d - TODAY.getTime()) / 86_400_000));
}

function countdown(iso: string): string {
  const days = daysUntil(iso);
  if (days === 0) return 'Resolves today';
  if (days === 1) return 'Resolves tomorrow';
  if (days < 7) return `Resolves in ${days} days`;
  if (days < 31) {
    const w = Math.ceil(days / 7);
    return `Resolves in ${w} ${w === 1 ? 'week' : 'weeks'}`;
  }
  if (days < 365) {
    const m = Math.ceil(days / 30);
    return `Resolves in ${m} ${m === 1 ? 'month' : 'months'}`;
  }
  return `Resolves ${new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatVolume(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(2)}k`;
  return String(n);
}

const STORAGE_KEY = 'stellar.markets.bets.v2';

interface Bet {
  marketId: string;
  side: 'yes' | 'no';
  stake: number;
  ts: number;
}

interface LiveBet {
  id: string;
  user: string;
  market: Market;
  side: 'yes' | 'no';
  stake: number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLiveBet(seed: number): LiveBet {
  const market = MARKETS[seed % MARKETS.length];
  const stakeBuckets = [10, 25, 50, 75, 100, 150, 200, 250, 500, 750, 1000];
  return {
    id: `lb-${seed}-${Math.random()}`,
    user: pick(FAKE_BETTORS),
    market,
    side: Math.random() < market.yes ? 'yes' : 'no',
    stake: pick(stakeBuckets),
  };
}

export default function MarketsPage() {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(50);
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [bets, setBets] = useState<Bet[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const seedRef = useRef(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBets(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bets));
    } catch {}
  }, [bets]);

  // Seed initial live bets + tick new ones in
  useEffect(() => {
    const initial: LiveBet[] = Array.from({ length: 14 }, (_, i) => generateLiveBet(i));
    seedRef.current = 14;
    setLiveBets(initial);

    const interval = setInterval(() => {
      seedRef.current += 1;
      setLiveBets(prev => [generateLiveBet(seedRef.current), ...prev].slice(0, 24));
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  const upcoming = useMemo(
    () => MARKETS
      .filter(m => new Date(m.resolvesAt).getTime() >= TODAY.getTime())
      .sort((a, b) => new Date(a.resolvesAt).getTime() - new Date(b.resolvesAt).getTime()),
    [],
  );

  const filtered = useMemo(
    () => filter === 'all' ? upcoming : upcoming.filter(m => m.category === filter),
    [filter, upcoming],
  );

  const featured = upcoming[0];
  const closingSoon = upcoming.slice(1, 7);

  const byCategory = useMemo(() => {
    const groups = new Map<Category, Market[]>();
    for (const m of filtered) {
      if (!groups.has(m.category)) groups.set(m.category, []);
      groups.get(m.category)!.push(m);
    }
    return Array.from(groups.entries());
  }, [filtered]);

  const totalStaked = bets.reduce((sum, b) => sum + b.stake, 0);

  function placeBet(marketId: string) {
    if (stake <= 0) return;
    setBets(prev => [{ marketId, side, stake, ts: Date.now() }, ...prev]);
    const m = MARKETS.find(x => x.id === marketId);
    setToast(`${stake}★ on ${side.toUpperCase()} — ${m?.title.slice(0, 40)}…`);
    setTimeout(() => setToast(null), 2400);
    setExpanded(null);
  }

  return (
    <PageTransition>
      <style jsx global>{`
        @keyframes marketsTicker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marketsBetIn {
          0%   { opacity: 0; transform: translateY(-6px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes marketsPulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.85); }
        }
        .markets-ticker-track {
          display: flex;
          gap: 10px;
          width: max-content;
          animation: marketsTicker 60s linear infinite;
        }
        .markets-ticker-track:hover { animation-play-state: paused; }
        .markets-live-row { animation: marketsBetIn 320ms ease-out both; }
        .markets-live-dot { animation: marketsPulseDot 1.6s ease-in-out infinite; }
        .markets-scrollx::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1
              className="font-display"
              style={{
                fontSize: 'clamp(2rem, 5vw, 2.75rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.01em',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              Sky Markets
            </h1>
            <p
              style={{
                color: 'var(--text-secondary)',
                marginTop: 6,
                fontSize: 14,
                maxWidth: 560,
              }}
            >
              Stake ★ Stars on celestial and earthbound outcomes. Resolves with
              public oracles — no degens, no leverage.
            </p>
          </div>
          <div
            className="hidden sm:flex flex-col items-end shrink-0"
            style={{
              padding: '10px 14px',
              border: '1px solid var(--border)',
              borderRadius: 12,
              background: 'var(--surface)',
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              My positions
            </span>
            <span style={{ fontSize: 18, color: 'var(--terracotta)', fontFamily: 'var(--font-mono, JetBrains Mono)', fontWeight: 600 }}>
              {totalStaked}★
            </span>
          </div>
        </div>

        {/* Live bets ticker */}
        <LiveBetsTicker bets={liveBets} />

        {/* Featured market */}
        {featured && (
          <FeaturedCard
            market={featured}
            stake={stake}
            side={side}
            setStake={setStake}
            setSide={setSide}
            onBet={() => placeBet(featured.id)}
          />
        )}

        {/* Closing-soon section */}
        <SectionHeader icon={<Clock3 size={14} strokeWidth={1.8} />} title="Closing soon" />
        <div className="mb-6 -mx-4 px-4 overflow-x-auto markets-scrollx" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 w-max">
            {closingSoon.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  setFilter(m.category);
                  setExpanded(m.id);
                  document.getElementById(`row-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className="text-left shrink-0 transition-all hover:scale-[1.02]"
                style={{
                  width: 240,
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: 'var(--surface)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {countdown(m.resolvesAt)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--yes)', fontFamily: 'var(--font-mono, JetBrains Mono)' }}>
                    {Math.round(m.yes * 100)}%
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {m.title}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* News section */}
        <SectionHeader icon={<Newspaper size={14} strokeWidth={1.8} />} title="Sky news" subtitle="What the oracles are saying" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
          {NEWS.map(n => {
            const m = n.marketId ? MARKETS.find(x => x.id === n.marketId) : undefined;
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (m) {
                    setFilter(m.category);
                    setExpanded(m.id);
                    document.getElementById(`row-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
                className="text-left transition-colors hover:bg-white/[0.03]"
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: 'var(--surface)',
                }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--terracotta)',
                    fontFamily: 'var(--font-mono, JetBrains Mono)',
                  }}>
                    {n.source}
                  </span>
                  <span style={{ width: 3, height: 3, borderRadius: 99, background: 'var(--text-faint)' }} />
                  <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{n.hoursAgo}h ago</span>
                  {m && (
                    <span className="ml-auto" style={{
                      fontSize: 9,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}>
                      → market
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.35 }}>
                  {n.headline}
                </div>
              </button>
            );
          })}
        </div>

        {/* Category chips */}
        <SectionHeader icon={<Flame size={14} strokeWidth={1.8} />} title="All markets" />
        <div className="mb-4 -mx-4 px-4 overflow-x-auto markets-scrollx" style={{ scrollbarWidth: 'none' }}>
          <div className="flex gap-2 w-max">
            {CATEGORIES.map(c => {
              const active = filter === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className="transition-colors"
                  style={{
                    padding: '8px 14px',
                    fontSize: 13,
                    borderRadius: 999,
                    border: `1px solid ${active ? 'var(--terracotta)' : 'var(--border)'}`,
                    background: active ? 'var(--accent-dim)' : 'var(--surface)',
                    color: active ? 'var(--terracotta)' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ marginRight: 6 }}>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Markets grouped by category */}
        {byCategory.map(([cat, list]) => {
          const meta = CATEGORIES.find(c => c.key === cat);
          return (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <span style={{ fontSize: 13 }}>{meta?.emoji}</span>
                <h3 className="font-display" style={{
                  fontSize: 13,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-primary)',
                  margin: 0,
                }}>
                  {meta?.label}
                </h3>
                <span style={{
                  fontSize: 10,
                  color: 'var(--text-faint)',
                  fontFamily: 'var(--font-mono, JetBrains Mono)',
                }}>
                  {list.length}
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>
              <div className="flex flex-col gap-2">
                {list.map(m => (
                  <MarketRow
                    key={m.id}
                    market={m}
                    expanded={expanded === m.id}
                    onToggle={() => setExpanded(expanded === m.id ? null : m.id)}
                    stake={stake}
                    setStake={setStake}
                    side={side}
                    setSide={setSide}
                    onBet={() => placeBet(m.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* My active bets */}
        {bets.length > 0 && (
          <div className="mt-10">
            <h2
              className="font-display"
              style={{
                fontSize: 20,
                color: 'var(--text-primary)',
                marginBottom: 12,
              }}
            >
              My active positions
            </h2>
            <div className="flex flex-col gap-2">
              {bets.slice(0, 8).map((b, i) => {
                const m = MARKETS.find(x => x.id === b.marketId);
                if (!m) return null;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3"
                    style={{
                      padding: '10px 14px',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      background: 'var(--surface)',
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {countdown(m.resolvesAt)}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        letterSpacing: '0.05em',
                        borderRadius: 6,
                        background: b.side === 'yes' ? 'var(--yes-dim)' : 'var(--no-dim)',
                        border: `1px solid ${b.side === 'yes' ? 'var(--yes-border)' : 'var(--no-border)'}`,
                        color: b.side === 'yes' ? 'var(--yes)' : 'var(--no)',
                      }}
                    >
                      {b.side.toUpperCase()} · {b.stake}★
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footnote */}
        <p
          style={{
            marginTop: 32,
            fontSize: 11,
            color: 'var(--text-faint)',
            textAlign: 'center',
          }}
        >
          Devnet preview. Stakes are demo Stars. Live oracle resolution wires up post-hackathon.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          style={{
            padding: '10px 16px',
            fontSize: 13,
            borderRadius: 10,
            background: 'var(--canvas)',
            border: '1px solid var(--terracotta)',
            color: 'var(--text-primary)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}
    </PageTransition>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon?: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-3 mt-7 mb-3">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: 'var(--terracotta)' }}>{icon}</span>}
        <h2 className="font-display" style={{
          fontSize: 13,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          {title}
        </h2>
      </div>
      {subtitle && (
        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{subtitle}</span>
      )}
      <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
    </div>
  );
}

function LiveBetsTicker({ bets }: { bets: LiveBet[] }) {
  if (bets.length === 0) return null;
  // Duplicate the list so the marquee loops seamlessly
  const doubled = [...bets.slice(0, 12), ...bets.slice(0, 12)];

  return (
    <div
      className="relative mb-5 overflow-hidden"
      style={{
        padding: '10px 14px',
        border: '1px solid var(--border)',
        borderRadius: 14,
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--canvas) 100%)',
      }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <span className="markets-live-dot" style={{
          width: 8, height: 8, borderRadius: 99,
          background: 'var(--yes)',
          boxShadow: '0 0 0 3px rgba(52,211,153,0.15)',
        }} />
        <span style={{
          fontSize: 10,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono, JetBrains Mono)',
        }}>
          Live · {bets.length} active stakes
        </span>
        <Radio size={11} strokeWidth={1.8} style={{ color: 'var(--text-faint)', marginLeft: 'auto' }} />
      </div>

      <div className="overflow-hidden" style={{
        maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
      }}>
        <div className="markets-ticker-track">
          {doubled.map((b, i) => (
            <div
              key={`${b.id}-${i}`}
              className="markets-live-row flex items-center gap-2 shrink-0"
              style={{
                padding: '7px 12px',
                borderRadius: 999,
                border: `1px solid ${b.side === 'yes' ? 'var(--yes-border)' : 'var(--no-border)'}`,
                background: b.side === 'yes' ? 'var(--yes-dim)' : 'var(--no-dim)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, JetBrains Mono)',
                fontSize: 11,
              }}>
                @{b.user}
              </span>
              <span style={{
                color: b.side === 'yes' ? 'var(--yes)' : 'var(--no)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.05em',
              }}>
                {b.side === 'yes' ? '▲ YES' : '▼ NO'}
              </span>
              <span style={{
                color: 'var(--terracotta)',
                fontFamily: 'var(--font-mono, JetBrains Mono)',
                fontWeight: 600,
              }}>
                {b.stake}★
              </span>
              <span style={{
                color: 'var(--text-secondary)',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {b.market.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedCard({
  market,
  stake,
  side,
  setStake,
  setSide,
  onBet,
}: {
  market: Market;
  stake: number;
  side: 'yes' | 'no';
  setStake: (n: number) => void;
  setSide: (s: 'yes' | 'no') => void;
  onBet: () => void;
}) {
  const yesPct = Math.round(market.yes * 100);
  const cat = CATEGORIES.find(c => c.key === market.category);
  const payoutYes = side === 'yes' ? Math.round(stake / market.yes) : 0;
  const payoutNo = side === 'no' ? Math.round(stake / (1 - market.yes)) : 0;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        borderRadius: 18,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <div className="relative h-44 sm:h-56">
        <Image
          src={market.image}
          alt={market.title}
          fill
          sizes="(max-width: 800px) 100vw, 800px"
          style={{ objectFit: 'cover' }}
          priority
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(10,23,53,0.1) 0%, rgba(10,23,53,0.6) 60%, rgba(10,23,53,0.95) 100%)',
          }}
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            style={{
              padding: '4px 10px',
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--text-primary)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {cat?.emoji} Featured
          </span>
          <span
            style={{
              padding: '4px 10px',
              fontSize: 11,
              borderRadius: 999,
              background: 'rgba(0,0,0,0.4)',
              color: 'var(--text-secondary)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {countdown(market.resolvesAt)}
          </span>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h2
            className="font-display"
            style={{
              fontSize: 'clamp(1.25rem, 3vw, 1.6rem)',
              lineHeight: 1.15,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {market.title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              marginTop: 6,
            }}
          >
            {market.blurb}
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <SplitOdds yes={market.yes} />

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2 flex-1">
            <SideButton variant="yes" active={side === 'yes'} pct={yesPct} onClick={() => setSide('yes')} />
            <SideButton variant="no" active={side === 'no'} pct={100 - yesPct} onClick={() => setSide('no')} />
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              min={1}
              value={stake}
              onChange={e => setStake(Math.max(1, parseInt(e.target.value) || 0))}
              style={{
                width: 90,
                padding: '12px 12px',
                fontSize: 14,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono, JetBrains Mono)',
              }}
            />
            <button
              onClick={onBet}
              style={{
                padding: '12px 18px',
                fontSize: 14,
                borderRadius: 10,
                background: 'var(--terracotta)',
                color: '#0A1735',
                border: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Stake {stake}★
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
          <span>Pool {formatVolume(market.volume)}★ · Oracle: {market.oracle}</span>
          <span>
            If win:{' '}
            <span style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-mono, JetBrains Mono)' }}>
              {side === 'yes' ? payoutYes : payoutNo}★
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SideButton({
  variant,
  active,
  pct,
  onClick,
  compact = false,
}: {
  variant: 'yes' | 'no';
  active: boolean;
  pct: number;
  onClick: () => void;
  compact?: boolean;
}) {
  const isYes = variant === 'yes';
  const color = isYes ? 'var(--yes)' : 'var(--no)';
  const dim = isYes ? 'var(--yes-dim)' : 'var(--no-dim)';
  const border = isYes ? 'var(--yes-border)' : 'var(--no-border)';
  const Icon = isYes ? TrendingUp : TrendingDown;
  const label = isYes ? 'YES' : 'NO';

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden flex items-center justify-center gap-2 transition-all"
      style={{
        flex: 1,
        padding: compact ? '9px 10px' : '12px 14px',
        fontSize: compact ? 13 : 14,
        borderRadius: 10,
        background: active
          ? `linear-gradient(180deg, ${dim}, ${dim})`
          : 'transparent',
        border: `1px solid ${active ? border : 'var(--border)'}`,
        color: active ? color : 'var(--text-secondary)',
        fontWeight: 600,
        boxShadow: active
          ? `inset 0 1px 0 ${border}, 0 4px 12px -6px ${color}`
          : 'none',
        transform: active ? 'translateY(-1px)' : 'none',
      }}
    >
      <Icon size={compact ? 14 : 16} strokeWidth={2.2} />
      <span style={{ letterSpacing: '0.04em' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-mono, JetBrains Mono)',
        fontSize: compact ? 11 : 12,
        opacity: active ? 1 : 0.7,
      }}>
        {pct}%
      </span>
    </button>
  );
}

function SplitOdds({ yes }: { yes: number }) {
  const yesPct = Math.round(yes * 100);
  const noPct = 100 - yesPct;
  return (
    <div
      className="relative flex h-9 overflow-hidden"
      style={{ borderRadius: 8, background: 'var(--canvas)' }}
    >
      <div
        style={{
          width: `${yesPct}%`,
          background: 'linear-gradient(to right, rgba(52,211,153,0.18), rgba(52,211,153,0.32))',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 12,
          color: 'var(--yes)',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-mono, JetBrains Mono)',
          transition: 'width 600ms ease-out',
        }}
      >
        YES {yesPct}%
      </div>
      <div
        style={{
          flex: 1,
          background: 'linear-gradient(to left, rgba(248,113,113,0.18), rgba(248,113,113,0.32))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: 12,
          color: 'var(--no)',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--font-mono, JetBrains Mono)',
        }}
      >
        {noPct}% NO
      </div>
    </div>
  );
}

function MarketRow({
  market,
  expanded,
  onToggle,
  stake,
  setStake,
  side,
  setSide,
  onBet,
}: {
  market: Market;
  expanded: boolean;
  onToggle: () => void;
  stake: number;
  setStake: (n: number) => void;
  side: 'yes' | 'no';
  setSide: (s: 'yes' | 'no') => void;
  onBet: () => void;
}) {
  const yesPct = Math.round(market.yes * 100);
  const cat = CATEGORIES.find(c => c.key === market.category);
  const payout = side === 'yes' ? Math.round(stake / market.yes) : Math.round(stake / (1 - market.yes));

  return (
    <div
      id={`row-${market.id}`}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--surface)',
        overflow: 'hidden',
        transition: 'background 200ms',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="relative shrink-0"
          style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden' }}
        >
          <Image
            src={market.image}
            alt=""
            fill
            sizes="64px"
            style={{ objectFit: 'cover' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {cat?.emoji} {cat?.label}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {countdown(market.resolvesAt)}
            </span>
          </div>
          <div
            style={{
              fontSize: 14,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
            }}
          >
            {market.title}
          </div>
        </div>
        <div className="shrink-0 hidden sm:block" style={{ width: 140 }}>
          <SplitOdds yes={market.yes} />
        </div>
        <div className="shrink-0 sm:hidden" style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, color: 'var(--yes)', fontFamily: 'var(--font-mono, JetBrains Mono)', fontWeight: 600 }}>
            {yesPct}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>YES</div>
        </div>
      </button>

      {expanded && (
        <div
          className="p-3 sm:p-4 border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex gap-2 flex-1">
              <SideButton variant="yes" active={side === 'yes'} pct={yesPct} onClick={() => setSide('yes')} compact />
              <SideButton variant="no" active={side === 'no'} pct={100 - yesPct} onClick={() => setSide('no')} compact />
            </div>
            <div className="flex gap-2">
              {[10, 50, 100, 500].map(q => (
                <button
                  key={q}
                  onClick={() => setStake(q)}
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    borderRadius: 8,
                    background: stake === q ? 'var(--accent-dim)' : 'transparent',
                    border: `1px solid ${stake === q ? 'var(--terracotta)' : 'var(--border)'}`,
                    color: stake === q ? 'var(--terracotta)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono, JetBrains Mono)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={onBet}
              style={{
                padding: '10px 16px',
                fontSize: 13,
                borderRadius: 8,
                background: 'var(--terracotta)',
                color: '#0A1735',
                border: 'none',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              Stake {stake}★
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>{market.blurb}</span>
            <span>
              Pool {formatVolume(market.volume)}★ · win{' '}
              <span style={{ color: 'var(--terracotta)', fontFamily: 'var(--font-mono, JetBrains Mono)' }}>
                {payout}★
              </span>
            </span>
          </div>
          <div className="mt-2" style={{ fontSize: 10, color: 'var(--text-faint)' }}>
            Resolves: {market.oracle}
          </div>
        </div>
      )}
    </div>
  );
}
