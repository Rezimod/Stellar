import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import {
  ARTIFACT_HEIGHT,
  ARTIFACT_LEFT,
  ARTIFACT_PAD,
  ARTIFACT_RAIL_H,
  ARTIFACT_SHADOW,
  ARTIFACT_TILT,
  ARTIFACT_TOP,
  ARTIFACT_WIDTH,
  SHARE_CARD_BG,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_URL,
  SHARE_CARD_WIDTH,
  SHARE_GROUND_VEIL,
  SHARE_MATERIAL,
  formatDiscoveredOn,
  shareCardNameSize,
  shareCardStars,
} from '@/components/discovery/ShareCard';
import { REVEAL_AT_MS, TOTAL_PASSES } from '@/lib/discovery/constants';
import { objectArt } from '@/lib/discovery/passArt';
import {
  RARITY_TO_TIER,
  determineObject,
  generateVisualGradient,
  type CelestialObject,
} from '@/lib/discovery/rarityEngine';
import { TIER_BY_ID } from '@/lib/discovery/tiers';

/**
 * Open Graph image for a pass: GET /api/discovery/share-card?wallet=X&pass=Y
 *
 * With no parameters it renders the generic launch card instead — that is the
 * OG image for /discovery itself, where there is no holder to speak of.
 *
 * The layout mirrors <ShareCard>, but written against satori's subset of CSS —
 * inline styles only, explicit `display: flex` on every container, no CSS
 * variables and no animation. The materials, geometry, star field and type
 * scale are imported from the component so the two renderings cannot drift.
 *
 * Before REVEAL_AT_MS this deliberately does NOT render the object. The draw is
 * deterministic, so a public endpoint that resolved it early would hand every
 * outcome to anyone who could type a wallet address — see the security note at
 * the top of rarityEngine.ts. Pre-reveal requests get the sealed card instead.
 */

export const runtime = 'edge';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/* ── Fonts ────────────────────────────────────────────────────────────────
   satori has no stylesheet and no access to next/font, so the two faces the
   card is typeset in have to arrive as font data. Fetched subsetted to the
   glyphs this card can actually contain — printable ASCII, plus the degree and
   arc marks in case a coordinate ever reaches the face — which keeps the
   download to a few kilobytes and, since the URL never varies, warm upstream.

   Every failure path returns null and the image renders in satori's default
   face. A social card in the wrong font is a worse card; a social card that
   500s because Google was slow is no card at all. */
const GLYPHS =
  " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~°′″";

async function googleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  const url =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}` +
    `&text=${encodeURIComponent(GLYPHS)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    // With no browser User-Agent, Google serves TrueType rather than woff2,
    // which is the only thing of the three satori can parse.
    const src = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/.exec(
      await res.text(),
    );
    if (!src) return null;
    const file = await fetch(src[1]);
    return file.ok ? await file.arrayBuffer() : null;
  } catch {
    return null;
  }
}

type Font = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: 'normal' };

/** Orbitron for display type, JetBrains Mono for data, Geist for everything
 *  else — the app's stack, minus the pieces this card never sets. */
async function loadFonts(): Promise<Font[]> {
  const [display, body, mono, monoBold] = await Promise.all([
    googleFont('Orbitron', 600),
    googleFont('Geist', 600),
    googleFont('JetBrains Mono', 400),
    googleFont('JetBrains Mono', 700),
  ]);

  const fonts: Font[] = [];
  if (display) fonts.push({ name: 'Orbitron', data: display, weight: 600, style: 'normal' });
  if (body) fonts.push({ name: 'Geist', data: body, weight: 600, style: 'normal' });
  if (mono) fonts.push({ name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' });
  if (monoBold) fonts.push({ name: 'JetBrains Mono', data: monoBold, weight: 700, style: 'normal' });
  return fonts;
}

const DISPLAY = 'Orbitron';
const BODY = 'Geist';
const MONO = 'JetBrains Mono';

function stars(seed: number) {
  return shareCardStars(seed).map((s, i) => (
    <div
      key={i}
      style={{
        position: 'absolute',
        left: s.x,
        top: s.y,
        width: s.r * 2,
        height: s.r * 2,
        borderRadius: 999,
        background: '#FFFFFF',
        opacity: s.o,
      }}
    />
  ));
}

/** The ground: the tier's material for a revealed pass, deep space for a
 *  sealed one, and the same lit-table veil over either. */
function Frame({
  children,
  seed,
  ground,
}: {
  children: React.ReactNode;
  seed: number;
  ground: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        display: 'flex',
        background: ground,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: SHARE_CARD_WIDTH,
          height: SHARE_CARD_HEIGHT,
          background: SHARE_GROUND_VEIL,
        }}
      />
      {stars(seed)}
      {children}
    </div>
  );
}

/** Right column: logo above, identity in the middle, provenance at the foot. */
function Identity({
  title,
  titleSize,
  mark,
  markColor,
  markChip,
  markEdge,
  footNote,
}: {
  title: string;
  titleSize: number;
  mark: string;
  markColor: string;
  markChip: string;
  markEdge: string;
  footNote: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: SHARE_CARD_WIDTH * 0.55,
        top: 0,
        width: SHARE_CARD_WIDTH * 0.45,
        height: SHARE_CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '52px 56px',
      }}
    >
      <div
        style={{
          fontFamily: BODY,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.32em',
          color: 'rgba(255, 255, 255, 0.55)',
        }}
      >
        STELLARR
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div
          style={{
            fontFamily: DISPLAY,
            fontSize: titleSize,
            fontWeight: 600,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            color: '#FFFFFF',
            textAlign: 'right',
          }}
        >
          {title}
        </div>

        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 5,
              background: markChip,
              border: `1px solid ${markEdge}`,
            }}
          />
          <div
            style={{
              marginLeft: 10,
              fontFamily: BODY,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: markColor,
            }}
          >
            {mark}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 14,
            letterSpacing: '0.04em',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          {footNote}
        </div>
        <div
          style={{
            marginTop: 12,
            fontFamily: MONO,
            fontSize: 15,
            letterSpacing: '0.06em',
            color: 'rgba(255, 255, 255, 0.62)',
          }}
        >
          {SHARE_CARD_URL}
        </div>
      </div>
    </div>
  );
}

/** The artifact, tilted on the left 55% with its contact shadow. Mirrors the
 *  three blocks of <ShareCard>, placed from the same geometry constants — see
 *  the note there on why they are absolute rather than a flex column. */
function Artifact({
  object,
  passNumber,
  artUrl,
}: {
  object: CelestialObject;
  passNumber: number;
  /** Absolute URL — satori fetches over the network, so a root-relative path
   *  resolves to nothing here. Null when the object has no photograph. */
  artUrl: string | null;
}) {
  const m = SHARE_MATERIAL[object.rarity];
  const art = objectArt(object.id);
  const tier = TIER_BY_ID[RARITY_TO_TIER[object.rarity]];
  const legendary = object.rarity === 'LEGENDARY';

  return (
    <div
      style={{
        position: 'absolute',
        left: ARTIFACT_LEFT,
        top: ARTIFACT_TOP,
        width: ARTIFACT_WIDTH,
        height: ARTIFACT_HEIGHT,
        transform: `rotate(${ARTIFACT_TILT}deg)`,
        display: 'flex',
        borderRadius: 16,
        background: m.sheen ? `${m.sheen}, ${m.surface}` : m.surface,
        border: `1px solid ${m.edge}`,
        boxShadow: ARTIFACT_SHADOW,
      }}
    >
      {/* Rail. Two half-width boxes rather than one row with the names pushed
          apart: satori collapses an absolutely-positioned flex ROW to a
          hairline and takes its text with it, while a column of the same
          dimensions lays out correctly. The rule under them is its own box for
          the same reason.

          Note also that the card carries no `overflow: hidden`: with one, satori
          drops every child declared before the plate. It does not need one —
          the plate is the only thing that can overflow, and it clips itself. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: ARTIFACT_WIDTH / 2,
          height: ARTIFACT_RAIL_H,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: ARTIFACT_PAD,
          fontFamily: DISPLAY,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.18em',
          color: m.ink,
        }}
      >
        {tier.name.toUpperCase()}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: ARTIFACT_WIDTH / 2,
          width: ARTIFACT_WIDTH / 2,
          height: ARTIFACT_RAIL_H,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end',
          paddingRight: ARTIFACT_PAD,
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.04em',
          color: 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {`Pass #${passNumber}`}
      </div>

      <div
        style={{
          position: 'absolute',
          top: ARTIFACT_RAIL_H - 1,
          left: 0,
          width: ARTIFACT_WIDTH,
          height: 1,
          background: 'rgba(255, 255, 255, 0.07)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: ARTIFACT_RAIL_H,
          left: 0,
          width: ARTIFACT_WIDTH,
          height: ARTIFACT_WIDTH,
          display: 'flex',
          overflow: 'hidden',
          background: '#04060C',
        }}
      >
        {artUrl ? (
          <img
            src={artUrl}
            width={ARTIFACT_WIDTH}
            height={ARTIFACT_WIDTH}
            style={{
              width: ARTIFACT_WIDTH,
              height: ARTIFACT_WIDTH,
              objectFit: 'cover',
              transform: `scale(${art?.scale ?? 1})`,
            }}
          />
        ) : (
          <div
            style={{
              width: ARTIFACT_WIDTH,
              height: ARTIFACT_WIDTH,
              background: generateVisualGradient(object.visualSeed, object.rarity),
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            width: ARTIFACT_WIDTH - 24,
            height: ARTIFACT_WIDTH - 24,
            border: `1px solid ${m.frame}`,
          }}
        />
        {legendary && (
          <div
            style={{
              position: 'absolute',
              top: 15,
              left: 15,
              width: ARTIFACT_WIDTH - 30,
              height: ARTIFACT_WIDTH - 30,
              border: `1px solid ${m.frame}`,
            }}
          />
        )}
      </div>

      {/* Specimen label, and no value block after it — see <ShareCard>. */}
      <div
        style={{
          position: 'absolute',
          top: ARTIFACT_RAIL_H + ARTIFACT_WIDTH,
          left: 0,
          width: ARTIFACT_WIDTH,
          height: ARTIFACT_HEIGHT - ARTIFACT_RAIL_H - ARTIFACT_WIDTH,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: `0 ${ARTIFACT_PAD}px`,
        }}
      >
        <div
          style={{
            fontFamily: BODY,
            fontSize: 15,
            fontWeight: 600,
            lineHeight: 1.25,
            color: '#FFFFFF',
          }}
        >
          {object.name}
        </div>
        <div
          style={{
            marginTop: 4,
            fontFamily: MONO,
            fontSize: 11,
            lineHeight: 1.3,
            letterSpacing: '0.05em',
            color: 'rgba(255, 255, 255, 0.54)',
          }}
        >
          {art ? art.instrument.toUpperCase() : 'NOT YET IMAGED'}
        </div>
      </div>
    </div>
  );
}

/** The blacked-out object, shared by the generic card and the pre-reveal one.
 *  Sealed passes have no material yet — nobody knows which one they are — so
 *  this is the one card in the set that is still a disc on deep space. */
function SealedDisc() {
  return (
    <div
      style={{
        position: 'absolute',
        left: Math.round(SHARE_CARD_WIDTH * 0.275 - 190),
        top: Math.round(SHARE_CARD_HEIGHT / 2 - 190),
        width: 380,
        height: 380,
        display: 'flex',
        borderRadius: 999,
        background: 'radial-gradient(circle at 50% 45%, #0A0D1C 0%, #04050D 62%, #000000 100%)',
        border: '1px solid rgba(0, 200, 240, 0.2)',
        boxShadow: '0 0 90px 10px rgba(0, 200, 240, 0.12)',
      }}
    />
  );
}

const SEALED_MARK = {
  markColor: '#00C8F0',
  markChip: 'linear-gradient(135deg, #0d2b33 0%, #06141a 52%, #0a2028 100%)',
  markEdge: 'rgba(0, 200, 240, 0.42)',
};

function png(element: React.ReactElement, maxAge: number, fonts: Font[]) {
  return new ImageResponse(element, {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    headers: { 'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}` },
    ...(fonts.length > 0 ? { fonts } : {}),
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const walletParam = params.get('wallet');
  const passParam = params.get('pass');
  const revealDate = formatDiscoveredOn(REVEAL_AT_MS);
  const fonts = await loadFonts();

  // No pass asked for: the launch card, used as the OG image for /discovery.
  if (walletParam === null && passParam === null) {
    return png(
      <Frame seed={0x0c05_0217} ground={SHARE_CARD_BG}>
        <SealedDisc />
        <Identity
          title="Sealed"
          titleSize={52}
          mark={`${TOTAL_PASSES.toLocaleString('en-US')} OBJECTS`}
          {...SEALED_MARK}
          footNote={`Opens ${revealDate}`}
        />
      </Frame>,
      // Fixed artwork, but short enough that a copy edit here is not stuck in
      // every social cache for a year.
      86_400,
      fonts,
    );
  }

  const wallet = walletParam ?? '';
  const pass = Number(passParam);

  if (!BASE58.test(wallet)) {
    return Response.json({ error: 'A valid wallet address is required.' }, { status: 400 });
  }
  if (!Number.isInteger(pass) || pass < 1 || pass > TOTAL_PASSES) {
    return Response.json(
      { error: `pass must be a whole number between 1 and ${TOTAL_PASSES}.` },
      { status: 400 },
    );
  }

  // Pre-reveal: sealed. The seed is the pass number, not the draw, so nothing
  // about the outcome leaks through the star field either.
  if (Date.now() < REVEAL_AT_MS) {
    return png(
      <Frame seed={pass * 2654435761} ground={SHARE_CARD_BG}>
        <SealedDisc />
        <Identity
          title="Sealed"
          titleSize={52}
          mark={`PASS #${pass}`}
          {...SEALED_MARK}
          footNote={`Opens ${revealDate}`}
        />
      </Frame>,
      // Short, so the card flips to the revealed art without a stale CDN copy.
      300,
      fonts,
    );
  }

  const object = determineObject(wallet, pass);
  const m = SHARE_MATERIAL[object.rarity];
  const art = objectArt(object.id);
  const artUrl = art ? new URL(art.src, request.nextUrl.origin).toString() : null;

  return png(
    <Frame seed={object.visualSeed} ground={m.ground}>
      <Artifact object={object} passNumber={pass} artUrl={artUrl} />
      <Identity
        title={object.name}
        titleSize={shareCardNameSize(object.name)}
        mark={object.rarity}
        markColor={m.ink}
        markChip={m.chip}
        markEdge={m.edge}
        footNote={`Discovered ${revealDate}`}
      />
    </Frame>,
    // The draw is fixed once revealed, so this is safe to cache hard.
    31_536_000,
    fonts,
  );
}
