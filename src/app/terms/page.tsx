import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Stellar Astronomy App',
  description:
    'The terms of service governing your use of Stellar — the gamified astronomy app by Astroman. Read the rules for accounts and rewards.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Terms</h1>
      <p className="text-text-muted text-sm mb-10">Last updated July 22, 2026</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        <p>
          Stellar is provided as-is by the Astroman team. By using the app you agree to the points below. They’re short on purpose.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">What Stellar is</h2>
          <p>
            A planning and observation companion for anyone curious about the night sky — smartphone users, casual stargazers, telescope owners alike. We forecast sky conditions, track planets, create permanent digital records for verified observations, and let you redeem rewards for real telescopes and optics from Astroman and partner dealers.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Your account</h2>
          <p>
            You sign in with email or a social account through Privy. We auto-create a wallet for you and cover network fees while the app is in beta. Don’t share your account, and don’t use Stellar if you’re under 13 without a parent or guardian.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Digital records</h2>
          <p>
            The certified records created in Stellar are records of your own observations. They have no guaranteed financial value and we make no promise of secondary-market liquidity. Stars points are an in-app reward and may be reset, recalculated, or sunset at any time during beta.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Marketplace orders</h2>
          <p>
            {'Physical product orders are fulfilled by the listed dealer (Astroman, Celestron, Levenhuk, Bresser). The dealer’s own warranty, return, and shipping policy applies. Stellar is the storefront, not the seller of record — see our '}
            <Link href="/returns" className="underline underline-offset-4">Returns</Link>
            {' page for detail.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Acceptable use</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Don&rsquo;t spoof observations or upload images that aren&rsquo;t yours.</li>
            <li>Don&rsquo;t scrape, reverse-engineer, or abuse the API.</li>
            <li>Don&rsquo;t use Stellar to harass other observers or spam markets.</li>
          </ul>
          <p className="mt-1">We can suspend accounts that break these rules.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Changes</h2>
          <p>
            We’ll update these terms as the product evolves. Material changes will be announced in-app. Continued use after a change means you accept it.
          </p>
        </section>

        <p className="pt-6 text-text-muted text-sm">
          {'Questions? See '}
          <Link href="/contact" className="underline underline-offset-4">Contact</Link>.
        </p>
      </div>
    </div>
  );
}
