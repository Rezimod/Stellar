'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthModal } from '@/components/auth/AuthModal'
import { useStellarUser } from '@/hooks/useStellarUser'

/**
 * The Collection is read by wallet. A signed-in holder should never have to
 * type theirs, so the page sends itself to its own address once Privy is
 * ready; a stranger is offered the sign-in the rest of Sidera uses.
 */
export default function CollectionWallet() {
  const router = useRouter()
  const { ready, authenticated, address } = useStellarUser()
  const [authOpen, setAuthOpen] = useState(false)

  useEffect(() => {
    if (ready && authenticated && address) router.replace(`/collection?wallet=${address}`)
  }, [ready, authenticated, address, router])

  if (!ready) return <p className="sd-note">Reading the account.</p>

  if (authenticated && address) return <p className="sd-note">Opening your Collection.</p>

  return (
    <>
      <p className="sd-lede">Sign in to read your Collection, or add a holder address to the address bar to read theirs.</p>
      <div className="sd-pay__actions sd-section">
        <button type="button" className="sd-btn" onClick={() => setAuthOpen(true)}>
          Sign in
        </button>
      </div>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  )
}
