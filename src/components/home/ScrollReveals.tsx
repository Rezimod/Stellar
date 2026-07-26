'use client';

import { useEffect } from 'react';

/**
 * Drives the homepage scroll-reveal choreography without adding any wrapper
 * elements: it observes every `[data-reveal]` / `[data-reveal-stagger]` node
 * already in the server HTML and flips `data-reveal-in` on once it scrolls
 * into view. The reveal itself is pure CSS (globals.css). Renders nothing.
 */
export default function ScrollReveals() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal], [data-reveal-stagger]'),
    );
    if (!els.length) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.setAttribute('data-reveal-in', ''));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-reveal-in', '');
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
    );

    els.forEach((el) => {
      // Anything already within (or near) the first screen reveals right away
      // so a refresh mid-page never leaves content hidden below the fold logic.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.setAttribute('data-reveal-in', '');
      } else {
        io.observe(el);
      }
    });

    return () => io.disconnect();
  }, []);

  return null;
}
