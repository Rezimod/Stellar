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

## Card renderer (phase 7 experiment)

`npx tsx tools/explore/render-card.ts <saturn|mars|europa> [--camera az,el,dist] [--sun az,el] [--light intensity,ambient,exposure] [--spin deg] [--out path]`

Bundles `render/card-scene.ts` with esbuild, renders it in headless Chromium on
SwiftShader through Explore's own materials and output pass (bloom left out),
and writes a 1400x1960 WebP to `public/cards/<DESIGNATION>.webp`. Seeded and
clock-free: the same arguments give a byte-identical file. About a minute per
card on the CPU rasteriser.
