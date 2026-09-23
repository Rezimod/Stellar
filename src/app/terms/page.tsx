import type { Metadata } from 'next';
import Link from 'next/link';
import SideraShell from '@/components/sidera/SideraShell';
import Chapter from '@/components/sidera/ui/Chapter';

export const metadata: Metadata = {
  title: 'Terms — Sidera',
  description: 'The terms for holding Sidera cards and opening capsules.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <SideraShell title="Terms">
      <article className="sd-container sd-top sd-legal">
        <p className="sd-label">Last updated 23 September 2026</p>

        <section className="sd-chapter-block">
          <Chapter n="01" title="What Sidera is" />
          <p>
            Sidera is a set of collectible cards, each a numbered edition of an object in the sky or a work of fiction. It is run
            by Astroman, Tbilisi. Node 01, the telescope that photographs the night&rsquo;s card, is commissioning: until it is
            operational, no photograph is promised.
          </p>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="02" title="Your account" />
          <p>
            You sign in through Privy with email or a wallet. Your cards are held against the Solana wallet on that account.
            Keep the account to yourself; whoever controls it controls the cards.
          </p>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="03" title="Capsules and cards" />
          <p>
            A capsule holds three cards, drawn under the published odds and committed by hash before it goes on sale. The public{' '}
            <Link href="/capsules/log">log</Link> records every listing, sale and opening, and anyone can recompute a draw after
            it is opened. A card bought directly is the next free edition of that card. Prices are shown in US dollars and
            charged in SOL at the rate quoted at checkout; a quote holds for fifteen minutes.
          </p>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="04" title="What a card is not" />
          <p>
            A card is a record of an edition in this collection. It carries no promise of financial value, resale or return.
            Buy a capsule for the cards and the night photographs, not as an investment.
          </p>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="05" title="When something goes wrong" />
          <p>
            If a payment lands and nothing is delivered, because a card sold out between order and payment or a capsule was
            withdrawn, write to us with the transaction and we will refund it by hand. Opened capsules are final.
          </p>
        </section>

        <section className="sd-chapter-block">
          <Chapter n="06" title="Changes" />
          <p>
            These terms change as Sidera does. The date above moves when they do, and continuing to use Sidera after a change
            means accepting it. Questions go to <Link href="/contact">Contact</Link>.
          </p>
        </section>
      </article>
    </SideraShell>
  );
}
