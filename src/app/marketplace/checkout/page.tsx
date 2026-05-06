'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, ArrowLeft, Check } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { useWallets as usePrivySolanaWallets } from '@privy-io/react-auth/solana';
import { AuthModal } from '@/components/auth/AuthModal';
import PageContainer from '@/components/layout/PageContainer';
import { getProductById, getDealerById, priceToSol } from '@/lib/dealers';
import type { Product } from '@/lib/dealers';
import {
  STARS_PER_GEL,
  BURN_INCREMENT,
  MAX_BURN_RATIO,
  computeMaxBurn,
  starsToGEL,
} from '@/lib/stars-economy';
import { executeBurn } from '@/lib/stars-burn-client';

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

const formatSol = (sol: number): string => {
  if (sol >= 10) return sol.toFixed(2);
  if (sol >= 1)  return sol.toFixed(3);
  return sol.toFixed(4);
};

const formatPrice = (p: Product): string => {
  const n = p.price % 1 !== 0 ? p.price.toFixed(2) : p.price.toLocaleString();
  return `${n} ${p.currency}`;
};

function CheckoutContent() {
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

  const [solPerGEL, setSolPerGEL] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState(0);
  useEffect(() => {
    fetch('/api/price/sol').then(r => r.json()).then(d => {
      setSolPerGEL(d.solPerGEL ?? 0);
      setSolPriceUsd(d.solPrice ?? 0);
    }).catch(() => {});
  }, []);

  const amountSol = useMemo(() => {
    if (!product) return 0;
    return priceToSol(product.price, product.currency, solPerGEL, solPriceUsd);
  }, [product, solPerGEL, solPriceUsd]);

  const [authOpen, setAuthOpen] = useState(false);
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [step, setStep] = useState<Step>('form');
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
  const [burnStars, setBurnStars] = useState<number>(0);
  const [burning, setBurning] = useState(false);
  const [burnSig, setBurnSig] = useState<string | null>(null);

  // Pull on-chain Stars balance once we know the wallet.
  useEffect(() => {
    if (!walletAddress || !burnEligible) return;
    fetch(`/api/stars-balance?address=${encodeURIComponent(walletAddress)}`)
      .then(r => r.json())
      .then(d => setStarsBalance(d.balance ?? 0))
      .catch(() => {});
  }, [walletAddress, burnEligible]);

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
    (mode === 'stars' ? !!product && product.starsPrice > 0 : amountSol > 0);

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not create order');
      setOrderId(data.orderId);

      // §4: if the order committed Stars for a discount, burn them BEFORE
      // showing the SOL pay QR. /api/orders/confirm refuses to mark the
      // order paid until burn_signature is set on the row.
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
            kind: 'discount-burn',
            orderId: data.orderId,
          });
          setBurnSig(result.signature);
        } catch (e) {
          throw new Error(`Stars burn failed: ${e instanceof Error ? e.message : 'unknown error'}`);
        } finally {
          setBurning(false);
        }
      }

      if (mode === 'stars') {
        setStep('done');
      } else {
        setPayUrl(data.url);
        setStep('paying');
        startPolling(data.orderId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
    } finally {
      setSubmitting(false);
    }
  }, [product, authenticated, walletAddress, canSubmit, discountedSol, burnEligible, burnStars, privyWallets, shipping, getAccessToken, startPolling, mode]);

  useEffect(() => {
    if (pendingPay && authenticated && walletAddress && step === 'form' && !submitting) {
      handlePay();
    }
  }, [pendingPay, authenticated, walletAddress, step, submitting, handlePay]);

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';

  if (!productId) {
    return (
      <PageContainer variant="content" className="py-10 text-center">
        <p className="stl-body" style={{ color: 'var(--stl-text-muted)' }}>No product selected.</p>
        <Link href="/marketplace" className="stl-mono-data" style={{ color: 'var(--stl-green)' }}>
          ← Back to marketplace
        </Link>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer variant="content" className="py-10 text-center">
        <p className="stl-body" style={{ color: 'var(--stl-text-muted)' }}>Product not found.</p>
        <Link href="/marketplace" className="stl-mono-data" style={{ color: 'var(--stl-green)' }}>
          ← Back to marketplace
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer variant="wide" className="font-mono py-5">
      <style jsx global>{`
        .stl-checkout-field {
          color: #E8E6DD;
          background: #161A28;
          border: 1px solid rgba(255,255,255,0.10);
        }
        .stl-checkout-field:hover { border-color: rgba(255,255,255,0.18); }
        .stl-checkout-field:focus {
          border-color: rgba(91, 108, 255, 0.55);
          background: #1C2235;
        }
        .stl-checkout-field:-webkit-autofill,
        .stl-checkout-field:-webkit-autofill:hover,
        .stl-checkout-field:-webkit-autofill:focus,
        .stl-checkout-field:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #161A28 inset !important;
          -webkit-text-fill-color: #E8E6DD !important;
          caret-color: #E8E6DD;
          transition: background-color 9999s ease-out, color 9999s ease-out;
        }
      `}</style>
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[10px] tracking-[0.22em] uppercase text-[rgba(232,230,221,0.65)] hover:text-[#E8E6DD] transition-colors mb-[18px]"
      >
        <ArrowLeft size={11} /> Back · Checkout
      </button>

      <header className="flex flex-col items-center gap-3 pb-[14px] mb-[22px] border-b border-[rgba(232,230,221,0.1)] text-center">
        <div className="flex items-baseline justify-center gap-3">
          <span className="text-[10px] tracking-[0.24em] uppercase text-[var(--seafoam)] font-medium">04 · 02</span>
          <h1 className="text-[24px] font-semibold tracking-[-0.01em] text-[#E8E6DD] leading-none">
            Checkout<span className="text-[var(--terracotta)]">.</span>
          </h1>
        </div>
        <p className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">
          {mode === 'stars' ? 'Redeem with stars' : 'Pay with SOL · Devnet'}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-6 max-w-[920px] mx-auto">
        {/* LEFT: Form / Payment */}
        <div className="flex flex-col gap-4">
          {step === 'form' && (
            <>
              <h2 className="text-[14px] tracking-[0.18em] uppercase font-semibold text-[#E8E6DD]">
                Delivery details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Full name" value={shipping.name} onChange={v => setShipping(s => ({ ...s, name: v }))} required placeholder="Jane Doe" />
                <Field label="Phone" value={shipping.phone} onChange={v => setShipping(s => ({ ...s, phone: v }))} required type="tel" placeholder="+1 555 123 4567" />
                <Field label="Country" value={shipping.country} onChange={v => setShipping(s => ({ ...s, country: v }))} required placeholder={dealer?.country ?? 'United States'} />
                <Field label="City" value={shipping.city} onChange={v => setShipping(s => ({ ...s, city: v }))} required placeholder="New York" />
              </div>
              <Field label="Street address" value={shipping.address} onChange={v => setShipping(s => ({ ...s, address: v }))} required placeholder="123 Galaxy Ave, Apt 4" />
              <Field label="Delivery notes (optional)" value={shipping.notes} onChange={v => setShipping(s => ({ ...s, notes: v }))} multiline placeholder="Buzz code, doorman, leave at door, etc." />
              {dealer?.shipsTo && dealer.shipsTo.length > 0 && (
                <p className="text-[10px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.55)]">
                  {dealer.name} ships to: {dealer.shipsTo.slice(0, 8).join(' · ')}{dealer.shipsTo.length > 8 ? ' · …' : ''}
                </p>
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
                className="inline-flex items-center justify-center gap-[8px] px-[22px] py-[13px] rounded-[14px] text-[13px] font-semibold tracking-[0.005em] text-white whitespace-nowrap transition-[filter,transform,box-shadow] duration-150 hover:brightness-[1.08] hover:-translate-y-[1px] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:filter-none"
                style={{
                  background: 'linear-gradient(135deg, #5B6CFF 0%, #8B5CF6 100%)',
                  border: 'none',
                  boxShadow: '0 8px 24px rgba(91, 108, 255, 0.28)',
                }}
              >
                {mode === 'stars'
                  ? <span aria-hidden className="text-[14px] leading-none">★</span>
                  : <span aria-hidden className="text-[14px] leading-none">◎</span>}
                <span>
                  {burning
                    ? 'Burning Stars…'
                    : submitting
                      ? 'Creating order…'
                      : pendingPay && authenticated && !walletAddress
                        ? 'Preparing wallet…'
                        : mode === 'stars'
                          ? `Redeem ${product.starsPrice.toLocaleString()} stars`
                          : discountedSol > 0
                            ? `Pay ${formatSol(discountedSol)} SOL`
                            : 'Loading SOL price…'}
                </span>
              </button>
              {!authenticated && (
                <p className="text-[11px] text-[rgba(232,230,221,0.6)]">
                  You&apos;ll sign in first — payment continues automatically.
                </p>
              )}
            </>
          )}

          {step === 'paying' && (
            <div className="flex flex-col gap-4 items-center">
              <h2 className="text-[14px] tracking-[0.18em] uppercase font-semibold text-[#E8E6DD]">
                Scan to pay
              </h2>
              <div className="p-3 rounded-xl bg-white">
                <QRCodeSVG value={payUrl} size={220} />
              </div>
              <p className="text-[11px] tracking-[0.06em] text-[rgba(232,230,221,0.7)] text-center">
                Open any Solana wallet (Phantom, Solflare, Backpack) and scan this code, or tap below to open your wallet directly.
              </p>
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.14em] uppercase text-[var(--terracotta)]"
              >
                Open in wallet app <ExternalLink size={11} />
              </a>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-3 h-3 rounded-full border-2 border-[var(--seafoam)] border-t-transparent animate-spin" />
                <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">
                  Waiting for confirmation…
                </span>
              </div>
              <button
                onClick={() => {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setStep('form');
                  setPayUrl('');
                  setOrderId(null);
                }}
                className="text-[10px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.55)] hover:text-[#E8E6DD] transition-colors"
              >
                Cancel and edit details
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col gap-3 items-center text-center py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(94, 234, 212,0.12)', border: '1px solid rgba(94, 234, 212,0.3)' }}>
                <Check size={26} color="var(--seafoam)" strokeWidth={2.4} />
              </div>
              <h2 className="text-[18px] font-semibold text-[#E8E6DD]">
                {mode === 'stars' ? 'Stars redeemed' : 'Payment confirmed'}
              </h2>
              <p className="text-[12px] tracking-[0.06em] text-[rgba(232,230,221,0.7)] max-w-sm">
                {mode === 'stars'
                  ? `${product.starsPrice.toLocaleString()} stars redeemed. ${dealer?.name ?? 'The dealer'} will reach out by phone to confirm shipping.`
                  : `Your order is on its way. ${dealer?.name ?? 'The dealer'} will reach out by phone to confirm shipping.`}
              </p>
              {signature && (
                <a
                  href={`https://explorer.solana.com/tx/${signature}?cluster=${cluster}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-[var(--seafoam)]"
                >
                  View transaction <ExternalLink size={10} />
                </a>
              )}
              <div className="flex gap-3 mt-4">
                <Link href="/profile" className="text-[11px] tracking-[0.18em] uppercase font-semibold px-[16px] py-[9px] rounded-full"
                  style={{ background: 'rgba(94, 234, 212,0.12)', border: '0.5px solid rgba(94, 234, 212,0.5)', color: 'var(--seafoam)' }}>
                  Order history
                </Link>
                <Link href="/marketplace" className="text-[11px] tracking-[0.18em] uppercase font-semibold px-[16px] py-[9px] rounded-full"
                  style={{ border: '0.5px solid rgba(232,230,221,0.18)', color: 'rgba(232,230,221,0.85)' }}>
                  Keep shopping
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Order summary */}
        <aside
          className="rounded-xl p-4 h-fit"
          style={{
            border: '0.5px solid rgba(232,230,221,0.1)',
            background: 'rgba(255,255,255,0.015)',
          }}
        >
          <p className="text-[10px] tracking-[0.24em] uppercase font-semibold text-[var(--seafoam)] mb-3">
            Order summary
          </p>
          <div className="flex gap-3 mb-3">
            <div
              className="relative w-[70px] h-[70px] rounded-md flex-shrink-0 overflow-hidden"
              style={{
                background:
                  'radial-gradient(ellipse at 50% 50%, rgba(255, 209, 102,0.05) 0%, transparent 70%), rgba(255,255,255,0.02)',
                border: '0.5px solid rgba(232,230,221,0.06)',
              }}
            >
              {product.image && (
                <Image src={product.image} alt={product.name} fill style={{ objectFit: 'contain', padding: 6 }} unoptimized />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#E8E6DD] leading-tight mb-1 truncate">{product.name}</p>
              {dealer?.name && (
                <p className="text-[10px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.6)]">{dealer.name}</p>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-[rgba(232,230,221,0.08)]">
            <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">Price</span>
            <span className="text-[13px] font-semibold text-[var(--terracotta)]">{formatPrice(product)}</span>
          </div>
          {burnEligible && burnStars > 0 && (
            <>
              <div className="flex justify-between items-center mt-2">
                <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">
                  Stars burned
                </span>
                <span className="text-[13px] font-semibold text-[var(--seafoam)]">
                  ✦ {burnStars.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">
                  Discount
                </span>
                <span className="text-[13px] font-semibold text-[var(--seafoam)]">
                  −{gelDiscount.toFixed(2)} ₾
                </span>
              </div>
            </>
          )}
          {mode === 'stars' ? (
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">Stars</span>
              <span className="text-[13px] font-semibold text-[var(--seafoam)]">
                ✦ {product.starsPrice.toLocaleString()}
              </span>
            </div>
          ) : (
            <div className="flex justify-between items-center mt-2">
              <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">SOL</span>
              <span className="text-[13px] font-semibold text-[#E8E6DD]">
                {discountedSol > 0 ? `${formatSol(discountedSol)} SOL` : '—'}
              </span>
            </div>
          )}
          {orderId && (
            <p className="text-[9px] tracking-[0.16em] uppercase text-[rgba(232,230,221,0.5)] mt-3 break-all">
              Order · {orderId.slice(0, 8)}…
            </p>
          )}
        </aside>
      </div>

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
  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? 'devnet';
  const gelOff = burnStars / STARS_PER_GEL;
  const newTotal = Math.max(0, priceGEL - gelOff);
  const sliderMax = maxBurn;

  return (
    <div
      className="rounded-md p-4 flex flex-col gap-2"
      style={{
        background: 'rgba(94, 234, 212, 0.04)',
        border: '0.5px solid rgba(94, 234, 212, 0.18)',
      }}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] tracking-[0.18em] uppercase text-[var(--seafoam)] font-medium">
          Burn Stars · up to {Math.round(MAX_BURN_RATIO * 100)}% off
        </span>
        <span className="text-[10px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.55)] font-mono">
          Balance ✦ {balance.toLocaleString()}
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
        style={{ accentColor: 'var(--seafoam)' }}
      />

      <div className="flex items-center justify-between text-[12px] font-mono">
        <span style={{ color: 'rgba(232,230,221,0.7)' }}>
          ✦ {burnStars.toLocaleString()} burning
        </span>
        <span style={{ color: 'var(--seafoam)', fontWeight: 600 }}>
          −{gelOff.toFixed(2)} ₾
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-[rgba(232,230,221,0.08)]">
        <span style={{ color: 'rgba(232,230,221,0.55)' }}>New total</span>
        <span style={{ color: 'var(--stl-text-bright)', fontWeight: 600 }}>
          {newTotal.toFixed(2)} ₾
        </span>
      </div>

      {burnSig && (
        <a
          href={`https://explorer.solana.com/tx/${burnSig}?cluster=${cluster}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-[0.14em] uppercase mt-1"
          style={{ color: 'var(--seafoam)' }}
        >
          Burn confirmed → view on Solana Explorer
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
      'stl-checkout-field w-full px-[14px] py-[12px] text-[14px] rounded-[14px] outline-none transition-[border-color,background] duration-150 placeholder:text-[rgba(232,230,221,0.4)]',
  };
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[10px] tracking-[0.18em] uppercase text-[rgba(232,230,221,0.65)]">
        {label}{required && <span className="text-[var(--terracotta)] ml-1">*</span>}
      </span>
      {multiline ? (
        <textarea {...common} rows={2} />
      ) : (
        <input {...common} type={type ?? 'text'} />
      )}
    </label>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}
