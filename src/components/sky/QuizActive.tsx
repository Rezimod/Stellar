'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAppState } from '@/hooks/useAppState';
import type { QuizDef } from '@/lib/quizzes';

interface Props {
  quiz: QuizDef;
  onClose: () => void;
}

export default function QuizActive({ quiz, onClose }: Props) {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { addQuizResult } = useAppState();
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const solanaWallet = wallets.find(w => (w as { chainType?: string }).chainType === 'solana');

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'question' | 'feedback' | 'result'>('question');
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const q = quiz.questions[idx];
  const total = quiz.questions.length;
  const stars = score * quiz.starsPerCorrect;

  const awardQuizStarsOnChain = async (earnedStars: number) => {
    if (earnedStars <= 0 || !solanaWallet?.address) return;
    try {
      const token = await getAccessToken().catch(() => null);
      await fetch('/api/award-stars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientAddress: solanaWallet.address,
          amount: Math.min(earnedStars, 1000),
          reason: `quiz:${quiz.id}`,
          idempotencyKey: `quiz:${quiz.id}:${solanaWallet.address}:${new Date().toISOString().slice(0, 10)}`,
        }),
      });
    } catch {
      // Non-blocking — local state is already saved
    }
  };

  const pick = (i: number) => {
    if (phase !== 'question') return;
    setSelected(i);
    setPhase('feedback');
    const correct = i === q.correct;
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, correct]);

    setTimeout(() => {
      if (idx + 1 < total) {
        setIdx(idx + 1);
        setSelected(null);
        setPhase('question');
      } else {
        setPhase('result');
        const finalStars = (correct ? score + 1 : score) * quiz.starsPerCorrect;
        awardQuizStarsOnChain(finalStars);
      }
    }, 2500);
  };

  const handleClose = () => {
    if (phase === 'result' && !saved) {
      addQuizResult({ quizId: quiz.id, score, total, stars, timestamp: new Date().toISOString() });
      setSaved(true);
    }
    onClose();
  };

  const restart = () => {
    if (!saved && phase === 'result') {
      addQuizResult({ quizId: quiz.id, score, total, stars, timestamp: new Date().toISOString() });
      setSaved(true);
    }
    setIdx(0); setSelected(null); setScore(0); setPhase('question'); setSaved(false); setAnswers([]);
  };

  const LABELS = ['A', 'B', 'C', 'D'];

  return (
    <div className="fixed inset-0 z-50 bg-[#070B14] flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="flex h-0.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: phase === 'result' ? '100%' : `${(idx / total) * 100}%`,
            background: 'linear-gradient(90deg, #FFD166, #38F0FF)',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xl">{quiz.emoji}</span>
          <p className="text-white text-sm font-semibold">{quiz.title[locale]}</p>
        </div>
        {phase !== 'result' && (
          <span className="text-slate-500 text-xs">{idx + 1} / {total}</span>
        )}
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white transition-colors ml-2"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col px-4 py-6 max-w-lg mx-auto w-full">

        {phase === 'result' ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)' }}>
              {score >= 8 ? '🏆' : score >= 5 ? '⭐' : '🔭'}
            </div>
            <div>
              <p className="text-4xl font-bold text-white mb-1">{score}<span className="text-slate-500 text-2xl">/{total}</span></p>
              <p className="text-[#FFD166] font-bold text-lg">+{stars} ✦</p>
              <p className="text-slate-400 text-sm mt-2">
                {score >= 8 ? 'Outstanding!' : score >= 5 ? 'Well done!' : 'Keep learning!'}
              </p>
            </div>
            <div className="w-full">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {answers.map((correct, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: correct ? 'rgba(52,211,153,0.15)' : 'rgba(239,68,68,0.15)',
                      border: correct ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(239,68,68,0.3)',
                      color: correct ? '#34d399' : '#f87171',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-slate-600 text-[10px] text-center mt-2">
                {answers.filter(Boolean).length} correct · {answers.filter(b => !b).length} wrong
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={restart}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-300 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Play Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Question */}
            <div
              className="rounded-2xl p-5 mb-6 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-white text-base font-medium leading-relaxed">{q.q[locale]}</p>
            </div>

            {/* Options */}
            <div className="flex flex-col gap-3">
              {q.options.map((opt, i) => {

                let style: React.CSSProperties = {
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                };
                if (phase === 'feedback') {
                  if (i === q.correct) {
                    style = { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.5)' };
                  } else if (i === selected && i !== q.correct) {
                    style = { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.5)' };
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={phase === 'feedback'}
                    className="flex items-center gap-3 text-left px-4 py-3.5 rounded-xl transition-all duration-200 text-sm"
                    style={style}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: phase === 'feedback' && i === q.correct
                          ? 'rgba(52,211,153,0.3)'
                          : 'rgba(255,255,255,0.06)',
                        color: phase === 'feedback' && i === q.correct ? '#34d399'
                          : phase === 'feedback' && i === selected ? '#ef4444'
                          : '#94a3b8',
                      }}
                    >
                      {LABELS[i]}
                    </span>
                    <span className={
                      phase === 'feedback' && i === q.correct ? 'text-[#34d399]'
                      : phase === 'feedback' && i === selected && i !== q.correct ? 'text-red-400'
                      : 'text-slate-200'
                    }>
                      {opt[locale]}
                    </span>
                  </button>
                );
              })}
            </div>

            {phase === 'feedback' && (
              <div
                className="mt-1 rounded-xl p-4 text-xs leading-relaxed"
                style={{
                  background: selected === q.correct ? 'rgba(52,211,153,0.08)' : 'rgba(239,68,68,0.08)',
                  border: selected === q.correct ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(239,68,68,0.2)',
                  color: '#94a3b8',
                }}
              >
                <span className="font-semibold" style={{ color: selected === q.correct ? '#34d399' : '#f87171' }}>
                  {selected === q.correct ? '✓ Correct — ' : '✗ Incorrect — '}
                </span>
                {q.explanation[locale]}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
