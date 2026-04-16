import { neon } from '@neondatabase/serverless';
import Link from 'next/link';

const CONSTELLATIONS: Record<string, string> = {
  And: 'Andromeda', Ant: 'Antlia', Aps: 'Apus', Aqr: 'Aquarius',
  Aql: 'Aquila', Ara: 'Ara', Ari: 'Aries', Aur: 'Auriga',
  Boo: 'Boötes', Cae: 'Caelum', Cam: 'Camelopardalis', Cnc: 'Cancer',
  CVn: 'Canes Venatici', CMa: 'Canis Major', CMi: 'Canis Minor',
  Cap: 'Capricornus', Car: 'Carina', Cas: 'Cassiopeia', Cen: 'Centaurus',
  Cep: 'Cepheus', Cet: 'Cetus', Col: 'Columba', Com: 'Coma Berenices',
  CrA: 'Corona Australis', CrB: 'Corona Borealis', Crv: 'Corvus',
  Crt: 'Crater', Cru: 'Crux', Cyg: 'Cygnus', Del: 'Delphinus',
  Dor: 'Dorado', Dra: 'Draco', Equ: 'Equuleus', Eri: 'Eridanus',
  For: 'Fornax', Gem: 'Gemini', Gru: 'Grus', Her: 'Hercules',
  Hor: 'Horologium', Hya: 'Hydra', Hyi: 'Hydrus', Ind: 'Indus',
  Lac: 'Lacerta', Leo: 'Leo', LMi: 'Leo Minor', Lep: 'Lepus',
  Lib: 'Libra', Lup: 'Lupus', Lyn: 'Lynx', Lyr: 'Lyra',
  Men: 'Mensa', Mic: 'Microscopium', Mon: 'Monoceros', Mus: 'Musca',
  Nor: 'Norma', Oct: 'Octans', Oph: 'Ophiuchus', Ori: 'Orion',
  Pav: 'Pavo', Peg: 'Pegasus', Per: 'Perseus', Phe: 'Phoenix',
  Pic: 'Pictor', Psc: 'Pisces', PsA: 'Piscis Austrinus', Pup: 'Puppis',
  Pyx: 'Pyxis', Ret: 'Reticulum', Sge: 'Sagitta', Sgr: 'Sagittarius',
  Sco: 'Scorpius', Scl: 'Sculptor', Sct: 'Scutum', Ser: 'Serpens',
  Sex: 'Sextans', Tau: 'Taurus', Tel: 'Telescopium', Tri: 'Triangulum',
  TrA: 'Triangulum Australe', Tuc: 'Tucana', UMa: 'Ursa Major',
  UMi: 'Ursa Minor', Vel: 'Vela', Vir: 'Virgo', Vol: 'Volans',
  Vul: 'Vulpecula',
};

interface StarRecord {
  id: number;
  hip: number | null;
  hd: number | null;
  proper_name: string | null;
  ra: number;
  dec: number;
  mag: number;
  con: string | null;
  claimed_by: string;
  claimed_name: string;
  claim_nft: string | null;
  claimed_at: string;
}

function truncateWallet(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

async function getStar(slug: string): Promise<StarRecord | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  const dashIndex = slug.indexOf('-');
  if (dashIndex === -1) return null;
  const prefix = slug.slice(0, dashIndex).toUpperCase();
  const num = parseInt(slug.slice(dashIndex + 1));
  if (isNaN(num) || !isFinite(num)) return null;

  try {
    const sql = neon(databaseUrl);
    let rows: StarRecord[];

    if (prefix === 'HIP') {
      rows = (await sql`
        SELECT id, hip, hd, proper_name, ra, dec, mag, con,
               claimed_by, claimed_name, claim_nft, claimed_at
        FROM star_catalog WHERE hip = ${num} LIMIT 1
      `) as unknown as StarRecord[];
    } else if (prefix === 'HD') {
      rows = (await sql`
        SELECT id, hip, hd, proper_name, ra, dec, mag, con,
               claimed_by, claimed_name, claim_nft, claimed_at
        FROM star_catalog WHERE hd = ${num} LIMIT 1
      `) as unknown as StarRecord[];
    } else if (prefix === 'HYG') {
      rows = (await sql`
        SELECT id, hip, hd, proper_name, ra, dec, mag, con,
               claimed_by, claimed_name, claim_nft, claimed_at
        FROM star_catalog WHERE id = ${num} LIMIT 1
      `) as unknown as StarRecord[];
    } else {
      return null;
    }

    const row = rows?.[0];
    if (!row || !row.claimed_by || !row.claimed_name) return null;
    return row;
  } catch {
    return null;
  }
}

export default async function StarProofPage({
  params,
}: {
  params: Promise<{ catalogId: string }>;
}) {
  const { catalogId: rawParam } = await params;
  const slug = decodeURIComponent(rawParam);
  const star = await getStar(slug);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app';
  const pageUrl = `${appUrl}/star/${rawParam}`;

  const dashIndex = slug.indexOf('-');
  const prefix = dashIndex !== -1 ? slug.slice(0, dashIndex).toUpperCase() : '';
  const num = dashIndex !== -1 ? slug.slice(dashIndex + 1) : '';
  const displayCatalogId = prefix && num ? `${prefix} ${num}` : slug.toUpperCase();

  if (!star) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#070B14',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 16 }}>
          Star not found or not yet named.
        </p>
        <Link href="/" style={{ color: '#38F0FF', fontSize: 13, textDecoration: 'none' }}>
          ← Back to Stellar
        </Link>
      </div>
    );
  }

  const conName = star.con ? (CONSTELLATIONS[star.con] ?? star.con) : null;
  const tweetText = `I named a star "${star.claimed_name}" while observing the night sky — sealed on Solana ✦ ${pageUrl}`;
  const farcasterText = `I named a star "${star.claimed_name}" on Stellar ✦`;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070B14',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 48px' }}>

        <Link
          href="/"
          style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          ← Stellar
        </Link>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <div style={{ fontSize: 52, lineHeight: 1, color: '#FFD166', marginBottom: 20 }}>★</div>
          <h1
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(24px, 6vw, 32px)',
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 10px',
              lineHeight: 1.2,
            }}
          >
            {star.claimed_name}
          </h1>
          <p
            style={{
              fontFamily: 'monospace',
              fontSize: 12,
              color: 'rgba(148,163,184,0.7)',
              margin: '0 0 6px',
              letterSpacing: '0.05em',
            }}
          >
            {displayCatalogId}
          </p>
          {conName && (
            <p style={{ fontSize: 11, color: 'rgba(100,116,139,0.8)', margin: 0 }}>
              in {conName}
            </p>
          )}
        </div>

        {/* Details card */}
        <div
          style={{
            marginTop: 32,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          {([
            ['Named by', truncateWallet(star.claimed_by)],
            ['Claimed', formatDate(star.claimed_at)],
            ['Magnitude', `${Number(star.mag).toFixed(1)} (apparent)`],
            ['Coordinates', `RA ${Number(star.ra).toFixed(4)}h  Dec ${Number(star.dec).toFixed(4)}°`],
            ...(star.proper_name ? [['Catalog name', star.proper_name]] : []),
          ] as [string, string][]).map(([label, value], i, arr) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '13px 18px',
                borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', flexShrink: 0 }}>
                {label}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.85)',
                  textAlign: 'right',
                  fontFamily: label === 'Coordinates' || label === 'Named by' ? 'monospace' : 'inherit',
                  wordBreak: 'break-all',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* NFT link */}
        {star.claim_nft && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a
              href={`https://explorer.solana.com/address/${star.claim_nft}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38F0FF',
                fontSize: 12,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View observation NFT on Solana Explorer →
            </a>
          </div>
        )}

        {/* Share buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28 }}>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              padding: '7px 14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontWeight: 700 }}>𝕏</span> Share
          </a>
          <a
            href={`https://warpcast.com/~/compose?text=${encodeURIComponent(farcasterText)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: '#A855F7',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 8,
              padding: '7px 14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ⬡ Warpcast
          </a>
        </div>

        {/* Honesty note */}
        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            maxWidth: 320,
            margin: '28px auto 0',
            lineHeight: 1.6,
            textAlign: 'center',
          }}
        >
          This is a personal commemorative record on Solana. It is not an IAU official star
          designation.
        </p>
      </div>
    </div>
  );
}
