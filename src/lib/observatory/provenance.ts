/**
 * Where a frame came from, and what that entitles it to.
 *
 * Every capture carries this from the adapter outward. A simulated frame is a
 * teaching tool and a demo; it is not evidence, so it cannot mint a Discovery
 * Attestation, cannot award Stars, and cannot be written to `observation_log`
 * as an observation. The rule is enforced here, at one boundary, rather than by
 * remembering to check in each surface.
 *
 * The reason this rail exists before the feature does: in July a certify-all
 * window put fourteen mainnet cNFTs on chain carrying "Verified: yes" for
 * observations nothing had verified. A simulator that can mint would be the
 * same mistake, made deliberately.
 */

export type Provenance =
  /** Computed from a model of the optics. Honest, and worth nothing on chain. */
  | 'simulated'
  /** Read off a real sensor, on a real mount, pointed at the real sky. */
  | 'instrument';

export type CollectionVerdict =
  | { admitted: true }
  | { admitted: false; reason: string };

/**
 * Whether a capture may enter the Collection — mint, award Stars, or be logged
 * as an observation. Anything that is not instrument-grade is refused, and the
 * refusal carries the reason so a surface can say it plainly.
 */
export function admitToCollection(provenance: Provenance): CollectionVerdict {
  if (provenance !== 'instrument') {
    return {
      admitted: false,
      reason:
        'Simulated frames stay in the session log. Nothing computed from a model can be minted, rewarded, or recorded as an observation.',
    };
  }
  return { admitted: true };
}
