'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useAppState } from '@/hooks/useAppState';
import { Volume2, VolumeX } from 'lucide-react';
import type { QuizDef } from '@/lib/quizzes';

interface Props {
  quiz: QuizDef;
  onClose: () => void;
}

const READY_BEAT_MS = 1000;
const MUTE_KEY = 'stellar_quiz_mute';

// Per-question countdown — first half of the quiz gets 10s, later questions 5s.
function questionSeconds(index: number, total: number): number {
  return index < Math.ceil(total / 2) ? 10 : 5;
}

// Anti-cheat: a question that runs out without a pick locks star reward.
// Picking late (still on the clock) is fine — reading-time variance is normal.

function ringColor(secondsLeft: number): string {
  if (secondsLeft <= 3) return 'var(--negative)';
  if (secondsLeft <= 7) return 'var(--warning)';
  return 'var(--seafoam)';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export default function QuizActive({ quiz, onClose }: Props) {
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const { addQuizResult } = useAppState();
  const { getAccessToken } = usePrivy();
  const { address: walletAddress } = useStellarUser();

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'question' | 'feedback' | 'result'>('ready');
  const [saved, setSaved] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [progress, setProgress] = useState(0); // 0 → 1
  const [missedAnyTimeout, setMissedAnyTimeout] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reduced, setReduced] = useState(false);

  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepedAtRef = useRef<Set<number>>(new Set());
  const bodyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const q = quiz.questions[idx];
  const total = quiz.questions.length;
  const passThreshold = Math.ceil(total * 0.7);
  const eligibleForStars = score >= passThreshold && !missedAnyTimeout;
  const stars = eligibleForStars ? score * quiz.starsPerCorrect : 0;
  const currentSeconds = questionSeconds(idx, total);

  // Mount: load mute pref + reduced-motion, lock body scroll, mark portal-ready
  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());
    if (typeof window !== 'undefined') {
      setMuted(localStorage.getItem(MUTE_KEY) !== '0');
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Reset internal scroll on each phase/question change so the user always
  // lands at the top (first-question header, result rewards, etc.)
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [phase, idx]);

  const playTick = (secondsLeft: number) => {
    if (muted) return;
    if (typeof window === 'undefined') return;
    if (beepedAtRef.current.has(secondsLeft)) return;
    beepedAtRef.current.add(secondsLeft);
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = secondsLeft === 1 ? 880 : 660;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // AudioContext blocked — silently skip
    }
  };

  const cancelRaf = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Award stars (only fired from result phase, gated by eligibleForStars).
  const awardQuizStarsOnChain = async (earnedStars: number) => {
    if (earnedStars <= 0 || !walletAddress) return;
    try {
      const token = await getAccessToken().catch(() => null);
      await fetch('/api/award-stars', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          recipientAddress: walletAddress,
          amount: Math.min(earnedStars, 1000),
          reason: `quiz:${quiz.id}`,
          idempotencyKey: `quiz:${quiz.id}:${walletAddress}:${new Date().toISOString().slice(0, 10)}`,
        }),
      });
    } catch {
      // Non-blocking
    }
  };

  // 1s "ready" beat at the start of each question, then start the rAF loop.
  useEffect(() => {
    if (phase !== 'ready') return;
    const t = setTimeout(() => {
      startRef.current = performance.now();
      beepedAtRef.current = new Set();
      setProgress(0);
      setPhase('question');
    }, READY_BEAT_MS);
    return () => clearTimeout(t);
  }, [phase, idx]);

  // rAF loop: drains the ring while phase==='question'.
  useEffect(() => {
    if (phase !== 'question') return;
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000;
      const ratio = Math.min(1, elapsed / currentSeconds);
      setProgress(ratio);

      const secondsLeft = Math.ceil(currentSeconds - elapsed);
      if (secondsLeft <= 3 && secondsLeft >= 1) playTick(secondsLeft);

      if (ratio >= 1) {
        // Timeout — auto-submit.
        const picked = selected;
        const correct = picked !== null && picked === q.correct;
        if (picked === null) {
          setMissedAnyTimeout(true);
        }
        if (correct) setScore(s => s + 1);
        setAnswers(prev => [...prev, correct]);
        setPhase('feedback');
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return cancelRaf;
  }, [phase, idx, selected, q.correct, currentSeconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Feedback → next question (or result).
  useEffect(() => {
    if (phase !== 'feedback') return;
    const t = setTimeout(() => {
      if (idx + 1 < total) {
        setIdx(idx + 1);
        setSelected(null);
        setPhase('ready');
      } else {
        setPhase('result');
      }
    }, 2200);
    return () => clearTimeout(t);
  }, [phase, idx, total]);

  // On entering result: persist + award (if eligible).
  useEffect(() => {
    if (phase !== 'result' || saved) return;
    addQuizResult({ quizId: quiz.id, score, total, stars, timestamp: new Date().toISOString() });
    setSaved(true);
    if (eligibleForStars) awardQuizStarsOnChain(stars);
  }, [phase, saved, score, total, stars, eligibleForStars, quiz.id, addQuizResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (i: number) => {
    if (phase !== 'question') return;
    cancelRaf();
    setSelected(i);
    const correct = i === q.correct;
    if (correct) setScore(s => s + 1);
    setAnswers(prev => [...prev, correct]);
    setPhase('feedback');
  };

  const handleClose = () => {
    cancelRaf();
    onClose();
  };

  const restart = () => {
    cancelRaf();
    setIdx(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
    setMissedAnyTimeout(false);
    setSaved(false);
    setPhase('ready');
  };

  const toggleMute = () => {
    setMuted(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      }
      return next;
    });
  };

  const LABELS = ['A', 'B', 'C', 'D'];
  const secondsLeft = Math.max(0, Math.ceil(currentSeconds - progress * currentSeconds));
  const ringStrokeColor = ringColor(secondsLeft);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-[var(--canvas)] flex flex-col overflow-hidden">
      {/* Top progress bar (questions completed) */}
      <div className="flex h-0.5 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div
          className="h-full transition-all duration-500"
          style={{
            width: phase === 'result' ? '100%' : `${(idx / total) * 100}%`,
            background: 'var(--terracotta)',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">{quiz.emoji}</span>
          <p className="text-text-primary text-sm font-semibold">{quiz.title[locale]}</p>
        </div>
        <div className="flex items-center gap-2">
          {phase !== 'result' && (
            <span className="text-text-muted text-xs">{idx + 1} / {total}</span>
          )}
          <button
            onClick={toggleMute}
            aria-label={muted ? 'Unmute timer ticks' : 'Mute timer ticks'}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto w-full">
       <div className="flex flex-col px-4 py-6 max-w-lg mx-auto w-full min-h-full">

        {phase === 'result' ? (
          <div className="flex flex-col items-center justify-center min-h-full gap-6 text-center py-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: 'rgba(255, 209, 102,0.08)', border: '1px solid rgba(255, 209, 102,0.2)' }}>
              {score >= 8 ? '🏆' : score >= 5 ? '⭐' : '🔭'}
            </div>
            <div>
              <p className="text-4xl font-bold text-text-primary mb-1">{score}<span className="text-text-muted text-2xl">/{total}</span></p>
              <p className="text-[var(--terracotta)] font-bold text-lg">+{stars} ✦</p>
              <p className="text-text-muted text-sm mt-2">
                {eligibleForStars
                  ? (score >= 8 ? 'Outstanding!' : 'Well done!')
                  : missedAnyTimeout
                    ? 'No Stars — at least one question ran out without a pick.'
                    : 'No Stars — you need 70% to earn.'}
              </p>
            </div>
            <div className="w-full">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {answers.map((correct, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      background: correct ? 'rgba(94, 234, 212,0.15)' : 'rgba(251, 113, 133,0.15)',
                      border: correct ? '1px solid rgba(94, 234, 212,0.3)' : '1px solid rgba(251, 113, 133,0.3)',
                      color: correct ? 'var(--success)' : 'var(--negative)',
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <p className="text-text-muted text-[10px] text-center mt-2">
                {answers.filter(Boolean).length} correct · {answers.filter(b => !b).length} wrong
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={restart}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-text-primary transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                Play Again
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'var(--terracotta)', color: 'var(--canvas)' }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Question card with timer */}
            <div
              className="relative rounded-2xl p-5 mb-6 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              {/* Timer badge — top-right */}
              <div className="absolute top-3 right-3">
                {reduced ? (
                  <span
                    className="font-mono text-xs"
                    style={{ color: ringStrokeColor }}
                    aria-label={`${secondsLeft} seconds left`}
                  >
                    {phase === 'ready' ? `${currentSeconds}s` : `${secondsLeft}s`}
                  </span>
                ) : (
                  <svg
                    width="32" height="32" viewBox="0 0 32 32"
                    aria-label={`${secondsLeft} seconds left`}
                  >
                    <circle
                      cx="16" cy="16" r="14"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="16" cy="16" r="14"
                      fill="none"
                      stroke={ringStrokeColor}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 14}
                      strokeDashoffset={2 * Math.PI * 14 * (phase === 'ready' ? 0 : progress)}
                      transform="rotate(-90 16 16)"
                      style={{ transition: 'stroke 200ms linear' }}
                    />
                    <text
                      x="16" y="20"
                      textAnchor="middle"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fill={ringStrokeColor}
                    >
                      {phase === 'ready' ? currentSeconds : secondsLeft}
                    </text>
                  </svg>
                )}
              </div>

              <p className="text-text-primary text-base font-medium leading-relaxed pr-12">{q.q[locale]}</p>
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
                    style = { background: 'rgba(94, 234, 212,0.15)', border: '1px solid rgba(94, 234, 212,0.5)' };
                  } else if (i === selected && i !== q.correct) {
                    style = { background: 'rgba(251, 113, 133,0.15)', border: '1px solid rgba(251, 113, 133,0.5)' };
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => pick(i)}
                    disabled={phase !== 'question'}
                    className="flex items-center gap-3 text-left px-4 py-3.5 rounded-xl transition-all duration-200 text-sm"
                    style={style}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: phase === 'feedback' && i === q.correct
                          ? 'rgba(94, 234, 212,0.3)'
                          : 'rgba(255,255,255,0.06)',
                        color: phase === 'feedback' && i === q.correct ? 'var(--success)'
                          : phase === 'feedback' && i === selected ? 'var(--negative)'
                          : 'var(--text-muted)',
                      }}
                    >
                      {LABELS[i]}
                    </span>
                    <span className={
                      phase === 'feedback' && i === q.correct ? 'text-[var(--seafoam)]'
                      : phase === 'feedback' && i === selected && i !== q.correct ? 'text-negative'
                      : 'text-text-primary'
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
                  background: selected === q.correct ? 'rgba(94, 234, 212,0.08)' : 'rgba(251, 113, 133,0.08)',
                  border: selected === q.correct ? '1px solid rgba(94, 234, 212,0.2)' : '1px solid rgba(251, 113, 133,0.2)',
                  color: 'var(--text-muted)',
                }}
              >
                <span className="font-semibold" style={{ color: selected === q.correct ? 'var(--success)' : 'var(--negative)' }}>
                  {selected === null ? '✗ Time up — ' : selected === q.correct ? '✓ Correct — ' : '✗ Incorrect — '}
                </span>
                {q.explanation[locale]}
              </div>
            )}
          </>
        )}
       </div>
      </div>
    </div>,
    document.body,
  );
}
