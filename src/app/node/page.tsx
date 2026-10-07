import type { Metadata } from 'next';
import Link from 'next/link';
import StellarShell from '@/components/stellar/StellarShell';
import { rarityInfo } from '@/lib/rarity';
import { TIER_PERKS } from '@/lib/stellar/perks';

export const metadata: Metadata = {
  title: 'Live Telescope — coming soon · Stellar',
  description:
    'First light in November 2026. Holders will choose what it photographs, sit in on live sessions, and take the controls.',
};

const SOON = TIER_PERKS.filter((t) => t.rarity !== 'legendary');

/** The telescope before first light: what it will open, and where to go meanwhile. */
export default function TelescopePage() {
  return (
    <StellarShell>
      <section className="sd-hero2 sd-soon">
        <div className="sd-container">
          <h1 className="sd-hero2__title">
            <span>Live Telescope</span>{' '}
            <span>
              <em>Coming soon</em>
            </span>
          </h1>
          <p className="sd-hero2__sub">
            First light in November 2026. Holders will choose what it photographs, sit in on live sessions, and take the controls.
          </p>
          <ul className="sd-pub__list sd-soon__perks">
            {SOON.map((t) => (
              <li key={t.rarity}>
                <span className="sd-label">{rarityInfo(t.rarity).label}</span>
                <div>
                  <p className="sd-pub__t">{t.title}</p>
                  <p className="sd-pub__d">{t.line}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="sd-hero2__cta">
            <Link href="/tonight" className="sd-btn">
              See tonight’s sky
            </Link>
            <Link href="/genesis" className="sd-btn sd-btn--light">
              Detonate a star
            </Link>
          </div>
        </div>
      </section>
    </StellarShell>
  );
}
