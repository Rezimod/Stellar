import { SURVEYED, plateFile, type PlateFileLayer } from '@/lib/sidera/plate/objects';

/**
 * A survey plate's sky and object layers as SVG files: /cards/plate/SATURN-object.svg.
 * They carry no text, so they need none of the page's fonts, and as files they are
 * fetched once and cached instead of being inlined into every page that shows a card.
 */
export const dynamic = 'force-static';

const LAYERS: PlateFileLayer[] = ['sky', 'object'];

export function generateStaticParams() {
  return SURVEYED.flatMap((d) => LAYERS.map((l) => ({ file: `${d}-${l}.svg` })));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = /^([A-Z0-9-]+)-(sky|object)\.svg$/.exec(file);
  const svg = m ? plateFile(m[1], m[2] as PlateFileLayer) : null;
  if (!svg) return new Response('Not found', { status: 404 });
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
