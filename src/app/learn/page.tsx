'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
import {
  Globe, Sparkles, Brain, Camera, BookOpen, Telescope, Map, Search,
  X, Star, Moon, Eye, ChevronDown, ChevronUp, Binoculars, Sun, Rocket,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const QUIZ_HUB: Record<string, { Icon: LucideIcon; gradient: string }> = {
  'solar-system':      { Icon: Sun,       gradient: 'linear-gradient(135deg, #FFB347 0%, #FFB347 100%)' },
  'constellations':    { Icon: Star,      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)' },
  'telescopes':        { Icon: Telescope, gradient: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)' },
  'universe':          { Icon: Globe,     gradient: 'linear-gradient(135deg, #5EEAD4 0%, #5EEAD4 100%)' },
  'space-exploration': { Icon: Rocket,    gradient: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)' },
};

type Tab = 'planets' | 'deepsky' | 'quizzes' | 'guide' | 'telescopes' | 'astrophoto';
type Planet = typeof PLANETS[number];

// ─── Planet Modal ──────────────────────────────────────────────────────────────

function PlanetModal({ planet, locale, kidsMode, onClose }: {
  planet: Planet;
  locale: Locale;
  kidsMode: boolean;
  onClose: () => void;
}) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Portal to document.body escapes any parent transform that breaks position:fixed
  return createPortal(
    <>
      {/* Full-screen backdrop — z-[60] to sit above BottomNav (z-50) and Nav (z-40) */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(3,6,14,0.88)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Compact modal card — centered, no scroll */}
      <div
        className="fixed left-1/2 top-1/2 z-[61] rounded-2xl"
        style={{
          width: 'calc(100% - 48px)',
          maxWidth: '440px',
          transform: 'translate(-50%, -50%)',
          background: 'var(--canvas)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
        }}
      >
        {/* Header: image + name side by side */}
        <div className="flex items-stretch" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Planet image — fixed square */}
          <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
            <Image
              src={planet.img}
              alt={planet.name[locale]}
              fill
              className="object-cover"
              sizes="110px"
              priority
            />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, transparent 60%, var(--canvas) 100%)' }} />
            <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: planet.color, opacity: 0.5 }} />
          </div>

          {/* Name + badge */}
          <div className="flex-1 px-4 py-3 flex flex-col justify-center">
            {('missionId' in planet && (planet.key === 'moon' || planet.key === 'jupiter')) && (
              <span
                className="inline-flex items-center gap-1 mb-1.5 px-1.5 py-0.5 rounded self-start text-[8px] uppercase tracking-widest font-bold"
                style={{ background: 'rgba(255, 179, 71,0.15)', border: '1px solid rgba(255, 179, 71,0.3)', color: 'var(--stars)' }}
              >
                <Star size={7} /> {locale === 'ka' ? 'საუკეთესო' : 'Best target'}
              </span>
            )}
            <p className="text-text-primary font-bold text-lg leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
              {planet.name[locale]}
            </p>
            <p className="text-xs mt-0.5" style={{ color: planet.color }}>
              {planet.facts[locale][0].split('—')[0].trim()}
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="self-start mt-3 mr-3 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            aria-label="Close"
          >
            <X size={13} color="rgba(255,255,255,0.7)" />
          </button>
        </div>

        {/* Facts */}
        <div className="px-4 py-3 flex flex-col gap-1.5">
          {kidsMode ? (
            <p className="text-text-primary text-xs leading-relaxed">{planet.kidsLine[locale]}</p>
          ) : (
            planet.facts[locale].slice(0, 3).map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-text-primary">
                <span style={{ color: planet.color, flexShrink: 0, fontSize: 7, marginTop: 3 }}>●</span>
                {f}
              </div>
            ))
          )}
        </div>

        {/* Tip */}
        <div className="mx-4 mb-3 rounded-xl px-3 py-2 flex items-start gap-2 text-xs"
          style={{ background: 'rgba(255, 179, 71,0.05)', border: '1px solid rgba(255, 179, 71,0.1)', color: 'rgba(255, 179, 71,0.75)' }}>
          <Telescope size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{planet.tip[locale].split('.')[0]}.</span>
        </div>

        {/* Links */}
        <div className="px-4 pb-4 flex items-center gap-4 flex-wrap">
          <Link href="/sky" onClick={onClose}
            className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80"
            style={{ color: planet.color }}>
            <Telescope size={11} />
            {locale === 'ka' ? 'პროგნოზი →' : 'Forecast →'}
          </Link>
          {'missionId' in planet && planet.missionId && (
            <Link href="/missions" onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80"
              style={{ color: 'var(--stars)' }}>
              <Sparkles size={11} />
              {locale === 'ka' ? 'მისია →' : 'Mission →'}
            </Link>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Planets Tab ──────────────────────────────────────────────────────────────

function PlanetsTab({ locale, kidsMode, onSelect }: { locale: Locale; kidsMode: boolean; onSelect: (p: Planet) => void }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted text-[10px] uppercase tracking-widest">
        {locale === 'ka' ? '9 ობიექტი · შეეხე დეტალებისთვის' : '9 objects · tap to explore'}
      </p>

      {/* Planet grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
        {PLANETS.map(p => (
          <button
            key={p.key}
            onClick={() => onSelect(p)}
            className="flex flex-col items-center gap-1 group text-left"
          >
            <div className="relative w-full rounded-lg overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
              <Image
                src={p.img}
                alt={p.name[locale]}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 640px) 22vw, (max-width: 768px) 14vw, 110px"
              />
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ boxShadow: `inset 0 0 0 1.5px ${p.color}70` }} />
              {(p.key === 'moon' || p.key === 'jupiter') && (
                <div
                  className="absolute top-0.5 left-0.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[6px] uppercase tracking-wide font-bold"
                  style={{ background: 'rgba(255, 179, 71,0.25)', border: '1px solid rgba(255, 179, 71,0.4)', color: 'var(--stars)', backdropFilter: 'blur(4px)' }}
                >
                  <Star size={5} />
                  #1
                </div>
              )}
            </div>
            <p className="text-text-primary text-[10px] font-medium leading-tight text-center w-full truncate px-0.5"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {p.name[locale]}
            </p>
          </button>
        ))}
      </div>

      {/* Constellations */}
      <div className="mt-1 pt-3 border-t border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-2">
          {locale === 'ka' ? 'თანავარსკვლავედები' : 'Constellations'}
        </p>
        <div className="flex flex-col gap-2">
          {CONSTELLATIONS.map(c => (
            <div key={c.id} className="glass-card overflow-hidden">
              <div className="relative w-full" style={{ height: '88px' }}>
                <Image src={c.img} alt={c.name['en']} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(7,11,20,0.88) 45%, transparent 100%)' }} />
                <div className="absolute inset-0 flex flex-col justify-center px-4 gap-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-text-primary font-bold text-sm">{c.name[locale]}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}30` }}>
                      {c.season[locale]}
                    </span>
                  </div>
                  <p className="text-text-muted text-[11px] leading-snug max-w-[220px] line-clamp-1">{c.desc[locale]}</p>
                  <p className="text-[10px]" style={{ color: c.color }}>{c.highlight[locale]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Deep Sky Tab ─────────────────────────────────────────────────────────────

const EQ_BADGES: Record<string, { label: { en: string; ka: string }; Icon: React.FC<{ size?: number; color?: string }>; color: string }> = {
  naked_eye:   { label: { en: 'Naked Eye',    ka: 'შიშველი თვალი' }, Icon: Eye,        color: 'var(--success)' },
  binoculars:  { label: { en: 'Binoculars',   ka: 'ბინოკლი' },       Icon: Binoculars, color: 'var(--stars)' },
  small_scope: { label: { en: '100mm+ Scope', ka: '100მმ+ ტელ.' },   Icon: Telescope,  color: 'var(--terracotta)' },
  large_scope: { label: { en: '150mm+ Scope', ka: '150მმ+ ტელ.' },   Icon: Telescope,  color: 'var(--terracotta)' },
};

const DSO_SEASONS: Record<string, { en: string; ka: string }> = {
  m42:    { en: 'Winter',  ka: 'ზამთარი' },
  m31:    { en: 'Autumn',  ka: 'შემოდგომა' },
  m45:    { en: 'Winter',  ka: 'ზამთარი' },
  m8:     { en: 'Summer',  ka: 'ზაფხული' },
  m13:    { en: 'Summer',  ka: 'ზაფხული' },
  m17:    { en: 'Summer',  ka: 'ზაფხული' },
  ngc869: { en: 'Autumn',  ka: 'შემოდგომა' },
  m57:    { en: 'Summer',  ka: 'ზაფხული' },
  m51:    { en: 'Spring',  ka: 'გაზაფხული' },
  m1:     { en: 'Winter',  ka: 'ზამთარი' },
};

type EqFilter = 'all' | 'naked_eye' | 'binoculars' | 'small_scope' | 'large_scope';

function DeepSkyTab({ locale, kidsMode }: { locale: Locale; kidsMode: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [eqFilter, setEqFilter] = useState<EqFilter>('all');

  const filtered = eqFilter === 'all' ? DSO : DSO.filter(d => d.equipment === eqFilter);

  const filterOptions: { id: EqFilter; label: string; Icon: React.FC<{ size?: number; color?: string }> | null }[] = [
    { id: 'all',         label: locale === 'ka' ? 'ყველა' : 'All',   Icon: null },
    { id: 'naked_eye',   label: EQ_BADGES.naked_eye.label[locale],    Icon: Eye },
    { id: 'binoculars',  label: EQ_BADGES.binoculars.label[locale],   Icon: Binoculars },
    { id: 'small_scope', label: EQ_BADGES.small_scope.label[locale],  Icon: Telescope },
    { id: 'large_scope', label: EQ_BADGES.large_scope.label[locale],  Icon: Telescope },
  ];

  const countFor = (id: EqFilter) =>
    id === 'all' ? DSO.length : DSO.filter(d => d.equipment === id).length;

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="scroll-x scrollbar-hide flex gap-1.5 pb-1">
        {filterOptions.map(opt => {
          const active = eqFilter === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setEqFilter(opt.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium flex-shrink-0 transition-all duration-200"
              style={active ? {
                background: 'rgba(255, 179, 71,0.12)',
                border: '1px solid rgba(255, 179, 71,0.3)',
                color: 'var(--stars)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text-muted)',
              }}
            >
              {opt.Icon ? <opt.Icon size={11} /> : <Sparkles size={10} />}
              <span>{opt.label}</span>
              <span className="opacity-50">({countFor(opt.id)})</span>
            </button>
          );
        })}
      </div>

      {filtered.map(obj => {
        const eqBadge = EQ_BADGES[obj.equipment];
        const season = DSO_SEASONS[obj.id];
        const isExp = expanded === obj.id;
        return (
          <button
            key={obj.id}
            onClick={() => setExpanded(isExp ? null : obj.id)}
            className="glass-card text-left transition-all duration-200 hover:border-[var(--border)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 relative"
                style={{ border: `1px solid ${obj.color}40` }}>
                <Image src={obj.img} alt={obj.name['en']} fill className="object-cover" sizes="40px" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm leading-snug">{obj.name[locale]}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${obj.color}20`, color: obj.color }}>{obj.type[locale]}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded inline-flex items-center gap-1" style={{ background: `${eqBadge.color}18`, color: eqBadge.color, border: `1px solid ${eqBadge.color}25` }}>
                    <eqBadge.Icon size={10} /> {eqBadge.label[locale]}
                  </span>
                </div>
              </div>
              {isExp ? <ChevronUp size={14} className="text-text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-text-muted flex-shrink-0" />}
            </div>
            {isExp && (
              <div className="mt-4 flex flex-col gap-2" style={{ paddingLeft: '52px' }}>
                <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ height: '160px' }}>
                  <Image src={obj.img} alt={obj.name[locale]} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 60%)' }} />
                  <p className="absolute bottom-2 left-3 text-text-primary text-xs font-semibold opacity-80">{obj.name[locale]}</p>
                </div>
                {kidsMode ? (
                  <>
                    <p className="text-text-primary text-xs leading-relaxed flex items-start gap-1.5">
                      <Star size={11} style={{ color: 'var(--stars)', flexShrink: 0, marginTop: 1 }} />
                      {obj.kidsLine[locale]}
                    </p>
                    <div className="rounded-lg p-3 text-xs text-[var(--terracotta)]/80 flex items-start gap-2"
                      style={{ background: 'rgba(255, 179, 71,0.05)', border: '1px solid rgba(255, 179, 71,0.1)' }}>
                      <Telescope size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      {locale === 'ka' ? 'საჭირო ინსტრუმენტი: ' : 'Scope needed: '}{obj.scope[locale].split('.')[0]}.
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-text-primary text-xs leading-relaxed">{obj.desc[locale]}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-0.5 rounded inline-flex items-center gap-1" style={{ background: `${eqBadge.color}18`, color: eqBadge.color, border: `1px solid ${eqBadge.color}25` }}>
                        <eqBadge.Icon size={9} /> {eqBadge.label[locale]}
                      </span>
                      <span className="text-[10px] text-text-muted">{obj.distance[locale]}</span>
                      {season && (
                        <span className="text-[10px] text-text-muted">
                          {locale === 'ka' ? 'სეზონი: ' : 'Best in: '}{season[locale]}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg p-3 text-xs text-[var(--terracotta)]/80 flex items-start gap-2"
                      style={{ background: 'rgba(255, 179, 71,0.05)', border: '1px solid rgba(255, 179, 71,0.1)' }}>
                      <Telescope size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      {obj.scope[locale]}
                    </div>
                  </>
                )}
                {'missionId' in obj && obj.missionId && (
                  <Link
                    href="/missions"
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80 mt-1"
                    style={{ color: 'var(--stars)' }}
                  >
                    <Sparkles size={12} />
                    {locale === 'ka' ? `${obj.name[locale]} მისიის დაწყება →` : `Start ${obj.name[locale]} Mission →`}
                  </Link>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Quizzes Tab ──────────────────────────────────────────────────────────────

function QuizzesTab({ locale, onStart }: { locale: Locale; onStart: (q: QuizDef) => void }) {
  const { state } = useAppState();
  const quizzes = state.completedQuizzes ?? [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted text-xs leading-relaxed">
        {locale === 'ka'
          ? 'შეამოწმე შენი ასტრონომიული ცოდნა. 10 კითხვა, სწორ პასუხზე 10 ✦.'
          : 'Test your astronomy knowledge. 10 questions, 10 ✦ per correct answer.'}
      </p>
      {QUIZZES.map(quiz => {
        const results = quizzes.filter(r => r.quizId === quiz.id);
        const best = results.length > 0 ? Math.max(...results.map(r => r.score)) : null;
        const bestStars = best !== null ? best * quiz.starsPerCorrect : null;
        const hub = QUIZ_HUB[quiz.id];
        const HubIcon = hub?.Icon ?? Sparkles;

        return (
          <div key={quiz.id} className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: hub?.gradient ?? 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
                  boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                }}
              >
                <HubIcon size={20} strokeWidth={2.2} color="#FFFFFF" />
              </div>
              <div className="flex-1">
                <p className="text-text-primary font-semibold text-sm">{quiz.title[locale]}</p>
                <p className="text-text-muted text-xs">{quiz.description[locale]}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {best !== null && (
                <span className="text-[var(--terracotta)] text-xs font-medium">
                  {locale === 'ka' ? 'საუკეთესო' : 'Best'}: {best}/{quiz.questions.length} · +{bestStars} ✦
                </span>
              )}
              <button
                onClick={() => onStart(quiz)}
                className="ml-auto px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: 'var(--canvas)' }}
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

// ─── Guide Tab ────────────────────────────────────────────────────────────────

const GLOSSARY_TERMS = [
  { term: 'Aperture', termKa: 'აპერტურა', def: 'The diameter of the telescope\'s main lens or mirror. Bigger aperture = more light gathered = fainter objects visible. The single most important telescope spec.', defKa: 'ტელესკოპის მთავარი ლინზის ან სარკის დიამეტრი. მეტი აპერტურა = მეტი სინათლე.' },
  { term: 'Focal length', termKa: 'ფოკუსური მანძილი', def: 'The distance from the lens/mirror to where light focuses. Longer focal length = higher magnification with the same eyepiece. Measured in mm.', defKa: 'მანძილი ლინზიდან/სარკიდან ფოკუსამდე. მმ-ში იზომება.' },
  { term: 'Magnification', termKa: 'გადიდება', def: 'Telescope focal length ÷ eyepiece focal length = magnification. Example: 1000mm scope + 10mm eyepiece = 100×. More isn\'t always better — atmosphere limits useful magnification.', defKa: 'ტელესკოპის ფოკუსი ÷ ოკულარის ფოკუსი. მაგ: 1000მმ + 10მმ = 100×.' },
  { term: 'f-ratio', termKa: 'f-რაციო', def: 'Focal length ÷ aperture. f/5 = "fast" (wide field, good for nebulas). f/10 = "slow" (narrow field, good for planets). Lower f-ratio = brighter image at same magnification.', defKa: 'ფოკუსური მანძილი ÷ აპერტურა. f/5 = სწრაფი, f/10 = ნელი.' },
  { term: 'Bortle scale', termKa: 'ბორტლის სკალა', def: 'A 1–9 rating of sky darkness. 1 = pristine dark sky (Milky Way casts shadows). 5 = suburban. 9 = city center (only Moon and planets visible). Check the Dark Sky Map to find your local Bortle rating.', defKa: '1–9 შეფასება ცის სიბნელისა. 1 = პრისტინული, 9 = ქალაქის ცენტრი.' },
  { term: 'Light-year', termKa: 'სინათლის წელი', def: 'Distance light travels in one year: 9.46 trillion km. Used for interstellar distances. When you see the Andromeda Galaxy (2.5M light-years away), you\'re seeing light that left 2.5 million years ago.', defKa: 'მანძილი, რასაც სინათლე ერთ წელიწადში გადის: 9.46 ტრილიონი კმ.' },
  { term: 'Collimation', termKa: 'კოლიმაცია', def: 'Aligning a reflector telescope\'s mirrors so they focus light correctly. Needs checking every session for Newtonians. Uses a collimation cap or laser collimator.', defKa: 'რეფლექტორის სარკეების გასწორება. ნიუტონისთვის ყოველ სესიაზე საჭიროა.' },
  { term: 'Opposition', termKa: 'ოპოზიცია', def: 'When a planet is directly opposite the Sun from Earth — closest and brightest. Best time to observe outer planets. Jupiter opposition Oct 2026, Saturn Sep 2026.', defKa: 'როცა პლანეტა მზის საპირისპიროდაა — ყველაზე ახლო და კაშკაში.' },
  { term: 'Seeing', termKa: 'ხილვადობა', def: 'How steady the atmosphere is — affects sharpness at high magnification. Good seeing = steady stars. Bad seeing = twinkling, blurry planets. Check the Sky page for tonight\'s conditions.', defKa: 'ატმოსფეროს სტაბილურობა — გავლენას ახდენს სიმკვეთრეზე.' },
  { term: 'Terminator', termKa: 'ტერმინატორი', def: 'The shadow line on the Moon between the lit and dark sides. This is where craters look most dramatic — sunlight hits at an angle creating long shadows. Best area to observe on any night.', defKa: 'მთვარეზე ჩრდილის ხაზი განათებულ და ბნელ მხარეს შორის.' },
  { term: 'Meridian', termKa: 'მერიდიანი', def: 'An imaginary line from north to south passing directly overhead. Objects are highest (best viewing) when they cross the meridian — called "transit".', defKa: 'წარმოსახვითი ხაზი ჩრდილოეთიდან სამხრეთამდე თავის ზემოთ.' },
  { term: 'Alt-Az mount', termKa: 'ალტ-აზ მონტირება', def: 'A mount that moves up-down (altitude) and left-right (azimuth). Simple to use. Most beginner telescopes use this type. Doesn\'t track the sky automatically.', defKa: 'ზემოთ-ქვემოთ და მარცხნივ-მარჯვნივ მოძრავი მონტირება. მარტივია.' },
  { term: 'Equatorial mount', termKa: 'ეკვატორული მონტირება', def: 'A mount aligned with Earth\'s rotation axis. One motor can track objects across the sky. Required for long-exposure astrophotography. More complex to set up than Alt-Az.', defKa: 'დედამიწის ბრუნვის ღერძზე გათანაბრებული. ერთი ძრავით ადევნებს ობიექტებს.' },
];

const BORTLE_SEGMENTS = [
  { range: '1–2', color: 'var(--success)', label: { en: 'Pristine',  ka: 'პრისტინული'  }, desc: { en: 'Milky Way structure, zodiacal light, thousands of stars', ka: 'ირმის ნახტომი, ზოდიაქური სინათლე, ათასობით ვარსკვლავი' } },
  { range: '3–4', color: 'var(--stars)', label: { en: 'Rural',     ka: 'სოფელი'       }, desc: { en: 'Milky Way visible, 100+ stars, good for deep sky',      ka: 'ირმის ნახტომი ჩანს, 100+ ვარსკვლავი, კარგი ღრმა ცისთვის' } },
  { range: '5–6', color: 'var(--terracotta)', label: { en: 'Suburban',  ka: 'გარეუბანი'    }, desc: { en: 'Milky Way faint, planets and bright clusters',           ka: 'ირმის ნახტომი სუსტია, პლანეტები და კაშკაში გროვები' } },
  { range: '7–9', color: 'var(--negative)', label: { en: 'City',      ka: 'ქალაქი'       }, desc: { en: 'Moon and brightest planets only',                        ka: 'მხოლოდ მთვარე და ყველაზე კაშკაში პლანეტები' } },
];

function GuideTab({ locale }: { locale: Locale }) {
  const [glossaryOpen, setGlossaryOpen] = useState(true);
  const [pollutionOpen, setPollutionOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const now = Date.now();
  const upcoming = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00Z').getTime() >= now);
  const past = ALL_EVENTS.filter(e => new Date(e.date + 'T12:00:00Z').getTime() < now);
  const [showPast, setShowPast] = useState(false);
  const nextEvent = upcoming[0];

  const dayLabel = (d: number) =>
    d === 0 ? (locale === 'ka' ? 'დღეს' : 'Today')
    : d === 1 ? (locale === 'ka' ? 'ხვალ' : 'Tomorrow')
    : `${d}d`;

  const filteredTerms = GLOSSARY_TERMS.filter(t =>
    t.term.toLowerCase().includes(search.toLowerCase()) ||
    t.def.toLowerCase().includes(search.toLowerCase()) ||
    t.termKa.toLowerCase().includes(search.toLowerCase()) ||
    t.defKa.toLowerCase().includes(search.toLowerCase())
  );

  const renderDef = (def: string) => {
    const parts = def.split(/(Sky page|Dark Sky Map)/g);
    return parts.map((part, i) =>
      part === 'Sky page' ? (
        <Link key={i} href="/sky" onClick={e => e.stopPropagation()} className="text-[var(--seafoam)] hover:opacity-80">{part}</Link>
      ) : part === 'Dark Sky Map' ? (
        <Link key={i} href="/network" onClick={e => e.stopPropagation()} className="text-[var(--seafoam)] hover:opacity-80">{part}</Link>
      ) : part
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Glossary */}
      <div className="glass-card overflow-hidden">
        <button onClick={() => setGlossaryOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <p className="text-text-primary font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? 'ასტრონომიის გლოსარი' : 'Astronomy Glossary'}
            </p>
            <p className="text-text-muted text-[10px] mt-0.5">
              {locale === 'ka' ? `${GLOSSARY_TERMS.length} ტერმინი` : `${GLOSSARY_TERMS.length} terms`}
            </p>
          </div>
          {glossaryOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>
        {glossaryOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            <div className="relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={locale === 'ka' ? 'ტერმინის ძიება...' : 'Search terms...'}
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs text-text-primary placeholder-slate-600 outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {filteredTerms.length === 0 ? (
                <p className="text-text-muted text-xs py-2">{locale === 'ka' ? 'ვერ მოიძებნა' : 'No results'}</p>
              ) : filteredTerms.map(t => (
                <div key={t.term} className="py-2 border-b border-white/[0.04] last:border-0">
                  <p className="text-text-primary font-semibold text-sm">{locale === 'ka' ? t.termKa : t.term}</p>
                  <p className="text-text-muted text-xs leading-relaxed mt-0.5">
                    {renderDef(locale === 'ka' ? t.defKa : t.def)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Light Pollution */}
      <div className="glass-card overflow-hidden">
        <button onClick={() => setPollutionOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <p className="text-text-primary font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? 'სინათლის დაბინძურება' : 'Understanding Light Pollution'}
            </p>
            <p className="text-text-muted text-[10px] mt-0.5">
              {locale === 'ka' ? 'ბორტლის სკალა' : 'Bortle scale explained'}
            </p>
          </div>
          {pollutionOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>
        {pollutionOpen && (
          <div className="px-4 pb-4 flex flex-col gap-4">
            <p className="text-text-muted text-xs leading-relaxed">
              {locale === 'ka'
                ? 'სინათლის დაბინძურება — ხელოვნური განათება, რომელიც ღამის ცაში ვრცელდება. ის ბნავს სუსტ ვარსკვლავებს, ნისლეულებს და ირმის ნახტომს. ბორტლის სკალა 1-დან 9-მდე ცის სიბნელეს ზომავს.'
                : 'Light pollution is artificial light scattered into the night sky. It washes out faint stars, nebulas, and the Milky Way. The Bortle scale measures sky darkness from 1 (pristine) to 9 (inner city).'}
            </p>
            <div className="flex flex-col gap-3">
              {BORTLE_SEGMENTS.map(seg => (
                <div key={seg.range} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 mt-0.5 w-14 h-5 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${seg.color}20`, color: seg.color, border: `1px solid ${seg.color}30` }}>
                    {seg.range}
                  </div>
                  <div>
                    <p className="text-text-primary text-xs font-medium">{seg.label[locale]}</p>
                    <p className="text-text-muted text-[10px] leading-relaxed">{seg.desc[locale]}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/network"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(94, 234, 212,0.06)', border: '1px solid rgba(94, 234, 212,0.2)', color: 'var(--seafoam)' }}
            >
              <Map size={13} />
              {locale === 'ka' ? 'იპოვე ბნელი ცა შენ მახლობლად →' : 'Find dark skies near you →'}
            </Link>
          </div>
        )}
      </div>

      {/* Events */}
      <div className="glass-card overflow-hidden">
        <button onClick={() => setEventsOpen(o => !o)} className="w-full flex items-center justify-between p-4 text-left">
          <div>
            <p className="text-text-primary font-semibold text-sm" style={{ fontFamily: 'Georgia, serif' }}>
              {locale === 'ka' ? '2026 — ასტრონომიული მოვლენები' : '2026 Astronomical Events'}
            </p>
            <p className="text-text-muted text-[10px] mt-0.5">
              {upcoming.length} {locale === 'ka' ? 'მომდევნო' : 'upcoming'}
            </p>
          </div>
          {eventsOpen ? <ChevronUp size={14} className="text-text-muted" /> : <ChevronDown size={14} className="text-text-muted" />}
        </button>
        {eventsOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3">
            {nextEvent && (
              <div className="rounded-xl p-4" style={{ boxShadow: '0 0 20px rgba(255, 179, 71,0.04)', border: '1px solid rgba(255, 179, 71,0.2)', background: 'rgba(255, 179, 71,0.03)' }}>
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'rgba(255, 179, 71,0.6)' }}>
                  {locale === 'ka' ? 'მომდევნო მოვლენა' : 'Next Up'}
                </p>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{nextEvent.emoji}</span>
                    <div>
                      <p className="text-text-primary font-semibold text-sm">{nextEvent.name[locale]}</p>
                      <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{nextEvent.desc[locale]}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[var(--terracotta)] text-2xl font-bold leading-none">{daysFromNow(nextEvent.date)}</p>
                    <p className="text-text-muted text-[10px] mt-0.5">{locale === 'ka' ? 'დღეში' : 'days'}</p>
                  </div>
                </div>
              </div>
            )}
            {upcoming.length > 1 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="px-4">
                  {upcoming.slice(1).map(ev => (
                    <div key={ev.date} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: 'rgba(255, 179, 71,0.06)', border: '1px solid rgba(255, 179, 71,0.1)' }}>
                        {ev.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{ev.name[locale]}</p>
                        <p className="text-text-muted text-xs truncate">{ev.date} · {ev.desc[locale].split('.')[0]}.</p>
                      </div>
                      <span className="text-[var(--terracotta)] text-xs font-mono flex-shrink-0">
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
                className="text-xs text-text-muted flex items-center gap-1.5 hover:text-text-muted transition-colors self-start"
              >
                {showPast ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
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
                      <p className="text-text-muted text-sm font-medium">{ev.name[locale]}</p>
                      <p className="text-text-muted text-[10px] font-mono">{ev.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Astrophotography Tab ─────────────────────────────────────────────────────

const ASTRO_PHOTO_CARDS: {
  step: number;
  title: { en: string; ka: string };
  body: { en: string; ka: string };
  tip: { en: string; ka: string };
  link?: { en: string; ka: string; href: string };
}[] = [
  {
    step: 1,
    title: { en: 'What is afocal photography?', ka: 'რა არის ოკულარული ფოტოგრაფია?' },
    body: {
      en: 'Hold your phone camera directly against the telescope eyepiece. The eyepiece projects the magnified image — your phone camera captures it. This is how most Stellar observation photos are taken. No adapters needed to start, though a phone holder makes it much easier.',
      ka: 'ტელეფონი პირდაპირ ოკულართან მიეჭირე. ოკულარი გადიდებულ სურათს პროეცირებს — ტელეფონი კი იჭერს. ეს არის ყველაზე გავრცელებული მეთოდი Stellar-ის დაკვირვებების ფოტოებისთვის.',
    },
    tip: {
      en: 'Use your lowest-power eyepiece (25mm) first. Higher magnification = harder to align.',
      ka: 'პირველად ყველაზე სუსტი ოკულარი გამოიყენე (25მმ). მეტი გადიდება = გასწორება უფრო რთულია.',
    },
  },
  {
    step: 2,
    title: { en: 'Camera settings for night sky', ka: 'კამერის პარამეტრები ღამის ცისთვის' },
    body: {
      en: 'Open your phone\'s camera. If you have a Pro/Manual mode, use it. Settings: ISO 800–1600 (higher = brighter but grainier). Shutter speed: 1/30s for Moon, 1–4 seconds for deep sky. Focus: tap and hold on the Moon or brightest star to lock focus, then switch to manual focus if available. Turn OFF flash — it does nothing for the sky and ruins your night vision.',
      ka: 'გახსენი Pro/Manual რეჟიმი. ISO: 800–1600. ჩამკეტის სიჩქარე: 1/30 წმ მთვარისთვის, 1–4 წმ ღრმა ცისთვის. ჩახშე ფლეში — ცისთვის უსარგებლოა და ღამის ხედვას გიფუჭებს.',
    },
    tip: {
      en: 'iPhone: use the built-in Night Mode. Android: try Google Camera\'s Night Sight or the dedicated astrophotography mode.',
      ka: 'iPhone: Night Mode. Android: Google Camera-ს Night Sight ან ასტროფოტო რეჟიმი.',
    },
  },
  {
    step: 3,
    title: { en: 'Steady your shot', ka: 'გამოსახულების სტაბილიზაცია' },
    body: {
      en: 'Camera shake is the #1 enemy. Options from free to cheap: lean your phone against the eyepiece and hold your breath (free). Use a 2-second timer delay so pressing the shutter doesn\'t shake it. Buy a phone-to-telescope adapter mount ($15-30) — this is the single best upgrade for phone astrophotography. Rest your elbows on something solid.',
      ka: 'კამერის ბრჟოლა მთავარი მტერია. გამოსავლები: 2-წამიანი ტაიმერი ჩართე. შეიძინე ადაპტერი ($15-30) — ეს ყველაზე ეფექტური გაუმჯობესებაა ტელეფონის ასტროფოტოგრაფიაში.',
    },
    tip: {
      en: 'A cheap phone adapter holder from Astroman costs less than a dinner out and dramatically improves every photo.',
      ka: 'Astroman-ის ადაპტერი სასადილოზე ნაკლები ღირს და ყოველ ფოტოს მნიშვნელოვნად აუმჯობესებს.',
    },
    link: { en: 'Browse phone adapters →', ka: 'ნახე ადაპტერები →', href: '/marketplace' },
  },
  {
    step: 4,
    title: { en: 'Moon photography', ka: 'მთვარის ფოტოგრაფია' },
    body: {
      en: 'The Moon is the easiest and most rewarding target. It\'s bright enough for your phone\'s auto mode to handle. Tips: shoot during First Quarter or Last Quarter (not Full Moon) for dramatic crater shadows. Zoom to 2-3× digital zoom to fill the frame. Take 20+ photos and keep the sharpest 2-3. The terminator line (shadow boundary) is where the best detail lives.',
      ka: 'მთვარე ყველაზე მარტივი და ამაჯილდოებელი სამიზნეა. პირველ ან ბოლო მეოთხედში გადაიღე — კრატერების ჩრდილები დრამატულია. 20+ ფოტო გადაიღე და 2-3 საუკეთესო დაიტოვე.',
    },
    tip: {
      en: 'The terminator line (day/night boundary on the Moon) shows the most dramatic crater detail — always aim there first.',
      ka: 'ტერმინატორი (დღე/ღამის საზღვარი) ყველაზე ეფექტურ კრატერის დეტალებს გვიჩვენებს.',
    },
    link: { en: 'Start Moon Mission →', ka: 'მთვარის მისიის დაწყება →', href: '/missions' },
  },
  {
    step: 5,
    title: { en: 'Planet photography', ka: 'პლანეტების ფოტოგრაფია' },
    body: {
      en: 'Jupiter and Saturn appear as tiny bright dots to the naked eye, but through a telescope eyepiece they show real detail. For planets: set your phone to record VIDEO at the highest resolution, hold it to the eyepiece for 30-60 seconds, then extract the sharpest single frame later. This is what professional planetary imagers do — just with better cameras. Jupiter: look for the cloud bands. Saturn: the rings should be visible as tiny "ears" on either side.',
      ka: 'იუპიტერი და სატურნი შიშველი თვალით მხოლოდ კაშკაში წერტილია, მაგრამ ოკულარის მეშვეობით — ნამდვილი დეტალები ჩანს. VIDEO ჩაწერე 30-60 წმ-ის განმავლობაში, შემდეგ ამოიღე ყველაზე მკაფიო კადრი.',
    },
    tip: {
      en: 'Video + frame extraction beats single shots for planets — you get dozens of chances to catch a moment of steady atmosphere.',
      ka: 'ვიდეო + კადრის ამოღება ერთ ფოტოზე უკეთესია — ათობით შანსი გაქვს ატმოსფეროს სტაბილური მომენტი დაიჭირო.',
    },
    link: { en: 'Start Jupiter Mission →', ka: 'იუპიტერის მისიის დაწყება →', href: '/missions' },
  },
  {
    step: 6,
    title: { en: 'Getting verified on Stellar', ka: 'Stellar-ზე ვერიფიკაცია' },
    body: {
      en: 'When you submit a photo through a Stellar mission, AI verifies it\'s a real night sky photo (not a screenshot or AI-generated image). Tips for higher confidence scores: shoot in real-time through the camera (don\'t upload old photos). Make sure your GPS is enabled for location verification. A slightly blurry real photo always scores higher than a perfect fake — we check for natural camera noise and atmospheric effects.',
      ka: 'Stellar-ის მისიაში ფოტოს წარდგენისას AI ამოწმებს — ნამდვილი ღამის ცის ფოტოა თუ ყალბი. რეალური დროის კამერით გადაიღე. GPS ჩართე. ოდნავ ბუნდოვანი ნამდვილი ფოტო ყოველთვის ჯობია ყალბ სრულყოფილ სურათს.',
    },
    tip: {
      en: 'The double-capture feature (two photos 3 seconds apart) gives you an automatic confidence boost — the AI compares both frames to confirm you\'re live.',
      ka: 'ორმაგი გადაღება (2 ფოტო 3 წამის ინტერვალით) ავტომატურად ზრდის კონფიდენს ქულას.',
    },
  },
];

function AstroPhotoTab({ locale }: { locale: Locale }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-text-muted text-xs leading-relaxed">
        {locale === 'ka'
          ? 'ისწავლე, როგორ გადაიღო ღამის ცის ფოტოები ტელეფონით — ოკულარულ მეთოდიდან Stellar-ის ვერიფიკაციამდე.'
          : 'Learn how to take night sky photos with your phone — from the afocal method to getting verified on Stellar.'}
      </p>
      {ASTRO_PHOTO_CARDS.map(card => {
        const isExp = expanded === card.step;
        return (
          <button
            key={card.step}
            onClick={() => setExpanded(isExp ? null : card.step)}
            className="glass-card text-left transition-all duration-200 hover:border-[var(--border)] p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'rgba(255, 179, 71,0.1)', border: '1px solid rgba(255, 179, 71,0.2)', color: 'var(--stars)' }}
              >
                {card.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm">{card.title[locale]}</p>
              </div>
              {isExp ? <ChevronUp size={14} className="text-text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-text-muted flex-shrink-0" />}
            </div>
            {isExp && (
              <div className="mt-3 flex flex-col gap-2" style={{ paddingLeft: '44px' }}>
                <p className="text-text-muted text-xs leading-relaxed">{card.body[locale]}</p>
                <div
                  className="rounded-lg p-3 text-xs flex items-start gap-2"
                  style={{ background: 'rgba(255, 179, 71,0.04)', border: '1px solid rgba(255, 179, 71,0.1)', color: 'rgba(255, 179, 71,0.8)' }}
                >
                  <Camera size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {card.tip[locale]}
                </div>
                {card.link && (
                  <Link
                    href={card.link.href}
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: 'var(--stars)' }}
                  >
                    {card.link[locale]}
                  </Link>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── ASTRA Promo ──────────────────────────────────────────────────────────────

function AstraPromo({ locale }: { locale: Locale }) {
  return (
    <Link
      href="/chat"
      className="flex items-center gap-4 px-5 py-5 rounded-2xl transition-all active:scale-[0.98] hover:border-[var(--terracotta)]/30"
      style={{ background: 'linear-gradient(135deg, rgba(255, 179, 71,0.08), rgba(26,143,160,0.04))', border: '1px solid rgba(255, 179, 71,0.18)' }}
    >
      <div className="relative flex-shrink-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #8B5CF6 0%, #8B5CF6 100%)',
            boxShadow: '0 6px 16px -4px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          <Sparkles size={18} color="#FFFFFF" strokeWidth={2.2} />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--seafoam)] border-2 border-[var(--canvas)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-text-primary font-semibold text-sm">ASTRA AI</p>
        <p className="text-text-muted text-xs mt-0.5">
          {locale === 'ka' ? 'შენი AI ასტრონომიული ასისტენტი · ჩათი →' : 'Your AI astronomy assistant · Chat →'}
        </p>
      </div>
    </Link>
  );
}

// ─── Tab config with Lucide icons ─────────────────────────────────────────────

const TAB_CONFIG: { id: Tab; Icon: React.FC<{ size?: number }>; en: string; ka: string }[] = [
  { id: 'planets',    Icon: Globe,      en: 'Planets',     ka: 'პლანეტები' },
  { id: 'deepsky',    Icon: Sparkles,   en: 'Deep Sky',    ka: 'ღრმა ცა' },
  { id: 'telescopes', Icon: Telescope,  en: 'Scopes',      ka: 'ტელესკოპები' },
  { id: 'astrophoto', Icon: Camera,     en: 'Photo Guide', ka: 'ფოტო გზამკვლევი' },
  { id: 'quizzes',    Icon: Brain,      en: 'Quizzes',     ka: 'ქვიზები' },
  { id: 'guide',      Icon: BookOpen,   en: 'Guide',       ka: 'გზამკვლევი' },
];

// ─── Hero star positions (fixed to avoid hydration mismatch) ─────────────────

const HERO_STARS = [
  { x:  8, y: 12, size: 1.5, dur: 3.2, delay: 0.0  },
  { x: 22, y: 28, size: 1.0, dur: 2.8, delay: 0.5  },
  { x: 38, y:  8, size: 2.0, dur: 4.1, delay: 1.1  },
  { x: 55, y: 18, size: 1.0, dur: 3.5, delay: 0.7  },
  { x: 72, y: 10, size: 1.5, dur: 2.6, delay: 1.9  },
  { x: 87, y: 22, size: 1.0, dur: 3.8, delay: 0.3  },
  { x: 93, y:  5, size: 1.5, dur: 4.5, delay: 2.1  },
  { x: 14, y: 55, size: 1.0, dur: 3.1, delay: 1.4  },
  { x: 48, y: 72, size: 1.5, dur: 2.9, delay: 0.8  },
  { x: 78, y: 65, size: 1.0, dur: 3.7, delay: 1.6  },
  { x: 62, y: 85, size: 2.0, dur: 4.2, delay: 0.4  },
  { x: 30, y: 90, size: 1.0, dur: 3.3, delay: 2.0  },
  { x:  5, y: 80, size: 1.5, dur: 2.7, delay: 1.2  },
  { x: 96, y: 75, size: 1.0, dur: 4.0, delay: 0.6  },
  { x: 50, y: 45, size: 1.5, dur: 3.6, delay: 1.8  },
  { x: 25, y: 40, size: 1.0, dur: 2.5, delay: 0.9  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const rawLocale = useLocale();
  const locale: Locale = rawLocale === 'ka' ? 'ka' : 'en';
  const [tab, setTab] = useState<Tab>('planets');
  const [activeQuiz, setActiveQuiz] = useState<QuizDef | null>(null);
  const [kidsMode, setKidsMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('stellar_kids_mode') === 'true';
    }
    return false;
  });
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const { state } = useAppState();
  const completedQuizzes = state.completedQuizzes ?? [];

  return (
    <>
      {activeQuiz && <QuizActive quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}
      {selectedPlanet && (
        <PlanetModal
          planet={selectedPlanet}
          locale={locale}
          kidsMode={kidsMode}
          onClose={() => setSelectedPlanet(null)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-page-enter flex flex-col gap-5">
        <BackButton />

        {/* ── Premium animated hero ── */}
        <style>{`
          @keyframes learnOrb1 {
            0%,100% { transform:translate(0,0) scale(1); opacity:.7; }
            33%      { transform:translate(14px,-10px) scale(1.06); opacity:.9; }
            66%      { transform:translate(-8px,12px) scale(.96); opacity:.75; }
          }
          @keyframes learnOrb2 {
            0%,100% { transform:translate(0,0) scale(1); opacity:.55; }
            40%      { transform:translate(-12px,9px) scale(1.04); opacity:.75; }
            70%      { transform:translate(10px,-14px) scale(.97); opacity:.6; }
          }
          @keyframes learnOrb3 {
            0%,100% { transform:translate(0,0) scale(1); }
            50%      { transform:translate(8px,-6px) scale(1.08); }
          }
          @keyframes starTwinkle {
            0%,100% { opacity:.3; transform:scale(1); }
            50%      { opacity:1; transform:scale(1.5); }
          }
          @keyframes heroShimmer {
            from { background-position:-200% 0; }
            to   { background-position:200% 0; }
          }
          @keyframes liveRing {
            0%   { transform:scale(1);   opacity:.8; }
            100% { transform:scale(2.2); opacity:0; }
          }
          @keyframes hIn0 { from{opacity:0;transform:translateY(20px);} to{opacity:1;transform:translateY(0);} }
          @keyframes hIn1 { from{opacity:0;transform:translateY(14px);} to{opacity:1;transform:translateY(0);} }
          @keyframes hIn2 { from{opacity:0;transform:translateY(8px);}  to{opacity:1;transform:translateY(0);} }
          @keyframes hIn3 { from{opacity:0;}                             to{opacity:1;} }
        `}</style>

        <div
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(155deg, var(--canvas) 0%, var(--canvas) 55%, var(--canvas) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 0 0 1px rgba(255, 179, 71,0.07), 0 18px 40px rgba(0,0,0,0.6)',
            minHeight: '72px',
            padding: '8px 16px 10px',
          }}
        >
          {/* Top shimmer seam */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 179, 71,0.55) 30%, rgba(255, 179, 71,0.55) 70%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'heroShimmer 3.5s linear infinite',
          }} />

          {/* Violet orb — top-left */}
          <div style={{
            position: 'absolute', top: '-50px', left: '-50px',
            width: '240px', height: '240px',
            background: 'radial-gradient(circle, rgba(255, 179, 71,0.24) 0%, transparent 65%)',
            filter: 'blur(30px)',
            animation: 'learnOrb1 9s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          {/* Cyan orb — bottom-right */}
          <div style={{
            position: 'absolute', bottom: '-55px', right: '-35px',
            width: '260px', height: '200px',
            background: 'radial-gradient(circle, rgba(255, 179, 71,0.15) 0%, transparent 65%)',
            filter: 'blur(34px)',
            animation: 'learnOrb2 11s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          {/* Lavender accent orb — center-right */}
          <div style={{
            position: 'absolute', top: '15%', right: '12%',
            width: '110px', height: '110px',
            background: 'radial-gradient(circle, rgba(255, 179, 71,0.12) 0%, transparent 70%)',
            filter: 'blur(22px)',
            animation: 'learnOrb3 7s ease-in-out infinite 2s',
            pointerEvents: 'none',
          }} />

          {/* Stars */}
          {HERO_STARS.map((s, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${s.x}%`, top: `${s.y}%`,
              width: `${s.size}px`, height: `${s.size}px`,
              borderRadius: '50%',
              background: i % 3 === 0 ? 'var(--terracotta)' : i % 3 === 1 ? 'var(--terracotta)' : '#ffffff',
              animation: `starTwinkle ${s.dur}s ease-in-out infinite ${s.delay}s`,
              pointerEvents: 'none',
            }} />
          ))}

          {/* Main content */}
          <div className="relative flex flex-col items-center text-center" style={{ zIndex: 1, paddingTop: '0px' }}>
            {/* Eyebrow pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '2px 8px', borderRadius: '999px', marginBottom: '4px',
              background: 'rgba(255, 179, 71,0.07)',
              border: '1px solid rgba(255, 179, 71,0.18)',
              animation: 'hIn0 0.5s cubic-bezier(0.16,1,0.3,1) both',
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: 'var(--terracotta)',
                display: 'inline-block',
                boxShadow: '0 0 6px rgba(255, 179, 71,0.9)',
              }} />
              <span style={{
                fontSize: '9px', color: 'rgba(255, 179, 71,0.78)',
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600,
              }}>
                {locale === 'ka' ? 'სასწავლო ცენტრი' : 'Astronomy Academy'}
              </span>
            </div>

            {/* Title */}
            <h1 style={{
              fontSize: 'clamp(1.05rem, 4.5vw, 1.35rem)',
              fontWeight: 800,
              fontFamily: 'Georgia, serif',
              background: 'linear-gradient(135deg, #ffffff 15%, var(--terracotta) 52%, var(--terracotta) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.05,
              marginBottom: '2px',
              letterSpacing: '-0.01em',
              animation: 'hIn1 0.55s cubic-bezier(0.16,1,0.3,1) 0.07s both',
            }}>
              {locale === 'ka' ? 'სწავლა' : 'Learn'}
            </h1>

            {/* Subtitle */}
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '11px',
              lineHeight: 1.35,
              animation: 'hIn2 0.6s cubic-bezier(0.16,1,0.3,1) 0.15s both',
            }}>
              {locale === 'ka' ? 'ასტრონომია, ქვიზები, ASTRA AI.' : 'Astronomy guides, quizzes, and AI assistant.'}
            </p>

            {/* Stats pills */}
            {completedQuizzes.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                marginTop: '8px',
                animation: 'hIn3 0.65s ease-out 0.3s both',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'rgba(94, 234, 212,0.08)',
                  border: '1px solid rgba(94, 234, 212,0.2)',
                  fontSize: '10px', color: 'var(--success)', fontWeight: 500,
                }}>
                  <span>✓</span>
                  <span>{completedQuizzes.length} {locale === 'ka' ? 'ქვიზი' : 'quizzes'}</span>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '2px 8px', borderRadius: '999px',
                  background: 'rgba(255, 179, 71,0.08)',
                  border: '1px solid rgba(255, 179, 71,0.2)',
                  fontSize: '10px', color: 'var(--stars)', fontWeight: 500,
                }}>
                  <span>✦</span>
                  <span>{completedQuizzes.reduce((s, r) => s + r.stars, 0)} {locale === 'ka' ? 'ვარსკვლავი' : 'earned'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <TonightsBanner locale={locale} />

        {/* Tab bar */}
        <div className="scroll-x scrollbar-hide flex gap-1.5 pb-1">
          {TAB_CONFIG.map(t => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium flex-shrink-0 transition-all duration-200 min-h-[36px]"
                style={active ? {
                  background: 'rgba(255, 179, 71,0.12)',
                  border: '1px solid rgba(255, 179, 71,0.3)',
                  color: 'var(--stars)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--text-muted)',
                }}
              >
                <t.Icon size={13} />
                <span>{t[locale]}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'planets'    ? <PlanetsTab key="planets" locale={locale} kidsMode={kidsMode} onSelect={setSelectedPlanet} /> : null}
        {tab === 'deepsky'    ? <DeepSkyTab key="deepsky" locale={locale} kidsMode={kidsMode} /> : null}
        {tab === 'telescopes' ? <TelescopesTab key="telescopes" /> : null}
        {tab === 'astrophoto' ? <AstroPhotoTab key="astrophoto" locale={locale} /> : null}
        {tab === 'quizzes'    ? <QuizzesTab key="quizzes" locale={locale} onStart={setActiveQuiz} /> : null}
        {tab === 'guide'      ? <GuideTab key="guide" locale={locale} /> : null}

        <AstraPromo locale={locale} />
      </div>
    </>
  );
}
