// GET /api/admin/retention — the numbers behind /admin/retention.
//
// Gate: the caller's Privy session must resolve to a wallet listed in the
// server-only ADMIN_WALLETS env var. Anyone else gets 404 (not 403 — we don't
// confirm the route exists to non-admins). ADMIN_WALLETS is never exposed to
// the client; this route is the only place it's read.
//
// Returns the three sections the dashboard renders: headline week-4 retention
// for the Astroman beta cohort, signups by source by day, and the
// signup → observation_started → observation_minted funnel.

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/schema';
import { verifyPrivy, getSessionWalletAddresses } from '@/lib/api-auth';

export const runtime = 'nodejs';

const notFound = () => new NextResponse(null, { status: 404 });

function adminWallets(): Set<string> {
  return new Set(
    (process.env.ADMIN_WALLETS ?? '')
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean),
  );
}

export async function GET(req: NextRequest) {
  const allow = adminWallets();
  if (allow.size === 0) return notFound(); // not configured → route is dark

  const privyId = await verifyPrivy(req);
  if (!privyId) return notFound();

  const db = getDb();
  if (!db) return notFound();

  // Candidate wallets: every wallet on the Privy session (covers external
  // logins like Phantom, which never get a users-table row) plus the mirrored
  // embedded wallet. Admit if ANY is allowlisted.
  const sessionWallets = await getSessionWalletAddresses(privyId);
  const rows = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(eq(users.privyId, privyId))
    .limit(1);
  const candidates = [...sessionWallets, rows[0]?.walletAddress].filter(
    (w): w is string => typeof w === 'string' && w.length > 0,
  );
  if (!candidates.some((w) => allow.has(w))) return notFound();

  const source = req.nextUrl.searchParams.get('source') ?? 'astroman';
  const campaign = req.nextUrl.searchParams.get('campaign') ?? 'beta_jul2026';

  if (!process.env.DATABASE_URL) return notFound();
  const sql = neon(process.env.DATABASE_URL);

  // Headline: one number — distinct wallets active in week 0 (cohort size) vs
  // week 4 (retained), across the whole campaign.
  const headlineRows = await sql`
    with cohort as (
      select wallet, date_trunc('week', first_seen_at) as cohort_week
      from user_cohorts
      where utm_source = ${source} and utm_campaign = ${campaign}
    ),
    weekly_activity as (
      select c.wallet,
        floor(extract(epoch from (e.created_at - c.cohort_week)) / 604800)::int as week_offset
      from cohort c
      join analytics_event e on e.wallet = c.wallet
      where e.event = 'session_open'
    )
    select
      (select count(*) from cohort) as cohort_size,
      count(distinct wallet) filter (where week_offset = 0) as week_0,
      count(distinct wallet) filter (where week_offset = 4) as week_4,
      round(100.0 * count(distinct wallet) filter (where week_offset = 4)
        / nullif(count(distinct wallet) filter (where week_offset = 0), 0), 1) as week_4_retention_pct
    from weekly_activity`;
  const h = headlineRows[0] ?? {};

  // Signups by source by day — which channels are bringing users in.
  const signupsBySource = await sql`
    select coalesce(utm_source, 'organic') as source,
           to_char(date_trunc('day', first_seen_at), 'YYYY-MM-DD') as day,
           count(*)::int as signups
    from user_cohorts
    group by source, day
    order by day desc, signups desc
    limit 60`;

  // Funnel — distinct wallets reaching each step.
  const funnelRows = await sql`
    select event, count(distinct wallet)::int as wallets
    from analytics_event
    where event in ('signup', 'observation_started', 'observation_minted')
    group by event`;
  const funnelMap = Object.fromEntries(funnelRows.map((r) => [r.event, r.wallets]));
  const funnel = {
    signup: funnelMap.signup ?? 0,
    observation_started: funnelMap.observation_started ?? 0,
    observation_minted: funnelMap.observation_minted ?? 0,
  };

  return NextResponse.json({
    campaign: { source, campaign },
    headline: {
      cohortSize: Number(h.cohort_size ?? 0),
      week0: Number(h.week_0 ?? 0),
      week4: Number(h.week_4 ?? 0),
      week4RetentionPct: h.week_4_retention_pct == null ? null : Number(h.week_4_retention_pct),
    },
    signupsBySource,
    funnel,
  });
}
