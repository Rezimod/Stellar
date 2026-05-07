# Tether QVAC restoration — resume plan

**Last updated:** 2026-05-07 (evening, after A14 hardware-block)
**Owner:** Rezi
**Why this file exists:** We pivoted to a stripped APK to unblock hardware verification (commit `1abb18c`). To win the Tether prize we need the full QVAC integration restored and running on a real Android phone. This doc is the resume point — pick up from "Resume after A14 device-block 2026-05-07 evening" below.

---

## Resume after A14 device-block 2026-05-07 evening (READ THIS FIRST)

If you're a Claude opening this and Rezi says "continue QVAC" — **the situation is**:

**The big thing already worked.** The whole gradle pipeline + bundle generation breakthrough that EAS Build couldn't deliver is verified and reproducible:

- ✅ `apps/field/qvac/worker.bundle.js` (8.1MB) generates locally via `expo prebuild`
- ✅ `apps/field/android/app/build/outputs/apk/debug/app-debug.apk` (271MB) builds clean (`./gradlew assembleDebug`, ~6 min with warm cache)
- ✅ APK installs and launches on real phone (Samsung A14, SM-A145F)
- ✅ QVAC bare-kit worker spawns: `🐻 QVAC Worker (custom bundle)` with 3 plugins
- ✅ Models download + checksum-validate end-to-end (verified with both Llama 3.2 1B Q4_0 and Qwen3 0.6B Q4)

**What's blocked: `LlamaInterface.activate()` fails on the Samsung A14 4G (Helio G80).**

- Same generic `Error: Failed to initialize model` regardless of model (Llama 1B / Qwen 0.6B), `gpu_layers: 0`, `ctx_size: 512`, `n_threads: 1`, `no_mmap: true`. ~2.5s consistent fail time.
- Native llama.cpp error message is suppressed by the SDK's `startLogBuffering(modelId)` mechanism — never surfaces in logcat. Only the JS-level rethrow is visible.
- Device CPU features per `/proc/cpuinfo`: `fp asimd ... fphp asimdhp asimdrdm lrcpc dcpop` — **no `asimddp`** (no ARMv8.2 dot-product). Helio G80 = Cortex-A75+A55, neither has DOTPROD.
- Strong hypothesis: GGML's runtime CPU detection picks `libqvac-ggml-cpu-android_armv8.2_2.so` (FP16-capable backend that *also* uses SDOT instructions) — first SDOT execution → SIGILL → caught and rethrown as generic init failure. **No JS-level config knob to override CPU backend selection** (verified: schema exposes `gpu_layers`, `n_threads`, `ctx_size`, `no_mmap`, but no backend/ISA hint).

**State of the working tree (preserved for resume):**

- `apps/field/lib/qvac.ts` is currently configured with the most-conservative load options: `{ gpu_layers: 0, ctx_size: 512, n_threads: 1, no_mmap: true }` and tries `QWEN3_600M_INST_Q4` first, falling back to `LLAMA_3_2_1B_INST_Q4_0`. **Revert this when a compatible phone arrives** — Llama 1B is the rep-validated demo model. To revert: change modelSrc back to `LLAMA_3_2_1B_INST_Q4_0` and drop the n_threads/no_mmap/ctx_size overrides (keep `gpu_layers` only as a defensive default).
- `docs/qvac-debug/load-failure-A14.log` — clean 97-line dump for the rep
- Metro bundler has been stopped (was running on `localhost:8081` with `adb reverse tcp:8081`)
- ADB device authorization for SM-A145F is persisted (`adb devices` will see it on next plug-in if same cable)

**Immediate pickup steps when a compatible phone arrives** (Pixel 6/7/8/9, Galaxy S22/23/24, Galaxy A52/A53/A54, OnePlus 9+, Pixel 7a — anything Snapdragon 7-series+ or Tensor — **avoid all Helio G-series**):

1. **Revert `apps/field/lib/qvac.ts`** to clean Llama 1B + minimal config:
   ```ts
   const { loadModel, LLAMA_3_2_1B_INST_Q4_0 } = sdk as any;
   this.llmModelId = await loadModel({
     modelSrc: LLAMA_3_2_1B_INST_Q4_0,
     modelType: 'llm',
     onProgress: ...
   });
   ```

2. **Plug in the new phone.** USB debugging on, "Always allow" the RSA. Confirm with `adb devices`.

3. **Start Metro + adb reverse + relaunch app:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   cd /Users/nika/Desktop/Stellar-rezimod/apps/field && npx expo start --dev-client --port 8081 &
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk    # if not yet installed
   adb shell am force-stop com.stellar.field
   adb shell monkey -p com.stellar.field -c android.intent.category.LAUNCHER 1
   ```

4. **Watch for "On-device AI ready"** — that's the green light. Then run the 9-step verification from `docs/qvac-demo-script.md`.

5. **For the actual submission demo recording**, build a release APK (not debug — release doesn't need Metro):
   ```bash
   cd /Users/nika/Desktop/Stellar-rezimod/apps/field/android && ./gradlew assembleRelease
   ```

**If the rep replied with a fix** (e.g., a backend env var or an updated SDK), apply it BEFORE step 1, then proceed normally.

**Do NOT keep grinding on the A14.** It's a chipset-level mismatch with QVAC's CPU backend selection logic; not solvable from the JS layer.

---

## Resume after restart 2026-05-07 (historical, superseded by section above)

If you're a Claude opening this after Rezi restarts his Mac and says "continue QVAC", **the situation is**:

**What's done (committed to main):**
- ✅ Android SDK fully installed (`~/Library/Android/sdk/`): platform-tools, platforms;android-35, build-tools 35.0.0, **NDK 29.0.14206865** (the QVAC pin)
- ✅ Java 21 (Android Studio JBR) wired as `JAVA_HOME` in `~/.zshrc`. `ANDROID_HOME` + PATH wired
- ✅ `apps/field/node_modules` has all deps including ~25 missing peer deps that QVAC needs but doesn't declare. See `~/.claude/projects/-Users-nika-Desktop-Stellar-rezimod/memory/feedback_qvac_bundle.md` for the full list
- ✅ `apps/field/qvac.config.json` trims plugins to LLM + embedding + Whisper (drops parakeet, NMT, TTS, OCR, image gen)
- ✅ `apps/field/qvac/worker.bundle.js` (8.4MB) generated successfully — **the step EAS Build always died on, now passing locally**. This is the prize-eligible technical breakthrough.
- ✅ `npx expo prebuild --clean --platform android` succeeds end-to-end with `🫡 QVAC: Mobile bundle generated`
- ✅ `apps/field/android/` directory generated (gitignored — will need to be regenerated post-restart via `expo prebuild` if blown away by `git clean`, but the working dir survives a Mac restart untouched)
- ✅ Submission package drafted at `docs/qvac-submission.md`, demo recording script at `docs/qvac-demo-script.md`, judge-facing tech writeup at `docs/qvac-integration.md`
- ✅ Web `/field` route already wired to read `NEXT_PUBLIC_FIELD_APK_URL` env var

**What was running when restart happened:**
- `./gradlew assembleDebug` in `apps/field/android/` — was 922+ log lines deep, compiling React Native libraries, ~5-15 min from finishing. **Mac restart killed this process.** Gradle cache (~/.gradle) persists, so re-running it should be much faster on second attempt — maybe 5-10 min instead of fresh 15-30.

**Immediate pickup steps (in order):**

1. Verify the working tree survived restart:
   ```bash
   ls /Users/nika/Desktop/Stellar-rezimod/apps/field/qvac/worker.bundle.js   # should be 8.4MB
   ls /Users/nika/Desktop/Stellar-rezimod/apps/field/android/gradlew         # should exist
   ```
   If `qvac/` or `android/` is missing (e.g., user ran `git clean`), regenerate with:
   ```bash
   cd /Users/nika/Desktop/Stellar-rezimod/apps/field && npx expo prebuild --clean --platform android
   ```

2. Source env vars (they're in `~/.zshrc` but may not be in the new shell):
   ```bash
   source ~/.zshrc
   java -version   # expect openjdk 21
   adb --version
   sdkmanager --version
   ```

3. Re-kick the gradle build:
   ```bash
   cd /Users/nika/Desktop/Stellar-rezimod/apps/field/android
   ./gradlew assembleDebug
   ```
   This will pick up where the cache left off. APK lands at `apps/field/android/app/build/outputs/apk/debug/app-debug.apk`.

4. **Phone arrives ~8-9pm Tbilisi time** (a borrowed modern Android — **Galaxy J3 Pro is NOT viable**, only 2GB RAM and no Vulkan support). Once plugged in:
   ```bash
   adb devices    # should show device, not "unauthorized"
   adb install -r apps/field/android/app/build/outputs/apk/debug/app-debug.apk
   ```
   On the phone — accept the "Allow USB debugging" RSA fingerprint popup, set USB to MTP/File Transfer.

5. Run the 9-step on-device verification from `docs/qvac-demo-script.md` (boot → model download → chat M31 → voice log → airplane mode).

6. Build release APK and ship per `docs/qvac-submission.md` checklist (steps 5-14).

**Do NOT re-derive any of the steps in §0–§9 below — those were the pre-restart plan and are now mostly historical. The state above supersedes them.**

**Reference docs in repo root / `docs/`:**
- `docs/qvac-integration.md` — judge-facing technical writeup
- `docs/qvac-submission.md` — Superteam Earn submission package + ship checklist
- `docs/qvac-demo-script.md` — 75s demo recording script (EN + KA)
- `TETHER_QVAC_TRACK.md` §0.1 — rep-validated 2-day plan (now mostly historical, day-of work is complete)
- `~/.claude/projects/.../memory/feedback_qvac_bundle.md` — exact peer-deps recipe if anything needs rebuilding

---

## Status update (2026-05-06)

- **Tether rep validation:** spoke with the QVAC representative. Use case (offline observers + cost savings vs paid Claude API) confirmed. Android APK confirmed as the path. Direct rep contact retained as a live support channel — paste any stuck build log to him before grinding solo for hours.
- **Source files already restored** in the working tree from `1abb18c^` (== commit `2a69854`): `App.tsx`, `app.json`, `lib/qvac.ts`, `lib/user.ts`, `lib/privy.tsx`, `package.json`, `scripts/build-rag-index.ts`. **Step 6 below is now a single `npm install`.** The restore was deliberate — see git status for diffs.
- **Web-side artifacts shipped** in the same session: `/field` APK download landing (uses `NEXT_PUBLIC_FIELD_APK_URL` env var), Field Mode banner on `/chat`, `docs/qvac-integration.md` for judges, README updated with the cloud/edge framing.
- **What's left:** install Android Studio (or cmdline tools), connect phone, `npm install` in `apps/field`, run prebuild + Android build, verify on hardware, set `NEXT_PUBLIC_FIELD_APK_URL` once the APK is hosted, record demo, submit.

---

## TL;DR for a fresh Claude session

If you're a Claude opening this cold:

- Stellar Field is an Expo app at `apps/field/` in this repo
- The Tether prize requires QVAC SDK actually running on-device (not stubbed)
- The Tether rep has validated the use case (offline observers, free vs paid Claude) and is on standby for build help — the user has his contact
- Source files are already restored (working tree matches `2a69854`); `apps/field/node_modules` does NOT yet have the QVAC + Privy + bare-* deps because `npm install` hasn't been run in the restored state
- Web-side download landing lives at `src/app/field/page.tsx` (route: `/field`); it reads `NEXT_PUBLIC_FIELD_APK_URL` and shows "Available shortly" until that's set
- The user has macOS Ventura 13.1 (Xcode is blocked — never suggest iOS), an Android phone arriving tonight or tomorrow, and Homebrew may or may not be installed
- Read `TETHER_QVAC_TRACK.md` §0.1 for the rep-validated 2-day plan and `docs/qvac-integration.md` for the judge-facing technical writeup
- Pick up at "Step 1" below

---

## Current state of the repo

**Last commit:** `1abb18c chore(field): pivot — strip QVAC + Privy from verification APK`

What's in the repo right now:

- `apps/field/` is a working Expo SDK 54 app, typecheck clean, bundles cleanly via `npx expo export`
- `apps/field/lib/qvac.ts` is a **stub** that returns canned responses. The original QVAC integration code is in commit `0f0b2e9` and earlier (Day 3 work).
- `apps/field/lib/user.ts` skips Privy and uses a device-local anon UUID
- `apps/field/App.tsx` doesn't wrap children in `StellarPrivyProvider`
- `apps/field/lib/privy.tsx` was deleted in the pivot
- `apps/field/package.json` no longer lists: `@qvac/sdk`, `@privy-io/expo`, `@privy-io/expo-native-extensions`, `react-native-bare-kit`, `bare-pack`, `bare-rpc`, `bare-buffer`, `bare-stream`, `events`, `viem`, `expo-apple-authentication`, `expo-clipboard`, `expo-build-properties`, `expo-device`, `expo-secure-store`, `expo-web-browser`, `expo-auth-session`, `expo-crypto`, `react-native-passkeys`, `react-native-qrcode-styled`, `react-native-safe-area-context`, `react-native-svg`, `react-native-webview`
- `apps/field/app.json` no longer references `@qvac/sdk/expo-plugin` or `expo-build-properties`
- `apps/field/metro.config.js` is still in place (sets RN/browser resolver conditions)
- `apps/field/.npmrc` has `legacy-peer-deps=true`

The full QVAC integration to be restored lives in commit **`2a69854`** — that's the "everything wired but EAS won't build it" snapshot.

## Why we stopped

EAS Build kept failing during the **Prebuild** phase, where QVAC's Expo config plugin invokes `bare-pack` to generate `worker.mobile.bundle.js`. The QVAC docs document `npx expo run:android --device` as the supported path; EAS managed builds need extra config we couldn't figure out remotely. Combined with macOS 13.1 blocking current Xcode, the user's only viable path is local Android cmdline tools.

We chose to strip QVAC, ship the verification APK, and resume QVAC restoration in a fresh session with proper local toolchain.

## What "done" looks like

You'll know the QVAC restoration is complete when, on the user's Android phone (NOT an emulator — QVAC docs explicitly forbid emulators):

1. App launches with dark cosmic UI
2. Purple banner "Fetching local model (~700MB, one-time)" with progress bar
3. Banner clears, "On-device AI ready"
4. Type "What is M31?" in chat — get a streaming response that mentions Andromeda Galaxy + dust lane, with a citation chip below
5. Tab to Voice Log
6. Press-and-hold mic, speak "M31 Andromeda 25mm at 100x seeing 7 of 10", release
7. Real Whisper transcription appears in the review card
8. Target auto-fills to "M31"; Save → Supabase write or local queue

If all 8 work, that's the prize-eligible artifact.

---

## The plan — 8 steps

Each step has commands to run and an expected output. Don't move to the next step until the current one prints success. If anything looks off, paste the output to me and I'll diagnose.

### Step 1 — Confirm Homebrew is installed

```bash
brew --version
```

**Expected output:** `Homebrew 4.x.x` (any 4.x is fine).

**If "command not found":** install Homebrew first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the on-screen instructions, then re-run `brew --version`.

### Step 2 — Install Java 17 + Android cmdline tools

```bash
brew install --cask temurin@17
brew install --cask android-commandlinetools
```

**Expected:** ~200MB Java download, ~150MB Android tools download. Both should print "🍺  ... was successfully installed!" at the end.

### Step 3 — Set environment variables

Append to `~/.zshrc`:

```bash
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
echo 'export PATH="$PATH:/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin:/opt/homebrew/share/android-commandlinetools/platform-tools:$ANDROID_HOME/platform-tools"' >> ~/.zshrc
source ~/.zshrc
```

Verify:
```bash
java -version
sdkmanager --version
```

**Expected:** `openjdk version "17.x.x"` and a numeric sdkmanager version like `13.0`.

**If `sdkmanager: command not found`:** Homebrew installs cmdline-tools at `/opt/homebrew/share/android-commandlinetools/cmdline-tools/latest/bin` on Apple Silicon, `/usr/local/share/...` on Intel Macs. Adjust the PATH line above to match your install — find the actual path with `brew info android-commandlinetools | grep "share"`.

### Step 4 — Install Android SDK packages

```bash
mkdir -p "$HOME/Library/Android/sdk"
yes | sdkmanager --sdk_root="$HOME/Library/Android/sdk" --licenses
sdkmanager --sdk_root="$HOME/Library/Android/sdk" "platform-tools" "platforms;android-34" "build-tools;34.0.0"
```

**Expected:** Several minutes of downloading (~500MB). Final lines should say "done" with no errors.

Verify:
```bash
adb --version
```

**Expected:** `Android Debug Bridge version 1.x.y`.

### Step 5 — Connect phone, enable USB debugging, verify

On the phone:
1. **Settings → About Phone → tap Build Number 7 times** (says "You are now a developer")
2. **Settings → System → Developer Options → toggle USB Debugging ON**
3. Plug into Mac with USB cable. If prompted on phone "Allow USB debugging from this computer?", check "Always allow" and tap OK.
4. If a notification appears, choose **File Transfer / MTP** mode.

On Mac:
```bash
adb devices
```

**Expected:**
```
List of devices attached
ABC123XYZ        device
```

**If "unauthorized":** check the phone for the popup, allow, retry.
**If empty list:** cable might be charge-only — try another USB cable. Or run `adb kill-server && adb start-server`.

### Step 6 — Reinstall deps (source files already restored)

The source files (`App.tsx`, `app.json`, `lib/qvac.ts`, `lib/user.ts`, `lib/privy.tsx`, `package.json`, `scripts/build-rag-index.ts`) were checked out from `1abb18c^` (== commit `2a69854`) on 2026-05-06 and are sitting in the working tree. **You don't need to run `git checkout` again — just install the deps.**

```bash
cd /Users/nika/Desktop/Stellar-rezimod/apps/field
rm -rf node_modules
npm install
```

Note: `package-lock.json` was *not* restored (the pivot's lockfile is still in place). Letting `npm install` regenerate it from the restored `package.json` is safer than reverting the 12k-line pivot lockfile.

Verify the typecheck still passes:
```bash
npx tsc --noEmit
```

**Expected:** silent (no errors).

**If you need to abort and re-stub** (e.g., the rep responds with a different recommendation): re-stub by checking out the pivot files from commit `1abb18c`:
```bash
git checkout 1abb18c -- apps/field/App.tsx apps/field/app.json apps/field/lib/qvac.ts apps/field/lib/user.ts apps/field/package.json apps/field/scripts/build-rag-index.ts
git rm apps/field/lib/privy.tsx
```

### Step 7 — Run expo prebuild

```bash
cd /Users/nika/Desktop/Stellar-rezimod/apps/field
npx expo prebuild --clean
```

This is the step that **always failed in EAS**. Locally it should succeed because the QVAC docs target this exact path. The prebuild generates `android/` folder + runs the QVAC plugin to create `node_modules/@qvac/sdk/dist/worker.mobile.bundle.js`.

**Expected:** Several minutes. Output should include lines like "🕚 QVAC: Generating tree-shaken bundle..." and "🫡 QVAC: Mobile bundle generated".

**If it fails here:** paste the error to **the Tether rep first** (he's expecting it), then to Claude. Most likely culprits (in order):
- Missing `@qvac/cli` — install with `npm install --save-dev @qvac/cli`
- Bare module resolution issue — may need `npm install bare-runtime bare-os bare-fs ...`
- NDK / Gradle issue — usually fixed by re-running prebuild after installing missing pieces

### Step 8 — Build and install on phone

```bash
cd /Users/nika/Desktop/Stellar-rezimod/apps/field
npx expo run:android --device
```

This compiles the Android app and installs it via `adb` on your connected phone. First build is **slow** (~15–30 min) because Gradle downloads its dependency cache and compiles QVAC's native C++/Vulkan code. Subsequent runs are seconds.

**Expected end state:** App launches automatically on your phone after install. You see the dark UI, the model download banner appears, Llama 3.2 1B starts downloading.

**Common failures and fixes:**
- **"adb: device not found"** → re-plug, re-run `adb devices`
- **Gradle daemon error** → `cd android && ./gradlew --stop && cd ..` then retry
- **NDK version mismatch** → the QVAC plugin pins NDK 29.0.14206865; if missing, run `sdkmanager "ndk;29.0.14206865"`
- **OutOfMemoryError during compile** → add `org.gradle.jvmargs=-Xmx4096m` to `android/gradle.properties`

---

## Verification sequence on the phone

Once the app launches successfully, run through these in order. Each should pass before moving on:

1. **App boots** — dark UI, "Stellar Field" title, AUTO/FIELD/ONLINE chips
2. **LLM model downloads** — banner shows progress, completes (~5 min on Wi-Fi for ~700MB)
3. **Chat works** — type "What is M31?" → streaming response cites Andromeda + dust lane
4. **Mode toggle** — switch to FIELD, ask another question, gets handled by local model
5. **Voice Log tab loads** — mic button visible, "Hold to record"
6. **Whisper downloads** — first time you tap mic, ~150MB Whisper model downloads
7. **Voice transcribes** — record yourself saying a target/observation, release, real transcript appears
8. **Save flow works** — edit transcript if needed, tap Save, confirmation toast
9. **Airplane mode test** — toggle on, repeat steps 3 and 7 — should still work fully offline

If 1–9 all pass, the QVAC integration is verified end-to-end and the project is **prize-eligible**.

## Step 9 — Host the APK and wire it into the web app

The verified APK is at `apps/field/android/app/build/outputs/apk/release/app-release.apk` (or `debug/app-debug.apk` for the dev build). Two hosting options, ordered by speed:

1. **GitHub Release** (fastest, judges respect it)
   ```bash
   gh release create v0.1.0-field --title "Stellar Field 0.1.0 (Tether QVAC track)" \
     --notes-file docs/qvac-integration.md \
     apps/field/android/app/build/outputs/apk/release/app-release.apk
   ```
   Copy the asset's direct download URL.

2. **Vercel public asset** (drop into `public/downloads/stellar-field.apk`)
   - Note size: GitHub LFS or external hosting if >100MB after Gradle's release build.

Then set the env var on the production deploy:
```bash
NEXT_PUBLIC_FIELD_APK_URL=<URL from above>
```
- Local: add to `.env.local`
- Vercel: project → Settings → Environment Variables → add for Production. Redeploy.

The `/field` route reads this var. Empty value → "Available shortly" pill. Set value → "Download APK" button.

## Demo capture for submission

Once verification passes:

1. Mount phone in a stand or hold steady
2. Toggle airplane mode ON to demonstrate offline
3. Record a 60–90 second screen capture (built into Android: System UI screen recorder)
4. Show the boot, the chat, the voice log, the save — narrate
5. Upload to YouTube unlisted
6. Add the link to the Tether Superteam Earn submission

The demo is the deciding factor for the 10% "demo quality" criterion. A real airplane-mode shot with on-device AI working is the strongest possible evidence.

---

## Worst-case fallback

If Step 7 (`expo prebuild`) keeps failing despite all the above, do not keep grinding. The fallback is:

1. Submit to Colosseum Frontier with the web app (it's the main hackathon)
2. Skip the Tether side track this round
3. Write up the QVAC integration in a follow-up post — the code is already in the repo and it's a real architecture; even an unshipped attempt has educational value

Don't burn the May 11 deadline on Tether infrastructure issues. The main hackathon is what matters.

---

## Quick command reference

Restoring QVAC code from the pivot:
```bash
git checkout 2a69854 -- apps/field/App.tsx apps/field/app.json apps/field/lib/qvac.ts apps/field/lib/user.ts apps/field/package.json apps/field/package-lock.json apps/field/metro.config.js apps/field/lib/privy.tsx
```

Reverting back to the stub if needed:
```bash
git checkout 1abb18c -- apps/field/App.tsx apps/field/app.json apps/field/lib/qvac.ts apps/field/lib/user.ts apps/field/package.json apps/field/package-lock.json
git rm apps/field/lib/privy.tsx
```

Local bundle smoke test (~30 seconds, no Android needed):
```bash
cd apps/field && npx expo export --platform android --output-dir /tmp/test
```

Wipe and reinstall deps:
```bash
cd apps/field && rm -rf node_modules package-lock.json && npm install
```
