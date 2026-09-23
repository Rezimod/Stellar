import type { Metadata } from 'next';
import Link from 'next/link';
import SideraShell from '@/components/sidera/SideraShell';
import Chapter from '@/components/sidera/ui/Chapter';

export const metadata: Metadata = {
  title: 'Privacy — Sidera',
  description: 'What Sidera keeps about a holder, why, and how to remove it.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <SideraShell title="Privacy">
      <article className="sd-container sd-top sd-legal">
        <p className="sd-label">Last updated 23 September 2026</p>

        <section className="sd-chapter-block">
          <Chapter n="01" title="What we keep" />
          <ul>
            <li>The email or wallet you sign in with, through Privy.</li>
            <li>The Solana wallet address your cards are held against.</li>
            <li>Your orders, the capsules you opened, the cards you hold and the votes you cast.</li>
            <li>Which pages were viewed, without your name, to see where people stop.</li>
          </ul>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="02" title="What we never hold" />
          <ul>
            <li>Private keys or recovery phrases. They stay with Privy or your wallet.</li>
            <li>Card details. Payment is made in SOL from your wallet.</li>
            <li>Your location. The sky is computed for Node 01 in Tbilisi, not for you.</li>
          </ul>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="03" title="Who else sees it" />
          <p>
            Privy for sign-in, Neon for the database, Vercel for hosting, and the Solana network for payments. Each receives only
            what it needs. Payments on Solana, and the capsule log, are public by design.
          </p>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="04" title="Removing it" />
          <p>
            Write to <a href="mailto:info@astroman.ge">info@astroman.ge</a> from the account&rsquo;s email and we will delete
            everything we hold about you. Payments already on Solana, and your capsules&rsquo; lines in the public log, cannot be
            removed; the log keeps no name. More on <Link href="/contact">Contact</Link>.
          </p>
        </section>
      </article>
    </SideraShell>
  );
}
