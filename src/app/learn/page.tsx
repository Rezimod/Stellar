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
import { PLANETS, DSO, CONSTELLATIONS, ALL_EVENTS, daysFromNow, type Locale, type EventKind } from '@/lib/learn-data';
import {
  Globe, Sparkles, Brain, Camera, BookOpen, Telescope, Map, Search,
  X, Star, Moon, Eye, ChevronDown, ChevronUp, Binoculars, Sun, Rocket,
  ExternalLink, Headphones, Youtube, Orbit,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const QUIZ_HUB: Record<string, { Icon: LucideIcon; gradient: string }> = {
  'solar-system':      { Icon: Sun,       gradient: 'linear-gradient(135deg, #FFB347 0%, #FFB347 100%)' },
  'constellations':    { Icon: Star,      gradient: 'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)' },
  'telescopes':        { Icon: Telescope, gradient: 'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)' },
  'universe':          { Icon: Globe,     gradient: 'linear-gradient(135deg, #5EEAD4 0%, #5EEAD4 100%)' },
  'space-exploration': { Icon: Rocket,    gradient: 'linear-gradient(135deg, #FB7185 0%, #E11D48 100%)' },
};

type Tab = 'planets' | 'deepsky' | 'quizzes' | 'guide' | 'telescopes' | 'astrophoto';
type Planet = typeof PLANETS[number];
type Constellation = typeof CONSTELLATIONS[number];

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
        style={{ background: 'rgba(3,6,14,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
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
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header: image + name side by side */}
        <div className="flex items-stretch" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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
                style={{ background: 'rgba(255, 179, 71,0.15)', border: '1px solid rgba(255, 179, 71,0.3)', color: 'var(--accent-text)' }}
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
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            aria-label="Close"
          >
            <X size={13} color="var(--text-secondary)" />
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
          style={{ background: 'rgba(255, 179, 71,0.05)', border: '1px solid rgba(255, 179, 71,0.1)', color: 'color-mix(in srgb, var(--accent-text) 75%, transparent)' }}>
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
              style={{ color: 'var(--accent-text)' }}>
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

// ─── Constellation Modal ─────────────────────────────────────────────────────

function ConstellationModal({ constellation, locale, onClose }: {
  constellation: Constellation;
  locale: Locale;
  onClose: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const c = constellation;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(3,6,14,0.6)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      <div
        className="fixed left-1/2 top-1/2 z-[61] rounded-2xl flex flex-col"
        style={{
          width: 'calc(100% - 32px)',
          maxWidth: '520px',
          maxHeight: 'calc(100vh - 48px)',
          transform: 'translate(-50%, -50%)',
          background: 'var(--canvas)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Hero image — 3:2 matches the generated star charts exactly (no crop) */}
        <div className="relative w-full flex-shrink-0" style={{ aspectRatio: '3 / 2' }}>
          <Image
            src={c.img}
            alt={c.name[locale]}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 520px"
            priority
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.9) 0%, rgba(7,11,20,0.2) 50%, transparent 100%)' }} />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-strong)', backdropFilter: 'blur(8px)' }}
            aria-label="Close"
          >
            <X size={14} color="var(--text-primary)" />
          </button>

          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            <p className="text-text-primary font-bold text-xl leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              {c.name[locale]}
            </p>
            <span
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: `${c.color}25`, color: c.color, border: `1px solid ${c.color}40` }}
            >
              {c.season[locale]}
            </span>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto px-4 py-3 flex flex-col gap-3" style={{ minHeight: 0 }}>
          <p className="text-text-primary text-[13px] leading-relaxed">{c.desc[locale]}</p>

          {/* Brightest star */}
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Star size={10} color={c.color} />
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                {locale === 'ka' ? 'უმთავრესი ვარსკვლავი' : 'Brightest Star'}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <p className="text-text-primary text-[13px] font-semibold">{c.brightestStar.name[locale]}</p>
              <p className="text-[11px] tabular-nums" style={{ color: c.color, fontFamily: 'var(--font-mono)' }}>
                {locale === 'ka' ? 'სიკაშკაშე' : 'mag'} {c.brightestStar.magnitude.toFixed(2)}
              </p>
            </div>
            <p className="text-text-muted text-[11.5px] mt-0.5">{c.brightestStar.note[locale]}</p>
          </div>

          {/* Where to look */}
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Eye size={10} color={c.color} />
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                {locale === 'ka' ? 'როდის ვნახო' : 'Where to look'}
              </span>
            </div>
            <p className="text-text-primary text-[13px]">{c.bestTime[locale]}</p>
          </div>

          {/* Mythology */}
          <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <BookOpen size={10} color={c.color} />
              <span className="text-[10px] uppercase tracking-widest text-text-muted">
                {locale === 'ka' ? 'მითოლოგია' : 'Mythology'}
              </span>
            </div>
            <p className="text-text-primary text-[12.5px] leading-relaxed">{c.mythology[locale]}</p>
          </div>

          {/* Highlight */}
          <div className="rounded-xl px-3 py-2 flex items-start gap-2"
            style={{ background: `${c.color}10`, border: `1px solid ${c.color}25` }}>
            <Sparkles size={11} style={{ flexShrink: 0, marginTop: 2, color: c.color }} />
            <span className="text-[12px] leading-relaxed" style={{ color: c.color }}>
              {c.highlight[locale]}
            </span>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Planets Tab ──────────────────────────────────────────────────────────────

function PlanetsTab({ locale, kidsMode, onSelect, onSelectConstellation }: {
  locale: Locale;
  kidsMode: boolean;
  onSelect: (p: Planet) => void;
  onSelectConstellation: (c: Constellation) => void;
}) {
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
          {locale === 'ka' ? 'თანავარსკვლავედები · შეეხე დეტალებისთვის' : 'Constellations · tap to explore'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2.5">
          {CONSTELLATIONS.map(c => (
            <button
              key={c.id}
              onClick={() => onSelectConstellation(c)}
              className="group text-left rounded-xl overflow-hidden relative transition-transform duration-200 hover:-translate-y-0.5"
              style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
                <Image
                  src={c.img}
                  alt={c.name[locale]}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.95) 0%, rgba(7,11,20,0.4) 50%, transparent 100%)' }} />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ boxShadow: `inset 0 0 0 1.5px ${c.color}80` }}
                />
                <span
                  className="absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm"
                  style={{ background: `${c.color}25`, color: c.color, border: `1px solid ${c.color}40` }}
                >
                  {c.season[locale]}
                </span>
                <div className="absolute bottom-2 left-2.5 right-2.5">
                  <p className="text-text-primary font-bold text-[13px] leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                    {c.name[locale]}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Deep Sky Tab ─────────────────────────────────────────────────────────────

const EQ_BADGES: Record<string, { label: { en: string; ka: string }; Icon: React.FC<{ size?: number; color?: string }>; color: string }> = {
  naked_eye:   { label: { en: 'Naked Eye',    ka: 'შიშველი თვალი' }, Icon: Eye,        color: 'var(--success)' },
  binoculars:  { label: { en: 'Binoculars',   ka: 'ბინოკლი' },       Icon: Binoculars, color: 'var(--accent-text)' },
  small_scope: { label: { en: '100mm+ Scope', ka: '100მმ+ ტელ.' },   Icon: Telescope,  color: 'var(--accent-text)' },
  large_scope: { label: { en: '150mm+ Scope', ka: '150მმ+ ტელ.' },   Icon: Telescope,  color: 'var(--accent-text)' },
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
                color: 'var(--accent-text)',
              } : {
                background: 'rgba(var(--ink), 0.04)',
                border: '1px solid rgba(var(--ink), 0.08)',
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
              <div className="mt-4 flex flex-col gap-2 sm:pl-[52px]">
                <div className="relative w-full rounded-xl overflow-hidden mb-2" style={{ height: '160px' }}>
                  <Image src={obj.img} alt={obj.name[locale]} fill className="object-cover" sizes="(max-width: 672px) 100vw, 672px" />
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(7,11,20,0.8) 0%, transparent 60%)' }} />
                  <p className="absolute bottom-2 left-3 text-text-primary text-xs font-semibold opacity-80">{obj.name[locale]}</p>
                </div>
                {kidsMode ? (
                  <>
                    <p className="text-text-primary text-xs leading-relaxed flex items-start gap-1.5">
                      <Star size={11} style={{ color: 'var(--accent-text)', flexShrink: 0, marginTop: 1 }} />
                      {obj.kidsLine[locale]}
                    </p>
                    <div className="rounded-lg p-3 text-xs text-[var(--accent-text)]/80 flex items-start gap-2"
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
                    <div className="rounded-lg p-3 text-xs text-[var(--accent-text)]/80 flex items-start gap-2"
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
                    style={{ color: 'var(--accent-text)' }}
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
                  background: hub?.gradient ?? 'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)',
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
                <span className="text-[var(--accent-text)] text-xs font-medium">
                  {locale === 'ka' ? 'საუკეთესო' : 'Best'}: {best}/{quiz.questions.length} · +{bestStars} ✦
                </span>
              )}
              <button
                onClick={() => onStart(quiz)}
                className="ml-auto px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta))', color: '#0A1735' }}
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
  { term: 'Bortle scale', termKa: 'ბორტლის სკალა', def: 'A 1–9 rating of sky darkness. 1 = pristine dark sky (Milky Way casts shadows). 5 = suburban. 9 = city center (only Moon and planets visible). Check the Dark Sky Map to find your local Bortle rating.', defKa: 'ცის სიბნელის 1–9 შეფასება. 1 = ხელუხლებელი ბნელი ცა (ირმის ნახტომი ჩრდილს აგდებს). 5 = გარეუბანი. 9 = ქალაქის ცენტრი (ჩანს მხოლოდ მთვარე და პლანეტები). შენი ბორტლის შესაფასებლად იხილე ბნელი ცის რუკა.' },
  { term: 'Light-year', termKa: 'სინათლის წელი', def: 'Distance light travels in one year: 9.46 trillion km. Used for interstellar distances. When you see the Andromeda Galaxy (2.5M light-years away), you\'re seeing light that left 2.5 million years ago.', defKa: 'მანძილი, რასაც სინათლე ერთ წელიწადში გადის: 9.46 ტრილიონი კმ.' },
  { term: 'Collimation', termKa: 'კოლიმაცია', def: 'Aligning a reflector telescope\'s mirrors so they focus light correctly. Needs checking every session for Newtonians. Uses a collimation cap or laser collimator.', defKa: 'რეფლექტორის სარკეების გასწორება. ნიუტონისთვის ყოველ სესიაზე საჭიროა.' },
  { term: 'Opposition', termKa: 'ოპოზიცია', def: 'When a planet is directly opposite the Sun from Earth — closest and brightest. Best time to observe outer planets. Saturn opposition Oct 2026, Jupiter and Mars Feb 2027.', defKa: 'როცა პლანეტა მზის საპირისპიროდაა — ყველაზე ახლო და კაშკაშა. სატურნის ოპოზიცია 2026 ოქტომბერში, იუპიტერის და მარსის — 2027 თებერვალში.' },
  { term: 'Magnitude', termKa: 'ვარსკვლავიერი სიდიდე', def: 'The brightness scale for sky objects — lower numbers mean brighter. Vega is 0, the faintest naked-eye stars are ~6, binoculars reach ~9. Counterintuitive but you get used to it fast.', defKa: 'ობიექტების სიკაშკაშის სკალა — რაც ნაკლებია რიცხვი, მით კაშკაშაა. ვეგა = 0, თვალით ხილული ყველაზე მკრთალი ვარსკვლავები ~6.' },
  { term: 'Averted vision', termKa: 'გვერდითი მზერა', def: 'Look slightly to the side of a faint object instead of straight at it — the edge of your eye is more light-sensitive. A must-know trick for nebulas and galaxies.', defKa: 'მკრთალ ობიექტს ოდნავ გვერდიდან შეხედე — თვალის კიდე სინათლის მიმართ უფრო მგრძნობიარეა. აუცილებელი ხრიკი ნისლეულებისთვის.' },
  { term: 'Eyepiece', termKa: 'ოკულარი', def: 'The small lens you look through. Swapping eyepieces changes magnification: a 25mm gives a wide, bright view for finding objects; a 10mm zooms in for planets and the Moon.', defKa: 'პატარა ლინზა, რომელშიც იყურები. 25მმ — ფართო ხედი ობიექტების საპოვნელად; 10მმ — გადიდება პლანეტებისთვის.' },
  { term: 'Star hopping', termKa: 'ვარსკვლავებით ნავიგაცია', def: 'Finding faint objects by "hopping" from one bright star to the next, like following landmarks. Example: hop from Vega to find the Ring Nebula. How observers found things for centuries before GoTo mounts.', defKa: 'მკრთალი ობიექტების პოვნა კაშკაშა ვარსკვლავიდან ვარსკვლავზე "გადახტომით", ორიენტირებივით. მაგ: ვეგადან რგოლის ნისლეულამდე.' },
  { term: 'Seeing', termKa: 'ხილვადობა', def: 'How steady the atmosphere is — affects sharpness at high magnification. Good seeing = steady stars. Bad seeing = twinkling, blurry planets. Check the Sky page for tonight\'s conditions.', defKa: 'ატმოსფეროს სტაბილურობა — გავლენას ახდენს სიმკვეთრეზე.' },
  { term: 'Terminator', termKa: 'ტერმინატორი', def: 'The shadow line on the Moon between the lit and dark sides. This is where craters look most dramatic — sunlight hits at an angle creating long shadows. Best area to observe on any night.', defKa: 'მთვარეზე ჩრდილის ხაზი განათებულ და ბნელ მხარეს შორის.' },
  { term: 'Meridian', termKa: 'მერიდიანი', def: 'An imaginary line from north to south passing directly overhead. Objects are highest (best viewing) when they cross the meridian — called "transit".', defKa: 'წარმოსახვითი ხაზი ჩრდილოეთიდან სამხრეთამდე თავის ზემოთ.' },
  { term: 'Alt-Az mount', termKa: 'ალტ-აზ მონტირება', def: 'A mount that moves up-down (altitude) and left-right (azimuth). Simple to use. Most beginner telescopes use this type. Doesn\'t track the sky automatically.', defKa: 'ზემოთ-ქვემოთ და მარცხნივ-მარჯვნივ მოძრავი მონტირება. მარტივია.' },
  { term: 'Equatorial mount', termKa: 'ეკვატორული მონტირება', def: 'A mount aligned with Earth\'s rotation axis. One motor can track objects across the sky. Required for long-exposure astrophotography. More complex to set up than Alt-Az.', defKa: 'დედამიწის ბრუნვის ღერძზე გათანაბრებული. ერთი ძრავით ადევნებს ობიექტებს.' },
];

const EVENT_ICON: Record<EventKind, LucideIcon> = {
  meteor: Sparkles,
  planet: Orbit,
  eclipse: Moon,
};

const BORTLE_SEGMENTS = [
  { range: '1–2', color: 'var(--success)', text: 'var(--success)', label: { en: 'Pristine',  ka: 'ხელუხლებელი'  }, desc: { en: 'Milky Way structure, zodiacal light, thousands of stars', ka: 'ირმის ნახტომი, ზოდიაქური სინათლე, ათასობით ვარსკვლავი' } },
  { range: '3–4', color: 'var(--stars)', text: 'var(--accent-text)', label: { en: 'Rural',     ka: 'სოფელი'       }, desc: { en: 'Milky Way visible, 100+ stars, good for deep sky',      ka: 'ირმის ნახტომი ჩანს, 100+ ვარსკვლავი, კარგი ღრმა ცისთვის' } },
  { range: '5–6', color: '#FFB347', text: 'var(--accent-text)', label: { en: 'Suburban',  ka: 'გარეუბანი'    }, desc: { en: 'Milky Way faint, planets and bright clusters',           ka: 'ირმის ნახტომი სუსტია, პლანეტები და კაშკაში გროვები' } },
  { range: '7–9', color: 'var(--negative)', text: 'var(--negative)', label: { en: 'City',      ka: 'ქალაქი'       }, desc: { en: 'Moon and brightest planets only',                        ka: 'მხოლოდ მთვარე და ყველაზე კაშკაში პლანეტები' } },
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
        <Link key={i} href="/sky" onClick={e => e.stopPropagation()} className="text-[var(--teal-text)] hover:opacity-80">{part}</Link>
      ) : part === 'Dark Sky Map' ? (
        <Link key={i} href="/darksky" onClick={e => e.stopPropagation()} className="text-[var(--teal-text)] hover:opacity-80">{part}</Link>
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
                style={{ background: 'rgba(var(--ink), 0.04)', border: '1px solid rgba(var(--ink), 0.08)' }}
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
                    style={{ background: `${seg.color}20`, color: seg.text, border: `1px solid ${seg.color}30` }}>
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
              href="/darksky"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(94, 234, 212,0.06)', border: '1px solid rgba(94, 234, 212,0.2)', color: 'var(--teal-text)' }}
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
                <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'color-mix(in srgb, var(--accent-text) 60%, transparent)' }}>
                  {locale === 'ka' ? 'მომდევნო მოვლენა' : 'Next Up'}
                </p>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(255, 179, 71,0.1)', border: '1px solid rgba(255, 179, 71,0.2)', color: 'var(--accent-text)' }}>
                      {(() => { const Icon = EVENT_ICON[nextEvent.kind]; return <Icon size={17} />; })()}
                    </div>
                    <div>
                      <p className="text-text-primary font-semibold text-sm">{nextEvent.name[locale]}</p>
                      <p className="text-text-muted text-xs mt-0.5 leading-relaxed">{nextEvent.desc[locale]}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[var(--accent-text)] text-2xl font-bold leading-none">{daysFromNow(nextEvent.date)}</p>
                    <p className="text-text-muted text-[10px] mt-0.5">{locale === 'ka' ? 'დღეში' : 'days'}</p>
                  </div>
                </div>
              </div>
            )}
            {upcoming.length > 1 && (
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(var(--ink), 0.06)' }}>
                <div className="px-4">
                  {upcoming.slice(1).map(ev => {
                    const Icon = EVENT_ICON[ev.kind];
                    return (
                    <div key={ev.date} className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(255, 179, 71,0.06)', border: '1px solid rgba(255, 179, 71,0.1)', color: 'color-mix(in srgb, var(--accent-text) 75%, transparent)' }}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium">{ev.name[locale]}</p>
                        <p className="text-text-muted text-xs truncate">{ev.date} · {ev.desc[locale].split('.')[0]}.</p>
                      </div>
                      <span className="text-[var(--accent-text)] text-xs font-mono flex-shrink-0">
                        {dayLabel(daysFromNow(ev.date))}
                      </span>
                    </div>
                    );
                  })}
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
                {past.map(ev => {
                  const Icon = EVENT_ICON[ev.kind];
                  return (
                  <div key={ev.date} className="flex items-center gap-3 opacity-40">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(var(--ink), 0.04)', border: '1px solid rgba(var(--ink), 0.07)', color: 'var(--text-muted)' }}>
                      <Icon size={14} />
                    </div>
                    <div>
                      <p className="text-text-muted text-sm font-medium">{ev.name[locale]}</p>
                      <p className="text-text-muted text-[10px] font-mono">{ev.date}</p>
                    </div>
                  </div>
                  );
                })}
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
                style={{ background: 'rgba(255, 179, 71,0.1)', border: '1px solid rgba(255, 179, 71,0.2)', color: 'var(--accent-text)' }}
              >
                {card.step}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-semibold text-sm">{card.title[locale]}</p>
              </div>
              {isExp ? <ChevronUp size={14} className="text-text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-text-muted flex-shrink-0" />}
            </div>
            {isExp && (
              <div className="mt-3 flex flex-col gap-2 sm:pl-[44px]">
                <p className="text-text-muted text-xs leading-relaxed">{card.body[locale]}</p>
                <div
                  className="rounded-lg p-3 text-xs flex items-start gap-2"
                  style={{ background: 'rgba(255, 179, 71,0.04)', border: '1px solid rgba(255, 179, 71,0.1)', color: 'color-mix(in srgb, var(--accent-text) 80%, transparent)' }}
                >
                  <Camera size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                  {card.tip[locale]}
                </div>
                {card.link && (
                  <Link
                    href={card.link.href}
                    onClick={e => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: 'var(--accent-text)' }}
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
            background: 'linear-gradient(135deg, var(--terracotta) 0%, var(--terracotta) 100%)',
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

// ─── More Learning Material ───────────────────────────────────────────────────

const MORE_RESOURCES: {
  Icon: LucideIcon;
  color: string;
  title: { en: string; ka: string };
  desc: { en: string; ka: string };
  meta: { en: string; ka: string };
  href: string;
  external?: boolean;
}[] = [
  {
    Icon: Camera,
    color: '#FFB347',
    title: { en: 'NASA Astronomy Picture of the Day', ka: 'NASA-ს დღის ფოტო' },
    desc: {
      en: 'A new image of our universe each day with a short explanation by a professional astronomer. Running since 1995.',
      ka: 'ყოველდღე ახალი ფოტო და მოკლე ახსნა პროფესიონალი ასტრონომისგან. 1995 წლიდან.',
    },
    meta: { en: 'NASA · Daily', ka: 'NASA · ყოველდღიური' },
    href: 'https://apod.nasa.gov/apod/',
    external: true,
  },
  {
    Icon: Youtube,
    color: '#FB7185',
    title: { en: 'NASA on YouTube', ka: 'NASA YouTube-ზე' },
    desc: {
      en: 'Live rocket launches, ISS feeds, and full mission documentaries — straight from the agency. The single best free space channel online.',
      ka: 'რაკეტების გაშვებები პირდაპირ ეთერში, ISS-ის კადრები და მისიების დოკუმენტურები — პირდაპირ NASA-დან.',
    },
    meta: { en: 'NASA · YouTube', ka: 'NASA · YouTube' },
    href: 'https://www.youtube.com/@NASA',
    external: true,
  },
  {
    Icon: Telescope,
    color: '#5EEAD4',
    title: { en: 'ESA / Hubble', ka: 'ESA / Hubble' },
    desc: {
      en: 'The European Space Agency\'s Hubble portal — three decades of images, papers, and explainers from humanity\'s most famous telescope.',
      ka: 'ევროპული კოსმოსური სააგენტოს Hubble-ის პორტალი — სამი ათწლეული ფოტოებისა და მასალების ყველაზე ცნობილი ტელესკოპიდან.',
    },
    meta: { en: 'ESA · Web', ka: 'ESA · ვები' },
    href: 'https://esahubble.org/',
    external: true,
  },
  {
    Icon: Sparkles,
    color: '#FFB347',
    title: { en: 'James Webb Space Telescope', ka: 'James Webb-ის ტელესკოპი' },
    desc: {
      en: 'The official JWST gallery from STScI. Infrared views of galaxies, nebulae, and exoplanet atmospheres in resolutions Hubble never reached.',
      ka: 'JWST-ის ოფიციალური გალერია. გალაქტიკები, ნისლეულები და ეგზოპლანეტები ინფრაწითელ შუქში.',
    },
    meta: { en: 'NASA · ESA · CSA', ka: 'NASA · ESA · CSA' },
    href: 'https://webbtelescope.org/resource-gallery/images',
    external: true,
  },
  {
    Icon: Rocket,
    color: '#FFB347',
    title: { en: 'SpaceX', ka: 'SpaceX' },
    desc: {
      en: 'Live launch webcasts, Starship test flights, and Starlink deployments. The most-watched rocket coverage on the internet — free, no signup.',
      ka: 'რაკეტების გაშვებების პირდაპირი ეთერი, Starship-ის ტესტ-ფრენები და Starlink-ის გაშვებები.',
    },
    meta: { en: 'SpaceX · Live', ka: 'SpaceX · პირდაპირ' },
    href: 'https://www.spacex.com/launches/',
    external: true,
  },
  {
    Icon: Star,
    color: '#5EEAD4',
    title: { en: 'Stellarium Web', ka: 'Stellarium Web' },
    desc: {
      en: 'A free planetarium in your browser. Set your location and see exactly what the sky looks like right now — or any date in history.',
      ka: 'უფასო პლანეტარიუმი ბრაუზერში. მიუთითე ადგილმდებარეობა და ნახე, როგორ გამოიყურება ცა ახლა — ან ისტორიის ნებისმიერ თარიღზე.',
    },
    meta: { en: 'Stellarium · Interactive', ka: 'Stellarium · ინტერაქტიული' },
    href: 'https://stellarium-web.org/',
    external: true,
  },
  {
    Icon: Eye,
    color: '#FB7185',
    title: { en: 'Heavens-Above', ka: 'Heavens-Above' },
    desc: {
      en: 'Precise pass predictions for the ISS and bright satellites over your location. Know exactly when to look up and where.',
      ka: 'ISS-ისა და კაშკაშა თანამგზავრების გადაფრენის ზუსტი პროგნოზი შენი ადგილმდებარეობისთვის. იცოდე, როდის და საით ახედო.',
    },
    meta: { en: 'Satellites · Free', ka: 'თანამგზავრები · უფასო' },
    href: 'https://www.heavens-above.com/',
    external: true,
  },
  {
    Icon: Orbit,
    color: '#5EEAD4',
    title: { en: 'NASA Eyes on the Solar System', ka: 'NASA Eyes — მზის სისტემა' },
    desc: {
      en: 'Fly through a real-time 3D model of our solar system built on actual NASA mission data. Track every planet, moon, and active spacecraft.',
      ka: 'მზის სისტემის 3D მოდელი რეალურ დროში, NASA-ს მისიის მონაცემებზე აგებული. ნახეთ პლანეტები, მთვარეები და მოქმედი მისიები.',
    },
    meta: { en: 'NASA · Interactive', ka: 'NASA · ინტერაქტიული' },
    href: 'https://eyes.nasa.gov/apps/solar-system/',
    external: true,
  },
];

function MoreLearningMaterial({ locale }: { locale: Locale }) {
  return (
    <section className="mt-2 flex flex-col gap-4">
      <div>
        <div className="text-[10.5px] md:text-[11px] font-mono uppercase tracking-[0.22em] text-[#FFB347] mb-2">
          {locale === 'ka' ? 'მეტი მასალა' : 'Beyond Stellar'}
        </div>
        <h2
          className="text-white font-bold leading-tight tracking-[-0.01em] m-0"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 2.5vw, 26px)' }}
        >
          {locale === 'ka' ? 'სასარგებლო რესურსები' : 'More Learning Material'}
        </h2>
        <p className="mt-1.5 text-[12.5px] md:text-[13.5px] text-white/55 leading-snug max-w-[520px]">
          {locale === 'ka'
            ? 'ხელით შერჩეული უფასო ხელსაწყოები, ვიდეოები და წიგნები, რომელთაც ჩვენც ვიყენებთ.'
            : 'Hand-picked free tools, videos, and books we actually use ourselves.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MORE_RESOURCES.map(r => (
          <a
            key={r.href}
            href={r.href}
            target={r.external ? '_blank' : undefined}
            rel={r.external ? 'noopener noreferrer' : undefined}
            className="glass-card p-4 flex flex-col gap-2 transition-all duration-200 hover:border-[var(--border)] hover:-translate-y-[1px]"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${r.color}14`, border: `1px solid ${r.color}25`, color: r.color }}
              >
                <r.Icon size={16} strokeWidth={2.1} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-text-primary font-semibold text-sm leading-snug truncate">{r.title[locale]}</p>
                  {r.external && <ExternalLink size={11} className="text-text-muted flex-shrink-0" />}
                </div>
                <p className="text-[10px] uppercase tracking-widest text-text-muted mt-0.5">{r.meta[locale]}</p>
              </div>
            </div>
            <p className="text-text-muted text-[12px] leading-relaxed">{r.desc[locale]}</p>
          </a>
        ))}
      </div>
    </section>
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
  const [selectedConstellation, setSelectedConstellation] = useState<Constellation | null>(null);
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
      {selectedConstellation && (
        <ConstellationModal
          constellation={selectedConstellation}
          locale={locale}
          onClose={() => setSelectedConstellation(null)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-page-enter flex flex-col gap-5">
        <BackButton />

        {completedQuizzes.length > 0 && (
          <header className="flex justify-end">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex flex-col">
                <span
                  className="text-white font-bold tabular-nums leading-none"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(20px, 3vw, 28px)' }}
                >
                  {completedQuizzes.length}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
                  {locale === 'ka' ? 'ქვიზი' : 'Quizzes'}
                </span>
              </div>
              <div className="w-px h-9 bg-white/10" />
              <div className="flex flex-col">
                <span
                  className="font-bold tabular-nums leading-none"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(20px, 3vw, 28px)', color: 'var(--accent-text)' }}
                >
                  ✦ {completedQuizzes.reduce((s, r) => s + r.stars, 0)}
                </span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/40 font-mono">
                  {locale === 'ka' ? 'ვარსკვლავი' : 'Earned'}
                </span>
              </div>
            </div>
          </header>
        )}

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
                  color: 'var(--accent-text)',
                } : {
                  background: 'rgba(var(--ink), 0.04)',
                  border: '1px solid rgba(var(--ink), 0.08)',
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
        {tab === 'planets'    ? <PlanetsTab key="planets" locale={locale} kidsMode={kidsMode} onSelect={setSelectedPlanet} onSelectConstellation={setSelectedConstellation} /> : null}
        {tab === 'deepsky'    ? <DeepSkyTab key="deepsky" locale={locale} kidsMode={kidsMode} /> : null}
        {tab === 'telescopes' ? <TelescopesTab key="telescopes" /> : null}
        {tab === 'astrophoto' ? <AstroPhotoTab key="astrophoto" locale={locale} /> : null}
        {tab === 'quizzes'    ? <QuizzesTab key="quizzes" locale={locale} onStart={setActiveQuiz} /> : null}
        {tab === 'guide'      ? <GuideTab key="guide" locale={locale} /> : null}

        <AstraPromo locale={locale} />

        <MoreLearningMaterial locale={locale} />
      </div>
    </>
  );
}
