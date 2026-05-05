# Tether QVAC restoration — resume plan

**Last updated:** 2026-05-05
**Owner:** Rezi
**Why this file exists:** We pivoted to a stripped APK to unblock hardware verification (commit `1abb18c`). To win the Tether prize we need the full QVAC integration restored and running on a real Android phone. This doc is the resume point — open it next session and continue from "Current state."

---

## TL;DR for a fresh Claude session

If you're a Claude opening this cold:

- Stellar Field is an Expo app at `apps/field/` in this repo
- The Tether prize requires QVAC SDK actually running on-device (not stubbed)
- Days 1–3 of code is real and committed; QVAC is currently stubbed at `apps/field/lib/qvac.ts` after pivot commit `1abb18c`
- The user has macOS Ventura 13.1 (Xcode is blocked — never suggest iOS), an Android phone with USB cable, and Homebrew may or may not be installed
- The user wants the cmdline-only Android toolchain (no Android Studio)
- Read `TETHER_QVAC_TRACK.md` (sibling file) for the full integration design
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

### Step 6 — Restore the QVAC code

This brings back the full integration from commit `2a69854`:

```bash
cd /Users/nika/Desktop/Stellar-rezimod
git checkout 2a69854 -- apps/field/App.tsx apps/field/app.json apps/field/lib/qvac.ts apps/field/lib/user.ts apps/field/package.json apps/field/package-lock.json apps/field/metro.config.js
git checkout 2a69854 -- apps/field/lib/privy.tsx
```

Then reinstall:
```bash
cd apps/field
rm -rf node_modules
npm install
```

Verify the typecheck still passes:
```bash
npx tsc --noEmit
```

**Expected:** silent (no errors).

### Step 7 — Run expo prebuild

```bash
cd /Users/nika/Desktop/Stellar-rezimod/apps/field
npx expo prebuild --clean
```

This is the step that **always failed in EAS**. Locally it should succeed because the QVAC docs target this exact path. The prebuild generates `android/` folder + runs the QVAC plugin to create `node_modules/@qvac/sdk/dist/worker.mobile.bundle.js`.

**Expected:** Several minutes. Output should include lines like "🕚 QVAC: Generating tree-shaken bundle..." and "🫡 QVAC: Mobile bundle generated".

**If it fails here:** paste the error to Claude. Most likely culprits (in order):
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
