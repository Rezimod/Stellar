import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — Stellar',
  description: 'How Stellar handles your data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Privacy</h1>
      <p className="text-text-muted text-sm mb-10">Last updated April 30, 2026</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        <p>
          Stellar is built by the Astroman team in Tbilisi. We try to collect as little
          data as possible. This page explains what we keep, why, and how to remove it.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">What we store</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>The email or social login you sign in with (handled by Privy).</li>
            <li>The Solana wallet address auto-created for your account.</li>
            <li>Your observations: target, timestamp, approximate location, and the proof image you uploaded.</li>
            <li>Optional profile data you enter yourself (telescope, username, avatar).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">What we don&rsquo;t store</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Wallet seed phrases or private keys — these stay with Privy.</li>
            <li>Payment card details — these go directly to our payment processor.</li>
            <li>Continuous location data — we only read GPS when you ask us to.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Third-party services</h2>
          <p>
            We use Privy for authentication and embedded wallets, Supabase and Neon for
            storage, Vercel for hosting, Anthropic for the AI assistant, Open-Meteo for
            weather, and Helius for Solana RPC. Each only receives the minimum it needs
            to do its job.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Your data, your call</h2>
          <p>
            You can delete your account and everything tied to it by emailing{' '}
            <a href="mailto:hello@astroman.ge" className="underline underline-offset-4">
              hello@astroman.ge
            </a>
            . On-chain records (NFTs, transactions) live on Solana and can&rsquo;t be
            deleted by us, but we will remove every off-chain copy.
          </p>
        </section>

        <p className="pt-6 text-text-muted text-sm">
          Questions? See <Link href="/contact" className="underline underline-offset-4">Contact</Link>.
        </p>
      </div>
    </div>
  );
}
