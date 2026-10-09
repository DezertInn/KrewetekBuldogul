# Decisions and open questions

Baseline date: 2026-10-09 (Europe/Warsaw). Status changes require an explicit decision or a verified action; proposals are not approvals.

## Confirmed requirements

| ID | Requirement |
| --- | --- |
| R01 | Project and public repository name: KrewetekBuldogul |
| R02 | Setup, documentation, and structure only in this phase |
| R03 | Exact permanent branches: `Main` and `Dev`; `Dev` is to be remote default and local working branch |
| R04 | Action roguelite; Hades reference for responsive combat, movement, encounters, and repeated runs |
| R05 | One main playable character |
| R06 | Exactly three weapons; identities and mechanics TBD |
| R07 | Levels grouped into biomes; biome count and levels per biome TBD |
| R08 | PS4 / DualShock 4, Xbox controller, and keyboard/mouse support |
| R09 | Customizable gameplay and menu controls across supported devices |
| R10 | Prefer deployment directly in a web browser |
| R11 | Character, theme, story, and art direction supplied later through the design documents |
| R12 | Use UTF-8 Markdown; no application code, engine scaffold, dependency installation, or production assets |
| R13 | 3D graphics presented as 2D isometric top-down, using Hades II as the presentation reference |
| R14 | Windows desktop browsers first; other desktop systems later |
| R15 | Xbox One/Series and DualShock 4 over USB and Bluetooth as the intended controller test scope; exact hardware revisions still need identification |
| R16 | Free development tools; develop through Codex in VS Code |

## Proposals awaiting review

| ID | Proposal | Why it is provisional / what could change it |
| --- | --- | --- |
| P01 | TypeScript with Babylon.js for browser 3D | Fits the confirmed 3D and code-first preferences; see the [technology comparison](TECHNICAL_DESIGN.md). Exact version and toolchain remain unselected |
| P02 | Real-time 3D with a fixed orthographic isometric camera and combat on a two-dimensional plane | Technical interpretation of the user's presentation requirement; exact camera angles/projection and asset workflow need review. This does not claim to reproduce Hades II internals |
| P03 | Windows 11 with current stable Chrome, Edge, and Firefox for initial validation | Windows-first scope is confirmed; minimum OS/browser versions and baseline hardware are proposed |
| P04 | Identify exact controller revisions, firmware, and Bluetooth adapters before compatibility testing | USB/Bluetooth scope is confirmed; individual hardware capabilities must be verified |
| P05 | Single-player local runs and local saves for the first playable milestone | One playable character does not itself establish multiplayer scope; networking/cloud saves are not confirmed requirements |
| P06 | Data-driven content, versioned saves, and action-based input | Recommended architecture, subject to review before implementation |

No engine or toolchain version is pinned. Performance budgets in the TDD are targets for future measurement, not observed results.

## Initial clarification batch

Five initial questions and a follow-up about the missing Git commit author were answered on 2026-10-09. Personal identity details remain private setup context.

| Question | Status | Impact |
| --- | --- | --- |
| Intended GitHub owner and collaborator identity | Owner: account currently signed into VS Code; its GitHub username and authenticated access still need verification. Collaborator supplied as an email, not a verified GitHub username | Do not guess either GitHub account; external setup remains dependent on verification |
| Presentation | Answered: 3D graphics with isometric top-down presentation, referencing Hades II | Recorded as R13; rendering approach proposed as P02 |
| Initial browser/device/OS targets | Answered: Windows desktop browsers first, other desktop systems later | Recorded as R14; exact versions/hardware remain proposed |
| Team programming and game-engine experience | Preference supplied: recommend free tools fully usable through Codex in VS Code; prior experience not specified | Recorded as R16; do not assume prior engine skills |
| Xbox models and controller connection types | Answered: Xbox One/Series and DualShock 4, USB and Bluetooth | Recorded as R15; exact hardware revisions remain TBD |
| Git commit author | User supplied an author email; no separate display name supplied | Use the supplied identity for the setup commit, without inferring a different person or GitHub login |

Account identity and contact details belong in private setup context, not this public document.

## Intentionally deferred design decisions

- Character identity, theme, world, story, and art direction: TBD.
- Weapon identities, mechanics, and balance: TBD within three weapon entries.
- Biome count, level count per biome, names, and content: TBD.
- Enemy/boss roster, room generation method, run duration, progression, and rewards: TBD.
- Final player action set, default bindings, aim assistance, and accessibility values: TBD; proposed mappings are examples to review.
- Save cadence, suspend/resume design, and persistent unlocks: TBD.
- Multiplayer, cloud saves, mobile/touch input, and native builds: not confirmed; do not add them to implementation scope by assumption.
- Hosting provider, release process details, project license, asset licenses, and budget: TBD.

## Decision procedure

Record each accepted decision with date, owner, rationale, and affected documents. Update the relevant design document and this register together. If a proposal changes, state the new proposal and its reason without presenting the previous recommendation as an approved requirement.

Actual repository and access status is maintained in [Collaboration](COLLABORATION.md).
