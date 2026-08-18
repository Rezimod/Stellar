'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Fits the fixed-size share card into a fluid column.
 *
 * <ShareCard> is authored at exactly 1200x630 because the same markup has to
 * back the Open Graph image, so it cannot reflow — it scales. The ratio has to
 * be measured, since CSS has no way to divide a viewport length by a number
 * and get back a plain multiplier for `transform: scale()`.
 *
 * `cardWidth` is passed in rather than imported so this client component does
 * not drag ShareCard — and through it the whole object catalogue — into the
 * browser bundle.
 */
export default function ShareCardFrame({
  children,
  cardWidth,
}: {
  children: ReactNode;
  cardWidth: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Layout effect, not effect: this runs before paint, so the card is never
  // shown at 1200px wide and then snapped down.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => setScale(Math.min(1, el.clientWidth / cardWidth));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [cardWidth]);

  return (
    <div
      ref={ref}
      className="dsc-card-frame"
      style={{ '--dsc-card-scale': scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
