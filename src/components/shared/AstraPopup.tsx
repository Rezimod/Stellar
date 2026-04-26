'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ArrowUp, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';
import { usePrivy } from '@privy-io/react-auth';

interface Msg { role: 'user' | 'assistant'; content: string; }

const INIT_MSG = (locale: string): Msg => ({
  role: 'assistant',
  content: locale === 'ka'
    ? 'გამარჯობა! მე ვარ ASTRA — შენი AI ასტრონომი. რით შემიძლია დაგეხმარო? ✦'
    : "Hi! I'm ASTRA — your AI astronomer. Ask me anything about the night sky. ✦",
});

export default function AstraPopup() {
  const locale = useLocale();
  const { authenticated, getAccessToken, login } = usePrivy();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([INIT_MSG(locale)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    if (!authenticated) {
      login();
      return;
    }
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const token = await getAccessToken().catch(() => null);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: msg,
          history: messages.filter(m => m.content).map(m => ({ role: m.role, content: m.content })),
          locale,
        }),
      });
      if (!res.ok || !res.body) throw new Error('chat failed');

      setMessages(m => [...m, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += dec.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') break;
          if (payload === '[ERROR]') throw new Error('stream error');
          const text = payload.replace(/\u2028/g, '\n');
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: copy[copy.length - 1].content + text,
            };
            return copy;
          });
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Try again.' }]);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      <style>{`
        @keyframes astraSlide {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes astraDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
          40%            { opacity: 1;   transform: scale(1); }
        }
        @keyframes astraOrbit {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes astraLive {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
        @keyframes astraReticle {
          0%, 100% { opacity: 0.85; }
          50%      { opacity: 1; }
        }
        .astra-fab-wrap:hover .astra-fab-label {
          opacity: 1;
          transform: translateY(-50%) translateX(0);
        }
        .astra-fab-wrap:hover .astra-fab-disc {
          border-color: rgba(255,209,102,0.55);
        }
        .astra-fab-wrap:hover .astra-fab-orbit {
          animation-duration: 4s;
        }
        .astra-dot:nth-child(1) { animation: astraDot 1.2s infinite 0s; }
        .astra-dot:nth-child(2) { animation: astraDot 1.2s infinite 0.2s; }
        .astra-dot:nth-child(3) { animation: astraDot 1.2s infinite 0.4s; }
      `}</style>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-[55] flex flex-col"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
            right: 20,
            width: 'min(360px, calc(100vw - 32px))',
            height: 'min(520px, calc(100dvh - 140px))',
            background: 'rgba(6, 9, 18, 0.97)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(124,58,237,0.3)',
            borderRadius: 20,
            boxShadow: '0 16px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
            animation: 'astraSlide 0.2s ease forwards',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid rgba(124,58,237,0.15)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(124,58,237,0.5)' }}>
              <Sparkles size={15} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd', letterSpacing: '0.05em' }}>ASTRA</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>AI Astronomer</div>
            </div>
            <button onClick={() => setOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              <X size={13} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5" style={{ scrollbarWidth: 'none' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div style={{
                  maxWidth: '85%', fontSize: 13, lineHeight: 1.5, padding: '8px 12px', borderRadius: 14,
                  ...(m.role === 'user'
                    ? { background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.35)', color: '#e9d5ff', borderBottomRightRadius: 4 }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.88)', borderBottomLeftRadius: 4 }),
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, borderBottomLeftRadius: 4, padding: '10px 14px', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="astra-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa' }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid rgba(124,58,237,0.12)' }}>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about the night sky..."
                rows={1}
                style={{
                  flex: 1, resize: 'none', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(124,58,237,0.25)', borderRadius: 12,
                  color: 'rgba(255,255,255,0.9)', fontSize: 13, padding: '8px 12px',
                  outline: 'none', maxHeight: 100, lineHeight: 1.5,
                  scrollbarWidth: 'none',
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
                }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: input.trim() && !loading ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'rgba(255,255,255,0.06)',
                  border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.25)',
                  transition: 'all 0.18s ease',
                  boxShadow: input.trim() && !loading ? '0 0 16px rgba(124,58,237,0.4)' : undefined,
                }}
              >
                <ArrowUp size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      {open ? (
        <button
          onClick={() => setOpen(false)}
          className="fixed z-[54]"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 96px)',
            right: 'calc(min(360px, calc(100vw - 32px)) - 44px + 24px)',
            width: 44, height: 44, borderRadius: '50%',
            background: 'rgba(255,209,102,0.10)',
            border: '1px solid rgba(255,209,102,0.35)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'right 0.2s ease',
            WebkitTapHighlightColor: 'transparent',
          }}
          aria-label="Close ASTRA"
        >
          <X size={18} color="rgba(255,209,102,0.75)" />
        </button>
      ) : (
        <div
          className="astra-fab-wrap fixed z-[54]"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 96px)',
            right: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 0,
          }}
        >
          {/* Hover label */}
          <span
            className="astra-fab-label"
            aria-hidden
            style={{
              position: 'absolute',
              right: 60,
              top: '50%',
              transform: 'translateY(-50%) translateX(6px)',
              fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'rgba(255,209,102,0.85)',
              background: 'rgba(8,10,18,0.92)',
              border: '1px solid rgba(255,209,102,0.22)',
              borderRadius: 4,
              padding: '5px 9px',
              whiteSpace: 'nowrap',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.18s ease, transform 0.18s ease',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
            }}
          >
            Ask ASTRA
          </span>

          <button
            onClick={() => setOpen(true)}
            className="astra-fab-disc"
            style={{
              position: 'relative',
              width: 52, height: 52, borderRadius: '50%',
              background: 'radial-gradient(circle at 50% 50%, #131524 0%, #07090F 70%)',
              border: '1px solid rgba(255,209,102,0.28)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 18px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.02)',
              transition: 'border-color 0.2s ease, transform 0.15s ease',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            aria-label="Open ASTRA AI"
          >
            {/* Reticle crosshair */}
            <svg
              width="22" height="22" viewBox="0 0 22 22" aria-hidden
              style={{
                color: 'rgba(255,209,102,0.92)',
                animation: 'astraReticle 3.2s ease-in-out infinite',
              }}
            >
              <circle cx="11" cy="11" r="3.5" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="11" cy="11" r="1" fill="currentColor" />
              <line x1="11" y1="2"  x2="11" y2="6"  stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <line x1="11" y1="16" x2="11" y2="20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <line x1="2"  y1="11" x2="6"  y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
              <line x1="16" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>

            {/* Orbiting satellite ring */}
            <span
              className="astra-fab-orbit"
              aria-hidden
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '1px dashed rgba(255,209,102,0.18)',
                animation: 'astraOrbit 8s linear infinite',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  left: '50%',
                  width: 4, height: 4, borderRadius: '50%',
                  background: 'var(--stars)',
                  transform: 'translateX(-50%)',
                  boxShadow: '0 0 4px rgba(255,209,102,0.7)',
                }}
              />
            </span>

            {/* Live indicator */}
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 6, right: 6,
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--success)',
                animation: 'astraLive 1.8s ease-in-out infinite',
              }}
            />
          </button>
        </div>
      )}
    </>
  );
}
