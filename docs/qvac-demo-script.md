# Stellar Field — QVAC Demo Recording Script

**Target length:** 75 seconds.
**Where it goes:** YouTube unlisted → Tether QVAC submission on Superteam Earn.
**Filming:** phone in landscape on a stand (or held very steady), screen recording via Android System UI screen recorder. Record audio narration on a separate device or directly on phone if the recorder supports it.

---

## Setup before recording

1. Charge phone to 80%+ (recording draws battery, and the LLM load uses CPU)
2. Open the device's **screen recorder** (pull down quick-settings → Screen Record). Enable "show taps" and microphone audio.
3. Have the app cleanly closed (force-stop, not just backgrounded) so the boot sequence is fresh.
4. **Disable notifications during recording**: Do Not Disturb ON. No banner from messages mid-take.
5. Open **Settings** in a second app slot so you can swipe to it for the airplane-mode beat without fumbling.
6. Have these phrases mentally ready (or written on a sticky note off-camera):
   - Chat query: **"What is M31?"**
   - Voice log: **"M31 Andromeda 25mm at 100x seeing 7 of 10"**
7. Practice the run-through dry once *without* recording. Critical because the model download (~5 min) only happens on first launch — second launch is instant. **For the actual recording, you want a clean fresh install** (uninstall + reinstall the APK before recording).

---

## EN narration script (primary — for Tether submission)

> **[0:00 — App icon visible on home screen]**
> "Stellar Field is the offline-mode astronomy app for telescope owners observing from dark-sky sites. No cell signal. No paid AI calls. Everything runs on the device."

> **[0:08 — Tap icon, app launches, dark cosmic UI appears]**
> "On first launch it downloads a one-billion-parameter Llama model — about 700 megabytes — locally."

> **[0:14 — "On-device AI ready" appears, model download bar disappears]**
> "Once cached, no network is needed again."

> **[0:18 — Tap chat input, type "What is M31?"]**
> "Let me ask it about the Andromeda Galaxy."

> **[0:22 — Streaming response begins, mentions Andromeda, dust lane, distance]**
> "Streaming response, on the phone's CPU. The astronomy reference data is bundled in a local RAG index — so it cites real sources, not a guess."

> **[0:32 — Citation chip appears below the answer, tap to expand]**
> "There's the source citation."

> **[0:35 — Switch to Voice Log tab, press-and-hold mic button]**
> "Voice log uses Whisper, also local. I'll log my last observation."

> **[0:38 — Speak clearly into phone]**
> "M31 Andromeda. 25 millimeter eyepiece at 100x. Seeing 7 of 10."

> **[0:46 — Release mic, transcript appears in review card, target auto-fills "M31"]**
> "Real Whisper transcription. Target field auto-detected. Save."

> **[0:52 — Tap Save, confirmation toast]**
> "Stored locally, syncs when I'm back online."

> **[0:55 — Pull down quick-settings, toggle Airplane Mode ON visibly. Show the airplane icon in status bar.]**
> "And just to be clear — this all works offline."

> **[1:00 — Open chat again, type "Best target tonight at magnitude 8 or brighter"]**
> "Same query, no signal."

> **[1:05 — Streaming response works identically]**
> "Identical response. Cloud AI literally cannot reach this user."

> **[1:12 — Hold on app, fade to logo card]**
> "Stellar Field. Astronomy AI that works where astronomers actually work."

> **[1:15 — End card]**

**Final length:** 75 seconds.

---

## KA narration (alternate — if submitting Georgian-localized version)

> **[0:00]** "Stellar Field არის ასტრონომიული აპლიკაცია ოფლაინ რეჟიმისთვის — ტელესკოპის მფლობელებისთვის, რომლებიც დაკვირვებას ბნელ ცაში ატარებენ. არც ფიჭური სიგნალი, არც ფასიანი AI ზარები. ყველაფერი მუშაობს თვით მოწყობილობაზე."

> **[0:08]** "პირველად გაშვებისას გადმოწერს ერთი მილიარდი პარამეტრის Llama მოდელს — დაახლოებით 700 მეგაბაიტი — ლოკალურად."

> **[0:14]** "ერთხელ დაქეშირებული, ქსელი აღარ სჭირდება."

> **[0:18]** "ვკითხავ ანდრომედას გალაქტიკის შესახებ."

> **[0:22]** "პასუხი ბრუნდება ნაკადად, ტელეფონის CPU-ზე. ასტრონომიული რეფერენსი ლოკალურ RAG ინდექსშია — ამიტომ წყაროებს მოიხმობს, არა გამოგონიდან."

> **[0:32]** "აი წყაროს ციტატა."

> **[0:35]** "ხმოვანი ჟურნალი იყენებს Whisper-ს, ის ასევე ლოკალურია. ჩავიწერ უკანასკნელ დაკვირვებას."

> **[0:38]** *(speak in EN — astronomy terms)* "M31 Andromeda. 25 millimeter eyepiece at 100x. Seeing 7 of 10."

> **[0:46]** "Whisper-ის ნამდვილი ტრანსკრიფცია. ობიექტის ველი ავტომატურად შეივსო — M31. Save."

> **[0:52]** "ლოკალურად ინახება, ქსელის დაბრუნებისას სინქრონდება."

> **[0:55]** "და დაუშვებლად — ყოველივე ეს ოფლაინ მუშაობს."

> **[1:00]** "იგივე შეკითხვა, სიგნალის გარეშე."

> **[1:05]** "იდენტური პასუხი. ღრუბლოვან AI-ს ფიზიკურად არ შეუძლია ამ მომხმარებამდე მოაღწიოს."

> **[1:12]** "Stellar Field. ასტრონომიული AI, რომელიც იქ მუშაობს, სადაც ასტრონომები ნამდვილად მუშაობენ."

---

## Visual checklist (what must be visible on screen)

These are the moments the Tether judges will pause on. Make sure each is on-screen for at least 2 seconds:

- [ ] **Model download banner** with progress bar — proves it's actually downloading, not pre-bundled fake
- [ ] **"On-device AI ready" status** — the explicit confirmation
- [ ] **Streaming chat response** — words appearing one at a time, not all at once (proves real inference)
- [ ] **Citation chip** below the answer — proves the RAG index is working
- [ ] **Mic button held down** with waveform/pulse animation — proves voice capture is real
- [ ] **Whisper transcript text appearing** — proves on-device speech recognition
- [ ] **Airplane mode icon in status bar** — the most important shot in the whole video
- [ ] **Streaming response while airplane mode is ON** — the prize-eligible artifact

If any one of these is missing, the video isn't strong enough. Re-shoot.

---

## Anti-patterns (don't do these)

- **Don't speed up the video.** Tether judges will assume sped-up = pre-recorded fake. Real-time only.
- **Don't cut to the response.** Show it streaming live. Cuts mid-stream look like the AI is faked.
- **Don't have airplane mode pre-toggled.** Toggle it ON during the recording, visibly, mid-take. That's the proof.
- **Don't use background music.** Sterile, technical. Voice narration only.
- **Don't add captions in post.** Use the on-device caption feature (Live Caption) if needed for accessibility, but plain narration is best.

---

## Submission package

Once recorded:

1. Upload to YouTube **unlisted** (not public, not private — judges need a clickable link without it being indexed)
2. Title: **"Stellar Field — Tether QVAC Track Demo (Frontier Hackathon)"**
3. Description: paste the first 3 paragraphs of `docs/qvac-integration.md` and link to the GitHub repo + APK release
4. Add the YouTube link + APK direct download URL to the Superteam Earn submission
5. Submit before May 11 23:59 UTC
