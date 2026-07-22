import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Security Policy — Responsible Disclosure | Stellar',
  description:
    'Stellar’s vulnerability disclosure policy — how to report a security issue responsibly, our scope, and what to expect after you report.',
  alternates: { canonical: '/security-policy' },
};

export default async function SecurityPolicyPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-text-primary">
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'უსაფრთხოება' : 'Security'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'პასუხისმგებლიანი გამჟღავნების პოლიტიკა' : 'Responsible disclosure policy'}</h1>
      <p className="text-text-muted text-sm mb-10">{isKa ? 'ბოლოს განახლდა: 22 ივლისი, 2026' : 'Last updated July 22, 2026'}</p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        <p>
          {isKa
            ? 'Stellar-ისა და ჩვენი მომხმარებლების უსაფრთხოებას სერიოზულად ვეკიდებით. თუ ფიქრობ, რომ სისუსტე აღმოაჩინე, გვაცნობე — ერთად სწრაფად მოვაგვარებთ.'
            : 'We take the security of Stellar and our stargazers seriously. If you believe you’ve found a vulnerability, we’d like to hear from you and will work with you to resolve it quickly.'}
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'როგორ შეგვატყობინო' : 'How to report'}</h2>
          <p>
            {isKa ? 'მოგვწერე ' : 'Email '}
            <a className="underline underline-offset-4" href="mailto:info@astroman.ge">info@astroman.ge</a>
            {isKa
              ? ' პრობლემის აღწერით, გამეორების ნაბიჯებითა და proof-of-concept-ით. საჯარო გამჟღავნებამდე გამოსწორების გონივრული დრო მოგვეცი.'
              : ' with a description of the issue, steps to reproduce, and any proof-of-concept. Please give us reasonable time to fix it before public disclosure.'}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'გთხოვთ' : 'Please do'}</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {isKa ? (
              <>
                <li>ტესტირება მხოლოდ საკუთარ ანგარიშსა და მონაცემებზე ჩაატარე.</li>
                <li>აღმოჩენისთანავე შეგვატყობინე.</li>
                <li>დეტალები კონფიდენციალურად შეინახე, სანამ შესწორებას გამოვუშვებთ.</li>
              </>
            ) : (
              <>
                <li>Test only against your own account and data.</li>
                <li>Report as soon as you can after discovery.</li>
                <li>Keep details confidential until we’ve shipped a fix.</li>
              </>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'აკრძალულია' : 'Please don’t'}</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1.5">
            {isKa ? (
              <>
                <li>სხვისი მონაცემების ნახვა, შეცვლა ან წაშლა.</li>
                <li>DoS შეტევები, სპამი ან ავტომატური შეტევები პროდაქშენზე.</li>
                <li>სოციალური ინჟინერია ჩვენი გუნდის ან მომხმარებლების მიმართ.</li>
              </>
            ) : (
              <>
                <li>Access, modify or delete data that isn’t yours.</li>
                <li>Run denial-of-service, spam or automated attacks against production.</li>
                <li>Use social engineering against our team or users.</li>
              </>
            )}
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-text-primary">{isKa ? 'რას უნდა ელოდო' : 'What to expect'}</h2>
          <p>
            {isKa
              ? 'დავადასტურებთ შეტყობინების მიღებას, გამოკვლევის მსვლელობას გაცნობებთ და გამოსწორების შემდეგ, თუ მოისურვებ, დაგიმადლებთ საჯაროდ. ამ პოლიტიკის ფარგლებში კეთილსინდისიერი მოქმედებისას სამართლებრივ ზომებს არ მივმართავთ.'
              : 'We’ll acknowledge your report, keep you updated as we investigate, and credit you once the issue is resolved if you’d like. Acting in good faith under this policy, we won’t pursue legal action.'}
          </p>
        </section>
      </div>
    </div>
  );
}
