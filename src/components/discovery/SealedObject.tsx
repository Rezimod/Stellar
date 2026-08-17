/**
 * The blacked-out celestial object — Phase 1's single visual anchor.
 *
 * Everything that makes it read as an unlit sphere rather than a flat hole
 * (off-centre radial fill, cyan limb, breathing halo) lives in `.dsc-sealed`
 * in discovery.css.
 */
export default function SealedObject() {
  return <div className="dsc-sealed" aria-hidden="true" />;
}
