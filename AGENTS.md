# Instructions for Codex agents

## Current authorization

This project is in setup and documentation phase. Do not implement gameplay, generate an engine project, install engine dependencies, generate production assets, or deploy an application until the user explicitly requests a later implementation task. Git/repository administration and design documentation are within the setup scope.

## Sources of truth

- `README.md`: project overview and entry point.
- `docs/TECHNICAL_DESIGN.md`: technical architecture and provisional recommendations.
- `docs/GAME_DESIGN_TEMPLATE.md`: game, character, theme, story, and balance decisions.
- `docs/ART_DESIGN_TEMPLATE.md`: visual direction and asset specifications.
- `docs/DECISIONS_AND_OPEN_QUESTIONS.md`: requirement status, assumptions, and unresolved decisions.
- `docs/COLLABORATION.md`: verified setup status and collaboration workflow.

Keep these documents consistent. Use UTF-8 Markdown and relative links within the repository. Distinguish **Confirmed**, **Proposed**, and **TBD**; recommendations do not become approved requirements without user direction.

## Scope invariants

- One main playable character; exactly three weapons.
- Biome-grouped levels; both biome count and levels per biome remain TBD.
- DualShock 4, Xbox controller, and keyboard/mouse support with customizable gameplay and menu actions.
- Browser deployment preferred.
- 3D graphics with isometric top-down presentation; Hades II is the presentation reference. Windows desktop browsers first, other desktop systems later.
- Test Xbox One/Series and DualShock 4 over USB/Bluetooth; verify exact hardware capabilities.
- Prefer free tools and a code-first development workflow through Codex in VS Code.
- Do not invent final character identity, weapon identities, lore, biome names, or art direction.
- Hades is a gameplay reference, not a source of project characters, art, or narrative.

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
