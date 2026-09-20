-- Player base building (Explore): pieces on the Moon and Mars.
-- Idempotent: safe to run more than once. Apply with
--   node scripts/apply-base-pieces.mjs
-- Never via drizzle-kit push.

CREATE TABLE IF NOT EXISTS base_pieces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  world text NOT NULL CHECK (world IN ('moon', 'mars')),
  scope text NOT NULL CHECK (scope IN ('private', 'colony')),
  owner_privy_id text NOT NULL,
  module text NOT NULL,
  x double precision NOT NULL,
  z double precision NOT NULL,
  yaw double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS base_pieces_world_scope_idx ON base_pieces (world, scope);
CREATE INDEX IF NOT EXISTS base_pieces_owner_idx ON base_pieces (owner_privy_id);
