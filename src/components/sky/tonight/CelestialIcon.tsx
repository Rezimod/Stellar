import type { IconKind } from './data';

// Pure-CSS celestial tile. Renders a rounded-square space tile with a centered
// sphere/disk; the per-kind detail layers (rings, spots, craters) live in CSS.
// `size` sets the tile edge in px; the body/feature math scales off it via the
// `--pic-size` custom property.
export default function CelestialIcon({
  kind,
  size = 38,
  className = '',
}: {
  kind: IconKind;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`pic pic--${kind} ${className}`}
      style={{ ['--pic-size' as string]: `${size}px` }}
      aria-hidden="true"
    >
      <span className="pic__body sphere">
        {kind === 'saturn' && <span className="pic__ring" />}
        {kind === 'jupiter' && <span className="pic__spot" />}
        {kind === 'mars' && <span className="pic__cap" />}
        {kind === 'andromeda' && <span className="pic__core" />}
        {kind === 'sombrero' && <span className="pic__dust" />}
        {kind === 'albireo' && <span className="pic__companion" />}
      </span>
    </span>
  );
}
