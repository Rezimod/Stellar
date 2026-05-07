'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ShopPreview {
  id: string
  name: string
  priceGel: number
  imageUrl: string
  starsOffer?: { stars: number; label: string }
}

interface DiscoveryPreview {
  id: string
  imageUrl: string | null
  observationTarget: string | null
  authorName: string | null
  createdAt: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export function DiscoveriesWidget() {
  const [items, setItems] = useState<DiscoveryPreview[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/feed/posts?filter=discoveries&limit=8')
      .then(r => r.ok ? r.json() : null)
      .then((d: { posts?: DiscoveryPreview[] } | null) => {
        if (!d?.posts) return
        const withImage = d.posts.filter(p => p.imageUrl).slice(0, 3)
        setItems(withImage)
      })
      .catch(() => {})
  }, [])

  if (items.length === 0) return null

  return (
    <div className="side-section">
      <div className="side-label">
        Recent Discoveries
        <Link href="/feed?filter=discoveries" className="side-label-link">Browse all →</Link>
      </div>
      <div className="discoveries-card">
        {items.map(d => (
          <button
            key={d.id}
            className="discovery-row"
            onClick={() => router.push('/feed?filter=discoveries')}
          >
            <div
              className="discovery-thumb"
              style={d.imageUrl ? { backgroundImage: `url(${d.imageUrl})` } : undefined}
            />
            <div className="discovery-body">
              <div className="discovery-target">
                {d.observationTarget ?? 'Untitled observation'}
              </div>
              <div className="discovery-meta">
                <span>{d.authorName ?? 'Astronomer'}</span>
                <span className="discovery-dot" />
                <span>{timeAgo(d.createdAt)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ShopWidget() {
  const [products, setProducts] = useState<ShopPreview[]>([])
  const router = useRouter()

  useEffect(() => {
    fetch('/api/feed/shop-preview').then(r => r.json()).then((d: ShopPreview[]) => {
      if (Array.isArray(d)) setProducts(d)
    }).catch(() => {})
  }, [])

  if (products.length === 0) return null

  return (
    <div className="side-section">
      <div className="side-label">
        From Astroman
        <Link href="/marketplace" className="side-label-link">Browse all →</Link>
      </div>
      <div className="shop-card">
        {products.map(p => (
          <button
            key={p.id}
            className="shop-product"
            onClick={() => router.push(`/marketplace?product=${encodeURIComponent(p.id)}`)}
          >
            <div className="shop-img" style={{ backgroundImage: `url(${p.imageUrl})` }} />
            <div className="shop-info">
              <div className="shop-name">{p.name}</div>
              <div className="shop-price">
                <span className="shop-price-gel">{p.priceGel} ₾</span>
                {p.starsOffer && <span className="shop-price-stars">{p.starsOffer.label}</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
