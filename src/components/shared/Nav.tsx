'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppState } from '@/hooks/useAppState';
import { getPollinetStatus } from '@/lib/pollinet';
import { useEffect, useState } from 'react';

export default function Nav() {
  const pathname = usePathname();
  const { state } = useAppState();
  const [pollinet, setPollinet] = useState('🟢');
  const clubDone = state.walletConnected && state.membershipMinted && !!state.telescope;

  useEffect(() => {
    const s = getPollinetStatus();
    setPollinet(s.online ? '🟢' : '📡');
  }, []);

  const tabs = [
    { href: '/', label: 'Home' },
    { href: '/club', label: '🏛️ Club' },
    { href: '/sky', label: '🌌 Sky', locked: !clubDone },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#05080f]/90 backdrop-blur border-b border-[#1a2d4d]">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-[#c9a84c] font-bold text-lg" style={{ fontFamily: 'Georgia, serif' }}>
          🔭 ASTROMAN
        </Link>

        <div className="flex items-center gap-1">
          {tabs.map(tab => (
            <div key={tab.href} className="relative">
              {tab.locked ? (
                <span className="px-3 py-1.5 text-slate-600 text-sm flex items-center gap-1 cursor-not-allowed">
                  🔒 {tab.label}
                </span>
              ) : (
                <Link
                  href={tab.href}
                  className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                    pathname === tab.href
                      ? 'text-[#c9a84c] border-b-2 border-[#c9a84c]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500" title="Pollinet status">{pollinet}</span>
          {state.walletConnected && (
            <span className="text-[#34d399] font-mono text-xs bg-[#111c30] px-2 py-1 rounded">
              🟢 {state.walletAddress.slice(0, 4)}...{state.walletAddress.slice(-4)}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
