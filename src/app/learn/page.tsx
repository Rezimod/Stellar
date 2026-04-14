'use client';

import { useState } from 'react';
import BackButton from '@/components/shared/BackButton';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useAppState } from '@/hooks/useAppState';
import { QUIZZES, type QuizDef } from '@/lib/quizzes';
import QuizActive from '@/components/sky/QuizActive';
import TelescopesTab from '@/components/sky/TelescopesTab';
import TonightsBanner from '@/components/learn/TonightsBanner';
import { PLANETS, DSO, CONSTELLATIONS, ALL_EVENTS, daysFromNow, type Locale } from '@/lib/learn-data';

type Tab = 'planets' | 'deepsky' | 'quizzes' | 'events' | 'telescopes';

// ─── Tab content components ───────────────────────────────────────────────────

function PlanetsTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest">
          {locale === 'ka' ? '9 ობიექტი' : '9 objects'} · {locale === 'ka' ? 'შეეხე დეტალებისთვის' : 'tap to expand'}
        </span>
      </div>
      {PLANETS.map(p => (
        <button
          key={p.key}
          onClick={() => setExpanded(expanded === p.key ? null : p.key)}
          className="glass-card text-left transition-all duration-200 hover:border-white/15 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative"
              style={{ border: `1px solid ${p.color}40` }}>
              <Image
                src={p.img}
                alt={p.name['en']}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">{p.name[locale]}</p>
              <p className="text-slate-500 text-xs">{kidsMode ? p.kidsLine[locale] : p.facts[locale][0]}</p>
            </div>
            <span className="text-slate-600 text-xs ml-2">{expanded === p.key ? '▲' : '▼'}</span>
          </div>
          {expanded === p.key && (
            <div className="mt-4 flex flex-col gap-3" style={{ paddingLeft: '52px' }}>
              <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ height: '160px' }}>
                <Image
                  src={p.img}
                  alt={p.name[locale]}
                  fill
                  className="object-cover"
                  sizes="(max-width: 672px) 100vw, 672px"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 60%)' }} />
                <p className="absolute bottom-2 left-3 text-white text-xs font-semibold opacity-80">{p.name[locale]}</p>
              </div>
              {kidsMode ? (
                <div className="flex flex-col gap-2">
                  <p className="text-slate-300 text-xs leading-relaxed">⭐ {p.kidsLine[locale]}</p>
                  <p className="text-slate-400 text-xs leading-relaxed">{p.kidsFact[locale]}</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {p.facts[locale].map((f, i) => (
                    <li key={i} className="text-slate-300 text-xs flex gap-2">
                      <span style={{ color: p.color }}>•</span> {f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                🔭 {kidsMode ? p.tip[locale].split('.')[0] + '.' : p.tip[locale]}
              </div>
              <Link
                href="/sky"
                onClick={e => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: p.color }}
              >
                🔭 {locale === 'ka' ? `იხილე ${p.name[locale]} ღამის პროგნოზში →` : `See ${p.name[locale]} in tonight's forecast →`}
              </Link>
              {'missionId' in p && p.missionId && (
                <Link
                  href="/missions"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ color: '#FFD166' }}
                >
                  ✦ {locale === 'ka' ? `${p.name[locale]} მისიის დაწყება →` : `Start ${p.name[locale]} Mission →`}
                </Link>
              )}
            </div>
          )}
        </button>
      ))}
      <div className="mt-2 pt-4 border-t border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">
          {locale === 'ka' ? 'თანავარსკვლავედები' : 'Constellations'}
        </p>
        <div className="flex flex-col gap-3">
          {CONSTELLATIONS.map(c => (
            <div key={c.id} className="glass-card overflow-hidden">
              <div className="relative w-full" style={{ height: '120px' }}>
                <Image src={c.img} alt={c.name['en']} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(7,11,20,0.85) 40%, transparent 100%)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-4 gap-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-base">{c.name[locale]}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30` }}>
                      {c.season[locale]}
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-[240px]">{c.desc[locale]}</p>
                  <p className="text-xs mt-0.5" style={{ color: c.color }}>{c.highlight[locale]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DeepSkyTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-600 text-[10px] uppercase tracking-widest">
          {locale === 'ka' ? '10 ობიექტი' : '10 objects'} · {locale === 'ka' ? 'ბინოკლიდან პროფ. ტელესკოპამდე' : 'binoculars to large telescope'}
        </span>
      </div>
      {DSO.map(obj => (
        <button
          key={obj.id}
          onClick={() => setExpanded(expanded === obj.id ? null : obj.id)}
          className="glass-card text-left transition-all duration-200 hover:border-white/15 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative"
              style={{ border: `1px solid ${obj.color}40` }}>
              <Image
                src={obj.img}
                alt={obj.name['en']}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug">{obj.name[locale]}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${obj.color}20`, color: obj.color }}>{obj.type[locale]}</span>
                <span className="text-slate-600 text-xs">{obj.distance[locale]}</span>
              </div>
            </div>
            <span className="text-slate-600 text-xs ml-2">{expanded === obj.id ? '▲' : '▼'}</span>
          </div>
          {expanded === obj.id && (
            <div className="mt-4 flex flex-col gap-2" style={{ paddingLeft: '52px' }}>
              <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ height: '160px' }}>
                <Image
                  src={obj.img}
                  alt={obj.name[locale]}
                  fill
                  className="object-cover"
                  sizes="(max-width: 672px) 100vw, 672px"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 60%)' }} />
                <p className="absolute bottom-2 left-3 text-white text-xs font-semibold opacity-80">{obj.name[locale]}</p>
              </div>
              {kidsMode ? (
                <>
                  <p className="text-slate-300 text-xs leading-relaxed">⭐ {obj.kidsLine[locale]}</p>
                  <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                    style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                    🔭 {locale === 'ka' ? 'საჭირო ინსტრუმენტი: ' : 'Scope needed: '}{obj.scope[locale].split('.')[0]}.
                  </div>
                </>
              ) : (
                <>
                  <p className="text-slate-300 text-xs leading-relaxed">{obj.desc[locale]}</p>
                  <div className="rounded-lg p-3 text-xs text-[#38F0FF]/80"
                    style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                    🔭 {obj.scope[locale]}
                  </div>
                </>
              )}
              {'missionId' in obj && obj.missionId && (
                <Link
                  href="/missions"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 mt-1"
                  style={{ color: '#FFD166' }}
                >
                  ✦ {locale === 'ka' ? `${obj.name[locale]} მისიის დაწყება →` : `Start ${obj.name[locale]} Mission →`}
                </Link>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function QuizzesTab({ locale, onStart }: { locale: Locale; onStart: (q: QuizDef) => void }) {
  const { state } = useAppState();
  const quizzes = state.completedQuizzes ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-slate-500 text-xs leading-relaxed">
        {locale === 'ka'
          ? 'შეამოწმე შენი ასტრონომიული ცოდნა. 10 კითხვა, სწორ პასუხზე 10 ✦.'
          : 'Test your astronomy knowledge. 10 questions, 10 ✦ per correct answer.'}
      </p>
      {QUIZZES.map(quiz => {
        const results = quizzes.filter(r => r.quizId === quiz.id);
        const best = results.length > 0 ? Math.max(...results.map(r => r.score)) : null;
        const bestStars = best !== null ? best * quiz.starsPerCorrect : null;

        return (
          <div key={quiz.id} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.15)' }}>
                {quiz.emoji}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{quiz.title[locale]}</p>
                <p className="text-slate-500 text-xs">{quiz.description[locale]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {best !== null && (
                <span className="text-[#FFD166] text-xs font-medium">
                  {locale === 'ka' ? 'საუკეთესო' : 'Best'}: {best}/{quiz.questions.length} · +{bestStars} ✦
                </span>
              )}
              <button
                onClick={() => onStart(quiz)}
                className="ml-auto px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, #FFD166, #CC9A33)', color: '#070B14' }}
              >
                {best !== null ? (locale === 'ka' ? 'კვლავ თამაში' : 'Play Again') : (locale === 'ka' ? 'დაწყება →' : 'Start →')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EventsTab({ locale }: { locale: Locale }) {
  const now = Date.now();
  const upcoming = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00').getTime() >= now);
  const past = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00').getTime() < now);
  const [showPast, setShowPast] = useState(false);
  const nextEvent = upcoming[0];

  const dayLabel = (d: number) =>
    d === 0 ? (locale === 'ka' ? 'დღეს' : 'Today')
    : d === 1 ? (locale === 'ka' ? 'ხვალ' : 'Tomorrow')
    : `${d}d`;

  return (
    <div className="flex flex-col gap-3">
      {nextEvent && (
        <div className="glass-card p-4" style={{ boxShadow: '0 0 20px rgba(255,209,102,0.04)', borderColor: 'rgba(255,209,102,0.2)' }}>
          <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255,209,102,0.6)' }}>
            {locale === 'ka' ? 'მომდევნო მოვლენა' : 'Next Up'}
          </p>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{nextEvent.emoji}</span>
              <div>
                <p className="text-white font-semibold text-sm">{nextEvent.name[locale]}</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{nextEvent.desc[locale]}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-[#FFD166] text-2xl font-bold leading-none">{daysFromNow(nextEvent.date)}</p>
              <p className="text-slate-600 text-[10px] mt-0.5">{locale === 'ka' ? 'დღეში' : 'days'}</p>
            </div>
          </div>
        </div>
      )}

      {upcoming.length > 1 && (
        <div className="glass-card overflow-hidden">
          <div className="px-4">
            {upcoming.slice(1).map(ev => (
              <div key={ev.date} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: 'rgba(56,240,255,0.06)', border: '1px solid rgba(56,240,255,0.1)' }}>
                  {ev.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{ev.name[locale]}</p>
                  <p className="text-slate-500 text-xs truncate">{ev.date} · {ev.desc[locale].split('.')[0]}.</p>
                </div>
                <span className="text-[#38F0FF] text-xs font-mono flex-shrink-0">
                  {dayLabel(daysFromNow(ev.date))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <button
          onClick={() => setShowPast(s => !s)}
          className="text-xs text-slate-600 flex items-center gap-1.5 hover:text-slate-400 transition-colors self-start"
        >
          <span>{showPast ? '▲' : '▼'}</span>
          {past.length} {locale === 'ka' ? 'გასული მოვლენა' : `past event${past.length !== 1 ? 's' : ''}`}
        </button>
      )}
      {showPast && (
        <div className="flex flex-col gap-2">
          {past.map(ev => (
            <div key={ev.date} className="flex items-center gap-3 opacity-40">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 grayscale"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {ev.emoji}
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">{ev.name[locale]}</p>
                <p className="text-slate-600 text-[10px] font-mono">{ev.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ASTRA promo ─────────────────────────────────────────────────────────────

function AstraPromo({ locale }: { locale: Locale }) {
  return (
    <Link
      href="/chat"
      className="flex items-center gap-4 px-5 py-5 rounded-2xl transition-all active:scale-[0.98] hover:border-[#38F0FF]/30"
      style={{ background: 'linear-gradient(135deg, rgba(56,240,255,0.08), rgba(26,143,160,0.04))', border: '1px solid rgba(56,240,255,0.18)' }}
    >
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(56,240,255,0.12)', border: '1px solid rgba(56,240,255,0.25)' }}>
          <span className="text-[#38F0FF] text-lg">✦</span>
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34d399] border-2 border-[#080e1e]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">ASTRA AI</p>
        <p className="text-slate-400 text-xs mt-0.5">
          {locale === 'ka' ? 'შენი AI ასტრონომიული ასისტენტი · ჩათი →' : 'Your AI astronomy assistant · Chat →'}
        </p>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const TAB_CONFIG: { id: Tab; icon: string; en: string; ka: string }[] = [
  { id: 'planets',    icon: '🪐', en: 'Planets',  ka: 'პლანეტები' },
  { id: 'deepsky',    icon: '🌌', en: 'Deep Sky', ka: 'ღრმა ცა' },
  { id: 'telescopes', icon: '🔭', en: 'Scopes',   ka: 'ტელესკოპები' },
  { id: 'quizzes',    icon: '🧠', en: 'Quizzes',  ka: 'ქვიზები' },
  { id: 'events',     icon: '📅', en: 'Events',   ka: 'მოვლენები' },
];

export default function LearnPage() {
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === 'ka' ? 'ka' : 'en';
  const [tab, setTab] = useState<Tab>('planets');
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [kidsMode, setKidsMode] = useState(false);
  const { state } = useAppState();
  const completedQuizzes = state.completedQuizzes ?? [];

  return (
    <>
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}

      <div className="max-w-2xl mx-auto px-4 py-6 animate-page-enter flex flex-col gap-5">
        <BackButton />
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? 'სწავლა' : 'Learn'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {locale === 'ka' ? 'ასტრონომია, ქვიზები, ASTRA AI.' : 'Astronomy guides, quizzes, and AI assistant.'}
            </p>
          </div>
          {(
            <button
              onClick={() => setKidsMode(k => !k)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0"
              style={kidsMode ? {
                background: 'rgba(255,209,102,0.15)',
                border: '1px solid rgba(255,209,102,0.4)',
                color: '#FFD166',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b',
              }}
            >
              <span>{kidsMode ? '⭐' : '🌙'}</span>
              <span className="hidden sm:inline">{kidsMode
                ? (locale === 'ka' ? 'ბავშვების რეჟიმი' : 'Kids Mode ON')
                : (locale === 'ka' ? 'ბავშვების რეჟიმი' : 'Kids Mode')}</span>
            </button>
          )}
        </div>

        {completedQuizzes.length > 0 && (
          <div className="flex items-center gap-3 text-xs -mt-3">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span style={{ color: '#34d399' }}>✓</span>
              {completedQuizzes.length} {locale === 'ka' ? 'ქვიზი დასრულებული' : 'quizzes completed'}
            </span>
            <span className="text-white/10">·</span>
            <span style={{ color: '#FFD166' }}>
              ✦ {completedQuizzes.reduce((sum, r) => sum + r.stars, 0)} earned
            </span>
          </div>
        )}

        {/* Tonight's Banner */}
        <TonightsBanner locale={locale} />

        {/* Tab bar — scroll-x ensures touch scrolling works even under overflow-x:clip body */}
        <div className="scroll-x scrollbar-hide flex gap-1.5 pb-1">
          {TAB_CONFIG.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-all duration-200 min-h-[36px]"
              style={tab === t.id ? {
                background: 'rgba(255,209,102,0.12)',
                border: '1px solid rgba(255,209,102,0.3)',
                color: '#FFD166',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b',
              }}
            >
              <span>{t.icon}</span>
              <span>{t[locale]}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'planets'    ? <PlanetsTab key="planets" locale={locale} kidsMode={kidsMode} /> : null}
        {tab === 'deepsky'    ? <DeepSkyTab key="deepsky" locale={locale} kidsMode={kidsMode} /> : null}
        {tab === 'quizzes'    ? <QuizzesTab key="quizzes" locale={locale} onStart={setActiveQuiz} /> : null}
        {tab === 'events'     ? <EventsTab key="events" locale={locale} /> : null}
        {tab === 'telescopes' ? <TelescopesTab key="telescopes" /> : null}

        <AstraPromo locale={locale} />
      </div>
    </>
  );
}
