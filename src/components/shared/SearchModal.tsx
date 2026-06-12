'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { MISSIONS } from '@/lib/constants';

interface ResolvedItem {
  type: 'mission' | 'page' | 'object';
  label: string;
  sub: string;
  href: string;
  icon: string;
}

interface StaticItem {
  type: 'page' | 'object';
  labelKey: string;
  subKey: string;
  href: string;
  icon: string;
}

const STATIC_ITEMS: StaticItem[] = [
  { type: 'page',   labelKey: 'skyForecast',   subKey: 'skyForecastSub',   href: '/sky',         icon: '🌤' },
  { type: 'page',   labelKey: 'planetTracker', subKey: 'planetTrackerSub', href: '/sky',         icon: '🪐' },
  { type: 'page',   labelKey: 'solarSystem3d', subKey: 'solarSystem3dSub', href: '/solar-system', icon: '🛰' },
  { type: 'page',   labelKey: 'astraAi',       subKey: 'astraAiSub',       href: '/chat',        icon: '✦' },
  { type: 'page',   labelKey: 'astroGuide',    subKey: 'astroGuideSub',    href: '/learn',       icon: '📚' },
  { type: 'page',   labelKey: 'nftGallery',    subKey: 'nftGallerySub',    href: '/nfts',        icon: '🖼' },
  { type: 'object', labelKey: 'moon',          subKey: 'moonSub',          href: '/sky',         icon: '🌕' },
  { type: 'object', labelKey: 'jupiter',       subKey: 'jupiterSub',       href: '/sky',         icon: '🪐' },
  { type: 'object', labelKey: 'saturn',        subKey: 'saturnSub',        href: '/sky',         icon: '🪐' },
  { type: 'object', labelKey: 'mars',          subKey: 'marsSub',          href: '/sky',         icon: '🔴' },
  { type: 'object', labelKey: 'orion',         subKey: 'orionSub',         href: '/observe/orion',    icon: '✨' },
  { type: 'object', labelKey: 'pleiades',      subKey: 'pleiadesSub',      href: '/observe/pleiades', icon: '💫' },
  { type: 'object', labelKey: 'andromeda',     subKey: 'andromedaSub',     href: '/observe/andromeda', icon: '🌌' },
];

const QUICK_LINKS = [
  { icon: '🌤', labelKey: 'qSky',      href: '/sky' },
  { icon: '🛸', labelKey: 'qMissions', href: '/missions' },
  { icon: '✦',  labelKey: 'qAstra',    href: '/chat' },
  { icon: '🛒', labelKey: 'qShop',     href: '/marketplace' },
];

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations('searchModal');

  const MISSION_ITEMS: ResolvedItem[] = MISSIONS.map(m => ({
    type: 'mission',
    label: m.name,
    sub: m.desc,
    href: `/observe/${m.id}`,
    icon: m.emoji,
  }));

  const STATIC_RESOLVED: ResolvedItem[] = STATIC_ITEMS.map(it => ({
    type: it.type,
    label: t(it.labelKey),
    sub: t(it.subKey),
    href: it.href,
    icon: it.icon,
  }));

  const SEARCH_ITEMS: ResolvedItem[] = [...MISSION_ITEMS, ...STATIC_RESOLVED];

  const TYPE_LABELS: Record<string, string> = {
    mission: t('groupMissions'),
    page: t('groupPages'),
    object: t('groupObjects'),
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  // Auto-focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  // Close on Escape + lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const filtered = query.length < 2
    ? []
    : SEARCH_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sub.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

  // Group results by type
  const grouped: Record<string, ResolvedItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.type]) grouped[item.type] = [];
    grouped[item.type].push(item);
  }

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 512,
          background: '#0D1321',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          padding: '1rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={16} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={t('placeholder')}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '0.875rem',
              padding: '8px 12px',
            }}
          />
          {focused && (
            <span style={{
              fontSize: '0.625rem',
              color: 'var(--text-muted)',
              border: '1px solid #334155',
              borderRadius: 4,
              padding: '1px 4px',
              flexShrink: 0,
            }}>
              ESC
            </span>
          )}
        </div>

        {/* Body */}
        <div style={{ marginTop: 8 }}>
          {query.length < 2 ? (
            /* Quick-access pills */
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {QUICK_LINKS.map(q => (
                <button
                  key={q.href}
                  onClick={() => navigate(q.href)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '9999px',
                    padding: '8px 16px',
                    fontSize: '0.75rem',
                    color: 'white',
                    cursor: 'pointer',
                  }}
                >
                  {q.icon} {t(q.labelKey)}
                </button>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '24px 0' }}>
              {t('noResults', { query })}
            </p>
          ) : (
            /* Grouped results */
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} style={{ marginTop: 8 }}>
                <p style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', padding: '4px 8px' }}>
                  {TYPE_LABELS[type]}
                </p>
                {items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.href)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '10px 8px',
                      borderRadius: '0.75rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'white', fontSize: '0.875rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</p>
                    </div>
                    <ArrowUpRight size={12} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
