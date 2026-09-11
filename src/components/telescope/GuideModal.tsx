'use client';

import { useTranslations } from 'next-intl';
import Modal from './Modal';

const STEPS = [1, 2, 3, 4, 5, 6, 7] as const;

/** Seven steps from an empty console to a frame of your own. */
export default function GuideModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('observatory.telescope.guide');
  return (
    <Modal title={t('title')} closeLabel={t('close')} onClose={onClose}>
      <p className="tel-guide__eyebrow">{t('eyebrow')}</p>
      <h2 className="tel-guide__title">{t('title')}</h2>
      <p className="tel-guide__lead">{t('lead')}</p>
      <ol className="tel-guide">
        {STEPS.map((n) => (
          <li key={n} className="tel-guide__step">
            <span className="tel-guide__n" aria-hidden="true">{n}</span>
            <div>
              <h3 className="tel-guide__step-title">{t(`s${n}Title`)}</h3>
              <p className="tel-guide__step-text">{t(`s${n}Text`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="tel-modal__foot">
        <button type="button" className="tel-btn tel-btn--go" onClick={onClose}>{t('cta')}</button>
      </div>
    </Modal>
  );
}
