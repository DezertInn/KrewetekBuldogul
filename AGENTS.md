# Instructions for Codex agents

## Current authorization

This project is in setup and documentation phase. Do not implement gameplay, generate an engine project, install engine dependencies, generate production assets, or deploy an application until the user explicitly requests a later implementation task. Git/repository administration and design documentation are within the setup scope.

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

For this phase, check file scope, relative links, requirement coverage, and cross-document consistency. There is no runnable application or test suite; do not claim gameplay, performance, or controller support has been tested. After implementation is authorized, select meaningful checks for the actual change and document the results.
