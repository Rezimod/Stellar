import type { MetadataRoute } from 'next';

const BASE = 'https://stellarr.club';

/**
 * Public, indexable routes. App-internal/auth-gated routes (settings, profile)
 * are intentionally excluded and also disallowed in robots.txt.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'daily', priority: 1.0 },
    { path: '/sky', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/observatory', changeFrequency: 'daily', priority: 0.9 },
    { path: '/first-light', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/star', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/marketplace', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/moon', changeFrequency: 'daily', priority: 0.6 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/contact', changeFrequency: 'monthly', priority: 0.4 },
    { path: '/terms', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/privacy', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/cookie-policy', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/accessibility', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/returns', changeFrequency: 'monthly', priority: 0.3 },
    { path: '/security-policy', changeFrequency: 'monthly', priority: 0.3 },
  ];

  return routes.map((r) => ({
    url: `${BASE}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
