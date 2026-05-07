'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { AstroEvent } from '@/lib/astro-events';

interface Props {
  open: boolean;
  event: AstroEvent | null;
  onClose: () => void;
  /** Accepted but ignored — popup always centers in viewport. */
  anchorRect?: DOMRect | null;
}

const DIFFICULTY_LABEL: Record<AstroEvent['difficulty'], string> = {
  'naked-eye': 'Naked eye',
  'binoculars': 'Binoculars',
  'telescope': 'Telescope',
  'expert': 'Expert',
};

const TYPE_LABEL: Record<AstroEvent['type'], string> = {
  'eclipse-lunar': 'Lunar eclipse',
  'eclipse-solar': 'Solar eclipse',
  'conjunction': 'Conjunction',
  'comet': 'Comet',
  'opposition': 'Opposition',
  'meteor-shower': 'Meteor shower',
};

export default function EventInfoSheet({ open, event, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !event) return null;

  const eventDate = new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      style={{ background: 'rgba(7,11,20,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={event.name}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl flex flex-col overflow-hidden"
        style={{
          background: 'var(--canvas)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          maxHeight: 'calc(100dvh - 2rem)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
          style={{ background: 'rgba(11,14,23,0.7)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <X size={14} />
        </button>

        <div
          className="w-full flex items-center justify-center"
          style={{
            height: 132,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ width: 84, height: 84 }}>
            <EventArt type={event.type} />
          </div>
        </div>

        <div className="flex flex-col gap-3 p-5 overflow-y-auto">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-mono">
              {TYPE_LABEL[event.type]} · {DIFFICULTY_LABEL[event.difficulty]}
            </p>
            <h2 className="text-text-primary text-lg font-semibold mt-1" style={{ fontFamily: 'var(--font-serif)' }}>
              {event.name}
            </h2>
            <p className="text-text-muted text-xs mt-1 font-mono">{eventDate}</p>
          </div>

          <p className="text-text-primary text-sm leading-relaxed">
            {event.description}
          </p>

          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
            <Row label="Where to see it" value={event.visibilityRegion} />
            <Row label="Tip" value={event.viewingTip} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)] font-mono">{label}</p>
      <p className="text-text-primary text-xs leading-relaxed">{value}</p>
    </div>
  );
}

function EventArt({ type }: { type: AstroEvent['type'] }) {
  if (type === 'eclipse-solar') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="evSun" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#FFB23A" />
            <stop offset="80%" stopColor="#F25A1A" />
            <stop offset="100%" stopColor="#9A2A0E" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#evSun)" />
        <circle cx="38" cy="30" r="20" fill="#0A1735" />
      </svg>
    );
  }
  if (type === 'eclipse-lunar') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="evMoon" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#E54B3F" />
            <stop offset="80%" stopColor="#7A1F18" />
            <stop offset="100%" stopColor="#2B0A07" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#evMoon)" />
        <circle cx="22" cy="26" r="2" fill="#000" opacity="0.35" />
        <circle cx="40" cy="34" r="2.5" fill="#000" opacity="0.3" />
        <circle cx="30" cy="40" r="1.8" fill="#000" opacity="0.4" />
      </svg>
    );
  }
  if (type === 'comet') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <linearGradient id="evTail" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M52 12 L20 44" stroke="url(#evTail)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="52" cy="12" r="6" fill="#FFFFFF" />
        <circle cx="52" cy="12" r="3" fill="#5EEAD4" />
      </svg>
    );
  }
  if (type === 'opposition') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id="evPlanet" cx="40%" cy="40%">
            <stop offset="0%" stopColor="#FFB347" />
            <stop offset="80%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#3B1607" />
          </radialGradient>
        </defs>
        <circle cx="14" cy="14" r="1.5" fill="#FFFFFF" opacity="0.8" />
        <circle cx="52" cy="50" r="1" fill="#FFFFFF" opacity="0.6" />
        <circle cx="50" cy="14" r="1.2" fill="#FFFFFF" opacity="0.7" />
        <circle cx="32" cy="32" r="18" fill="url(#evPlanet)" />
        <ellipse cx="32" cy="32" rx="28" ry="6" fill="none" stroke="#FFB347" strokeOpacity="0.45" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === 'conjunction') {
    return (
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <circle cx="14" cy="14" r="1" fill="#FFFFFF" opacity="0.7" />
        <circle cx="52" cy="50" r="1" fill="#FFFFFF" opacity="0.6" />
        <circle cx="22" cy="32" r="9" fill="#FCD34D" />
        <circle cx="44" cy="34" r="6" fill="#E2C896" />
      </svg>
    );
  }
  // meteor-shower
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <defs>
        <linearGradient id="evMeteor" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FCD34D" stopOpacity="1" />
        </linearGradient>
      </defs>
      <circle cx="14" cy="14" r="1" fill="#FFFFFF" opacity="0.7" />
      <circle cx="48" cy="20" r="1" fill="#FFFFFF" opacity="0.5" />
      <circle cx="22" cy="50" r="1" fill="#FFFFFF" opacity="0.6" />
      <path d="M10 40 L46 12" stroke="url(#evMeteor)" strokeWidth="3" strokeLinecap="round" />
      <path d="M22 52 L52 28" stroke="url(#evMeteor)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M30 56 L56 38" stroke="url(#evMeteor)" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
