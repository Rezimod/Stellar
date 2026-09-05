import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  compassPoint,
  parseFirstLightMoment,
  placeById,
  skyAt,
} from '@/lib/observatory/first-light';
import { SIM_TARGET_BY_ID } from '@/lib/observatory/sim-targets';
import { checkRateLimit, firstLightPosterRateLimit } from '@/lib/rate-limit';

// Node, not edge: the sky is computed with astronomy-engine, which is a Node
// library and takes the edge runtime down with it.
export const runtime = 'nodejs';

/**
 * The poster.
 *
 * Laid out as a specimen sheet rather than a mural, and that is a decision
 * forced by the optics: a 150 mm telescope does not give a wall-filling Saturn,
 * it gives a small sharp real one. A poster that pretends to be Hubble fails
 * the moment it is compared to Hubble. A poster that reads as a *record* — a
 * modest frame with its measurements set around it, the way an observatory
 * plate or a herbarium sheet is laid out — does not.
 *
 * Sky positions are computed. Instrument measurements belong to a separate,
 * dated capture, which this preview does not contain.
 */

const W = 1000;
const H = 1414; // A-series proportion, 1:√2.

const INK = '#E7EBF6';
const DIM = '#8E9AB8';
const RULE = 'rgba(231,235,246,0.18)';
const GROUND = '#070E22';
const ACCENT = '#FFB347';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;

  const place = placeById(q.get('place') ?? '');
  const target = SIM_TARGET_BY_ID.get(q.get('target') ?? '') ?? null;
  const moment = parseFirstLightMoment(q.get('at'));
  const recipient = (q.get('for') ?? '').slice(0, 40);
  const occasion = (q.get('occasion') ?? '').slice(0, 60);

  if (!place || !target || !moment) {
    return new Response('Poster needs a valid place, target, and UTC date between 1900 and 2100', { status: 400 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip') ?? 'unknown';
  try {
    const limit = await checkRateLimit(firstLightPosterRateLimit, ip);
    if (!limit.success) {
      return new Response('Too many previews. Please try again shortly.', {
        status: 429,
        headers: { 'Retry-After': String(Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000))) },
      });
    }
  } catch {
    return new Response('Poster previews are temporarily unavailable.', { status: 503 });
  }

  const sky = skyAt({ place, at: moment, targetId: target.id });
  const up = sky.bodies.filter((b) => b.up);
  const font = await readFile(join(process.cwd(), 'src/app/_og/noto-sans-georgian-400.ttf'));

  const nightOf = moment.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const timeOf = moment.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          background: GROUND,
          color: INK,
          fontFamily: 'Noto Sans Georgian',
          padding: 64,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: DIM, letterSpacing: 3 }}>
          <span>FIRST LIGHT</span>
          <span>STELLAR OBSERVATORY</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 56 }}>
          <div style={{ fontSize: 64, lineHeight: 1.05, letterSpacing: -1.5 }}>{target.name}</div>
          {recipient && (
            <div style={{ fontSize: 30, marginTop: 18, color: ACCENT }}>
              {`for ${recipient}${occasion ? `, ${occasion}` : ''}`}
            </div>
          )}
          <div style={{ fontSize: 24, marginTop: 14, color: DIM }}>
            {`${nightOf} · ${timeOf} UTC · ${place.name}`}
          </div>
        </div>

        {/* The frame. Empty until an instrument has photographed this object —
            and it says so rather than showing something no telescope took. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 44,
            height: 460,
            border: `1px solid ${RULE}`,
            background: '#04091A',
          }}
        >
          <div style={{ display: 'flex', fontSize: 18, color: DIM, letterSpacing: 2, textAlign: 'center', padding: 40 }}>
            PREVIEW — NO TELESCOPE PHOTOGRAPH ATTACHED
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 40, flexGrow: 1 }}>
          <div style={{ display: 'flex', fontSize: 16, color: DIM, letterSpacing: 3, marginBottom: 18 }}>
            THE SKY THAT NIGHT
          </div>

          <Row label="Moon" value={`${sky.moon.phase} · ${(sky.moon.illumination * 100).toFixed(0)}% lit`} />
          <Row label="Sky conditions" value={sky.darkEnough ? 'Sun at least 6° below horizon; weather unknown' : 'Daylight or bright twilight; weather unknown'} />
          <Row
            label={target.name}
            value={
              sky.target
                ? sky.target.up
                  ? `${sky.target.altitude.toFixed(0)}° above the horizon, ${compassPoint(sky.target.azimuth)}`
                  : 'below the horizon'
                : 'position not computed'
            }
          />
          <Row
            label="Also up"
            value={up.length > 0 ? up.map((b) => b.name).join(' · ') : 'no planets above the horizon'}
          />
          <Row label="Place" value={`${place.name} · ${place.lat.toFixed(4)}, ${place.lon.toFixed(4)}`} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', borderTop: `1px solid ${RULE}`, paddingTop: 22 }}>
          <div style={{ display: 'flex', fontSize: 17, color: DIM, lineHeight: 1.5 }}>
            Sky positions are computed for the selected moment and place.
            Weather and local obstructions are not reconstructed. This preview
            contains no telescope photograph or proof of an observation.
          </div>
          <div style={{ display: 'flex', fontSize: 16, color: DIM, marginTop: 14, letterSpacing: 1 }}>
            stellarr.club/first-light
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: 'Noto Sans Georgian', data: font, weight: 400, style: 'normal' }],
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderTop: `1px solid ${RULE}`,
        padding: '16px 0',
        fontSize: 22,
      }}
    >
      <span style={{ color: DIM }}>{label}</span>
      <span style={{ color: INK, textAlign: 'right', maxWidth: 560 }}>{value}</span>
    </div>
  );
}
