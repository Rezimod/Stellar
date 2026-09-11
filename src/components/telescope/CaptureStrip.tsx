'use client';

import { useTranslations } from 'next-intl';
import { Copy, Maximize2 } from 'lucide-react';

export type Capture = {
  id: string;
  dataUrl: string;
  filename: string;
  /** SHA-256 of the PNG bytes, hex. */
  hash: string;
  targetName: string;
  subs: number;
  exposureSec: number;
};

/** The frames taken this session, newest first, each with the fingerprint of its bytes. */
export default function CaptureStrip({ captures, onOpen }: { captures: Capture[]; onOpen: (c: Capture) => void }) {
  const t = useTranslations('observatory.telescope');
  if (captures.length === 0) return null;

  return (
    <section className="tel-captures" aria-label={t('capturesTitle')}>
      <ul className="tel-captures__list">
        {captures.map((c) => (
          <li key={c.id} className="tel-capture">
            <div className="tel-capture__art">
              {/* A data: URL from this session's own canvas — next/image has nothing to optimise. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.dataUrl} alt={c.targetName} />
              <button type="button" className="tel-capture__expand" aria-label={t('open')} onClick={() => onOpen(c)}>
                <Maximize2 size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="tel-capture__body">
              <p className="tel-capture__name" title={c.filename}>{c.filename}</p>
              <p className="tel-capture__row">
                <span className="tel-capture__hash">0x{c.hash.slice(0, 8)}…{c.hash.slice(-6)}</span>
                <button
                  type="button"
                  className="tel-capture__copy"
                  aria-label={t('copyHash')}
                  onClick={() => void navigator.clipboard?.writeText(c.hash)}
                >
                  <Copy size={13} aria-hidden="true" />
                </button>
                <span className="tel-capture__note">{t('simulatedNote')}</span>
              </p>
              <p className="tel-capture__meta">{t('subsLine', { count: c.subs, seconds: (c.subs * c.exposureSec).toFixed(c.exposureSec < 1 ? 2 : 0) })}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
