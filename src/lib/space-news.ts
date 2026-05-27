export interface SpaceNewsItem {
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
}

interface SpaceflightNewsResponse {
  results: Array<{
    id: number
    title: string
    summary: string
    url: string
    news_site: string
    published_at: string
  }>
}

const ENDPOINT = 'https://api.spaceflightnewsapi.net/v4/articles/'

export async function fetchTopSpaceNews(limit = 6): Promise<SpaceNewsItem[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    ordering: '-published_at',
  })
  const res = await fetch(`${ENDPOINT}?${params}`, {
    headers: { 'User-Agent': 'StellarrAgent/1.0' },
    next: { revalidate: 1800 },
  })
  if (!res.ok) throw new Error(`Spaceflight News API ${res.status}`)
  const json = (await res.json()) as SpaceflightNewsResponse
  return json.results.map((r) => ({
    title: r.title,
    summary: r.summary,
    url: r.url,
    source: r.news_site,
    publishedAt: r.published_at,
  }))
}
