/**
 * Site-wide structured data (JSON-LD), rendered once in the root layout.
 */
export default function JsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://stellarr.club/#organization',
        name: 'Skychaser',
        url: 'https://stellarr.club',
        logo: 'https://stellarr.club/apple-touch-icon.png',
        sameAs: ['https://astroman.ge'],
        description:
          'Skychaser issues real astronomical objects as numbered card editions, sold in sealed capsules. The Live Telescope, which will photograph the night’s card, sees first light in November 2026.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://stellarr.club/#website',
        name: 'Skychaser',
        url: 'https://stellarr.club',
        publisher: { '@id': 'https://stellarr.club/#organization' },
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
