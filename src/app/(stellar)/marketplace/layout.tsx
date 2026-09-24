import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Astronomy Shop — Telescopes, Optics & Gear | Stellar',
  description:
    'Shop telescopes, optics and astronomy gear, or redeem your Stars for real equipment from Astroman — Georgia’s astronomy specialist.',
  alternates: { canonical: '/marketplace' },
  openGraph: {
    title: 'Astronomy Shop — Telescopes, Optics & Gear | Stellar',
    description:
      'Shop telescopes, optics and gear, or redeem your Stars for real equipment from Astroman.',
    url: 'https://stellarr.club/marketplace',
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
