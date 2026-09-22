import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import CollectionWallet from '@/components/sidera/CollectionWallet'
import HolderCollection from '@/components/sidera/HolderCollection'
import SideraShell from '@/components/sidera/SideraShell'
import SideraView from '@/components/sidera/SideraView'
import DataRow from '@/components/sidera/ui/DataRow'
import PageHead from '@/components/sidera/ui/PageHead'
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
          className="sd-facts"
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
      <PageHead
        index="05"
        section="Collection"
        meta={wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : 'Holder'}
        eyebrow="Holder"
        title="Your Collection."
        sub="Every edition you hold, and every photograph Node 01 has taken of it."
      >
        {summary}
      </PageHead>
      <section className="sd-container sd-chapter-block" style={{ marginTop: 24 }}>
        {body}
      </section>
    </SideraShell>
  )
}
