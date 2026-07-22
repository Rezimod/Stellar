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
      <h1 className="sr-only">Sky Calendar 2026 — Meteor Showers, Eclipses &amp; Celestial Events</h1>
      {children}
    </>
  );
}
