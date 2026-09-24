/**
 * Site-wide structured data (JSON-LD), rendered once in the root layout.
 */
export default function JsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://sidera.stellarr.club/#organization',
        name: 'Sidera',
        url: 'https://sidera.stellarr.club',
        logo: 'https://sidera.stellarr.club/apple-touch-icon.png',
        sameAs: ['https://astroman.ge'],
        description:
          'Sidera issues real astronomical objects as numbered card editions, sold in sealed capsules and photographed by Node 01 in Tbilisi.',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://sidera.stellarr.club/#website',
        name: 'Sidera',
        url: 'https://sidera.stellarr.club',
        publisher: { '@id': 'https://sidera.stellarr.club/#organization' },
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
