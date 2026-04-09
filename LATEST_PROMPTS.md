# STELLAR — Revised Build Prompts for Colosseum Frontier
## Solo Builder Execution Plan — Observe → Mint NFT → Reward → Show Result

**Stack:** Next.js 15 + React 19 + TypeScript + Privy + Solana + Claude API
**Deadline:** May 11, 2026
**Status:** Prompt 1 complete — Bubblegum tree + collection setup script built, packages installed.

---

## CRITICAL STRATEGY NOTES (READ FIRST)

### What Changed in Frontier vs Cypherpunk

Frontier has **NO TRACKS**. No Consumer, DeFi, Infra categories. One Grand Champion ($30K) + 20 standout teams ($10K each). 10,393 registrations across 137 countries. Judges are **investors**, not engineers. They evaluate:

1. **Is this a real startup?** — MVP, user acquisition strategy, monetization plan
2. **Why Solana?** — Not "because hackathon" but a genuine technical reason
3. **Can this founder execute?** — Demo quality, code quality, iteration speed
4. **Is there traction?** — Build in public, user feedback, community engagement

### What Was Cut From the Original Plan (and Why)

| Feature | Why Cut |
|---|---|
| Anchor program (custom Rust) | Bubblegum IS the on-chain program. Adding Anchor for a PDA counter adds 2-3 days Rust risk and zero user value. Judges see real NFTs in Explorer — that's the signal. |
| x402 payment gating | Devnet has no USDC. Payment verification within demo is fragile. High demo-failure risk. |
| Farcaster MiniApp SDK | Meta tags for Frame embedding = 10 minutes. Full SDK integration = 2 days. Meta tags are enough. |
| Bortle DePIN / Dark Sky Map | Massive scope (Supabase table, Claude Vision API, Leaflet map, new step in mission flow). Cool feature but adds 3+ days for a "nice to have." Ship post-hackathon. |
| Telescope Image Provenance | File upload + hash verification + new API route + new UI step. Adds complexity to the core loop without clear judging value. |
| Jito bundle transactions | Optimization for mainnet. Devnet demo doesn't need it. Mention in README only. |
| Custom Star Map Generator | Scope creep. The marketplace already lists the product — generating PDFs is a post-hackathon feature. |
| Seer RPC | Mention in README. Don't actually integrate. |

### What Matters Most for a Solo Builder

1. **Bulletproof demo** — 3 minutes, zero crashes, shows the full loop
2. **Beautiful UX** — Judges evaluate within 30 seconds. If it looks like a hackathon project, it loses.
3. **Clear "Why Solana?"** — Compressed NFTs cost $0.000005. You can mint millions of observations. No other chain can do this at consumer scale.
4. **Real business behind it** — Astroman.ge sells telescopes, has 50K+ social followers, physical retail. This isn't a hackathon project — it's a distribution play.
5. **Working on-chain proof** — Real NFTs, viewable in Explorer, with real metadata

### Submission Checklist (Required by Colosseum)

- [ ] GitHub repo with clean commit history during hackathon period
- [ ] Pitch video (≤3 min) — problem, solution, why Solana, traction, team
- [ ] Technical demo video (2-3 min) — walkthrough of features + architecture
- [ ] Weekly update videos on X (optional but strongly recommended)
- [ ] Project registered on Colosseum arena platform
- [ ] Working demo URL (stellarrclub.vercel.app)

### Pitch Narrative (3 Minutes)

**Problem (30s):** 60 million amateur astronomers worldwide. No app turns their observations into permanent, verifiable records. Observation logs live in paper notebooks or forgotten photo albums.

**Solution (30s):** Stellar lets anyone observe the night sky, verify conditions via weather oracle, and mint a compressed NFT as permanent proof — all without knowing what a wallet is.

**Why Solana? (30s):** Compressed NFTs cost $0.000005 each. We can mint millions of observations. Privy embedded wallets mean zero seed phrases. The user sees "Discovery Sealed" — Solana runs invisibly underneath. No other chain offers this cost + UX combination.

**Traction (30s):** Astroman.ge is Georgia's first astronomy e-commerce store. 50K+ social media followers. Physical retail in Tbilisi. The app funnels telescope buyers into on-chain astronomy. Every Astroman customer is a potential Stellar user — that's the distribution moat.

**Demo (45s):** [Live walkthrough — sign up → tonight's sky → mission → NFT → gallery → ASTRA chat → marketplace]

**Ask (15s):** We're onboarding the first non-crypto community onto Solana. Astronomers don't care about blockchain — they care about their observations. That's exactly the kind of user Solana needs.

---

## HOW TO USE THESE PROMPTS

> One new Claude Code conversation per prompt. Run in order. Each depends on the previous.
> Test after each prompt before moving to the next.
> Before running Prompt 2, make sure `npm run setup:bubblegum` succeeded and MERKLE_TREE_ADDRESS + COLLECTION_MINT_ADDRESS are in .env.local.

### Prompt Order & Timeline

| Day | Prompt | What Ships | Test |
|---|---|---|---|
| 1 | P2: Sky Oracle | Clean weather verification, fake libs removed | Hit /api/sky/verify?lat=41.72&lon=44.83 in browser |
| 1-2 | P3: Server Mint | Real compressed NFT minting | POST to /api/mint with test data, see NFT in Explorer |
| 2 | P4: Wire Mission Flow | Full observe → mint → success loop | Complete a mission end-to-end in the app |
| 3 | P5: Stars Token + NFT Gallery | SPL token balance + NFT collection page | Check profile for real balance, /nfts shows minted NFTs |
| 4 | P6: ASTRA Tool Calling | AI with live sky data | Ask ASTRA "what can I see tonight?" and verify real data |
| 5 | P7: UX Polish + OG + Share | Onboarding, animations, social sharing, mobile fixes | Full demo flow on mobile, share to Farcaster/X |
| 5 | — | Record pitch + demo videos | — |

---

## DAY 1 — Clean Foundation + Core Mint

---

### PROMPT 2 — Remove Farmhawk + Pollinet, Add Sky Oracle

**Status: COMPLETE**

```
I'm building Stellar, a Next.js 15 astronomy app for the Colosseum Frontier hackathon. Two fake third-party libraries (farmhawk.ts and pollinet.ts) need to be removed and replaced with honest, clean alternatives.

Farmhawk was a fake "satellite oracle" that actually just called Open-Meteo directly.
Pollinet was a fake "mesh relay" with an IndexedDB offline queue.

Replacements:
- Sky Oracle: a server-side API route that calls Open-Meteo, computes a deterministic hash, and returns sky conditions. No fake branding.
- Offline handling: removed entirely. If !navigator.onLine, show an error and let the user retry.

Read all of these files before writing anything:
  src/lib/farmhawk.ts
  src/lib/pollinet.ts
  src/lib/types.ts
  src/components/sky/Verification.tsx
  src/components/sky/MissionActive.tsx
  src/app/missions/page.tsx
  src/lib/constants.ts

---

Step 1 — Update src/lib/types.ts:

Replace the FarmHawkResult interface with SkyVerification:
  export interface SkyVerification {
    verified: boolean
    cloudCover: number
    visibility: 'Excellent' | 'Good' | 'Fair' | 'Poor'
    conditions: string
    humidity: number
    temperature: number
    windSpeed: number
    oracleHash: string    // SHA-256 hex, deterministic per location+hour
    verifiedAt: string    // ISO timestamp
  }

Remove PollinetStatus entirely.

Update CompletedMission:
  - Change: farmhawk: FarmHawkResult | null  →  sky: SkyVerification | null
  - Remove: pollinet: { mode: 'direct' | 'mesh' | 'queued'; peers: number }
  - Keep status: 'completed' | 'pending' (keep pending for failed mints)

MissionState already has 'done' — keep all existing states unchanged.

---

Step 2 — Create src/app/api/sky/verify/route.ts:

GET handler reading query params: lat, lon (both required, both numbers)
Validation: if lat or lon is missing or not a finite number, return 400.

Logic:
1. Call Open-Meteo:
   const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=cloud_cover,visibility,relative_humidity_2m,temperature_2m,wind_speed_10m&timezone=auto`
   
2. Parse response — same field mapping as the old farmhawk.ts:
   cloudCover = current.cloud_cover ?? 15
   visMeters = current.visibility ?? 20000
   humidity = current.relative_humidity_2m ?? 50
   temperature = current.temperature_2m ?? 12
   windSpeed = current.wind_speed_10m ?? 5

3. Compute visibility rating (same thresholds as before):
   Excellent: visMeters > 20000 && cloudCover < 20
   Good: visMeters > 10000 && cloudCover < 50
   Fair: visMeters > 5000 && cloudCover < 70
   Poor: otherwise

4. Build conditions string (same logic as before)

5. Compute oracle hash — deterministic per location per hour:
   const hourSlot = Math.floor(Date.now() / 3600000)
   const hashInput = `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)},${cloudCover},${hourSlot}`
   const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput))
   const oracleHash = '0x' + Array.from(new Uint8Array(hashBuffer)).slice(0, 20).map(b => b.toString(16).padStart(2, '0')).join('')

6. Return SkyVerification JSON:
   {
     verified: cloudCover < 60,
     cloudCover, visibility, conditions, humidity, temperature, windSpeed,
     oracleHash,
     verifiedAt: new Date().toISOString()
   }

On Open-Meteo fetch failure, return a fallback with verified: true, cloudCover: 15 (same as old farmhawk fallback).

---

Step 3 — Update src/components/sky/Verification.tsx:

Change interface VerificationProps:
  - Replace: farmhawk: FarmHawkResult  →  sky: SkyVerification
  - Remove: pollinet: PollinetStatus
  - Remove: onQueueOffline: () => void
  - Keep: photo, stars, timestamp, latitude, longitude, onMint

Update the component body:
  - Replace all farmhawk.* references with sky.*
  - Remove the [offlineMode, setOfflineMode] state
  - Remove the Pollinet toggle button entirely (the wifi/wifi-off toggle)
  - Remove the "Oracle receipt ›" details/summary dropdown
  - In place of the Pollinet toggle row, add a single small informational badge:
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
        Sky Oracle · Open-Meteo · {new Date(sky.verifiedAt).toLocaleTimeString()}
      </span>
    </div>
  - Change the CTA button to always call onMint (remove the offlineMode branch)
  - Button text: `Seal on Solana  ✦ +${stars}`
  - Remove imports: WifiOff, Wifi from lucide-react

Update the "Oracle" cell in the metric grid:
  - Label: "Hash" (was "Oracle")
  - Value: same truncated oracleHash display

Remove imports: PollinetStatus from @/lib/types

---

Step 4 — Update src/components/sky/MissionActive.tsx:

Remove imports:
  - verifyWithFarmHawk from @/lib/farmhawk
  - getPollinetStatus, queueOfflineObservation, initPollinetSync from @/lib/pollinet (if imported)
  - Connection, PublicKey from @solana/web3.js (no longer needed here)

Remove state:
  - const [farmhawk, setFarmhawk] = useState<FarmHawkResult | null>(null)  →  rename to sky, type SkyVerification
  - const [pollinet, setPollinet] = useState<PollinetStatus | null>(null)  →  remove entirely

Remove function handleQueueOffline entirely.

Update handleCapture():
  - Remove: const ps = getPollinetStatus(); setPollinet(ps)
  - Replace the offline check block (if !navigator.onLine {...}) with:
    if (!navigator.onLine) {
      setMintError('No internet connection — try again when back online')
      setStep('verified')
      return
    }
  - Replace: setStep('verifying'); const fh = await verifyWithFarmHawk(lat, lon); setFarmhawk(fh)
    With:
    setStep('verifying')
    const res = await fetch(`/api/sky/verify?lat=${lat}&lon=${lon}`)
    const skyData: SkyVerification = await res.json()
    setSky(skyData)
    setStep('verified')

Update handleMint():
  - Change cloudCover: farmhawk?.cloudCover ?? 0  →  sky?.cloudCover ?? 0
  - Change oracleHash: farmhawk?.oracleHash ?? 'sim'  →  sky?.oracleHash ?? 'sim'
  - Keep all other mint logic unchanged

Update the step === 'verified' render:
  - Change: <Verification farmhawk={farmhawk} pollinet={pollinet} onQueueOffline={handleQueueOffline} .../>
  - To: <Verification sky={sky!} onMint={handleMint} ... /> (remove pollinet + onQueueOffline props)

Update addMission() call inside the mint completion:
  - Change: farmhawk: farmhawk!  →  sky: sky!
  - Remove: pollinet: { mode: pollinet!.mode, peers: pollinet!.peers }

Add import: import type { SkyVerification } from '@/lib/types'

---

Step 5 — Update src/app/missions/page.tsx:

Remove:
  - import { initPollinetSync } from '@/lib/pollinet'
  - The entire useEffect that calls initPollinetSync (the one at line ~35)
  - const [syncToast, setSyncToast] = useState(...)
  - The syncToast JSX render block (the fixed toast at bottom of screen)
  - Connection and PublicKey imports from @solana/web3.js (if they're only used by the removed block)
  - The solanaWallet variable if it's only used by the removed block (check — it may be used elsewhere)

Do not remove anything else.

---

Step 6 — Update src/lib/constants.ts:

In SPONSORS: remove the farmhawk and pollinet entries.
In AGENT_META: change oracle: 'farmhawk_v1' to oracle: 'open-meteo-v1'. Remove platform: 'cyreneai'.

---

Step 7 — Delete these files (they are no longer imported anywhere after the above changes):
  src/lib/farmhawk.ts
  src/lib/pollinet.ts

Verify by searching for any remaining imports of farmhawk or pollinet before deleting.

---

TESTING after this prompt:
1. `npm run dev` — app compiles with zero errors
2. Open http://localhost:3000/api/sky/verify?lat=41.72&lon=44.83 — should return JSON with cloudCover, oracleHash, etc.
3. Start a mission — take a photo — should show sky conditions from the new oracle
4. Grep the codebase: `grep -r "farmhawk\|pollinet\|FarmHawk\|Pollinet" src/` — should return zero results
```

---

### PROMPT 3 — Server-Side Compressed NFT Minting

```
I'm building Stellar, a Next.js 15 + Solana astronomy app for the Colosseum Frontier hackathon. I need a server-side compressed NFT minting function and the API route that calls it.

Read these files first before writing anything:
  src/lib/solana.ts (understand existing MintResult type and mintObservation signature)
  src/lib/types.ts (SkyVerification and other types — do NOT redefine anything already there)

Step 1 — Create src/lib/mint-nft.ts (new file, server-only):

Imports:
  import bs58 from 'bs58'
  import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
  import { keypairIdentity, generateSigner, percentAmount, publicKey as toPublicKey } from '@metaplex-foundation/umi'
  import { mintV1, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum'
  import { mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata'

Export interface ObservationMintParams {
  userAddress: string | null   // recipient — mints to fee payer if null
  target: string
  timestampMs: number          // unix ms
  lat: number
  lon: number
  cloudCover: number
  oracleHash: string
  stars: number
}

Export async function mintCompressedNFT(params: ObservationMintParams): Promise<{ txId: string }>

Implementation:
  - Throw clear error if FEE_PAYER_PRIVATE_KEY, MERKLE_TREE_ADDRESS, or COLLECTION_MINT_ADDRESS not set
  - bs58.decode(process.env.FEE_PAYER_PRIVATE_KEY!) → secretKey
  - createUmi(process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com').use(mplBubblegum()).use(mplTokenMetadata())
  - umi.eddsa.createKeypairFromSecretKey(secretKey) → keypair; umi.use(keypairIdentity(keypair))
  - recipient = params.userAddress ? toPublicKey(params.userAddress) : keypair.publicKey
  - NFT name: `Stellar: ${params.target}`
  - NFT URI: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://stellarrclub.vercel.app'}/api/metadata/observation?target=${encodeURIComponent(params.target)}&ts=${params.timestampMs}&lat=${params.lat.toFixed(4)}&lon=${params.lon.toFixed(4)}&cc=${params.cloudCover}&hash=${params.oracleHash}&stars=${params.stars}`
  - Call mintV1(umi, { leafOwner: recipient, merkleTree: toPublicKey(process.env.MERKLE_TREE_ADDRESS!), collectionMint: toPublicKey(process.env.COLLECTION_MINT_ADDRESS!), metadata: { name, uri, sellerFeeBasisPoints: percentAmount(0), collection: { key: toPublicKey(process.env.COLLECTION_MINT_ADDRESS!), verified: false }, creators: [] } }).sendAndConfirm(umi)
  - const txId = bs58.encode(Buffer.from(signature))
  - Return { txId }

Step 2 — Create src/app/api/mint/route.ts:

POST handler accepting JSON body:
  { userAddress: string | null, target: string, timestampMs: number, lat: number, lon: number, cloudCover: number, oracleHash: string, stars: number }

Validation (400 if fails):
  - target: non-empty string
  - timestampMs: positive finite number
  - cloudCover: number 0–100; if > 70 return 400 { error: 'Sky too cloudy', cloudCover }
  - lat: finite number -90 to 90
  - lon: finite number -180 to 180
  - stars: positive integer

Call mintCompressedNFT(body) → return { txId, explorerUrl: `https://explorer.solana.com/tx/${txId}?cluster=devnet` }
On error: log it, return 500 { error: message }

Step 3 — Create src/app/api/metadata/observation/route.ts:

GET handler reading URLSearchParams: target, ts, lat, lon, cc, hash, stars

Return JSON:
{
  name: `Stellar: ${target}`,
  description: `Verified observation of ${target}. Cloud cover ${cc}%, oracle hash ${hash}. Sealed on Solana.`,
  image: "https://stellarrclub.vercel.app/observation-nft.png",
  external_url: "https://stellarrclub.vercel.app",
  attributes: [
    { trait_type: "Target", value: target },
    { trait_type: "Date", value: new Date(Number(ts)).toISOString().split('T')[0] },
    { trait_type: "Location", value: `${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}` },
    { trait_type: "Cloud Cover", value: `${cc}%` },
    { trait_type: "Oracle Hash", value: hash },
    { trait_type: "Stars Earned", value: Number(stars) }
  ]
}

Do not touch any other existing files.

---

TESTING after this prompt:
1. Test the metadata route: GET http://localhost:3000/api/metadata/observation?target=Jupiter&ts=1712700000000&lat=41.72&lon=44.83&cc=12&hash=0xabc&stars=50 — should return valid JSON
2. Test the mint route with curl:
   curl -X POST http://localhost:3000/api/mint -H "Content-Type: application/json" -d '{"userAddress":null,"target":"Jupiter","timestampMs":1712700000000,"lat":41.72,"lon":44.83,"cloudCover":12,"oracleHash":"0xabc123","stars":50}'
   — should return { txId, explorerUrl }
3. Open the explorerUrl in browser — should show a real transaction on devnet
4. If mint fails: check FEE_PAYER_PRIVATE_KEY has devnet SOL (need ~2 SOL), MERKLE_TREE_ADDRESS and COLLECTION_MINT_ADDRESS are set
```

---

### PROMPT 4 — Wire Mission Completion to Real Mint + Success Screen

```
I'm building Stellar for the Colosseum Frontier hackathon. The observation flow in src/components/sky/MissionActive.tsx currently calls mintObservation() from src/lib/solana.ts which returns a simulated result. I need to replace it with a real POST to /api/mint and add a proper success screen with Solana Explorer link.

Read these files fully before editing:
  src/components/sky/MissionActive.tsx (full file — understand all states and handleMint() function)
  src/app/missions/page.tsx (check if it still imports mintObservation — if so, remove it)
  src/lib/types.ts (MissionState — 'done' state exists but isn't rendered)

Changes to src/components/sky/MissionActive.tsx:

1. Remove imports:
   - mintObservation from @/lib/solana
   - Connection, PublicKey from @solana/web3.js
   Add state: const [mintTxId, setMintTxId] = useState('')
   Add import: ExternalLink from 'lucide-react' (if not already imported)

2. Replace handleMint() with this logic:
   a. setStep('minting')
   b. Snapshot prevCompleted + prevRank + prevUnlocked (keep existing reward diffing logic)
   c. setMintError('')
   d. Call fetch with timeout (use AbortController, 60s timeout):
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 60000)
      const res = await fetch('/api/mint', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: solanaWallet?.address ?? null,
          target: mission.name,
          timestampMs: new Date(timestamp).getTime(),
          lat: coords.lat,
          lon: coords.lon,
          cloudCover: sky?.cloudCover ?? 0,
          oracleHash: sky?.oracleHash ?? 'sim',
          stars: mission.stars,
        })
      })
      clearTimeout(timer)
   e. If !res.ok:
      const err = await res.json().catch(() => ({ error: 'Mint failed' }))
      setMintError(err.error ?? 'Mint failed')
      setStep('verified')
      return
   f. const { txId, explorerUrl } = await res.json()
   g. Fire-and-forget (do not await, do not block on error):
      fetch('/api/award-stars', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ recipientAddress: solanaWallet?.address, amount: mission.stars, reason: mission.name }) }).catch(() => {})
   h. setMintTxId(txId)
   i. setMintDone(true)
   j. setTimeout 1200ms: run the existing reward diff logic, but at the end of the no-new-rewards path, call setStep('done') instead of onClose()
   k. In addMission() call: change method to txId.startsWith('sim') ? 'simulated' : 'onchain', change sky: sky!, remove pollinet field

3. Add step === 'done' render — THIS IS THE MOST IMPORTANT SCREEN IN THE APP (judges see this):

   Full-screen centered, dark background, no scroll. Design it to feel like an achievement unlock:

   - Subtle animated entrance (fade in + scale from 0.95 to 1, CSS transition 0.4s ease-out)
   - Container: max-w-sm mx-auto, flex flex-col items-center, pt-20
   - Teal glow circle: w-20 h-20, rounded-full, bg gradient from rgba(52,211,153,0.15) to transparent
     Inside: animated checkmark (svg path with stroke-dasharray animation, or simple ✓ character)
     Border: 2px solid rgba(52,211,153,0.3)
   - "Discovery Sealed" — text-2xl, font-serif, white, mt-6, tracking-wide
   - Mission name row: `${mission.emoji} ${mission.name}` — text-slate-400, text-sm, mt-2
   - Stars earned: `+${mission.stars} ✦` — text-[#FFD166], text-lg, font-bold, mt-3
     Add a subtle shimmer/pulse animation on the star count
   - If mintTxId and !mintTxId.startsWith('sim'):
     <a href={`https://explorer.solana.com/tx/${mintTxId}?cluster=devnet`}
        target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-full text-xs
                   bg-[rgba(56,240,255,0.06)] border border-[rgba(56,240,255,0.15)]
                   text-[#38F0FF] hover:bg-[rgba(56,240,255,0.12)] transition-colors">
       Verified on Solana <ExternalLink size={12} />
     </a>
   - Divider: w-12 h-px bg-white/10 my-6
   - Two buttons, full width, stacked with gap-3:
     "View My Collection" — bg transparent, border border-white/10, text-white, py-3, rounded-xl
       onClick → router.push('/nfts')
     "Continue Observing" — bg gradient-to-r from-[#FFD166] to-[#E8B84A], text-black font-semibold, py-3, rounded-xl
       onClick → onClose()
   - At very bottom, tiny muted text:
     "Compressed NFT · Solana Devnet · ${new Date().toLocaleDateString()}"
     color: rgba(255,255,255,0.15), text-[10px]

   (import useRouter from 'next/navigation' for the NFTs button)

4. In step === 'verified' render: below the Verification component, if mintError is set, show:
   <p className="mt-2 text-center text-xs text-amber-400">{mintError}</p>
   Clear mintError when user re-enters the camera step.

5. Remove the connection variable (const connection = new Connection(...)) if still present.

Changes to src/app/missions/page.tsx:
  If mintObservation is still imported here, remove it.
  Remove Connection and PublicKey imports if no longer used.

---

TESTING after this prompt:
1. Complete a full mission flow: pick mission → take photo → verify sky → seal on Solana → see success screen
2. Click "Verified on Solana" link — should open Explorer with real tx
3. Test error handling: set FEE_PAYER_PRIVATE_KEY to invalid value, complete mission — should show amber error text, not crash
4. Test offline: disconnect wifi before "Seal on Solana" — should show "No internet" error gracefully
5. Check the success screen on mobile viewport (375px wide) — everything should be readable and centered
```

---

## DAY 2-3 — Stars Token + NFT Gallery

---

### PROMPT 5 — Stars SPL Token: Deploy + Award Endpoint + Profile Balance + NFT Gallery

```
I'm building Stellar for the Colosseum Frontier hackathon. I need to:
A) Deploy a Stars SPL token on devnet with an award endpoint
B) Build the NFT gallery page showing the user's observation NFTs
C) Update the profile to show real on-chain Stars balance

Read src/lib/solana.ts, src/app/profile/page.tsx, and src/app/nfts/page.tsx before editing.

---

PART A — Stars SPL Token

Step 1 — Create scripts/create-stars-token.ts:
Read scripts/setup-bubblegum.ts first — use the same .env.local loading pattern and setEnvVar helper.
Import: Keypair, Connection from @solana/web3.js; createMint from @solana/spl-token; bs58 from bs58
Load fee payer from FEE_PAYER_PRIVATE_KEY (base58 decode → Keypair.fromSecretKey)
Connect to devnet
createMint(connection, feePayerKeypair, feePayerKeypair.publicKey, null, 0) — 0 decimals, no freeze authority
Print mint address, write STARS_TOKEN_MINT=<address> to .env.local
Add to package.json scripts: "setup:token": "npx tsx scripts/create-stars-token.ts"
Check package.json first — install @solana/spl-token only if not present.

Step 2 — Create src/app/api/award-stars/route.ts:
POST accepting { recipientAddress: string, amount: number, reason: string }
Validation:
  - recipientAddress: try new PublicKey(recipientAddress), catch → 400
  - amount: must be integer 1–1000
  - reason: non-empty string
If STARS_TOKEN_MINT not set: return 503 { error: "Stars token not configured" }
Logic:
  - Load fee payer keypair from FEE_PAYER_PRIVATE_KEY
  - getOrCreateAssociatedTokenAccount(connection, feePayerKeypair, mintPublicKey, recipientPublicKey)
  - mintTo(connection, feePayerKeypair, mintPublicKey, ata.address, feePayerKeypair, BigInt(amount))
  - Return { success: true, txId: signature, explorerUrl }
  - console.log('[Stars] Awarded', amount, 'to', recipientAddress, 'for', reason)
On error: return 500 { error: message }

Step 3 — Add to src/lib/solana.ts (add at end of file, do not change existing functions):
export async function getStarsBalance(walletAddress: string): Promise<number>
  - If !process.env.STARS_TOKEN_MINT return 0
  - getAssociatedTokenAddress(new PublicKey(process.env.STARS_TOKEN_MINT), new PublicKey(walletAddress))
  - getAccount(connection, ata) → return Number(account.amount)
  - Catch any error → return 0
Import getAssociatedTokenAddress, getAccount from @solana/spl-token.

Step 4 — Update src/app/profile/page.tsx:
Read the full file first.
Find where Stars balance is displayed — it's likely showing a value from useAppState.
Add useState for starsBalance: number (default 0).
Add useEffect: when wallet address is available, call getStarsBalance(walletAddress) and set state.
  Import getStarsBalance from @/lib/solana.
  Wallet address from usePrivy() linkedAccounts — same pattern as rest of app.
Show the real balance. If 0 and token not configured, show 0 silently.

---

PART B — NFT Gallery (/nfts page)

Rewrite src/app/nfts/page.tsx:

Auth gate: if !authenticated, show same sign-in prompt style as missions/page.tsx (Satellite icon, title, login button).

On mount when authenticated — fetch NFTs via Helius DAS API:
  const endpoint = process.env.NEXT_PUBLIC_HELIUS_RPC_URL ?? 'https://api.devnet.solana.com'
  POST to endpoint with body:
  { jsonrpc: '2.0', id: 1, method: 'getAssetsByOwner', params: { ownerAddress: walletAddress, page: 1, limit: 100, displayOptions: { showUnverifiedCollections: true } } }
  
  Filter results: keep items where item.grouping?.some(g => g.group_key === 'collection' && g.group_value === process.env.NEXT_PUBLIC_COLLECTION_MINT_ADDRESS)
  If NEXT_PUBLIC_COLLECTION_MINT_ADDRESS is not set, show all returned assets (demo fallback).

States:
  - loading: centered spinner + "Loading your observations..."
  - error: show "Could not load NFTs — check your connection" with retry button
  - empty: beautiful centered state with Telescope icon, "No observations yet", primary CTA → /missions

NFT grid — DESIGN THIS TO IMPRESS JUDGES:
  grid-cols-1 sm:grid-cols-2, gap-4 (not 3 columns — cards need space to breathe)

  Each card (rounded-2xl, bg-white/[0.03], border border-white/[0.06], p-4, hover:border-white/[0.12] transition):
  - Top: NFT name in white, text-base, font-semibold (e.g. "Stellar: Jupiter")
  - Attribute pills row (flex flex-wrap gap-2 mt-3):
    Each pill: bg-white/[0.04] px-2.5 py-1 rounded-full text-[11px]
    Show: Target (teal text), Date (white/50), Cloud Cover (green if <30, amber if 30-60, red if >60), Stars (gold ✦)
  - Bottom row (flex justify-between items-center mt-4 pt-3 border-t border-white/[0.06]):
    Left: "Compressed NFT" text-[10px] text-white/20
    Right: "View on Explorer" link
      href=`https://explorer.solana.com/address/${item.id}?cluster=devnet`, target="_blank"
      Style: text-[#38F0FF] text-xs inline-flex items-center gap-1 with ExternalLink icon size 10

Page layout:
  - Header: "My Observations" (font-serif, text-xl, white) + count badge (bg-white/[0.06] px-2 py-0.5 rounded-full text-xs text-white/50)
  - If Stars balance available: show "✦ {balance} Stars" next to count badge

No new packages — use fetch directly.
Note for user: add NEXT_PUBLIC_COLLECTION_MINT_ADDRESS (copy from COLLECTION_MINT_ADDRESS) and NEXT_PUBLIC_HELIUS_RPC_URL (from helius.dev free tier) to .env.local for this page to work.

---

TESTING after this prompt:
1. Run `npm run setup:token` — should print mint address and write to .env.local
2. Test award endpoint: curl -X POST http://localhost:3000/api/award-stars -H "Content-Type: application/json" -d '{"recipientAddress":"YOUR_WALLET","amount":50,"reason":"test"}'
3. Complete a full mission — check profile page shows updated Stars balance
4. Open /nfts page — should show any previously minted NFTs
5. If no NFTs: should show clean empty state with link to /missions
```

---

## DAY 4 — AI Upgrade

---

### PROMPT 6 — Claude Tool Calling for ASTRA (Real-Time Sky Data) ✅ DONE

```
I'm building Stellar for the Colosseum Frontier hackathon. The AI chat at src/app/api/chat/route.ts currently calls Claude with a static system prompt. I want to upgrade it so ASTRA can query live sky data using Claude tool_use.09876
Read src/app/api/chat/route.ts and src/app/chat/page.tsx fully before editing.
Read src/lib/sky-data.ts and src/lib/planets.ts to understand the existing astronomy calculation functions.

Upgrade src/app/api/chat/route.ts only:

Define 2 tools:

Tool 1: get_planet_positions
  description: "Get current positions and visibility for all planets and the Moon tonight"
  input_schema: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" } }, required: [] }
  Implementation: call the existing planet calculation logic from src/lib/planets.ts
  Return: JSON array of { name, visible, altitude, riseTime, setTime }

Tool 2: get_sky_forecast
  description: "Get the 7-day sky quality forecast for a location"
  input_schema: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" } }, required: [] }
  Implementation: call the Open-Meteo fetch logic already in src/lib/sky-data.ts
  Return: array of { date, cloudCoverPct, badge: 'go'|'maybe'|'skip' }

Wire tools into the messages API call:
  - Pass tools array to the Claude call
  - Handle tool_use blocks: extract tool name + input, call the implementation, build tool_result content block
  - Make a second Claude call with tool result, then stream final text response
  - Keep the existing SSE streaming format exactly — client expects text chunks
  - If a tool call fails, log the error and continue with text response (don't break chat)

Updated system prompt:
"You are ASTRA, an expert AI astronomer for Stellar. You have real-time access to sky conditions and planet positions. When asked about tonight's sky or visibility, call get_planet_positions. When asked about upcoming clear nights, call get_sky_forecast. Be concise and enthusiastic. Respond in the same language the user writes in — Georgian or English. Never mention you are Claude. Always include a fun fact about the objects you mention."

Default lat/lon for tool calls when location is unknown: 41.72, 44.83 (Tbilisi, Georgia).

Do not change src/app/chat/page.tsx.

---

TESTING after this prompt:
1. Open /chat, ask "What can I see tonight?" — should get response with real planet positions
2. Ask "When's the next clear night this week?" — should get forecast data
3. Ask in Georgian "დღეს ღამით რა ჩანს?" — should respond in Georgian with real data
4. Test error: temporarily break the planet calculation — chat should still respond with text, not crash
```

---

## DAY 5 — UX Polish + Submission Prep

---

### PROMPT 7 — UX Polish: Onboarding, OG Image, Social Sharing, Mobile Fixes

```
I'm building Stellar for the Colosseum Frontier hackathon. The core loop works (observe → mint → gallery). Now I need to polish the UX for demo day. This is a CONSUMER app — the UI must feel native and smooth, not like a hackathon project.

Read these files before editing:
  src/app/layout.tsx
  src/app/page.tsx (home/landing page)
  src/components/sky/MissionActive.tsx (the 'done' step from Prompt 4)
  src/app/nfts/page.tsx

---

Step 1 — OG Image for social sharing

Create src/app/api/og/sky/route.tsx:
Use ImageResponse from 'next/og' (built into Next.js — no install needed).
Size: 1200x630. All styles must be inline (ImageResponse requirement, no Tailwind classes).
Design:
  - Background: linear gradient from #070B14 to #0D1520
  - "STELLAR" centered, fontSize: 72, color: '#FFD166', fontWeight: 'bold', letterSpacing: 4
  - Subtitle: "Observe · Verify · Seal on Solana", fontSize: 20, color: '#94a3b8', marginTop: 12
  - Three small stat boxes in a row (gap: 12, marginTop: 32):
    Each: background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 16px', fontSize: 16, color: 'white'
    Contents: "🔭 Observations" · "✦ Stars" · "🪐 NFTs"
  - Bottom: "stellarrclub.vercel.app", fontSize: 13, color: 'rgba(255,255,255,0.2)', position: 'absolute', bottom: 28
  - Tiny "Powered by Solana" text next to URL, color: rgba(255,255,255,0.12)

Step 2 — Meta tags in src/app/layout.tsx:
Read the file first. Add inside existing metadata export or <head> tag:
  og:image → https://stellarrclub.vercel.app/api/og/sky
  og:title → Stellar — Astronomy on Solana
  og:description → Observe the night sky, earn Stars, and seal your discoveries as compressed NFTs on Solana.
  twitter:card → summary_large_image
  twitter:image → https://stellarrclub.vercel.app/api/og/sky
  fc:frame → vNext
  fc:frame:image → https://stellarrclub.vercel.app/api/og/sky
  fc:frame:button:1 → Start Observing
  fc:frame:post_url → https://stellarrclub.vercel.app

Step 3 — Share buttons in MissionActive.tsx 'done' step:

Below the "View My Collection" and "Continue Observing" buttons, add a share section:

  <div className="w-full mt-4 pt-4 border-t border-white/[0.06]">
    <p className="text-center text-[10px] text-white/20 mb-3">Share your discovery</p>
    <div className="flex gap-2">
      {/* Farcaster share */}
      <button onClick={() => {
        const text = encodeURIComponent(`I just observed ${mission.name} and sealed it on Solana ✦\n\nstellarrclub.vercel.app`)
        window.open(`https://warpcast.com/~/compose?text=${text}`, '_blank')
      }}
      className="flex-1 py-2.5 rounded-xl text-xs font-medium
                 bg-[rgba(132,101,203,0.08)] border border-[rgba(132,101,203,0.2)]
                 text-[#8465CB] hover:bg-[rgba(132,101,203,0.15)] transition-colors">
        Warpcast
      </button>
      {/* X/Twitter share */}
      <button onClick={() => {
        const text = encodeURIComponent(`Just observed ${mission.name} and sealed it as a compressed NFT on @solana ✦\n\nstellarrclub.vercel.app`)
        window.open(`https://x.com/intent/tweet?text=${text}`, '_blank')
      }}
      className="flex-1 py-2.5 rounded-xl text-xs font-medium
                 bg-[rgba(255,255,255,0.04)] border border-white/[0.08]
                 text-white/60 hover:bg-white/[0.08] transition-colors">
        Post on X
      </button>
    </div>
  </div>

Step 4 — Mobile UX fixes (apply across the app):

Read src/app/page.tsx, src/app/missions/page.tsx, src/app/nfts/page.tsx, src/app/chat/page.tsx, src/app/profile/page.tsx.

For each page, check and fix:
  a. No horizontal scroll on 375px viewport (check for elements with fixed widths > viewport)
  b. Touch targets are at least 44px tall for all interactive elements
  c. Bottom nav (if present) doesn't overlap content — add pb-20 to main content containers
  d. Text is readable — no text smaller than 11px on mobile
  e. Cards have enough padding (at least p-3 on mobile)
  f. Images/emojis don't overflow their containers

Step 5 — Loading states improvement:

In MissionActive.tsx, for step === 'verifying' and step === 'minting':
  Replace any bare spinner with a more polished loading state:
  - Centered container
  - Pulsing icon (for verifying: telescope emoji or Eye icon; for minting: a rotating/pulsing ✦)
  - Text below: "Checking sky conditions..." / "Sealing on Solana..."
  - Subtle progress indicator (not a progress bar — just an animated dot sequence or pulse ring)
  - No spinners that look like loading errors

Step 6 — Error state in the 'minting' step:

If the mint takes longer than 30 seconds, show a reassurance message:
  "Still sealing — Solana devnet can be slow. Don't close the app."
  (Use a setTimeout in the minting step to show this after 30s)

---

TESTING after this prompt:
1. Open https://stellarrclub.vercel.app/api/og/sky — should render the OG image
2. Paste stellarrclub.vercel.app link into X or Warpcast composer — should show the OG card
3. Complete a mission — success screen — tap "Post on X" — should open X composer with pre-filled text
4. Test entire app on mobile (375px viewport in Chrome DevTools):
   - Home page: no horizontal scroll, all text readable
   - Missions: mission cards are tappable, camera works
   - Chat: input field is accessible, keyboard doesn't break layout
   - NFTs: grid is single column on mobile, cards are clean
   - Profile: all stats readable
5. Test the minting loading state — should show polished animation, not a bare spinner
```

---

## WHAT WAS DROPPED AND WHY

**Farmhawk (removed, not replaced with fake branding):**
Was a real agricultural company's name used as fake oracle branding. The code called Open-Meteo directly — now it does so honestly via `/api/sky/verify` under Stellar's own name. The oracle hash is now deterministic per location per hour.

**Pollinet (removed, not replaced):**
Fictional offline mesh relay product. The IndexedDB queue was real code but served no hackathon demo value. Replaced with a simple `!navigator.onLine` error message.

**Anchor Program:**
Compressed NFT minting via Metaplex Bubblegum IS the on-chain program. Adding a custom Anchor program for a PDA counter adds 2-3 days of Rust toolchain risk for zero user-facing value. Judges see the NFTs in Explorer — that's the on-chain signal. If asked "do you have your own program?" the answer is: "We use Metaplex's Bubblegum program for compressed NFTs because it's battle-tested and our use case doesn't need custom on-chain logic — every observation is permanently recorded as an NFT that anyone can verify."

**x402 Payment Gating:**
Devnet has no USDC. USDC transfer verification within 60 seconds is fragile. Demo risk too high for solo builder. Revenue model is the Astroman marketplace (real products, real payments) — mention this in the pitch.

**Bortle Scale + Dark Sky DePIN:**
Great feature, wrong timing. Needs Supabase table, Claude Vision API, Leaflet map, new mission flow step. Ship post-hackathon as a distinct feature launch. Mention it in the pitch as "roadmap."

**Image Provenance:**
Adds a file upload step + verification API + new UI state. Doesn't improve the core loop. Ship post-hackathon.

**Jito Bundles:**
Optimization for mainnet congestion. Devnet doesn't need it. Mention in README.

---

## ENV VARS CHECKLIST

After running setup scripts, .env.local should have:
```
NEXT_PUBLIC_PRIVY_APP_ID=cmnnk6n2c002d0cl47skaaz0d
ANTHROPIC_API_KEY=
SOLANA_RPC_URL=https://api.devnet.solana.com
FEE_PAYER_PRIVATE_KEY=                    ← fund with 5+ devnet SOL
MERKLE_TREE_ADDRESS=                      ← set by npm run setup:bubblegum (Prompt 1)
COLLECTION_MINT_ADDRESS=                  ← set by npm run setup:bubblegum (Prompt 1)
STARS_TOKEN_MINT=                         ← set by npm run setup:token (Prompt 5)
NEXT_PUBLIC_COLLECTION_MINT_ADDRESS=      ← copy from COLLECTION_MINT_ADDRESS
NEXT_PUBLIC_HELIUS_RPC_URL=              ← from helius.dev free tier
NEXT_PUBLIC_APP_URL=https://stellarrclub.vercel.app
```

---

## POST-BUILD: SUBMISSION PREP (Day 5, after Prompt 7)

### README.md Structure
- One-line description
- Screenshot/GIF of the app
- "Why Solana?" section (compressed NFTs at $0.000005, Privy embedded wallets, global verifiable records)
- Architecture diagram (simple: User → Next.js → Privy wallet → Bubblegum NFT mint → Solana devnet)
- How to run locally
- Tech stack with versions
- Link to deployed demo
- Link to Astroman.ge (distribution channel)
- Future roadmap: Dark Sky DePIN, x402 AI payments, Farcaster MiniApp, mainnet launch

### Pitch Video (≤3 minutes, record on Loom)
Follow the narrative from the strategy section above. Show the live demo during "Demo" section. End with the ask.

### Technical Demo Video (2-3 minutes)
- Walk through the codebase architecture
- Show the Bubblegum mint flow (code + Explorer result)
- Show the Sky Oracle hash computation
- Show the ASTRA tool calling (Claude + real sky data)
- Explain why compressed NFTs (cost, scale, UX)
- Show the Privy embedded wallet (user never sees crypto)

### Weekly X Updates (post every Sunday)
- Week 1: "Building Stellar for @colosseum Frontier — astronomy meets Solana. Today: real compressed NFT minting working on devnet 🔭✦"
- Week 2: "Stars SPL token live + NFT gallery. Every observation is a permanent on-chain record. [screenshot]"
- Week 3: "ASTRA now has real-time sky data via Claude tool calling. Ask it what you can see tonight. [demo GIF]"
- Week 4: "Final polish + submission prep. Full demo: [video link]"

---

*Last updated: 2026-04-09*
*Target: Colosseum Frontier Hackathon (Apr 6 – May 11, 2026)*
*Solo builder execution plan — 7 prompts, 5 days of core building, submission prep*
