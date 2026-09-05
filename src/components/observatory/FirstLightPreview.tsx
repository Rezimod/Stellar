'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function FirstLightPreview({ url }: { url: string }) {
  const t = useTranslations('observatory.firstLight');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus('loading');
      setSource(`${url}&preview=${attempt}`);
    }, 600);
    return () => clearTimeout(timer);
  }, [url, attempt]);

  const current = source === `${url}&preview=${attempt}`;
  return (
    <section className="border p-4" style={{ borderColor: 'var(--obs-rule)', background: 'var(--surface)' }}>
      <h2 className="obs-label">{t('sheet')}</h2>
      <div className="mt-3" aria-busy={!current || status === 'loading'}>
        {(!current || status === 'loading') && <p role="status" className="text-sm">{t('previewLoading')}</p>}
        {source && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={source}
            src={source}
            alt={t('previewAlt')}
            width={1000}
            height={1414}
            onLoad={() => setStatus('ready')}
            onError={() => setStatus('error')}
            className="w-full border"
            style={{ borderColor: 'var(--obs-rule)', display: current && status === 'ready' ? 'block' : 'none' }}
          />
        )}
        {current && status === 'error' && (
          <div role="alert">
            <p className="text-sm">{t('previewFailed')}</p>
            <button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 min-h-11 underline">
              {t('previewRetry')}
            </button>
          </div>
        )}
      </div>
      {current && status === 'ready' && (
        <a href={source} download="stellar-first-light-preview.png" className="mt-3 inline-flex min-h-11 items-center text-sm underline">
          {t('downloadPreview')}
        </a>
      )}
      <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('previewNote')}</p>
    </section>
  );
}
