export type ReactionType = 'like' | 'love' | 'wow' | 'sad' | 'dislike' | 'star' | 'rocket' | 'galaxy'

// Picker order: basic FB-style first, then cosmic. dislike kept last for backwards compat.
export const REACTION_TYPES: ReactionType[] = ['like', 'love', 'wow', 'sad', 'star', 'rocket', 'galaxy', 'dislike']

export type FeedPostType = 'text' | 'photo' | 'achievement'

export interface FeedComment {
  id: string
  postId: string
  authorWallet: string
  authorName: string | null
  body: string
  reactionCount: number
  createdAt: string
}

export interface FeedPost {
  id: string
  authorWallet: string
  authorName: string | null
  authorRank: string | null
  type: FeedPostType
  body: string | null
  imageUrl: string | null
  achievementTarget: string | null
  achievementDifficulty: string | null
  achievementStars: number | null
  achievementMintTx: string | null
  observationTarget: string | null
  observationLat: string | null
  observationLon: string | null
  observationBortle: number | null
  observationNftAddress: string | null
  reactionCount: number
  commentCount: number
  shareCount: number
  createdAt: string
  topReactions?: ReactionType[]
  myReaction?: ReactionType | null
  commentsPreview?: FeedComment[]
}

export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  wow: '😮',
  sad: '😢',
  dislike: '👎',
  star: '⭐',
  rocket: '🚀',
  galaxy: '🌌',
}

export const REACTION_LABEL: Record<ReactionType, string> = {
  like: 'Like',
  love: 'Love',
  wow: 'Wow',
  sad: 'Sad',
  dislike: 'Dislike',
  star: 'Stellar',
  rocket: 'Cosmic',
  galaxy: 'Mind-blown',
}

export const REACTION_GRADIENT: Record<ReactionType, string> = {
  like: 'linear-gradient(135deg, #5EEAD4, #8B5CF6)',
  love: 'linear-gradient(135deg, #FB7185, #EF4444)',
  wow: 'linear-gradient(135deg, #FFD166, #FFB347)',
  sad: 'linear-gradient(135deg, #5EEAD4, #312E81)',
  dislike: 'linear-gradient(135deg, #94A3B8, #475569)',
  star: 'linear-gradient(135deg, #FFD166, #FB7185)',
  rocket: 'linear-gradient(135deg, #5EEAD4, #8465CB)',
  galaxy: 'linear-gradient(135deg, #8465CB, #06122B)',
}

export const REACTION_PICK_BG: Record<ReactionType, string> = {
  like: 'radial-gradient(circle, rgba(56,189,248,0.3), transparent 70%)',
  love: 'radial-gradient(circle, rgba(244,114,182,0.3), transparent 70%)',
  wow: 'radial-gradient(circle, rgba(255,209,102,0.3), transparent 70%)',
  sad: 'radial-gradient(circle, rgba(96,165,250,0.3), transparent 70%)',
  dislike: 'radial-gradient(circle, rgba(148,163,184,0.3), transparent 70%)',
  star: 'radial-gradient(circle, rgba(255,209,102,0.35), transparent 70%)',
  rocket: 'radial-gradient(circle, rgba(56,240,255,0.32), transparent 70%)',
  galaxy: 'radial-gradient(circle, rgba(132,101,203,0.35), transparent 70%)',
}
