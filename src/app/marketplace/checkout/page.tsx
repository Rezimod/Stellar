'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, ArrowLeft, Check, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { useWallets as usePrivySolanaWallets } from '@privy-io/react-auth/solana';
import { AuthModal } from '@/components/auth/AuthModal';
import PageContainer from '@/components/layout/PageContainer';
import SolMark, { SolGradientDef } from '@/components/marketplace/SolMark';
import { getProductById, getDealerById, getProductsByDealer, priceToSol, GLOBAL_FALLBACK } from '@/lib/dealers';
import type { Product } from '@/lib/dealers';
import { formatPrice, formatSol } from '@/lib/marketplace-format';
import {
  STARS_PER_GEL,
  BURN_INCREMENT,
  MAX_BURN_RATIO,
  computeMaxBurn,
  starsToGEL,
} from '@/lib/stars-economy';
import { executeBurn } from '@/lib/stars-burn-client';
import { track } from '@/lib/track';

type Step = 'form' | 'paying' | 'done';

interface ShippingForm {
  name: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  notes: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  name: '', phone: '', country: '', city: '', address: '', notes: '',
};

// Survives the Privy auth redirect so users don't retype the form.
const SHIPPING_STORAGE_KEY = 'stellar-checkout-shipping';

function CheckoutContent() {
  const t = useTranslations('checkout');
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get('id') ?? '';
  const mode: 'sol' | 'stars' = params.get('mode') === 'stars' ? 'stars' : 'sol';

  const { getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
  const { wallets: privyWallets } = usePrivySolanaWallets();
  const walletAddress = stellarAddress ?? state.walletAddress ?? null;

  const product = useMemo(() => getProductById(productId), [productId]);
  const dealer = useMemo(() => product ? getDealerById(product.dealerId) : undefined, [product]);

  // Fall back to the same constants /api/price/sol returns on network failure
  // so the SOL pay button is never stuck on "Loading SOL price…" if CoinGecko
  // is unreachable. Real price replaces these as soon as the fetch resolves.
  const [solPerGEL, setSolPerGEL] = useState(0.00135);
  const [solPriceUsd, setSolPriceUsd] = useState(137);
  useEffect(() => {
    fetch('/api/price/sol').then(r => r.json()).then(d => {
      if (d.solPerGEL > 0) setSolPerGEL(d.solPerGEL);
      if (d.solPrice > 0) setSolPriceUsd(d.solPrice);
    }).catch(() => {});
  }, []);

  const amountSol = useMemo(() => {
    if (!product) return 0;
    return priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  }, [product, solPerGEL, solPriceUsd]);

  const [authOpen, setAuthOpen] = useState(false);
  const [shipping, setShipping] = useState<ShippingForm>(() => {
    if (typeof window === 'undefined') return EMPTY_SHIPPING;
    try {
      const raw = sessionStorage.getItem(SHIPPING_STORAGE_KEY);
      return raw ? { ...EMPTY_SHIPPING, ...JSON.parse(raw) as Partial<ShippingForm> } : EMPTY_SHIPPING;
    } catch {
      return EMPTY_SHIPPING;
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(shipping)); } catch { /* private mode */ }
  }, [shipping]);
  const [step, setStep] = useState<Step>('form');
  useEffect(() => {
    if (step === 'done') { try { sessionStorage.removeItem(SHIPPING_STORAGE_KEY); } catch { /* noop */ } }
  }, [step]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [pendingPay, setPendingPay] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // §4: Stars-for-discount. Only available for SOL-paid GEL products.
  const burnEligible = mode === 'sol' && product?.currency === 'GEL';
  const [starsBalance, setStarsBalance] = useState<number>(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [burnStars, setBurnStars] = useState<number>(0);
  const [burning, setBurning] = useState(false);
  const [burnSig, setBurnSig] = useState<string | null>(null);

  // Pull on-chain Stars balance once we know the wallet — needed for the burn
  // slider (SOL mode) and to gate redemption (Stars mode) before form entry.
  const needsBalance = burnEligible || mode === 'stars';
  useEffect(() => {
    if (!walletAddress || !needsBalance) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(walletAddress)}`)
      .then(r => r.json())
      .then(d => { setStarsBalance(d.balance ?? 0); setBalanceLoaded(true); })
      .catch(() => setBalanceLoaded(true));
  }, [walletAddress, needsBalance]);

  // Stars mode: how many Stars the user is missing (0 = can redeem).
  const starsShort = mode === 'stars' && product && balanceLoaded
    ? Math.max(0, product.starsPrice - starsBalance)
    : 0;

  const maxBurnable = useMemo(() => {
    if (!product || !burnEligible) return 0;
    return computeMaxBurn(product.price, starsBalance);
  }, [product, burnEligible, starsBalance]);

  // Snap any out-of-range burn back to the new max when balance / product changes.
  useEffect(() => {
    if (burnStars > maxBurnable) setBurnStars(maxBurnable);
  }, [burnStars, maxBurnable]);

  const gelDiscount = burnStars > 0 ? starsToGEL(burnStars) : 0;
  const discountedFiat = product ? Math.max(0, product.price - gelDiscount) : 0;
  const discountedSol = useMemo(() => {
    if (!product) return 0;
    const v = priceToSol(discountedFiat, product.currency, solPerGEL, solPriceUsd);
    return v > 0 ? v : amountSol;
  }, [product, discountedFiat, solPerGEL, solPriceUsd, amountSol]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const canSubmit =
    !!shipping.name.trim() &&
    !!shipping.phone.trim() &&
    !!shipping.country.trim() &&
    !!shipping.city.trim() &&
    !!shipping.address.trim() &&
    (mode === 'stars' ? !!product && product.starsPrice > 0 && starsShort === 0 : amountSol > 0);

  const [pollTimedOut, setPollTimedOut] = useState(false);
  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPollTimedOut(false);
    const startedAt = Date.now();
    pollRef.current = setInterval(async () => {
      // Stop after 10 minutes; an abandoned QR shouldn't spin forever.
      if (Date.now() - startedAt > 10 * 60_000) {
        if (pollRef.current) clearInterval(pollRef.current);
        setPollTimedOut(true);
        return;
      }
      try {
        const token = await getAccessToken().catch(() => null);
        const res = await fetch('/api/orders/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ orderId: id }),
        });
        const data = await res.json();
        if (data.confirmed && data.signature) {
          if (pollRef.current) clearInterval(pollRef.current);
          setSignature(data.signature);
          setStep('done');
        }
      } catch { /* keep polling */ }
    }, 3000);
  }, [getAccessToken]);

  const handlePay = useCallback(async () => {
    if (!product) return;
    if (!canSubmit) { setPendingPay(false); return; }
    if (!authenticated) {
      setPendingPay(true);
      setAuthOpen(true);
      return;
    }
    if (!walletAddress) {
      setPendingPay(true);
      return;
    }
    setPendingPay(false);
    setError(null);
    setSubmitting(true);
    try {
      const token = await getAccessToken().catch(() => null);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          dealerId: product.dealerId,
          paymentMethod: mode,
          amountSol: mode === 'sol' ? Number(discountedSol.toFixed(6)) : undefined,
          amountStars: mode === 'stars' ? product.starsPrice : undefined,
          amountFiat: product.price,
          currency: product.currency,
          burnStars: burnEligible && burnStars > 0 ? burnStars : undefined,
          walletAddress,
          shipping: {
            name: shipping.name,
            phone: shipping.phone,
            country: shipping.country,
            city: shipping.city,
            address: shipping.address,
            notes: shipping.notes,
          },
        }),
      });
      const text = await res.text();
      let data: { orderId?: string; url?: string; requiresBurn?: boolean; burnStars?: number; error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON body → use raw text below */ }
      if (!res.ok) {
        throw new Error(data.error ?? (text ? text.slice(0, 200) : `Order failed (HTTP ${res.status})`));
      }
      if (!data.orderId) throw new Error('Order created but no ID returned — please try again');
      setOrderId(data.orderId);
      if (mode === 'stars') {
        track('stars_spent', { source: 'redeem', amount: product.starsPrice, product: product.id }, walletAddress);
      }

      if (data.requiresBurn) {
        const wallet = privyWallets[0];
        if (!wallet?.address) {
          throw new Error('Stars wallet not ready — sign in and retry');
        }
        setBurning(true);
        try {
          const result = await executeBurn({
            privyToken: token,
            wallet: wallet as unknown as Parameters<typeof executeBurn>[0]['wallet'],
            amount: data.burnStars ?? burnStars,
            kind: mode === 'stars' ? 'shop-purchase' : 'discount-burn',
            orderId: data.orderId,
          });
          setBurnSig(result.signature);
          track('stars_spent', { source: 'discount_burn', amount: data.burnStars ?? burnStars, product: product.id }, walletAddress);
        } catch (e) {
          throw new Error(`Stars burn failed: ${e instanceof Error ? e.message : 'unknown error'}`);
        } finally {
          setBurning(false);
        }
      }

      if (mode === 'stars') {
        setStep('done');
      } else {
        if (!data.url) throw new Error('Server did not return a payment URL');
        setPayUrl(data.url);
        setStep('paying');
        startPolling(data.orderId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errGeneric'));
    } finally {
      setSubmitting(false);
    }
  }, [product, authenticated, walletAddress, canSubmit, discountedSol, burnEligible, burnStars, privyWallets, shipping, getAccessToken, startPolling, mode, t]);

  useEffect(() => {
    if (pendingPay && authenticated && walletAddress && step === 'form' && !submitting) {
      handlePay();
    }
  }, [pendingPay, authenticated, walletAddress, step, submitting, handlePay]);

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'mainnet-beta';

  if (!productId) {
    return (
      <PageContainer variant="content" className="py-10 text-center">
        <p className="stl-body text-[#F8F4EC]">{t('noProduct')}</p>
        <Link href="/marketplace" className="stl-mono-data text-[#F8F4EC]">
          ← {t('backToMarketplace')}
        </Link>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer variant="content" className="py-10 text-center">
        <p className="stl-body text-[#F8F4EC]">{t('productNotFound')}</p>
        <Link href="/marketplace" className="stl-mono-data text-[#F8F4EC]">
          ← {t('backToMarketplace')}
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="wide" className="font-mono py-5">
      <style jsx global>{`
        .stl-checkout-field {
          color: var(--text-primary);
          background: #161A28;
          border: 1px solid var(--border);
        }
        [data-theme="light"] .stl-checkout-field { background: #FFFFFF; }
        .stl-checkout-field:hover { border-color: var(--border-strong); }
        .stl-checkout-field:focus {
          border-color: rgba(255, 179, 71, 0.55);
          background: #1C2235;
        }
        [data-theme="light"] .stl-checkout-field:focus { background: #F4F7FF; }
        .stl-checkout-field:-webkit-autofill,
        .stl-checkout-field:-webkit-autofill:hover,
        .stl-checkout-field:-webkit-autofill:focus,
        .stl-checkout-field:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #161A28 inset !important;
          -webkit-text-fill-color: #F8F4EC !important;
          caret-color: var(--text-primary);
          transition: background-color 9999s ease-out, color 9999s ease-out;
        }
        [data-theme="light"] .stl-checkout-field:-webkit-autofill,
        [data-theme="light"] .stl-checkout-field:-webkit-autofill:hover,
        [data-theme="light"] .stl-checkout-field:-webkit-autofill:focus,
        [data-theme="light"] .stl-checkout-field:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset !important;
          -webkit-text-fill-color: #0F172A !important;
        }
      `}</style>
      <SolGradientDef />
      <button
        onClick={() => router.back()}
        aria-label={t('back')}
        className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-[#F8F4EC] hover:opacity-75 transition-opacity mb-[20px]"
      >
        <ArrowLeft size={14} /> {t('back')}
      </button>

      <header className="flex flex-col items-center pb-[18px] mb-[26px] border-b border-[rgba(248,244,236,0.08)] text-center">
        <h1 className="text-[30px] font-semibold tracking-[-0.01em] text-[#F8F4EC] leading-none">
          {t('title')}<span className="text-[var(--orange)]">.</span>
        </h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 max-w-[920px] mx-auto">
        {/* LEFT: Form / Payment */}
        <div className="flex flex-col gap-4">
          {step === 'form' && (
            <>
              <h2 className="text-[13px] tracking-[0.18em] uppercase font-semibold text-[#F8F4EC]">
                {t('deliveryDetails')}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label={t('fieldName')} value={shipping.name} onChange={v => setShipping(s => ({ ...s, name: v }))} required placeholder={t('phName')} />
                <Field label={t('fieldPhone')} value={shipping.phone} onChange={v => setShipping(s => ({ ...s, phone: v }))} required type="tel" placeholder={t('phPhone')} />
                <Field label={t('fieldCountry')} value={shipping.country} onChange={v => setShipping(s => ({ ...s, country: v }))} required placeholder={t('phCountry')} />
                <Field label={t('fieldCity')} value={shipping.city} onChange={v => setShipping(s => ({ ...s, city: v }))} required placeholder={t('phCity')} />
              </div>
              <Field label={t('fieldAddress')} value={shipping.address} onChange={v => setShipping(s => ({ ...s, address: v }))} required placeholder={t('phAddress')} />
              <Field label={t('fieldNotes')} value={shipping.notes} onChange={v => setShipping(s => ({ ...s, notes: v }))} multiline placeholder={t('phNotes')} />
              {dealer?.shipsTo && dealer.shipsTo.length > 0 && (
                <p className="text-[10px] tracking-[0.14em] uppercase text-[#F8F4EC]/70">
                  {t('shipsTo', { dealer: dealer.name })} {dealer.shipsTo.slice(0, 8).join(' · ')}{dealer.shipsTo.length > 8 ? ' · …' : ''}
                </p>
              )}

              {mode === 'stars' && starsShort > 0 && (
                <div
                  className="rounded-md p-4 flex flex-col gap-1"
                  style={{ background: 'rgba(255,179,71,0.05)', border: '0.5px solid rgba(255,179,71,0.28)' }}
                >
                  <p className="text-[12px] text-[#F8F4EC] tabular-nums">
                    {t('starsShort', { balance: starsBalance.toLocaleString(), short: starsShort.toLocaleString() })}
                  </p>
                  <Link href="/earn" className="text-[10.5px] tracking-[0.14em] uppercase font-semibold" style={{ color: 'var(--orange)' }}>
                    {t('earnMore')} →
                  </Link>
                </div>
              )}

              {burnEligible && maxBurnable > 0 && (
                <BurnSlider
                  balance={starsBalance}
                  maxBurn={maxBurnable}
                  burnStars={burnStars}
                  setBurnStars={setBurnStars}
                  priceGEL={product.price}
                  burning={burning}
                  burnSig={burnSig}
                />
              )}

              {error && (
                <p className="text-[12px] text-[var(--terracotta)] tracking-[0.06em]">{error}</p>
              )}

              <button
                onClick={handlePay}
                disabled={!canSubmit || submitting || pendingPay || burning}
                className="inline-flex items-center justify-center gap-[8px] px-[22px] py-[13px] rounded-none text-[13px] font-semibold tracking-[0.005em] whitespace-nowrap transition-[filter,transform,box-shadow] duration-150 hover:brightness-[1.08] hover:-translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:filter-none"
                style={{
                  background: 'var(--terracotta)',
                  border: '1px solid var(--terracotta)',
                  color: '#1a1208',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 8px 24px rgba(255,179,71,0.28)',
                }}
              >
                {mode === 'sol' ? (
                  <SolMark className="h-[16px] w-[16px]" />
                ) : (
                  <Star className="w-[14px] h-[14px]" aria-hidden style={{ fill: 'currentColor' }} />
                )}
                <span>
                  {burning
                    ? t('burningStars')
                    : submitting
                      ? t('creatingOrder')
                      : pendingPay && authenticated && !walletAddress
                        ? t('preparingWallet')
                        : mode === 'stars'
                          ? t('redeemStars', { stars: product.starsPrice.toLocaleString() })
                          : discountedSol > 0
                            ? t('paySolAmount', { sol: formatSol(discountedSol) })
                            : t('payWithSol')}
                </span>
              </button>
              {!authenticated && (
                <p className="text-[11px] text-[#F8F4EC]/80">
                  {t('signInNote')}
                </p>
              )}
            </>
          )}

          {step === 'paying' && (
            <div className="flex flex-col gap-4 items-center">
              <h2 className="text-[13px] tracking-[0.18em] uppercase font-semibold text-[#F8F4EC]">
                {t('scanToPay')}
              </h2>
              <div className="p-3 rounded-xl bg-white">
                <QRCodeSVG value={payUrl} size={220} />
              </div>
              <p className="text-[11px] tracking-[0.06em] text-[#F8F4EC] text-center">
                {t('scanHelp')}
              </p>
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]"
              >
                {t('openWallet')} <ExternalLink size={11} />
              </a>
              {pollTimedOut ? (
                <div className="flex flex-col items-center gap-2 mt-2">
                  <p className="text-[11px] tracking-[0.06em] text-[var(--terracotta)] text-center max-w-sm">
                    {t('stillWaiting')}
                  </p>
                  <button
                    onClick={() => { if (orderId) startPolling(orderId); }}
                    className="text-[11px] tracking-[0.16em] uppercase font-semibold text-[#F8F4EC] hover:text-[var(--terracotta)] transition-colors"
                  >
                    {t('checkAgain')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-3 h-3 rounded-full border-2 border-[var(--orange)] border-t-transparent animate-spin" />
                  <span className="text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]">
                    {t('waiting')}
                  </span>
                </div>
              )}
              <button
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setStep('form');
                  setPayUrl('');
                  setOrderId(null);
                }}
                className="text-[10px] tracking-[0.16em] uppercase text-[#F8F4EC]/70 hover:text-[#F8F4EC] transition-colors"
              >
                {t('cancelEdit')}
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col gap-3 items-center text-center py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(94, 234, 212,0.12)', border: '1px solid rgba(94, 234, 212,0.3)' }}>
                <Check size={26} color="var(--seafoam)" strokeWidth={2.4} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#F8F4EC]">
                {mode === 'stars' ? t('doneStars') : t('donePaid')}
              </h2>
              <p className="text-[12px] tracking-[0.06em] text-[#F8F4EC] max-w-sm">
                {mode === 'stars'
                  ? t('doneStarsBody', { stars: product.starsPrice.toLocaleString(), dealer: dealer?.name ?? t('theDealer') })
                  : t('donePaidBody', { dealer: dealer?.name ?? t('theDealer') })}
              </p>
              {signature && (
                <a
                  href={`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-[#F8F4EC]"
                >
                  {t('viewTx')} <ExternalLink size={10} />
                </a>
              )}
              <div className="flex gap-3 mt-4">
                <Link href="/profile" className="text-[11px] tracking-[0.18em] uppercase font-semibold px-[16px] py-[9px] rounded-full text-[#F8F4EC]"
                  style={{ background: 'rgba(255,179,71,0.10)', border: '0.5px solid rgba(255,179,71,0.45)' }}>
                  {t('orderHistory')}
                </Link>
                <Link href="/marketplace" className="text-[11px] tracking-[0.18em] uppercase font-semibold px-[16px] py-[9px] rounded-full text-[#F8F4EC]"
                  style={{ border: '0.5px solid rgba(248,244,236,0.22)' }}>
                  {t('keepShopping')}
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Order summary */}
        <aside
          className="rounded-xl p-4 h-fit"
          style={{
            border: '0.5px solid rgba(248,244,236,0.1)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <p className="text-[10px] tracking-[0.24em] uppercase font-semibold text-[#F8F4EC] mb-3">
            {t('summary')}
          </p>
          <div className="flex gap-3 mb-3">
            <div
              className="relative w-[70px] h-[70px] rounded-md flex-shrink-0 overflow-hidden"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, rgba(255, 179, 71,0.05) 0%, transparent 70%), rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(248,244,236,0.06)',
              }}
            >
              {product.image && (
                <Image src={product.image} alt={product.name} fill style={{ objectFit: 'contain', padding: 6 }} unoptimized />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#F8F4EC] leading-tight mb-1 truncate">{product.name}</p>
              {dealer?.name && (
                <p className="text-[10px] tracking-[0.16em] uppercase text-[#F8F4EC]/80">{dealer.name}</p>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-[rgba(248,244,236,0.08)]">
            <span className="text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]">{t('price')}</span>
            <span className="text-[13px] font-semibold text-[#F8F4EC]">{formatPrice(product)}</span>
          </div>
          {burnEligible && burnStars > 0 && (
            <>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]">
                  {t('starsBurned')}
                </span>
                <span className="text-[13px] font-semibold text-[var(--orange)]">
                  ✦ {burnStars.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]">
                  {t('discount')}
                </span>
                <span className="text-[13px] font-semibold text-[var(--orange)]">
                  −{gelDiscount.toFixed(2)} ₾
                </span>
              </div>
            </>
          )}
          {mode === 'stars' ? (
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]">{t('stars')}</span>
              <span className="text-[13px] font-semibold text-[#F8F4EC]">
                ✦ {product.starsPrice.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-[#F8F4EC]">SOL</span>
              <span className="text-[13px] font-semibold text-[#F8F4EC]">
                {discountedSol > 0 ? `${formatSol(discountedSol)} SOL` : '—'}
              </span>
            </div>
          )}
          {orderId && (
            <p className="text-[9px] tracking-[0.16em] uppercase text-[#F8F4EC]/70 mt-3 break-all">
              {t('order')} · {orderId.slice(0, 8)}…
            </p>
          )}
        </aside>
      </div>

      <SuggestedTelescopes currentId={product.id} dealerId={product.dealerId} />


      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </PageContainer>
  );
}

interface BurnSliderProps {
  balance: number;
  maxBurn: number;
  burnStars: number;
  setBurnStars: (n: number) => void;
  priceGEL: number;
  burning: boolean;
  burnSig: string | null;
}

function BurnSlider({
  balance, maxBurn, burnStars, setBurnStars, priceGEL, burning, burnSig,
}: BurnSliderProps) {
  const t = useTranslations('checkout');
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'mainnet-beta';
  const gelOff = burnStars / STARS_PER_GEL;
  const newTotal = Math.max(0, priceGEL - gelOff);
  const sliderMax = maxBurn;

  return (
    <div
      className="rounded-md p-4 flex flex-col gap-2"
      style={{
        background: 'rgba(255, 179, 71, 0.05)',
        border: '0.5px solid rgba(255, 179, 71, 0.28)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--orange)] font-medium">
          {t('burnTitle', { pct: Math.round(MAX_BURN_RATIO * 100) })}
        </span>
        <span className="text-[10px] tracking-[0.14em] uppercase text-[#F8F4EC] font-mono">
          {t('burnBalance')} ✦ {balance.toLocaleString()}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={sliderMax}
        step={BURN_INCREMENT}
        value={burnStars}
        onChange={e => setBurnStars(Number(e.target.value))}
        disabled={burning || !!burnSig}
        className="w-full"
        style={{ accentColor: 'var(--orange)' }}
      />

      <div className="flex items-center justify-between text-[12px] font-mono">
        <span className="text-[#F8F4EC]">
          ✦ {burnStars.toLocaleString()} {t('burningLabel')}
        </span>
        <span style={{ color: 'var(--orange)', fontWeight: 600 }}>
          −{gelOff.toFixed(2)} ₾
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[rgba(255,179,71,0.18)]">
        <span className="text-[#F8F4EC]">{t('newTotal')}</span>
        <span className="text-[#F8F4EC]" style={{ fontWeight: 600 }}>
          {newTotal.toFixed(2)} ₾
        </span>
      </div>

      {burnSig && (
        <a
          href={`https://explorer.solana.com/tx/${burnSig}?cluster=${cluster}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-[0.14em] uppercase mt-1"
          style={{ color: 'var(--orange)' }}
        >
          {t('burnConfirmed')}
        </a>
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
}

function Field({ label, value, onChange, required, multiline, type, placeholder }: FieldProps) {
  const common = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    placeholder: placeholder ?? '',
    className:
      'stl-checkout-field w-full px-[14px] py-[12px] text-[14px] rounded-xl outline-none transition-[border-color,background] duration-150 placeholder:text-[rgba(248,244,236,0.4)]',
  };
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[10px] tracking-[0.18em] uppercase text-[#F8F4EC]">
        {label}{required && <span className="text-[var(--orange)] ml-1">*</span>}
      </span>
      {multiline ? (
        <textarea {...common} rows={2} />
      ) : (
        <input {...common} type={type ?? 'text'} />
      )}
    </label>
  );
}

interface SuggestedProps {
  currentId: string;
  dealerId: string;
}

function SuggestedTelescopes({ currentId, dealerId }: SuggestedProps) {
  const t = useTranslations('checkout');
  const items = useMemo(() => {
    const sameDealer = getProductsByDealer(dealerId)
      .filter(p => p.id !== currentId && p.category === 'telescope');
    if (sameDealer.length >= 4) return sameDealer.slice(0, 4);
    const seen = new Set([currentId, ...sameDealer.map(p => p.id)]);
    const filler = GLOBAL_FALLBACK.filter(p => !seen.has(p.id) && p.category === 'telescope');
    return [...sameDealer, ...filler].slice(0, 4);
  }, [currentId, dealerId]);

  if (items.length === 0) return null;

  return (
    <section className="max-w-[920px] mx-auto mt-[44px] pt-[26px] border-t border-[rgba(248,244,236,0.08)]">
      <header className="flex items-baseline justify-between mb-[18px]">
        <h2 className="text-[13px] tracking-[0.18em] uppercase font-semibold text-[#F8F4EC]">
          {t('suggested')}
        </h2>
        <Link href="/marketplace" className="text-[10px] tracking-[0.18em] uppercase text-[#F8F4EC]/80 hover:text-[#F8F4EC] transition-colors">
          {t('seeAll')} →
        </Link>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((p) => (
          <SuggestedCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}

function SuggestedCard({ product }: { product: Product }) {
  const href = `/marketplace/${encodeURIComponent(product.id)}`;
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl p-[12px] transition-all duration-200 hover:-translate-y-[2px]"
      style={{
        background: 'rgba(248,244,236,0.025)',
        border: '0.5px solid rgba(248,244,236,0.10)',
      }}
    >
      <div
        className="relative w-full rounded-md mb-[10px] overflow-hidden aspect-[1.2]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255,179,71,0.05) 0%, transparent 70%), rgba(255,255,255,0.02)',
          border: '0.5px solid rgba(248,244,236,0.06)',
        }}
      >
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            style={{ objectFit: 'contain', padding: 8 }}
            unoptimized
          />
        )}
      </div>
      <p className="text-[12px] font-medium text-[#F8F4EC] leading-tight line-clamp-2 mb-1">
        {product.name}
      </p>
      <p className="text-[11px] font-mono text-[#F8F4EC] mt-auto pt-1">
        {formatPrice(product)}
      </p>
    </Link>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}
