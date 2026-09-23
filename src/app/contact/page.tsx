import type { Metadata } from 'next';
import SideraShell from '@/components/sidera/SideraShell';
import DataRow from '@/components/sidera/ui/DataRow';

export const metadata: Metadata = {
  title: 'Contact — Sidera',
  description: 'How to reach the people behind Sidera and Node 01.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <SideraShell title="Contact">
      <article className="sd-container sd-top sd-legal">
        <p className="sd-lede">
          Sidera is run by Astroman in Tbilisi. Email is the fastest way to reach us; a reply can take a day or two. For a
          payment, include the transaction signature.
        </p>
        <DataRow
          layout="stacked"
          className="sd-legal__ledger"
          items={[
            { label: 'Email', value: <a href="mailto:info@astroman.ge">info@astroman.ge</a> },
            { label: 'Store', value: <a href="https://astroman.ge" target="_blank" rel="noopener noreferrer">astroman.ge</a> },
            { label: 'Node 01', value: 'Tbilisi, Georgia · commissioning' },
          ]}
        />
      </article>
    </SideraShell>
  );
}
