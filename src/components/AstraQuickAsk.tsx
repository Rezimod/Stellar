'use client';

import { useState, useRef, useEffect } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "What can I see tonight?",
  "Best time to observe?",
  "Tell me about Jupiter",
];

export default function AstraQuickAsk() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pulse once on first visit
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }];
    setMessages(next);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, locale: 'en' }),
      });
      if (!res.ok || !res.body) throw new Error('stream failed');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      setMessages(m => [...m, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const chunk = line.slice(6);
          if (chunk === '[DONE]') break;
          try {
            const { text } = JSON.parse(chunk);
            if (text) {
              setMessages(m => {
                const copy = [...m];
                copy[copy.length - 1] = { role: 'assistant', content: (copy[copy.length - 1]?.content ?? '') + text };
                return copy;
              });
            }
          } catch { /* skip bad json */ }
        }
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: 'Network error — please try again.' }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <>
      <style>{`
        @keyframes astraPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,209,102,0.3), 0 4px 20px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255,209,102,0.08), 0 4px 24px rgba(255,209,102,0.15); }
        }
        @keyframes astraSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask ASTRA"
          style={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            zIndex: 40,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #B8860B, #FFD166)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            animation: shown ? 'astraPulse 3s ease-in-out infinite' : 'none',
            transition: 'transform 0.15s ease',
          }}
          onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'; }}
          onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          ✦
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 72,
            right: 12,
            zIndex: 50,
            width: 'min(340px, calc(100vw - 24px))',
            maxHeight: 'min(440px, calc(100dvh - 100px))',
            borderRadius: 18,
            background: '#0D1321',
            border: '1px solid rgba(255,209,102,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'astraSlideUp 0.25s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--stars)' }}>✦</span>
              <span style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>ASTRA</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>AI Astronomer</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 && (
              <>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', margin: '8px 0' }}>
                  Ask ASTRA about tonight&apos;s sky
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      style={{
                        padding: '5px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                        background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)',
                        color: 'rgba(255,209,102,0.8)', whiteSpace: 'nowrap',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '85%',
                  padding: '8px 11px',
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  fontSize: 12,
                  lineHeight: 1.5,
                  background: m.role === 'user' ? 'rgba(255,209,102,0.12)' : 'rgba(255,255,255,0.05)',
                  border: m.role === 'user' ? '1px solid rgba(255,209,102,0.2)' : '1px solid rgba(255,255,255,0.07)',
                  color: m.role === 'user' ? 'rgba(255,209,102,0.9)' : 'rgba(255,255,255,0.85)',
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                  {loading && i === messages.length - 1 && m.role === 'assistant' && !m.content && (
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>▋</span>
                  )}
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.role === 'user' && (
              <div style={{ display: 'flex', gap: 4, paddingLeft: 4 }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--stars)', opacity: 0.4,
                    animation: `typingDot 1.2s ease-in-out ${i * 0.3}s infinite`,
                    display: 'inline-block',
                  }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '8px 10px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', gap: 6, flexShrink: 0,
          }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
              placeholder="Ask anything..."
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'white', outline: 'none',
              }}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: input.trim() && !loading ? 'rgba(255,209,102,0.2)' : 'rgba(255,255,255,0.04)',
                color: input.trim() && !loading ? 'var(--stars)' : 'rgba(255,255,255,0.2)',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s, color 0.2s',
                flexShrink: 0,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
