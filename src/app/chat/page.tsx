'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useStellarUser } from '@/hooks/useStellarUser';
import { AuthModal } from '@/components/auth/AuthModal';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowUp, WifiOff } from 'lucide-react';
import Link from 'next/link';
import PageContainer from '@/components/layout/PageContainer';
import StarMark from '@/components/ui/StarMark';

interface Msg { role: 'user' | 'assistant'; content: string; }

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
  const t = useTranslations('chat');
  const ts = useTranslations('chat.suggestions');
  const tNav = useTranslations('nav');
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q');
  const autoSentRef = useRef(false);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingMsgIdx, setStreamingMsgIdx] = useState<number | null>(null);
  const [error, setError] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastSentRef = useRef('');

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 200); }, []);

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
  }, [input, loading, messages, locale, getAccessToken, login]);

  useEffect(() => {
    if (!initialQuery || autoSentRef.current) return;
    if (!authenticated || loading) return;
    autoSentRef.current = true;
    send(initialQuery);
  }, [initialQuery, authenticated, loading, send]);

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
    <PageContainer
      variant="content"
      className="flex flex-col astra-page"
      style={{ paddingTop: 16, paddingBottom: 16 }}
    >
      <style>{`
        @keyframes cursorBlink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        .streaming-cursor { animation: cursorBlink 0.7s ease-in-out infinite; color: var(--accent); }
        .astra-page {
          height: calc(100dvh - 56px);
        }
        .astra-panel {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.18);
        }
        @media (max-width: 640px) {
          .astra-page {
            height: calc(100dvh - 56px - 88px);
          }
          .astra-panel {
            border-radius: 14px;
          }
        }
      `}</style>

      <div className="astra-panel">

      {/* Header */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 18px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--text-primary)', margin: 0, lineHeight: 1.1, letterSpacing: '-0.015em' }}>
            ASTRA
            <span className="sr-only"> — AI Space Companion</span>
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            {t('subtitle')}
          </p>
        </div>

        <Link
          href="/field"
          aria-label={t('fieldLinkAria')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textDecoration: 'none',
            padding: '6px 8px',
            borderRadius: 6,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-accent-teal)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <WifiOff size={12} strokeWidth={1.75} />
          <span>{t('fieldLink')}</span>
        </Link>
      </div>

      {/* Messages */}
      <div ref={messagesRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">

        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-2 py-6 min-h-[100px] gap-5">
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--text-muted)',
              textAlign: 'center',
              margin: 0,
              lineHeight: 1.45,
            }}>
              {t('emptyHint')}
            </p>

            <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column' }}>
              <p style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.16em',
                margin: '0 0 4px',
              }}>
                {t('askAstra')}
              </p>
              {(['page_1', 'page_2', 'page_3'] as const).map(key => {
                const label = ts(key);
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (!authenticated) { setAuthOpen(true); return; }
                      send(label);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '13px 0',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      fontFamily: 'var(--font-body)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'color 0.18s, padding-left 0.18s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--color-accent-teal)';
                      e.currentTarget.style.paddingLeft = '6px';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-primary)';
                      e.currentTarget.style.paddingLeft = '0';
                    }}
                  >
                    <span style={{ flex: 1, paddingRight: 12 }}>{label}</span>
                    <ArrowUp size={14} color="var(--text-muted)" strokeWidth={1.75} style={{ transform: 'rotate(45deg)' }} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
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
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(94, 234, 212, 0.10)',
                border: '1px solid rgba(94, 234, 212, 0.20)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <StarMark size={10} style={{ color: 'var(--color-accent-teal)' }} />
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
              <StarMark size={10} style={{ color: 'var(--color-accent-teal)' }} />
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

        {error && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 8 }}>{error}</p>
            {lastSentRef.current && (
              <button
                onClick={retryLastMessage}
                style={{ fontSize: 12, color: 'var(--terracotta)', background: 'none', border: '1px solid rgba(255, 179, 71,0.3)', borderRadius: 8, padding: '4px 12px', cursor: 'pointer' }}
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
      {!authenticated && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          background: 'var(--canvas)',
          borderTop: '1px solid var(--border-subtle)',
          padding: '12px 16px',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, flex: 1 }}>{t('signInPrompt')}</p>
          <button onClick={() => setAuthOpen(true)} className="btn-primary" style={{ padding: '8px 20px', fontSize: 13, minHeight: 40, flexShrink: 0 }}>
            {tNav('signIn')} →
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      )}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--border-subtle)',
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
            placeholder={t('placeholder')}
            aria-label={t('placeholder')}
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
            aria-label={t('send')}
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

      </div>{/* /.astra-panel */}
    </PageContainer>
  );
}
