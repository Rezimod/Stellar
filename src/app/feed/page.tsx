'use client'

import './feed.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import {
  Compass, Star, Sparkles, Calendar, Bookmark,
  Image as ImageIcon, Eye, MapPin, Gem, X,
} from 'lucide-react'
import { useStellarUser } from '@/hooks/useStellarUser'
import { useDisplayProfile } from '@/hooks/useDisplayProfile'
import { AuthModal } from '@/components/auth/AuthModal'
import { useLocation } from '@/lib/location'
import { DEFAULT_OBSERVER } from '@/lib/observer-location'
import FeedPostCard from '@/components/feed/FeedPostCard'
import SkyWidget from '@/components/feed/SkyWidget'
import { DiscoveriesWidget, ShopWidget } from '@/components/feed/SidebarWidgets'
import { Avatar } from '@/lib/avatars'
import type { FeedPost } from '@/lib/feed/types'

const POST_BODY_MAX = 2000

type FilterKey = 'latest' | 'following' | 'discoveries' | 'tonight'

const SIDEBAR_FILTERS: Array<{ key: FilterKey; labelKey: FilterKey; Icon: typeof Compass }> = [
  { key: 'latest', labelKey: 'latest', Icon: Compass },
  { key: 'following', labelKey: 'following', Icon: Star },
  { key: 'discoveries', labelKey: 'discoveries', Icon: Sparkles },
  { key: 'tonight', labelKey: 'tonight', Icon: Calendar },
]

const TAB_FILTERS: Array<{ key: FilterKey; labelKey: FilterKey }> = [
  { key: 'latest', labelKey: 'latest' },
  { key: 'following', labelKey: 'following' },
  { key: 'discoveries', labelKey: 'discoveries' },
  { key: 'tonight', labelKey: 'tonight' },
]

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function FeedPage() {
  const locale = useLocale() === 'ka' ? 'ka' : 'en'
  const router = useRouter()
  const searchParams = useSearchParams()
  const filter = (searchParams?.get('filter') as FilterKey) ?? 'latest'

  const { authenticated, address } = useStellarUser()
  const { getAccessToken } = usePrivy()
  const { location } = useLocation()
  const { displayName, firstName, initial: profileInitial, avatarGlyph, avatarId } = useDisplayProfile()
  const [authOpen, setAuthOpen] = useState(false)

  const myInitial = avatarGlyph ?? profileInitial

  const [posts, setPosts] = useState<FeedPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const [draft, setDraft] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [pendingObservation, setPendingObservation] = useState<{
    target: string; lat: string; lon: string; bortle?: number; nft?: string
  } | null>(null)
  const [pendingLocation, setPendingLocation] = useState<{ lat: string; lon: string } | null>(null)
  const [posting, setPosting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const copy = {
    sidebarTitle: locale === 'ka' ? 'ფიდი' : 'Feed',
    headerTitle: locale === 'ka' ? 'ფიდი' : 'Feed',
    headerSubtitle: locale === 'ka' ? 'ცოცხალი დაკვირვებები მთელი მსოფლიოდან' : 'Real observations from astronomers worldwide',
    live: locale === 'ka' ? 'ცოცხალი' : 'LIVE',
    saved: locale === 'ka' ? 'შენახული' : 'Saved',
    filters: {
      latest: locale === 'ka' ? 'ყველა' : 'Latest',
      following: locale === 'ka' ? 'გამოწერები' : 'Following',
      discoveries: locale === 'ka' ? 'აღმოჩენები' : 'Discoveries',
      tonight: locale === 'ka' ? 'ამაღამ' : 'Tonight',
    } as Record<FilterKey, string>,
    sidebarFilters: {
      latest: locale === 'ka' ? 'ყველა კოსმოსი' : 'All cosmos',
      following: locale === 'ka' ? 'გამოწერები' : 'Following',
      discoveries: locale === 'ka' ? 'აღმოჩენები' : 'Discoveries',
      tonight: locale === 'ka' ? 'ამაღამ' : 'Tonight',
    } as Record<FilterKey, string>,
    fileType: locale === 'ka' ? 'მხარდაჭერილია მხოლოდ JPEG, PNG და WebP სურათები.' : 'Only JPEG, PNG, or WebP images are supported.',
    fileSize: locale === 'ka' ? 'სურათი 2MB-ზე ნაკლები უნდა იყოს.' : 'Image must be smaller than 2MB.',
    failedPost: locale === 'ka' ? 'გამოქვეყნება ვერ მოხერხდა' : 'Failed to post',
    noObservation: locale === 'ka' ? 'მისაბმელი ბოლო დაკვირვება ვერ მოიძებნა.' : 'No recent observations to attach.',
    cityFallback: locale === 'ka' ? 'თბილისი' : 'Tbilisi',
    composerPlaceholder: authenticated && firstName
      ? (locale === 'ka' ? `რა დაინახე, ${firstName}?` : `What did you see, ${firstName}?`)
      : (locale === 'ka' ? 'რა დაინახე ამაღამ?' : 'What did you see tonight?'),
    photoAttached: locale === 'ka' ? 'ფოტო მიმაგრებულია · ⌘↵ გამოსაქვეყნებლად' : 'Photo attached · ⌘↵ to post',
    shortcut: locale === 'ka' ? '⌘↵ გამოსაქვეყნებლად' : '⌘↵ to post',
    removeImage: locale === 'ka' ? 'სურათის წაშლა' : 'Remove image',
    linked: locale === 'ka' ? 'მიბმულია' : 'Linked',
    removeObservation: locale === 'ka' ? 'დაკვირვების წაშლა' : 'Remove observation',
    removeLocation: locale === 'ka' ? 'მდებარეობის წაშლა' : 'Remove location',
    photo: locale === 'ka' ? 'ფოტო' : 'Photo',
    observation: locale === 'ka' ? 'დაკვირვება' : 'Observation',
    location: locale === 'ka' ? 'მდებარეობა' : 'Location',
    addPhoto: locale === 'ka' ? 'ფოტოს დამატება' : 'Add photo',
    attachObservation: locale === 'ka' ? 'ბოლო დაკვირვების მიმაგრება' : 'Attach last observation',
    attachLocation: locale === 'ka' ? 'მიმდინარე მდებარეობის მიმაგრება' : 'Attach current location',
    attachNft: locale === 'ka' ? 'აღმოჩენებიდან NFT-ის მიმაგრება' : 'Attach an NFT from your discoveries',
    sending: locale === 'ka' ? 'იგზავნება…' : 'Sending…',
    post: locale === 'ka' ? 'გამოქვეყნება' : 'Post',
    signInToPost: locale === 'ka' ? 'შედი, რათა დაკვირვებები ფიდში გამოაქვეყნო.' : 'Sign in to post your observations to the feed.',
    signIn: locale === 'ka' ? 'შესვლა' : 'Sign in',
    empty: {
      body: locale === 'ka' ? 'კოსმოსი ჩუმადაა. იყავი პირველი, ვინც დაწერს.' : 'The cosmos is quiet. Be the first to post.',
      compose: locale === 'ka' ? 'დაწერა' : 'Compose',
    },
  } as const

  const setFilter = useCallback((key: FilterKey) => {
    const sp = new URLSearchParams(searchParams?.toString() ?? '')
    if (key === 'latest') sp.delete('filter')
    else sp.set('filter', key)
    const qs = sp.toString()
    router.replace(qs ? `/feed?${qs}` : '/feed')
  }, [router, searchParams])

  const fetchPosts = useCallback(async (opts: { append: boolean }) => {
    const sp = new URLSearchParams()
    sp.set('limit', '20')
    sp.set('filter', filter)
    if (address) sp.set('walletAddress', address)
    if (opts.append && nextCursor) sp.set('before', nextCursor)
    const res = await fetch(`/api/feed/posts?${sp}`)
    if (!res.ok) return
    const data = await res.json() as { posts: FeedPost[]; nextCursor: string | null }
    setPosts(prev => opts.append ? [...prev, ...data.posts] : data.posts)
    setNextCursor(data.nextCursor)
  }, [filter, address, nextCursor])

  useEffect(() => {
    setLoading(true)
    setPosts([])
    setNextCursor(null)
    fetchPosts({ append: false }).finally(() => setLoading(false))
    // Reset cursor only when filter or wallet changes; subsequent pagination
    // is handled by the IO observer below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, address])

  useEffect(() => {
    if (!sentinelRef.current || loading || loadingMore || !nextCursor) return
    const obs = new IntersectionObserver(async entries => {
      if (entries[0].isIntersecting && nextCursor && !loadingMore) {
        setLoadingMore(true)
        await fetchPosts({ append: true })
        setLoadingMore(false)
      }
    }, { rootMargin: '300px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [nextCursor, loading, loadingMore, fetchPosts])

  function ensureAuth(): boolean {
    if (!authenticated || !address) { setAuthOpen(true); return false }
    return true
  }

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      alert(copy.fileType)
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      alert(copy.fileSize)
      return
    }
    const data = await fileToDataUrl(f)
    setPendingImage(data)
  }

  function requestLocation() {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPendingLocation({
          lat: pos.coords.latitude.toFixed(2),
          lon: pos.coords.longitude.toFixed(2),
        })
      },
      () => {},
      { timeout: 6000 },
    )
  }

  const trimmedDraft = draft.trim()
  const canPost = (trimmedDraft.length > 0 || pendingImage) && trimmedDraft.length <= POST_BODY_MAX && !posting

  async function submitPost() {
    if (!ensureAuth() || !address) return
    if (!canPost) return
    setPosting(true)
    const type = pendingImage ? 'photo' : 'text'
    const observation = pendingObservation ?? null
    const fallbackLat = observation?.lat ?? pendingLocation?.lat
    const fallbackLon = observation?.lon ?? pendingLocation?.lon
    const payload: Record<string, unknown> = {
      authorWallet: address,
      authorName: displayName,
      authorRank: null,
      type,
      body: draft.trim() || null,
    }
    if (type === 'photo') {
      payload.imageUrl = pendingImage
      if (observation?.target) payload.observationTarget = observation.target
      if (fallbackLat) payload.observationLat = `${fallbackLat}°`
      if (fallbackLon) payload.observationLon = `${fallbackLon}°`
      if (observation?.bortle != null) payload.observationBortle = observation.bortle
      if (observation?.nft) payload.observationNftAddress = observation.nft
    }
    try {
      const authToken = await getAccessToken().catch(() => null)
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const created = await res.json() as FeedPost
        setPosts(prev => [created, ...prev])
        setDraft('')
        setPendingImage(null)
        setPendingObservation(null)
        setPendingLocation(null)
        if (composerRef.current) composerRef.current.style.height = 'auto'
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error ?? copy.failedPost)
      }
    } finally {
      setPosting(false)
    }
  }

  const updatePost = useCallback((updated: FeedPost) => {
    setPosts(prev => prev.map(p => (p.id === updated.id ? updated : p)))
  }, [])

  const removePost = useCallback((id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id))
  }, [])

  const cityLabel = useMemo(() => location?.city ?? copy.cityFallback, [location, copy.cityFallback])
  const lat = location?.lat ?? DEFAULT_OBSERVER.lat
  const lon = location?.lon ?? DEFAULT_OBSERVER.lon

  return (
    <div className="feed-page">
      <div className="feed-grid">
        <aside className="sidebar-left">
          <div className="side-section">
            <div className="side-label">{copy.sidebarTitle}</div>
            {SIDEBAR_FILTERS.map(({ key, labelKey, Icon }) => (
              <button
                key={key}
                type="button"
                className={`side-link ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                <Icon className="side-link-icon" /> {copy.sidebarFilters[labelKey]}
              </button>
            ))}
            <button type="button" className="side-link" onClick={() => router.push('/profile')}>
              <Bookmark className="side-link-icon" /> {copy.saved}
            </button>
          </div>
        </aside>

        <main>
          <header className="feed-header">
            <h1 className="feed-title">{copy.headerTitle}</h1>
            <div className="feed-header-meta">
              <span className="feed-live">
                <span className="feed-live-dot" />
                {copy.live}
              </span>
              <span className="feed-header-meta-sep">·</span>
              <span>{copy.headerSubtitle}</span>
            </div>
          </header>

          {authenticated ? (
            <div className="composer">
              <div className="composer-row">
                {avatarId ? (
                  <Avatar avatarId={avatarId} initial={profileInitial} size={40} />
                ) : (
                  <div className="composer-avatar">{myInitial}</div>
                )}
                <textarea
                  ref={composerRef}
                  className="composer-input"
                  placeholder={copy.composerPlaceholder}
                  value={draft}
                  disabled={posting}
                  maxLength={POST_BODY_MAX + 200}
                  onChange={e => {
                    setDraft(e.target.value)
                    const el = e.target
                    el.style.height = 'auto'
                    el.style.height = `${Math.min(200, el.scrollHeight)}px`
                  }}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault()
                      if (canPost) submitPost()
                    }
                  }}
                />
              </div>

              {(draft.length > POST_BODY_MAX - 200 || pendingImage) && (
                <div className="composer-meta">
                  <span className="composer-meta-hint">
                    {pendingImage ? copy.photoAttached : copy.shortcut}
                  </span>
                  {draft.length > POST_BODY_MAX - 200 && (
                    <span className={`composer-counter ${
                      draft.length > POST_BODY_MAX ? 'over' : draft.length > POST_BODY_MAX - 50 ? 'warn' : ''
                    }`}>
                      {draft.length} / {POST_BODY_MAX}
                    </span>
                  )}
                </div>
              )}

              {(pendingImage || pendingObservation || pendingLocation) && (
                <div className="composer-preview">
                  {pendingImage && (
                    <div className="composer-thumb" style={{ backgroundImage: `url(${pendingImage})` }}>
                      <button type="button" className="composer-thumb-x" onClick={() => setPendingImage(null)} aria-label={copy.removeImage}>
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {pendingObservation && (
                    <span className="composer-pill">
                      <MapPin size={12} /> {copy.linked}: {pendingObservation.target}
                      <button
                        type="button"
                        className="composer-pill-x"
                        onClick={() => setPendingObservation(null)}
                        aria-label={copy.removeObservation}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {pendingLocation && !pendingObservation && (
                    <span className="composer-pill">
                      <MapPin size={12} /> {pendingLocation.lat}°, {pendingLocation.lon}°
                      <button
                        type="button"
                        className="composer-pill-x"
                        onClick={() => setPendingLocation(null)}
                        aria-label={copy.removeLocation}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  )}
                </div>
              )}

              <div className="composer-actions">
                <div className="composer-tools">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={onPickPhoto}
                  />
                  <button
                    type="button"
                    className={`tool-btn ${pendingImage ? 'active' : ''}`}
                    disabled={posting}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label={copy.addPhoto}
                    title={copy.photo}
                  >
                    <ImageIcon /> <span className="tool-btn-label">{copy.photo}</span>
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${pendingObservation ? 'active' : ''}`}
                    disabled={posting}
                    aria-label={copy.attachObservation}
                    title={copy.observation}
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address ?? '')}`)
                        if (res.ok) {
                          const data = await res.json() as { observations?: Array<{ target: string; lat: number | null; lon: number | null; mintTx: string | null }> }
                          const last = data.observations?.[0]
                          if (last) {
                            setPendingObservation({
                              target: last.target,
                              lat: last.lat != null ? last.lat.toFixed(2) : '',
                              lon: last.lon != null ? last.lon.toFixed(2) : '',
                              nft: last.mintTx ?? undefined,
                            })
                          } else {
                            alert(copy.noObservation)
                          }
                        }
                      } catch (e) { console.error('[feed] open observation', e); }
                    }}
                  >
                    <Eye /> <span className="tool-btn-label">{copy.observation}</span>
                  </button>
                  <button
                    type="button"
                    className={`tool-btn ${pendingLocation ? 'active' : ''}`}
                    disabled={posting}
                    onClick={requestLocation}
                    aria-label={copy.attachLocation}
                    title={copy.location}
                  >
                    <MapPin /> <span className="tool-btn-label">{copy.location}</span>
                  </button>
                  <button
                    type="button"
                    className="tool-btn"
                    disabled={posting}
                    onClick={() => router.push('/nfts')}
                    aria-label={copy.attachNft}
                    title="NFT"
                  >
                    <Gem /> <span className="tool-btn-label">NFT</span>
                  </button>
                </div>
                <button type="button" className="post-btn" disabled={!canPost} onClick={submitPost}>
                  {posting ? copy.sending : copy.post}
                </button>
              </div>
            </div>
          ) : (
            <div className="composer-auth">
              <span>{copy.signInToPost}</span>
              <button type="button" className="post-btn" onClick={() => setAuthOpen(true)}>{copy.signIn}</button>
            </div>
          )}

          <div className="feed-filters">
            {TAB_FILTERS.map(t => (
              <button
                key={t.key}
                type="button"
                className={`filter-tab ${filter === t.key ? 'active' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                {copy.filters[t.labelKey]}
              </button>
            ))}
          </div>

          {loading ? (
            <>
              <div className="feed-skeleton" />
              <div className="feed-skeleton" />
              <div className="feed-skeleton" />
            </>
          ) : posts.length === 0 ? (
            <div className="feed-empty">
              <p>{copy.empty.body}</p>
              <button type="button" onClick={() => composerRef.current?.focus()}>{copy.empty.compose}</button>
            </div>
          ) : (
            <>
              {posts.map((post, i) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  index={i}
                  myWallet={address}
                  myInitial={myInitial}
                  myDisplayName={displayName}
                  myAvatarGlyph={avatarGlyph}
                  myAvatarId={avatarId}
                  onChange={updatePost}
                  onDelete={removePost}
                  authPrompt={() => setAuthOpen(true)}
                />
              ))}
              <div ref={sentinelRef} style={{ height: 1 }} />
              {loadingMore && <div className="feed-skeleton" style={{ height: 80 }} />}
            </>
          )}
        </main>

        <aside className="sidebar-right">
          <SkyWidget lat={lat} lon={lon} cityLabel={cityLabel} />
          <DiscoveriesWidget />
          <ShopWidget />
        </aside>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  )
}
