'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUp, WifiOff, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useLocation } from '@/lib/location';
import PageContainer from '@/components/layout/PageContainer';

interface Msg { role: 'user' | 'assistant'; content: string; }

const DEMO_MESSAGES: Msg[] = [
  { role: 'user', content: "What can I see tonight?" },
  { role: 'assistant', content: "Tonight looks great for stargazing! Jupiter is rising in the east around 9 PM at 35° altitude. The Moon is at 40% illumination — minimal interference. Saturn follows at 10 PM. Want me to check cloud cover for your location?" },
];

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { login, getAccessToken } = usePrivy();
  const { authenticated } = useStellarUser();
  const [authOpen, setAuthOpen] = useState(false);
  const rawLocale = useLocale();
  const locale = rawLocale === 'ka' ? 'ka' : 'en';
  const { location } = useLocation();
  const t = useTranslations('chat');
  const ts = useTranslations('chat.suggestions');
  const tf = useTranslations('chat.fieldBanner');
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  const autoSentRef = useRef(false);

  const [skySummary, setSkySummary] = useState<{ verified: boolean; cloudCover: number; visibility: string } | null>(null);

  const [messages, setMessages] = useState<Msg[]>([{
    role: 'assistant',
    content: locale === 'ka'
      ? "გამარჯობა, მეამბავე. მე ვარ ASTRA — შენი ასტრონომიული ასისტენტი. მკითხე ნებისმიერი კითხვა ტელესკოპების, ღამის ცის ან კოსმოსის შესახებ. ✦"
      : "Hello, Observer. I'm ASTRA — your AI astronomer. Ask me anything about tonight's sky, telescopes, or the cosmos. ✦",
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMsgIdx, setStreamingMsgIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentRef = useRef('');

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

  const send = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    lastSentRef.current = msg;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setError('');
    const next: Msg[] = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setLoading(true);
    setStreamingMsgIdx(next.length);
    const abortController = new AbortController();
    const streamTimeout = setTimeout(() => abortController.abort(), 5 * 60 * 1000);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) { login(); return; }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: msg,
          history: next.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
          locale,
          lat: location.lat,
          lon: location.lon,
        }),
        signal: abortController.signal,
      });
      if (!res.ok) {
        let serverMsg: string | null = null;
        try {
          const j = await res.clone().json();
          if (typeof j?.error === 'string') serverMsg = j.error;
        } catch { /* not JSON */ }
        if (res.status === 401) {
          setError(serverMsg ?? (locale === 'ka' ? 'სესია ამოიწურა. გთხოვ, თავიდან შეხვიდე.' : 'Session expired. Please sign in again.'));
          login();
          return;
        }
        if (res.status === 429) {
          setError(serverMsg ?? (locale === 'ka' ? 'ცოტა მოიცადე და სცადე ისევ.' : 'Slow down — try again in a minute.'));
          return;
        }
        if (res.status === 503) {
          setError(serverMsg ?? (locale === 'ka' ? 'ASTRA დროებით მიუწვდომელია.' : 'ASTRA is temporarily unavailable.'));
          return;
        }
        throw new Error('Stream failed');
      }
      if (!res.body) throw new Error('Stream failed');
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
          if (payload === '[DONE]') { setStreamingMsgIdx(null); break; }
          if (payload === '[ERROR]') throw new Error('stream_interrupted');
          const decoded = payload.replace(/\u2028/g, '\n');
          setMessages(prev => {
            const u = [...prev];
            u[u.length - 1] = { role: 'assistant', content: u[u.length - 1].content + decoded };
            return u;
          });
        }
      }
    } catch (err) {
      setStreamingMsgIdx(null);
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      setError(isTimeout
        ? (locale === 'ka' ? 'კავშირის ვადა გავიდა. სცადე ისევ.' : 'Connection timed out. Please try again.')
        : (locale === 'ka' ? 'კავშირი დაიკარგა. სცადე ისევ.' : 'Connection lost. Try again.'));
    } finally {
      clearTimeout(streamTimeout);
      setStreamingMsgIdx(null);
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, messages, locale, location.lat, location.lon, getAccessToken, login]);

  useEffect(() => {
    if (!initialQuery || autoSentRef.current) return;
    if (!authenticated || loading) return;
    autoSentRef.current = true;
    send(initialQuery);
  }, [initialQuery, authenticated, loading, send]);

  const displayMessages = authenticated ? messages : [messages[0], ...DEMO_MESSAGES];

  const retryLastMessage = () => {
    const msg = lastSentRef.current;
    if (!msg) return;
    setMessages(prev => {
      const lastUserIdx = [...prev].map(m => m.role).lastIndexOf('user');
      return lastUserIdx >= 0 ? prev.slice(0, lastUserIdx) : prev;
    });
    setError('');
    setTimeout(() => send(msg), 50);
  };

  return (
    <PageContainer variant="content" className="flex flex-col -mb-24 sm:mb-0" style={{ height: 'calc(100dvh - 56px)' }}>
      <style>{`
        @keyframes cursorBlink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        .streaming-cursor { animation: cursorBlink 0.7s ease-in-out infinite; color: var(--accent); }
      `}</style>

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
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
            ASTRA
            <span className="sr-only"> — AI Space Companion</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {t('subtitle')}
          </p>
        </div>

        {/* Online indicator */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">

        {/* Sky card — show when only greeting present */}
        {messages.length === 1 && skySummary && (
          <div className="card-base p-3 mb-2">
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

        {/* Field Mode banner — idle state only */}
        {messages.length === 1 && (
          <Link
            href="/field"
            aria-label={tf('cta')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 12,
              border: '1px solid var(--accent-border)',
              background: 'var(--accent-dim)',
              textDecoration: 'none',
              marginBottom: 8,
            }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(94, 234, 212, 0.10)',
              border: '1px solid rgba(94, 234, 212, 0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <WifiOff size={14} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 2px',
              }}>
                {tf('label')}
              </p>
              <p style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                margin: 0,
                lineHeight: 1.4,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {tf('body')}
              </p>
            </div>
            <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          </Link>
        )}

        {displayMessages.map((m, i) => {
          const isStreamingThis = streamingMsgIdx === i && m.role === 'assistant';
          if (m.role === 'user') {
            return (
              <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  className="animate-slide-up"
                  style={{
                    maxWidth: '78%',
                    background: 'rgba(94, 234, 212, 0.10)',
                    border: '1px solid rgba(94, 234, 212, 0.20)',
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
                background: 'rgba(94, 234, 212, 0.10)',
                border: '1px solid rgba(94, 234, 212, 0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'var(--color-accent-teal)', fontSize: 10 }}>✦</span>
              </div>
              <div
                className="animate-fade-in"
                style={{
                  maxWidth: '85%',
                  background: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border-subtle)',
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
              background: 'rgba(94, 234, 212, 0.10)',
              border: '1px solid rgba(94, 234, 212, 0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'var(--color-accent-teal)', fontSize: 10 }}>✦</span>
            </div>
            <div style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '16px 16px 16px 4px',
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {[0, 1, 2].map(n => (
                <span key={n} className="typing-dot" />
              ))}
            </div>
          </div>
        )}

        {/* Suggestion pills — show after every assistant response when not loading */}
        {displayMessages[displayMessages.length - 1]?.role === 'assistant' && !loading && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {([ts('page_1'), ts('page_2'), ts('page_3'), ts('page_4')] as string[]).map(s => (
              <button
                key={s}
                onClick={() => authenticated ? send(s) : setAuthOpen(true)}
                className="btn-ghost"
                style={{ fontSize: 11, padding: '6px 12px', minHeight: 'auto' }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 8 }}>{error}</p>
            {lastSentRef.current && (
              <button
                onClick={retryLastMessage}
                style={{ fontSize: 12, color: 'var(--terracotta)', background: 'none', border: '1px solid rgba(255, 209, 102,0.3)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
              >
                Retry
              </button>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{ position: 'relative' }}>
      {!authenticated && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          background: 'rgba(7,11,20,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px 16px',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, flex: 1 }}>Sign in to chat with ASTRA</p>
          <button onClick={() => setAuthOpen(true)} className="btn-primary" style={{ padding: '8px 20px', fontSize: 13, minHeight: 40, flexShrink: 0 }}>
            Sign In →
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      )}
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
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 999,
              padding: '12px 18px',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              color: 'var(--text-primary)',
              resize: 'none',
              minHeight: 44,
              maxHeight: 160,
              outline: 'none',
              transition: 'border-color 0.2s, background 0.2s',
              opacity: !authenticated ? 0.4 : 1,
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--color-accent-teal)';
              e.currentTarget.style.background = 'var(--color-bg-card-strong)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)';
              e.currentTarget.style.background = 'var(--color-bg-card)';
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading || !authenticated}
            aria-label={locale === 'ka' ? 'გაგზავნა' : 'Send message'}
            style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !loading && authenticated ? 'var(--gradient-primary)' : 'var(--color-bg-card)',
              border: input.trim() && !loading && authenticated ? 'none' : '1px solid var(--color-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: input.trim() && !loading && authenticated ? 'pointer' : 'not-allowed',
              opacity: !input.trim() || loading || !authenticated ? 0.45 : 1,
              boxShadow: input.trim() && !loading && authenticated ? 'var(--shadow-glow-teal)' : 'none',
              transition: 'background 0.2s, opacity 0.2s, transform 0.2s, box-shadow 0.2s',
            }}
          >
            <ArrowUp size={18} color={input.trim() && !loading && authenticated ? 'var(--canvas)' : 'var(--text-muted)'} />
          </button>
        </div>
      </div>
      </div>
    </PageContainer>
  );
}
