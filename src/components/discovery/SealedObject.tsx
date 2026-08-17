/**
 * The blacked-out celestial object.
 *
 * Everything that makes it read as an unlit sphere rather than a flat hole
 * (off-centre radial fill, cyan limb, breathing halo) lives in `.dsc-sealed`
 * in discovery.css.
 *
 * `size` overrides the default 280px hero diameter. The halo scales with it —
 * a glow tuned for 280px swamps a 120px card version.
 */
export default function SealedObject({ size }: { size?: number }) {
  if (size === undefined) return <div className="dsc-sealed" aria-hidden="true" />;

  return (
    <div
      className="dsc-sealed"
      aria-hidden="true"
      style={
        {
          width: size,
          maxWidth: '100%',
          '--dsc-halo': `${Math.round(size * 0.27)}px`,
        } as React.CSSProperties
      }
    />
  );
}
