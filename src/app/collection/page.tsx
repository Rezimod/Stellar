import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import CollectionWallet from '@/components/sidera/CollectionWallet'
import HolderCollection from '@/components/sidera/HolderCollection'
import SideraShell from '@/components/sidera/SideraShell'
import SideraView from '@/components/sidera/SideraView'
import DataRow from '@/components/sidera/ui/DataRow'
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
  let summary: ReactNode = null

  if (!wallet) {
    body = <CollectionWallet />
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
    if (editions) {
      const photographed = editions.filter((e) => e.latest).length
      summary = (
        <DataRow
          items={[
            { label: 'Holder', value: `${wallet.slice(0, 4)}…${wallet.slice(-4)}` },
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
    <SideraShell>
      <SideraView step="collection" />
      <section className="sd-container sd-page">
        <div className="sd-page__head">
          <div>
            <p className="sd-eyebrow">Holder</p>
            <h1 className="sd-page__title">Collection</h1>
          </div>
        </div>
        {summary && <div className="sd-section">{summary}</div>}
        {body}
      </section>
    </SideraShell>
  )
}
