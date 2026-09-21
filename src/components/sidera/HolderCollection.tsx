import CardPlate from './CardPlate'
import Caption from './ui/Caption'
import type { Rarity } from '@/lib/rarity'
import { PLACEHOLDER_ART } from '@/lib/sets/build'
import { SET_001_CARD_BY_DESIGNATION } from '@/lib/sets/set-001'
import { rarityInfo } from '@/lib/rarity'
import type { CaptureSummary, HolderEdition } from '@/lib/sidera/repo'

const pad = (n: number) => String(n).padStart(3, '0')

function captureParts(capture: CaptureSummary): string[] {
  return [
    `Node ${capture.nodeId}`,
    new Date(capture.capturedAt).toISOString().replace('T', ' ').slice(0, 16) + ' UTC',
    capture.provenance === 'instrument' ? 'Instrument' : 'Simulated',
  ]
}

/**
 * A holder's editions as plates, scarcest first. Each one carries its own
 * number and, where Node 01 has photographed the object, the capture data
 * beneath it — the photograph is the card's, shared by every edition of it.
 */
export default function HolderCollection({ editions }: { editions: HolderEdition[] }) {
  if (editions.length === 0) {
    return <p className="sd-note">No cards yet. Set 001 is where they come from.</p>
  }

  const ordered = [...editions].sort((a, b) => {
    const rank = rarityInfo(b.rarity as Rarity).rank - rarityInfo(a.rarity as Rarity).rank
    return rank !== 0 ? rank : a.designation.localeCompare(b.designation)
  })

  return (
    <>
      <h2 className="sd-section__title sd-section">Editions held</h2>
      <ul className="sd-grid">
        {ordered.map((e) => (
          <li key={e.editionId}>
            <CardPlate
              designation={e.designation}
              name={e.name}
              rarity={e.rarity as Rarity}
              artUrl={SET_001_CARD_BY_DESIGNATION.get(e.designation)?.seed.artUrl ?? PLACEHOLDER_ART}
              href={`/card/${e.designation}`}
              data={[{ label: 'Edition', value: `No. ${pad(e.editionNumber)}` }]}
            />
            {e.latest ? (
              <Caption as="p" parts={captureParts(e.latest)} />
            ) : (
              <Caption as="p">Not yet photographed</Caption>
            )}
          </li>
        ))}
      </ul>
    </>
  )
}
