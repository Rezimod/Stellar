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

// Amateur-astrophotography shots from Wikimedia Commons — telescope/DSLR
// captures by hobbyists, not observatory-grade HQ renders. These match what a
// real Stellar user (an Astroman telescope buyer) would actually post.
const IMAGES = {
  jupiter: 'https://commons.wikimedia.org/wiki/Special:FilePath/Jupiter%20and%20Io%20amateur%20telescope.jpg?width=1100',
  saturn: 'https://commons.wikimedia.org/wiki/Special:FilePath/A%20photograph%20of%20Saturn%20taken%20with%20an%20amateur%20telescope.jpg?width=1100',
  andromeda: 'https://commons.wikimedia.org/wiki/Special:FilePath/Andromeda%20galaxy%20nikon.jpg?width=1100',
  orion: 'https://commons.wikimedia.org/wiki/Special:FilePath/The%20Great%20Orion%20Nebula%20in%20Narrowband.jpg?width=1100',
} as const

const POSTS: DemoPost[] = [
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
    key: '31',
    author: 'Beka J.',
    rank: 'Stargazer',
    target: 'Orion Nebula',
    imageUrl: IMAGES.orion,
    body: 'so apparently you can see this with regular binoculars from a balcony in tbilisi if you know where to look. the app pointed me right at it',
    createdAt: '2026-05-15T19:37:00Z',
    observationLat: '41.70°',
    observationLon: '44.79°',
    observationBortle: 7,
    shareCount: 5,
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

// Every demo post key ever seeded (01–35). Used for cleanup so that trimming
// POSTS removes the dropped rows from the DB instead of orphaning them.
const ALL_DEMO_KEYS = Array.from({ length: 35 }, (_, i) => String(i + 1).padStart(2, '0'))

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

  // Clean up every demo post ever seeded (01–35), not just the current set,
  // so dropped posts are removed from the DB rather than left orphaned.
  const cleanupIds = ALL_DEMO_KEYS.map((key) => uuidFromSeed(`feed-demo-post:${key}`))
  await db.delete(feedReactions).where(inArray(feedReactions.postId, cleanupIds))
  await db.delete(feedComments).where(inArray(feedComments.postId, cleanupIds))
  await db.delete(feedShares).where(inArray(feedShares.postId, cleanupIds))
  await db.delete(feedPosts).where(inArray(feedPosts.id, cleanupIds))

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
