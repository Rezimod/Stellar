import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import {
  RARITY_VISUAL,
  SHARE_CARD_BG,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_URL,
  SHARE_CARD_WIDTH,
  formatDiscoveredOn,
  shareCardNameSize,
  shareCardStars,
} from '@/components/discovery/ShareCard';
import { REVEAL_AT_MS, TOTAL_PASSES } from '@/lib/discovery/constants';
import { objectArt } from '@/lib/discovery/passArt';
import { determineObject, generateVisualGradient } from '@/lib/discovery/rarityEngine';

/**
 * Open Graph image for a pass: GET /api/discovery/share-card?wallet=X&pass=Y
 *
 * With no parameters it renders the generic launch card instead — that is the
 * OG image for /discovery itself, where there is no holder to speak of.
 *
 * The layout mirrors <ShareCard>, but written against satori's subset of CSS —
 * inline styles only, explicit `display: flex` on every container, no mask and
 * no animation. The palette, star field and type scale are imported from the
 * component so the two renderings cannot drift apart.
 *
 * Before REVEAL_AT_MS this deliberately does NOT render the object. The draw is
 * deterministic, so a public endpoint that resolved it early would hand every
 * outcome to anyone who could type a wallet address — see the security note at
 * the top of rarityEngine.ts. Pre-reveal requests get the sealed card instead.
 */

export const runtime = 'edge';

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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

function Frame({ children, seed }: { children: React.ReactNode; seed: number }) {
  return (
    <div
      style={{
        position: 'relative',
        width: SHARE_CARD_WIDTH,
        height: SHARE_CARD_HEIGHT,
        display: 'flex',
        background: SHARE_CARD_BG,
      }}
    >
      {stars(seed)}
      {children}
    </div>
  );
}

/** Right column: logo above, identity in the middle, provenance at the foot. */
function Identity({
  title,
  titleSize,
  badge,
  badgeStyle,
  footNote,
}: {
  title: string;
  titleSize: number;
  badge: string;
  badgeStyle: { background: string; border: string; color: string };
  footNote: string;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '40%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '52px 56px',
      }}
    >
      <div
        style={{
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
            fontSize: titleSize,
            fontWeight: 700,
            lineHeight: 1.06,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
            textAlign: 'right',
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 20,
            padding: '8px 18px',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.18em',
            ...badgeStyle,
          }}
        >
          {badge}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <div style={{ fontSize: 14, letterSpacing: '0.04em', color: 'rgba(255, 255, 255, 0.34)' }}>
          {footNote}
        </div>
        <div
          style={{
            marginTop: 12,
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

/** The blacked-out object, shared by the generic card and the pre-reveal one. */
function SealedDisc() {
  return (
    <div
      style={{
        position: 'relative',
        width: '60%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 380,
          height: 380,
          borderRadius: 999,
          background: 'radial-gradient(circle at 50% 45%, #0A0D1C 0%, #04050D 62%, #000000 100%)',
          border: '1px solid rgba(0, 200, 240, 0.2)',
          boxShadow: '0 0 90px 10px rgba(0, 200, 240, 0.12)',
        }}
      />
    </div>
  );
}

const SEALED_BADGE = {
  background: 'rgba(0, 200, 240, 0.12)',
  border: '1px solid rgba(0, 200, 240, 0.42)',
  color: '#00C8F0',
};

function png(element: React.ReactElement, maxAge: number) {
  return new ImageResponse(element, {
    width: SHARE_CARD_WIDTH,
    height: SHARE_CARD_HEIGHT,
    headers: { 'Cache-Control': `public, max-age=${maxAge}, s-maxage=${maxAge}` },
  });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const walletParam = params.get('wallet');
  const passParam = params.get('pass');
  const revealDate = formatDiscoveredOn(REVEAL_AT_MS);

  // No pass asked for: the launch card, used as the OG image for /discovery.
  if (walletParam === null && passParam === null) {
    return png(
      <Frame seed={0x0c05_0217}>
        <SealedDisc />
        <Identity
          title="Sealed"
          titleSize={58}
          badge={`${TOTAL_PASSES.toLocaleString('en-US')} OBJECTS`}
          badgeStyle={SEALED_BADGE}
          footNote={`Opens ${revealDate}`}
        />
      </Frame>,
      // Fixed artwork, but short enough that a copy edit here is not stuck in
      // every social cache for a year.
      86_400,
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
      <Frame seed={pass * 2654435761}>
        <SealedDisc />
        <Identity
          title="Sealed"
          titleSize={58}
          badge={`PASS #${pass}`}
          badgeStyle={SEALED_BADGE}
          footNote={`Opens ${revealDate}`}
        />
      </Frame>,
      // Short, so the card flips to the revealed art without a stale CDN copy.
      300,
    );
  }

  const object = determineObject(wallet, pass);
  const v = RARITY_VISUAL[object.rarity];
  const art = objectArt(object.id);
  // satori fetches over the network — a root-relative path resolves to nothing
  // here, so the photograph needs an absolute URL built from this request.
  const artUrl = art ? new URL(art.src, request.nextUrl.origin).toString() : null;

  return png(
    <Frame seed={object.visualSeed}>
      <div
        style={{
          position: 'relative',
          width: '60%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {v.ring !== 'none' && (
          <div
            style={{
              position: 'absolute',
              width: 432,
              height: 432,
              borderRadius: 999,
              border: `1px solid ${v.edge}`,
            }}
          />
        )}
        {artUrl ? (
          <img
            src={artUrl}
            width={380}
            height={380}
            style={{
              width: 380,
              height: 380,
              borderRadius: 999,
              objectFit: 'cover',
              boxShadow: v.glow,
            }}
          />
        ) : (
          <div
            style={{
              width: 380,
              height: 380,
              borderRadius: 999,
              background: generateVisualGradient(object.visualSeed, object.rarity),
              boxShadow: v.glow,
            }}
          />
        )}
      </div>
      <Identity
        title={object.name}
        titleSize={shareCardNameSize(object.name)}
        badge={object.rarity}
        badgeStyle={{ background: v.tint, border: `1px solid ${v.edge}`, color: v.accent }}
        footNote={`Discovered ${revealDate}${art ? ` · ${art.instrument}` : ''}`}
      />
    </Frame>,
    // The draw is fixed once revealed, so this is safe to cache hard.
    31_536_000,
  );
}
