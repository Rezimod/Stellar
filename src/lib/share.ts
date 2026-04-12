export function buildShareImageUrl(params: {
  target: string
  score: number
  grade: string
  stars: number
  date: string
  emoji: string
}): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'
  const q = new URLSearchParams({
    target: params.target,
    score: String(params.score),
    grade: params.grade,
    stars: String(params.stars),
    date: params.date,
    emoji: params.emoji,
  })
  return `${base}/api/share/og?${q}`
}

export function buildTwitterShareUrl(params: {
  target: string
  score: number
  grade: string
  stars: number
  appUrl: string
  ogImageUrl?: string
}): string {
  const text = `I just sealed my ${params.target} observation on Stellar! Sky Score: ${params.score}/100 (${params.grade}) · Earned ✦${params.stars} Stars 🔭\n\n@StellarrClub #Solana #Astronomy`
  const linkUrl = params.ogImageUrl ?? params.appUrl
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(linkUrl)}`
}

export function buildFarcasterShareUrl(params: {
  target: string
  score: number
  stars: number
  appUrl: string
}): string {
  const text = `Sealed my ${params.target} observation on @StellarrClub! Sky Score ${params.score}/100 · ✦${params.stars} Stars earned on Solana`
  return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(params.appUrl)}`
}
