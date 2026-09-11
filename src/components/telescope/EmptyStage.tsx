'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Info, Telescope } from 'lucide-react';

/** No telescope on the line yet: one thing to do, and two ways to learn how. */
export default function EmptyStage({ onSelect, onGuide }: { onSelect: () => void; onGuide: () => void }) {
  const t = useTranslations('observatory.telescope');
  return (
    <div className="tel-empty">
      <span className="tel-empty__icon" aria-hidden="true"><Telescope size={56} strokeWidth={1.25} /></span>
      <h2 className="tel-empty__title">{t('noTelescope')}</h2>
      <p className="tel-empty__lead">{t('noTelescopeLead')}</p>
      <button type="button" className="tel-btn tel-btn--solid tel-empty__cta" onClick={onSelect}>
        {t('selectButton')}
        <Telescope size={16} aria-hidden="true" />
      </button>
      <div className="tel-empty__links">
        <Link href="/observatory/how-it-works">{t('howObservation')}<Info size={15} aria-hidden="true" /></Link>
        <button type="button" onClick={onGuide}>{t('howAstrophoto')}<Info size={15} aria-hidden="true" /></button>
      </div>
    </div>
  );
}
