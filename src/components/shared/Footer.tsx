'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, AlignLeft, ExternalLink } from 'lucide-react';

const LINKS = [
  { href: '/sky',         label: 'Sky Forecast',  desc: "Tonight's conditions" },
  { href: '/missions',    label: 'Missions',       desc: 'Observe & earn Stars' },
  { href: '/chat',        label: 'ASTRA AI',       desc: 'Your AI astronomer' },
  { href: '/darksky',     label: 'Dark Sky Map',   desc: 'Find dark sky sites' },
  { href: '/marketplace', label: 'Marketplace',    desc: 'Shop telescopes' },
  { href: '/nfts',        label: 'Discoveries',    desc: 'Your on-chain NFTs' },
  { href: '/profile',     label: 'Profile',        desc: 'Account & stats' },
];

export default function Footer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Sidebar */}
      {open && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(7,11,20,0.75)', backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}
          />

          {/* Panel */}
          <div
            className="absolute top-0 left-0 h-full flex flex-col"
            style={{
              width: 'min(300px, 85vw)',
              background: 'rgba(10,14,26,0.98)',
              borderRight: '1px solid rgba(255,255,255,0.08)',
              animation: 'slideInLeft 0.22s cubic-bezier(0.22,1,0.36,1)',
              willChange: 'transform',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span style={{ color: '#FFD166', fontSize: 14, letterSpacing: '0.18em', fontWeight: 800, fontFamily: 'monospace' }}>
                ✦ STELLAR
              </span>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                aria-label="Close menu"
              >
                <X size={13} />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-3" style={{ scrollbarWidth: 'none' }}>
              {LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col px-4 py-3 rounded-xl mb-0.5 group transition-all"
                  style={{ textDecoration: 'none', background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span className="text-sm font-semibold transition-colors" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {link.label}
                  </span>
                  <span className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {link.desc}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Footer of sidebar */}
            <div
              className="px-5 py-4 flex-shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <a
                href="https://stellarrclub.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mb-2 transition-opacity hover:opacity-70"
                style={{ color: '#34d399', fontSize: 11, textDecoration: 'none' }}
              >
                stellarrclub.vercel.app <ExternalLink size={9} />
              </a>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, margin: 0 }}>
                © 2026 Stellar · Built on Solana Devnet
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer bar */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0);     }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      <footer
        className="relative z-10 mt-auto sm:pb-0"
        style={{
          background: 'rgba(7,11,20,0.85)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)',
        }}
      >
        {/* Mobile: compact single-row footer */}
        <div className="sm:hidden flex items-center justify-between px-4 py-4">
          {/* Sidebar trigger — top left */}
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            aria-label="Open navigation"
          >
            <AlignLeft size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Links</span>
          </button>

          {/* Center brand */}
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span style={{ color: '#FFD166', fontSize: 13, letterSpacing: '0.2em', fontWeight: 800, fontFamily: 'monospace' }}>
              ✦ STELLAR
            </span>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, margin: 0, letterSpacing: '0.04em' }}>
              Built on Solana
            </p>
          </div>

          {/* Right spacer (matches left button width for centering) */}
          <div style={{ width: 72 }} />
        </div>

        {/* Desktop: full-width layout */}
        <div className="hidden sm:grid max-w-5xl mx-auto px-6 py-6"
          style={{ gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
          {/* Left: sidebar trigger */}
          <div>
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:bg-white/[0.05] group"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              aria-label="Open navigation"
            >
              <AlignLeft size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>Explore</span>
            </button>
          </div>

          {/* Center: brand */}
          <div className="flex flex-col items-center gap-1 text-center">
            <span style={{ color: '#FFD166', fontSize: 16, letterSpacing: '0.22em', fontWeight: 800, fontFamily: 'monospace' }}>
              ✦ STELLAR
            </span>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0 }}>
              Observe the Night Sky
            </p>
            <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, margin: 0 }}>
              © 2026 · Built on Solana
            </p>
          </div>

          {/* Right: empty / future use */}
          <div />
        </div>
      </footer>
    </>
  );
}
