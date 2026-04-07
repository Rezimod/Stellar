'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  loading?: boolean;
}

export default function ChatPage() {
  const t = useTranslations('chat');

  const welcomeMessage: Message = { role: 'assistant', content: t('welcome') };

  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resizeTextarea = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 96) + 'px'; // max ~3 rows
  };

  const handleClear = useCallback(() => {
    setMessages([{ role: 'assistant', content: t('welcome') }]);
    setInput('');
  }, [t]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: Message = { role: 'user', content: text };
    const loadingMsg: Message = { role: 'assistant', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setIsLoading(true);

    try {
      const history = messages.filter(m => !m.loading).slice(-8);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply ?? "Sorry, I couldn't reach ASTRA. Try again.";

      setMessages(prev => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = { role: 'assistant', content: reply };
        return next;
      });
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: "Sorry, I couldn't reach ASTRA. Try again." };
        return next;
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100dvh - 64px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
          {t('title')}
        </h1>
        <button
          onClick={handleClear}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
        >
          {t('clearChat')}
        </button>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5 text-[10px] text-white"
                style={{ background: 'rgba(139,92,246,0.5)', border: '1px solid rgba(139,92,246,0.4)' }}
              >
                ✦
              </div>
            )}

            <div
              className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#8B5CF6]/20 border border-[#8B5CF6]/30 rounded-2xl rounded-tr-sm text-white'
                  : 'bg-[#1A1F2E] border border-white/5 rounded-2xl rounded-tl-sm text-slate-200'
              }`}
            >
              {msg.loading ? (
                <span className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(n => (
                    <span
                      key={n}
                      className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce"
                      style={{ animationDelay: `${n * 150}ms` }}
                    />
                  ))}
                </span>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div
        className="flex-shrink-0 border-t border-white/10 px-4 pt-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => { setInput(e.target.value); resizeTextarea(); }}
            onKeyDown={handleKeyDown}
            placeholder={t('placeholder')}
            disabled={isLoading}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#8B5CF6]/50 transition-colors disabled:opacity-50"
            style={{ minHeight: '40px', maxHeight: '96px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#8B5CF6] hover:bg-[#7C3AED] text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('send')}
          </button>
        </div>
      </div>

    </div>
  );
}
