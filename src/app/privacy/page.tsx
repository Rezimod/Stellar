import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Privacy — Stellar',
  description: 'How Stellar handles your data.',
};

export default async function PrivacyPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'იურიდიული' : 'Legal'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'კონფიდენციალურობა' : 'Privacy'}</h1>
      <p className="text-text-muted text-sm mb-10">{isKa ? 'ბოლოს განახლდა: 30 აპრილი, 2026' : 'Last updated April 30, 2026'}</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        <p>
          {isKa
            ? 'Stellar-ს თბილისში Astroman-ის გუნდი აშენებს. ვცდილობთ რაც შეიძლება ნაკლები მონაცემი შევინახოთ. ეს გვერდი ხსნის, რას ვინახავთ, რატომ გვჭირდება და როგორ შეიძლება მისი წაშლა.'
            : 'Stellar is built by the Astroman team in Tbilisi. We try to collect as little data as possible. This page explains what we keep, why, and how to remove it.'}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'რას ვინახავთ' : 'What we store'}</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {isKa ? (
              <>
                <li>ელფოსტას ან სოციალურ ავტორიზაციას, რომლითაც შედიხარ სისტემაში (ამას Privy ამუშავებს).</li>
                <li>Solana-ს საფულის მისამართს, რომელიც შენს ანგარიშს ავტომატურად ებმება.</li>
                <li>შენს დაკვირვებებს: სამიზნეს, დროს, სავარაუდო მდებარეობას და შენ მიერ ატვირთულ მტკიცებულების ფოტოს.</li>
                <li>პროფილის დამატებით მონაცემებს, რომელსაც თავად ავსებ (ტელესკოპი, იუზერნეიმი, ავატარი).</li>
              </>
            ) : (
              <>
                <li>The email or social login you sign in with (handled by Privy).</li>
                <li>The Solana wallet address auto-created for your account.</li>
                <li>Your observations: target, timestamp, approximate location, and the proof image you uploaded.</li>
                <li>Optional profile data you enter yourself (telescope, username, avatar).</li>
              </>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'რას არ ვინახავთ' : 'What we don&rsquo;t store'}</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {isKa ? (
              <>
                <li>საფულის seed phrase-ს ან private key-ს — ეს Privy-სთან რჩება.</li>
                <li>ბარათის მონაცემებს — ისინი პირდაპირ გადახდის პროვაიდერთან მიდის.</li>
                <li>მუდმივ მდებარეობის ისტორიას — GPS-ს მხოლოდ შენი მოთხოვნით ვკითხულობთ.</li>
              </>
            ) : (
              <>
                <li>Wallet seed phrases or private keys — these stay with Privy.</li>
                <li>Payment card details — these go directly to our payment processor.</li>
                <li>Continuous location data — we only read GPS when you ask us to.</li>
              </>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'მესამე მხარის სერვისები' : 'Third-party services'}</h2>
          <p>
            {isKa
              ? 'ავთენტიკაციისა და ჩაშენებული საფულეებისთვის ვიყენებთ Privy-ს, შენახვისთვის Supabase-სა და Neon-ს, ჰოსტინგისთვის Vercel-ს, AI ასისტენტისთვის Anthropic-ს, ამინდისთვის Open-Meteo-ს, ხოლო Solana RPC-სთვის Helius-ს. თითოეული სერვისი იღებს მხოლოდ იმ მინიმალურ მონაცემს, რაც თავის საქმეს სჭირდება.'
              : 'We use Privy for authentication and embedded wallets, Supabase and Neon for storage, Vercel for hosting, Anthropic for the AI assistant, Open-Meteo for weather, and Helius for Solana RPC. Each only receives the minimum it needs to do its job.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'შენი მონაცემები, შენი გადაწყვეტილება' : 'Your data, your call'}</h2>
          <p>
            {isKa ? 'ანგარიშისა და მასთან დაკავშირებული მონაცემების წაშლა შეგიძლია ელფოსტით მოგვწერო ' : 'You can delete your account and everything tied to it by emailing '}
            <a href="mailto:hello@astroman.ge" className="underline underline-offset-4">
              hello@astroman.ge
            </a>
            {isKa
              ? '. ბლოკჩეინზე არსებული ჩანაწერები (NFT-ები, ტრანზაქციები) Solana-ზე რჩება და ჩვენ ვერ წავშლით, მაგრამ ყველა off-chain ასლს მოვაშორებთ.'
              : '. On-chain records (NFTs, transactions) live on Solana and can&rsquo;t be deleted by us, but we will remove every off-chain copy.'}
          </p>
        </section>

        <p className="pt-6 text-text-muted text-sm">
          {isKa ? 'კითხვა გაქვს? იხილე ' : 'Questions? See '}
          <Link href="/contact" className="underline underline-offset-4">{isKa ? 'კონტაქტი' : 'Contact'}</Link>.
        </p>
      </div>
    </div>
  );
}
