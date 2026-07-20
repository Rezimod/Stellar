import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement — Stellar',
  description:
    'Stellar’s commitment to accessibility — our WCAG 2.1 AA target, known limitations, and how to report an accessibility issue to our team.',
  alternates: { canonical: '/accessibility' },
};

export default function AccessibilityPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Legal</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Accessibility statement</h1>
      <p className="text-text-muted text-sm mb-10">Last updated July 20, 2026</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        <p>We want Stellar to be usable by everyone who loves the night sky, regardless of ability. We are working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.</p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">What we’ve done</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            <li>Keyboard navigation with a visible focus indicator on interactive elements.</li>
            <li>A “skip to main content” link for keyboard and screen-reader users.</li>
            <li>Landmark roles and ARIA labels on navigation and controls.</li>
            <li>Support for the operating-system “reduce motion” preference.</li>
            <li>Descriptive alt text on meaningful images.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Known limitations</h2>
          <p>Some interactive sky-map and 3D features are highly visual and may not yet be fully described to assistive technology. We are actively improving these.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">Report an issue</h2>
          <p>If you hit an accessibility barrier, please tell us so we can fix it. Email <a className="underline underline-offset-4" href="mailto:hello@astroman.ge">hello@astroman.ge</a> or use the <Link href="/contact" className="underline underline-offset-4">Contact</Link> page. We aim to respond within five business days.</p>
        </section>
      </div>
    </div>
  );
}
