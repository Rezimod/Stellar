import OpenAI from 'openai'
import { fetchSkyForecast } from './sky-data'
import { calculateSkyScore } from './sky-score'
import { getVisiblePlanets } from './planets'
import { fetchTopSpaceNews, type SpaceNewsItem } from './space-news'

export type TweetKind = 'sky_verdict' | 'space_news' | 'product_spotlight' | 'astro_fact'

export interface DraftedTweet {
  kind: TweetKind
  body: string
  context: Record<string, unknown>
}

const TBILISI = { lat: 41.6941, lng: 44.8337, label: 'Tbilisi' }

const BRAND_SYSTEM = `You write tweets for Stellarr (@stellarrclub) — an astronomy app for telescope owners.
Voice: patient, precise, earned. Like NASA, not like a crypto influencer.
Rules:
- Max 270 characters total (leave room).
- Plain text. No emojis unless one is genuinely informative (e.g. a moon phase). Default: zero emojis.
- No hashtags unless explicitly asked.
- Never hype. Never use words like "moon", "rocket", "bullish", "wagmi", "to the moon".
- Numbers earn their place — only include a number if it's measured/real.
- One idea per tweet. End with concrete pull (a link, a verdict, a target).
- Never start with "Did you know" or "Excited to share". Start with the substance.`

function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY missing')
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function generate(userPrompt: string): Promise<string> {
  const res = await openai().chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    max_tokens: 200,
    messages: [
      { role: 'system', content: BRAND_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
  })
  const text = res.choices[0]?.message?.content?.trim() ?? ''
  return text.replace(/^["']|["']$/g, '').slice(0, 280)
}

async function buildSkyVerdict(): Promise<DraftedTweet> {
  const days = await fetchSkyForecast(TBILISI.lat, TBILISI.lng)
  const tonight = days[0]
  const nightHours = tonight?.hours?.filter((h) => {
    const hr = new Date(h.time).getHours()
    return hr >= 21 || hr <= 3
  }) ?? []
  const sample = nightHours.length ? nightHours : tonight?.hours?.slice(-6) ?? []
  const avg = (k: keyof typeof sample[number]) =>
    sample.reduce((s, h) => s + (h[k] as number), 0) / Math.max(1, sample.length)
  const score = calculateSkyScore({
    cloudCover: avg('cloudCover'),
    visibility: avg('visibility'),
    humidity: avg('humidity'),
    windSpeed: avg('wind'),
  })
  const planets = getVisiblePlanets(TBILISI.lat, TBILISI.lng, new Date())
    .filter((p) => p.visible && p.altitude > 10 && p.magnitude < 3)
    .slice(0, 3)
  const planetLine = planets.length
    ? planets.map((p) => `${p.name} (${Math.round(p.altitude)}° ${p.azimuthDir})`).join(', ')
    : 'no bright planets above 10° tonight'
  const verdict = score.score >= 70 ? 'Go' : score.score >= 50 ? 'Maybe' : score.score >= 30 ? 'Marginal' : 'Skip'

  const body = await generate(
    `Write tonight's sky verdict for Tbilisi.
Data:
- Verdict: ${verdict}
- Score: ${score.score}/100 (${score.grade})
- Cloud cover: ${Math.round(avg('cloudCover'))}%
- Wind: ${Math.round(avg('wind'))} m/s
- Up tonight: ${planetLine}

Write one tweet that leads with the verdict in one word, then gives the why in one sentence and the best target. End with: stellarr.club/sky`,
  )
  return {
    kind: 'sky_verdict',
    body,
    context: { score: score.score, grade: score.grade, verdict, planets: planets.map((p) => p.name) },
  }
}

async function buildSpaceNews(): Promise<DraftedTweet> {
  const news = await fetchTopSpaceNews(6)
  if (!news.length) throw new Error('No space news available')
  const pick = pickBestNews(news)
  const body = await generate(
    `Write a tweet about this space story. Lead with the fact, not the source.
Title: ${pick.title}
Summary: ${pick.summary.slice(0, 500)}
Source: ${pick.source}

One sentence on what happened, one on why it matters to amateur astronomers. End with the link: ${pick.url}`,
  )
  return { kind: 'space_news', body, context: { url: pick.url, source: pick.source, title: pick.title } }
}

function pickBestNews(news: SpaceNewsItem[]): SpaceNewsItem {
  const keywords = ['jwst', 'webb', 'hubble', 'eclipse', 'comet', 'aurora', 'meteor', 'nebula', 'galaxy', 'pluto', 'mars', 'saturn', 'jupiter', 'moon']
  for (const n of news) {
    const hay = `${n.title} ${n.summary}`.toLowerCase()
    if (keywords.some((k) => hay.includes(k))) return n
  }
  return news[0]
}

const PRODUCT_SPOTLIGHTS = [
  {
    name: 'ASTRA',
    pitch: 'an AI companion that knows tonight\'s sky, your scope, and what you can actually see from where you stand',
    url: 'https://stellarr.club/chat',
  },
  {
    name: '7-day sky forecast',
    pitch: 'cloud cover, seeing, humidity, and moon phase scored into one verdict per night so you stop guessing',
    url: 'https://stellarr.club/sky',
  },
  {
    name: 'Discovery Attestations',
    pitch: 'verified observations minted on-chain. Proof you saw it, owned by you, not a platform',
    url: 'https://stellarr.club/observe',
  },
  {
    name: 'Name a Star',
    pitch: 'pick a real star from the Hipparcos catalog, name it, mint the certificate. The name is yours forever',
    url: 'https://stellarr.club/star',
  },
  {
    name: 'Stellar Field',
    pitch: 'an offline Android app for dark-sky sites. AI companion runs on-device. No signal needed',
    url: 'https://stellarr.club/field',
  },
]

async function buildProductSpotlight(): Promise<DraftedTweet> {
  const idx = Math.floor((Date.now() / (1000 * 60 * 60 * 24)) % PRODUCT_SPOTLIGHTS.length)
  const pick = PRODUCT_SPOTLIGHTS[idx]
  const body = await generate(
    `Write a tweet about a Stellarr feature. Don't sound like marketing.
Feature: ${pick.name}
What it is: ${pick.pitch}
Link: ${pick.url}

Open with the concrete problem it solves. One line on how it works. End with the link.`,
  )
  return { kind: 'product_spotlight', body, context: { feature: pick.name, url: pick.url } }
}

const MESSIER_TARGETS = [
  { id: 'M13', name: 'Hercules Cluster', kind: 'globular cluster', minScope: '4-inch', note: 'best summer target — 300,000 stars packed into a fuzzy ball', constellation: 'Hercules' },
  { id: 'M31', name: 'Andromeda Galaxy', kind: 'spiral galaxy', minScope: 'binoculars', note: '2.5 million light years away — the farthest thing visible to the naked eye', constellation: 'Andromeda' },
  { id: 'M42', name: 'Orion Nebula', kind: 'emission nebula', minScope: 'binoculars', note: 'a stellar nursery you can resolve in any telescope', constellation: 'Orion' },
  { id: 'M45', name: 'Pleiades', kind: 'open cluster', minScope: 'naked eye', note: 'seven bright sisters wreathed in faint blue nebulosity at higher aperture', constellation: 'Taurus' },
  { id: 'M51', name: 'Whirlpool Galaxy', kind: 'interacting spiral', minScope: '6-inch', note: 'two galaxies mid-collision, spiral arms visible from dark sites', constellation: 'Canes Venatici' },
  { id: 'M57', name: 'Ring Nebula', kind: 'planetary nebula', minScope: '4-inch', note: 'a perfect smoke ring blown off a dying star', constellation: 'Lyra' },
  { id: 'M81', name: 'Bode\'s Galaxy', kind: 'spiral galaxy', minScope: '4-inch', note: 'pairs with M82 in the same low-power field — a galactic duo', constellation: 'Ursa Major' },
  { id: 'M104', name: 'Sombrero Galaxy', kind: 'edge-on spiral', minScope: '6-inch', note: 'a dust lane slices it clean through the middle', constellation: 'Virgo' },
  { id: 'M27', name: 'Dumbbell Nebula', kind: 'planetary nebula', minScope: '4-inch', note: 'an hourglass of expanding gas — easy summer target', constellation: 'Vulpecula' },
  { id: 'M16', name: 'Eagle Nebula', kind: 'emission nebula', minScope: '6-inch', note: 'home to the Pillars of Creation — Hubble\'s most famous image', constellation: 'Serpens' },
  { id: 'M8', name: 'Lagoon Nebula', kind: 'emission nebula', minScope: 'binoculars', note: 'the brightest summer nebula in the Milky Way core', constellation: 'Sagittarius' },
  { id: 'M22', name: 'Sagittarius Cluster', kind: 'globular cluster', minScope: 'binoculars', note: 'one of the closest globulars — resolves into stars in a 6-inch', constellation: 'Sagittarius' },
  { id: 'M1', name: 'Crab Nebula', kind: 'supernova remnant', minScope: '4-inch', note: 'the wreckage of a star that exploded in 1054 AD — recorded by Chinese astronomers', constellation: 'Taurus' },
  { id: 'M101', name: 'Pinwheel Galaxy', kind: 'face-on spiral', minScope: '6-inch', note: 'huge and faint — needs dark skies, rewards patience', constellation: 'Ursa Major' },
  { id: 'M11', name: 'Wild Duck Cluster', kind: 'open cluster', minScope: 'small scope', note: 'a tight V of stars that looks like a flock in flight', constellation: 'Scutum' },
  { id: 'NGC 869/884', name: 'Double Cluster', kind: 'open clusters', minScope: 'binoculars', note: 'two open clusters side by side — best in low magnification', constellation: 'Perseus' },
  { id: 'NGC 7000', name: 'North America Nebula', kind: 'emission nebula', minScope: 'wide-field', note: 'shaped exactly like the continent it\'s named for', constellation: 'Cygnus' },
  { id: 'M33', name: 'Triangulum Galaxy', kind: 'face-on spiral', minScope: 'binoculars', note: 'closer than Andromeda but harder — needs truly dark skies', constellation: 'Triangulum' },
  { id: 'M97', name: 'Owl Nebula', kind: 'planetary nebula', minScope: '6-inch', note: 'two dark "eyes" stare back from a faint disk', constellation: 'Ursa Major' },
  { id: 'M82', name: 'Cigar Galaxy', kind: 'starburst galaxy', minScope: '4-inch', note: 'gas blasted out by a starburst tearing through its core', constellation: 'Ursa Major' },
]

async function buildAstroFact(): Promise<DraftedTweet> {
  const idx = Math.floor((Date.now() / (1000 * 60 * 60 * 24)) % MESSIER_TARGETS.length)
  const pick = MESSIER_TARGETS[idx]
  const body = await generate(
    `Write a tweet about a deep-sky target.
Target: ${pick.id} — ${pick.name}
Type: ${pick.kind}
Constellation: ${pick.constellation}
Minimum scope: ${pick.minScope}
What's interesting: ${pick.note}

Open with what it is. One line on what scope you need and what you'll see. End with: stellarr.club/learn`,
  )
  return {
    kind: 'astro_fact',
    body,
    context: { target: pick.id, name: pick.name, constellation: pick.constellation },
  }
}

const BUILDERS: Record<TweetKind, () => Promise<DraftedTweet>> = {
  sky_verdict: buildSkyVerdict,
  space_news: buildSpaceNews,
  product_spotlight: buildProductSpotlight,
  astro_fact: buildAstroFact,
}

const ROTATION: TweetKind[] = ['sky_verdict', 'space_news', 'product_spotlight', 'astro_fact']

export function pickKindForToday(date = new Date()): TweetKind {
  const day = Math.floor(date.getTime() / (1000 * 60 * 60 * 24))
  return ROTATION[day % ROTATION.length]
}

export async function draftTweet(kind?: TweetKind): Promise<DraftedTweet> {
  const k = kind ?? pickKindForToday()
  return BUILDERS[k]()
}
