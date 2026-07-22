import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Accessibility Statement — Stellar',
  description:
    'Stellar’s commitment to accessibility — our WCAG 2.1 AA target, known limitations, and how to report an accessibility issue to our team.',
  alternates: { canonical: '/accessibility' },
};

export default async function AccessibilityPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'იურიდიული' : 'Legal'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'ხელმისაწვდომობის განაცხადი' : 'Accessibility statement'}</h1>
      <p className="text-text-muted text-sm mb-10">{isKa ? 'ბოლოს განახლდა: 22 ივლისი, 2026' : 'Last updated July 22, 2026'}</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        <p>
          {isKa
            ? 'გვინდა, Stellar გამოსადეგი იყოს ყველასთვის, ვისაც ღამის ცა უყვარს, შესაძლებლობების მიუხედავად. ვმუშაობთ ვებკონტენტის ხელმისაწვდომობის სახელმძღვანელოს (WCAG) 2.1 დონე AA-სთან შესაბამისობაზე.'
            : 'We want Stellar to be usable by everyone who loves the night sky, regardless of ability. We are working toward conformance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA.'}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'რა გავაკეთეთ' : 'What we’ve done'}</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {isKa ? (
              <>
                <li>კლავიატურით ნავიგაცია ხილული ფოკუსის ინდიკატორით ინტერაქტიულ ელემენტებზე.</li>
                <li>„მთავარ კონტენტზე გადასვლის“ ბმული კლავიატურისა და ეკრანის წამკითხველის მომხმარებლებისთვის.</li>
                <li>სემანტიკური ორიენტირები და ARIA წარწერები ნავიგაციასა და კონტროლებზე.</li>
                <li>ოპერაციული სისტემის „მოძრაობის შემცირების“ პარამეტრის მხარდაჭერა.</li>
                <li>ღია და მუქი თემა, რომ დღისით დაგეგმვაც კომფორტული იყოს.</li>
                <li>აღწერითი alt ტექსტი მნიშვნელობის მქონე სურათებზე.</li>
              </>
            ) : (
              <>
                <li>Keyboard navigation with a visible focus indicator on interactive elements.</li>
                <li>A “skip to main content” link for keyboard and screen-reader users.</li>
                <li>Landmark roles and ARIA labels on navigation and controls.</li>
                <li>Support for the operating-system “reduce motion” preference.</li>
                <li>A light and a dark theme, so daytime planning is comfortable too.</li>
                <li>Descriptive alt text on meaningful images.</li>
              </>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'ცნობილი შეზღუდვები' : 'Known limitations'}</h2>
          <p>
            {isKa
              ? 'ზოგიერთი ინტერაქტიული ცის რუკა და 3D სცენა ძლიერ ვიზუალურია და ჯერ სრულად არ არის აღწერილი დამხმარე ტექნოლოგიებისთვის. აქტიურად ვმუშაობთ ამის გამოსწორებაზე.'
              : 'Some interactive sky-map and 3D features are highly visual and may not yet be fully described to assistive technology. We are actively improving these.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'შეატყობინე პრობლემა' : 'Report an issue'}</h2>
          <p>
            {isKa ? 'თუ ხელმისაწვდომობის ბარიერს წააწყდი, გვაცნობე, რომ გამოვასწოროთ. მოგვწერე ' : 'If you hit an accessibility barrier, please tell us so we can fix it. Email '}
            <a className="underline underline-offset-4" href="mailto:info@astroman.ge">info@astroman.ge</a>
            {isKa ? ' ან გამოიყენე ' : ' or use the '}
            <Link href="/contact" className="underline underline-offset-4">{isKa ? 'კონტაქტის გვერდი' : 'Contact'}</Link>
            {isKa ? '. პასუხს ხუთი სამუშაო დღის განმავლობაში ვცდილობთ.' : ' page. We aim to respond within five business days.'}
          </p>
        </section>
      </div>
    </div>
  );
}
