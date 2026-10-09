# Instructions for Codex agents

## Current authorization

The user authorized milestone 1 on 2026-10-09: a TypeScript + Babylon.js + Vite playable technical prototype with one gym room, one placeholder character, boxing-glove attacks, a training dummy, initial keyboard/mouse/gamepad input, and validation. Free project dependencies, test tools, local servers, and original procedural placeholders are authorized. Existing Proposed tuning may be used as adjustable prototype defaults, not final approved balance.

Commit validated work on `Dev`, push to `origin/Dev`, and open a review PR against `Main`; leave it unmerged and `Dev` active. Use normal environment approvals where required. Later milestones, full rebinding UI, the full three-weapon system, production assets, public deployment, and paid services remain outside this authorization. Preserve all other rules below.

The user subsequently authorized a milestone 1 refinement: movement +10%, glove reach +30%, attack rate +20% with unchanged per-hit damage, focused validation, a Proposed visual-review brief, and updating existing PR #2. The GDD records the authoritative prototype overrides; these do not approve final three-weapon balance. Record the user-reported Chrome/DualShock 4 USB success as an earlier-build observation, not a fresh physical test of the tuned build.

## Sources of truth

- `README.md`: project overview and entry point.
- `docs/TECHNICAL_DESIGN.md`: technical architecture and provisional recommendations.
- `docs/GAME_DESIGN_TEMPLATE.md`: game, character, theme, story, and balance decisions.
- `docs/ART_DESIGN_TEMPLATE.md`: visual/audio direction and asset specifications.
- `docs/DECISIONS_AND_OPEN_QUESTIONS.md`: requirement status, assumptions, and unresolved decisions.
- `docs/COLLABORATION.md`: verified setup status and collaboration workflow.

Keep these documents consistent. Use UTF-8 Markdown and relative links within the repository. Distinguish **Confirmed**, **Proposed**, and **TBD**; recommendations do not become approved requirements without user direction.

## Scope invariants

- One main playable character: a handsome, charming, funny adult Polish football hooligan in bright clothing with a prominent red-and-white scarf. Karol Nawrocki is a loose creative reference; create an original fictional identity without direct recognizable likeness, biography, or voice imitation.
- Exactly three weapons: a stylized FB MSBS Grot assault rifle, fast boxing gloves, and a slow, heavy Kolumna Zygmunta-inspired pillar. Melee baseline sustained single-target DPS should match; rifle DPS is slightly lower. Exact tuning remains Proposed.
- Initial scope: three biomes with three levels each, nine levels total. Boxing gym: boxers and one miniboss; football stadium: hooligans and one miniboss; presidential palace: clerks/lobbyists and one president final boss. Major encounters occupy existing levels. Future expansion is possible, not committed.
- Exactly seven power-up sources: Bóg, Ojczyzna, Orzeł Biały w koronie, Szacunek ulicy, Fryderyk Chopin, Maria Skłodowska-Curie, and Mikołaj Kopernik. Example upgrades and detailed system rules remain Proposed.
- Pleasant cartoon sound effects; no music, musical stingers, or Chopin recordings. Chopin uses visual symbolism and mechanics without musical playback or rhythm-game input.
- DualShock 4, Xbox controller, and keyboard/mouse support with customizable gameplay and menu actions.
- Browser deployment preferred.
- 3D graphics with isometric top-down presentation; Hades II is the presentation reference. Windows desktop browsers first, other desktop systems later.
- Test Xbox One/Series and DualShock 4 over USB/Bluetooth; verify exact hardware capabilities.
- Prefer free tools and a code-first development workflow through Codex in VS Code.
- The supplied creative direction is Confirmed. New character names, story, detailed enemy rosters, boss identities, mechanics, and numerical budgets remain Proposed until approved; do not revert resolved requirements to TBD.
- Hades is a high-level gameplay/readability reference for an original modern Polish urban style; do not copy its characters, assets, UI compositions, or narrative.
- The GDD owns gameplay rules, balance, and content IDs; the art document owns presentation/audio specifications; the TDD owns architecture and compatibility. Link authoritative details rather than maintaining divergent copies.
- Fictionalization and stylization are design choices, not evidence of legal clearance. Preserve targeted unresolved rights questions in the decision register.

## Repository workflow

- Preserve exact branch capitalization: `Dev` and `Main`.
- Work on `Dev` by default; the intended remote default is `Dev`.
- Promote reviewed changes from `Dev` to `Main`; do not create additional permanent branches.
- Inspect status and existing work before edits. Preserve unrelated user changes.
- Delegate independent files when useful; avoid simultaneous edits to the same file or shared Git index. One coordinating agent handles commits, branches, and remote writes.
- Never publish credentials, collaborator email addresses, local account data, or unrelated files.
- Verify remote operations; distinguish an invitation being sent from it being accepted.

## Verification

For milestone 1, run type checking, meaningful simulation/input tests, production build, lockfile install verification, and actual browser smoke checks. Document measured performance with conditions. Label simulated gamepad checks separately from physical Xbox One/Series and DualShock 4 USB/Bluetooth checks; never claim unavailable hardware was tested. Check file scope, relative links, requirement coverage, and cross-document consistency. Exclude generated artifacts and private data from commits.
