/**
 * Site-wide structured data (JSON-LD). Rendered once in the root layout so every
 * page carries Organization + WebApplication schema for rich results. Page-specific
 * schema (Event, FAQPage, Article) can be added per-route later.
 */
export default function JsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://stellarr.club/#organization',
        name: 'Stellar',
        url: 'https://stellarr.club',
        logo: 'https://stellarr.club/apple-touch-icon.png',
        sameAs: ['https://x.com/StellarClub26', 'https://astroman.ge'],
        description:
          'Stellar is a gamified astronomy app: photograph the night sky, complete missions, earn Stars and collect discovery NFTs.',
      },
      {
        '@type': 'WebApplication',
        '@id': 'https://stellarr.club/#webapp',
        name: 'Stellar',
        url: 'https://stellarr.club',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web, iOS, Android',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        publisher: { '@id': 'https://stellarr.club/#organization' },
        description:
          'The companion app for telescope, smartphone and camera owners — observe the night sky, earn rewards, and redeem for real optics at Astroman.',
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
