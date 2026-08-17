import type { RevealedObject } from '@/lib/discovery/mockReveal';

/**
 * Generative stand-in for the object's image.
 *
 * Placeholder for real astrophotography, but built like the real thing — hot
 * core, mid field, cool outer halo — so swapping in a photograph later is a
 * straight substitution rather than a layout change.
 */
export default function ObjectVisual({ object }: { object: RevealedObject }) {
  return (
    <div
      className="dsc-object-visual"
      role="img"
      aria-label={`Stylised rendering of ${object.catalog}, ${object.name}`}
      style={
        {
          '--dsc-vis-core': object.visual.core,
          '--dsc-vis-mid': object.visual.mid,
          '--dsc-vis-halo': object.visual.halo,
        } as React.CSSProperties
      }
    />
  );
}
