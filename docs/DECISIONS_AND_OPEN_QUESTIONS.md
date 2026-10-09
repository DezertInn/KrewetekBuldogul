# Decisions and open questions

Design baseline and milestone 1 refinement decision register; updated 2026-10-09 (Europe/Warsaw). Status changes require an explicit decision or a verified action; proposals are not approvals. The user supplied the creative brief, explicitly authorized milestone 1, and subsequently authorized its focused tuning refinement. The original template filenames are retained; their populated contents remain design drafts.

## Confirmed requirements

| ID | Requirement |
| --- | --- |
| R01 | Project and public repository name: KrewetekBuldogul |
| R02 | Milestone 1 authorized: TypeScript + Babylon.js + Vite playable technical prototype, one gym room/player, boxing gloves, training dummy, initial keyboard/mouse/gamepad controls, and validation. Later milestones remain outside authorization |
| R03 | Exact permanent branches: `Main` and `Dev`; `Dev` is to be remote default and local working branch |
| R04 | Action roguelite; Hades reference for responsive combat, movement, encounters, and repeated runs |
| R05 | One handsome, charming, funny adult Polish football hooligan protagonist in bright clothing with a prominent red-and-white scarf |
| R06 | Exactly three weapons: stylized FB MSBS Grot assault rifle, fast boxing gloves, slow heavy Kolumna Zygmunta-inspired pillar; detailed production mechanics and values remain Proposed, separate from the approved prototype overrides under R26 |
| R07 | Initial scope: three biomes of three levels each, nine levels total; boxing gym, football stadium, presidential palace in that order; later expansion is possible but not committed |
| R08 | PS4 / DualShock 4, Xbox controller, and keyboard/mouse support |
| R09 | Customizable gameplay and menu controls across supported devices |
| R10 | Prefer deployment directly in a web browser |
| R11 | Supplied creative brief incorporated into populated game and art/audio drafts; additional names, story, and production choices remain Proposed |
| R12 | Keep UTF-8 Markdown; milestone 1 source/configuration/tests/docs, compatible free project dependencies/test tools, local servers, and original procedural placeholders are authorized. No production assets, public deployment, paid services, or unnecessary plugins |
| R13 | 3D graphics presented as 2D isometric top-down, using Hades II as the presentation reference |
| R14 | Windows desktop browsers first; other desktop systems later |
| R15 | Xbox One/Series and DualShock 4 over USB and Bluetooth as the intended controller test scope; exact hardware revisions still need identification |
| R16 | Free development tools; develop through Codex in VS Code |
| R17 | Original fictional protagonist; Karol Nawrocki is a loose reference without direct recognizable likeness, voice imitation, biography, campaign identity, or implication that fictional conduct describes him |
| R18 | Original modern Polish urban interpretation of Hades-style expressive design, composition, silhouettes, and combat readability |
| R19 | Gym: various boxers and one miniboss; stadium: various hooligans and one miniboss; palace: various clerks/lobbyists and one president final boss; major encounters fit within the nine levels |
| R20 | Equal production baseline sustained single-target DPS for gloves and pillar; slightly lower rifle DPS. Exact production targets and measurement assumptions remain Proposed; the temporary glove-only prototype override under R26 does not replace this relationship |
| R21 | Exactly seven power-up categories: Bóg; Ojczyzna; Orzeł Biały w koronie; Szacunek ulicy; Fryderyk Chopin; Maria Skłodowska-Curie; Mikołaj Kopernik |
| R22 | Pleasant, playful cartoon SFX with no soundtrack, menu/combat/boss music, musical stingers, or Chopin recordings; Chopin mechanics and feedback require no musical playback or rhythm input |
| R23 | Commit validated milestone 1 work on `Dev`, push to `origin/Dev`, open a review PR against `Main`, leave it unmerged, and leave `Dev` active |
| R24 | Existing Proposed gameplay/camera values may be adjustable prototype defaults; using them does not approve final balance or production design |
| R25 | Validate type checking, meaningful simulation/input tests, production build, reproducible lockfile installation, and actual browsers; record measured conditions and distinguish simulated inputs, user-reported physical tests, and still-pending hardware checks |
| R26 | Approved milestone 1 refinement: movement, glove reach, and attack-rate changes with unchanged per-strike damage, as specified authoritatively in [GDD section 6.3](GAME_DESIGN_TEMPLATE.md#63-approved-milestone-1-prototype-overrides). This is temporary feel tuning; retain the proposed production benchmark and reconcile all three weapons during a separately authorized milestone 2 |
| R27 | Validate, commit, and push the focused refinement to `Dev`, update existing PR #2 against `Main`, and leave it unmerged with `Dev` active/default. Document a Proposed visual-review brief; no production assets, milestone 2 implementation, public deployment, paid services, or unnecessary tools are authorized |

The GDD owns game rules, balance calculations, and content identifiers. The art/audio draft owns presentation and asset specifications. The TDD owns architecture, platform constraints, and technical validation. Their details are proposals unless explicitly tied to a confirmed requirement above.

## Proposals awaiting review

| ID | Proposal | Why it is provisional / what could change it |
| --- | --- | --- |
| P01 | TypeScript + Babylon.js for production browser 3D | **Approved for milestone 1 with Vite** under R02. The wider production choice remains subject to measured performance/compatibility; exact installed dependencies are recorded in package.json/package-lock.json |
| P02 | Real-time 3D with a fixed orthographic isometric camera and combat on a two-dimensional plane | **Approved for milestone 1.** Exact camera tuning and production asset workflow remain Proposed; this does not claim to reproduce Hades II internals |
| P03 | Windows 11 with current stable Chrome, Edge, and Firefox for initial validation | Windows-first scope is confirmed; minimum OS/browser versions and baseline hardware are proposed |
| P04 | Identify exact controller revisions, firmware, and Bluetooth adapters before compatibility testing | USB/Bluetooth scope is confirmed; individual hardware capabilities must be verified |
| P05 | Single-player local runs and local saves for later run/progression milestones | Milestone 1 is one local test room with restart and no persistence. One playable character does not itself establish broader multiplayer scope; networking/cloud saves are not confirmed requirements |
| P06 | Data-driven content, versioned saves, and action-based input | Semantic actions, data-configurable bindings, and renderer-independent rules are approved for milestone 1. Full content catalogs, saves, and rebinding UI remain future systems |
| P07 | Production baseline of 100 sustained single-target DPS for each melee weapon and 90 for the rifle | The relative production balance is confirmed; exact numbers, attack timings, reload behavior, and future playtest tolerances remain proposed in [GDD section 6.2](GAME_DESIGN_TEMPLATE.md#62-shared-balance-benchmark). The approved temporary glove override in section 6.3 is not a new production target |
| P08 | Fixed nine-level route, with minibosses ending B01L03/B02L03 and the final boss ending B03L03 | Counts and setting order are confirmed; placements, room composition, enemy variants, and authored/random encounter details are proposed |
| P09 | Borys “Błysk” Rudzki as the fictional protagonist; a separate fictional president antagonist | Name, narrative premise, relationship, and president interpretation await creative approval; no real-person identity is implied |
| P10 | Three example upgrades per source, with explicit triggers, stacking, finite proc rules, and run-only progression | The seven sources are confirmed; 21 examples illustrate a proposed system rather than establish a final production upgrade count |
| P11 | Painterly stylized 3D urban presentation, reusable environment kits, prioritized original assets, and non-musical sound event mixing | User feedback rejected the current placeholder quality. Review the [Proposed visual brief](ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1) for palette, silhouette, materials/textures, and animation feel before selecting a production target; camera, rigs, budgets, asset scope, and mix values also remain provisional |

Milestone 1 records exact direct versions in [package.json](../package.json) and the dependency graph in [package-lock.json](../package-lock.json). Node.js 24.21.0 LTS and npm 11.19.0 were verified locally; use `npm.cmd` in Windows PowerShell where the script wrapper is blocked. The [validation report](MILESTONE_1_VALIDATION.md) distinguishes actual checks/observations from the TDD's proposed production performance budgets. No production budget is accepted merely because the small prototype runs.

## Manual feedback and retest status

**User-reported observations, 2026-10-09, on the original milestone 1 prototype before this refinement.** These are not automated results, a comprehensive per-action checklist, or a fresh pass of the tuned build.

| Area | Supplied observation | Consequence / evidence limit |
| --- | --- | --- |
| Chrome gameplay | Generally successful; everything worked as expected | Supports the original prototype's manual usability result, not other browsers or production readiness. Exact Chrome version was not supplied |
| Keyboard movement and mouse aiming | Movement responsive, directions natural, mouse aiming natural; movement approximately 10% too slow | The requested movement tuning is approved in GDD section 6.3; fresh feel acceptance remains pending |
| Glove feel | Requested longer reach and faster strikes | Approved reach/cadence changes and unchanged damage are specified in GDD section 6.3; this does not approve final three-weapon balance |
| Physical PS4 DualShock 4 | Successfully tested through **USB in Chrome** | General user-reported pass only. Controller revision/firmware and detailed per-action results were not supplied. Repeat on the tuned build; do not infer every safety/reconnect action passed |
| Other hardware and transports | No supplied physical evidence | DualShock Bluetooth, Xbox One/Series USB/Bluetooth, and other browser/hardware combinations remain unverified; simulated controller tests do not establish these results |
| Visual quality | Colors, animations, textures, and character design were unsatisfactory | Record separately from technical function. The existing placeholder appearance is not an approved target; the art brief remains Proposed and production assets are not authorized |

Next manual retest: confirm the new movement pace, glove reach and range indicator, repeated punch cadence, and continued keyboard/mouse/DualShock USB usability in Chrome. Record the browser version and controller details where available. The [validation report](MILESTONE_1_VALIDATION.md) owns actual check results; this register records the feedback and decision boundary.

## Initial clarification batch

Five initial questions and a follow-up about the missing Git commit author were answered on 2026-10-09. Personal identity details remain private setup context.

| Question | Status | Impact |
| --- | --- | --- |
| Intended GitHub owner and collaborator identity | Verified repository owner and authenticated administrator: `DezertInn`; the public repository, both branches, and default `Dev` are confirmed. User confirmed collaborator `loszavera`, whose GitHub account was verified | Write-access invitation sent on 2026-10-09 and verified as pending acceptance; active write access is not yet confirmed. See [Collaboration](COLLABORATION.md) |
| Presentation | Answered: 3D graphics with isometric top-down presentation, referencing Hades II | Recorded as R13; P02's real-time 3D/orthographic/planar interpretation was later approved for milestone 1 |
| Initial browser/device/OS targets | Answered: Windows desktop browsers first, other desktop systems later | Recorded as R14; exact versions/hardware remain proposed |
| Team programming and game-engine experience | Preference supplied: recommend free tools fully usable through Codex in VS Code; prior experience not specified | Recorded as R16; do not assume prior engine skills |
| Xbox models and controller connection types | Answered: Xbox One/Series and DualShock 4, USB and Bluetooth | Recorded as R15; exact hardware revisions remain TBD |
| Git commit author | User supplied an author email; no separate display name supplied | Use the supplied identity for the setup commit, without inferring a different person or GitHub login |

Private account details and contact information belong in private setup context, not this public document.

## Prioritized open questions

These are review questions for future design/production decisions, not blockers to the explicitly authorized milestone 1. Proposed answers live in the linked design documents; no unanswered question authorizes later implementation. Prototype defaults may be revised without changing the confirmed creative scope.

| Priority | Decision for the owner | Current proposal / consequence |
| --- | --- | --- |
| Q01 | Approve or revise the protagonist's fictional name, motivation, comic tone, and separate fictional president interpretation? | Review P09 and the GDD's story; affects character, boss, dialogue, and presentation direction |
| Q02 | Approve one weapon selected before a run, primary attack plus dash, and the rifle's magazine/reload rules? | GDD combat/equipment proposal; controls and animation scope follow this decision |
| Q03 | Which final production damage/timing values should reconcile all three weapons after the glove feel test? | The proposed 100/100/90 benchmark remains available for review; the current approved glove override is temporary. Preserve equal melee baseline DPS and slightly lower rifle DPS while testing range, stagger, safety, and encounter effectiveness in milestone 2 |
| Q04 | Approve the proposed level lengths, room composition, fixed route, boss placements, and ordinary enemy roster? | Nine levels and the three major encounters are confirmed; detailed layouts, variants, pacing, and encounter density remain proposed |
| Q05 | Approve the seven mechanical identities, example upgrades, reward selection, and finite effect rules? | Proposed GDD system, including non-musical Chopin treatment; exact production upgrade count remains TBD |
| Q06 | Approve single-player local runs, the proposed save/resume behavior, and reset/persistence boundary? | P05; multiplayer, cloud saves, permanent progression, native builds, and mobile/touch remain unconfirmed scope |
| Q07 | Choose the palette, character proportions, surface treatment, and grounded/comic animation direction; approve remaining production camera/pipeline/performance targets? | The [visual-review brief](ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1) responds to dissatisfaction with the placeholders. Choose a coherent hero-and-gym target before production asset authorization; production budgets also require measured evidence |
| Q08 | What audience/age target, supported text languages, voice scope, and accessibility defaults should be finalized? | Review GDD/ADD proposals; preserve Polish glyph support, visual equivalents for sound, full action remapping, and confirmed no-music direction |
| Q09 | Which exact Windows/browser baseline and controller revisions, firmware, USB/Bluetooth adapters are available for future validation? | P03/P04; the original prototype has a general user-reported DualShock USB/Chrome pass, without detailed hardware/browser identifiers. Complete the tuned-build retest and other combinations; do not assume every Xbox One revision supports Bluetooth |
| Q10 | What release/rights and resourcing decisions should govern production? | TBD: likeness review of completed designs, Grot naming/branding, original versus official national emblems, monument/reference-image rights, all asset/font/SFX provenance and redistribution, project license, hosting, budget, and ownership. No clearance is asserted |

## Decision record

| Date | Authority | Decision and rationale | Affected documents |
| --- | --- | --- | --- |
| 2026-10-09 | User's supplied creative brief | Confirm R05–R07 and R11 refinements plus R17–R22. Resolve prior blanket TBDs for weapon identities, biome counts, setting, protagonist concept, symbolic power-up sources, and audio direction; retain approval boundaries for the drafted details | README, AGENTS, GDD, art/audio draft, TDD, this register |
| 2026-10-09 | Design draft, not owner approval | Record P07–P11 as actionable proposals. The upgrade examples and asset inventory support review; they are not approved production quantities or implementation permission | GDD, art/audio draft, TDD, this register |
| 2026-10-09 | User's explicit milestone 1 start prompt | Supersede the setup-only restriction for one playable technical prototype. Approve TypeScript/Babylon.js/Vite, free local project/test tooling, procedural placeholders, initial input, validation, and adjustable Proposed defaults; keep later milestones, production assets, public deployment, paid services, and PR merge outside scope | AGENTS, README, GDD/ADD status lines, TDD, this register, Collaboration |
| 2026-10-09 | User's explicit milestone 1 repository workflow | Authorize validated commit/push on `Dev` and a `Dev` → `Main` review PR, left unmerged with `Dev` active. This authorization is not evidence that those remote actions have already completed | AGENTS, README, Collaboration |
| 2026-10-09 | User's manual feedback and USB clarification | Record responsive/natural movement and aiming, generally successful Chrome play, and physical DualShock 4 USB success on the original prototype. Record unsatisfactory colors, animations, textures, and character design; do not infer detailed checklist results or acceptance of a newer build | README, GDD, art/audio draft, TDD, validation report, this register |
| 2026-10-09 | User's explicit refinement prompt | Approve R26 prototype overrides with unchanged damage, focused checks, and R27 commit/push/PR-update workflow. Keep production benchmark proposals separate; request a Proposed visual brief without authorizing assets or later milestones | AGENTS, README, GDD, art/audio draft, TDD, validation report, Collaboration, this register |

## Decision procedure

Record each accepted decision with date, owner, rationale, and affected documents. Update the relevant design document and this register together. If a proposal changes, state the new proposal and its reason without presenting the previous recommendation as an approved requirement.

Actual repository and access status is maintained in [Collaboration](COLLABORATION.md).
