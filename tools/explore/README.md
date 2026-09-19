# Explore Mode (archived out of the app build)

The Stellar solar-system explorer, moved here in Sidera phase 2. It is not part
of the Next.js build (root `tsconfig.json` excludes `tools/**`). Phase 7 tests it
as a render pipeline for card art.

- Typecheck: `npx tsc --noEmit -p tools/explore/tsconfig.json`
- Tests: `npx vitest run --config tools/explore/vitest.config.ts`

`@/lib/solar-system/*`, `@/components/solar-system/*` and `@/lib/multiplayer/*`
resolve here; `ephemeris` and `planet-palettes` stay in `src/` because the sky
finder uses them. Everything else under `@/` resolves to `src/`.
`public/explore/` holds the Tbilisi world data; it is served from here by the
renderer, not by the app.
