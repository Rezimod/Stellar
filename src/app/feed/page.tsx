'use client'

import './feed.css'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Compass, Star, Sparkles, Calendar, Bookmark,
  Image as ImageIcon, Eye, MapPin, Gem, X,
} from 'lucide-react'
import { useStellarUser } from '@/hooks/useStellarUser'
import { useStellarAuth } from '@/hooks/useStellarAuth'
import { useDisplayProfile } from '@/hooks/useDisplayProfile'
import { AuthModal } from '@/components/auth/AuthModal'
import { useLocation } from '@/lib/location'
import FeedPostCard from '@/components/feed/FeedPostCard'
import SkyWidget from '@/components/feed/SkyWidget'
import { DiscoveriesWidget, ShopWidget } from '@/components/feed/SidebarWidgets'
import { Avatar } from '@/lib/avatars'
import type { FeedPost } from '@/lib/feed/types'

const POST_BODY_MAX = 2000

type FilterKey = 'latest' | 'following' | 'discoveries' | 'tonight'

const SIDEBAR_FILTERS: Array<{ key: FilterKey; label: string; Icon: typeof Compass }> = [
  { key: 'latest', label: 'All cosmos', Icon: Compass },
  { key: 'following', label: 'Following', Icon: Star },
  { key: 'discoveries', label: 'Discoveries', Icon: Sparkles },
  { key: 'tonight', label: 'Tonight', Icon: Calendar },
]

const TAB_FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'latest', label: 'Latest' },
  { key: 'following', label: 'Following' },
  { key: 'discoveries', label: 'Discoveries' },
  { key: 'tonight', label: 'Tonight' },
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const filter = (searchParams?.get('filter') as FilterKey) ?? 'latest'

  const { authenticated, address } = useStellarUser()
  const { } = useStellarAuth()
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
      alert('Only JPEG, PNG, or WebP images are supported.')
      return
    }
    if (f.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB.')
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
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        alert(err.error ?? 'Failed to post')
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

  const cityLabel = useMemo(() => location?.city ?? 'Tbilisi', [location])
  const lat = location?.lat ?? 41.7
  const lon = location?.lon ?? 44.83

  const composerPlaceholder = authenticated && firstName
    ? `What did the sky show you tonight, ${firstName}?`
    : 'What did the sky show you tonight?'

  return (
    <div className="feed-page">
      <div className="feed-grid">
        <aside className="sidebar-left">
          <div className="side-section">
            <div className="side-label">Feed</div>
            {SIDEBAR_FILTERS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                className={`side-link ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}
              >
                <Icon className="side-link-icon" /> {label}
              </button>
            ))}
            <button type="button" className="side-link" onClick={() => router.push('/profile')}>
              <Bookmark className="side-link-icon" /> Saved
            </button>
          </div>
        </aside>

        <main>
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
                  placeholder={composerPlaceholder}
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
                    {pendingImage ? 'Photo attached · ⌘↵ to post' : '⌘↵ to post'}
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
                      <button className="composer-thumb-x" onClick={() => setPendingImage(null)} aria-label="Remove image">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  {pendingObservation && (
                    <span className="composer-pill">
                      <MapPin size={12} /> Linked: {pendingObservation.target}
                      <button onClick={() => setPendingObservation(null)} aria-label="Remove observation"
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 4 }}>
                        <X size={11} />
                      </button>
                    </span>
                  )}
                  {pendingLocation && !pendingObservation && (
                    <span className="composer-pill">
                      <MapPin size={12} /> {pendingLocation.lat}°, {pendingLocation.lon}°
                      <button onClick={() => setPendingLocation(null)} aria-label="Remove location"
                        style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 4 }}>
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
                  <button className={`tool-btn ${pendingImage ? 'active' : ''}`} disabled={posting} onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon /> <span className="tool-btn-label">Photo</span>
                  </button>
                  <button
                    className={`tool-btn ${pendingObservation ? 'active' : ''}`}
                    disabled={posting}
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/observe/history?walletAddress=${encodeURIComponent(address ?? '')}`)
                        if (res.ok) {
                          const data = await res.json() as { observations?: Array<{ target: string; lat: number | null; lon: number | null; mintTx: string | null }> }
                          const last = data.observations?.[0]
                          if (last) {
                            setPendingObservation({
                              target: last.target,
                              lat: last.lat?.toFixed(2) ?? '',
                              lon: last.lon?.toFixed(2) ?? '',
                              nft: last.mintTx ?? undefined,
                            })
                          } else {
                            alert('No recent observations to attach.')
                          }
                        }
                      } catch {}
                    }}
                  >
                    <Eye /> <span className="tool-btn-label">Observation</span>
                  </button>
                  <button className={`tool-btn ${pendingLocation ? 'active' : ''}`} disabled={posting} onClick={requestLocation}>
                    <MapPin /> <span className="tool-btn-label">Location</span>
                  </button>
                  <button
                    className="tool-btn"
                    disabled={posting}
                    onClick={() => router.push('/nfts')}
                    title="Open your discoveries to attach an NFT"
                  >
                    <Gem /> <span className="tool-btn-label">NFT</span>
                  </button>
                </div>
                <button className="post-btn" disabled={!canPost} onClick={submitPost}>
                  {posting ? 'Sending…' : 'Post'}
                </button>
              </div>
            </div>
          ) : (
            <div className="composer-auth">
              <span>Sign in to post your observations to the feed.</span>
              <button className="post-btn" onClick={() => setAuthOpen(true)}>Sign in</button>
            </div>
          )}

          <div className="feed-filters">
            {TAB_FILTERS.map(t => (
              <button
                key={t.key}
                className={`filter-tab ${filter === t.key ? 'active' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                {t.label}
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
              <p>The cosmos is quiet. Be the first to post.</p>
              <button onClick={() => composerRef.current?.focus()}>Compose</button>
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
