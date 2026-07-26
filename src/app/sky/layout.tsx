import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sky Calendar 2026 — Meteor Showers, Eclipses & Celestial Events | Stellar',
  description:
    'Your 2026 sky calendar — meteor showers, eclipses, planetary conjunctions and the best celestial events, with times tuned to your location on Stellar.',
  alternates: { canonical: '/sky' },
  openGraph: {
    title: 'Sky Calendar 2026 — Meteor Showers, Eclipses & Celestial Events | Stellar',
    description:
      'Meteor showers, eclipses, conjunctions and the best 2026 celestial events, with times tuned to your location.',
    url: 'https://stellarr.club/sky',
  },
};

export default function SkyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Screen-reader/SEO context line. Kept as a <p>, not a second <h1> —
          the page's visible "Sky tonight" heading is the page's sole h1. */}
      <p className="sr-only">Sky Calendar 2026 — meteor showers, eclipses and celestial events, plus a live tonight&apos;s-sky planet finder.</p>
      {children}
    </>
  );
}
