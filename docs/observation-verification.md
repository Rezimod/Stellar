# Observation Verification — Anti-Fraud Roadmap

**Problem:** Stars are an in-app currency that, post-hackathon, will gate marketplace discounts and Discovery Attestations. The moment Stars have economic value, observations become the attack surface. Vision-only verification (Claude Sonnet over an uploaded JPEG) is fakeable with five seconds of Google Image Search.

**Goal:** make faking an observation more expensive than actually pointing a telescope at the sky. We don't need to make it impossible — we need the cost curve to bend the wrong way for cheaters.

---

## Threat model

A scammer with no telescope wants Stars. Ranked by how cheaply they can attack today:

1. **Image lift** — download a Hubble M31 from Wikipedia, upload through the observe flow.
2. **Astrophotography Reddit** — grab someone's actual amateur capture from r/astrophotography. Hard to distinguish from a real one because it *is* a real one, just not the scammer's.
3. **Phone-of-screen** — take a phone photo of a laptop screen showing a sky image. Defeats simple "is this a screenshot" classifiers because the EXIF is from the phone camera.
4. **EXIF spoof** — strip metadata, re-encode, set GPS/timestamp manually before upload.
5. **Account farming** — multiple accounts each submitting one fake observation per night to stay under per-user rate limits.
6. **Replay** — submit the same legitimate observation across many accounts.
7. **AI generation** — Stable Diffusion / GPT-4o-image producing plausible amateur eyepiece captures. Cheap and getting cheaper.

Every primitive below is justified by which of these it raises the cost of.

---

## Current defenses (already in repo)

In [`src/app/api/observe/verify/route.ts`](../src/app/api/observe/verify/route.ts):

- **Claude Sonnet vision** — flags `isScreenshot`, `isAiGenerated`, `hasNightSkyCharacteristics`. Defeats #1 partially (a Hubble image often gets caught), useless against #2.
- **EXIF extraction** ([`src/lib/exif.ts`](../src/lib/exif.ts)) — reads camera make/model, GPS, timestamp. Trivially spoofable but raises bar.
- **Hash dedup** ([`src/lib/observations-dedup.ts`](../src/lib/observations-dedup.ts)) — perceptual hash blocks bit-identical replays. Defeats #6.
- **Reverse image search** ([`src/lib/reverse-image.ts`](../src/lib/reverse-image.ts)) — flags images already indexed on the open web. Defeats #1 and #2 when the source is indexed.
- **Visibility check** ([`src/lib/astronomy-check.ts`](../src/lib/astronomy-check.ts)) — computes whether the claimed target is actually above the horizon at user's GPS+time via `astronomy-engine`. Defeats the cheapest fakes (Saturn at noon).
- **Device tier** ([`src/lib/device-tier.ts`](../src/lib/device-tier.ts)) + **rate limit** ([`src/lib/rate-limit.ts`](../src/lib/rate-limit.ts)) — friction layer.

This is a respectable Tier-1 defense. It catches lazy attackers. It does not survive a motivated one.

---

## Gaps and the new primitives

### 1. Sky-alignment compass handshake (highest leverage)

The killer move. Before the camera unlocks for capture, the user must physically point their phone where the telescope is aimed, and the phone's sensor reading must agree with the ephemeris-predicted azimuth/altitude of the claimed target.

**Flow:**

1. User taps "Verify Jupiter observation."
2. Server returns `{ nonce, expectedAz: 142.4, expectedAlt: 38.1, tolerance: 3, expiresAt }` — computed from user's GPS + network time + `astronomy-engine`.
3. Client requests `DeviceOrientationEvent` permission (iOS 13+ requires explicit user gesture; Android grants by default).
4. UI shows a target reticle and a live compass needle. User points phone at the scope's aim.
5. When measured `(az, alt)` is within ±tolerance of expected for ≥1.5 continuous seconds, client signs `{ nonce, measuredAz, measuredAlt, sampleCount, ts }` and submits.
6. Server re-computes expected at submission time, checks tolerance, marks `alignmentProof: true` for this nonce.
7. **Camera capture is gated on `alignmentProof: true`.** No proof, no upload.

**Why this works:**
- Defeats #1, #2, #3 — a downloaded image cannot rotate your phone.
- Defeats #4 — the proof is server-issued and time-bound; spoofed EXIF can't carry the nonce.
- Tolerance ±3° allows for indoor magnetometer noise and that real telescopes aren't perfectly co-aimed with the phone. Tighten to ±2° outdoors based on GPS accuracy heuristic.
- Cost to attacker: build a fake compass app, GPS-spoof to a location, time-shift to a moment when their stolen image was taken, and physically rotate phone to match. The combinatorics blow up fast.

**Failure modes to handle:**
- Magnetic interference (steel buildings, electronics) — show "compass quality: poor" and offer a re-calibration loop (figure-8 motion).
- iOS permission denial — fall back to Tier-1 capture path with reduced Stars reward, never silently allow.
- Sensors absent (some Android tablets) — server-side feature flag, treat as Tier-1.

**Files to add:**
- `src/lib/sky-alignment.ts` — compute expected az/alt for a target+location+time, tolerance bands.
- `src/app/api/observe/challenge/route.ts` — issues nonce + expected az/alt.
- `src/app/api/observe/alignment/route.ts` — verifies nonce + measured sensor reading, marks proof.
- `src/components/observe/AlignmentHandshake.tsx` — UI with reticle, compass needle, "hold steady" feedback.

---

### 2. Live-capture binding via server-issued nonce

Today the verify route accepts an arbitrary uploaded image. Replace with a session model:

1. Client calls `POST /api/observe/challenge` → receives `{ sessionId, nonce, expiresAt: now + 120s }`.
2. The whole capture (alignment proof, photo bytes, EXIF, sensor readings) must reference `sessionId`.
3. Server rejects submissions where `sessionId` is unknown, expired, reused, or where the image's perceptual hash already exists for *any* user.
4. Camera-only on the client: `<input type="file" capture="environment">` on mobile, no gallery picker. Native app uses the camera API directly.

**Defeats:** #4 (timestamp can't be backdated past `expiresAt`), #6 (sessionId one-shot), #2 partially (hash dedup across users — a popular Reddit photo gets caught the second time).

**Files to add/change:**
- `src/app/api/observe/challenge/route.ts` — new (also used by alignment).
- `src/app/api/observe/verify/route.ts` — require valid `sessionId` + `alignmentProof` flag.

---

### 3. Plate-solving the wide-field shot

For deep-sky objects (Messier, NGC, named stars), require **two photos** in the same session:

- **Wide-field** — phone camera pointed up, capturing the surrounding sky.
- **Eyepiece** — the actual telescopic shot.

Server plate-solves the wide-field shot (Astrometry.net free API, ~5–15s). The detected center coordinates and field stars must match what the sky looked like at user's claimed lat/lng/time within tolerance.

**Defeats:** #1, #2, #7. A scammer can grab an M31 image but cannot fabricate the surrounding field-star pattern *for Tbilisi at 22:43 on May 9, 2026*. The exact star pattern in any 30°×30° patch of sky is unique to a (location, time) pair.

**MVP plan:** stub `src/app/api/observe/plate-solve/route.ts` to return `{ ok: true, confidence: 0.95 }` for now so the rest of the flow ships. Real Astrometry.net wiring is a separate ticket — async submission + polling + API key in env, ~half-day of work.

**Real implementation later:**
- POST image to `nova.astrometry.net/api/upload` with auth key.
- Poll `nova.astrometry.net/api/jobs/{id}` until `success` or `failure`.
- Compare returned `(ra, dec)` and detected stars against `astronomy-engine` ephemeris for the session's GPS+time.
- Cache solves by perceptual hash (re-solving costs nothing if the image was already verified).

**Files to add:**
- `src/lib/plate-solve.ts` — Astrometry.net client (real or stub via `PLATE_SOLVE_MODE` env).
- `src/app/api/observe/plate-solve/route.ts`.

---

### 4. Eyepiece-aesthetic classifier

Real amateur eyepiece captures look bad by Hubble standards: vignetting from the eyepiece field stop, atmospheric scintillation, chromatic aberration, low SNR, focus error, telescope-tracking trail. A pristine, processed, color-balanced M31 is automatically suspicious.

This is a *signal*, not a hard gate — Claude Sonnet already does part of this work via `hasNightSkyCharacteristics` and `sharpness`. Tighten the prompt to penalize "looks-like-promotional-astrophotography" and weight the result into the confidence score, not the accept/reject boolean.

**Future:** small fine-tuned classifier on a labeled dataset of Astroman customer captures (real eyepiece) vs. Wikipedia/APOD/Reddit-best-of (suspicious). Out of scope for hackathon.

**Files to change:**
- Tweak the system prompt block in [`src/app/api/observe/verify/route.ts`](../src/app/api/observe/verify/route.ts) to explicitly score "amateur eyepiece authenticity" 0–1, return as a new field, factor into final confidence.

---

### 5. Tiered Stars rewards

Don't gate every observation at the same proof strength. Reward proportional to evidence:

| Tier | Required proofs | Stars | Notes |
|------|-----------------|-------|-------|
| **T1 — Quick log** | Camera capture + EXIF + visibility check + Claude vision | 5 | Cheap to game, cheap to give. Mostly for streaks. |
| **T2 — Verified** | T1 + sky-alignment handshake + sessionId binding | 25 | The default for serious users. |
| **T3 — Deep-sky** | T2 + wide-field plate-solve match | 100 | Messier/NGC/named-star observations. Mintable as Discovery Attestation. |
| **T4 — Event** | T3 + observation falls within an active astronomical event window (eclipse, ISS pass, conjunction, meteor shower peak) | 250 | Multiplier already exists in `EVENT_BONUS_MULTIPLIER`. |

Tiers stack: a T3 capture also earns the T1 streak credit. Only T2+ counts toward leaderboard rank to keep T1 farming pointless.

**Files to change:**
- `src/lib/stars-rewards.ts` (new) — single source of truth for tier → Stars amount.
- `src/app/api/award-stars/route.ts` — read tier from observation record, award accordingly.

---

### 6. Anti-farming rules

- **One reward per (user, target, night).** Same user logging Jupiter five times in one night gets one Stars reward. Astronomers don't observe the same object five times anyway. Implementation: dedupe key `${userId}:${target}:${nightWindowKey}` where `nightWindowKey` is the local astronomical-night start (sunset → next sunrise) for the user's coordinates.
- **GPS-cluster rate limit.** More than 10 verifications from a 100m radius in a 6h window across distinct accounts → shadow-quarantine all of them pending review. Catches farms.
- **Account-age gate for Stars value.** Stars earned in the first 30 days of an account are *non-transferable* and *non-redeemable for marketplace discounts ≥10%*. Real astronomers don't notice; scam accounts churn faster than 30 days and self-defeat.
- **Stake on flag.** When community/AI flags an observation, the user can dispute by staking Stars. If review confirms fraud, stake burns. If review clears, stake doubles. Out of scope for hackathon, in scope for v2.

**Files to add:**
- `src/lib/observation-rate.ts` — GPS clustering, per-night dedup. Some pieces likely already in `observations-dedup.ts` — extend rather than duplicate.

---

### 7. Future hardening (post-hackathon)

- **C2PA / device attestation** — Pixel 8+ and iPhone 15+ can sign capture metadata with a hardware key. When this is mainstream (probably 2027), every photo is cryptographically bound to a real sensor at a real time. Free anti-fraud, no UX cost.
- **Telescope serial bind** — once Astroman ships QR-coded scopes, bind a serial to the user's account. T3+ rewards require the observation to come from that scope's owner. Adds a real-world identity anchor that's expensive to forge.
- **Community attestation** — for events (eclipse, ISS pass), accept a witness signature from another verified user observing the same event from a nearby location. Cross-validation across independent observers.
- **Continuous video capture** — 5s clip instead of a still. Stars twinkle, planets don't (atmospheric scintillation is forensically detectable in video, near-impossible to fake convincingly). High bandwidth, save for a "Pro" tier.

---

## MVP scope for hackathon (May 11)

Ship in this order, ship nothing else:

1. **Sky-alignment handshake** — `src/lib/sky-alignment.ts`, challenge route, alignment route, `AlignmentHandshake` component. Camera unlock gated on proof.
2. **Live-capture binding** — sessionId nonce flow. Wire into existing `/api/observe/verify`.
3. **Plate-solve stub** — `src/app/api/observe/plate-solve/route.ts` returns success in dev. Wire as a non-blocking signal in the verify pipeline. Real Astrometry.net is a v2 ticket.
4. **Tiered Stars rewards** — `src/lib/stars-rewards.ts`, update `/api/award-stars` to read tier.
5. **Per-night dedup + GPS-cluster rate limit** — extend `observations-dedup.ts`.

Everything else (eyepiece classifier fine-tune, C2PA, scope-bind, stake-and-slash) is a post-hackathon roadmap item. Not in the MVP.

The compass handshake is the demoable wow moment: judges instantly understand why a downloaded image can't earn Stars when the proof requires the phone's physical orientation to match the sky at this exact instant.

---

## Implementation map

```
New files
├─ src/lib/sky-alignment.ts            ephemeris az/alt + tolerance bands
├─ src/lib/stars-rewards.ts            tier → Stars amount, single source of truth
├─ src/lib/plate-solve.ts              Astrometry.net client (stub for MVP)
├─ src/app/api/observe/challenge/      issues sessionId + expected az/alt
├─ src/app/api/observe/alignment/      verifies sensor reading vs expected
├─ src/app/api/observe/plate-solve/    wide-field plate-solve (stub for MVP)
└─ src/components/observe/
   └─ AlignmentHandshake.tsx           reticle UI + compass needle

Changed files
├─ src/app/api/observe/verify/route.ts require sessionId + alignmentProof
├─ src/app/api/award-stars/route.ts    read tier, award via stars-rewards
├─ src/lib/observations-dedup.ts       add GPS-cluster + per-night dedup
└─ src/app/observe/page.tsx            wire AlignmentHandshake into the flow
```

---

## Open questions

- **iOS Safari magnetometer permission UX.** Apple requires a user-gesture-triggered permission prompt for `DeviceOrientationEvent`. We need a "Hold to align" button that triggers the request inline. Test on a real iPhone before committing the flow.
- **Indoor / urban magnetometer reliability.** Tbilisi center has heavy steel-building interference. Spec a calibration loop. Decide whether to simply refuse alignment proof in low-confidence-compass conditions vs. fall back to T1.
- **Devnet → mainnet switch for Stars value.** While we're on devnet, Stars are worthless and these defenses are theoretical. Roadmap is correct anyway; we want the system in place *before* mainnet, not after the first scam wave.
