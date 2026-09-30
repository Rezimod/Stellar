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
        name: 'Stellar',
        url: 'https://stellarr.club',
        logo: 'https://stellarr.club/apple-touch-icon.png',
        sameAs: ['https://astroman.ge'],
        description:
          'Stellar issues real astronomical objects as numbered card editions, sold in sealed capsules and photographed by Node 01 in Tbilisi.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://stellarr.club/#website',
        name: 'Stellar',
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
