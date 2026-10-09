# KrewetekBuldogul

An action roguelite set in an exaggerated contemporary Polish urban world, using Hades as a reference for responsive combat, movement, encounters, and repeated runs.

[Public GitHub repository](https://github.com/DezertInn/KrewetekBuldogul)

**Current phase: milestone 1 technical prototype.** A procedural 3D gym, a scarf-wearing placeholder player, movement/aim/dash, boxing-glove attacks, and a resettable training dummy form the first playable slice. TypeScript, Babylon.js, and Vite are approved for this milestone. See the [validation report](docs/MILESTONE_1_VALIDATION.md) for checks, measured conditions, and remaining manual verification.

This slice has one weapon and one room. The full three-weapon game, nine levels, enemies, power-ups, saves, full control-rebinding UI, production art/audio, and public deployment remain future work. There is no music or audio in this prototype. The current movement and glove feel test uses [approved prototype overrides](docs/GAME_DESIGN_TEMPLATE.md#63-approved-milestone-1-prototype-overrides); retained **Proposed** production values are not final approved balance.

## Run locally

Use Node.js **24.21.0 LTS** and npm **11.19.0**, the verified local toolchain. Open this repository's folder or `KrewetekBuldogul.code-workspace` in VS Code, then use its terminal from the repository root.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/** in a desktop browser. Leave the terminal running; press **Ctrl+C** there to stop the server. Click **Begin training** or use the keyboard/controller menu controls. No separate engine editor or account is required. Geometry is generated locally; there are no external art assets.

Use `npm.cmd` in Windows PowerShell because the `npm.ps1` wrapper may be blocked by execution policy; changing system policy is unnecessary. If a newly installed Node.js is not found, fully restart VS Code before retrying. On other desktop systems the command name is normally `npm`, but those systems are a later validation target.

`npm.cmd ci` installs exactly from the committed lockfile. Use `npm.cmd install` only when intentionally adding or updating project dependencies, and review/commit the resulting lockfile change.

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Local development server at `http://127.0.0.1:5173/` |
| `npm.cmd run typecheck` | TypeScript validation |
| `npm.cmd test` | Simulation and input tests |
| `npm.cmd run build` | Production build into ignored `dist/` |
| `npm.cmd run preview` | Preview the existing build at `http://127.0.0.1:4173/` |
| `npm.cmd run test:browser` | Automated browser smoke checks; browser setup and conditions are in the validation report |

Run `npm.cmd run build` before previewing or running browser tests. The browser test matrix uses installed Chrome and Edge; see the [validation instructions](docs/MILESTONE_1_VALIDATION.md#reproduce) to run only one installed browser. Local preview is not public deployment. The exact dependencies and commands are defined in [package.json](package.json) and [package-lock.json](package-lock.json).

## Prototype controls

| Action | Keyboard / mouse | Standard-mapped controller |
| --- | --- | --- |
| Move | W / A / S / D | Left stick |
| Aim | Mouse pointer or arrow keys | Right stick; direction is retained when released |
| Attack | Left mouse button | Right trigger: RT / R2 |
| Dash | Space | Left trigger: LT / L2 |
| Pause / menu | Escape | Menu / Options |
| Menu navigation | Up / Down arrows or W / S | D-pad or left stick |
| Confirm / start / resume | Enter or click the focused action | A / Cross |
| Back | Escape | B / Circle |
| Restart training | R or Restart in the menu | Select Restart in the menu |

Release held controls before resuming. Focus loss, a hidden tab, or active-controller disconnection pauses play and clears held actions; resuming is deliberate. Controller status and input-family instructions are visible in the interface. Press a controller button if the browser has not detected it yet.

This milestone uses the browser's **standard** gamepad mapping. An unknown mapping is reported instead of guessing controls. The user reported successful physical **DualShock 4 over USB in Chrome** on the original prototype; the exact browser version, controller revision/firmware, and detailed per-action results were not supplied. A fresh physical test of the tuned build is pending. DualShock Bluetooth, Xbox One/Series, and other browser/hardware combinations remain unverified in the [physical test matrix](docs/TECHNICAL_DESIGN.md#10-validation-and-compatibility-matrix); simulated tests do not establish hardware compatibility. Bindings are editable data in [the input module](src/input/controls.ts); the in-game rebinding interface belongs to milestone 2.

## Confirmed scope

- One handsome, charming, funny adult Polish football hooligan protagonist, with bright clothing and a prominent red-and-white scarf; an original fictional identity without a direct recognizable likeness to the loose Karol Nawrocki reference.
- Exactly three weapons: a stylized FB MSBS Grot assault rifle, fast boxing gloves, and a slow, heavy Kolumna Zygmunta-inspired pillar.
- Equal production baseline sustained single-target DPS for the two melee weapons; slightly lower rifle DPS. Exact production values remain Proposed; the approved glove-only prototype override is temporary.
- Three biomes with three levels each: boxing gym, football stadium, and presidential palace; nine levels in the initial scope.
- Boxers and a miniboss in the gym; hooligans and a miniboss in the stadium; clerks, lobbyists, and a president final boss in the palace.
- PS4 / DualShock 4, Xbox controller, and keyboard/mouse input.
- Customizable gameplay and menu controls across supported inputs.
- Browser deployment preferred.
- 3D graphics presented through an isometric top-down view, with Hades II as the presentation reference.
- Windows desktop browsers first; other desktop systems later.
- Xbox One/Series and DualShock 4 controller testing over USB and Bluetooth.
- Free development tools and a code-first workflow through Codex in VS Code.
- Original modern urban art direction with expressive silhouettes and readable combat; Hades is a high-level reference.
- Seven power-up sources: Bóg, Ojczyzna, Orzeł Biały w koronie, Szacunek ulicy, Fryderyk Chopin, Maria Skłodowska-Curie, and Mikołaj Kopernik.
- Pleasant cartoon sound effects and no music, including no musical stingers or Chopin recordings.

The creative brief is confirmed; the populated documents distinguish it from **Proposed** names, narrative, mechanics, tuning, and production choices. **TBD** identifies unresolved decisions. The separate fictional president interpretation is proposed. Prototype checks do not establish final balance, full-game performance, physical-controller compatibility, or legal clearance.

## Documents

| Document | Purpose |
| --- | --- |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Prototype boundaries, approved stack, future architecture, input design, risks, and milestones |
| [Milestone 1 validation](docs/MILESTONE_1_VALIDATION.md) | Actual commands/results, browser conditions, initial measurements, limitations, and pending hardware checks |
| [Game design draft](docs/GAME_DESIGN_TEMPLATE.md) | Player experience, fiction, weapons and balance, nine-level route, enemies, and power-up rules |
| [Art and audio design draft](docs/ART_DESIGN_TEMPLATE.md) | Visual direction, animation, effects, non-musical audio, asset specifications, and production targets |
| [Decisions and open questions](docs/DECISIONS_AND_OPEN_QUESTIONS.md) | Confirmed requirements, proposals, dependencies, and unresolved decisions |
| [Collaboration](docs/COLLABORATION.md) | Setup status, Codex onboarding, branches, and publishing steps |
| [Agent instructions](AGENTS.md) | Rules for future Codex work |

## Structure

The `docs/` directory contains the design baseline and validation record. The populated game and art drafts retain their original `_TEMPLATE.md` filenames to preserve links. `src/game/` contains renderer-independent simulation and tuning, `src/input/` maps devices to actions, `src/presentation/` builds the procedural scene, and `src/main.ts` integrates the application and HUD. `tests/` verifies rules, input, and browser behavior. `assets/` is reserved for later authorized asset work; this prototype uses procedural geometry. Dependency folders, build output, browser reports, and local private files are not committed.

## Development workflow

Use the exact branch names `Dev` and `Main`. Both branches are published. `Dev` is the verified GitHub default and local working branch; `Main` holds reviewed baselines. The milestone 1 refinement authorization covers committing/pushing validated work on `Dev` and updating the existing [review PR #2 against Main](https://github.com/DezertInn/KrewetekBuldogul/pull/2); leave it unmerged and `Dev` active. There are no additional permanent branches. See [collaboration status](docs/COLLABORATION.md) for setup and remaining access decisions.

## Next steps

1. The collaborator accepts the pending GitHub invitation, then active write access is verified; see [collaboration status](docs/COLLABORATION.md).
2. Retest the tuned movement, glove reach, and punch speed, including DualShock 4 USB in Chrome; consult the [validation limitations](docs/MILESTONE_1_VALIDATION.md) and complete other available physical-controller checks without assuming the earlier manual pass covers this build.
3. Review the [proposed visual brief](docs/ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1), following dissatisfaction with placeholder colors, animations, textures, and character design. Resolve palette, silhouette, surface, and animation direction before authorizing production assets; other [design questions](docs/DECISIONS_AND_OPEN_QUESTIONS.md#prioritized-open-questions) remain open.
4. After review, explicitly authorize milestone 2: complete gameplay/menu rebinding and recovery, all three weapon behaviors, and comparable combat measurements. Later work is not authorized by the milestone 1 request.

Project licensing is TBD. No project license or rights to third-party assets have been selected by this setup.
