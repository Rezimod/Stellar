'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthModal } from '@/components/auth/AuthModal'
import { useSideraHolder } from './useSideraHolder'

/**
 * The Collection is read by wallet. A signed-in holder never has to type
 * theirs — the page sends itself to their address as soon as Privy answers —
 * and anyone can read a Collection by naming its holder, so the page is never
 * a dead end while the session is still being read.
 */
export default function CollectionWallet() {
  const router = useRouter()
  const { ready, authenticated, address } = useSideraHolder()
  const [authOpen, setAuthOpen] = useState(false)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (ready && authenticated && address) router.replace(`/collection?wallet=${address}`)
  }, [ready, authenticated, address, router])

  if (ready && authenticated && address) return <p className="sd-note">Opening your Collection.</p>

  return (
    <>
      <p className="sd-lede">Sign in to see what you hold — or name any holder and read theirs. A Collection is public, like the log.</p>
      <div className="sd-pay__actions sd-section">
        <button type="button" className="sd-btn sd-btn--primary" onClick={() => setAuthOpen(true)} disabled={!ready}>
          {ready ? 'Sign in' : 'Reading the account'}
        </button>
      </div>
      <form
        className="sd-pay__actions sd-section"
        onSubmit={(e) => {
          e.preventDefault()
          const wallet = typed.trim()
          if (wallet) router.push(`/collection?wallet=${encodeURIComponent(wallet)}`)
        }}
      >
        <label className="sr-only" htmlFor="sd-holder">
          Holder address
        </label>
        <input
          id="sd-holder"
          className="sd-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Holder address"
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" className="sd-btn" disabled={!typed.trim()}>
          Read it
        </button>
      </form>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
