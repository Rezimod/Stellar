# Stellar v2 — what SkyMapper taught us, and what we build next

Written 4 Sep 2026, after a full teardown of [skymapper.io](https://skymapper.io).
This supersedes nothing in `docs/observatory-network.md` — it sits on top of it,
reorders the backlog, and settles the design questions the observatory work has
been deferring.

---

## 1. What SkyMapper actually is

Not a guess. Their homepage, `/how-skymapper-works`, `/skyviewer`, `/skybridge`,
`/products/skybridge-telescope-requirements`, and their compiled stylesheet.

**The product line.** Three named things, which is the smartest thing on the site:

| Name | What it is |
| --- | --- |
| **SkyBridge** | A hardware box. Turns a telescope into a network node. Onboard AI, GPS, Wi-Fi, 24/7 capture. |
| **SkyViewer** | The web app. Control a telescope, watch live feeds, reserve time, schedule observations, track satellites, capture images. |
| **SkySphere** | An all-sky camera. Satellites, drones, meteors, UAPs. Marked coming soon. |
| **Mission Services** | The B2B line. Tasking for space operators. |

**The chain of custody**, which is the strongest page they have — six numbered
steps: capture from the telescope → upload the full file to decentralised
storage (Akave) → hash the bytes with provenance metadata → write the UUID and
signed provenance on-chain in one transaction on a permissioned Avalanche
subnet → anyone can refetch, rehash and compare → the software orchestrates it
at scale.

**The economy.** **SkyCredits**, their native currency. Paid out for telescope
uptime, scientific contribution, community engagement, and consistency bonuses.
No price, no rate, no exchange, nothing dated.

**The community layer.** Operators are **SkyKeepers**. There is a **Library**
and **Origin Stories** — operator profiles, effectively. Naming the supply side
and giving it a page is a recruitment tactic, and it works.

**The credibility wall.** 20+ partners on the homepage: SETI Institute,
Unistellar, NVIDIA Inception, Akave, Moore Foundation, Richard Lounsbery
Foundation.

**Voice.** `Intelligent observations from sky to space` · `Join the world's
first decentralized telescope network` · `your telescope, powering global
discovery` · `skybridge is more than a device, it's a gateway into a global
scientific movement` · `map all the sky, all the time` · `catch more than
falling stars`. All-lowercase headlines, infrastructural register, science
first.

**The build.** Webflow. Lenis for smooth scroll, Swiper for the galleries,
jQuery. A marketing site, not an application — the application is behind
`app.skymapper.io/login`.

### Their design tokens, pulled from the stylesheet

```
--color--dark-indigo:     #040318   canvas, near-black with a violet cast
--color--very-dark-blue:  #07052e   secondary ground
--color--bright-red:      #e8562e   primary accent
--color--neon:            #bae03d   secondary accent
--color--purple:          #633dbc
--color--soft-blue:       #7992e3
--color--light-grayish:   #d7e0f2   body text on dark

--font-styles--body:      Geist
--font-styles--heading:   Doner       (condensed display grotesque)

--radius--small/medium/large: 0px     every corner, everywhere
--stroke--border-width:   1px
--heading-1:              4.5rem desktop / 3rem tablet / 2rem mobile
```

Two facts worth sitting with. **Their body font is Geist. So is ours.** We are
already typographically in the same room as a SETI-partnered, NVIDIA-backed
company, at zero cost. And **every corner on their site is square.** Nothing is
rounded. It reads like an instrument panel rather than a SaaS dashboard, and
that is the single cheapest visual upgrade available to us.

---

## 2. The honest competitive read

**They are ahead of us on:** funding, institutional partners, hardware in
production, an all-sky product we do not have, and a B2B revenue line
(Mission Services) that pays for the network before consumers show up.

**They are wrong, or exposed, on five things:**

1. **Supply is gated to Unistellar.** A $2,500–$4,000 telescope, one brand,
   plus their box on top. ASCOM support is "coming soon". Their addressable
   supply is a rounding error of the world's GoTo mounts.
2. **There is no way to try it.** Every path on that site ends at a login or a
   Shopify checkout. A curious person cannot touch the product. Not once.
3. **No demand side at all.** The site sells to researchers, educators and
   space operators. There is no beginner, no "is tonight any good", no reason
   for a person who does not already own a telescope to be there. A telescope
   network with no consumers is a scientific instrument, not a marketplace.
4. **The money is imaginary.** SkyCredits has no price and no cash-out. An
   operator cannot answer "what will I earn in a month".
5. **They are a marketing site.** The product is a login wall. Their public
   surface can only make promises.

**Where we are genuinely ahead — and it is not the blockchain:**

- **Demand exists and has a phone number.** 45,000+ telescope buyers since
  2018, 70,000+ social, a physical store in Tbilisi. SkyMapper has partners.
  Rezi has customers, with brand and model on file.
- **The funnel starts free.** Forecast → planets → ASTRA → observe →
  marketplace. Theirs starts at a $3,000 purchase.
- **The simulator is public and needs no account.** You can drive a telescope
  in a browser right now, with a correct optical train, a real safety envelope
  and a mission machine that runs on the clock. This is the best marketing
  asset either company has and they do not have it.
- **Hardware-agnostic supply, sold through a shop we own.** ASCOM/Alpaca/INDI
  plus a Node Kit SKU with retail margin, marketed to a list that already
  bought telescopes from us.
- **The money is real and dated.** 40 ₾ a session, a 60/40 ladder to 80/20 on
  delivered hours, in lari, settled by cron. An operator can do the arithmetic.
- **Our provenance rail is stricter than theirs.** Theirs proves a file was not
  altered after upload. Ours refuses to admit a frame to the Collection unless
  the adapter that produced it says `instrument` — a simulated frame cannot
  mint, cannot award Stars, cannot be logged as verified, by construction.
  Theirs is tamper-evidence. Ours is admission control. Those are different
  guarantees and ours is the one that matters when the incentive to fake is
  financial.

### Positioning

> **SkyMapper is building a network for science.**
> **Stellar is building a network for people who want to see it.**

Their line is *map all the sky, all the time.*
Ours is **someone's sky is always clear.**

That is the only sentence no single observatory on earth can say, it is the
routing engine stated as a promise, and it is warm where theirs is
infrastructural. It should lead the homepage.

Their existence is useful to us. A SETI-partnered US company claiming "the
world's first decentralized telescope network" is third-party validation of the
category for every grant, investor and partner conversation from here. We do
not need to out-infrastructure them. We need to be the one you can use tonight,
with the telescope you already own.

---

## 3. What we take, and what we refuse

### Take

| From them | For us | Why |
| --- | --- | --- |
| Three named products | Name our three: the **Node Kit**, the **Control Room**, the **Network** | Marketing needs nouns. Right now we have routes. |
| The six-step chain-of-custody page | `/observatory/how-it-works` | Their best page. Our rail is stronger and has no page at all. |
| SkyKeepers / Origin Stories | Public operator profiles on `/u/[handle]` | Supply recruitment is social, not transactional. |
| Coordinated campaigns | Reclaim the word **missions** for real observation campaigns | Gives idle nodes work with no customer, and is the science story for grants. |
| The partner wall | Solana Foundation, Tether 1st place, Superteam, Astroman, Bresser / Levenhuk / Celestron | We have a credible wall and we barely use it. |
| Square corners, 1px strokes, huge type | Design pass, §4 | Instrument, not dashboard. |
| A photographic homepage | Real captures, ours and users' | Already principle 4 in `.impeccable.md`; we have not honoured it. |
| The supply pitch on the homepage | "Put your telescope to work" section above the fold-and-a-half | Ours is buried at `/observatory/operator`. |

### Refuse

- **Decentralised storage theatre.** Akave, subnets, "immutable". Our rail is
  stronger, cheaper and already shipped. Do not add infrastructure to match a
  competitor's vocabulary.
- **A token as the payout.** SkyCredits is the mistake. We pay lari. Keep it.
- **Hardware gating.** Being open to ASCOM/Alpaca/INDI *is* the wedge.
- **Their B2B-only voice.** Our primary user is an Astroman buyer asking
  whether tonight is worth it. `.impeccable.md` is right and does not move.
- **All-lowercase headlines.** A fashion. Our voice is patient, precise,
  earned — sentence case is consistent with it, lowercase is a costume.
- **The Doner display face.** `.impeccable.md` fixes the stack: Geist for
  headings and body, Orbitron for deliberate display accents, JetBrains Mono
  for data. We get the same effect with scale and tracking, at no cost.
- **A login wall.** The simulator stays open. It is our whole advantage.

---

## 4. Design decisions

Concrete, token-level, and inside the rules in `.impeccable.md`. Nothing here
adds a font, a package or a hex literal outside `globals.css`.

**4.1 Darken the canvas.** `--canvas` is `#0A1735` — a blue that competes with
photographs. Move it toward `#070E22`: still a night-sky colour, still not pure
black, but it lets a real capture be the brightest thing on the screen. One
token, both themes checked.

**4.2 Square the frames, keep the controls round.** Introduce `--radius-frame:
0`. Anything that holds an image or data — capture frames, node cards,
telemetry, the events board, the live view — goes square. Buttons and inputs
keep their radius, because a square button reads as not-clickable on touch.
Instrument panels have square corners; that is the real-world reference and it
is why SkyMapper's site feels like equipment.

**4.3 Raise the hero.** Their h1 is 4.5rem desktop. Ours is timid. Geist Medium
at 3.5–4.5rem with tracking tightened to about `-0.02em`, sentence case, over a
photograph. No new font.

**4.4 Photograph where we can.** Every observatory surface currently renders
synthetic frames. We have real ones — user observations, and captures the
simulator produces at correct plate scale. Build a capture strip and use it as
ground on the homepage and `/observatory`.

**4.5 One accent, not four.** They run red, lime, purple and blue. We run
terracotta and seafoam and that is already one more than we need on any single
page. Terracotta is the verdict colour; seafoam is live state. Nothing else.

**4.6 The credibility strip.** A single 1px-bordered row: Solana Foundation
Georgia · Tether Frontier 1st place · Superteam Georgia · Astroman · Bresser ·
Levenhuk · Celestron. Text, not logos, until we have permission for logos.

---

## 5. Three decisions that change the shape *(4 Sep 2026)*

Rezi's read after the teardown, and it moves more than the roadmap.

### 5.1 The key is software. There is no box.

**We do not sell hardware.** SkyBridge exists because SkyMapper gated themselves
to Unistellar, a closed ecosystem with no ASCOM. If you support ASCOM, Alpaca
and INDI, **the bridge is already in the owner's hands** — a Windows laptop
running NINA, an ASIAIR, a Raspberry Pi running KStars. Every one of those is a
node that needs no new metal. What we deliver is the agent: the key that turns
a rig the owner already paid for into a node on the network.

This **contradicts `docs/observatory-network.md` §3**, which calls the kitted
Tier 2 "the business" and prices a ~2,000 ₾ Node Kit into the tier ladder. The
disagreement is deliberate:

- A hardware SKU means a bill of materials, importing mini-PCs and ASI cameras
  into Georgia, customs, stock, warranty and RMA on equipment we did not
  manufacture. Rezi is one person.
- A download ships to every country instantly at zero marginal cost. A box
  ships to one address, once, and then needs support forever.
- Astroman **already sells** every component a kit would contain. The margin
  does not disappear — it moves. The compatibility checker becomes a
  merchandising surface: *your NexStar 6SE qualifies; you need a camera and a
  cable, here are both, in stock.* Retail margin with no inventory risk, on a
  catalogue that already exists.
- The kit was also load-bearing in the ladder's arithmetic ("the second rung is
  where a 2,000 ₾ kit pays for itself"). With no kit, **the second rung is
  where the agent has paid for the owner's time instead**, and the thresholds
  should be revisited against real utilisation, as §12.2 already says they must.

**Hard constraint, and it is not a style preference.** Per §4.1 of the network
doc, our own Tbilisi instrument is **Darkview** — a separate, grant-funded
project with its own repository and an audited provenance statement asserting
it shares no code with Stellar. **The agent cannot be written in this
repository.** Stellar defines `ObservatoryAdapter`; the agent lives in its own
repo and is integrated over a documented API like any other node. Breaking that
costs grant money in a way no refactor undoes. Treat it as a compile error.

So the agent is two builds, not one, and only the second is a product:

| | Scope |
| --- | --- |
| **v0 — first party** | One machine, one mount, one camera: Rezi's NexStar 6SE and ASI585MC in Tbilisi. No installer, no third-party hardware, no support burden. This is the reference implementation and the demo that always works. |
| **v1 — the key** | Packaged, signed, installable. Windows/ASCOM and Linux/INDI. Pairing flow, certification run, auto-update. This is the product we hand to owners. |

Rules the agent does not bend, all already written: it **dials out** (no inbound
connection to a customer's home network), it **re-validates every command
locally** against the altitude envelope, horizon mask and Sun avoidance — a
cloud-approved command that fails local safety is refused — and it **signs
frames at the node**, which is what gives them `instrument` provenance.

### 5.2 Capture requests — the reframe

Taken from SkyViewer's "verified data product requests", and it is the most
valuable idea on their site.

**Today the network sells one thing: a live session.** That needs a customer
awake, a clear sky, and a free node — all at the same moment. A three-way
coincidence, in a country with maybe a hundred clear nights.

**A capture request needs none of that.** *Photograph the Orion Nebula for me,
any night in the next fortnight.* Now the only requirement is that the object
be observable from **some** node on **some** night in a window the customer
already agreed to. Fill rate goes up by an order of magnitude, and the answer
to *what does a node do at 3 a.m. when nobody booked it* stops being **nothing**.

That gives one scheduler three kinds of demand, in strict priority:

| | What it is | Who is awake | Price |
| --- | --- | --- | --- |
| **Live session** | You drive it, 20 minutes | The customer | Highest — you are buying an operator's attention at a fixed hour |
| **Capture request** | You ask, we deliver | Nobody | Lower — you are buying photons on a flexible window |
| **Campaign** | Science asks, many nodes answer | Nobody | Grant-funded or free |

Booked live sessions are immovable. Requests fill the gaps between them.
Campaigns take whatever is left. An operator can understand that policy in one
sentence, which is the test.

**Lifecycle** extends the existing one rather than replacing it:

```
REQUESTED -> QUEUED -> SCHEDULED -> [the existing session lifecycle]
          -> PROCESSING -> DELIVERED
```

Money still moves on exactly two transitions. `DELIVERED` releases; a request
that expires unfilled inside its window **refunds in full, automatically** —
same rule as a clouded-out session, no support ticket. Delivered hours count
toward the ladder identically, which is what finally makes the ladder climbable
on nights nobody books live.

**Price by target class, not by minute** — a customer buying a photograph does
not care how long the mount was busy, and a per-minute price punishes the
faint objects that are worth the most:

| Class | Example | First-pass price |
| --- | --- | --- |
| Bright | Moon, Jupiter, Saturn | 30 ₾ |
| Deep sky, short | Orion Nebula, Pleiades, Andromeda | 50 ₾ |
| Deep sky, long | Anything needing an hour of subs | 80 ₾ |

Guesses, marked as guesses, to move on real utilisation exactly like the tier
thresholds.

### 5.3 First Light — the sky portrait

A child has a birthday. A grandparent chooses an object. We photograph it, and
it comes back as a poster: *this is how Saturn looked the night you turned
seven.* Framed, or printed, or a file.

**This is the best commercial idea in the project**, and there is one trap in it
that has to be designed out before a line of code.

**The trap: a promise pinned to an exact date is a promise the weather can
break.** If the date is past, the photograph cannot be taken. If it is future,
the sky may be solid cloud that night, and the gift is already paid for.

**The resolution: put two true things on one poster, each with its own date.**

1. **A computed sky** for the exact moment and place — the Moon's phase, the
   planets' positions, what was above the horizon. `astronomy-engine` already
   does every one of these; this is the part that is *exactly* the birthday and
   is never wrong.
2. **A real photograph** of the chosen object, with **its own true date, its
   instrument, and its operator named.** Taken on the first clear night we
   could get it.

Nothing is faked, and the second date is not an apology — it is the story.
*Saturn, photographed from Tbilisi on 14 March, the first clear sky after Nino
turned seven.* A real telescope waits for weather. That **is** the brand:
patient, precise, earned.

That split lets it sell at two speeds off one engine:

| | What happens | Weather risk | Delivery |
| --- | --- | --- | --- |
| **From the archive** | The object has already been photographed by the network. You get that frame. | None | Days |
| **Commissioned** | We photograph it for you on the first clear night after your date. The certificate names the night and the instrument. | Handled by the window | Weeks |

Commissioned is a **capture request with a deadline and a print attached.**
Same queue, same scheduler, same ladder. §5.2 is the engine; this is the first
thing riding it.

**The design constraint that becomes the design.** A 150 mm scope will not give
you a wall-filling Saturn. It gives a small, sharp, real one. So the frame is
treated as a **specimen**, not a mural: modest, centred, surrounded by its own
data — date, instrument, aperture, exposure, number of subs, seeing,
coordinates, operator — set in JetBrains Mono, the way an observatory plate or
a herbarium sheet is laid out. This is `.impeccable.md` §2 and §5 exactly:
numbers earn their position, mono for data, photograph where you can. A poster
that pretends to be Hubble fails. A poster that looks like a **record** does not.

**Lead with the Moon.** It is bright, large, spectacular in a 6-inch, available
most clear nights, and its phase on a given date is unique and computable — *the
Moon on the night you were born* is the whole product in one line. Bright deep
sky next. **Saturn is what everyone will ask for and the hardest to deliver**;
price it as premium and say plainly what it will look like.

**The QR on the mount board is where "crypto second" finally pays a normal
person.** Scan the frame on the wall and land on the on-chain record of that
exact capture: which telescope, which operator, which second. The provenance
rail has been an engineering virtue until now. This makes it a feature a
grandparent can use, and SkyMapper structurally cannot copy it because they have
no consumer product to hang it on.

**Why this fits Rezi specifically, more than anything else in this document:**

- Astroman is a **physical shop that already ships product.** Printing and
  framing is a local supplier and a shelf, not a new company.
- It is the **first Stellar product that needs no astronomy knowledge from the
  buyer.** Grandparents can buy it. That is an audience beyond the 45,000
  telescope owners — it is everyone who buys gifts.
- **The price anchor is a gift, not a service.** 40 ₾ for a telescope session is
  a hard sell to someone who has never used a telescope. 180 ₾ for a framed,
  one-of-one photograph with their grandchild's name on it is not.
- It **fills the capture library** the gallery (§6 P1c) and the marketplace need
  to look alive.
- It is the most **shareable** thing we will ever make. A photograph of a framed
  poster carrying a real Saturn beats any landing page we could write.
- It is what **Name a Star wishes it were.** `/star` sells a name in a database.
  This sells a photograph that a specific instrument actually took. Cross-sell
  them, and consider the bundle.

**First-pass prices** — Rezi's margin call, he knows Georgian retail:

| | Price | Margin note |
| --- | --- | --- |
| Digital file | 60 ₾ | Near-total margin, instant delivery, and the upsell path |
| A3 print | 140 ₾ | Local print |
| A3 framed | 220 ₾ | Local frame, in-store pickup or courier |
| Commissioned capture | +80 ₾ | The capture request underneath, at deep-sky rate |

**Risks to hold in view.** Processing is **manual labour per order** at first —
someone stacks and grades the subs — and that caps volume long before demand
does. Gift products are seasonal. Print, frame sizes and courier are real
operations. And the commissioned tier must never oversell what a 6-inch can
resolve.

---

## 6. The build, in order

Everything above reorders this. The revised critical path is short and it names
an uncomfortable fact first.

**Nothing on this list is real until Tbilisi One takes a real photograph.**
Today it runs on `SimNodeAdapter`, declares `provenance: 'simulated'`, and the
rail correctly refuses to let that mint, award, log or be sold. Capture
requests, posters, the gallery and the entire revenue story sit behind first
light on the actual instrument.

### P0 — Ship what is already built *(half a day)*

The operator surface sits uncommitted on `observatory/operator`: the tier
ladder, earnings read off the payout ledger, the interest form, the API, the
float-dust fix in `tierFor`. The `observatory_operator_interest` DDL has not
been run on Neon. Nothing else matters if the supply funnel is not collecting
emails.

### P1 — The marketing surface *(days, no dependencies, runs in parallel)*

**1a. `/observatory/how-it-works`** — our answer to their six-step page, won on
substance: the mount reports where it pointed, the agent signs at the node, the
adapter stamps provenance the client cannot forge, `admitToCollection` refuses
anything that is not `instrument`, the capture logs against the same schema as
a phone observation, the on-chain program records the oracle signature. Saying
plainly what a simulated frame **cannot** do is the pitch.

**1b. Homepage reframe** — Phase E, already unblocked:

```
hero            photograph · "Someone's sky is always clear." · Book / Try the simulator
try it          the simulator, embedded, no account, labelled simulated
what you get    a live instrument, a real frame, a verified capture
how it works    → /observatory/how-it-works
your telescope  the supply pitch and the ladder · no box, just the agent
credibility     the strip
captures        real frames
the companion   forecast, planets, ASTRA — now the supporting act
```

**1c. `/observatory/captures`** and a homepage strip, provenance labelled on
every frame, simulated frames shown and marked, never mixed in silently.

### P2 — First light on Tbilisi One *(the critical path)*

Darkview v0 **in its own repository** (§5.1): one machine, Rezi's rig, ASCOM or
INDI, dialling out, signing frames. In Stellar, only a `DarkviewAdapter`
implementing `ObservatoryAdapter` with `provenance: 'instrument'`, and flipping
`tbilisi-01` from `commissioning` to `active` after an attended first mission.

The day this lands, every surface already built — booking, the session room,
captures, the Collection, settlement — starts carrying real frames with no UI
change. That is what the adapter boundary was for.

### P3 — Capture requests *(§5.2)*

The queue, the scheduler policy, the delivery. Table, API, an operator view of
the queue, and the customer's request → delivered flow. Works against one node.

### P4 — First Light *(§5.3)*

The gift product on the queue. Object picker, date and place, the computed sky,
the poster renderer, the certificate, the QR to the chain record, digital
delivery, then print and frame fulfilment. This is the first thing here that
earns money from someone who owns no telescope.

### P5 — The agent as a product *(§5.1 v1)*

Packaged, signed, installable. Windows/ASCOM and Linux/INDI. Pairing flow,
certification run, auto-update. Ships when P2 has proved the protocol on real
hardware for a season — not before.

### P6 — Routing · P7 — Campaigns · P8 — Operator profiles

Unchanged from the first draft. Routing makes the positioning line real on
`/sky`; campaigns reclaim the word "missions" and are the grant and B2B story;
operator profiles are SkyKeepers on infrastructure we already have.

---

## 7. What none of this changes

- Simulated output never mints, never awards Stars, never logs as verified,
  **and is never sold as a photograph.**
- No Darkview source in this repository. No Stellar source in Darkview.
- No node takes a booking without human review. No unattended first light.
- No browser-to-hardware path, ever.
- No new npm packages.
- Utility first, crypto second — and the poster QR is the first time that
  sentence pays a customer back.
- Discovery Pass does not ship while `REVEAL_SALT` is a placeholder.

---

## 8. Prompts, in order

One conversation each, per the workflow discipline in `CLAUDE.md`.

**P0**
```
Review the uncommitted operator surface on branch observatory/operator, run the
observatory_operator_interest DDL on Neon, then merge to main and push. Show me
the diff before committing.
```

**P1a**
```
Build /observatory/how-it-works — the chain-of-custody page from
docs/stellar-v2-plan.md §6 P1a. Six steps from mount to on-chain record using
the real code path: adapterFor, provenance.ts, admitToCollection, captures.ts,
the Proof-of-Observation program. Say plainly what a simulated frame cannot do.
Sentence case, square frames, one accent. EN and KA keys.
```

**P1b**
```
Phase E: reframe the homepage around booking, following the arc in
docs/stellar-v2-plan.md §6 P1b. "Someone's sky is always clear." as the hero.
The supply pitch says software, not hardware — there is no kit. Forecast,
planets and ASTRA become the supporting act. Apply the design decisions in §4:
darker canvas token, --radius-frame: 0 on content surfaces, larger hero scale.
No new fonts, no new packages.
```

**P1c**
```
Build /observatory/captures and a homepage capture strip from the
observatoryCapture table, provenance labelled on every frame. Simulated frames
are shown and marked, never mixed in silently.
```

**P2** *(two conversations, two repositories)*
```
Design the Darkview node agent v0 for Tbilisi One: ASCOM or INDI, dials out,
re-validates safety locally, signs frames at the node. Write the contract
first — the OpenAPI surface Stellar will integrate over. This does NOT go in
the Stellar repo; see docs/stellar-v2-plan.md §5.1.
```
```
Add a DarkviewAdapter to src/lib/observatory implementing ObservatoryAdapter
with provenance 'instrument', integrated over the Darkview contract. No
Darkview source enters this repository. Keep SimNodeAdapter for the simulator.
```

**P3**
```
Build capture requests per docs/stellar-v2-plan.md §5.2: the queue table, the
scheduler policy (booked sessions immovable, requests fill gaps), the request
and delivery flow, and full automatic refund on an unfilled window. Delivered
hours count toward the operator ladder identically.
```

**P4**
```
Build First Light per docs/stellar-v2-plan.md §5.3: object and date picker, the
computed sky from astronomy-engine for the exact moment and place, the poster
renderer treating the frame as a specimen with its data in JetBrains Mono, the
certificate, and the QR to the on-chain capture record. Digital delivery first,
print and frame after. Commissioned orders create a capture request.
```

**P5**
```
Package the Darkview agent for third-party rigs: Windows/ASCOM and Linux/INDI,
pairing flow, certification run, auto-update. Separate repository.
```

**P6–P8** — routing, campaigns, operator profiles. See §6.

---

## 9. Open decisions for Rezi

1. **Do the tier thresholds still hold with no kit to amortise?** §5.1 removes
   the 2,000 ₾ anchor the second rung was calibrated against.
2. **First Light prices and the print supplier.** 60 / 140 / 220 ₾ is a first
   pass; the margin call is yours.
3. **Capture-request prices by target class.** 30 / 50 / 80 ₾, same caveat.
4. **Does First Light bundle with Name a Star?** They are the same customer and
   one of the two products is real.
5. **Canvas and radius (§4).** A visible change to every page — worth a look at
   one page before it goes global.
6. **Does the Discovery Pass grant telescope time?** Still open, still blocking
   card copy, reveal 21 Oct 2026. Capture requests make the answer more
   valuable: a pass that grants *requests* rather than live slots is far easier
   to honour, because it does not need the holder to be awake.
7. **Observer seats in v1.** Campaigns change the arithmetic — fifty watchers is
   a different product from one controller.
