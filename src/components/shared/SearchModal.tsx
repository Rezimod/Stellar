'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowUpRight } from 'lucide-react';
import { MISSIONS } from '@/lib/constants';

interface SearchItem {
  type: 'mission' | 'page' | 'object';
  label: string;
  sub: string;
  href: string;
  icon: string;
}

const STATIC_ITEMS: SearchItem[] = [
  // Sky pages
  { type: 'page', label: 'Sky Forecast', sub: '7-day cloud cover and seeing', href: '/sky', icon: '🌤' },
  { type: 'page', label: 'Planet Tracker', sub: 'Mercury to Saturn + Moon', href: '/sky', icon: '🪐' },
  { type: 'page', label: 'ASTRA AI', sub: 'Chat with your AI astronomer', href: '/chat', icon: '✦' },
  { type: 'page', label: 'NFT Gallery', sub: 'Your discovery attestations', href: '/nfts', icon: '🖼' },
  // Celestial objects
  { type: 'object', label: 'Moon', sub: "Earth's natural satellite, brightest object at night", href: '/sky', icon: '🌕' },
  { type: 'object', label: 'Jupiter', sub: 'Largest planet, visible to naked eye', href: '/sky', icon: '🪐' },
  { type: 'object', label: 'Saturn', sub: 'Ringed gas giant', href: '/sky', icon: '🪐' },
  { type: 'object', label: 'Mars', sub: 'The Red Planet', href: '/sky', icon: '🔴' },
  { type: 'object', label: 'Orion Nebula', sub: "M42 — stunning emission nebula in Orion's sword", href: '/missions', icon: '✨' },
  { type: 'object', label: 'Pleiades', sub: 'M45 — Seven Sisters open cluster', href: '/missions', icon: '💫' },
  { type: 'object', label: 'Andromeda Galaxy', sub: 'M31 — nearest large galaxy, 2.5M light years', href: '/missions', icon: '🌌' },
];

const MISSION_ITEMS: SearchItem[] = MISSIONS.map(m => ({
  type: 'mission' as const,
  label: m.name,
  sub: m.desc,
  href: '/missions',
  icon: m.emoji,
}));

const SEARCH_ITEMS: SearchItem[] = [...MISSION_ITEMS, ...STATIC_ITEMS];

const TYPE_LABELS: Record<string, string> = {
  mission: 'MISSIONS',
  page: 'PAGES',
  object: 'CELESTIAL OBJECTS',
};

const QUICK_LINKS = [
  { icon: '🌤', label: 'Sky', href: '/sky' },
  { icon: '🛸', label: 'Missions', href: '/missions' },
  { icon: '✦', label: 'ASTRA', href: '/chat' },
  { icon: '🛒', label: 'Shop', href: '/marketplace' },
];

export default function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
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

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const filtered = query.length < 2
    ? []
    : SEARCH_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.sub.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8);

  // Group results by type
  const grouped: Record<string, SearchItem[]> = {};
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          maxWidth: 512,
          margin: '10vh auto 0',
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
            placeholder="Search missions, telescopes, planets..."
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
              color: '#64748b',
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
                  {q.icon} {q.label}
                </button>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            /* Empty state */
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.875rem', padding: '24px 0' }}>
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            /* Grouped results */
            Object.entries(grouped).map(([type, items]) => (
              <div key={type} style={{ marginTop: 8 }}>
                <p style={{ fontSize: '0.625rem', color: '#475569', fontWeight: 600, letterSpacing: '0.1em', padding: '4px 8px' }}>
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
                      <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.sub}</p>
                    </div>
                    <ArrowUpRight size={12} color="#475569" style={{ flexShrink: 0 }} />
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
