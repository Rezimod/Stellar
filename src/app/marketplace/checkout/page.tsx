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
import { AuthModal } from '@/components/auth/AuthModal';
import PageContainer from '@/components/layout/PageContainer';
import { getProductById, getDealerById } from '@/lib/dealers';
import type { Product } from '@/lib/dealers';

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

  const { getAccessToken } = usePrivy();
  const { authenticated, address: stellarAddress } = useStellarUser();
  const { state } = useAppState();
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
    if (product.currency === 'GEL' && solPerGEL > 0) return product.price * solPerGEL;
    if (product.currency === 'USD' && solPriceUsd > 0) return product.price / solPriceUsd;
    return 0;
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

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const canSubmit =
    !!shipping.name.trim() &&
    !!shipping.phone.trim() &&
    !!shipping.country.trim() &&
    !!shipping.city.trim() &&
    !!shipping.address.trim() &&
    amountSol > 0;

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
          amountSol: Number(amountSol.toFixed(6)),
          amountFiat: product.price,
          currency: product.currency,
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
      setPayUrl(data.url);
      setStep('paying');
      startPolling(data.orderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create order');
    } finally {
      setSubmitting(false);
    }
  }, [product, authenticated, walletAddress, canSubmit, amountSol, shipping, getAccessToken, startPolling]);

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
          Pay with SOL · Devnet
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

              {error && (
                <p className="text-[12px] text-[var(--terracotta)] tracking-[0.06em]">{error}</p>
              )}

              <button
                onClick={handlePay}
                disabled={!canSubmit || submitting || pendingPay}
                className="bg-[var(--terracotta)] text-[#1a1208] px-[20px] py-[12px] rounded-full text-[12px] font-bold tracking-[0.18em] uppercase transition-opacity disabled:opacity-50"
              >
                {submitting
                  ? 'Creating order…'
                  : pendingPay && authenticated && !walletAddress
                    ? 'Preparing wallet…'
                    : amountSol > 0
                      ? `Pay ${formatSol(amountSol)} SOL`
                      : 'Loading SOL price…'}
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
              <h2 className="text-[18px] font-semibold text-[#E8E6DD]">Payment confirmed</h2>
              <p className="text-[12px] tracking-[0.06em] text-[rgba(232,230,221,0.7)] max-w-sm">
                Your order is on its way. {dealer?.name ?? 'The dealer'} will reach out by phone to confirm shipping.
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
          <div className="flex justify-between items-center mt-2">
            <span className="text-[11px] tracking-[0.14em] uppercase text-[rgba(232,230,221,0.7)]">SOL</span>
            <span className="text-[13px] font-semibold text-[#E8E6DD]">
              {amountSol > 0 ? `${formatSol(amountSol)} SOL` : '—'}
            </span>
          </div>
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
      'w-full px-3 py-[10px] text-[13px] text-[#E8E6DD] rounded-md outline-none transition-colors placeholder:text-[rgba(232,230,221,0.35)] focus:border-[rgba(94,234,212,0.45)]',
    style: {
      background: 'rgba(255,255,255,0.015)',
      border: '0.5px solid rgba(232,230,221,0.12)',
    } as React.CSSProperties,
  };
  return (
    <label className="flex flex-col gap-[6px]">
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
