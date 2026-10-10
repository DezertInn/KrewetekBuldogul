# Milestone 4 validation

Date: 2026-10-10 (Europe/Warsaw). This report records fresh M4 evidence; [M3](MILESTONE_3_VALIDATION.md), [M2](MILESTONE_2_VALIDATION.md) and [M1](MILESTONE_1_VALIDATION.md) remain historical. The user reported M3 manually passed, without exact build/browser/device metadata. M4 was explicitly authorized by the pasted implementation request; [GDD 6.6](GAME_DESIGN_TEMPLATE.md#66-authorized-milestone-4-b01-slice-override) owns adjustable gameplay and [Art 2.4](ART_DESIGN_TEMPLATE.md#24-authorized-milestone-4-native-3d-and-sfx) owns source asset provenance. Final art/feel approval remains with the owner.

Implementation: separate B01L01–03/six-room route and M4 journal, three boxer roles/Coach, two upgrade picks, preserved M3 route/checkpoints and baseline combat, native 3D mesh/rig/room kit, event-driven noise SFX and independent presentation settings. No external model/texture/audio files or new dependencies were introduced. Original source reproduces the assets. No music or ambience playback is implemented. No public deployment or Main merge is authorized.

## Completed implementation and checks

Primary **Boxing gym · M4** implements B01L01–03 as six authored rooms with warm-up, bag-hall and ring themes. Five ordinary formations use Jabber, Counter and Clincher; the final room contains the two-phase Coach alone. Entry grace, collision-matched equipment and explicit exits carry player state. Exactly two seeded three-option offers use the existing seven effects, after L01/L02. Coach defeat ends the run without a third reward, healing or stadium transition.

Baseline movement, glove reach, three-weapon DPS and pillar 33/9/48-tick timing remain unchanged. Frontal guard, locked charge lanes, walls, Coach attack shapes/phase transition and recovery stagger resolve in simulation. Presentation never creates hits. Terminal pillar follow-through freezes combat/time/rewards and obeys settings, confirmation, focus and visibility gates.

M4 uses separate content/schema IDs and IndexedDB journal. Safe entries, clear markers, offers and committed choices are validated; revision backup, lease/Web Lock ownership, explicit takeover, unsupported-data protection, temporary play and tombstones remain. M3 data and its original route are independently resumable. Source-built meshes, rig, materials, weapon models, four enemy silhouettes and modular equipment replace primitive character presentation. Original noise SFX and independent Master/Effects/UI/Ambience, mute, softer sound and reduced-effects preferences are implemented. Ambience is reserved without playback; dependencies/lockfile are unchanged.

| Check | Actual result and scope |
| --- | --- |
| TypeScript | `npm.cmd run typecheck` passed |
| Unit/integration | `npm.cmd test`: **130/130 passed**, including retained combat/DPS, input/settings, upgrades, M3 run/storage and pillar checks; new M4 combat/route/storage, mesh/rig and audio tests |
| Production build | `npm.cmd run build` passed. Advisory main chunk >500 kB remains: final main JS 1,373.38 kB minified / 344.27 kB gzip |
| Legacy browser regression | **42 cases passed** in installed Chrome/Edge on the M4 presentation: input/remapping/menu, settings recovery, simulated pads, M3 saves/upgrades and terminal pillar gates |
| M4 storage/audio/initialization | **18 cases passed**, nine per browser: M3/M4 coexistence, cleared reload/remapped exit, tab takeover/stale ownership, temporary mode, denied/unsupported storage, independent audio settings, blocked AudioContext, actual defeat/restart and delayed initialization |
| M4 complete routes | **6/6 passed** in the final focused run: gloves, pillar and rifle complete six rooms in each browser, reload each safe entry and both offers, choose exactly two upgrades, defeat Coach, settle once and restart cleanly |
| Documents/file scope | UTF-8 and relative-link checks plus `git diff --check`; source/design/manual evidence reviewed together before commit |

These **66 passing browser cases** were collected in separate final focused batches, not a claimed single all-green invocation. Earlier route-driver failures compared live timers with persisted entry values, walked into cover or dashed into attacks. The final driver uses actual persisted entries, collision-aware navigation and reward seed 42. It operates real UI/keyboard/mouse with read-only snapshots; player/enemy health, poses and simulation timing are unmodified. Native run/lease UUID generation is unchanged. Final route batch: 4.9 minutes, no retries. Storage/audio cases cover the final initialization/audio gate fixes.

Combat tests cover Counter frontal/flank damage with all weapons, guard expiry, charge lane/dodge/walls, Coach double-jab/sweep/slam geometry, one-time 50% transition, legal recovery stagger, attacker limits, all seven existing effects and fractional Impact. Route/storage tests reject inconsistent IDs/phases/clear markers/carry/RNG/offers while retaining M3. An actual-UI test delays IndexedDB initialization and verifies that it cannot replace already-running dummy practice.

## Browser and performance conditions

Installed **Chrome 154.0.8037.98** and **Edge 155.0.4283.45**, headless on Windows 11 (OS build 10.0.26200). Workstation: **Ryzen 7 7700X**, **RTX 4070 Ti SUPER**, approximately **64 GB RAM** (63.09 GiB visible). ANGLE D3D11 / WebGL 2; DPR 1. Performance viewport 1920×1080, game canvas 1920×904 due to UI. Headless scheduling approximately 60 Hz; physical display refresh/power mode were not measured. Other browser checks/recording overlapped part of the measurements on the same GPU.

First observation: **600.597 s**, **28,529 active frames**, six victories/two defeats across all weapons. Menus and a final navigation/confirmation idle period of roughly 100 s were included; active statistics exclude idle time. Mean **16.685 ms**, p95/p99 **16.8 ms**, **63.51% ≤16.7 ms**, **99.94% ≤33.3 ms**; maximum 199 draw calls / 35,778 visible triangles. This initial summary was observed during execution; the detailed local file below contains the subsequent repeat.

Refined repeat: **596.258 s (9 min 56.3 s)**, **16 completed runs: 11 victories/five defeats**, all weapons/rooms/Coach phases, **34,285 active frames**. Mean **16.695 ms (~59.90 FPS)**, p95/p99 **16.8 ms**, **59.77% ≤16.7 ms**, **99.90% ≤33.3 ms**. Counters sampled approximately once per second. Frame intervals came from actual rAF while playing/traversing; intervals ≥200 ms excluded paused/system gaps. Debug snapshots/automation add overhead. [Raw repeat measurements](../.npm-cache/m4-benchmark.json) and [log](../.npm-cache/m4-benchmark.log) are generated local artifacts.

| Room | Maximum sampled draw calls | Maximum sampled visible triangles |
| --- | ---: | ---: |
| B01L01_R01 | 143 | 19,474 |
| B01L01_R02 | 173 | 24,258 |
| B01L02_R01 | 181 | 33,806 |
| B01L02_R02 | 198 | 35,510 |
| B01L03_R01 | 199 | 28,286 |
| B01L03_R02 | 114 | 18,216 |

Cold local load: cache disabled, CDP **20 Mbps / 50 ms latency**, no public host. Ready UI/storage **510.9 ms**, load event **435.7 ms**, resource transfer **351,419 bytes**, encoded bodies **349,919 bytes** (~0.334 MiB). Capture preceded the small initialization/audio focus fix; final build size is recorded above. No model/audio downloads follow the source bundle.

**TDD deviations:** proposed ≤150 draw calls is exceeded (maximum 199); strict 16.7 ms/p95 and 95%-of-frames targets are not met. The 99% ≤33.3 ms, 300k visible-triangle and 15 MiB initial-transfer targets are met under these conditions. Minimum-laptop/integrated-GPU and hosted performance remain unverified. Exact durations are retained; the repeat is not relabeled as a full ten minutes.

## Room disposal and restart memory

Six complete pillar victories on **one page without reload** exercised **30 room changes/five New run restarts**, 36 entry samples and explicit Chrome GC before heap readings. [Raw samples](../.npm-cache/m4-memory.json) group by actual rendered `roomId`; a helper's separate `room` label can precede scene replacement during saving and is not used for comparison.

Meshes remain constant for repeated room entries: **227 / 261 / 267 / 297 / 300 / 175**; textures remain **one**. Shared material caches warm to a finite **59 / 65 / 65 / 71 / 71 / 47** by room. Coach-entry JS heap about **15.45 →16.42 MiB**, last entries about 16.46/16.42 MiB; busiest room about 18.42→20.07 MiB. Room resources reset without increasing mesh/texture counts over this exercise. This does **not** prove absence of all heap leaks or cover longer production sessions; runtime/CDP/cache warming remains visible.

## Visual and animation evidence

The [local visual gallery](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/contact.html) and [capture metadata](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/evidence.json) contain **98 full screenshots and 98 actor crops** from installed Chrome: eight facings × three weapons × two resolutions, pillar preparation/active/recovery at eight facings/both resolutions, plus rifle reload captures. Escape freezes the 48 pillar phase and two reload captures; the 48 ready frames are live. Only menu-overlay visibility is hidden for unobscured paused captures. Camera, poses and simulation are unmodified.

Actual visual inspection covered **92 PNGs**: 48 pillar phase crops, 32 glove/rifle ready crops, six full frames and six final B01 room screenshots. Continuous two-hand contact and whole-body pillar preparation/contact/recovery are visible; weapons/scarf are identifiable across eight facings. Maximum actual pillar hand-to-grip error across the 48 phase samples: **2.43×10⁻⁷ m** (tolerance 10⁻⁵ m). Warm-up/bag-hall/ring themes and layouts differ, three boxer silhouettes are distinct and Coach is larger. Room-entry shots show locked exits; actual UI tests exercise opening/use. Face detail is small at 720p; white ready-range cue has lower contrast on a light mat than gold active cue. Final aesthetic acceptance is not inferred from technical passage.

Actual recordings for owner review:

- 1280×720: [gloves](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/chrome-1280x720-gloves-actual.webm), [rifle](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/chrome-1280x720-rifle-actual.webm), [pillar](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/chrome-1280x720-pillar-actual.webm).
- 1920×1080: [gloves](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/chrome-1920x1080-gloves-actual.webm), [rifle](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/chrome-1920x1080-rifle-actual.webm), [pillar](../.npm-cache/m4-visual/2026-10-10T15-11-08-630Z/chrome-1920x1080-pillar-actual.webm).
- [Six actual B01 pillar runs](../.npm-cache/m4-route-video/page@d353c2fe5237c94285eb539cefa1762e.webm), with six room PNGs in the same directory.

Recordings were generated; documented inspection covers PNGs/runtime measurements, not a claim that every video was watched. Reduced-effects preferences/threat mesh preservation were checked in UI/source; grayscale and separate visual reduced-effects comparison remain owner scenarios. [Art 2.4](ART_DESIGN_TEMPLATE.md#24-authorized-milestone-4-native-3d-and-sfx) documents native geometry/material/rig/noise reproduction. Captures/logs, dependencies and build outputs are ignored and excluded from Git; these links work in this workspace, not promised on a fresh clone.

## Audio and handoff limits

WebAudio checks cover deliberate unlock, blocked-context recovery, mixer/preferences, voice limits, warning priority, mute and gameplay suspension/drop of old events. They do not establish perceived loudness/pleasantness or speaker/headphone quality. No oscillators, musical clips, melodies, voice files or ambient playback are present; original filtered-noise envelopes use softened transients.

Local production preview: `http://127.0.0.1:4173/`. Select **Boxing gym · M4**, a weapon and Start. Clear the first room of a level, approach its open exit and use remapped **Interact** (default E). Choose one upgrade after levels 1/2; Coach ends level 3. M3 and its resume actions are separately labeled. [README](../README.md#run-locally) records repeatable startup.

Implementation commit **`019f3f07b8ee176dbb90d3381f859301e28e34f9`** was pushed to `origin/Dev`. Remote refs and [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2) metadata confirmed the SHA, unchanged Main `35593d6ee97ddccbb6ae41c2009bf4599ac1d5fc`, default/local Dev and open/unmerged/mergeable review state. The PR title/body now describe final M4 scope and actual results. [Collaboration](COLLABORATION.md) records this fresh handoff separately from historical access observations; the documentation-only follow-up changes no validated source/tests. No Main merge, public deployment, additional biomes/campaign content or paid services were performed.

Physical DualShock 4/Xbox One/Series USB/Bluetooth tests are unavailable to the agent and remain **not tested on M4**. Simulated browser gamepad tests must be labeled separately. Headless WebAudio checks verify graph/events/gates, not human perception of speaker loudness. Use [manual M4 scenarios](MILESTONE_4_MANUAL_TESTS.md) for owner review.
