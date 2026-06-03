import { ApiResponseError } from 'twitter-api-v2'

export function getTweetIntentUrl(text: string): string {
  return `https://x.com/compose/post?text=${encodeURIComponent(text)}`
}

export function isCreditsDepleted(err: unknown): boolean {
  if (!(err instanceof ApiResponseError)) return false
  if (err.code === 402) return true
  const data = err.data as { title?: string; type?: string } | undefined
  return data?.title === 'CreditsDepleted'
}

export function formatXApiError(err: unknown): string {
  if (err instanceof ApiResponseError) {
    const data = err.data as { title?: string; detail?: string } | undefined
    if (isCreditsDepleted(err)) {
      return 'X API credits are empty. X Premium does not include Developer API posting credits — add credits at developer.x.com or post via the compose button below (free).'
    }
    if (data?.detail) return data.detail
    if (data?.title) return data.title
    return `X API error (${err.code})`
  }
  return err instanceof Error ? err.message : 'unknown error'
}
