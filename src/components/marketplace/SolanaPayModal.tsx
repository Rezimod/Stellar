'use client';

import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface SolanaPayModalProps {
  productName: string;
  amountSOL: number;
  priceGEL: number;
  orderId: string;
  onConfirmed: (signature: string) => void;
  onClose: () => void;
}

type Step = 'loading' | 'qr' | 'polling' | 'done' | 'error';

export default function SolanaPayModal({
  productName,
  amountSOL,
  priceGEL,
  orderId,
  onConfirmed,
  onClose,
}: SolanaPayModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [payUrl, setPayUrl] = useState('');
  const [reference, setReference] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch('/api/solana-pay/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountSOL, label: productName, orderId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) { setErrorMsg(data.error); setStep('error'); return; }
        setPayUrl(data.url);
        setReference(data.reference);
        setStep('qr');
      })
      .catch(() => { setErrorMsg('Could not generate payment QR'); setStep('error'); });
  }, [amountSOL, productName, orderId]);

  const startPolling = () => {
    if (!reference) return;
    setStep('polling');
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/solana-pay/confirm?reference=${reference}`);
        const data = await res.json();
        if (data.confirmed && data.signature) {
          if (pollRef.current) clearInterval(pollRef.current);
          setStep('done');
          onConfirmed(data.signature);
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  return (
    <div className="fixed inset-0 bg-canvas/70 backdrop-blur-sm z-[70] flex items-center justify-center px-4"
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: '#0F1827', border: '1px solid rgba(232, 130, 107,0.15)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between">
          <h3 className="text-text-primary font-semibold">Pay with SOL</h3>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="text-center">
          <p className="text-text-muted text-sm truncate">{productName}</p>
          <p className="text-text-primary font-bold text-xl mt-1">{amountSOL.toFixed(3)} SOL</p>
          <p className="text-text-muted text-xs">≈ {priceGEL} ₾</p>
        </div>

        {step === 'loading' && (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--terracotta)] border-t-transparent animate-spin" />
          </div>
        )}

        {step === 'qr' && (
          <>
            <div className="flex justify-center">
              <div className="p-3 rounded-xl bg-white">
                <QRCodeSVG value={payUrl} size={200} />
              </div>
            </div>
            <p className="text-text-muted text-xs text-center">
              Scan with any Solana wallet app (Phantom, Solflare, etc.)
            </p>
            <button
              onClick={startPolling}
              className="w-full py-3 rounded-xl text-sm font-semibold text-black"
              style={{ background: 'linear-gradient(to right, var(--seafoam), var(--seafoam))' }}>
              I&apos;ve sent the payment
            </button>
          </>
        )}

        {step === 'polling' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-5 h-5 rounded-full border-2 border-[var(--seafoam)] border-t-transparent animate-spin" />
            <p className="text-text-muted text-sm text-center">Waiting for confirmation on Solana devnet…</p>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(94, 234, 212,0.12)', border: '1px solid rgba(94, 234, 212,0.3)' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M5 11l4 4 8-8" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[var(--seafoam)] font-semibold text-sm">Payment confirmed</p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-4">
            <p className="text-terracotta text-sm">{errorMsg}</p>
            <p className="text-text-muted text-xs mt-2">Make sure NEXT_PUBLIC_MERCHANT_WALLET is set.</p>
          </div>
        )}

        {(step === 'qr' || step === 'polling') && (
          <a
            href={payUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--terracotta)]"
          >
            Open in wallet app <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
