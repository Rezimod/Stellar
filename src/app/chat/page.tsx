'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale } from 'next-intl';
import { Send } from 'lucide-react';

interface Msg { role: 'user' | 'assistant'; content: string; }

const SUGGESTIONS = {
  night: ["What can I see tonight?", "How do I find Saturn tonight?", "What's the best beginner target?"],
  day:   ["What will be visible tonight?", "How do I collimate a reflector?", "What is the Orion Nebula?"],
};

export default function ChatPage() {
  const { authenticated, login } = usePrivy();
  const rawLocale = useLocale();
  const locale = rawLocale === 'ka' ? 'ka' : 'en';

  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: locale === 'ka'
      ? "გამარჯობა, მეამბავე. მე ვარ ASTRA — შენი ასტრონომიული ასისტენტი. მკითხე ნებისმიერი კითხვა ტელესკოპების, ღამის ცის ან კოსმოსის შესახებ. ✦"
      : "Hello, Observer. I'm ASTRA — your AI astronomer. Ask me anything about tonight's sky, telescopes, or the cosmos. ✦",
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hour = new Date().getHours();
  const suggestions = hour >= 20 || hour < 5 ? SUGGESTIONS.night : SUGGESTIONS.day;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 200); }, []);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    setError('');
    const next: Msg[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history: next.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          locale,
        }),
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]' || payload === '[ERROR]') break;
          setMessages(prev => {
            const u = [...prev];
            u[u.length - 1] = { role: 'assistant', content: u[u.length - 1].content + payload };
            return u;
          });
        }
      }
    } catch {
      setError(locale === 'ka' ? 'კავშირი დაიკარგა. სცადე ისევ.' : 'Connection lost. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>

      {/* Accessible page title */}
      <h1 className="sr-only">ASTRA — AI Space Companion</h1>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <div className="relative">
          <div className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(56,240,255,0.1)', border: '1px solid rgba(56,240,255,0.2)' }}>
            <span className="text-[#38F0FF] text-sm font-bold">✦</span>
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#34d399] border-2 border-[#070B14]" />
        </div>
        <div>
          <p className="text-white font-bold text-sm" style={{ fontFamily: 'Georgia, serif' }}>ASTRA</p>
          <p className="text-[#38F0FF]/50 text-[10px] font-mono">
            {locale === 'ka' ? 'შენი AI ასტრონომი' : 'Your AI Astronomer'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 scrollbar-hide">

        {/* Suggestion pills — show when only the greeting is present */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {suggestions.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-2 rounded-xl transition-all hover:border-[#38F0FF]/40 text-left"
                style={{ background: 'rgba(56,240,255,0.04)', border: '1px solid rgba(56,240,255,0.1)', color: 'rgba(56,240,255,0.75)' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mr-2 mt-0.5"
                style={{ background: 'rgba(56,240,255,0.1)', border: '1px solid rgba(56,240,255,0.2)' }}>
                <span className="text-[8px] font-bold text-[#38F0FF]">AI</span>
              </div>
            )}
            <div
              className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              style={m.role === 'user' ? {
                background: 'linear-gradient(135deg, rgba(255,209,102,0.15), rgba(204,154,51,0.1))',
                border: '1px solid rgba(255,209,102,0.2)',
                color: '#f5e8b8',
                borderBottomRightRadius: 6,
              } : {
                background: 'rgba(56,240,255,0.05)',
                border: '1px solid rgba(56,240,255,0.1)',
                color: '#cbd5e1',
                borderBottomLeftRadius: 6,
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
            <div className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ background: 'rgba(56,240,255,0.05)', border: '1px solid rgba(56,240,255,0.1)' }}>
              <div className="flex items-center gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#38F0FF]/60 animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="text-center text-xs text-amber-400/60">{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Auth gate overlay */}
      {!authenticated && (
        <div className="absolute inset-0 top-[113px] flex items-end justify-center pb-32 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-3 px-6 py-5 rounded-2xl text-center mx-4"
            style={{ background: 'rgba(7,11,20,0.95)', border: '1px solid rgba(56,240,255,0.15)', backdropFilter: 'blur(12px)' }}>
            <p className="text-white text-sm font-semibold">Sign in to chat with ASTRA</p>
            <p className="text-slate-500 text-xs">Free forever · No wallet needed</p>
            <button
              onClick={() => login()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #38F0FF, #1a8fa0)', color: '#070B14' }}
            >
              Sign In →
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06]"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="flex gap-2 max-w-2xl mx-auto">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={locale === 'ka' ? 'ჰკითხე ASTRA-ს ნებისმიერი რამ…' : 'Ask ASTRA anything about the sky…'}
            aria-label={locale === 'ka' ? 'შეტყობინება ASTRA-სთვის' : 'Message ASTRA'}
            disabled={!authenticated}
            className="flex-1 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-colors disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(56,240,255,0.1)' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(56,240,255,0.3)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(56,240,255,0.1)')}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || !authenticated}
            aria-label={locale === 'ka' ? 'გაგზავნა' : 'Send message'}
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 disabled:opacity-40"
            style={{
              background: input.trim() && !loading ? 'linear-gradient(135deg, #38F0FF, #1a8fa0)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(56,240,255,0.2)',
            }}
          >
            <Send size={14} className={input.trim() && !loading ? 'text-[#070B14]' : 'text-slate-600'} />
          </button>
        </div>
      </div>
    </div>
  );
}
