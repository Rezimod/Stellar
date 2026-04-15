'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUp } from 'lucide-react';
import { useLocation } from '@/lib/location';

interface Msg { role: 'user' | 'assistant'; content: string; }

export default function ChatPage() {
  const { authenticated, login } = usePrivy();
  const rawLocale = useLocale();
  const locale = rawLocale === 'ka' ? 'ka' : 'en';
  const { location } = useLocation();
  const ts = useTranslations('chat.suggestions');

  const [skySummary, setSkySummary] = useState<{ verified: boolean; cloudCover: number; visibility: string } | null>(null);

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 200); }, []);
  useEffect(() => {
    fetch(`/api/sky/verify?lat=${location.lat}&lon=${location.lon}`)
      .then(r => r.json())
      .then(d => setSkySummary({ verified: d.verified, cloudCover: d.cloudCover, visibility: d.visibility }))
      .catch(() => {});
  }, [location.lat, location.lon]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
          lat: location.lat,
          lon: location.lon,
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
          if (payload === '[DONE]') break;
          if (payload === '[ERROR]') throw new Error('stream_interrupted');
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
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 56px)' }}>
      <style>{`
        @keyframes cursorBlink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        .streaming-cursor { animation: cursorBlink 0.7s ease-in-out infinite; color: var(--accent); }
      `}</style>

      <h1 className="sr-only">ASTRA — AI Space Companion</h1>

      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(7,11,20,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* ASTRA avatar */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--accent-dim)',
          border: '1px solid var(--accent-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ color: 'var(--accent)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>✦</span>
        </div>

        {/* Name + subtitle */}
        <div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>ASTRA</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
            {locale === 'ka' ? 'AI ასტრონომი · ონლაინ' : 'AI Astronomer · Online'}
          </p>
        </div>

        {/* Online indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--success)' }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Sky card + suggestions — show when only greeting present */}
        {messages.length === 1 && (
          <div className="flex flex-col gap-3 mb-2">
            {skySummary && (
              <div className="card-base p-3">
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 12,
                  color: skySummary.verified ? 'var(--success)' : 'var(--warning)',
                  margin: '0 0 2px',
                }}>
                  {skySummary.verified ? '✦ Good conditions tonight' : '◑ Cloudy tonight'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>
                  {skySummary.cloudCover}% cloud · {skySummary.visibility} · Ask me what to observe
                </p>
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {([ts('page_1'), ts('page_2'), ts('page_3'), ts('page_4')] as string[]).map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="btn-ghost"
                  style={{ fontSize: 11, padding: '6px 12px', minHeight: 'auto' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isStreamingThis = loading && m.role === 'assistant' && i === messages.length - 1;
          if (m.role === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  className="animate-slide-up"
                  style={{
                    maxWidth: '78%',
                    background: 'var(--accent-dim)',
                    border: '1px solid var(--accent-border)',
                    borderRadius: '16px 16px 4px 16px',
                    padding: '10px 16px',
                    fontSize: 14,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
              </div>
            );
          }

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              {/* ASTRA avatar */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: 10 }}>✦</span>
              </div>
              <div
                className="animate-fade-in"
                style={{
                  maxWidth: '85%',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '16px 16px 16px 4px',
                  padding: '10px 16px',
                  fontSize: 14,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
                {isStreamingThis && m.content && <span className="streaming-cursor">▋</span>}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'var(--accent-dim)',
              border: '1px solid var(--accent-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'var(--accent)', fontSize: 10 }}>✦</span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-default)',
              borderRadius: '16px 16px 16px 4px',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {[0, 1, 2].map(n => (
                <span
                  key={n}
                  className="animate-bounce-dot"
                  style={{
                    display: 'inline-block',
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.3)',
                    animationDelay: `${n * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--warning)' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* Auth gate overlay */}
      {!authenticated && (
        <div className="absolute inset-0 top-[113px] flex items-end justify-center pb-32 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-3 px-6 py-5 rounded-2xl text-center mx-4"
            style={{ background: 'rgba(7,11,20,0.95)', border: '1px solid var(--accent-border)', backdropFilter: 'blur(12px)' }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', margin: 0 }}>Sign in to chat with ASTRA</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, margin: 0 }}>Free forever · No crypto knowledge needed</p>
            <button onClick={() => login()} className="btn-primary" style={{ padding: '8px 24px', fontSize: 13, minHeight: 40 }}>
              Sign In →
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(7,11,20,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, maxWidth: 672, margin: '0 auto' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={locale === 'ka' ? 'ჰკითხე ASTRA-ს ნებისმიერი რამ…' : 'Ask ASTRA anything about the sky…'}
            aria-label={locale === 'ka' ? 'შეტყობინება ASTRA-სთვის' : 'Message ASTRA'}
            disabled={!authenticated}
            rows={1}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border-default)',
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
              resize: 'none',
              minHeight: 44,
              maxHeight: 160,
              outline: 'none',
              transition: 'border-color 0.15s',
              opacity: !authenticated ? 0.4 : 1,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-border)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || !authenticated}
            aria-label={locale === 'ka' ? 'გაგზავნა' : 'Send message'}
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !loading && authenticated ? 'var(--gradient-accent)' : 'rgba(255,255,255,0.04)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading && authenticated ? 'pointer' : 'not-allowed',
              opacity: !input.trim() || loading || !authenticated ? 0.35 : 1,
              transition: 'background 0.15s, opacity 0.15s',
            }}
          >
            <ArrowUp size={18} color={input.trim() && !loading && authenticated ? '#070B14' : 'var(--text-muted)'} />
          </button>
        </div>
      </div>
    </div>
  );
}
