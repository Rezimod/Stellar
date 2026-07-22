import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Tonight's Sky Missions — Photograph Planets, Earn Stars, Win Telescopes | Stellar",
  description:
    "Complete tonight's astronomy missions — photograph planets, the Moon and deep-sky objects, earn Stars, and redeem them for real telescopes at Astroman.",
  alternates: { canonical: '/missions' },
  openGraph: {
    title: "Tonight's Sky Missions — Photograph Planets, Earn Stars, Win Telescopes | Stellar",
    description:
      "Complete tonight's astronomy missions — photograph planets and deep-sky objects, earn Stars, redeem for real telescopes at Astroman.",
    url: 'https://stellarr.club/missions',
  },
};

export default function MissionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <h1 className="sr-only">Tonight&apos;s Sky Missions — Photograph Planets, Earn Stars</h1>
      {children}
    </>
  );
}
