-- Week-N retention for the Astroman beta cohort.
-- This is the artifact that proves Superteam Georgia grant milestone M2
-- (15% week-4 retention). N=0 is the signup week; week_4_retention_pct is the
-- number reported to Mariam.
--
-- Identity is `wallet` (Privy embedded wallets persist; external connect yields
-- the same column). Cohort membership + first_seen_at come from user_cohorts;
-- activity comes from the wallet-attributed `session_open` analytics event
-- (NOT the anonymous, fire-on-mount `open` event, which can land pre-auth with
-- a null wallet). Run with:  psql $DATABASE_URL -f queries/retention.sql

with cohort as (
  select wallet, date_trunc('week', first_seen_at) as cohort_week
  from user_cohorts
  where utm_source = 'astroman'
    and utm_campaign = 'beta_jul2026'
),
weekly_activity as (
  select
    c.wallet,
    c.cohort_week,
    floor(extract(epoch from (e.created_at - c.cohort_week)) / 604800)::int as week_offset
  from cohort c
  join analytics_event e on e.wallet = c.wallet
  where e.event = 'session_open'
)
select
  cohort_week,
  count(distinct wallet) filter (where week_offset = 0) as week_0,
  count(distinct wallet) filter (where week_offset = 1) as week_1,
  count(distinct wallet) filter (where week_offset = 2) as week_2,
  count(distinct wallet) filter (where week_offset = 3) as week_3,
  count(distinct wallet) filter (where week_offset = 4) as week_4,
  round(
    100.0 * count(distinct wallet) filter (where week_offset = 4)
    / nullif(count(distinct wallet) filter (where week_offset = 0), 0),
    1
  ) as week_4_retention_pct
from weekly_activity
group by cohort_week
order by cohort_week;
