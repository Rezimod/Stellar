# Explore Mode — end-to-end QA, 15 September 2026

Scope: `/solar-system` Explore Mode (flight deck, jumps, docking, discoveries) and Moon Mode (descent, base, expedition, side jobs), on desktop and phone. Branch `moon/overhaul`.

## What was done

**Sound.** A minimal cue set, synthesised in Web Audio (no audio files, nothing copyrighted). The deck stays silent in between.

| Moment | Cue | Character |
|---|---|---|
| Explore begins | `launch` | slow organ swell, fifths stacked over A1, three seconds |
| Jump charge / entry / exit | `charge`, `whoosh` | rising detuned saws, then a filtered rush |
| System reached | `arrive` | a major chord on organ pipes, resolving after the exit flash |
| Expedition log entry | `discovery` | two soft bells |
| Hit taken | `hit` | short low thud; heavier when the hull takes it |
| Shields down / hull critical | `warn` | two falling notes, once |
| Docked, released | `confirm` | two rising notes |
| Near the black hole | `drone` | a low organ that grows with every radius closed |
| Moon act or job completed | `milestone` | a soft triad through the helmet |

One switch for all of it: the menu item on both decks and the M key. It is stored on the device (`stellar_sound`). Audio holds while the deck is paused. The Moon suit (breath, fan, boot strikes) follows the same switch.

**Loading screens.** `CosmicLoader` now has four variants and rotates a line of astronomy while it waits: the orrery (route and scene load), the Moon with a lander descending (Moon Mode), the lander climbing (back to orbit), and star streaks (preflight, pressing Explore). Preflight covers the first slow frames when every planet material recompiles; ascent covers the orbit scene refitting its buffers.

**Fixes from the audit** (all verified by line before changing):

- Every planet shared one compiled shader program because three keys its cache on the hook's source text, which was identical for all of them. Earth's city lights, the gas-giant bands, Saturn's ring shadow and limb darkening only ran on whichever planet compiled first. Same class of bug made the Kuiper belt draw at zero pixels. `customProgramCacheKey` added in `planet-textures.ts` and `scene-extras.ts`.
- Moon act one could never complete: the survey rig's collider kept the crew 2.55 m from the signal peak, and the lock needed 1.65 m. Peak widened in `moon-mission.ts`.
- Coming back from the Moon dropped the ship wherever it had been frozen, sometimes inside the Moon (a wreck on arrival). The deck now relaunches to a clean orbit 2.4 radii out (`input.relaunch`).
- Sun-glare could go NaN with the camera at a star's centre and black the scene out for the session. Guarded in `player-ship.ts`.
- Docking computer had no way out: thrust now cancels it, and it lets go when the station draws out of reach.
- Job objective label threw a missing-message error on an empty step (`jobs.steps.`).
- Renderer construction is guarded: no WebGL no longer leaves the loading screen up for 30 s.
- Context is force-released on scene teardown; a window resize during Moon Mode no longer restores the full-size orbit buffers behind the Moon.
- Wreck telemetry clears docking, comms and contact state; a stale `shipKind` falls back to the Kestrel; `dt` is clamped inside the model; camera up-vector guarded mid-roll; alien scan branch guarded against an empty wave; failed 4K map loads may retry; audio handle is inert after dispose.
- Moon: resuming on the surface now seats the lander's collider and landmark; a save with every patch cleared advances to contact; the job board stops re-handing the first job after all five; the v1 save key is cleared once v2 is written.
- HUD: the paint loop idles while the Moon has the screen or the tab is hidden; the launch screen comes down even if the window loses focus; light-year figures no longer wrap their unit.

## Tests

- Vitest: 74 pass (`player-ship-flight`, `star-routes`, `moon-expedition`, new `flight-audio`, new `flight-missions`). The audio suite runs against a stubbed `AudioContext` and checks every cue, the mute switch, hit folding, pause, and no-audio browsers.
- Type check and production build pass.
- Headless Chromium on the Mac GPU, desktop 1280×800 and Pixel 7, 13 steps, all pass: load, preflight, regimes, sound switch, jump to Alpha Centauri and back, lunar-pass discovery, land, descent screen, every mission act and a side job, ascent screen and relaunch, wreck and respawn, pause / resume / exit, phone sticks and menu, phone help. Console is clean apart from the Privy iframe's own dev-only CSP noise.
- Both locales carry the same 542 keys in `solarSystem`; nothing is left untranslated.

## Wording and controls, against the reference games

- Naming is consistent where it matters: the drive is the hyperdrive, the act is the jump, the state reads "Light speed"; regimes are Cruise / Fast / Ultra; ships are Kestrel / X-foil / Endurance.
- The help card now documents every bound key (Z assist, V suit, R clear, camera zoom, M sound were missing).
- Alerts are short imperative lines ("Collision — pull up"), in the Elite / Outer Wilds register, no exclamation marks.
- Both menus have the resume action first, a clear way back (Exit flight mode / Return to orbit), and now a sound switch.

## Left for later (found, not changed)

- `antialias: true` is dead with the composer in the path; MSAA should move onto the composer targets.
- `lite` is decided by CSS width alone; an iPad or a phone in landscape gets the desktop budget. Add a coarse-pointer / memory check.
- A jump does not reset the alien layer; a hostile wave in progress follows the ship's teleport with absurd lead velocities.
- Per-frame allocations in `projectToScreen` and the tier blend.
- Moon: rover dismount can place the crew inside a habitat shell; the scripted halfway meteor is dropped if an ambient one is in flight; the seismometer status light stays green on a replay; the anomaly crater is stamped after rocks are seated.
- `missionCtx.sunDist` measures from the scene origin, so it means nothing outside Sol (only the heliopause entry uses it, and that one checks the system name).
