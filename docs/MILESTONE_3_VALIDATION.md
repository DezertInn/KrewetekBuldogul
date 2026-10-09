# Milestone 3 validation

Date: 2026-10-10 (Europe/Warsaw). Status: **implementation verified and published on Dev for review**. This report records current evidence independently of historical [milestone 1](MILESTONE_1_VALIDATION.md) and [milestone 2](MILESTONE_2_VALIDATION.md) results. Authorization and implementation descriptions are not passed checks.

## Authorized scope and boundaries

The [GDD milestone 3 override](GAME_DESIGN_TEMPLATE.md#65-authorized-milestone-3-short-run-override) authorizes a three-stage gym test route, two stable choices of one from three offers, seven adjustable effects, safe local checkpoints/carry, run results/restart, and procedural heavy pillar animation. The production nine-level campaign/bosses and production art/audio are outside this change; the game remains silent. Baseline accepted glove feel and 120/120/108 glove/pillar/rifle benchmark must remain intact without upgrades.

The user reports an earlier Vercel publication and successful current gameplay. No URL, deployed revision, or hosting configuration was supplied. Local browser checks below must not be reported as hosted Vercel tests. Existing physical DualShock 4 USB/Chrome evidence concerns an earlier build; no fresh physical-controller result is inferred.

## Environment and automated checks

| Check | Result / conditions |
| --- | --- |
| Working branch and initial/final file scope | Initial branch `Dev`, clean at `d82bbb1`. Scope/privacy review passed: only authorized M3 implementation/tests/project documents; no generated artifacts, secrets, private account paths or unrelated changes |
| Node/npm and unchanged dependencies | Portable Node 24.21.0 / npm 11.19.0 under ignored `.npm-cache/runtime/node-v24.21.0-win-x64/`; installed locked dependencies reused; dependency declarations and lockfile unchanged |
| Type check | Passed `npm.cmd run typecheck` and final build's `tsc --noEmit` |
| Simulation/combat/input/settings regressions | All 92 unit tests passed, zero skipped (3.457 s); includes unchanged baseline tests and measured complete-cycle 120/120/108 DPS |
| Seven upgrade behavior and normalization tests | 11 new tests passed: modifiers, all weapons, positive-health-loss reset, stationary displacement, range/cover, dash triggers, weighted primary Impact/overkill/AOE/fraction/cap, action-lock carry |
| Run content/lifecycle/seed/reward/reset tests | 7 new tests passed: content/spawns, three weapons, exactly two offers, objective gates, stable RNG, carry, defeat/abandonment, validation |
| Storage/version/recovery/revision/lease/settlement tests | 15 new tests passed: atomic records, previous recovery, unknown-version preservation including actual heartbeat/close, tombstones, concurrent revisions, takeover, denied writes, reload/duplicate identity, passive empty tabs and lease release |
| Pillar continuity/articulated-grip tests | 3 new tests passed: all phase boundaries, meaningful body/weapon excursion, fixed-length two-handed reach across 404 samples |
| Production build | Passed `npm.cmd run build`; main JS 1,329.72 kB / 330.82 kB gzip; CSS 13.50 kB / 3.72 kB gzip. Vite's >500 kB engine-chunk advisory remains; not a failed build |
| Actual installed Chrome browser checks | 21/21 passed on Chrome 154.0.8037.98, headless Windows / DPR 1 / default 1440×900 viewport |
| Actual installed Edge browser checks | 21/21 passed on Edge 155.0.4283.45, same conditions. Final full suite: 42/42 passed in 3.7 minutes |
| Relative links, requirement coverage, and cross-document consistency | Scope/requirements and cross-document review passed; strict UTF-8 and local file/heading links across 10 Markdown files passed; historical M1/M2 validation files unchanged |

## Run, checkpoint, and input evidence

| Scenario | Result / evidence |
| --- | --- |
| Full three-stage run and results with gloves, pillar, and rifle | Passed actual UI/pointer-combat trials for all three weapons in both browsers; exactly two reward records, victory summary and new run |
| Carried health/ammunition/effects and both stable reward choices | Browser trials verify health carry and unique ownership across both offers. Unit tests verify exact ammunition, barrier, fractional Impact and remaining effect/action/protection durations |
| Pending-offer reload without reroll/duplicate ownership | Passed actual reload + Resume saved run with exact checkpoint/offer equality in six browser weapon trials; first choice also uses keyboard confirmation |
| Combat close/reload returns to safe entry with preserved timers/Impact | Browser reload restores stage-zero saved entry with fresh ownership/no held attacks. Precise partially depleted carry and safe-ready action lock are covered by unit tests; no mid-swing replay is promised |
| Victory/defeat/abandonment settle once; new run resets effects and preserves settings | Run/storage unit tests cover all outcomes, idempotence and tombstones. Actual run UI covers victory and confirmed abandonment/reset with preserved remapping; existing boxer UI checks defeat/retry. M3-specific defeat is unit-verified, not a separate browser run |
| Corrupt current record/valid previous recovery | Unit tests passed; invalid current recovers valid previous; settled previous is rejected |
| Unsupported schema/content/database preservation | Unit tests passed for journal/schema/content, including incompatible previous records and close/heartbeat preservation. IndexedDB VersionError has an explicit preserved/unsupported path; no separate actual future-database browser fixture |
| Unavailable/write/quota failure gives honest temporary play | Injected failed-backend tests passed and preserved the last atomic journal. Both browsers pass actual denied-IndexedDB temporary play/status; not a physical disk-quota exhaustion test |
| Second-tab conflict and explicit takeover/revision checks | Both browsers pass actual two-tab takeover, stale-write rejection/temporary play and copied-sessionStorage identity isolation. Unit tests verify concurrent revisions, empty-store creation race and settlement lease release |
| Remapped keyboard/pointer/simulated controller reward/result navigation | Both browsers pass pointer/keyboard rewards, remapped keyboard confirmation/back and remapped simulated controller navigation/confirmation. Abandonment keeps both profiles through reload; existing simulated result/menu checks remain passing |
| Hidden tab/blur/settings/controller disconnect pause and release gates | Existing input/browser safety regression checks pass, including synthetic blur and simulated disconnect/reconnect. Settings/reward freeze and held-input release gates pass. Native OS focus/background-tab finisher behavior is gated in code, not claimed as a fresh physical test |

## Heavy pillar presentation evidence

| Scenario | Result / evidence |
| --- | --- |
| Ready, preparation, active contact, follow-through, and recovery frame sequence | Actual captured phase sequences inspected, with additional late-active contacts; browser ready/miss/cancel/repetition and terminal phase traces passed |
| Two-handed contact using actual rendered hand/grip world coordinates | Passed 96 actual-browser phase captures, max endpoint-to-grip error 1.80×10⁻⁷ m |
| Eight facings at 1280×720 and 1920×1080 | Passed Chrome + Edge: 96 startup/active/recovery frames; 16 extra late-active Chrome frames. Actual pointer facing dot ≥0.9999999999996774 |
| Miss, dummy hit, cleave, repeated swings, walking, and dash cancellation | Both browsers pass actual moving miss, frozen startup, startup/recovery dash cancellation, three real dummy hits (540 damage), distinct two-handed grip and existing boxer cleave/completion |
| Last-enemy terminal swing without additional combat/reward progression | Both final-build browsers pass real stage-one terminal audit: active/recovery stays visible, combat/run time/damage/hits/outcome remain fixed, reward is already settled, invisible Enter cannot choose; same offer appears at ready |
| Paused/hidden/unfocused/settings/confirmation cosmetic clock freeze | Actual pause freezes pose/time in 96 visual captures; final browser tests freeze terminal pose/time in settings and discard confirmation. Hidden/unfocused native-document conditions are code-reviewed, with no fresh physical/native finisher claim |
| Baseline timing/damage/range/angle/DPS/cancellation unchanged by animation | Unit tests passed: 33/9/48 ticks, 180 base damage, 2.6 m / 100° envelope, 0.35 movement, uncancelable active and original-end lock; actual 60-second no-upgrade pillar damage 7,200 / 120 DPS |

## Measured performance and limitations

The unchanged M3 renderer was observed before the final tab-identity/menu-visibility fixes. Each independent idle dummy sample used the installed browser headlessly, default GPU settings, DPR 1, about 5 seconds / 301 requestAnimationFrame samples. Detected renderer: NVIDIA GeForce RTX 4070 Ti SUPER through ANGLE Direct3D11, WebGL 2.0. Arena rendering excludes header/footer; 151 meshes and 85 draw calls in these pillar idle scenes.

| Browser | Viewport / rendered arena | Mean frame / p95 | Observed game FPS |
| --- | --- | --- | --- |
| Chrome 154.0.8037.98 | 1280×720 / 1280×544 | 16.642 / 17.0 ms | 60.012 |
| Chrome 154.0.8037.98 | 1920×1080 / 1920×904 | 16.642 / 16.8 ms | 60.000 |
| Edge 155.0.4283.45 | 1280×720 / 1280×544 | 16.645 / 17.0 ms | 59.964 |
| Edge 155.0.4283.45 | 1920×1080 / 1920×904 | 16.644 / 16.8 ms | 60.036 |

The ignored local phase artifacts are `.npm-cache/visual-review/2026-10-09T22-23-31-897Z/contact.html` and `evidence.json`, with additional `late-active/` contact/evidence files. Frames are actual browser screenshots/clips; each phase comes from a separate real attack paused by Escape. Only the DOM overlay was temporarily hidden for clean audit captures. JSON retains actual poses, world hand/grip coordinates, state, terminal traces and conditions. Four pre-visibility-fix encounter traces observed active → recovery → ready for 79–80 frames at fixed combat time 2.0667 s, 300 damage and 3 hits. This establishes rendering/combat invariants; the final browser finisher test separately checks the real menu behavior.

Final-build browser idle measurements at viewport 1440×900 / arena 1440×724, DPR 1, the same detected renderer, 151 meshes and 75 glove-scene draw calls: Chrome 60.000 FPS, mean 16.649 ms / p95 16.9 ms / 301 samples; Edge 59.940 FPS, mean 16.649 ms / p95 16.9 ms / 301 samples. These were separate 5-second samples after a clean dummy reset.

PNG inspection shows visible body twist, backswing, contact and recovery, intact two-handed contact and feet; some rear facings naturally occlude part of the weapon behind the torso. Late-active images clarify contact beyond the earlier active sample. Procedural models remain placeholders requiring the owner's feel/art review.

These short idle samples do not validate the proposed 10-minute stress/minimum-hardware/loading/memory budgets. Physical controllers, other OS/browser combinations, hosted Vercel, production campaign/art/audio, and rights clearance remain unverified. Generated artifacts stay local and are excluded from Git.

## Issues caught and resolved

Browser trials exposed two real persistence defects: reload could inherit an expired document's live lease, and empty-store loads could lock another practice/settings tab. Stable tab IDs protected by Web Locks resolve the first; passive empty-store reads, atomic first-save acquisition and settlement lease release resolve the second. Final 42-case browser checks passed after both fixes. Presentation review also found that the opaque result/reward card covered the terminal swing; gameplay/checkpoint settlement remains immediate while the card waits for visible cosmetic recovery. The final browser audits verify this behavior without hiding the DOM overlay themselves.

## Repository handoff

Validated implementation commit: [`514517841dab72f85e6b2007ac2c147c28b84f84`](https://github.com/DezertInn/KrewetekBuldogul/commit/514517841dab72f85e6b2007ac2c147c28b84f84), **Implement milestone 3 runs, upgrades and heavy pillar animation**. Push `d82bbb1..5145178 Dev -> Dev` succeeded; both GitHub PR metadata and `git ls-remote` confirmed the published SHA.

Existing [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2), `Dev` → `Main`, was updated to the complete M3 behavior and validation, verified open/unmerged. Remote `Main` remains `35593d6ee97ddccbb6ae41c2009bf4599ac1d5fc`; remote symbolic HEAD/default and local active branch remain `Dev`. No merge, new permanent branch, or manual hosting publication was performed.

The implementation commit contains 24 authorized source/test/document files. Local status was clean after its commit/push; generated builds, browser reports, phase artifacts and portable tooling stayed ignored. This handoff record is a subsequent documentation-only commit and does not change the validated implementation. Hosted Vercel M3 remains unverified; any project-specific Git auto-deployment has not been inspected.
