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
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs%2C_Glittering_Landscape_of_Star_Birth.jpg/1280px-NASA%E2%80%99s_Webb_Reveals_Cosmic_Cliffs%2C_Glittering_Landscape_of_Star_Birth.jpg',
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
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Pillars_of_Creation_%28NIRCam_Image%29.jpg/1280px-Pillars_of_Creation_%28NIRCam_Image%29.jpg',
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
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Southern_Ring_Nebula_by_Webb_Telescope_%282022%29.jpg/1280px-Southern_Ring_Nebula_by_Webb_Telescope_%282022%29.jpg',
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
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Stephan%27s_Quintet_taken_by_James_Webb_Space_Telescope.jpg/1280px-Stephan%27s_Quintet_taken_by_James_Webb_Space_Telescope.jpg",
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
    imageUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Tarantula_Nebula_by_JWST.jpg/1280px-Tarantula_Nebula_by_JWST.jpg',
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
