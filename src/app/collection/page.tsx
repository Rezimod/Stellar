import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import CollectionWallet from '@/components/stellar/CollectionWallet'
import CollectionHead from '@/components/stellar/CollectionHead'
import HolderCollection from '@/components/stellar/HolderCollection'
import StellarShell from '@/components/stellar/StellarShell'
import StellarView from '@/components/stellar/StellarView'
import DataRow from '@/components/stellar/ui/DataRow'
import { getDb } from '@/lib/db'
import { holderView, type HolderEdition } from '@/lib/stellar/repo'

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
  let summary: ReactNode = null

  if (!wallet) {
    body = (
      <div className="sd-gate">
        <CollectionWallet />
      </div>
    )
  } else {
    const db = getDb()
    let editions: HolderEdition[] | null = null
    if (db) {
      try {
        editions = await holderView(db, wallet)
      } catch (err) {
        console.error('[stellar] cannot read collection', err)
      }
    }
    if (editions) {
      const photographed = editions.filter((e) => e.latest).length
      summary = (
        <DataRow
          className="sd-strip"
          items={[
            { label: 'Cards', value: editions.length },
            { label: 'Photographed', value: `${photographed} / ${editions.length}` },
          ]}
        />
      )
      body = <HolderCollection editions={editions} />
    } else {
      body = <p className="sd-note">The Collection cannot be read at the moment.</p>
    }
  }

  return (
    <StellarShell title="Collection">
      <StellarView step="collection" />
      <section className="sd-container sd-top">
        {wallet && <CollectionHead wallet={wallet} />}
        {summary}
        <div className={summary ? 'sd-chapter-block' : undefined} style={summary ? { marginTop: 32 } : undefined}>
          {body}
        </div>
      </section>
    </StellarShell>
  )
}
