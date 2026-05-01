import { ExternalLink, Mail } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact — Stellar',
  description: 'Get in touch with the Stellar team.',
};

const channels = [
  {
    label: 'Email',
    value: 'hello@astroman.ge',
    href: 'mailto:hello@astroman.ge',
    note: 'General questions, partnerships, press.',
    icon: Mail,
    external: false,
  },
  {
    label: 'X',
    value: '@StellarClub26',
    href: 'https://x.com/StellarClub26',
    note: 'Updates, sky alerts, behind-the-scenes.',
    external: true,
  },
  {
    label: 'GitHub',
    value: 'Morningbriefrezi/Stellar',
    href: 'https://github.com/Morningbriefrezi/Stellar',
    note: 'Bugs and feature requests welcome.',
    external: true,
  },
  {
    label: 'Astroman store',
    value: 'astroman.ge',
    href: 'https://astroman.ge',
    note: 'Physical store in Tbilisi, Georgia.',
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Talk to us</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-3">Contact</h1>
      <p className="text-white/70 text-[15px] leading-relaxed mb-10 max-w-prose">
        Stellar is built by Rezi and a small team in Tbilisi. The fastest way to reach
        us is email. We read everything, even if a reply takes a day or two.
      </p>

      <ul className="flex flex-col gap-3">
        {channels.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.label}>
              <a
                href={c.href}
                target={c.external ? '_blank' : undefined}
                rel={c.external ? 'noopener noreferrer' : undefined}
                className="group flex items-start gap-4 rounded-xl px-4 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-colors"
              >
                {Icon && (
                  <span className="mt-0.5 text-white/60 group-hover:text-white/90 transition-colors">
                    <Icon size={18} strokeWidth={1.6} />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-text-muted">
                      {c.label}
                    </span>
                    {c.external && (
                      <ExternalLink size={11} className="text-text-muted opacity-60" />
                    )}
                  </span>
                  <span className="block font-display text-lg text-white mt-0.5 break-all">
                    {c.value}
                  </span>
                  <span className="block text-sm text-white/55 mt-1">{c.note}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
