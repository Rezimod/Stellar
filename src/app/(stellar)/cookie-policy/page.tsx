import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy — Stellar',
  description:
    'How Stellar uses cookies and local storage — essential, functional and analytics categories, third-party services, and how to manage your choices.',
  alternates: { canonical: '/cookie-policy' },
};

export default function CookiePolicyPage() {

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Cookie policy</h1>
      <p className="text-text-muted text-sm mb-10">Last updated July 22, 2026</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        <p>
          Stellar uses cookies and browser local storage to keep you signed in, remember your preferences, and understand how the app is used. This page explains what we store and why.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Essential</h2>
          <p>
            Required for the app to work — authentication sessions (via Privy), your wallet connection and security. These cannot be switched off.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Functional</h2>
          <p>
            Remember your light/dark theme, your region and location, so the experience is consistent across visits.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Analytics</h2>
          <p>
            We record product events — such as which screen was opened — on our own server so we can see what is used and improve it. We set no advertising or cross-site tracking cookies, and we do not share this data with ad networks.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Third-party services</h2>
          <p>
            Some cookies are set by services we rely on — Privy (authentication and embedded wallets) and Vercel (hosting). Their own policies govern that data.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">Managing cookies</h2>
          <p>
            {'You can clear or block cookies in your browser settings. Blocking essential cookies may stop parts of Stellar from working. See our '}
            <Link href="/privacy" className="underline underline-offset-4">Privacy Policy</Link>
            {' for how we handle personal data.'}
          </p>
        </section>
      </div>
    </div>
  );
}
