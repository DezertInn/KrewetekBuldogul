# KrewetekBuldogul

An action roguelite set in an exaggerated contemporary Polish urban world, using Hades as a reference for responsive combat, movement, encounters, and repeated runs.

[Public GitHub repository](https://github.com/DezertInn/KrewetekBuldogul)

**Current phase:** project setup and design documentation only. There is no playable game, engine project, dependency installation, or application build yet.

## Confirmed scope

- One handsome, charming, funny adult Polish football hooligan protagonist, with bright clothing and a prominent red-and-white scarf; an original fictional identity without a direct recognizable likeness to the loose Karol Nawrocki reference.
- Exactly three weapons: a stylized FB MSBS Grot assault rifle, fast boxing gloves, and a slow, heavy Kolumna Zygmunta-inspired pillar.
- Equal baseline sustained single-target DPS for the two melee weapons; slightly lower rifle DPS. Exact values are proposed, not playtested.
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

The creative brief is confirmed; the populated documents distinguish it from **Proposed** names, narrative, mechanics, tuning, and production choices. **TBD** identifies unresolved decisions. The separate fictional president interpretation is proposed. No gameplay, controller compatibility, performance, balance, or legal clearance has been validated.

## Documents

| Document | Purpose |
| --- | --- |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Architecture, provisional technology comparison, input design, risks, and milestones |
| [Game design draft](docs/GAME_DESIGN_TEMPLATE.md) | Player experience, fiction, weapons and balance, nine-level route, enemies, and power-up rules |
| [Art and audio design draft](docs/ART_DESIGN_TEMPLATE.md) | Visual direction, animation, effects, non-musical audio, asset specifications, and production targets |
| [Decisions and open questions](docs/DECISIONS_AND_OPEN_QUESTIONS.md) | Confirmed requirements, proposals, dependencies, and unresolved decisions |
| [Collaboration](docs/COLLABORATION.md) | Setup status, Codex onboarding, branches, and publishing steps |
| [Agent instructions](AGENTS.md) | Rules for future Codex work |

## Structure

The `docs/` directory contains the design baseline. The populated game and art drafts retain their original `_TEMPLATE.md` filenames to preserve links. `src/`, `assets/`, and `tests/` contain only `.gitkeep` placeholders for later work. The structure is engine-neutral.

## Development workflow

Use the exact branch names `Dev` and `Main`. Both branches are published. `Dev` is the verified GitHub default and local working branch; `Main` holds reviewed baselines. Develop on `Dev`, review changes, and promote approved work to `Main`. There are no additional permanent branches. See [collaboration status](docs/COLLABORATION.md) for verified setup and remaining access decisions.

## Next steps

1. The collaborator accepts the pending GitHub invitation, then active write access is verified; see [collaboration status](docs/COLLABORATION.md).
2. Review the provisional TypeScript + Babylon.js recommendation for browser 3D and the exact controller/browser matrix.
3. Review the populated game and art/audio drafts and the [prioritized design questions](docs/DECISIONS_AND_OPEN_QUESTIONS.md#prioritized-open-questions); approve or revise the proposed fiction, combat, upgrades, and production targets.
4. Explicitly request the first implementation milestone when ready. This documentation does not authorize implementation.

Project licensing is TBD. No project license or rights to third-party assets have been selected by this setup.
