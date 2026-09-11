'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import Modal from './Modal';

const WAYS = [
  { key: 'live', href: null, photo: '/sky/targets/jupiter.jpg' },
  { key: 'requests', href: '/observatory/requests', photo: '/sky/targets/m42.jpg' },
  { key: 'reserve', href: '/observatory/tbilisi-01', photo: '/sky/targets/moon.jpg' },
  { key: 'captures', href: '/observatory/captures', photo: '/sky/targets/m31.jpg' },
] as const;

/** The first thing a visitor sees: what this is, and the four doors into it. */
export default function WelcomeModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('observatory.telescope.welcome');
  return (
    <Modal title={t('title')} closeLabel={t('close')} onClose={onClose} wide>
      <div className="tel-welcome__head">
        <h2 className="tel-welcome__title">{t('title')}</h2>
        <p className="tel-welcome__lead">{t('lead')}</p>
        <p className="tel-welcome__text">{t('text')}</p>
      </div>
      <ul className="tel-ways">
        {WAYS.map((w) => (
          <li key={w.key} className="tel-way">
            <span className="tel-way__tag">{t(`${w.key}Tag`)}</span>
            <span className="tel-way__art"><Image src={w.photo} alt="" fill sizes="(min-width: 1024px) 280px, 90vw" /></span>
            <h3 className="tel-way__title">{t(`${w.key}Title`)}</h3>
            <p className="tel-way__text">{t(`${w.key}Text`)}</p>
            <ul className="tel-way__points">
              {t(`${w.key}Points`).split('|').map((line) => <li key={line}>{line}</li>)}
            </ul>
            {w.href ? (
              <Link href={w.href} className="tel-way__link">{t('open')}</Link>
            ) : (
              <button type="button" className="tel-way__link" onClick={onClose}>{t('start')}</button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}
