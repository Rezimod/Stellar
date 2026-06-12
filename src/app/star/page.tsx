import { neon } from '@neondatabase/serverless';
import Link from 'next/link';

interface RecentStar {
  hip: number | null;
  hd: number | null;
  id: number;
  claimed_name: string;
  claimed_at: string;
  con: string | null;
}

function slugFor(s: RecentStar): string {
  if (s.hip) return `HIP-${s.hip}`;
  if (s.hd) return `HD-${s.hd}`;
  return `HYG-${s.id}`;
}

function catalogLabel(s: RecentStar): string {
  if (s.hip) return `HIP ${s.hip}`;
  if (s.hd) return `HD ${s.hd}`;
  return `HYG ${s.id}`;
}

async function getRecentNamedStars(): Promise<RecentStar[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];
  try {
    const sql = neon(databaseUrl);
    const rows = (await sql`
      SELECT id, hip, hd, claimed_name, claimed_at, con
      FROM star_catalog
      WHERE claimed_by IS NOT NULL AND claimed_name IS NOT NULL
      ORDER BY claimed_at DESC NULLS LAST
      LIMIT 24
    `) as unknown as RecentStar[];
    return rows ?? [];
  } catch {
    return [];
  }
}

export const revalidate = 60;

export default async function StarIndexPage() {
  const recent = await getRecentNamedStars();

  return (
    <div style={{ color: '#fff' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px 64px' }}>
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

        <div style={{ textAlign: 'center', marginTop: 48, marginBottom: 40 }}>
          <div style={{ fontSize: 56, lineHeight: 1, color: 'var(--stars)', marginBottom: 20 }}>★</div>
          <h1
            className="font-display"
            style={{
              fontSize: 'clamp(28px, 6vw, 40px)',
              fontWeight: 500,
              margin: '0 0 12px',
              lineHeight: 1.15,
              letterSpacing: '-0.01em',
            }}
          >
            Name a Star
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(148,163,184,0.85)',
              margin: '0 auto',
              maxWidth: 440,
              lineHeight: 1.5,
            }}
          >
            Complete a sky observation and name the star you watched.
            Each name is sealed on Solana with a proof page anyone can visit.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/sky"
              style={{
                background: 'var(--terracotta)',
                color: '#fff',
                padding: '11px 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Plan tonight's observation →
            </Link>
            <Link
              href="/missions"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.9)',
                padding: '11px 20px',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Browse missions
            </Link>
          </div>
        </div>

        {recent.length > 0 && (
          <div>
            <h2
              className="font-display"
              style={{
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(148,163,184,0.7)',
                marginBottom: 16,
              }}
            >
              Recently named
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 10,
              }}
            >
              {recent.map(s => (
                <Link
                  key={`${s.id}-${s.claimed_at}`}
                  href={`/star/${slugFor(s)}`}
                  style={{
                    display: 'block',
                    padding: '14px 16px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    textDecoration: 'none',
                    color: '#fff',
                    transition: 'background 200ms, border-color 200ms',
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                    {s.claimed_name}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-mono, JetBrains Mono)',
                      fontSize: 11,
                      color: 'rgba(148,163,184,0.6)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {catalogLabel(s)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {recent.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(148,163,184,0.5)', fontSize: 13, marginTop: 32 }}>
            No stars named yet. Be the first.
          </p>
        )}
      </div>
    </div>
  );
}
