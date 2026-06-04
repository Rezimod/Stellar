'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Sparkles, Check, X } from 'lucide-react';
import { getCosmicDaily } from '@/lib/cosmic-daily';
import { toast } from '@/components/ui/Toast';
import { track } from '@/lib/track';

interface CosmicDailyCardProps {
  address: string | null;
  getAccessToken: () => Promise<string | null>;
}

const STORAGE_KEY = 'stellar-cosmic-daily';
const REWARD = 3;

const COPY = {
  en: { eyebrow: 'Cosmic Daily', correct: 'Correct!', wrong: 'Not quite', reward: `+${REWARD} ✦` },
  ka: { eyebrow: 'კოსმოსური დღე', correct: 'სწორია!', wrong: 'არ არის ზუსტი', reward: `+${REWARD} ✦` },
} as const;

function todayKey(): string {
  return new Date().toLocaleDateString('sv');
}

interface Saved {
  date: string;
  picked: number;
  correct: boolean;
}

function loadSaved(): Saved | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Saved | null;
    return raw && raw.date === todayKey() ? raw : null;
  } catch {
    return null;
  }
}

export function CosmicDailyCard({ address, getAccessToken }: CosmicDailyCardProps) {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const c = COPY[locale];
  const item = getCosmicDaily();
  const [picked, setPicked] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);

  useEffect(() => {
    const s = loadSaved();
    if (s) {
      setPicked(s.picked);
      setWasCorrect(s.correct);
    }
  }, []);

  const answered = picked !== null;

  async function pick(i: number) {
    if (answered) return;
    const correct = i === item.correct;
    setPicked(i);
    setWasCorrect(correct);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), picked: i, correct }));
    } catch {
      /* private mode */
    }
    if (!correct) return;

    track('stars_earned', { source: 'cosmic_daily', amount: REWARD }, address);
    if (!address) return;
    const dateStr = new Date().toISOString().slice(0, 10);
    try {
      let token: string | null = null;
      try { token = await getAccessToken(); } catch { /* external wallet */ }
      const res = await fetch('/api/award-stars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          recipientAddress: address,
          amount: REWARD,
          reason: 'cosmic_daily',
          idempotencyKey: `cosmicdaily:${address}:${dateStr}`,
        }),
      });
      const data = res.ok ? await res.json().catch(() => null) : null;
      if (res.ok && data && !data.cached) {
        toast.reward(c.reward);
        window.dispatchEvent(new Event('stellar:stars-synced'));
      }
    } catch {
      /* best-effort */
    }
  }

  function optionStyle(i: number): string {
    if (!answered) return 'border-white/[0.10] bg-white/[0.02] hover:border-white/[0.20] hover:bg-white/[0.04]';
    if (i === item.correct) return 'border-[#5EEAD4]/50 bg-[#5EEAD4]/[0.08] text-[#5EEAD4]';
    if (i === picked) return 'border-[#FB7185]/40 bg-[#FB7185]/[0.06] text-[#FB7185]';
    return 'border-white/[0.06] bg-transparent text-white/40';
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 sm:px-5 py-4 mb-5">
      <div className="flex items-center gap-2 mb-2.5">
        <Sparkles size={13} className="text-[#FFB347]" strokeWidth={1.8} />
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40" style={{ fontFamily: 'var(--font-display)' }}>
          {c.eyebrow}
        </span>
        {!answered && <span className="ml-auto text-[#FFD166] font-mono text-[12px]">{c.reward}</span>}
        {answered && (
          <span className={`ml-auto inline-flex items-center gap-1 text-[12px] font-medium ${wasCorrect ? 'text-[#5EEAD4]' : 'text-[#FB7185]'}`}>
            {wasCorrect ? <Check size={14} strokeWidth={2.2} /> : <X size={14} strokeWidth={2.2} />}
            {wasCorrect ? c.correct : c.wrong}
          </span>
        )}
      </div>

      <p className="text-white/80 text-[13.5px] leading-relaxed mb-3.5">{item.fact[locale]}</p>

      <p className="text-white text-[14.5px] font-medium leading-snug mb-2.5">{item.question[locale]}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {item.options[locale].map((opt, i) => (
          <button
            key={i}
            type="button"
            onClick={() => pick(i)}
            disabled={answered}
            className={`text-left rounded-xl border px-3 py-2.5 text-[13.5px] text-white/90 transition-all active:scale-[0.99] disabled:cursor-default ${optionStyle(i)}`}
          >
            {opt}
          </button>
        ))}
      </div>

      {answered && (
        <p className="text-white/45 text-[12px] leading-relaxed mt-3">{item.explain[locale]}</p>
      )}
    </div>
  );
}
