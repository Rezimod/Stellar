// Daily telescope imagery for the Sky page gallery.
// Primary source: NASA's Astronomy Picture of the Day (APOD) — a genuinely
// daily feed of real telescope/observatory imagery. We pull the last several
// days and fall back to a curated set of flagship NASA/ESA/Webb releases if
// the API is unreachable, so the section never renders empty.

import { NextResponse } from 'next/server';

export const revalidate = 86400; // refresh once a day

export interface SpaceImage {
  id: string;
  title: string;
  date: string;
  summary: string;
  imageUrl: string;
  source: 'NASA' | 'ESA' | 'Webb' | 'Hubble';
  sourceUrl: string;
  credit?: string;
}

/** Flagship images with stable CDN URLs — used as a graceful fallback. */
const CURATED: SpaceImage[] = [
  {
    id: 'jwst-cosmic-cliffs',
    title: 'Cosmic Cliffs in the Carina Nebula',
    date: '2022-07-12',
    summary:
      'The edge of the young star-forming region NGC 3324, captured in near-infrared by the James Webb Space Telescope.',
    imageUrl: 'https://stsci-opo.org/STScI-01G8GZQ3ZFEFE2FY0NB6JT22T4.png',
    source: 'Webb',
    sourceUrl: 'https://webbtelescope.org/contents/media/images/2022/031/01G77PKB8NKR7S8Z6HBXKSPUS5',
    credit: 'NASA, ESA, CSA, STScI',
  },
  {
    id: 'jwst-pillars',
    title: 'Pillars of Creation',
    date: '2022-10-19',
    summary:
      "Webb's near-infrared view of the iconic pillars in the Eagle Nebula, where new stars are forming inside dense clouds of gas and dust.",
    imageUrl: 'https://stsci-opo.org/STScI-01GFNN3PWJMY4RQXKZ585FTML7.png',
    source: 'Webb',
    sourceUrl: 'https://webbtelescope.org/contents/media/images/2022/052/01GF423GBQSK6ANC89NTFJW8VM',
    credit: 'NASA, ESA, CSA, STScI',
  },
  {
    id: 'jwst-southern-ring',
    title: 'Southern Ring Nebula',
    date: '2022-07-12',
    summary:
      'A dying star cloaked in shells of gas and dust, resolved in unprecedented detail by Webb.',
    imageUrl: 'https://stsci-opo.org/STScI-01G7DB1FHPMJCCY59CQGZC1YJQ.png',
    source: 'Webb',
    sourceUrl: 'https://webbtelescope.org/contents/media/images/2022/033/01G709QXZPFH83NZFAFP66WVCZ',
    credit: 'NASA, ESA, CSA, STScI',
  },
  {
    id: 'jwst-stephans-quintet',
    title: "Stephan's Quintet",
    date: '2022-07-12',
    summary:
      'A visual grouping of five galaxies, four locked in a cosmic dance of repeated close encounters.',
    imageUrl: 'https://stsci-opo.org/STScI-01G7JGD4SDDV90D3PVB0YV5BD9.png',
    source: 'Webb',
    sourceUrl: 'https://webbtelescope.org/contents/media/images/2022/034/01G70AD79VKD9NHRP3SDA70AS0',
    credit: 'NASA, ESA, CSA, STScI',
  },
  {
    id: 'jwst-tarantula',
    title: 'The Tarantula Nebula',
    date: '2022-09-06',
    summary:
      'The largest and brightest star-forming region in our galactic neighbourhood, imaged in infrared by Webb.',
    imageUrl: 'https://stsci-opo.org/STScI-01GA76Q01D09HFEV174SVMRBME.png',
    source: 'Webb',
    sourceUrl: 'https://webbtelescope.org/contents/media/images/2022/041/01GA76MYFN0FMkD3KWDxXC4F22',
    credit: 'NASA, ESA, CSA, STScI',
  },
];

function apodPageUrl(date: string): string {
  // APOD archive page is ap{YYMMDD}.html
  const [y, m, d] = date.split('-');
  return `https://apod.nasa.gov/apod/ap${y.slice(2)}${m}${d}.html`;
}

function clip(text: string, max = 260): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export async function GET() {
  const key = process.env.NASA_API_KEY || 'DEMO_KEY';
  const end = new Date();
  const start = new Date(end.getTime() - 8 * 24 * 3600 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await fetch(
      `https://api.nasa.gov/planetary/apod?api_key=${key}&start_date=${fmt(start)}&end_date=${fmt(end)}&thumbs=true`,
      { next: { revalidate } },
    );
    if (!res.ok) throw new Error(`APOD ${res.status}`);
    const raw: Array<{
      date: string;
      title: string;
      explanation: string;
      url: string;
      hdurl?: string;
      media_type: string;
      thumbnail_url?: string;
      copyright?: string;
    }> = await res.json();

    const images: SpaceImage[] = raw
      .filter((d) => d.media_type === 'image' && (d.url || d.hdurl))
      .map((d) => ({
        id: `apod-${d.date}`,
        title: d.title,
        date: d.date,
        summary: clip(d.explanation),
        imageUrl: d.url || d.hdurl!,
        source: 'NASA' as const,
        sourceUrl: apodPageUrl(d.date),
        credit: d.copyright?.trim() || 'NASA APOD',
      }))
      .reverse();

    if (images.length === 0) throw new Error('no apod images');
    return NextResponse.json({ images, source: 'apod' });
  } catch {
    return NextResponse.json({ images: CURATED, source: 'curated' });
  }
}
