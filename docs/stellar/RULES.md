# Stellar rebrand — standing rules

This branch rebrands Stellar into a card product. `main` must stay deployable to
stellarr.club at all times. Repository: Rezimod/Stellar only. The Darkview
platform (Bekatsertsvadzee/Online-Observatory) is consumed over its HTTP
contract; nothing is pushed there and no Darkview source is copied here.

Source plan: `~/Desktop/Stellar/plans/stellar-rebrand-migration-plan.md`.
Execution plan with corrections: `docs/stellar/EXECUTION.md`.

## Never
- Commit to `main`, or rebase/force-push it. Check `git branch --show-current`
  before any commit; if it is not `stellar-cards` or `stellar-cards/*`, STOP and report.
- Delete `docs/grant-evidence/` — grant evidence, not code.
- Touch `anchor/` — the on-chain program is out of scope.
- Translate into `src/messages/ka.json` — v1 is English-only; archive it instead.
- Run migrations or `db:push` against the production database. Only the
  `stellar-cards` Neon branch.
- Delete on-chain-referenced routes: `src/app/m/o`, `api/observe/photo/[hash]`,
  `api/nft-image`, `api/passport`, `api/metadata/*`. Minted cNFTs point at them.
- Rename group (d) identifiers (see `docs/stellar-inventory.md`): collection
  name `Stellar Observations`, symbol `STLR`, Anchor `stellar_observations`,
  env `STELLAR_PAUSED`, cookie `stellar_locale`, every `stellar_*` /
  `stellar.*` / `stellar:` storage key, the rarity value `Stellar` accepted by
  `/api/nft-image`, package name.

## Always
- One phase per commit: `feat(stellar): phase N — <summary>`.
- Deletions in commits of their own, separate from additions.
- `npx tsc --noEmit`, `npm test` and `npm run build` pass before every commit.
- When a decision is ambiguous, write the question into
  `docs/stellar-open-questions.md` and take the most reversible option.

## Product, in one paragraph
Stellar is a collectible card universe built on real astronomy. Cards represent
real objects. One card arrives in each capsule; the reveal is a supernova
("Ignite": a star struggles, collapses and goes; the card comes out of the nebula it leaves, face down, and turns). Every clear night the observatory photographs ONE object, the
collection decides which, and every holder of that card receives the image.
One capture serves all editions of a card — there is no per-customer queue.

## Tone, applied to every string you write
Quiet, institutional, an observatory logbook. Never exclamation marks, never
rocket emoji, never "wen"/"LFG"/"GM"/"floor". Never claim the observatory is
operational — Live Telescope V1 is `commissioning`.
Vocabulary: capsule (not pack/box), card (not NFT/token), set (not drop),
observation (not shoot/session), Live Telescope V1 — the telescope in Tbilisi (not "Node 01", not "Live Telescope V1", not "our telescope"), Founding set for First Light's set label (not "Set 001"; the code SET001 and the /set/001 URL stay), Collection
(not portfolio/bag), holder (not user/degen), edition number (not mint number).
Banned outright in new user-facing copy: NFT, mint, drop, payload, manifest,
registry, airdrop.
