'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Minimize2, Maximize2, Radio } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'How do I find Jupiter tonight?',
  'Best eyepiece for the Moon?',
  'How to focus my telescope?',
  'What is the Orion Nebula?',
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#38F0FF]/60 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export default function AstroChat() {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // On mobile: sit above the bottom nav (which is ~64px). On desktop: near the corner.
  const btnBottom = isMobile ? '5.5rem' : '1.5rem';
  const btnRight = isMobile ? '1rem' : '1.5rem';
  const winBottom = isMobile ? 'calc(5.5rem + 68px)' : 'calc(1.5rem + 68px)';

  useEffect(() => {
    if (open && messages.length === 0) {
      // Greeting message on first open
      setMessages([{
        role: 'assistant',
        content: "Hello, Observer. I'm ASTRA — your astronomy assistant. Ask me anything about telescopes, finding tonight's targets, or observing techniques. ✦",
      }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setError('');
    const newMessages: Message[] = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch {
      setError('Connection lost. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat window */}
      {open && (
        <div
          className="fixed z-50 flex flex-col"
          style={{
            bottom: expanded ? '1rem' : winBottom,
            right: expanded ? '1rem' : btnRight,
            left: expanded ? '1rem' : 'auto',
            width: expanded ? 'auto' : 'min(380px, calc(100vw - 2rem))',
            height: expanded ? 'calc(100vh - 2rem)' : '480px',
            background: 'linear-gradient(160deg, #080e1e 0%, #060b18 100%)',
            border: '1px solid rgba(56,240,255,0.2)',
            borderRadius: '20px',
            boxShadow: '0 0 60px rgba(56,240,255,0.08), 0 20px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              borderBottom: '1px solid rgba(56,240,255,0.1)',
              background: 'rgba(56,240,255,0.03)',
              borderRadius: '20px 20px 0 0',
            }}
          >
            {/* Status indicator */}
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(56,240,255,0.08)', border: '1px solid rgba(56,240,255,0.2)' }}>
                <Radio size={14} className="text-[#38F0FF]" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34d399] border-2"
                style={{ borderColor: '#080e1e' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">ASTRA</p>
              <p className="text-[#38F0FF]/50 text-[10px] font-mono mt-0.5">MISSION CONTROL · ONLINE</p>
            </div>
            {/* Scan line decoration */}
            <div className="flex items-center gap-1 mr-1">
              {[3,5,4,6,3].map((h,i) => (
                <div key={i} className="w-0.5 rounded-full bg-[#38F0FF]/20" style={{ height: `${h * 2}px` }} />
              ))}
            </div>
            <button onClick={() => setExpanded(e => !e)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-[#38F0FF] transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
            <button onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5"
                    style={{ background: 'rgba(56,240,255,0.1)', border: '1px solid rgba(56,240,255,0.2)' }}>
                    <span className="text-[8px] font-bold text-[#38F0FF]">AI</span>
                  </div>
                )}
                <div
                  className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={m.role === 'user' ? {
                    background: 'linear-gradient(135deg, rgba(255,209,102,0.15), rgba(204,154,51,0.1))',
                    border: '1px solid rgba(255,209,102,0.2)',
                    color: '#f5e8b8',
                    borderBottomRightRadius: '6px',
                  } : {
                    background: 'rgba(56,240,255,0.05)',
                    border: '1px solid rgba(56,240,255,0.1)',
                    color: '#cbd5e1',
                    borderBottomLeftRadius: '6px',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5"
                  style={{ background: 'rgba(56,240,255,0.1)', border: '1px solid rgba(56,240,255,0.2)' }}>
                  <span className="text-[8px] font-bold text-[#38F0FF]">AI</span>
                </div>
                <div className="rounded-2xl rounded-bl-md"
                  style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {error && (
              <p className="text-center text-xs text-amber-400/60">{error}</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips (only when no user messages yet) */}
          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[10px] px-2.5 py-1.5 rounded-full transition-all hover:border-[#38F0FF]/40"
                  style={{
                    background: 'rgba(56,240,255,0.04)',
                    border: '1px solid rgba(56,240,255,0.12)',
                    color: 'rgba(56,240,255,0.7)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div
            className="px-3 pb-3 pt-2 flex gap-2 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(56,240,255,0.07)' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about telescopes, targets, technique…"
              className="flex-1 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(56,240,255,0.1)',
              }}
              onFocus={e => (e.target.style.borderColor = 'rgba(56,240,255,0.3)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(56,240,255,0.1)')}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
              style={{
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #38F0FF, #1a8fa0)'
                  : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(56,240,255,0.2)',
              }}
            >
              <Send size={14} className={input.trim() && !loading ? 'text-[#070B14]' : 'text-slate-600'} />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button + tooltip */}
      {!open && (
        <div className="fixed z-50 flex flex-col items-end gap-2" style={{ bottom: btnBottom, right: btnRight }}>
          {messages.length === 0 && (
            <div
              className="px-3 py-2 rounded-xl text-[11px] text-[#38F0FF] max-w-[180px] text-right leading-snug"
              style={{
                background: 'rgba(8,14,30,0.95)',
                border: '1px solid rgba(56,240,255,0.2)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              Ask me about telescopes and tonight&apos;s sky ✦
            </div>
          )}
          <button
            onClick={() => setOpen(true)}
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 active:scale-95 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(56,240,255,0.9), rgba(26,143,160,0.9))',
              border: '1px solid rgba(56,240,255,0.4)',
              boxShadow: '0 0 30px rgba(56,240,255,0.35), 0 8px 24px rgba(0,0,0,0.4)',
            }}
            aria-label="Open ASTRA astronomy assistant"
          >
            <Radio size={22} className="text-[#070B14]" />
          </button>
        </div>
      )}
    </>
  );
}
