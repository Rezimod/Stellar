import Link from 'next/link';

export default function MarketplaceSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 md:gap-12 items-center">
        <div className="md:order-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--terracotta)]/70">
            04 · MARKETPLACE
          </span>
          <h2 className="mt-3 font-display font-medium tracking-[-0.02em] text-[24px] md:text-[32px] text-[#F8F4EC]">
            Stars buy real telescopes.
          </h2>
          <p className="mt-3 text-[13px] md:text-[14px] leading-[1.65] text-[rgba(232,230,221,0.6)] max-w-[440px]">
            Earn Stars in-app, redeem them at Astroman — Georgia&apos;s first
            astronomy store. Bresser, Levenhuk, Celestron, all in one place.
          </p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex items-center justify-center rounded-lg border-[0.5px] border-[rgba(255, 209, 102,0.3)] bg-[rgba(255, 209, 102,0.12)] px-5 py-2.5 text-[12px] font-medium text-[var(--terracotta)] transition-colors hover:bg-[rgba(255, 209, 102,0.18)]"
          >
            Browse marketplace  →
          </Link>
        </div>

        <div className="md:order-1 rounded-[14px] border-[0.5px] border-[rgba(232,230,221,0.08)] bg-[rgba(232,230,221,0.025)] p-[18px] md:p-[22px]">
          <div className="flex gap-3">
            <ProductCard
              tone="gold"
              title="Bresser 76/300"
              subtitle="Reflector"
              price="320 GEL"
            />
            <ProductCard
              tone="teal"
              title="Moon Lamp 15cm"
              subtitle="Levenhuk"
              price="85 GEL"
            />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[10px] border-[0.5px] border-[rgba(255, 209, 102,0.2)] bg-[rgba(255, 209, 102,0.06)] p-[14px]">
            <div className="min-w-0">
              <div className="font-display text-[12px] md:text-[13px] text-[#F8F4EC] truncate">
                Celestron AstroMaster 70
              </div>
              <div className="mt-0.5 text-[10px] text-[rgba(232,230,221,0.5)]">
                Refractor · 70mm aperture
              </div>
            </div>
            <div className="shrink-0 text-[11px] text-[var(--terracotta)] font-mono">680 GEL</div>
          </div>

          <div className="mt-4 pt-3.5 flex justify-between items-center text-[11px] border-t-[0.5px] border-[rgba(232,230,221,0.08)]">
            <span className="text-[rgba(232,230,221,0.55)]">Your balance</span>
            <span className="text-[var(--terracotta)] font-mono">485 ✦  →  10% off</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductCard({
  tone,
  title,
  subtitle,
  price,
}: {
  tone: 'gold' | 'teal';
  title: string;
  subtitle: string;
  price: string;
}) {
  const styles =
    tone === 'gold'
      ? {
          wrap: 'border-[rgba(255, 209, 102,0.18)] bg-[rgba(255, 209, 102,0.06)]',
          chipOuter: 'bg-[rgba(255, 209, 102,0.18)]',
          chipInner: <span className="block w-3.5 h-3.5 rounded-full bg-[var(--terracotta)]" />,
        }
      : {
          wrap: 'border-[rgba(94, 234, 212,0.15)] bg-[rgba(94, 234, 212,0.04)]',
          chipOuter: 'bg-[rgba(94, 234, 212,0.10)]',
          chipInner: <span className="block w-3.5 h-3.5 rounded-full border border-[var(--seafoam)]" />,
        };

  return (
    <div className={`flex-1 min-w-0 rounded-[10px] border-[0.5px] p-[12px] md:p-[14px] ${styles.wrap}`}>
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${styles.chipOuter}`}>
        {styles.chipInner}
      </div>
      <div className="mt-3 font-display text-[12px] md:text-[13px] text-[#F8F4EC] truncate">
        {title}
      </div>
      <div className="mt-0.5 text-[10px] text-[rgba(232,230,221,0.5)]">{subtitle}</div>
      <div className="mt-2 text-[11px] font-medium text-[var(--terracotta)] font-mono">{price}</div>
    </div>
  );
}
