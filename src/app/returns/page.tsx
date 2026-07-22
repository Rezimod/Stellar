import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Returns & Refunds — Stellar Shop',
  description:
    'How returns and refunds work for gear bought through the Stellar shop, including dealer-fulfilled orders, timeframes, and how to start a return.',
  alternates: { canonical: '/returns' },
};

export default async function ReturnsPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'იურიდიული' : 'Legal'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'დაბრუნება და თანხის ანაზღაურება' : 'Returns & refunds'}</h1>
      <p className="text-text-muted text-sm mb-10">{isKa ? 'ბოლოს განახლდა: 22 ივლისი, 2026' : 'Last updated July 22, 2026'}</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        <p>
          {isKa
            ? 'Stellar ვიტრინაა: ფიზიკურ შეკვეთას ასრულებს მითითებული დილერი (Astroman და პარტნიორი დილერები — Celestron, Levenhuk, Bresser). თითოეულ შეკვეთაზე მოქმედებს შემსრულებელი დილერის დაბრუნებისა და გარანტიის პოლიტიკა.'
            : 'Stellar is a storefront: physical orders are fulfilled by the listed dealer (Astroman and partner dealers — Celestron, Levenhuk, Bresser). The fulfilling dealer’s return and warranty policy applies to each order.'}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'დაბრუნების ვადა' : 'Return window'}</h2>
          <p>
            {isKa
              ? 'გაუხსნელი და დაუზიანებელი ნივთი ჩვეულებრივ მიღებიდან 14 დღის განმავლობაში ბრუნდება თანხის ანაზღაურებით ან გაცვლით, თუ პროდუქტის გვერდზე სხვა რამ არ წერია.'
              : 'Unopened, undamaged items can generally be returned within 14 days of delivery for a refund or exchange, unless the product page states otherwise.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'მდგომარეობა' : 'Condition'}</h2>
          <p>
            {isKa
              ? 'ნივთი უნდა დაბრუნდეს ორიგინალ შეფუთვაში ყველა აქსესუართან ერთად. დაბრუნების ტრანსპორტირება შეიძლება მყიდველს დაეკისროს, თუ ნივთი დაზიანებული ან წუნდებული არ მოვიდა.'
              : 'Items must be returned in their original packaging with all accessories. Return shipping may be the buyer’s responsibility unless the item arrived damaged or faulty.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'Stars-ით გადახდა' : 'Stars redemptions'}</h2>
          <p>
            {isKa
              ? 'თუ შეკვეთაზე Stars გამოიყენე, დაბრუნებისას Stars ბალანსზე გიბრუნდება და არა ფულად. Stars ქულებს ფულადი ღირებულება არ აქვს.'
              : 'Where Stars were applied to an order, refunded Stars are returned to your balance rather than as cash. In-app Stars themselves have no cash value.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'როგორ დავიწყო დაბრუნება' : 'Start a return'}</h2>
          <p>
            {isKa ? 'მოგვწერე ' : 'Email '}
            <a className="underline underline-offset-4" href="mailto:info@astroman.ge">info@astroman.ge</a>
            {isKa ? ' შეკვეთის ნომრით, ან დაგვიკავშირდი ' : ' with your order number, or reach us from the '}
            <Link href="/contact" className="underline underline-offset-4">{isKa ? 'კონტაქტის გვერდიდან' : 'Contact'}</Link>
            {isKa ? ' და შემსრულებელ დილერთან დაგაკავშირებთ.' : ' page and we’ll connect you with the fulfilling dealer.'}
          </p>
        </section>
      </div>
    </div>
  );
}
