# Milestone 2 — input and combat validation

Implementation and validation pass, 2026-10-09 (Europe/Warsaw). This report concerns the local input/combat foundation, not the complete game. The [GDD milestone 2 rules](GAME_DESIGN_TEMPLATE.md#64-authorized-milestone-2-combat-foundation) own balance and fixture definitions. [AGENTS](../AGENTS.md) records authorization; [milestone 1 evidence](MILESTONE_1_VALIDATION.md) remains historical.

## Playable scope

- One existing procedural gym and original fictional scarf-wearing hero.
- Preparation selects one of exactly three weapons and dummy practice or the fixed three-Jabber encounter. No in-combat equipment switching.
- Grot hitscan, 20-round magazine, manual/automatic reload; accepted four-punch gloves; slow multi-target pillar sweep. Range, target, cover, attack timing, displacement, and cosmetic effects follow simulation.
- Boxer approach/cover navigation, windup/active/recovery, health, poise/stagger, knockback, defeat, and collision removal; player health, dash protection, post-hit protection, completion/defeat/retry. A marked preparation station supports Interact.
- Semantic gameplay/menu/rebinding actions; keyboard/mouse and controller profiles, capture/preview/conflicts, protected menu bindings, calibration, prompt families, active-controller selection, guided mapping, and recovery.
- Versioned browser-local controls/settings persistence, previous-valid record, corrupt-data recovery, and session-only fallback. No run saves.
- Original procedural weapon/enemy poses, telegraphs, target/range indicators, tracers, and health/status UI. Silent: no music or production audio. No production art acceptance is implied.

Restarting a paused round or returning to preparation requires confirmation and discards current health/ammunition/damage/session state. Settings survive. Defeat/completion permits retry without a second discard confirmation. R defaults to rifle reload; restart is a menu action, default F5.

## Owner observations versus hardware evidence

The owner accepted the refined movement, glove reach, and punch cadence before authorizing this milestone. The specifically identified physical test remains the earlier DualShock 4 over USB in Chrome. Exact Chrome version, device revision/firmware, and a comprehensive per-action checklist were not supplied. Acceptance does not establish a new physical milestone 2 test or approval of visual alternatives.

Milestone 2 physical DualShock USB, DualShock Bluetooth, Xbox One/Series USB/Bluetooth, multiple real devices, sleep/reconnect, non-US physical keyboards, and other browser/OS combinations remain pending. Automated controller fixtures below are simulations, not hardware qualifications. Verify Bluetooth capability for each actual Xbox One revision.

## Reproduce

From the repository root in Windows PowerShell:

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

Dependencies and lockfile are unchanged from milestone 1; its successful clean-install evidence carries forward and installed packages were reused. Use `npm.cmd ci` on a fresh checkout or if dependencies change. No new tool/browser/dependency installation was needed for this milestone.

Browser checks use installed Chrome and Edge against the actual production build at `http://127.0.0.1:4173/`. The runner can start preview, or reuse a separately started `npm.cmd run preview`. `npm.cmd run test:browser -- --project=chrome` selects one browser; `--project=edge` selects the other. Generated reports/screenshots/traces stay in ignored `playwright-report/` and `test-results/`.

For ordinary play, run `npm.cmd run dev` and open `http://127.0.0.1:5173/`; reuse an existing server. See [README controls](../README.md#default-controls). Keep the server running and stop a server you started with Ctrl+C when finished.

## Automated evidence

All 24 browser scenarios are verified across the final full run and focused follow-up. The full production-browser run passed 23 of 24; one synthetic controller fixture missed a polling frame during an Edge render stall. After synchronizing that fixture, its Chrome and Edge checks both passed (2/2), with all assertions retained and no production input changes. Type checking passed again after the test edit. Earlier iteration failures were investigated rather than hidden by automatic retries.

| Check | Result / evidence boundary |
| --- | --- |
| Type checking and production build | Passed (`tsc --noEmit`, Vite production build); dependencies/lockfile unchanged |
| Simulation/input/settings unit suite | 56 passed, 0 failed: 40 simulation/combat and 16 input/settings checks |
| Chrome browser suite | 12 passed on the final production build in installed Chrome 153.0.8010.53 |
| Edge browser suite | 11/12 passed in the full run on Edge 154.0.4258.62; the remaining controller scenario passed in the focused follow-up after fixture synchronization |
| Development smoke | Existing local server opened preparation/settings and the pillar encounter in actual Chrome; no uncaught page or console errors during that smoke |
| Visual inspection | Actual rendered preparation/settings/combat captures inspected, including sequential pillar startup/active/recovery, rifle reload progression, and boxer preparation/active/recovery. Health bars are horizontal; settings fit 960×720 and 1280×720 with internal scrolling and reachable recovery controls. No page errors during the phase-capture session |

Coverage includes original movement/diagonal/analog/glove/dash regressions, weapon/reload/cancellation behavior, exact range/cover boundaries, nearest-target versus cleave, fractional damage, enemy phases/damage protection/visibility/stagger/knockback/navigation/outcomes, capture intent/release/neutral gates, binding transactions, required controls, profiles/storage, calibration, menu contexts, and controller lifecycle.

The navigation review found a boxer freeze when a legal player position near cover fell inside the expanded pathfinding margin. Reachable approach-point projection and collision-respecting escape fixed it; regression tests exercise all three gym obstacles, a room boundary, and a displaced boxer. Enemy phase snapshots align with damage samples, and rifle range endpoints include valid targets while cover wins ties.

Browser scenarios use real keyboard/mouse events and the actual UI for weapon/round selection, movement, aim, repeated attacks, reload, collision, pause/restart/confirmation, resizing, encounter defeat/completion, bindings, swaps, recovery, profiles/calibration, storage failures, and simulated standard/nonstandard controllers. Synthetic focus loss is distinct from real OS sleep or tab switching. Controller fixtures override the Gamepad API; they do not establish USB/Bluetooth behavior.

Test-iteration findings: movement assertions now measure only the interval with both diagonal keys held; toggle-resume checks await each menu transition; a brief attack is inspected before releasing the synthetic button. An earlier Edge storage check encountered a 98-second browser action-stability stall; its assertions passed, a focused unchanged rerun passed, and the final full run passed that scenario. The final controller failure likewise showed no simulation progress between the 80 ms press and release, so the fixture now holds each state across actual animation/input-poll frames. No production input change or timeout increase was used to conceal those test timing issues.

## Measured weapon benchmark

Measured through actual renderer-independent combat simulation over ticks `[0, 3600)` (60 seconds at 60 Hz). Same stationary, effectively unlimited-health, zero-defense dummy; no knockback, assistance, upgrades, invulnerability, misses, or player movement/cancellation. Complete attack/recovery/reload cycles are included. Absolute floating-point tolerance: `1e-8` damage.

| Weapon | Complete cycles | Hits | Damage | Sustained DPS |
| --- | --- | --- | --- | --- |
| Gloves | 72 four-strike combos | 288 | 7,200 | 120 |
| Pillar | 40 sweeps | 40 | 7,200 | 120 |
| Rifle | 15 magazines including reloads | 300 | 6,480 | 108 |

These measurements confirm the authorized prototype relationship, not final production balance. Rifle firing-only damage rate is 144 DPS before reload; its sustained cycle rate is 108. Pillar raw single-target burst is 180 per swing; gloves deliver 20/20/30/30 over one combo. Actual damage is capped by remaining target health, so hitting three 100-health Jabbers with the pillar produces at most 300 aggregate actual damage, not 540. Crowd output and overkill are distinct from the single-target benchmark; safe uptime and encounter effectiveness need manual comparison.

## Performance and payload

The final production-browser run sampled about five seconds of idle dummy practice after a fresh session reset. Installed browsers ran headlessly, one worker, on Windows NT 10.0 reported by the browser, using WebGL 2 / ANGLE Direct3D 11 and the detected NVIDIA GeForce GTX 1650 Ti with Max-Q Design. Viewport: 1440×900; canvas: 1440×724; device pixel ratio: 1. The scene reported 131 meshes and 75 draw calls.

| Browser | Version | Samples | Engine FPS | Mean sampled frame | 95th percentile |
| --- | --- | --- | --- | --- | --- |
| Chrome | 153.0.8010.53 | 302 | 59.99 | 16.632 ms | 16.8 ms |
| Edge | 154.0.4258.62 | 302 | 59.95 | 16.633 ms | 16.8 ms |

These are short, small-scene observations, not minimum-hardware or full-game performance results. Frame sampling records active-play intervals below 200 ms; longer stalls and paused periods are excluded, so this is not a complete stutter/latency metric. CPU, RAM, power/thermal conditions, and physical display refresh were not recorded. Long encounters, high DPI, loading, and long-session memory still need dedicated profiling.

Final build entry JavaScript: 1,289.81 kB minified / 318.57 kB gzip; CSS: 12.71 / 3.54 kB. Additional engine/shader chunks are emitted, so entry size is not total transferred payload. Local preview measurements do not establish hosted download speed or compression behavior.

The engine-containing entry chunk still produces Vite's large-chunk advisory. This is a build-size advisory, not a functional failure; payload/load-time optimization is uncompleted. There is no runtime CDN or downloaded production artwork.

## Manual retest and limits

1. In Chrome, select each weapon in dummy practice. Check retained movement/glove feel, rifle aim/reload, pillar windup/reach, and weapon-specific feedback.
2. Play the boxer encounter with each weapon. Check threat readability, dodging, cover approaches, stagger/knockback, defeat, completion, and retry.
3. Remap an attack, movement direction, and menu action; try a conflict/swap, cancel capture, restore defaults, recover the previous profile, and reload the browser.
4. Repeat with the available DualShock 4 over USB. Check analog movement/aim, menus/calibration, disconnect/reconnect, and no unintended held attack after resume. Record browser version/device details where known.
5. Report readability and feel separately from the unresolved [visual-review choices](ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1).

Current limitations: silent procedural placeholders; one bounded encounter/archetype; no full levels, bosses, rewards, upgrades, run saves, or public deployment. Settings are local to one browser/origin and can be cleared by the browser. Some OS/browser/system controls are unavailable. Guided mapping applies each confirmed step; cancel discards only the unapplied step, so duplicate a profile before an experimental remap. Final production balance, broad accessibility, minimum-hardware/high-DPI performance, long-session memory, and rights/provenance remain unestablished.

After owner review, milestone 3 would add the run/content foundation (route data, upgrades/rewards, versioned safe checkpoints, transitions/results). That later implementation and any production visual work require a separate request. PR #2 must remain unmerged with Dev active/default under current authorization.
