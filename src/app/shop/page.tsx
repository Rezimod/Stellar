import { redirect } from 'next/navigation';

/**
 * /shop is an alias people expect — the real storefront is /marketplace.
 * Permanent redirect keeps old links + SEO pointed at the canonical route
 * instead of returning a 404.
 */
export default function ShopPage() {
  redirect('/marketplace');
}
