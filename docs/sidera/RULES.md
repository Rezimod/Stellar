# Sidera rebrand — standing rules

This branch rebrands Stellar into Sidera. `main` must stay deployable to
stellarr.club at all times. Repository: Rezimod/Stellar only. The Darkview
platform (Bekatsertsvadzee/Online-Observatory) is consumed over its HTTP
contract; nothing is pushed there and no Darkview source is copied here.

Source plan: `~/Desktop/Sidera/plans/sidera-rebrand-migration-plan.md`.
Execution plan with corrections: `docs/sidera/EXECUTION.md`.

## Never
- Commit to `main`, or rebase/force-push it. Check `git branch --show-current`
  before any commit; if it is not `sidera` or `sidera/*`, STOP and report.
- Delete `docs/grant-evidence/` — grant evidence, not code.
- Touch `anchor/` — the on-chain program is out of scope.
- Translate into `src/messages/ka.json` — v1 is English-only; archive it instead.
- Run migrations or `db:push` against the production database. Only the
  `sidera` Neon branch.
- Delete on-chain-referenced routes: `src/app/m/o`, `api/observe/photo/[hash]`,
  `api/nft-image`, `api/passport`, `api/metadata/*`. Minted cNFTs point at them.
- Rename group (d) identifiers (see `docs/sidera-inventory.md`): collection
  name `Stellar Observations`, symbol `STLR`, Anchor `stellar_observations`,
  env `STELLAR_PAUSED`, cookie `stellar_locale`, every `stellar_*` /
  `stellar.*` / `stellar:` storage key, the rarity value `Stellar` accepted by
  `/api/nft-image`, package name.

## Always
- One phase per commit: `feat(sidera): phase N — <summary>`.
- Deletions in commits of their own, separate from additions.
- `npx tsc --noEmit`, `npm test` and `npm run build` pass before every commit.
- When a decision is ambiguous, write the question into
  `docs/sidera-open-questions.md` and take the most reversible option.

## Product, in one paragraph
Sidera is a collectible card universe built on real astronomy. Cards represent
real objects. Cards arrive in capsules; the reveal is a meteorite entering
atmosphere. Every clear night the observatory photographs ONE object, the
collection decides which, and every holder of that card receives the image.
One capture serves all editions of a card — there is no per-customer queue.

## Tone, applied to every string you write
Quiet, institutional, an observatory logbook. Never exclamation marks, never
rocket emoji, never "wen"/"LFG"/"GM"/"floor". Never claim the observatory is
operational — Node 01 is `commissioning`.
Vocabulary: capsule (not pack/box), card (not NFT/token), set (not drop),
observation (not shoot/session), Node 01 (not "our telescope"), Collection
(not portfolio/bag), holder (not user/degen), edition number (not mint number).
Banned outright in new user-facing copy: NFT, mint, drop, payload, manifest,
registry, airdrop.
