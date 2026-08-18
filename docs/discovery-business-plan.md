# Cosmic Discovery Pass — business plan

Working model for the pass drop. Every figure derives from constants already in
the code (`tiers.ts`, `stars-economy.ts`, `constants.ts`), so the model and the
product cannot drift apart.

**This is a business model, not legal or financial advice.** Two items in §5
need a lawyer before you sell anything.

---

## 1. What Rip Cars actually did

Your recollection was right, and the mechanic matters:

| | |
|---|---|
| Hard cap | **$250,000** |
| Commitments | **~$31.9M** (~128× oversubscribed) |
| Excess | **Refunded pro-rata, automatically** |
| Vehicle | MetaDAO ICO, ~$645K FDV, $0.025/token |

So yes — they kept $250K and returned the rest. The $31.9M was never theirs.
It is a *demand signal*, not capital. Publicly it reads as "$32M of demand";
on the balance sheet it is a quarter of a million dollars.

**The distinction that matters for you:** that was a **token sale** — selling
CARS for treasury, with futarchy governance attached. What we have built is a
**product sale** — 10,000 passes, each a thing a customer buys. They are not
the same instrument and they do not carry the same legal weight. You can do
either, or the product sale first and a token raise later off the traction.

The recommendation below is the **product sale**, because it is what exists
today, it needs no launchpad, and it does not sell a security.

---

## 2. Unit economics

The key insight: **STRLLR payouts do not cost you face value.** STRLLR redeems
against the Astroman catalogue, and you are the retailer. A $100 redemption
costs you wholesale, not $100 — and it moves inventory you already hold.

Per pass, at the rates in `stars-economy.ts`:

| | |
|---|---|
| Token face value (EV across odds) | $17.38 |
| **Your real token cost** at 35% gross margin | **$11.30** |
| Physical EV (0.4% × kit, 0.1% × telescope) | $0.70 |
| **Total cost per pass** | **≈ $12.00** |

Assumptions to replace with your real numbers: 35% blended gross margin,
$50 accessory-kit COGS, $500 telescope COGS.

---

## 3. Raising $100K

Net per pass = price − $12. At the current 0.5 SOL:

| SOL price | Pass price | Net/pass | Passes for $100K | Sell-through |
|---|---|---|---|---|
| $120 | $60 | $48 | 2,084 | 20.8% |
| $150 | $75 | $63 | **1,588** | **15.9%** |
| $200 | $100 | $88 | 1,137 | 11.4% |

**You do not need to sell out.** At SOL $150 you need roughly **1,600 passes —
16% of the drop** — against a list of 45K lifetime buyers and 70K social. That
is a ~3.5% conversion on the buyer list alone.

Full sellout at SOL $150: **$750K revenue, $120K cost, $630K net.** The $100K
target is not the ceiling; it is the point where the drop has paid for itself
six times over.

**0.5 SOL is correctly priced for this goal.** Do not cut it to chase volume —
at $25/pass you would need 77% sell-through for the same $100K.

---

## 4. The undersell problem — fix this before launch

This is the one that will bite you.

The cards advertise fixed counts: *"10 of 10,000"*, *"40 of 10,000"*. If you
sell 1,600 passes and the draw is probabilistic, you will produce roughly
**1.6 Epics and 0.4 Legendaries** — quite possibly **zero telescope winners.**

A drop that promised ten telescopes and shipped none is a refund event and a
reputational one, regardless of the maths being fair.

Three ways out, pick one **before** the sale:

1. **Guaranteed pool, floating odds** *(recommended)* — 10 Legendaries and 40
   Epics exist no matter how many sell. Odds improve for early buyers, which is
   itself the marketing. Worst case at 1,600 sold: you pay the full ~$120K
   prize pool against ~$120K revenue and break even, but you keep every promise.
2. **Sell-through gate** — the drop only settles above a floor (say 2,500).
   Below it, refund everyone. Honest, and kills the risk entirely.
3. **Restate the counts as odds** — drop "10 of 10,000" for "0.1% chance". Least
   friction, weakest offer, and the cards lose their best line.

Option 1 also fixes the EV complaint: at 1,600 sold, real EV per pass jumps to
roughly $75 because the same pool spreads across a sixth of the buyers.

---

## 5. Two things that need a lawyer

**Loot-box exposure.** Paid randomised rewards with real-money value are
regulated as gambling in Belgium and the Netherlands, carry mandatory odds
disclosure in China, and are under active EU consumer-protection scrutiny.
Publishing odds — which we do — is the right instinct and is *not* sufficient
in every market. Get an opinion on which countries you will sell into, and
geo-block the ones that say no.

**Token characterisation.** STRLLR carrying a redemption value against real
goods is defensible as a store credit. If it becomes tradeable with a market
price, the analysis changes and it can look like a security. If you later do a
MetaDAO-style raise, that is squarely securities territory — Rip Cars did it
through a launchpad with that structure in place.

---

## 6. Sequence

1. **Now** — settle the guarantee model (§4). It changes the card copy.
2. **Before sale** — legal opinion on §5, geo-blocking where needed.
3. **Sale** — 10,000 at 0.5 SOL, break-even at ~250 passes, target 1,600.
4. **Reveal, 21 Oct 2026** — commit-and-reveal salt published (see the security
   note in `rarityEngine.ts`; the current salt is a placeholder and **must** be
   replaced before the sale opens).
5. **Post-reveal** — ship physicals within 30 days; STRLLR redemptions flow
   into Astroman as inventory movement, not cash out.

---

## 7. Where the numbers live

| Figure | Source |
|---|---|
| Odds, counts, STRLLR per tier | `src/lib/discovery/tiers.ts` |
| Star↔GEL rate, GEL↔USD | `src/lib/stars-economy.ts` |
| Pass price, supply, reveal date | `src/lib/discovery/constants.ts` |
| Per-tier USD, average EV | `src/lib/discovery/passValue.ts` |

Change a constant and every figure above moves with it.
