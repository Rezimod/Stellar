'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import { useStellarUser } from '@/hooks/useStellarUser';
import { useLocation } from '@/lib/location';
import { DEFAULT_OBSERVER } from '@/lib/observer-location';
import { AuthModal } from '@/components/auth/AuthModal';
import { UP_NOW_SUBTYPE, UP_NOW_STREAK_BONUS_THRESHOLD, type UpNowSubtype } from '@/lib/games/up-now';
import {
  ArrowUp, ArrowDown, Star, Copy, Check, X, ChevronRight, Loader2,
  Sun, Moon, Orbit, Sparkles, CircleDot, Aperture, type LucideIcon,
} from 'lucide-react';

interface UpNowHint {
  kind: 'rise' | 'set' | 'circumpolarAlways' | 'circumpolarNever';
  atIso?: string;
}
interface UpNowQuestion {
  id: string;
  kind: 'solar' | 'star' | 'deepsky';
  isUp: boolean;
  altitudeDeg: number;
  hint: UpNowHint | null;
  photoUrl: string | null;
  choices: string[] | null;
}
interface UpNowResponse {
  utcDate: string;
  issuedAt: string;
  locationUsed: { lat: number; lon: number; isFallback: boolean };
  questions: UpNowQuestion[];
  playedToday: { score: number; stars: number; streak: number } | null;
}
interface CompleteResult {
  score: number;
  streak: number | null;
  starsAwarded: number;
  alreadyPlayed: boolean;
}
interface Pick {
  above: boolean;
  correct: boolean;
}

type Screen = 'intro' | 'round' | 'submitting' | 'result';

const KIND_ICON: Record<UpNowSubtype, LucideIcon> = {
  sun: Sun, moon: Moon, planet: Orbit, star: Star,
  nebula: Sparkles, cluster: CircleDot, galaxy: Aperture,
};

function fmtClock(iso: string, dateLocale: string): string {
  return new Date(iso).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Dense decorative starfield, scoped to this page — denser than the global
 *  6–10 dot sprinkle so the game reads as its own cosmic space. Static
 *  positions (no twinkle animation), generated once per mount. */
function UpNowStarfield() {
  const stars = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 1.8 + 0.5,
      opacity: Math.random() * 0.5 + 0.25,
    })),
    [],
  );
  return (
    <div className="upnow-starfield" aria-hidden>
      {stars.map((s) => (
        <span
          key={s.id}
          style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, opacity: s.opacity }}
        />
      ))}
    </div>
  );
}

export default function UpNowPage() {
  const router = useRouter();
  const { authenticated, address } = useStellarUser();
  const { getAccessToken } = usePrivy();
  const locale = useLocale() === 'ka' ? 'ka' : 'en';
  const dateLocale = locale === 'ka' ? 'ka-GE' : 'en-US';
  const t = useTranslations('games.upNow');
  const { location, ensureLocation } = useLocation();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => { ensureLocation(); }, [ensureLocation]);

  const [data, setData] = useState<UpNowResponse | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [screen, setScreen] = useState<Screen>('intro');
  const [roundIndex, setRoundIndex] = useState(0);
  const [picks, setPicks] = useState<(Pick | null)[]>([]);
  const [identifyPicks, setIdentifyPicks] = useState<(string | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [copyLabel, setCopyLabel] = useState<'idle' | 'copied'>('idle');

  const lat = location.lat ?? DEFAULT_OBSERVER.lat;
  const lon = location.lon ?? DEFAULT_OBSERVER.lon;

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const params = new URLSearchParams();
      if (location.lat != null && location.lon != null) {
        params.set('lat', String(location.lat));
        params.set('lon', String(location.lon));
      }
      let token: string | null = null;
      if (authenticated) {
        try { token = await getAccessToken(); } catch { /* external wallet */ }
      }
      const res = await fetch(`/api/games/up-now?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('bad response');
      const json: UpNowResponse = await res.json();
      setData(json);
      setPicks(new Array(json.questions.length).fill(null));
      setIdentifyPicks(new Array(json.questions.length).fill(null));
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, [location.lat, location.lon, authenticated, getAccessToken]);

  useEffect(() => { load(); }, [load]);

  const requireAuth = useCallback((action: () => void) => {
    if (!authenticated) {
      setAuthOpen(true);
      return;
    }
    action();
  }, [authenticated]);

  const startPlay = useCallback(() => {
    requireAuth(() => {
      setRoundIndex(0);
      setPicks(new Array(data?.questions.length ?? 0).fill(null));
      setIdentifyPicks(new Array(data?.questions.length ?? 0).fill(null));
      setRevealed(false);
      setResult(null);
      setScreen('round');
    });
  }, [requireAuth, data]);

  const identify = useCallback((choiceId: string) => {
    setIdentifyPicks((prev) => {
      if (prev[roundIndex] != null) return prev;
      const next = [...prev];
      next[roundIndex] = choiceId;
      return next;
    });
  }, [roundIndex]);

  const question = data?.questions[roundIndex] ?? null;
  const needsIdentify = question?.kind === 'deepsky' && identifyPicks[roundIndex] == null;

  const answer = useCallback((above: boolean) => {
    if (!data || revealed || needsIdentify) return;
    const q = data.questions[roundIndex];
    const correct = above === q.isUp;
    setPicks((prev) => {
      const next = [...prev];
      next[roundIndex] = { above, correct };
      return next;
    });
    setRevealed(true);
  }, [data, revealed, roundIndex, needsIdentify]);

  const submit = useCallback(async (finalPicks: (Pick | null)[]) => {
    if (!data) return;
    setScreen('submitting');
    const score = finalPicks.filter((p) => p?.correct).length;
    try {
      const token = await getAccessToken().catch(() => null);
      const res = await fetch('/api/games/up-now/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ wallet: address, utcDate: data.utcDate, score }),
      });
      if (!res.ok) throw new Error('complete failed');
      const json: CompleteResult = await res.json();
      setResult(json);
    } catch {
      setResult({ score, streak: null, starsAwarded: 0, alreadyPlayed: false });
    }
    setScreen('result');
  }, [data, address, getAccessToken]);

  const next = useCallback(() => {
    if (!data) return;
    if (roundIndex + 1 >= data.questions.length) {
      submit(picks);
      return;
    }
    setRoundIndex((i) => i + 1);
    setRevealed(false);
  }, [data, roundIndex, picks, submit]);

  // Desktop arrow-key answering: left = Above, right = Below; Enter advances
  // once a round has been revealed. Disabled during a deep-sky round's
  // identify step (not yet answering the horizon question).
  useEffect(() => {
    if (screen !== 'round' || needsIdentify) return;
    const onKey = (e: KeyboardEvent) => {
      if (!revealed) {
        if (e.key === 'ArrowLeft') answer(true);
        else if (e.key === 'ArrowRight') answer(false);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, revealed, needsIdentify, answer, next]);

  const score = useMemo(() => picks.filter((p) => p?.correct).length, [picks]);

  const copyResult = useCallback(() => {
    if (!data) return;
    const squares = picks.map((p) => (p?.correct ? '■' : '□'));
    const rows: string[] = [];
    for (let i = 0; i < squares.length; i += 4) rows.push(squares.slice(i, i + 4).join(''));
    const text = [
      `${t('shareTitle')} — ${data.utcDate}`,
      ...rows,
      `${score}/${data.questions.length} · stellarr.club`,
    ].join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      setCopyLabel('copied');
      setTimeout(() => setCopyLabel('idle'), 2000);
    }).catch(() => {});
  }, [data, picks, score, t]);

  if (loadState === 'loading') {
    return (
      <div className="upnow-shell">
        <UpNowStarfield />
        <div className="upnow-loading" role="status">
          <Loader2 size={22} strokeWidth={2} className="upnow-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (loadState === 'error' || !data) {
    return (
      <div className="upnow-shell">
        <UpNowStarfield />
        <div className="upnow-empty">
          <p>{t('error')}</p>
          <button type="button" className="upnow-btn upnow-btn--primary" onClick={load}>{t('retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="upnow-shell">
      <UpNowStarfield />

      {data.locationUsed.isFallback && (
        <p className="upnow-location-note">{t('locationFallback', { city: DEFAULT_OBSERVER.city })}</p>
      )}

      {screen === 'intro' && (
        <IntroScreen
          t={t}
          utcDate={data.utcDate}
          dateLocale={dateLocale}
          playedToday={data.playedToday}
          totalRounds={data.questions.length}
          onPlay={startPlay}
        />
      )}

      {screen === 'round' && question && (
        <RoundScreen
          t={t}
          question={question}
          roundIndex={roundIndex}
          totalRounds={data.questions.length}
          pick={picks[roundIndex]}
          identifyPick={identifyPicks[roundIndex]}
          revealed={revealed}
          dateLocale={dateLocale}
          onIdentify={identify}
          onAnswer={answer}
          onNext={next}
        />
      )}

      {screen === 'submitting' && (
        <div className="upnow-loading" role="status">
          <Loader2 size={22} strokeWidth={2} className="upnow-spin" />
          <span>{t('submitting')}</span>
        </div>
      )}

      {screen === 'result' && result && (
        <ResultScreen
          t={t}
          result={result}
          totalRounds={data.questions.length}
          questions={data.questions}
          picks={picks}
          copyLabel={copyLabel}
          onCopy={copyResult}
          onSky={() => router.push('/sky')}
          onMissions={() => router.push('/missions')}
        />
      )}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

// ---- Screen 1: intro ----

function IntroScreen({
  t, utcDate, dateLocale, playedToday, totalRounds, onPlay,
}: {
  t: ReturnType<typeof useTranslations>;
  utcDate: string;
  dateLocale: string;
  playedToday: UpNowResponse['playedToday'];
  totalRounds: number;
  onPlay: () => void;
}) {
  const dateLabel = new Date(`${utcDate}T12:00:00Z`).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' });
  return (
    <section className="upnow-card upnow-intro">
      <span className="upnow-orbit-ring" aria-hidden />
      <span className="upnow-eyebrow">{t('title')}</span>
      <h1 className="upnow-heading">{dateLabel}</h1>
      <p className="upnow-sub">{t('tagline', { n: totalRounds })}</p>

      {playedToday ? (
        <div className="upnow-played">
          <div className="upnow-played-stat">
            <span className="upnow-played-num">{playedToday.score}/{totalRounds}</span>
            <span className="upnow-played-label">{t('result.score')}</span>
          </div>
          <div className="upnow-played-stat">
            <span className="upnow-played-num">{playedToday.streak}</span>
            <span className="upnow-played-label">{t('result.streak')}</span>
          </div>
          <div className="upnow-played-stat">
            <span className="upnow-played-num"><Star size={14} strokeWidth={2} fill="currentColor" />{playedToday.stars}</span>
            <span className="upnow-played-label">{t('result.starsAwarded')}</span>
          </div>
          <p className="upnow-played-note">{t('intro.nextRound')}</p>
        </div>
      ) : (
        <>
          <p className="upnow-streak-hint">{t('intro.streakHint', { n: UP_NOW_STREAK_BONUS_THRESHOLD })}</p>
          <button type="button" className="upnow-btn upnow-btn--primary upnow-btn--play" onClick={onPlay}>
            {t('intro.play')}
            <ChevronRight size={16} strokeWidth={2.2} />
          </button>
        </>
      )}
    </section>
  );
}

// ---- Screen 2: round ----

function RoundScreen({
  t, question, roundIndex, totalRounds, pick, identifyPick, revealed, dateLocale, onIdentify, onAnswer, onNext,
}: {
  t: ReturnType<typeof useTranslations>;
  question: UpNowQuestion;
  roundIndex: number;
  totalRounds: number;
  pick: Pick | null;
  identifyPick: string | null;
  revealed: boolean;
  dateLocale: string;
  onIdentify: (choiceId: string) => void;
  onAnswer: (above: boolean) => void;
  onNext: () => void;
}) {
  const subtype: UpNowSubtype = UP_NOW_SUBTYPE[question.id] ?? 'star';
  const KindIcon = KIND_ICON[subtype];
  const pct = ((roundIndex + (revealed ? 1 : 0)) / totalRounds) * 100;
  const altitudeLabel = `${question.altitudeDeg > 0 ? '+' : ''}${question.altitudeDeg}°`;
  const hintText = !question.hint ? null
    : question.hint.kind === 'circumpolarAlways' ? t('round.hint.circumpolarAlways')
    : question.hint.kind === 'circumpolarNever' ? t('round.hint.circumpolarNever')
    : question.hint.kind === 'rise' ? t('round.hint.rise', { time: fmtClock(question.hint.atIso!, dateLocale) })
    : t('round.hint.set', { time: fmtClock(question.hint.atIso!, dateLocale) });

  const isDeepsky = question.kind === 'deepsky' && question.photoUrl && question.choices;
  const needsIdentify = isDeepsky && identifyPick == null;
  const identifyCorrect = identifyPick === question.id;

  return (
    <section className="upnow-card upnow-round">
      <div className="upnow-progress" aria-label={t('round.progress', { n: roundIndex + 1, total: totalRounds })}>
        <span className="upnow-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="upnow-progress-label">{t('round.progress', { n: roundIndex + 1, total: totalRounds })}</span>

      <span className="upnow-kind">
        <KindIcon size={13} strokeWidth={2} />
        {t(`kind.${subtype}`)}
      </span>

      {isDeepsky && (
        <div className="upnow-photo">
          <Image
            src={question.photoUrl!}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            style={{ objectFit: 'cover' }}
            priority={roundIndex === 0}
          />
        </div>
      )}

      {needsIdentify ? (
        <>
          <p className="upnow-question">{t('round.identify.question')}</p>
          <div className="upnow-choices">
            {question.choices!.map((choiceId) => (
              <button
                key={choiceId}
                type="button"
                className="upnow-choice"
                onClick={() => onIdentify(choiceId)}
              >
                {t(`objects.${choiceId}.name`)}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          {isDeepsky && (
            <p className={`upnow-identify-result${identifyCorrect ? ' is-correct' : ' is-wrong'}`}>
              {identifyCorrect
                ? <><Check size={13} strokeWidth={2.4} /> {t('round.identify.correct')}</>
                : <><X size={13} strokeWidth={2.4} /> {t('round.identify.incorrect')} {t(`objects.${question.id}.name`)}</>}
            </p>
          )}
          <h2 className="upnow-object-name">{t(`objects.${question.id}.name`)}</h2>
          <p className="upnow-question">{t('round.question')}</p>

          <div className="upnow-answers">
            <button
              type="button"
              className={`upnow-answer${revealed && pick?.above ? (pick.correct ? ' is-correct' : ' is-wrong') : ''}`}
              disabled={revealed}
              onClick={() => onAnswer(true)}
            >
              <ArrowUp size={18} strokeWidth={2.2} />
              {t('round.above')}
            </button>
            <button
              type="button"
              className={`upnow-answer${revealed && pick && !pick.above ? (pick.correct ? ' is-correct' : ' is-wrong') : ''}`}
              disabled={revealed}
              onClick={() => onAnswer(false)}
            >
              <ArrowDown size={18} strokeWidth={2.2} />
              {t('round.below')}
            </button>
          </div>

          {revealed && pick && (
            <div className={`upnow-feedback${pick.correct ? ' is-correct' : ' is-wrong'}`}>
              <span className="upnow-feedback-verdict">
                {pick.correct ? <Check size={15} strokeWidth={2.4} /> : <X size={15} strokeWidth={2.4} />}
                {pick.correct ? t('round.correct') : t('round.incorrect')}
              </span>
              <span className="upnow-feedback-altitude">{altitudeLabel}</span>
              {hintText && <p className="upnow-feedback-hint">{hintText}</p>}
              <button type="button" className="upnow-btn upnow-btn--primary upnow-btn--next" onClick={onNext}>
                {roundIndex + 1 >= totalRounds ? t('round.seeResults') : t('round.next')}
                <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ---- Screen 3: result ----

function ResultScreen({
  t, result, totalRounds, questions, picks, copyLabel, onCopy, onSky, onMissions,
}: {
  t: ReturnType<typeof useTranslations>;
  result: CompleteResult;
  totalRounds: number;
  questions: UpNowQuestion[];
  picks: (Pick | null)[];
  copyLabel: 'idle' | 'copied';
  onCopy: () => void;
  onSky: () => void;
  onMissions: () => void;
}) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const pct = Math.min(1, Math.max(0, result.score / totalRounds));
  return (
    <section className="upnow-card upnow-result">
      <span className="upnow-eyebrow">{t('result.title')}</span>
      <div className="upnow-result-ring">
        <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden>
          <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(var(--ink), 0.1)" strokeWidth="4" />
          <circle
            cx="40" cy="40" r={R} fill="none" stroke="var(--terracotta)" strokeWidth="4"
            strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 40 40)"
          />
        </svg>
        <span className="upnow-result-score">{result.score}<i>/{totalRounds}</i></span>
      </div>

      <div className="upnow-result-stats">
        {result.streak != null && (
          <span className="upnow-result-stat">{t('result.streakValue', { n: result.streak })}</span>
        )}
        <span className="upnow-result-stat upnow-result-stat--stars">
          <Star size={13} strokeWidth={2} fill="currentColor" />
          {t('result.starsValue', { n: result.starsAwarded })}
        </span>
      </div>

      <ol className="upnow-review">
        {questions.map((q, i) => {
          const p = picks[i];
          const subtype: UpNowSubtype = UP_NOW_SUBTYPE[q.id] ?? 'star';
          const KindIcon = KIND_ICON[subtype];
          return (
            <li key={q.id} className={`upnow-review-row${p?.correct ? ' is-correct' : ' is-wrong'}`}>
              <span className="upnow-review-thumb" aria-hidden>
                {q.photoUrl ? (
                  <Image src={q.photoUrl} alt="" fill sizes="28px" style={{ objectFit: 'cover' }} />
                ) : (
                  <KindIcon size={13} strokeWidth={2} />
                )}
                <span className="upnow-review-verdict">
                  {p?.correct ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                </span>
              </span>
              <span className="upnow-review-name">{t(`objects.${q.id}.name`)}</span>
              <span className="upnow-review-kind">{t(`kind.${subtype}`)}</span>
              <span className="upnow-review-altitude">
                {q.altitudeDeg > 0 ? '+' : ''}{q.altitudeDeg}°
              </span>
            </li>
          );
        })}
      </ol>

      <button type="button" className="upnow-btn upnow-btn--secondary" onClick={onCopy}>
        <Copy size={14} strokeWidth={2} />
        {copyLabel === 'copied' ? t('result.copied') : t('result.copy')}
      </button>

      <div className="upnow-result-links">
        <button type="button" className="upnow-link" onClick={onSky}>
          {t('result.viewSky')}<ChevronRight size={13} strokeWidth={2} />
        </button>
        <button type="button" className="upnow-link" onClick={onMissions}>
          {t('result.startMission')}<ChevronRight size={13} strokeWidth={2} />
        </button>
      </div>
    </section>
  );
}
