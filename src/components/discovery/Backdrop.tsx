import Image from 'next/image';

/**
 * A real deep-sky photograph behind the page, pushed almost to black.
 *
 * The CSS starfield gives motion but no depth — every discovery page was a flat
 * navy field with dots on it. A genuine nebula frame at low opacity puts
 * structure and colour behind the content without competing with it, which is
 * the difference between "dark theme" and "cosmic".
 *
 * Deliberately not `fixed`: PageTransition transforms its wrapper during the
 * enter animation, which would make a fixed child resolve against that box
 * instead of the viewport — the same trap documented on .dsc-starfield.
 */
export default function Backdrop({
  src = '/images/dso/m8.jpg',
  /** 0–1. Above ~0.3 the image starts competing with foreground type. */
  intensity = 0.22,
}: {
  src?: string;
  intensity?: number;
}) {
  return (
    <div className="dsc-backdrop" aria-hidden="true" style={{ opacity: intensity }}>
      <Image src={src} alt="" fill sizes="100vw" className="dsc-backdrop-photo" priority />
      <span className="dsc-backdrop-veil" />
    </div>
  );
}
