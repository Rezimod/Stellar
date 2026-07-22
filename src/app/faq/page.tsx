import Link from 'next/link';
import type { Metadata } from 'next';
import { getLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'FAQ — How Stellar Works, Stars, NFTs & Rewards | Stellar',
  description:
    'Answers to common questions about Stellar: how to earn Stars, what discovery NFTs are, whether you need a telescope, how the Solana wallet works, and more.',
  alternates: { canonical: '/faq' },
};

type Faq = { q: string; a: string; qKa: string; aKa: string };

const faqs: Faq[] = [
  {
    q: 'What is Stellar?',
    a: 'Stellar is an astronomy app for telescope, smartphone and camera owners: a 7-day sky forecast for your location, a live planet tracker, ASTRA — an AI space companion, observation missions, and Stars you can put toward real telescopes and optics from Astroman.',
    qKa: 'რა არის Stellar?',
    aKa: 'Stellar არის ასტრონომიის აპლიკაცია ტელესკოპის, სმარტფონისა და კამერის მფლობელებისთვის: 7-დღიანი ცის პროგნოზი შენს ლოკაციაზე, პლანეტების ცოცხალი ტრეკერი, ASTRA — ხელოვნური ინტელექტის კოსმოსური თანამგზავრი, სადამკვირვებლო მისიები და Stars ქულები, რომლებსაც ნამდვილ ტელესკოპებსა და ოპტიკაზე გადაცვლი Astroman-ში.',
  },
  {
    q: 'Is Stellar free?',
    a: 'Yes. Creating an account and using the core app — sky forecasts, the planet tracker, missions, learning guides and the community feed — is free. Stellar Pro is an optional $7/month upgrade, and physical gear from the shop is paid separately.',
    qKa: 'უფასოა Stellar?',
    aKa: 'დიახ. ანგარიშის შექმნა და აპის ძირითადი ნაწილი — ცის პროგნოზი, პლანეტების ტრეკერი, მისიები, სასწავლო გაკვეთილები და საზოგადოების ლენტა — უფასოა. Stellar Pro არჩევითი გამოწერაა თვეში $7-ად, ხოლო მაღაზიაში არსებული ფიზიკური აღჭურვილობა ცალკე იყიდება.',
  },
  {
    q: 'Do I need a telescope to use Stellar?',
    a: 'No. Stellar works for smartphone and camera owners too. Many missions are naked-eye or phone-camera friendly; a telescope simply unlocks more advanced targets.',
    qKa: 'მჭირდება ტელესკოპი Stellar-ის გამოსაყენებლად?',
    aKa: 'არა. Stellar სმარტფონისა და კამერის მფლობელებისთვისაც მუშაობს. მისიების დიდი ნაწილი შეუიარაღებელი თვალით ან ტელეფონის კამერით სრულდება; ტელესკოპი უბრალოდ უფრო რთულ სამიზნეებს ხსნის.',
  },
  {
    q: 'How do I earn Stars?',
    a: 'You earn Stars by completing missions — photographing tonight’s targets, logging verified observations, maintaining nightly streaks, and taking part in community events.',
    qKa: 'როგორ ვშოულობ Stars-ს?',
    aKa: 'Stars გროვდება მისიების შესრულებით — დღევანდელი სამიზნეების გადაღებით, დადასტურებული დაკვირვებების ჩაწერით, ყოველღამური სერიის შენარჩუნებითა და საზოგადოებრივ ივენთებში მონაწილეობით.',
  },
  {
    q: 'What can I do with Stars?',
    a: 'Stars are Stellar’s in-app reward and an SPL token on Solana. You can put them toward real telescopes, eyepieces and accessories from Astroman and partner dealers through the shop — roughly 4.69 Stars are earned per 1 GEL of catalog value.',
    qKa: 'რისთვის გამოვიყენო Stars?',
    aKa: 'Stars არის აპის შიდა ჯილდო და ამავე დროს SPL ტოკენი Solana-ზე. მაღაზიაში მისი გამოყენება შეგიძლია ნამდვილ ტელესკოპებზე, ოკულარებსა და აქსესუარებზე Astroman-სა და პარტნიორ დილერებთან — კატალოგის 1 ლარის ღირებულებაზე დაახლოებით 4.69 Star მოდის.',
  },
  {
    q: 'What are discovery NFTs?',
    a: 'When you log a verified observation, Stellar mints a compressed NFT on Solana mainnet as a permanent, tamper-proof record that you observed a given object at a given time. They’re keepsakes of your own observations, not financial instruments.',
    qKa: 'რა არის აღმოჩენის NFT-ები?',
    aKa: 'როცა დადასტურებულ დაკვირვებას ჩაწერ, Stellar Solana-ს mainnet-ზე ქმნის compressed NFT-ს — მუდმივ, გაუყალბებელ ჩანაწერს იმის შესახებ, რომ კონკრეტული ობიექტი კონკრეტულ დროს დააკვირდი. ეს შენივე დაკვირვების სუვენირია და არა ფინანსური ინსტრუმენტი.',
  },
  {
    q: 'Do discovery NFTs have monetary value?',
    a: 'No. They are records of your observations with no guaranteed financial value, and we make no promise of secondary-market liquidity.',
    qKa: 'აქვს აღმოჩენის NFT-ებს ფულადი ღირებულება?',
    aKa: 'არა. ისინი შენი დაკვირვებების ჩანაწერებია, გარანტირებული ფინანსური ღირებულების გარეშე, და მეორად ბაზარზე ლიკვიდობას არ გპირდებით.',
  },
  {
    q: 'How does the Solana wallet work?',
    a: 'A wallet is created for you automatically when you sign in with email or a social account through Privy. You never see a seed phrase, and we cover network fees, so you don’t need any crypto to get started.',
    qKa: 'როგორ მუშაობს Solana-ს საფულე?',
    aKa: 'საფულე ავტომატურად იქმნება, როცა ელფოსტით ან სოციალური ანგარიშით შედიხარ Privy-ს მეშვეობით. seed phrase-ს საერთოდ ვერ ნახავ, ქსელის საკომისიოებს კი ჩვენ ვფარავთ — დასაწყებად კრიპტოვალუტა არ გჭირდება.',
  },
  {
    q: 'Do I need any crypto or SOL to start?',
    a: 'No. The wallet is provisioned silently and network fees are covered by us. You can use everything without buying or holding any tokens.',
    qKa: 'მჭირდება კრიპტო ან SOL დასაწყებად?',
    aKa: 'არა. საფულე შეუმჩნევლად იქმნება და ქსელის საკომისიოებს ჩვენ ვფარავთ. ყველაფრით სარგებლობა შეგიძლია ტოკენების ყიდვისა და ფლობის გარეშე.',
  },
  {
    q: 'Which devices does Stellar support?',
    a: 'Stellar is a web app that runs in any modern mobile or desktop browser and installs to your home screen as a PWA on iOS and Android. Stellar Field, our Android companion, adds an offline AI assistant for dark-sky sites with no signal.',
    qKa: 'რომელ მოწყობილობებზე მუშაობს Stellar?',
    aKa: 'Stellar ვებაპლიკაციაა და მუშაობს ნებისმიერ თანამედროვე მობილურ თუ დესკტოპ ბრაუზერში, ასევე ეკრანზე დაყენდება PWA-დ iOS-სა და Android-ზე. Stellar Field — ჩვენი Android აპლიკაცია — ოფლაინ AI ასისტენტს გთავაზობს ბნელი ცის ადგილებში, სადაც კავშირი არ არის.',
  },
  {
    q: 'How accurate are the sky forecasts?',
    a: 'Forecasts combine your location with Open-Meteo weather data and astronomical calculations to estimate cloud cover, visibility and the best observing window for each of the next seven nights.',
    qKa: 'რამდენად ზუსტია ცის პროგნოზი?',
    aKa: 'პროგნოზი აერთიანებს შენს ლოკაციას, Open-Meteo-ს ამინდის მონაცემებსა და ასტრონომიულ გამოთვლებს, რათა შეაფასოს ღრუბლიანობა, ხილვადობა და საუკეთესო სადამკვირვებლო ფანჯარა მომდევნო შვიდი ღამიდან თითოეულისთვის.',
  },
  {
    q: 'What are missions?',
    a: 'Missions are location-aware challenges and quizzes — for example photographing a planet, the Moon or a bright deep-sky object, or testing what you know about telescopes — that reward Stars when completed.',
    qKa: 'რა არის მისიები?',
    aKa: 'მისიები ლოკაციაზე მორგებული დავალებები და ქვიზებია — მაგალითად პლანეტის, მთვარის ან კაშკაშა ღრმა-კოსმოსური ობიექტის გადაღება, ან ტელესკოპების ცოდნის შემოწმება — და შესრულებისთვის Stars-ს გაძლევს.',
  },
  {
    q: 'What is the community feed?',
    a: 'The feed is where stargazers share what they’re capturing tonight. You can post your own observations and photos and see what others around the world are observing.',
    qKa: 'რა არის საზოგადოების ლენტა?',
    aKa: 'ლენტაში დამკვირვებლები აზიარებენ იმას, რასაც ამაღამ იღებენ. შენც შეგიძლია საკუთარი დაკვირვებები და ფოტოები დადო და ნახო, რას აკვირდებიან სხვები მსოფლიოს გარშემო.',
  },
  {
    q: 'How is my observation verified?',
    a: 'Your photo is checked by an AI vision model, cross-referenced with the image’s EXIF time and location, de-duplicated against earlier uploads, and compared against what was actually visible from your position that night. Only then can a discovery NFT be minted.',
    qKa: 'როგორ დასტურდება ჩემი დაკვირვება?',
    aKa: 'ფოტოს ამოწმებს AI ხედვის მოდელი, შემდეგ ის ჯვარედინად ედრება სურათის EXIF დროსა და ლოკაციას, მოწმდება ადრე ატვირთულ ფოტოებთან დუბლიკატებზე და დარდება იმას, რაც იმ ღამეს შენი პოზიციიდან ნამდვილად ჩანდა. მხოლოდ ამის შემდეგ იქმნება აღმოჩენის NFT.',
  },
  {
    q: 'What happens to my data?',
    a: 'We collect only what’s needed to run the app — such as approximate location for forecasts and your observation history. See our Privacy Policy for the full detail.',
    qKa: 'რა ხდება ჩემს მონაცემებთან?',
    aKa: 'ვაგროვებთ მხოლოდ იმას, რაც აპის მუშაობისთვის აუცილებელია — მაგალითად სავარაუდო ლოკაციას პროგნოზისთვის და შენი დაკვირვებების ისტორიას. სრული დეტალები კონფიდენციალურობის პოლიტიკაშია.',
  },
  {
    q: 'Can I use Stellar anywhere in the world?',
    a: 'Yes. Forecasts and missions are generated from your location, so Stellar works from any hemisphere and adapts to what’s visible in your sky.',
    qKa: 'შემიძლია Stellar-ის გამოყენება მსოფლიოს ნებისმიერ წერტილში?',
    aKa: 'დიახ. პროგნოზი და მისიები შენი ლოკაციიდან გამომდინარე იქმნება, ამიტომ Stellar ორივე ნახევარსფეროში მუშაობს და შენს ცაზე ხილულ ობიექტებს ერგება.',
  },
  {
    q: 'Which languages does Stellar speak?',
    a: 'English and Georgian. You can switch language any time in Settings — the choice is remembered on your device.',
    qKa: 'რომელ ენებზეა Stellar?',
    aKa: 'ინგლისურად და ქართულად. ენის შეცვლა ნებისმიერ დროს შეგიძლია პარამეტრებში — არჩევანი შენს მოწყობილობაზე ინახება.',
  },
  {
    q: 'Who is behind Stellar?',
    a: 'Stellar is built by the team behind Astroman — Georgia’s first astronomy store, with a physical shop in Tbilisi — to connect everyday stargazers with real observing and real gear.',
    qKa: 'ვინ დგას Stellar-ის უკან?',
    aKa: 'Stellar-ს ქმნის Astroman-ის გუნდი — საქართველოს პირველი ასტრონომიული მაღაზია ფიზიკური მაღაზიით თბილისში — რათა დამკვირვებლები ნამდვილ დაკვირვებასა და ნამდვილ აღჭურვილობას დაუკავშიროს.',
  },
  {
    q: 'How do I redeem a telescope?',
    a: 'Once you have enough Stars, open the shop, choose an eligible item, and apply your Stars at checkout. Physical orders are fulfilled by the listed dealer.',
    qKa: 'როგორ გადავცვალო Stars ტელესკოპში?',
    aKa: 'როცა საკმარისი Stars დაგროვდება, გახსენი მაღაზია, აირჩიე შესაფერისი ნივთი და გადახდისას გამოიყენე Stars. ფიზიკურ შეკვეთას მითითებული დილერი ასრულებს.',
  },
  {
    q: 'Is there an age requirement?',
    a: 'You should be 13 or older to use Stellar without a parent or guardian’s consent, in line with our Terms of Service.',
    qKa: 'არის ასაკობრივი შეზღუდვა?',
    aKa: 'Stellar-ის მშობლის ან მეურვის თანხმობის გარეშე გამოსაყენებლად 13 წელი მაინც უნდა გქონდეს — ასე წერია ჩვენს გამოყენების პირობებში.',
  },
  {
    q: 'How do I contact support?',
    a: 'Reach the team any time from the Contact page, or email info@astroman.ge.',
    qKa: 'როგორ დავუკავშირდე მხარდაჭერას?',
    aKa: 'ნებისმიერ დროს მოგვწერე კონტაქტის გვერდიდან ან ელფოსტაზე info@astroman.ge.',
  },
];

export default async function FaqPage() {
  const locale = await getLocale();
  const isKa = locale === 'ka';
  const items = faqs.map((f) => ({ q: isKa ? f.qKa : f.q, a: isKa ? f.aKa : f.a }));

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
      <p className="text-xs uppercase tracking-[0.2em] text-text-muted mb-3">{isKa ? 'დახმარება' : 'Help'}</p>
      <h1 className="font-display text-3xl sm:text-4xl mb-2">{isKa ? 'ხშირად დასმული კითხვები' : 'Frequently asked questions'}</h1>
      <p className="text-text-muted text-sm mb-10">
        {isKa
          ? 'ყველაფერი, რაც Stellar-ის, Stars-ის, NFT-ებისა და ჯილდოების შესახებ უნდა იცოდე.'
          : 'Everything you need to know about Stellar, Stars, NFTs and rewards.'}
      </p>

      <div className="flex flex-col gap-6 text-[15px] leading-relaxed text-text-primary/80">
        {items.map((f) => (
          <section key={f.q} className="flex flex-col gap-2">
            <h2 className="font-display text-lg text-text-primary">{f.q}</h2>
            <p>{f.a}</p>
          </section>
        ))}

        <p className="pt-6 text-text-muted text-sm">
          {isKa ? 'კითხვა დაგრჩა? ' : 'Still stuck? '}
          <Link href="/contact" className="underline underline-offset-4">
            {isKa ? 'დაგვიკავშირდი' : 'Contact the team'}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
