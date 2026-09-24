import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ — How Stellar Works, Stars & Rewards | Stellar',
  description:
    'Answers to common questions about Stellar: how to earn Stars, what discovery certificates are, whether you need a telescope, how your account works, and more.',
  alternates: { canonical: '/faq' },
};

type Faq = { q: string; a: string };

const faqs: Faq[] = [
  {
    q: 'What is Stellar?',
    a: 'Stellar is an astronomy app for telescope, smartphone and camera owners: a 7-day sky forecast for your location, a live planet tracker, ASTRA — an AI space companion, observation missions, and Stars you can put toward real telescopes and optics from Astroman.',
  },
  {
    q: 'Is Stellar free?',
    a: 'Yes. Creating an account and using the core app — sky forecasts, the planet tracker, missions, learning guides and the community feed — is free. Stellar Pro is an optional $7/month upgrade, and physical gear from the shop is paid separately.',
  },
  {
    q: 'Do I need a telescope to use Stellar?',
    a: 'No. Stellar works for smartphone and camera owners too. Many missions are naked-eye or phone-camera friendly; a telescope simply unlocks more advanced targets.',
  },
  {
    q: 'How do I earn Stars?',
    a: 'You earn Stars by completing missions — photographing tonight’s targets, logging verified observations, maintaining nightly streaks, and taking part in community events.',
  },
  {
    q: 'What can I do with Stars?',
    a: 'Stars are Stellar’s in-app reward. You can put them toward real telescopes, eyepieces and accessories from Astroman and partner dealers through the shop — roughly 4.69 Stars are earned per 1 GEL of catalog value.',
  },
  {
    q: 'What are discovery certificates?',
    a: 'When you log a verified observation, Stellar creates a permanent, tamper-proof digital record that you observed a given object at a given time. They’re keepsakes of your own observations, not financial instruments.',
  },
  {
    q: 'Do discovery certificates have monetary value?',
    a: 'No. They are records of your observations with no guaranteed financial value, and we make no promise of secondary-market liquidity.',
  },
  {
    q: 'How does my account work?',
    a: 'An account is created for you automatically when you sign in with email or a social account through Privy. There’s no password to manage and nothing technical to set up — it just works.',
  },
  {
    q: 'Do I need to download or buy anything to start?',
    a: 'No. Everything is set up for you automatically the moment you sign in — just open Stellar and start observing.',
  },
  {
    q: 'Which devices does Stellar support?',
    a: 'Stellar is a web app that runs in any modern mobile or desktop browser and installs to your home screen as a PWA on iOS and Android. Stellar Field, our Android companion, adds an offline AI assistant for dark-sky sites with no signal.',
  },
  {
    q: 'How accurate are the sky forecasts?',
    a: 'Forecasts combine your location with Open-Meteo weather data and astronomical calculations to estimate cloud cover, visibility and the best observing window for each of the next seven nights.',
  },
  {
    q: 'What are missions?',
    a: 'Missions are location-aware challenges and quizzes — for example photographing a planet, the Moon or a bright deep-sky object, or testing what you know about telescopes — that reward Stars when completed.',
  },
  {
    q: 'What is the community feed?',
    a: 'The feed is where stargazers share what they’re capturing tonight. You can post your own observations and photos and see what others around the world are observing.',
  },
  {
    q: 'How is my observation verified?',
    a: 'Your photo is checked by an AI vision model, cross-referenced with the image’s EXIF time and location, de-duplicated against earlier uploads, and compared against what was actually visible from your position that night. Only then is it certified and added to your collection.',
  },
  {
    q: 'What happens to my data?',
    a: 'We collect only what’s needed to run the app — such as approximate location for forecasts and your observation history. See our Privacy Policy for the full detail.',
  },
  {
    q: 'Can I use Stellar anywhere in the world?',
    a: 'Yes. Forecasts and missions are generated from your location, so Stellar works from any hemisphere and adapts to what’s visible in your sky.',
  },
  {
    q: 'Which languages does Stellar speak?',
    a: 'English, for now.',
  },
  {
    q: 'Who is behind Stellar?',
    a: 'Stellar is built by the team behind Astroman — Georgia’s first astronomy store, with a physical shop in Tbilisi — to connect everyday stargazers with real observing and real gear.',
  },
  {
    q: 'How do I redeem a telescope?',
    a: 'Once you have enough Stars, open the shop, choose an eligible item, and apply your Stars at checkout. Physical orders are fulfilled by the listed dealer.',
  },
  {
    q: 'Is there an age requirement?',
    a: 'You should be 13 or older to use Stellar without a parent or guardian’s consent, in line with our Terms of Service.',
  },
  {
    q: 'How do I contact support?',
    a: 'Reach the team any time from the Contact page, or email info@astroman.ge.',
  },
];

export default function FaqPage() {
  const items = faqs;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">Help</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">Frequently asked questions</h1>
      <p className="text-text-muted text-sm mb-10">
        Everything you need to know about Stellar, Stars and rewards.
      </p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        {items.map((f) => (
          <section key={f.q} className="flex flex-col gap-2">
            <h2 className="font-display text-lg text-text-primary">{f.q}</h2>
            <p>{f.a}</p>
          </section>
        ))}

        <p className="pt-6 text-text-muted text-sm">
          {'Still stuck? '}
          <Link href="/contact" className="underline underline-offset-4">
            Contact the team
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
