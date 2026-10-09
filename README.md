# KrewetekBuldogul

An action roguelite project using Hades as a reference for responsive combat, movement, encounters, and repeated runs.

[Public GitHub repository](https://github.com/DezertInn/KrewetekBuldogul)

**Current phase:** project setup and design documentation only. There is no playable game, engine project, dependency installation, or application build yet.

## Confirmed scope

- One main playable character and exactly three weapons; their identities and mechanics are TBD.
- Levels organized into biomes; the number of biomes and levels per biome is TBD.
- PS4 / DualShock 4, Xbox controller, and keyboard/mouse input.
- Customizable gameplay and menu controls across supported inputs.
- Browser deployment preferred.
- 3D graphics presented through an isometric top-down view, with Hades II as the presentation reference.
- Windows desktop browsers first; other desktop systems later.
- Xbox One/Series and DualShock 4 controller testing over USB and Bluetooth.
- Free development tools and a code-first workflow through Codex in VS Code.
- Character identity, theme, story, and art direction will be supplied later.

## Documents

| Document | Purpose |
| --- | --- |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Architecture, provisional technology comparison, input design, risks, and milestones |
| [Game design template](docs/GAME_DESIGN_TEMPLATE.md) | Fill-in gameplay, character, world, and story decisions |
| [Art design template](docs/ART_DESIGN_TEMPLATE.md) | Fill-in visual direction and asset production decisions |
| [Decisions and open questions](docs/DECISIONS_AND_OPEN_QUESTIONS.md) | Confirmed requirements, proposals, dependencies, and unresolved decisions |
| [Collaboration](docs/COLLABORATION.md) | Setup status, Codex onboarding, branches, and publishing steps |
| [Agent instructions](AGENTS.md) | Rules for future Codex work |

## Structure

The `docs/` directory contains the design baseline. `src/`, `assets/`, and `tests/` contain only `.gitkeep` placeholders for later work. The structure is engine-neutral.

## Development workflow

Use the exact branch names `Dev` and `Main`. Both branches are published. `Dev` is the verified GitHub default and local working branch; `Main` holds reviewed baselines. Develop on `Dev`, review changes, and promote approved work to `Main`. There are no additional permanent branches. See [collaboration status](docs/COLLABORATION.md) for verified setup and remaining access decisions.

## Next steps

1. Confirm the collaborator's GitHub username if repository write access is needed; sharing and invitation status are tracked separately in the collaboration document.
2. Review the provisional TypeScript + Babylon.js recommendation for browser 3D and the exact controller/browser matrix.
3. Fill in the gameplay and art design templates; confirm the camera and asset pipeline details.
4. Explicitly request the first implementation milestone when ready. This documentation does not authorize implementation.

Project licensing is TBD. No project license or rights to third-party assets have been selected by this setup.
