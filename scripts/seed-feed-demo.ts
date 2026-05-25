import { config as loadEnv } from 'dotenv'
import { createHash } from 'node:crypto'
import { Keypair } from '@solana/web3.js'
import { eq, inArray } from 'drizzle-orm'
import { getDb } from '../src/lib/db'
import { feedComments, feedPosts, feedReactions, feedShares, users } from '../src/lib/schema'

loadEnv({ path: '.env.local' })
loadEnv()

type Rank = 'Stargazer' | 'Observer' | 'Pathfinder' | 'Celestial'
type Reaction = 'like' | 'love' | 'wow' | 'sad' | 'star' | 'rocket' | 'galaxy'

type DemoPost = {
  key: string
  author: string
  rank: Rank
  target: string
  imageUrl: string
  body: string
  createdAt: string
  observationLat: string
  observationLon: string
  observationBortle: number
  shareCount: number
}

const IMAGES = {
  moon: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/FullMoon2010.jpg',
  jupiter: 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter_OPAL_2024.png',
  saturn: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Saturn_during_Equinox.jpg/3840px-Saturn_during_Equinox.jpg',
  andromeda: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Andromeda_Galaxy_2025.png/3840px-Andromeda_Galaxy_2025.png',
  orion: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg/3840px-Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg',
  pleiades: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pleiades_large.jpg/3840px-Pleiades_large.jpg',
  eagle: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Eagle_Nebula_from_ESO.jpg/3840px-Eagle_Nebula_from_ESO.jpg',
  crab: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crab_Nebula.jpg/3840px-Crab_Nebula.jpg',
  whirlpool: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Messier51_sRGB.jpg/3840px-Messier51_sRGB.jpg',
  lagoon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/VST_images_the_Lagoon_Nebula.jpg/3840px-VST_images_the_Lagoon_Nebula.jpg',
  ring: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Webb_captures_detailed_beauty_of_Ring_Nebula_%28NIRCam_image%29_%28weic2320b%29.jpg/3840px-Webb_captures_detailed_beauty_of_Ring_Nebula_%28NIRCam_image%29_%28weic2320b%29.jpg',
  veil: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Veil_Nebula_-_NGC6960.jpg/3840px-Veil_Nebula_-_NGC6960.jpg',
} as const

const POSTS: DemoPost[] = [
  {
    key: '01',
    author: 'Giorgi M.',
    rank: 'Stargazer',
    target: 'Moon',
    imageUrl: IMAGES.moon,
    body: 'Quick eyepiece phone shot before the clouds closed in. Foreseen 80mm gave a surprisingly sharp terminator tonight.',
    createdAt: '2026-05-01T18:42:00Z',
    observationLat: '41.72°',
    observationLon: '44.83°',
    observationBortle: 6,
    shareCount: 1,
  },
  {
    key: '02',
    author: 'Nino K.',
    rank: 'Observer',
    target: 'Jupiter',
    imageUrl: IMAGES.jupiter,
    body: 'First clean stack from the balcony this month. The belts were steady for a few minutes and I finally caught that calmer moment.',
    createdAt: '2026-05-01T20:18:00Z',
    observationLat: '41.70°',
    observationLon: '44.79°',
    observationBortle: 7,
    shareCount: 2,
  },
  {
    key: '03',
    author: 'Luka T.',
    rank: 'Pathfinder',
    target: 'Saturn',
    imageUrl: IMAGES.saturn,
    body: 'Not the highest altitude yet, but the ring shape was already obvious in the 127 Mak. Worth freezing my hands for this one.',
    createdAt: '2026-05-02T19:05:00Z',
    observationLat: '41.69°',
    observationLon: '44.81°',
    observationBortle: 6,
    shareCount: 1,
  },
  {
    key: '04',
    author: 'Ana D.',
    rank: 'Stargazer',
    target: 'Andromeda Galaxy',
    imageUrl: IMAGES.andromeda,
    body: 'Thirty minutes of careful tracking and the dust lanes finally started to show. This is my cleanest M31 frame so far.',
    createdAt: '2026-05-02T22:11:00Z',
    observationLat: '41.74°',
    observationLon: '44.76°',
    observationBortle: 5,
    shareCount: 3,
  },
  {
    key: '05',
    author: 'Saba V.',
    rank: 'Observer',
    target: 'Orion Nebula',
    imageUrl: IMAGES.orion,
    body: 'Older winter data, freshly processed tonight. I softened the stars a little and kept the core under control this time.',
    createdAt: '2026-05-03T18:56:00Z',
    observationLat: '41.73°',
    observationLon: '44.84°',
    observationBortle: 5,
    shareCount: 2,
  },
  {
    key: '06',
    author: 'Mariam G.',
    rank: 'Stargazer',
    target: 'Pleiades',
    imageUrl: IMAGES.pleiades,
    body: 'Seven Sisters over a hazy horizon. I almost packed up early, then the sky opened for twenty quiet minutes.',
    createdAt: '2026-05-03T21:24:00Z',
    observationLat: '41.71°',
    observationLon: '44.82°',
    observationBortle: 6,
    shareCount: 1,
  },
  {
    key: '07',
    author: 'Irakli B.',
    rank: 'Pathfinder',
    target: 'Eagle Nebula',
    imageUrl: IMAGES.eagle,
    body: 'This one needed more patience than gear. Narrowband blend from two nights and finally the pillars feel properly separated.',
    createdAt: '2026-05-04T20:09:00Z',
    observationLat: '41.65°',
    observationLon: '44.88°',
    observationBortle: 4,
    shareCount: 4,
  },
  {
    key: '08',
    author: 'Elene Z.',
    rank: 'Observer',
    target: 'Crab Nebula',
    imageUrl: IMAGES.crab,
    body: 'Very faint in the raw frames, but the structure came out after a careful stretch. Small target, huge reward.',
    createdAt: '2026-05-04T22:37:00Z',
    observationLat: '41.78°',
    observationLon: '44.75°',
    observationBortle: 5,
    shareCount: 1,
  },
  {
    key: '09',
    author: 'Davit N.',
    rank: 'Stargazer',
    target: 'Whirlpool Galaxy',
    imageUrl: IMAGES.whirlpool,
    body: 'First time resolving both cores with my own setup. Guiding was rough early on, but the last stack saved the session.',
    createdAt: '2026-05-05T19:44:00Z',
    observationLat: '41.75°',
    observationLon: '44.90°',
    observationBortle: 4,
    shareCount: 2,
  },
  {
    key: '10',
    author: 'Salome R.',
    rank: 'Observer',
    target: 'Lagoon Nebula',
    imageUrl: IMAGES.lagoon,
    body: 'Color balance still needs work, but I love how much texture came through in the brighter lanes around the core.',
    createdAt: '2026-05-05T21:02:00Z',
    observationLat: '41.68°',
    observationLon: '44.78°',
    observationBortle: 5,
    shareCount: 2,
  },
  {
    key: '11',
    author: 'Mate P.',
    rank: 'Pathfinder',
    target: 'Ring Nebula',
    imageUrl: IMAGES.ring,
    body: 'Tiny target, tiny crop, huge smile. The Ring was clean enough tonight that even the short exposures held detail.',
    createdAt: '2026-05-06T18:49:00Z',
    observationLat: '41.77°',
    observationLon: '44.80°',
    observationBortle: 5,
    shareCount: 3,
  },
  {
    key: '12',
    author: 'Keti J.',
    rank: 'Stargazer',
    target: 'Veil Nebula',
    imageUrl: IMAGES.veil,
    body: 'Wide field from the outskirts of Tbilisi. The filament shape stayed delicate even after I pushed the contrast.',
    createdAt: '2026-05-06T22:26:00Z',
    observationLat: '41.67°',
    observationLon: '44.92°',
    observationBortle: 4,
    shareCount: 1,
  },
  {
    key: '13',
    author: 'Temur A.',
    rank: 'Observer',
    target: 'Moon',
    imageUrl: IMAGES.moon,
    body: 'Tried a lower ISO and shorter burst tonight. The crater walls near the shadow line look much cleaner than my last attempt.',
    createdAt: '2026-05-07T18:31:00Z',
    observationLat: '41.70°',
    observationLon: '44.83°',
    observationBortle: 6,
    shareCount: 2,
  },
  {
    key: '14',
    author: 'Sofi L.',
    rank: 'Stargazer',
    target: 'Jupiter',
    imageUrl: IMAGES.jupiter,
    body: 'Seeing was shaky for most of the session, but one short clip had enough detail to keep. Happy with the color on this one.',
    createdAt: '2026-05-07T20:14:00Z',
    observationLat: '41.69°',
    observationLon: '44.86°',
    observationBortle: 7,
    shareCount: 1,
  },
  {
    key: '15',
    author: 'Levan S.',
    rank: 'Pathfinder',
    target: 'Saturn',
    imageUrl: IMAGES.saturn,
    body: 'Quick capture between gusts. The rings are still low for me, but the shape came through better than last week.',
    createdAt: '2026-05-08T19:08:00Z',
    observationLat: '41.74°',
    observationLon: '44.79°',
    observationBortle: 6,
    shareCount: 2,
  },
  {
    key: '16',
    author: 'Tata K.',
    rank: 'Observer',
    target: 'Andromeda Galaxy',
    imageUrl: IMAGES.andromeda,
    body: 'Still my favorite object to revisit. I tightened the crop this time and the outer glow feels much more balanced.',
    createdAt: '2026-05-08T22:03:00Z',
    observationLat: '41.80°',
    observationLon: '44.85°',
    observationBortle: 4,
    shareCount: 3,
  },
  {
    key: '17',
    author: 'Guga M.',
    rank: 'Stargazer',
    target: 'Orion Nebula',
    imageUrl: IMAGES.orion,
    body: 'I know it is a classic, but I still stop every time the wings of M42 show up in a single stretch like this.',
    createdAt: '2026-05-09T18:58:00Z',
    observationLat: '41.72°',
    observationLon: '44.88°',
    observationBortle: 5,
    shareCount: 1,
  },
  {
    key: '18',
    author: 'Nia C.',
    rank: 'Observer',
    target: 'Pleiades',
    imageUrl: IMAGES.pleiades,
    body: 'Blue reflection came through more gently than I expected. This was just a small stack before packing the rig away.',
    createdAt: '2026-05-09T21:31:00Z',
    observationLat: '41.66°',
    observationLon: '44.77°',
    observationBortle: 6,
    shareCount: 1,
  },
  {
    key: '19',
    author: 'Vako P.',
    rank: 'Pathfinder',
    target: 'Eagle Nebula',
    imageUrl: IMAGES.eagle,
    body: 'Tracked this for two hours and finally got a frame where the darker columns sit cleanly against the glow.',
    createdAt: '2026-05-10T19:16:00Z',
    observationLat: '41.78°',
    observationLon: '44.87°',
    observationBortle: 4,
    shareCount: 4,
  },
  {
    key: '20',
    author: 'Maka T.',
    rank: 'Stargazer',
    target: 'Crab Nebula',
    imageUrl: IMAGES.crab,
    body: 'Very small target for my setup, but I wanted to try anyway. The red filaments survived the noise reduction this time.',
    createdAt: '2026-05-10T22:08:00Z',
    observationLat: '41.71°',
    observationLon: '44.84°',
    observationBortle: 5,
    shareCount: 2,
  },
  {
    key: '21',
    author: 'Andria G.',
    rank: 'Observer',
    target: 'Whirlpool Galaxy',
    imageUrl: IMAGES.whirlpool,
    body: 'I reprocessed last night with a softer touch and finally kept the bridge between the galaxies without crushing the blacks.',
    createdAt: '2026-05-11T19:39:00Z',
    observationLat: '41.73°',
    observationLon: '44.91°',
    observationBortle: 4,
    shareCount: 3,
  },
  {
    key: '22',
    author: 'Barbara M.',
    rank: 'Stargazer',
    target: 'Lagoon Nebula',
    imageUrl: IMAGES.lagoon,
    body: 'Short session, but the core was bright enough that even this quick stack feels alive. I will add more time next clear night.',
    createdAt: '2026-05-11T21:47:00Z',
    observationLat: '41.75°',
    observationLon: '44.82°',
    observationBortle: 5,
    shareCount: 1,
  },
  {
    key: '23',
    author: 'Oto J.',
    rank: 'Observer',
    target: 'Ring Nebula',
    imageUrl: IMAGES.ring,
    body: 'Finally centered M57 properly. Tiny object, but it still feels magical every time that ring shape appears in the stack.',
    createdAt: '2026-05-12T18:52:00Z',
    observationLat: '41.70°',
    observationLon: '44.89°',
    observationBortle: 5,
    shareCount: 2,
  },
  {
    key: '24',
    author: 'Lizi K.',
    rank: 'Stargazer',
    target: 'Veil Nebula',
    imageUrl: IMAGES.veil,
    body: 'The framing still needs work, but the filament texture is the best I have seen from this location all spring.',
    createdAt: '2026-05-12T19:21:00Z',
    observationLat: '41.69°',
    observationLon: '44.86°',
    observationBortle: 4,
    shareCount: 1,
  },
  {
    key: '25',
    author: 'Sandro V.',
    rank: 'Pathfinder',
    target: 'Moon',
    imageUrl: IMAGES.moon,
    body: 'Could not resist one last lunar close-up before packing up. The edge detail looked especially crisp in the cold air tonight.',
    createdAt: '2026-05-12T20:03:00Z',
    observationLat: '41.72°',
    observationLon: '44.83°',
    observationBortle: 6,
    shareCount: 2,
  },
  {
    key: '26',
    author: 'Vato K.',
    rank: 'Stargazer',
    target: 'Moon',
    imageUrl: IMAGES.moon,
    body: 'iphone held up to the eyepiece. five minutes of fiddling, two seconds of luck. craters look insane in person, the photo doesnt even do it justice',
    createdAt: '2026-05-13T19:14:00Z',
    observationLat: '41.71°',
    observationLon: '44.80°',
    observationBortle: 7,
    shareCount: 1,
  },
  {
    key: '27',
    author: 'Nika R.',
    rank: 'Stargazer',
    target: 'Jupiter',
    imageUrl: IMAGES.jupiter,
    body: 'i can see the moons!!! 4 little dots in a line next to it. been outside an hour on the balcony, my neck hurts but worth it',
    createdAt: '2026-05-13T20:42:00Z',
    observationLat: '41.72°',
    observationLon: '44.78°',
    observationBortle: 7,
    shareCount: 2,
  },
  {
    key: '28',
    author: 'Gigi T.',
    rank: 'Stargazer',
    target: 'Saturn',
    imageUrl: IMAGES.saturn,
    body: 'first time ever seeing the rings with my own eyes. i actually said "no way" out loud to nobody. tiny in the eyepiece but unmistakable',
    createdAt: '2026-05-14T01:08:00Z',
    observationLat: '41.69°',
    observationLon: '44.85°',
    observationBortle: 6,
    shareCount: 3,
  },
  {
    key: '29',
    author: 'Ramaz P.',
    rank: 'Observer',
    target: 'Andromeda Galaxy',
    imageUrl: IMAGES.andromeda,
    body: 'drove an hour out of the city just to see this thing as more than a smudge. 20 frames stacked from a tripod. not pretty but its MINE',
    createdAt: '2026-05-14T22:51:00Z',
    observationLat: '41.85°',
    observationLon: '44.55°',
    observationBortle: 3,
    shareCount: 4,
  },
  {
    key: '30',
    author: 'Sopo M.',
    rank: 'Stargazer',
    target: 'Pleiades',
    imageUrl: IMAGES.pleiades,
    body: 'my mom asked why im in the garden with a blanket and binoculars at midnight. couldnt explain. these tiny blue stars are the answer',
    createdAt: '2026-05-15T00:23:00Z',
    observationLat: '41.73°',
    observationLon: '44.81°',
    observationBortle: 6,
    shareCount: 2,
  },
  {
    key: '31',
    author: 'Beka J.',
    rank: 'Stargazer',
    target: 'Orion Nebula',
    imageUrl: IMAGES.orion,
    body: 'so apparently you can see this with regular binoculars from a balcony in tbilisi if you know where to look. the app pointed me right at it 😭',
    createdAt: '2026-05-15T19:37:00Z',
    observationLat: '41.70°',
    observationLon: '44.79°',
    observationBortle: 7,
    shareCount: 5,
  },
  {
    key: '32',
    author: 'Tako B.',
    rank: 'Observer',
    target: 'Moon',
    imageUrl: IMAGES.moon,
    body: 'tried to shoot the moon with my dslr on a $30 tripod from the kitchen window. half the frames are blurry but this one came out usable. lesson learned: kitchens vibrate',
    createdAt: '2026-05-15T21:18:00Z',
    observationLat: '41.71°',
    observationLon: '44.82°',
    observationBortle: 7,
    shareCount: 1,
  },
  {
    key: '33',
    author: 'Zura L.',
    rank: 'Stargazer',
    target: 'Jupiter',
    imageUrl: IMAGES.jupiter,
    body: 'bought a used 70mm refractor on facebook marketplace last week. seller said "it works i guess". it works. jupiter has STRIPES',
    createdAt: '2026-05-16T00:11:00Z',
    observationLat: '41.74°',
    observationLon: '44.77°',
    observationBortle: 6,
    shareCount: 3,
  },
  {
    key: '34',
    author: 'Lasha M.',
    rank: 'Observer',
    target: 'Ring Nebula',
    imageUrl: IMAGES.ring,
    body: 'spent 40 min finding it. star hop from vega like everyone says. it really does look like a tiny smoke ring. nothing else in the eyepiece prepares you for that',
    createdAt: '2026-05-16T22:44:00Z',
    observationLat: '41.78°',
    observationLon: '44.93°',
    observationBortle: 5,
    shareCount: 2,
  },
  {
    key: '35',
    author: 'Eka V.',
    rank: 'Stargazer',
    target: 'Saturn',
    imageUrl: IMAGES.saturn,
    body: 'i did NOT expect to cry over a planet but here we are. saturn through a borrowed 8 inch dob. the rings, the gap, the moons. unreal',
    createdAt: '2026-05-17T01:32:00Z',
    observationLat: '41.72°',
    observationLon: '44.84°',
    observationBortle: 5,
    shareCount: 6,
  },
]

const REACTION_ORDER: Reaction[] = ['like', 'wow', 'star', 'love', 'rocket', 'galaxy']
const COMMENT_POOL = [
  'Clean capture.',
  'Love the detail in this one.',
  'This feels very calm.',
  'Great processing on the dust lanes.',
  'Sharp result for the conditions.',
  'Really nice color balance.',
]

function walletFromSeed(seed: string): string {
  const bytes = createHash('sha256').update(seed).digest().subarray(0, 32)
  return Keypair.fromSeed(bytes).publicKey.toBase58()
}

function uuidFromSeed(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

async function main() {
  const db = getDb()
  if (!db) throw new Error('DATABASE_URL is not configured')

  const authors = POSTS.map((post) => ({
    name: post.author,
    wallet: walletFromSeed(`feed-demo-wallet:${post.author}`),
    privyId: `feed-demo:${post.author.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
  }))
  const authorByName = new Map(authors.map((author) => [author.name, author]))

  for (const author of authors) {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.walletAddress, author.wallet))
      .limit(1)

    if (existing.length === 0) {
      await db.insert(users).values({
        privyId: author.privyId,
        walletAddress: author.wallet,
        username: author.name,
        avatar: null,
      })
    }
  }

  const seededPosts = POSTS.map((post, index) => {
    const author = authorByName.get(post.author)
    if (!author) throw new Error(`Missing author for ${post.author}`)

    const reactionCount = (index % 3) + 1
    const commentCount = index % 4 === 0 ? 2 : index % 3 === 0 ? 1 : 0

    return {
      id: uuidFromSeed(`feed-demo-post:${post.key}`),
      authorWallet: author.wallet,
      authorName: post.author,
      authorRank: post.rank,
      type: 'photo' as const,
      body: post.body,
      imageUrl: post.imageUrl,
      achievementTarget: null,
      achievementDifficulty: null,
      achievementStars: null,
      achievementMintTx: null,
      observationTarget: post.target,
      observationLat: post.observationLat,
      observationLon: post.observationLon,
      observationBortle: post.observationBortle,
      observationNftAddress: null,
      reactionCount,
      commentCount,
      shareCount: post.shareCount,
      createdAt: new Date(post.createdAt),
    }
  })

  const reactions = seededPosts.flatMap((post, index) => {
    const count = post.reactionCount
    return Array.from({ length: count }, (_, offset) => {
      const reactor = authors[(index + offset + 3) % authors.length]
      return {
        postId: post.id,
        wallet: reactor.wallet,
        reaction: REACTION_ORDER[(index + offset) % REACTION_ORDER.length],
        createdAt: new Date(post.createdAt.getTime() + (offset + 1) * 60_000),
      }
    })
  })

  const comments = seededPosts.flatMap((post, index) => {
    const count = post.commentCount
    return Array.from({ length: count }, (_, offset) => {
      const commenter = authors[(index + offset + 8) % authors.length]
      return {
        postId: post.id,
        authorWallet: commenter.wallet,
        authorName: commenter.name,
        body: COMMENT_POOL[(index + offset) % COMMENT_POOL.length],
        reactionCount: 0,
        createdAt: new Date(post.createdAt.getTime() + (offset + 1) * 11 * 60_000),
      }
    })
  })

  const postIds = seededPosts.map((post) => post.id)
  await db.delete(feedReactions).where(inArray(feedReactions.postId, postIds))
  await db.delete(feedComments).where(inArray(feedComments.postId, postIds))
  await db.delete(feedShares).where(inArray(feedShares.postId, postIds))
  await db.delete(feedPosts).where(inArray(feedPosts.id, postIds))

  await db.insert(feedPosts).values(seededPosts)
  if (reactions.length > 0) await db.insert(feedReactions).values(reactions)
  if (comments.length > 0) await db.insert(feedComments).values(comments)

  console.log(`Seeded ${seededPosts.length} demo feed posts`)
  console.log(`Inserted ${reactions.length} reactions and ${comments.length} comments`)
}

main().catch((error) => {
  console.error('Failed to seed demo feed:', error)
  process.exit(1)
})
