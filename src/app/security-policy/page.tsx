import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Policy — Responsible Disclosure | Stellar',
  description:
    'Stellar’s vulnerability disclosure policy — how to report a security issue responsibly, our scope, and what to expect after you report.',
  alternates: { canonical: '/security-policy' },
};

export default function SecurityPolicyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Security</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Responsible disclosure policy</h1>
      <p className="text-text-muted text-sm mb-10">Last updated July 20, 2026</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        <p>We take the security of Stellar and our stargazers seriously. If you believe you’ve found a vulnerability, we’d like to hear from you and will work with you to resolve it quickly.</p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">How to report</h2>
          <p>Email <a className="underline underline-offset-4" href="mailto:security@astroman.ge">security@astroman.ge</a> with a description of the issue, steps to reproduce, and any proof-of-concept. Please give us reasonable time to fix it before public disclosure.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Please do</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Test only against your own account and data.</li>
            <li>Report as soon as you can after discovery.</li>
            <li>Keep details confidential until we’ve shipped a fix.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Please don’t</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Access, modify or delete data that isn’t yours.</li>
            <li>Run denial-of-service, spam or automated attacks against production.</li>
            <li>Use social engineering against our team or users.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">What to expect</h2>
          <p>We’ll acknowledge your report, keep you updated as we investigate, and credit you once the issue is resolved if you’d like. Acting in good faith under this policy, we won’t pursue legal action.</p>
        </section>
      </div>
    </div>
  );
}
