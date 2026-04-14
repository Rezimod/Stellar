'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ArrowUp, Sparkles } from 'lucide-react';
import { useLocale } from 'next-intl';

interface Msg { role: 'user' | 'assistant'; content: string; }

const INIT_MSG = (locale: string): Msg => ({
  role: 'assistant',
  content: locale === 'ka'
    ? 'გამარჯობა! მე ვარ ASTRA — შენი AI ასტრონომი. რით შემიძლია დაგეხმარო? ✦'
    : "Hi! I'm ASTRA — your AI astronomer. Ask me anything about the night sky. ✦",
});

export default function AstraPopup() {
  const locale = useLocale();
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
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, locale }),
      });
      if (!res.body) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      setMessages(m => [...m, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = dec.decode(value);
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            try { buf += JSON.parse(data).text ?? ''; } catch { /* noop */ }
          }
        }
        const captured = buf;
        setMessages(m => {
          const copy = [...m];
          copy[copy.length - 1] = { role: 'assistant', content: captured };
          return copy;
        });
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
        @keyframes astraOrb {
          0%, 100% { box-shadow: 0 0 20px rgba(124,58,237,0.5), 0 0 40px rgba(56,240,255,0.2); }
          50%       { box-shadow: 0 0 30px rgba(124,58,237,0.75), 0 0 60px rgba(56,240,255,0.35); }
        }
        @keyframes astraSlide {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes astraDot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.7); }
          40%            { opacity: 1;   transform: scale(1); }
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
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed z-[54]"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
          right: open ? 'calc(min(360px, calc(100vw - 32px)) - 44px + 20px)' : 20,
          width: 52, height: 52, borderRadius: '50%',
          background: open
            ? 'rgba(124,58,237,0.25)'
            : 'linear-gradient(135deg, #7c3aed 0%, #0891b2 100%)',
          border: open ? '1px solid rgba(124,58,237,0.4)' : 'none',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: open ? undefined : 'astraOrb 2.5s ease-in-out infinite',
          boxShadow: open ? undefined : '0 4px 24px rgba(0,0,0,0.5)',
          transition: 'background 0.2s ease, right 0.2s ease',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={open ? 'Close ASTRA' : 'Open ASTRA AI'}
      >
        {open ? <X size={20} color="rgba(255,255,255,0.7)" /> : <Sparkles size={22} color="#fff" />}
      </button>
    </>
  );
}
