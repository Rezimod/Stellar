import type { CaptureSummary, HolderEdition } from '@/lib/sidera/repo'

function CaptureLine({ capture }: { capture: CaptureSummary }) {
  return (
    <>
      {capture.targetName}, {capture.capturedAt}, provenance {capture.provenance}, node {capture.nodeId}
    </>
  )
}

/** A holder's editions as a plain list. The design comes later; the facts are all here. */
export default function HolderCollection({ editions }: { editions: HolderEdition[] }) {
  if (editions.length === 0) return <p>This holder has no cards yet.</p>

  return (
    <ul>
      {editions.map((e) => (
        <li key={e.editionId}>
          <p>
            <strong>{e.designation}</strong> {e.name}
          </p>
          <p>
            Edition {String(e.editionNumber).padStart(3, '0')} of {e.editionSize}, {e.rarity},
            observation status {e.observationStatus.replace('_', ' ')}
          </p>
          <p>
            Latest observation:{' '}
            {e.latest ? <CaptureLine capture={e.latest} /> : 'No observation yet'}
          </p>
          {e.history.length > 0 && (
            <>
              <p>Observation history</p>
              <ol>
                {e.history.map((h) => (
                  <li key={h.id}>
                    Night of {h.nightDate}: <CaptureLine capture={h} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
