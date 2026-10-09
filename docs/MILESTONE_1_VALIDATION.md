# Milestone 1 — validation and limitations

Validated 2026-10-09 (Europe/Warsaw). This report concerns one technical prototype, not the complete game. The user's milestone 1 authorization is recorded in [AGENTS.md](../AGENTS.md) and the [decision register](DECISIONS_AND_OPEN_QUESTIONS.md).

## Playable scope

- One original procedural boxing-gym room, low boundaries, three collision obstacles, fixed orthographic camera at 45° yaw / 35° downward pitch, and responsive framing.
- One animated placeholder character with teal/yellow sportswear, red-and-white scarf, and boxing gloves (`weapon_02`). No production assets, recognizable real-person likeness, external asset downloads, or audio.
- Camera-relative keyboard and analog movement, independent pointer/right-stick/arrow aiming, dash, planar collision, and a resettable 1,000-health dummy.
- Four glove strikes using the GDD's adjustable startup/active/recovery timings and damage. Each strike damages the target at most once; range, facing, and solid cover constrain hits. Defeating the dummy changes its pose; restart restores it.
- Start, pause, explicit resume, and restart with keyboard, mouse, and standard-mapped gamepad actions. Focus/visibility/disconnect safety discards held and buffered inputs; reconnecting does not resume play automatically.
- Binding data and device-aware prompts are separate from rules. Full rebinding/profile UI and the other two weapons remain milestone 2.

The GDD remains authoritative for proposed tuning. The training room's layout, 1,000-health dummy, full-room framing, and `R` restart shortcut are prototype fixtures, not new production content or approved final balance. Dash invulnerability is represented in state and presentation; there are no damaging enemies in this slice, so combat survivability is not validated.

## Reproduce

From the repository root in Windows PowerShell:

```powershell
npm.cmd ci
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run preview
```

The last command stays running at `http://127.0.0.1:4173/`. In a second terminal, run:

```powershell
npm.cmd run test:browser
```

The browser configuration uses installed **Google Chrome** and **Microsoft Edge** channels. Both must be installed to run the entire matrix; to run one installed browser use `npm.cmd run test:browser -- --project=chrome` or `--project=edge`. No browser was downloaded for this validation. The runner can start preview itself when one is not already running; using a separate preview terminal avoided child-server shutdown delays in the agent's Windows sandbox. Stop preview with Ctrl+C when finished.

For ordinary play and editing use `npm.cmd run dev`, then open `http://127.0.0.1:5173/`. Exact controls are in [README](../README.md#prototype-controls). Use `npm.cmd` when PowerShell blocks `npm.ps1`; changing system execution policy is unnecessary.

## Toolchain and checks

| Component | Validated version |
| --- | --- |
| Node.js | 24.21.0 LTS, Windows x64 |
| npm | 11.19.0 |
| Babylon.js core | 9.30.0 |
| TypeScript | 7.0.2 |
| Vite | 8.3.4 |
| Playwright test | 1.64.0 |
| tsx | 4.23.15 |
| Node type definitions | 24.19.1 |

Direct versions are exact in [package.json](../package.json); transitive versions and integrity records are in the committed [lockfile](../package-lock.json).

| Check | Result and limits |
| --- | --- |
| Clean lockfile install, `npm.cmd ci` | Passed: 26 packages installed; npm reported zero known vulnerabilities at this check. Lockfile installation completed without approving additional package lifecycle scripts. This is not a security guarantee |
| `npm.cmd run typecheck` | Passed, including application and tests |
| `npm.cmd test` | 18 tests passed: nine input tests and nine simulation tests. The equivalent `node --import tsx --test tests/*.test.ts` ran outside the agent sandbox because the sandbox's Windows user lookup failed in tsx; this was an environment restriction, not a game-test failure |
| `npm.cmd run build` | Passed. Vite emits an advisory for the large engine-containing entry chunk; see payload note below |
| Chrome browser checks | Two tests passed against the actual production build with WebGL rendering |
| Edge browser checks | Two tests passed against the actual production build with WebGL rendering |
| Development-server smoke | `npm.cmd run dev` served `http://127.0.0.1:5173/`; Chrome entered training through the Begin training button, simulation advanced beyond 0.5 seconds, and no uncaught page errors were observed |
| Runtime / asset checks | No uncaught page errors, console errors, or HTTP 4xx/5xx asset responses during the gameplay smoke tests |
| Visual inspection | Welcome screen and gameplay screenshots inspected; room, scarf, player, target, controls and HUD readable. Resize captures included 960×720, 1280×720, 1440×900, and 1920×1080 |

Unit checks cover normalized diagonals, analog speed/deadzones, input edges and labels, pause/reconnect gates, quick menu taps, startup timing, one hit per strike, 100 damage per complete glove sequence, combo reset, reach/facing/cover, dash distance/cooldown/cancellation, thin-cover and wall collision, escape from a dash ending inside the dummy, buffered-action clearing, and fresh restart state.

Browser checks drive real keyboard/mouse events to exercise movement, pointer aim, repeated attacks and target health, dash, wall/bench collision, keyboard start/pause/resume/restart, menu focus, resizing, and synthetic focus-loss recovery. The controller scenario replaces `navigator.getGamepads()` with a **simulated standard controller** and checks analog movement, controller menus/restart, trigger input, held-attack suppression, and disconnect/reconnect. Unit tests additionally cover standard DualShock identification and unsupported mappings. These are not physical USB/Bluetooth tests. Real OS sleep/wake and tab switching remain manual checks.

Generated screenshots, traces, and HTML results stay in ignored `test-results/` and `playwright-report/`. They are regenerated by the browser tests, not committed as game assets.

## Initial performance observation

Measured through browser requestAnimationFrame intervals and Babylon engine metrics, after restart with one idle character and one dummy. Each sample covers approximately five seconds / 300 frames. This is a small-scene observation, not a stress test, a minimum-hardware qualification, or proof of full-game performance.

Conditions: Windows build `10.0.26200.0`; installed browsers launched headlessly through Playwright; viewport 1440×900, rendered canvas 1440×724, device pixel ratio 1; WebGL 2 via ANGLE Direct3D11; reported GPU **NVIDIA GeForce GTX 1650 Ti with Max-Q Design**. CPU, RAM, power mode, thermal state, and physical display refresh were not recorded. This does not satisfy the TDD's proposed integrated-GPU baseline qualification.

| Browser | Version | Mean frame interval | 95th percentile interval | Babylon FPS |
| --- | --- | --- | --- | --- |
| Chrome | 153.0.8010.53 | 16.65 ms | 16.90 ms | 60.02 |
| Edge | 154.0.4258.62 | 16.67 ms | 17.00 ms | 60.04 |

The observed idle scene contains 108 meshes and 71 draw calls. Frame intervals include browser scheduling and are not isolated CPU/GPU render timings. Headless automation does not establish input-to-photon latency or subjective controller feel. Production density, lower-end hardware, long sessions, high-DPI displays, load time on a slow connection, and memory growth still need measurement.

The production entry JavaScript is approximately **1.23 MB uncompressed / 301 kB gzip** in Vite's report, plus CSS and separate shader/optional engine chunks. This is build output size, not a measured network transfer. There is no runtime CDN or fetched production artwork. Engine import/payload reduction can be considered before distribution; the chunk advisory remains visible rather than being suppressed.

## Remaining manual checks and scope limits

| Hardware / environment | Status |
| --- | --- |
| DualShock 4 over USB and Bluetooth | Not physically tested; record device revision, firmware, browser and transport |
| Xbox One over USB and compatible Bluetooth hardware | Not physically tested; verify the actual revision has Bluetooth capability |
| Xbox Series over USB and Bluetooth | Not physically tested; record firmware and adapter |
| Multiple physical controllers, sleep/reconnect, non-US keyboard layouts | Pending |
| Firefox, other desktop operating systems, high-DPI hardware | Not validated in this milestone |

Unknown gamepad mappings are reported as unsupported, with keyboard/mouse still available. There is no custom mapping UI yet. The first supported connected controller is used; profile selection and full remapping belong to the next milestone.

There are no enemy encounters, incoming player damage, other weapons, nine-level route, upgrades, run persistence, production art, sound effects, or music. Closing/reloading discards training-session state. Public deployment and merging into `Main` are outside this milestone authorization. Rights/licensing and production-design questions remain in the [decision register](DECISIONS_AND_OPEN_QUESTIONS.md).

Recommended next milestone: review prototype feel, complete available physical-controller checks, then explicitly authorize milestone 2 for complete gameplay/menu rebinding and the full three-weapon foundation with comparable balance measurements.
