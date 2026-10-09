# KrewetekBuldogul

An action roguelite set in an exaggerated contemporary Polish urban world, with Hades as a high-level reference for responsive combat and readable isometric presentation.

[Public repository](https://github.com/DezertInn/KrewetekBuldogul) · [Open review PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2)

**Current phase: milestone 3 short-run foundation, authorized 2026-10-10.** The TypeScript + Babylon.js + Vite prototype adds a three-stage gym run, two choices of one upgrade from three offers, browser-local safe checkpoints, and run results to the existing dummy and boxer modes. A procedural two-handed pillar swing adds visible preparation, whole-body contact, and follow-through. Gameplay/menu controls remain customizable. See [milestone 3 validation](docs/MILESTONE_3_VALIDATION.md) for current checks and limitations; [milestone 2](docs/MILESTONE_2_VALIDATION.md) and [milestone 1](docs/MILESTONE_1_VALIDATION.md) preserve earlier evidence.

The three test stages reuse the gym and basic boxers; they do not implement the confirmed nine-level campaign. Bosses, additional biomes, production assets/audio, and paid services remain future work. The prototype is silent and uses procedural placeholders. The user reports that the earlier build is published on Vercel and works as expected; no deployment URL or hosted-build verification has been supplied for milestone 3.

## Run locally

Open this folder or `KrewetekBuldogul.code-workspace` in VS Code. The toolchain verified for milestone 1 was Node.js **24.21.0 LTS** and npm **11.19.0**; supported Node versions are declared in [package.json](package.json). From the repository root:

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/** in desktop Chrome or Edge. Choose a weapon and **Dummy practice**, **Boxer encounter**, or **Gym run · M3**, then start. All three weapons are available immediately; one stays equipped throughout a round or run. **Resume saved run** restores the last safe checkpoint when one is available. No separate engine editor or game account is required. Keep the terminal running; **Ctrl+C** stops the server.

Use `npm.cmd` in Windows PowerShell if its script policy blocks `npm.ps1`; no policy change is needed. Fully restart VS Code after installing Node if the terminal cannot find it. Other desktop systems use the usual `npm` command but remain later validation targets.

This workstation currently uses the portable Node.js runtime in ignored `.npm-cache/runtime/node-v24.21.0-win-x64/`; `node` is not on the default terminal path. To use that already-installed runtime in a PowerShell session:

```powershell
$taskNodeBin = Join-Path (Get-Location) '.npm-cache/runtime/node-v24.21.0-win-x64'
$env:Path = $taskNodeBin + ';' + $env:Path
npm.cmd run dev
```

That ignored runtime is local setup, not a checked-in project dependency; another checkout needs its own supported Node installation.

Run `npm.cmd ci` for the initial locked installation or when dependencies change; reuse the installed dependencies for ordinary development. Use `npm.cmd install` only for intentional dependency changes and review the lockfile.

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Local development at `http://127.0.0.1:5173/` |
| `npm.cmd run typecheck` | TypeScript validation |
| `npm.cmd test` | Simulation, upgrades, run/storage, animation, input, and settings tests |
| `npm.cmd run build` | Type check and production build into ignored `dist/` |
| `npm.cmd run preview` | Serve the existing build at `http://127.0.0.1:4173/` |
| `npm.cmd run test:browser` | Playwright checks in installed Chrome and Edge |

Build before previewing or running browser tests. Browser tests start or reuse local preview; select one browser with `npm.cmd run test:browser -- --project=chrome` or `--project=edge`. Local preview is not public deployment. Exact dependencies are pinned in [package.json](package.json) and [package-lock.json](package-lock.json).

## Play the prototype

- **Gloves:** quick four-strike combo, one nearest eligible target per strike.
- **Grot rifle:** ranged hitscan blocked by cover, 20-round magazine, manual or automatic reload, unlimited reserve ammunition.
- **Pillar:** slow committed sweep that can hit several eligible targets once each.
- **Dummy practice:** inspect reach, attack timing, damage totals, and reload behavior without enemy pressure.
- **Boxer encounter:** dodge visible preparations, counter during recovery, and defeat the fixed three-boxer group. Player defeat and encounter completion offer retry or return to preparation.
- **Gym run · M3:** clear three test formations while carrying health, ammunition, the selected weapon, and acquired effects forward. After stages one and two, choose one of three distinct unowned upgrades. The seven-entry prototype pool contains one effect from each confirmed source; exact IDs and adjustable values belong in [GDD section 6.5](docs/GAME_DESIGN_TEMPLATE.md#65-authorized-milestone-3-short-run-override).

Pause to resume, restart, change weapon/round, or open settings. Restarting or changing preparation during a live round requires confirmation; it clears combat state while preserving controls. Interact at the preparation station to open the paused session menu. Weapons cannot be switched during combat.

Run checkpoints are saved before encounters and with cleared-stage reward offers, then after committing a choice. Closing during combat restores the prior safe entry; pending offers keep the same choices. Run effects and remaining simulation-time durations survive these boundaries. Victory, defeat, or abandonment settles the run once; starting another run resets combat upgrades while preserving control profiles. Save status reports unavailable/incompatible storage and tab conflicts. Explicit takeover or temporary play keeps a second tab from silently overwriting the saved run. There is no mid-attack save, cloud synchronization, or automatic localhost-to-Vercel transfer.

The user accepted the refined movement, glove reach, and punch speed. [GDD section 6.4](docs/GAME_DESIGN_TEMPLATE.md#64-authorized-milestone-2-combat-foundation) preserves that feel and defines adjustable prototype sustained single-target targets of **120 / 120 / 108 DPS for gloves / pillar / rifle**. Actual measured results belong in the validation report; burst damage, pillar crowd damage, and practical encounter effectiveness are separate from this benchmark. Final production balance remains open.

## Default controls

These are editable defaults. In-game prompts update when bindings or prompt family change.

| Action | Keyboard / mouse | Standard controller: Xbox / PlayStation |
| --- | --- | --- |
| Move | W / A / S / D | Left stick |
| Aim | Pointer or arrow keys | Right stick; retain direction on release |
| Primary attack | Left mouse button | RT / R2 |
| Dash | Space | LT / L2 |
| Reload rifle | **R** | X / Square |
| Interact at preparation station | E | A / Cross |
| Pause | Escape | Menu / Options |
| Menu navigation / adjust | Arrows or W / A / S / D | D-pad or left stick |
| Confirm / apply | Enter or pointer activation | A / Cross |
| Back / cancel | Escape or right mouse button | B / Circle |
| Restart from pause/results | **F5**, or the menu action | Y / Triangle |
| Open controls from menus | F2, or **Controls and settings** | View / Share |
| Next / previous tab or focus | Tab / Shift+Tab | RB / LB, R1 / L1 |
| Menu scrolling | Page Up / Page Down or mouse wheel | Right stick vertical |

**R reloads; it never restarts the session.** Restart is a separate menu action. Browser-reserved shortcuts can depend on focus and browser behavior; visible menu controls remain available.

Focus loss, a hidden tab, or active-controller disconnect pauses play and clears actions. Resume deliberately after releasing held controls. Reconnection, changing bindings, and leaving settings must not trigger an attack. Press a controller button if the browser has not exposed the device yet.

## Customize and recover controls

Open **Controls and settings** from preparation or pause. Keyboard, pointer, and a configured controller can navigate the editor. Gameplay and menu actions share the semantic action catalog but have separate contexts.

1. Select a keyboard/mouse or controller profile; duplicate and rename it if desired. Select the active controller when several are connected.
2. Select an action, release the initiating input, then press the intended key/button, use a wheel direction, or deliberately move an axis and return it to neutral. Review the candidate before applying. **Keep existing alternatives** adds a binding rather than replacing the row.
3. Resolve same-context conflicts with **Replace**, **Swap**, or **Cancel**. Essential navigation/confirmation/back controls cannot be left unbound. Clear optional actions or restore individual action/profile defaults as needed.
4. During capture, tapping the current Back input can bind it; **hold Back for 1.2 seconds** to cancel. Pointer **Cancel** remains available. **Recover last working controls** restores the previous valid settings. Guided mapping saves each applied step; canceling it does not undo earlier applied steps.
5. Under **Calibration & behavior**, preview inner/outer dead zones, movement gain, stick aiming response, axis inversion, trigger/menu thresholds, repeat timing, pointer aiming, and attack hold/toggle. Save to apply or cancel the draft. Choose automatic, PlayStation, Xbox, or generic prompts.

Keyboard profiles explicitly choose **physical key position** or **character on the current layout**. Changing semantics converts the whole profile; verify the displayed bindings, especially when browser keyboard-layout access is unavailable and Latin fallback labels are used. Pointer aiming is absolute world targeting; aim sensitivity adjusts stick response.

Settings use validated version 2 browser-local records plus a last-known-good backup. Profile reset preserves unrelated preferences. Invalid/incompatible data recovers a usable profile; unavailable storage leaves session-only controls and reports that limitation. Settings and IndexedDB run checkpoints are separate records. Data belongs to this browser origin, so another browser, host, or port has separate settings and saves. Clearing browser storage can remove both. Dummy and individual boxer practice sessions are not saved.

Nonstandard controllers use neutral button/axis labels and require guided mapping or explicit **Use this profile for this controller** before gameplay. Only browser-exposed inputs can be captured; reserved system buttons, motion sensors, touchpad gestures, and rumble are not mapped. Left-click activates visible UI controls; a mapped left-click menu action works on the menu background. Verify an unfamiliar controller in preparation before combat.

The earlier user-reported physical result was **DualShock 4 over USB in Chrome**, without exact browser version, controller revision/firmware, or per-action checklist. Subsequent feel acceptance adds no hardware metadata. Milestone 2 needs fresh physical testing; DualShock Bluetooth and Xbox One/Series USB/Bluetooth remain unverified. Automated/simulated gamepad checks do not establish physical compatibility; see the [test matrix](docs/TECHNICAL_DESIGN.md#10-validation-and-compatibility-matrix).

## Confirmed full-game scope

The current prototype is a subset of these requirements:

- One charming, funny adult Polish football hooligan with bright clothing and a prominent red-and-white scarf; an original fictional identity without recognizable likeness to the loose Karol Nawrocki reference.
- Exactly three weapons: stylized FB MSBS Grot, boxing gloves, and Kolumna Zygmunta-inspired pillar; equal melee baseline sustained DPS and slightly lower rifle DPS.
- Three biomes × three levels: boxing gym, football stadium, presidential palace. Boxers and a gym miniboss; hooligans and a stadium miniboss; clerks/lobbyists and a president final boss. Major encounters occupy existing levels.
- Exactly seven power-up sources: Bóg, Ojczyzna, Orzeł Biały w koronie, Szacunek ulicy, Fryderyk Chopin, Maria Skłodowska-Curie, Mikołaj Kopernik.
- 3D isometric top-down presentation, original modern Polish urban art, pleasant cartoon effects, and no music, musical stingers, or Chopin recordings.
- Remappable keyboard/mouse and DualShock 4/Xbox controls; Windows desktop browsers first, other desktop systems later. USB/Bluetooth coverage needs exact-hardware validation. Prefer browser deployment and free tools with a code-first VS Code workflow.

Documents distinguish **Confirmed** requirements, authorized adjustable prototype defaults, **Proposed** production choices, and **TBD** decisions. New names/story, detailed production mechanics/assets, and final balance remain reviewable. Prototype results do not establish full-game performance or legal clearance.

## Documents and structure

| Document | Purpose |
| --- | --- |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Architecture, input/storage, scope boundaries, compatibility, future milestones |
| [Milestone 3 validation](docs/MILESTONE_3_VALIDATION.md) | Current run/save/upgrade/animation checks and limitations |
| [Milestone 3 manual tests](docs/MILESTONE_3_MANUAL_TESTS.md) | Polish scenarios with steps, expected results, priorities, and an execution log |
| [Milestone 2 validation](docs/MILESTONE_2_VALIDATION.md) | Historical input/combat checks, damage/performance, manual checklist |
| [Milestone 1 validation](docs/MILESTONE_1_VALIDATION.md) | Historical prototype/refinement evidence |
| [Game design](docs/GAME_DESIGN_TEMPLATE.md) | Authoritative gameplay, tuning, content IDs, and production proposals |
| [Art and audio design](docs/ART_DESIGN_TEMPLATE.md) | Presentation, open visual comparisons, procedural boundary, future assets/audio |
| [Decision register](docs/DECISIONS_AND_OPEN_QUESTIONS.md) | Requirements, authorizations, accepted feel, open production decisions |
| [Collaboration](docs/COLLABORATION.md) and [agent instructions](AGENTS.md) | Setup/access status, branch workflow, authorized work |

`src/game/` owns simulation/tuning and upgrade effects, `src/run/` owns the test route, run lifecycle, and checkpoint journal, `src/input/` owns actions/settings/editor, `src/presentation/` builds the procedural scene and pillar poses, and `src/main.ts` integrates sessions/HUD. `tests/` covers rules, run/storage, input/settings, animation, and browser behavior; `docs/` owns design and evidence. Original `_TEMPLATE.md` filenames remain for stable links. `assets/` is reserved for later authorized production work. Dependencies, builds, browser reports, credentials, and private local data are excluded from commits.

## Development and next steps

Work on exact-case **Dev**, the local working and GitHub default branch. **Main** holds reviewed baselines. Milestone 3 continues the validated commit/push and existing [PR #2](https://github.com/DezertInn/KrewetekBuldogul/pull/2) workflow; leave it unmerged and Dev active/default. Preserve unrelated work and coordinate file ownership; one agent manages the shared Git index and remote writes. [Collaboration status](docs/COLLABORATION.md) records the separately pending collaborator invitation.

Next, use the [manual test scenarios](docs/MILESTONE_3_MANUAL_TESTS.md) to validate the complete short run with each weapon, pending-offer reloads, safe-entry recovery, and the heavy pillar swing, then collect player feedback. Continue physical controller coverage and review the [proposed visual choices](docs/ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1). Milestone 4 would add the first complete biome and its miniboss with separately approved art/audio; production assets, paid services, publishing a new build, and merging Main still require their own authorization.

Project licensing and targeted production rights questions remain TBD; no third-party asset rights are granted by this repository.
