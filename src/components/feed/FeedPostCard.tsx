'use client'

import { memo, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bookmark, MapPin, MessageCircle, MoreHorizontal, Share2, Telescope, Trash2, Copy, Twitter } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import FollowButton from '@/components/feed/FollowButton'
import { Avatar } from '@/lib/avatars'
import {
  REACTION_EMOJI,
  REACTION_GRADIENT,
  REACTION_LABEL,
  REACTION_PICK_BG,
  REACTION_TYPES,
  type FeedComment,
  type FeedPost,
  type ReactionType,
} from '@/lib/feed/types'

const RANK_GRADIENT: Record<string, string> = {
  Stargazer: 'linear-gradient(135deg, var(--violet), var(--teal))',
  Observer: 'linear-gradient(135deg, var(--teal), var(--violet))',
  Pathfinder: 'linear-gradient(135deg, var(--brass), var(--rose))',
  Celestial: 'linear-gradient(135deg, var(--brass), var(--teal))',
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function shortWallet(w: string): string {
  return `${w.slice(0, 4)}…${w.slice(-4)}`
}

function renderTextWithHashtags(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /#\w+/g
  let last = 0
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(<span key={`t${idx++}`}>{text.slice(last, m.index)}</span>)
    parts.push(<span key={`h${idx++}`} style={{ color: 'var(--brass)' }}>{m[0]}</span>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(<span key={`t${idx++}`}>{text.slice(last)}</span>)
  return parts
}

function observationChips(post: FeedPost): string[] {
  const chips: string[] = []
  const body = post.body ?? ''
  const equipment = body.match(/(\d+(?:\.\d+)?\s?(?:inch|in|")\s?(?:dob|dobsonian|mak|refractor|newtonian|sct))/i)?.[0]
  const exposure = body.match(/(\d+(?:\.\d+)?\s?h(?:our)?\s?exposure|\d+\s?min(?:ute)?\s?exposure)/i)?.[0]
  const eyepieces = Array.from(body.matchAll(/\b\d+(?:\.\d+)?mm\s?eyepiece\b/gi)).map(m => m[0])

  if (equipment) chips.push(equipment.replace(/\bdob\b/i, 'Dobsonian'))
  if (exposure) chips.push(exposure)
  chips.push(...eyepieces.slice(0, 2))
  if (post.observationBortle != null) chips.push(`Bortle ${post.observationBortle}`)
  if (post.observationLat || post.observationLon) chips.push('Location logged')
  if (post.observationNftAddress) chips.push('Discovery NFT')

  return Array.from(new Set(chips)).slice(0, 5)
}

interface Props {
  post: FeedPost
  myWallet: string | null
  myInitial: string
  myDisplayName?: string | null
  myAvatarGlyph?: string | null
  myAvatarId?: string | null
  onDelete?: (postId: string) => void
  onChange: (post: FeedPost) => void
  authPrompt: () => void
  index: number
}

function FeedPostCardImpl({ post, myWallet, myInitial, myDisplayName, myAvatarGlyph, myAvatarId, onDelete, onChange, authPrompt, index }: Props) {
  const { getAccessToken } = usePrivy()
  const [showPicker, setShowPicker] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [expandedComments, setExpandedComments] = useState(false)
  const [comments, setComments] = useState<FeedComment[]>(post.commentsPreview ?? [])
  const [allLoaded, setAllLoaded] = useState(false)
  const [draft, setDraft] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editDraft, setEditDraft] = useState(post.body ?? '')
  const [savingEdit, setSavingEdit] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const pickerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const shareRef = useRef<HTMLDivElement>(null)
  const pickerWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMenu && !showShare && !showPicker) return
    const onPointerDown = (e: Event) => {
      const t = e.target as Node
      if (showMenu && menuRef.current && !menuRef.current.contains(t)) setShowMenu(false)
      if (showShare && shareRef.current && !shareRef.current.contains(t)) setShowShare(false)
      if (showPicker && pickerWrapRef.current && !pickerWrapRef.current.contains(t)) setShowPicker(false)
    }
    window.addEventListener('mousedown', onPointerDown)
    window.addEventListener('touchstart', onPointerDown, { passive: true })
    return () => {
      window.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('touchstart', onPointerDown)
    }
  }, [showMenu, showShare, showPicker])

  useEffect(() => {
    setEditDraft(post.body ?? '')
  }, [post.body])

  const isMine = !!myWallet && myWallet === post.authorWallet
  const liveName = isMine ? (myDisplayName?.trim() || null) : null
  const liveGlyph = isMine ? (myAvatarGlyph ?? null) : null
  const displayName = liveName ?? post.authorName ?? shortWallet(post.authorWallet)
  // Prefer the live avatar id for my own posts (so a fresh avatar choice is reflected
  // immediately); otherwise use whatever the API joined onto the post row.
  const resolvedAvatarId = isMine ? (myAvatarId ?? null) : (post.authorAvatar ?? null)
  const showsAvatarComponent = !!resolvedAvatarId
  const initial = liveGlyph ?? (liveName ?? post.authorName ?? post.authorWallet).slice(0, 1).toUpperCase()
  const rank = post.authorRank ?? 'Stargazer'
  const avatarBg = RANK_GRADIENT[rank] ?? RANK_GRADIENT.Stargazer

  async function react(reaction: ReactionType) {
    if (!myWallet) { authPrompt(); return }
    setShowPicker(false)
    const prev = myReaction ?? null
    const optimisticCount =
      prev === reaction ? Math.max(0, post.reactionCount - 1)
      : prev ? post.reactionCount
      : post.reactionCount + 1
    onChange({ ...post, myReaction: prev === reaction ? null : reaction, reactionCount: optimisticCount })
    navigator.vibrate?.(12)
    try {
      const authToken = await getAccessToken().catch(() => null)
      const res = await fetch('/api/feed/reactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ postId: post.id, wallet: myWallet, reaction }),
      })
      if (!res.ok) throw new Error('failed')
      const data = await res.json() as { reaction: ReactionType | null; reactionCount: number; topReactions: ReactionType[] }
      onChange({ ...post, myReaction: data.reaction, reactionCount: data.reactionCount, topReactions: data.topReactions })
    } catch {
      onChange({ ...post, myReaction: prev, reactionCount: post.reactionCount })
    }
  }

  async function saveEdit() {
    if (!myWallet) { authPrompt(); return }
    const nextBody = editDraft.trim()
    if (post.type === 'text' && !nextBody) return
    setSavingEdit(true)
    try {
      const authToken = await getAccessToken().catch(() => null)
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ wallet: myWallet, body: nextBody }),
      })
      if (!res.ok) throw new Error('failed')
      const updated = await res.json() as FeedPost
      onChange({
        ...post,
        ...updated,
        topReactions: updated.topReactions ?? post.topReactions,
        myReaction: updated.myReaction ?? post.myReaction,
        commentsPreview: updated.commentsPreview ?? post.commentsPreview,
      })
      setIsEditing(false)
    } catch {
      setEditDraft(post.body ?? '')
    } finally {
      setSavingEdit(false)
    }
  }

  async function submitComment() {
    if (!myWallet) { authPrompt(); return }
    const text = draft.trim()
    if (!text) return
    setDraft('')
    const optimistic: FeedComment = {
      id: `tmp-${Math.random().toString(36).slice(2)}`,
      postId: post.id,
      authorWallet: myWallet,
      authorName: null,
      body: text,
      reactionCount: 0,
      createdAt: new Date().toISOString(),
    }
    setComments(prev => [...prev, optimistic])
    onChange({ ...post, commentCount: post.commentCount + 1 })
    try {
      const authToken = await getAccessToken().catch(() => null)
      const res = await fetch('/api/feed/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ postId: post.id, authorWallet: myWallet, body: text }),
      })
      if (!res.ok) throw new Error('failed')
      const created = await res.json() as FeedComment
      setComments(prev => prev.map(c => (c.id === optimistic.id ? created : c)))
    } catch {
      setComments(prev => prev.filter(c => c.id !== optimistic.id))
      onChange({ ...post, commentCount: Math.max(0, post.commentCount - 1) })
    }
  }

  async function loadAllComments() {
    setExpandedComments(true)
    if (allLoaded) return
    try {
      const res = await fetch(`/api/feed/comments?postId=${post.id}&limit=50`)
      if (res.ok) {
        const data = await res.json() as { comments: FeedComment[] }
        setComments(data.comments)
        setAllLoaded(true)
      }
    } catch {}
  }

  async function share(destination: 'farcaster' | 'twitter' | 'copy_link') {
    setShowShare(false)
    if (!myWallet) { authPrompt(); return }
    onChange({ ...post, shareCount: post.shareCount + 1 })
    try {
      const res = await fetch('/api/feed/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, wallet: myWallet, destination }),
      })
      const data = await res.json() as { shareUrl: string; shareCount: number }
      const url = data.shareUrl
      const text = post.body ?? post.achievementTarget ?? 'Tonight on Stellar'
      if (destination === 'copy_link') {
        try { await navigator.clipboard.writeText(url) } catch {}
      } else if (destination === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
      } else {
        window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`, '_blank')
      }
      onChange({ ...post, shareCount: data.shareCount })
    } catch {
      onChange({ ...post, shareCount: post.shareCount })
    }
  }

  async function deletePost() {
    if (!myWallet || !onDelete) return
    setShowMenu(false)
    try {
      const authToken = await getAccessToken().catch(() => null)
      const res = await fetch(`/api/feed/posts/${post.id}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      })
      if (res.ok) onDelete(post.id)
    } catch {}
  }

  const top = ((post.topReactions ?? []) as ReactionType[]).filter(r => r in REACTION_EMOJI)
  const myReaction: ReactionType | null = post.myReaction && (post.myReaction as string) in REACTION_EMOJI
    ? (post.myReaction as ReactionType)
    : null
  const animationDelay = `${Math.min(index, 5) * 0.05}s`
  const chips = observationChips(post)

  return (
    <article className="feed-post" style={{ animationDelay }}>
      <div className="post-header">
        <Link
          href={`/u/${post.authorWallet}`}
          prefetch={false}
          className="post-author"
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          {showsAvatarComponent ? (
            <Avatar avatarId={resolvedAvatarId} initial={initial} size={42} />
          ) : (
            <div className="author-avatar" style={{ background: avatarBg }}>{initial}</div>
          )}
          <div>
            <div className="author-name">
              {displayName}
              {rank === 'Celestial' && (
                <svg className="verified-tick" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.5 3 4-1 1 4 3 2.5-3 2.5 1 4-4-1-2.5 3-2.5-3-4 1-1-4-3-2.5 3-2.5-1-4 4 1z"/>
                  <path d="M9 12l2 2 4-4" stroke="#070B14" strokeWidth="2" fill="none"/>
                </svg>
              )}
            </div>
            <div className="author-meta">
              <span>{rank}</span>
              <span className="author-meta-dot" />
              <span>{relativeTime(post.createdAt)}</span>
              {post.achievementStars != null && (
                <>
                  <span className="author-meta-dot" />
                  <span>✦ {post.achievementStars}</span>
                </>
              )}
            </div>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!isMine && <FollowButton wallet={post.authorWallet} authPrompt={authPrompt} />}
          <div ref={menuRef} className={!isMine ? 'mobile-only-menu-wrap' : ''} style={{ position: 'relative' }}>
            <button type="button" className="post-menu" onClick={() => setShowMenu(s => !s)} aria-label="More">
              <MoreHorizontal size={18} />
            </button>
            {showMenu && (
              <div className="post-menu-dropdown">
                {isMine ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false)
                        setIsEditing(true)
                        setEditDraft(post.body ?? '')
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={deletePost}>
                      <Trash2 size={13} /> Delete
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => share('copy_link')}>
                    <Copy size={13} /> Copy link
                  </button>
                )}
              </div>
            )}
            </div>
        </div>
      </div>

      {isEditing ? (
        <div className="post-edit-shell">
          <textarea
            className="post-edit-input"
            value={editDraft}
            maxLength={2000}
            rows={post.type === 'text' ? 4 : 3}
            autoFocus
            placeholder={post.type === 'text' ? 'Refine your observation...' : 'Add a short caption...'}
            onChange={(e) => setEditDraft(e.target.value)}
          />
          <div className="post-edit-actions">
            <button
              type="button"
              className="post-edit-btn ghost"
              disabled={savingEdit}
              onClick={() => {
                setIsEditing(false)
                setEditDraft(post.body ?? '')
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="post-edit-btn"
              disabled={savingEdit || (post.type === 'text' && !editDraft.trim())}
              onClick={saveEdit}
            >
              {savingEdit ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <>
          {post.type === 'achievement' && post.body && (
            <div className="post-quote">&ldquo;{post.body}&rdquo;</div>
          )}
          {post.type !== 'achievement' && post.body && (
            <div className="post-text">{renderTextWithHashtags(post.body)}</div>
          )}
        </>
      )}

      {post.type === 'photo' && post.imageUrl && (
        <button type="button" className="post-media" onClick={() => setLightbox(true)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.observationTarget ?? 'Post media'}
            loading="lazy"
            decoding="async"
          />
          {post.observationNftAddress && (
            <div className="media-badge">
              <Telescope size={11} />
              NFT · Sealed
            </div>
          )}
          {post.observationTarget && (
            <div className="media-object-tag">
              <Telescope size={12} />
              {post.observationTarget}
            </div>
          )}
          {(post.observationTarget || post.observationLat) && (
            <div className="media-meta">
              {post.observationTarget && <div className="media-target">{post.observationTarget}</div>}
              {(post.observationLat || post.observationLon) && (
                <div className="media-coords">
                  {post.observationLat ?? ''}{post.observationLon ? ` · ${post.observationLon}` : ''}
                  {post.observationBortle != null ? ` · Bortle ${post.observationBortle}` : ''}
                </div>
              )}
            </div>
          )}
        </button>
      )}

      {chips.length > 0 && (
        <div className="observation-chip-row" aria-label="Observation metadata">
          {chips.map((chip, i) => (
            <span className="observation-chip" key={chip}>
              {i === chips.length - 1 && chip === 'Location logged' ? <MapPin size={12} /> : <Telescope size={12} />}
              {chip}
            </span>
          ))}
        </div>
      )}

      {post.type === 'achievement' && post.achievementTarget && (
        <div className="achievement">
          <div className="achievement-icon"><Telescope size={28} color="#070B14" /></div>
          <div className="achievement-body">
            <div className="achievement-label">Mission Sealed</div>
            <div className="achievement-title">{post.achievementTarget}</div>
            <div className="achievement-sub">
              {post.achievementDifficulty ? `${post.achievementDifficulty} · ` : ''}
              Verified by sky oracle{post.achievementMintTx ? ' · NFT minted on Solana' : ''}
            </div>
          </div>
          {post.achievementStars != null && (
            <div className="achievement-stars">+{post.achievementStars} ✦</div>
          )}
        </div>
      )}

      <div className="reactions-summary">
        <div className="reactions-icons">
          {top.length > 0 && (
            <div className="reaction-stack">
              {top.map((r, i) => (
                <div key={r} className="reaction-emoji" style={{ background: REACTION_GRADIENT[r], marginLeft: i === 0 ? 0 : -6 }}>
                  {REACTION_EMOJI[r]}
                </div>
              ))}
            </div>
          )}
          <span style={{ marginLeft: top.length > 0 ? 6 : 0 }}>
            {post.reactionCount > 0 ? `${post.reactionCount} reactions` : 'Be the first to react'}
          </span>
        </div>
        <div className="reactions-count-right">
          {post.commentCount} comments · {post.shareCount} shares
        </div>
      </div>

      <div className="actions">
        <div
          ref={pickerWrapRef}
          className="action-wrap"
          onMouseEnter={() => { if (pickerTimer.current) clearTimeout(pickerTimer.current); setShowPicker(true) }}
          onMouseLeave={() => { pickerTimer.current = setTimeout(() => setShowPicker(false), 250) }}
        >
          {showPicker && (
            <div className="reaction-picker">
              {REACTION_TYPES.map(r => (
                <button
                  type="button"
                  key={r}
                  className="reaction-pick"
                  style={{ background: REACTION_PICK_BG[r] }}
                  title={REACTION_LABEL[r]}
                  onClick={() => react(r)}
                >
                  {REACTION_EMOJI[r]}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className={`action ${myReaction ? 'liked' : ''}`}
            onClick={() => {
              if (longPressFired.current) { longPressFired.current = false; return }
              react('like')
            }}
            onTouchStart={() => {
              longPressFired.current = false
              if (longPressTimer.current) clearTimeout(longPressTimer.current)
              longPressTimer.current = setTimeout(() => {
                longPressFired.current = true
                setShowPicker(true)
              }, 260)
            }}
            onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
            onTouchMove={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }}
            onContextMenu={e => { e.preventDefault(); setShowPicker(true) }}
          >
            {myReaction ? (
              <span style={{ fontSize: 16 }}>{REACTION_EMOJI[myReaction]}</span>
            ) : (
              <span style={{ fontSize: 16 }}>👍</span>
            )}
            <span>{myReaction ? REACTION_LABEL[myReaction] : 'Like'}</span>
            {post.reactionCount > 0 && <span className="action-count">{post.reactionCount}</span>}
          </button>
        </div>
        <button type="button" className="action" onClick={loadAllComments}>
          <MessageCircle size={16} />
          <span>Comment</span>
          {post.commentCount > 0 && <span className="action-count">{post.commentCount}</span>}
        </button>
        <div ref={shareRef} style={{ flex: 1, position: 'relative' }}>
          <button type="button" className="action" style={{ width: '100%' }} onClick={() => setShowShare(s => !s)}>
            <Share2 size={16} />
            <span>Share</span>
            {post.shareCount > 0 && <span className="action-count">{post.shareCount}</span>}
          </button>
          {showShare && (
            <div className="share-sheet">
              <button type="button" onClick={() => share('copy_link')}><Copy size={13} /> Copy link</button>
              <button type="button" onClick={() => share('twitter')}><Twitter size={13} /> Share to X</button>
              <button type="button" onClick={() => share('farcaster')}>
                <svg width="13" height="13" viewBox="0 0 1000 1000" fill="currentColor"><path d="M257.778 155.556h484.444v688.889h-71.111v-315.556h-.703c-7.857-87.182-81.156-155.556-170.412-155.556s-162.555 68.374-170.41 155.556h-.704v315.556h-71.114V155.556z"/></svg>
                Share to Farcaster
              </button>
            </div>
          )}
        </div>
        <button type="button" className="action action-bookmark" onClick={() => myWallet ? undefined : authPrompt()} aria-label="Bookmark">
          <Bookmark size={16} />
        </button>
      </div>

      {(comments.length > 0 || expandedComments) && (
        <div className="comments">
          {comments.map(c => (
            <div key={c.id} className="comment">
              <div
                className="comment-avatar"
                style={{ background: c.authorWallet === myWallet ? RANK_GRADIENT.Pathfinder : RANK_GRADIENT.Stargazer }}
              >
                {(c.authorName ?? c.authorWallet).slice(0, 1).toUpperCase()}
              </div>
              <div className="comment-bubble">
                <div className="comment-content">
                  <div className="comment-author">{c.authorName ?? shortWallet(c.authorWallet)}</div>
                  <div className="comment-text">{c.body}</div>
                </div>
                <div className="comment-actions">
                  <span className="comment-time">{relativeTime(c.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
          {!expandedComments && post.commentCount > comments.length && (
            <button type="button" className="more-comments" onClick={loadAllComments}>
              View {post.commentCount - comments.length} more comments
            </button>
          )}
          <div className="comment-input-row">
            {myAvatarId ? (
              <Avatar avatarId={myAvatarId} initial={myInitial} size={32} />
            ) : (
              <div className="comment-avatar" style={{ background: RANK_GRADIENT.Pathfinder }}>{myInitial}</div>
            )}
            <div className="comment-input-wrap">
              <input
                className="comment-input"
                placeholder={myWallet ? 'Write a comment…' : 'Sign in to comment'}
                disabled={!myWallet}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
              />
            </div>
          </div>
        </div>
      )}

      {comments.length === 0 && !expandedComments && (
        <div className="comment-input-row" style={{ marginTop: 14 }}>
          <div className="comment-avatar" style={{ background: RANK_GRADIENT.Pathfinder }}>{myInitial}</div>
          <div className="comment-input-wrap">
            <input
              className="comment-input"
              placeholder={myWallet ? 'Write a comment…' : 'Sign in to comment'}
              disabled={!myWallet}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment() } }}
            />
          </div>
        </div>
      )}

      {lightbox && post.imageUrl && (
        <div className="feed-lightbox" onClick={() => setLightbox(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.imageUrl} alt="" decoding="async" />
        </div>
      )}
    </article>
  )
}

const FeedPostCard = memo(FeedPostCardImpl, (prev, next) => (
  prev.post === next.post &&
  prev.myWallet === next.myWallet &&
  prev.myInitial === next.myInitial &&
  prev.myDisplayName === next.myDisplayName &&
  prev.myAvatarGlyph === next.myAvatarGlyph &&
  prev.myAvatarId === next.myAvatarId &&
  prev.index === next.index
))

export default FeedPostCard
