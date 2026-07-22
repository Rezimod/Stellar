import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Cookie Policy — Stellar',
  description:
    'How Stellar uses cookies and local storage — essential, functional and analytics categories, third-party services, and how to manage your choices.',
  alternates: { canonical: '/cookie-policy' },
};

export default async function CookiePolicyPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'იურიდიული' : 'Legal'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'ქუქი-ფაილების პოლიტიკა' : 'Cookie policy'}</h1>
      <p className="text-text-muted text-sm mb-10">{isKa ? 'ბოლოს განახლდა: 22 ივლისი, 2026' : 'Last updated July 22, 2026'}</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        <p>
          {isKa
            ? 'Stellar იყენებს ქუქი-ფაილებსა და ბრაუზერის ლოკალურ მეხსიერებას, რომ სისტემაში შესული დაგტოვოს, დაიმახსოვროს შენი პარამეტრები და გაიგოს, როგორ გამოიყენება აპი. აქ წერია, რას ვინახავთ და რატომ.'
            : 'Stellar uses cookies and browser local storage to keep you signed in, remember your preferences, and understand how the app is used. This page explains what we store and why.'}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'აუცილებელი' : 'Essential'}</h2>
          <p>
            {isKa
              ? 'აპის მუშაობისთვის საჭირო ჩანაწერები — ავტორიზაციის სესია (Privy-ს მეშვეობით), საფულის კავშირი და უსაფრთხოება. მათი გამორთვა შეუძლებელია.'
              : 'Required for the app to work — authentication sessions (via Privy), your wallet connection and security. These cannot be switched off.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'ფუნქციური' : 'Functional'}</h2>
          <p>
            {isKa
              ? 'ინახავს ენის არჩევანს (ქუქი `stellar_locale`), თემას (ღია/მუქი), შენს რეგიონსა და ლოკაციას, რომ გამოცდილება ვიზიტებს შორის ერთგვაროვანი იყოს.'
              : 'Remember your language choice (the `stellar_locale` cookie), your light/dark theme, your region and location, so the experience is consistent across visits.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'ანალიტიკა' : 'Analytics'}</h2>
          <p>
            {isKa
              ? 'ვაფიქსირებთ პროდუქტის მოვლენებს — მაგალითად რომელი გვერდი გაიხსნა — ჩვენივე სერვერზე, რომ გავიგოთ რა გამოიყენება და გავაუმჯობესოთ. სარეკლამო და საიტებს შორის მაკონტროლებელი ქუქი-ფაილები არ გვაქვს და მესამე მხარის სარეკლამო ქსელებს მონაცემებს არ ვუზიარებთ.'
              : 'We record product events — such as which screen was opened — on our own server so we can see what is used and improve it. We set no advertising or cross-site tracking cookies, and we do not share this data with ad networks.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'მესამე მხარის სერვისები' : 'Third-party services'}</h2>
          <p>
            {isKa
              ? 'ზოგიერთ ჩანაწერს ჩვენ მიერ გამოყენებული სერვისები ქმნიან — Privy (ავტორიზაცია და ჩაშენებული საფულეები) და Vercel (ჰოსტინგი). მათზე მათივე პოლიტიკა ვრცელდება.'
              : 'Some cookies are set by services we rely on — Privy (authentication and embedded wallets) and Vercel (hosting). Their own policies govern that data.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'ქუქი-ფაილების მართვა' : 'Managing cookies'}</h2>
          <p>
            {isKa ? 'ქუქი-ფაილების წაშლა ან დაბლოკვა ბრაუზერის პარამეტრებიდან შეგიძლია. აუცილებელი ქუქი-ფაილების დაბლოკვისას Stellar-ის ნაწილი შეიძლება აღარ იმუშაოს. პერსონალურ მონაცემებზე იხილე ჩვენი ' : 'You can clear or block cookies in your browser settings. Blocking essential cookies may stop parts of Stellar from working. See our '}
            <Link href="/privacy" className="underline underline-offset-4">{isKa ? 'კონფიდენციალურობის პოლიტიკა' : 'Privacy Policy'}</Link>
            {isKa ? '.' : ' for how we handle personal data.'}
          </p>
        </section>
      </div>
    </div>
  );
}
