'use client'

import { useEffect } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'

export function useUserSync() {
  const { authenticated, user } = usePrivy()
  const { wallets } = useWallets()

  useEffect(() => {
    if (!authenticated || !user) return

    const email = user.email?.address ?? null
    const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana')
    const walletAddress = solanaWallet?.address ?? null

    fetch('/api/users/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privyId: user.id, email, walletAddress }),
    }).catch(() => {})
  }, [authenticated, user, wallets])
}
