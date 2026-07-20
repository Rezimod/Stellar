'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PageContainer from '@/components/layout/PageContainer';
import SolMark, { SolGradientDef } from '@/components/marketplace/SolMark';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { useStarsBalance } from '@/hooks/useStarsBalance';
import { getProductById, getDealerById, priceToSol, priceToUsd } from '@/lib/dealers';
import { formatPrice, formatSol, formatUsd } from '@/lib/marketplace-format';
import { track } from '@/lib/track';

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('marketplacePage');
  const { address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const address = stellarAddress ?? state.walletAddress ?? null;
  const balance = useStarsBalance(address) ?? 0;

  const product = useMemo(() => getProductById(decodeURIComponent(id)), [id]);
  const dealer = useMemo(() => (product ? getDealerById(product.dealerId) : undefined), [product]);

  const [solPerGEL, setSolPerGEL] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);
  useEffect(() => {
    fetch('/api/price/sol')
      .then(r => r.json())
      .then(d => { setSolPerGEL(d.solPerGEL ?? 0); setSolPriceUsd(d.solPrice ?? 0); })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (product) track('product_view', { product: product.id }, address);
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!product) {
    return (
      <PageContainer variant="content" className="font-mono py-10 text-center">
        <p className="text-[#F8F4EC] mb-3">{t('detailNotFound')}</p>
        <Link href="/marketplace" className="text-[11px] tracking-[0.18em] uppercase text-[#F8F4EC]/80 hover:text-[var(--accent-text)] transition-colors">
          ← {t('detailBack')}
        </Link>
      </PageContainer>
    );
  }

  const sol = priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  const usd = product.currency !== 'USD' ? priceToUsd(product.price, product.currency, solPerGEL, solPriceUsd) : 0;
  const affordable = balance > 0 && balance >= product.starsPrice;
  const specs = product.specs ? Object.entries(product.specs) : [];
  const skillKey = product.skillLevel
    ? { beginner: 'skillBeginner', intermediate: 'skillIntermediate', advanced: 'skillAdvanced' }[product.skillLevel]
    : null;
  const catKey = { telescope: 'telescopes', eyepiece: 'eyepieces', binocular: 'binoculars', accessory: 'accessories' }[product.category];

  return (
    <PageContainer variant="wide" className="font-mono py-5 animate-page-enter">
      <SolGradientDef />
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-[#F8F4EC] hover:opacity-75 transition-opacity mb-[18px]"
      >
        <ArrowLeft size={14} /> {t('detailBack')}
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px] md:gap-[32px] max-w-[980px] mx-auto">
        <div className="relative w-full aspect-[1.15] overflow-hidden rounded-xl bg-white">
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 100vw, 490px"
              style={{ objectFit: 'contain', padding: '18px' }}
              priority
            />
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-[8px] mb-[10px]">
            {product.badge && (
              <span className="inline-flex items-center rounded-full px-[8px] py-[3px] text-[9px] font-bold tracking-[0.1em] uppercase leading-none"
                style={{ background: 'rgba(255,179,71,0.10)', color: 'var(--accent-text)', border: '1px solid rgba(255,179,71,0.30)' }}>
                {product.badge}
              </span>
            )}
            {skillKey && (
              <span className="inline-flex items-center rounded-full px-[8px] py-[3px] text-[9px] font-semibold tracking-[0.1em] uppercase leading-none text-white/70"
                style={{ background: 'rgba(var(--ink-warm), 0.06)', border: '1px solid rgba(var(--ink-warm), 0.14)' }}>
                {t(skillKey)}
              </span>
            )}
          </div>
          <h1 className="font-display text-[22px] sm:text-[26px] leading-[1.2] text-[#F8F4EC]" style={{ fontWeight: 600 }}>
            {product.name}
          </h1>
          <p className="text-[11px] tracking-[0.16em] uppercase text-white/60 mt-[6px]">
            {dealer?.name ?? product.category} · {t(catKey)}
          </p>
          {product.rating != null && (
            <div className="flex items-center gap-[5px] mt-[10px]">
              <Star className="w-[13px] h-[13px]" style={{ color: 'var(--accent-text)', fill: 'var(--accent-text)' }} />
              <span className="text-[12.5px] font-semibold tabular-nums text-white leading-none">{product.rating.toFixed(1)}</span>
              {product.reviews != null && <span className="text-[11px] tabular-nums text-white/45 leading-none">({product.reviews})</span>}
            </div>
          )}

          <div className="mt-[16px] pt-[14px]" style={{ borderTop: '1px solid rgba(var(--ink), 0.12)' }}>
            <p className="text-[24px] font-semibold text-white leading-none">{formatPrice(product)}</p>
            {(usd > 0 || sol > 0) && (
              <p className="flex items-center gap-[6px] text-[11px] tracking-[0.10em] uppercase text-white/70 mt-[6px] leading-none">
                {usd > 0 && <span>≈ <span className="text-white">${formatUsd(usd)}</span></span>}
                {usd > 0 && sol > 0 && <span className="text-white/30">·</span>}
                {sol > 0 && (
                  <span className="inline-flex items-center gap-[3px]">
                    <span className="text-white">{formatSol(sol)}</span>
                    <SolMark className="h-[9px] w-[9px]" />
                    <span>SOL</span>
                  </span>
                )}
              </p>
            )}
          </div>

          <p className="text-[13.5px] leading-[1.6] text-[rgba(var(--ink-warm),0.78)] mt-[14px]">{product.description}</p>

          <div className="flex flex-col gap-[8px] mt-[20px]">
            <Link
              href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=sol`}
              className="w-full inline-flex items-center justify-center gap-[7px] h-[44px] px-[12px] rounded-none text-[13px] tracking-[0.02em] font-bold transition-[filter,transform] duration-150 hover:brightness-[1.06] hover:-translate-y-[1px]"
              style={{
                background: 'var(--terracotta)',
                border: '1px solid var(--terracotta)',
                color: '#1a1208',
                boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 14px rgba(255,179,71,0.22)',
              }}
            >
              <SolMark className="h-[16px] w-[16px]" />
              <span>{t('payWithSol')}</span>
            </Link>
            {product.starsPrice > 0 && affordable && (
              <Link
                href={`/marketplace/checkout?id=${encodeURIComponent(product.id)}&mode=stars`}
                className="w-full inline-flex items-center justify-center gap-[6px] h-[40px] rounded-none text-[12px] font-semibold text-[var(--accent-text)] transition-colors hover:text-white"
                style={{ background: 'rgba(255,179,71,0.08)', border: '1px solid rgba(255,179,71,0.35)' }}
              >
                <Star className="w-[12px] h-[12px]" style={{ fill: 'currentColor' }} />
                <span className="tabular-nums">{t('redeemStars', { stars: product.starsPrice.toLocaleString() })}</span>
              </Link>
            )}
            {product.starsPrice > 0 && !affordable && (
              <p className="text-center text-[11px] text-white/45 tabular-nums">
                {balance > 0
                  ? t('starsToGo', { stars: (product.starsPrice - balance).toLocaleString() })
                  : t('orStars', { stars: product.starsPrice.toLocaleString() })}
              </p>
            )}
            {product.externalUrl && (
              <a
                href={product.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-[6px] text-[11px] tracking-[0.12em] uppercase text-white/55 hover:text-[var(--accent-text)] transition-colors mt-[4px]"
              >
                {t('viewOnDealer', { dealer: dealer?.name ?? 'dealer' })} <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      {specs.length > 0 && (
        <section className="max-w-[980px] mx-auto mt-[32px]">
          <h2 className="font-display text-[16px] text-[#F8F4EC] mb-[12px]" style={{ fontWeight: 600 }}>
            {t('detailSpecs')}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-[24px]">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-[12px] py-[8px]" style={{ borderBottom: '1px solid rgba(var(--ink), 0.08)' }}>
                <dt className="text-[11px] tracking-[0.12em] uppercase text-white/50">{k}</dt>
                <dd className="text-[12.5px] text-white text-right tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </PageContainer>
  );
}
