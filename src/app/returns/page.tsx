import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Refunds — Stellar Shop',
  description:
    'How returns and refunds work for gear bought through the Stellar shop, including dealer-fulfilled orders, timeframes, and how to start a return.',
  alternates: { canonical: '/returns' },
};

export default function ReturnsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Returns &amp; refunds</h1>
      <p className="text-text-muted text-sm mb-10">Last updated July 20, 2026</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        <p>Stellar is a storefront: physical orders are fulfilled by the listed dealer (Astroman and partner dealers). The fulfilling dealer’s return and warranty policy applies to each order.</p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Return window</h2>
          <p>Unopened, undamaged items can generally be returned within 14 days of delivery for a refund or exchange, unless the product page states otherwise.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Condition</h2>
          <p>Items must be returned in their original packaging with all accessories. Return shipping may be the buyer’s responsibility unless the item arrived damaged or faulty.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Stars redemptions</h2>
          <p>Where Stars were applied to an order, refunded Stars are returned to your balance rather than as cash. In-app Stars themselves have no cash value.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Start a return</h2>
          <p>Email <a className="underline underline-offset-4" href="mailto:hello@astroman.ge">hello@astroman.ge</a> with your order number, or reach us from the <Link href="/contact" className="underline underline-offset-4">Contact</Link> page and we’ll connect you with the fulfilling dealer.</p>
        </section>
      </div>
    </div>
  );
}
