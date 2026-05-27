import { TwitterApi } from 'twitter-api-v2'

let cached: TwitterApi | null = null

export function getTwitterClient(): TwitterApi {
  if (cached) return cached
  const appKey = process.env.X_API_KEY
  const appSecret = process.env.X_API_SECRET
  const accessToken = process.env.X_ACCESS_TOKEN
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET
  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error('X API credentials missing — set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET')
  }
  cached = new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
  return cached
}

export async function postTweet(text: string): Promise<{ id: string; text: string }> {
  const client = getTwitterClient()
  const { data } = await client.v2.tweet({ text })
  return { id: data.id, text: data.text }
}
