import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Terms of Service — Stellar Astronomy App',
  description:
    'The terms of service governing your use of Stellar — the gamified astronomy app by Astroman. Read the rules for accounts, rewards and Web3 features.',
  alternates: { canonical: '/terms' },
};

export default async function TermsPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'იურიდიული' : 'Legal'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'გამოყენების პირობები' : 'Terms'}</h1>
      <p className="text-text-muted text-sm mb-10">{isKa ? 'ბოლოს განახლდა: 30 აპრილი, 2026' : 'Last updated April 30, 2026'}</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-white/80">
        <p>
          {isKa
            ? 'Stellar-ს Astroman-ის გუნდი გთავაზობს არსებული სახით. აპის გამოყენებით ეთანხმები ქვემოთ ჩამოთვლილ პირობებს. შეგნებულად მოკლედ წერია.'
            : 'Stellar is provided as-is by the Astroman team. By using the app you agree to the points below. They&rsquo;re short on purpose.'}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'რა არის Stellar' : 'What Stellar is'}</h2>
          <p>
            {isKa
              ? 'ღამის ცის დაგეგმვისა და დაკვირვების თანამგზავრია ყველასთვის, ვისაც ცისკენ გახედვა უყვარს — სმარტფონის მომხმარებლისთვის, მოყვარული დამკვირვებლისთვის და ტელესკოპის მფლობელისთვისაც. ჩვენ ვაძლევთ ცის პროგნოზს, ვადევნებთ თვალს პლანეტებს, ვქმნით compressed NFT-ებს დადასტურებული დაკვირვებებისთვის და გაძლევთ შესაძლებლობას ჯილდოები რეალურ ტელესკოპებსა და ოპტიკაზე გადაცვალოთ Astroman-სა და პარტნიორ მაღაზიებში.'
              : 'A planning and observation companion for anyone curious about the night sky — smartphone users, casual stargazers, telescope owners alike. We forecast sky conditions, track planets, mint compressed NFTs for verified observations, and let you redeem rewards for real telescopes and optics from Astroman and partner dealers.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'შენი ანგარიში' : 'Your account'}</h2>
          <p>
            {isKa
              ? 'ანგარიშზე შედიხარ ელფოსტით ან სოციალური ავტორიზაციით Privy-ს მეშვეობით. ჩვენ ავტომატურად ვქმნით Solana-ს საფულეს და ბეტა პერიოდში ვფარავთ ქსელის საკომისიოებს. არ გააზიარო ანგარიში და 13 წლამდე ასაკში ნუ გამოიყენებ Stellar-ს მშობლის ან მეურვის თანხმობის გარეშე.'
              : 'You sign in with email or a social account through Privy. We auto-create a Solana wallet for you and cover network fees while the app is in beta. Don&rsquo;t share your account, and don&rsquo;t use Stellar if you&rsquo;re under 13 without a parent or guardian.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'ონჩეინ აქტივები' : 'On-chain assets'}</h2>
          <p>
            {isKa
              ? 'Stellar-ში შექმნილი NFT-ები შენივე დაკვირვების ჩანაწერებია. მათ არ აქვთ გარანტირებული ფინანსური ღირებულება და ჩვენ არ ვიძლევით მეორად ბაზარზე ლიკვიდობის დაპირებას. Stars ქულები აპის შიდა ჯილდოა და ბეტა პერიოდში შეიძლება გადაითვალოს, განულდეს ან საერთოდ შეწყდეს.'
              : 'NFTs minted in Stellar are records of your own observations. They have no guaranteed financial value and we make no promise of secondary-market liquidity. Stars points are an in-app reward and may be reset, recalculated, or sunset at any time during beta.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'მაღაზიის შეკვეთები' : 'Marketplace orders'}</h2>
          <p>
            {isKa
              ? 'ფიზიკურ პროდუქტებს ასრულებს მითითებული დილერი (Astroman, High Point Scientific და სხვები). მოქმედებს თავად დილერის გარანტიის, დაბრუნებისა და მიწოდების პოლიტიკა. Stellar არის ვიტრინა და არა ჩანაწერით ოფიციალური გამყიდველი.'
              : 'Physical product orders are fulfilled by the listed dealer (Astroman, High Point Scientific, etc.). The dealer&rsquo;s own warranty, return, and shipping policy applies. Stellar is the storefront, not the seller of record.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'მისაღები გამოყენება' : 'Acceptable use'}</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {isKa ? (
              <>
                <li>არ გააყალბო დაკვირვებები და არ ატვირთო ფოტოები, რომლებიც შენი არაა.</li>
                <li>არ გაასკრეიპო, არ მოახდინო reverse engineering და არ ბოროტად გამოიყენო API.</li>
                <li>არ გამოიყენო Stellar სხვა დამკვირვებლების შევიწროებისთვის ან სპამისთვის.</li>
              </>
            ) : (
              <>
                <li>Don&rsquo;t spoof observations or upload images that aren&rsquo;t yours.</li>
                <li>Don&rsquo;t scrape, reverse-engineer, or abuse the API.</li>
                <li>Don&rsquo;t use Stellar to harass other observers or spam markets.</li>
              </>
            )}
          </ul>
          <p className="mt-1">{isKa ? 'ამ წესების დარღვევისას შეგვიძლია ანგარიში შევაჩეროთ.' : 'We can suspend accounts that break these rules.'}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-white">{isKa ? 'ცვლილებები' : 'Changes'}</h2>
          <p>
            {isKa
              ? 'ამ პირობებს პროდუქტთან ერთად განვაახლებთ. მნიშვნელოვანი ცვლილებები აპში გამოცხადდება. ცვლილების შემდეგ გამოყენების გაგრძელება ნიშნავს, რომ მას ეთანხმები.'
              : 'We&rsquo;ll update these terms as the product evolves. Material changes will be announced in-app. Continued use after a change means you accept it.'}
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
