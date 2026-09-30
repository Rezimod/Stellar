import type { Metadata } from 'next';
import StellarShell from '@/components/stellar/StellarShell';
import DataRow from '@/components/stellar/ui/DataRow';

export const metadata: Metadata = {
  title: 'Contact — Stellar',
  description: 'How to reach the people behind Stellar and Caucasus Eye.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <StellarShell title="Contact">
      <article className="sd-container sd-top sd-legal">
        <p className="sd-lede">
          Stellar is run by Astroman in Tbilisi. Email is the fastest way to reach us; a reply can take a day or two. For a
          payment, include the transaction signature.
        </p>
        <DataRow
          layout="stacked"
          className="sd-legal__ledger"
          items={[
            { label: 'Email', value: <a href="mailto:info@astroman.ge">info@astroman.ge</a> },
            { label: 'Store', value: <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer">astroman.ge</a> },
            { label: 'Caucasus Eye', value: 'Tbilisi, Georgia · commissioning' },
          ]}
        />
      </article>
    </StellarShell>
  );
}
