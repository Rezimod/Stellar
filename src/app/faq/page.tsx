import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ — How Stellar Works, Stars, NFTs & Rewards | Stellar',
  description:
    'Answers to common questions about Stellar: how to earn Stars, what discovery NFTs are, whether you need a telescope, how the Solana wallet works, and more.',
  alternates: { canonical: '/faq' },
};

const faqs: { q: string; a: string }[] = [
  { q: 'What is Stellar?', a: 'Stellar is a gamified astronomy app: forecast the night sky for your location, complete observation missions, photograph planets and deep-sky objects, earn Stars, and redeem them for real telescopes and optics from Astroman.' },
  { q: 'Is Stellar free?', a: 'Yes. Creating an account and using the core app — sky forecasts, missions, learning guides and the community feed — is free. You only pay if you choose to buy physical gear from the shop.' },
  { q: 'Do I need a telescope to use Stellar?', a: 'No. Stellar works for smartphone and camera owners too. Many missions are naked-eye or phone-camera friendly; a telescope simply unlocks more advanced targets.' },
  { q: 'How do I earn Stars?', a: 'You earn Stars by completing missions — photographing tonight’s targets, logging verified observations, maintaining nightly streaks, and taking part in community events.' },
  { q: 'What can I do with Stars?', a: 'Stars are Stellar’s in-app reward. You can redeem them toward real telescopes, eyepieces and accessories from Astroman and partner dealers through the shop.' },
  { q: 'What are discovery NFTs?', a: 'When you log a verified observation, Stellar can mint a compressed NFT on Solana as a permanent, tamper-proof record that you observed a given object at a given time. They’re keepsakes of your own observations, not financial instruments.' },
  { q: 'Do discovery NFTs have monetary value?', a: 'No. They are records of your observations with no guaranteed financial value, and we make no promise of secondary-market liquidity.' },
  { q: 'How does the Solana wallet work?', a: 'A wallet is created for you automatically when you sign in with email or a social account through Privy. During beta we cover network fees, so you don’t need any crypto to get started.' },
  { q: 'Do I need any crypto or SOL to start?', a: 'No. The wallet is provisioned silently and network fees are covered during beta. You can use everything without buying or holding any tokens.' },
  { q: 'Which devices does Stellar support?', a: 'Stellar is a web app that runs in any modern mobile or desktop browser, and installs to your home screen as a PWA on iOS and Android.' },
  { q: 'How accurate are the sky forecasts?', a: 'Forecasts combine your location with live weather and astronomical data to estimate visibility, cloud cover and the best observing windows for tonight.' },
  { q: 'What are missions?', a: 'Missions are nightly, location-aware challenges — for example photographing a planet, the Moon or a bright deep-sky object — that reward Stars when completed.' },
  { q: 'What is the community feed?', a: 'The feed is where stargazers share what they’re capturing tonight. You can post your own observations and photos and see what others around the world are observing.' },
  { q: 'How is my observation verified?', a: 'Observations are checked against time, location and sky conditions before a discovery NFT can be minted, so the record reflects a plausible real sighting.' },
  { q: 'What happens to my data?', a: 'We collect only what’s needed to run the app — such as approximate location for forecasts and your observation history. See our Privacy Policy for the full detail.' },
  { q: 'Can I use Stellar anywhere in the world?', a: 'Yes. Forecasts and missions are generated from your location, so Stellar works from any hemisphere and adapts to what’s visible in your sky.' },
  { q: 'Who is behind Stellar?', a: 'Stellar is built by the team behind Astroman, an astronomy retailer, to connect everyday stargazers with real observing and real gear.' },
  { q: 'How do I redeem a telescope?', a: 'Once you have enough Stars, open the shop, choose an eligible item, and apply your Stars at checkout. Physical orders are fulfilled by the listed dealer.' },
  { q: 'Is there an age requirement?', a: 'You should be 13 or older to use Stellar without a parent or guardian’s consent, in line with our Terms of Service.' },
  { q: 'How do I contact support?', a: 'Reach the team any time from the Contact page, or email hello@astroman.ge.' },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
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
      <p className="text-text-muted text-sm mb-10">Everything you need to know about Stellar, Stars, NFTs and rewards.</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        {faqs.map((f) => (
          <section key={f.q} className="flex flex-col gap-2">
            <h2 className="font-display text-lg text-white">{f.q}</h2>
            <p>{f.a}</p>
          </section>
        ))}

        <p className="pt-6 text-text-muted text-sm">
          Still stuck? <Link href="/contact" className="underline underline-offset-4">Contact the team</Link>.
        </p>
      </div>
    </div>
  );
}
