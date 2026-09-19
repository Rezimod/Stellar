import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import HolderCollection from '@/components/sidera/HolderCollection'
import { getDb } from '@/lib/db'
import { holderView, type HolderEdition } from '@/lib/sidera/repo'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Collection',
  robots: { index: false },
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ wallet?: string | string[] }>
}) {
  const { wallet: raw } = await searchParams
  const wallet = typeof raw === 'string' ? raw.trim() : ''

  let body: ReactNode
  if (!wallet) {
    body = <p>Add ?wallet= and a holder address to read that Collection.</p>
  } else {
    const db = getDb()
    let editions: HolderEdition[] | null = null
    if (db) {
      try {
        editions = await holderView(db, wallet)
      } catch (err) {
        console.error('[sidera] cannot read collection', err)
      }
    }
    body = (
      <>
        <p>Holder {wallet}</p>
        {editions ? (
          <HolderCollection editions={editions} />
        ) : (
          <p>The Collection cannot be read at the moment.</p>
        )}
      </>
    )
  }

  return (
    <main>
      <h1>Collection</h1>
      {body}
    </main>
  )
}
