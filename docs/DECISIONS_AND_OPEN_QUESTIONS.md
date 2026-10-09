# Decisions and open questions

Design baseline and milestone 2 decision register; updated 2026-10-09 (Europe/Warsaw). Status changes require an explicit decision or a verified action; proposals are not approvals. The user supplied the creative brief, authorized milestone 1 and its refinement, accepted the refined movement/reach/punch feel, and explicitly authorized milestone 2. The original template filenames are retained; production design details remain drafts.

## Confirmed requirements

| ID | Requirement |
| --- | --- |
| R01 | Project and public repository name: KrewetekBuldogul |
| R02 | Milestone 1 authorized: TypeScript + Babylon.js + Vite playable technical prototype, one gym room/player, boxing gloves, training dummy, initial keyboard/mouse/gamepad controls, and validation. Milestone 2 subsequently extends this baseline under R29–R32; milestone 3 and later remain outside authorization |
| R03 | Exact permanent branches: `Main` and `Dev`; `Dev` is to be remote default and local working branch |
| R04 | Action roguelite; Hades reference for responsive combat, movement, encounters, and repeated runs |
| R05 | One handsome, charming, funny adult Polish football hooligan protagonist in bright clothing with a prominent red-and-white scarf |
| R06 | Exactly three weapons: stylized FB MSBS Grot assault rifle, fast boxing gloves, slow heavy Kolumna Zygmunta-inspired pillar; detailed production mechanics and values remain Proposed, separate from the authorized prototype overrides under R26/R30 |
| R07 | Initial scope: three biomes of three levels each, nine levels total; boxing gym, football stadium, presidential palace in that order; later expansion is possible but not committed |
| R08 | PS4 / DualShock 4, Xbox controller, and keyboard/mouse support |
| R09 | Customizable gameplay and menu controls across supported devices |
| R10 | Prefer deployment directly in a web browser |
| R11 | Supplied creative brief incorporated into populated game and art/audio drafts; additional names, story, and production choices remain Proposed |
| R12 | Keep UTF-8 Markdown; milestone 2 source/configuration/tests/docs, necessary compatible free project dependencies/test tools, local servers, and original procedural placeholders are authorized. No production assets/audio, public deployment, paid services, or unnecessary plugins |
| R13 | 3D graphics presented as 2D isometric top-down, using Hades II as the presentation reference |
| R14 | Windows desktop browsers first; other desktop systems later |
| R15 | Xbox One/Series and DualShock 4 over USB and Bluetooth as the intended controller test scope; exact hardware revisions still need identification |
| R16 | Free development tools; develop through Codex in VS Code |
| R17 | Original fictional protagonist; Karol Nawrocki is a loose reference without direct recognizable likeness, voice imitation, biography, campaign identity, or implication that fictional conduct describes him |
| R18 | Original modern Polish urban interpretation of Hades-style expressive design, composition, silhouettes, and combat readability |
| R19 | Gym: various boxers and one miniboss; stadium: various hooligans and one miniboss; palace: various clerks/lobbyists and one president final boss; major encounters fit within the nine levels |
| R20 | Equal production baseline sustained single-target DPS for gloves and pillar; slightly lower rifle DPS. Exact final production targets remain Proposed; the milestone 2 benchmark under R30 applies this relationship to authorized adjustable prototype values |
| R21 | Exactly seven power-up categories: Bóg; Ojczyzna; Orzeł Biały w koronie; Szacunek ulicy; Fryderyk Chopin; Maria Skłodowska-Curie; Mikołaj Kopernik |
| R22 | Pleasant, playful cartoon SFX with no soundtrack, menu/combat/boss music, musical stingers, or Chopin recordings; Chopin mechanics and feedback require no musical playback or rhythm input |
| R23 | Commit validated milestone 1 work on `Dev`, push to `origin/Dev`, open a review PR against `Main`, leave it unmerged, and leave `Dev` active |
| R24 | Existing Proposed gameplay/camera values may be adjustable prototype defaults; using them does not approve final balance or production design |
| R25 | Validate type checking, meaningful simulation/input/settings tests, production build, and actual installed Chrome/Edge browsers. Reuse earlier lockfile-install evidence when dependencies are unchanged; revalidate if changed. Record measured conditions and distinguish simulated inputs, user-reported physical tests, and pending hardware checks |
| R26 | Approved milestone 1 refinement: movement, glove reach, and attack-rate changes with unchanged per-strike damage, as specified authoritatively in [GDD section 6.3](GAME_DESIGN_TEMPLATE.md#63-approved-milestone-1-prototype-overrides). The accepted settings persist into milestone 2; final production balance remains open |
| R27 | Historical refinement authorization: validate/commit/push to `Dev`, update PR #2 against `Main`, and leave it unmerged with `Dev` active/default. Document a Proposed visual-review brief. That request did not itself authorize production assets or milestone 2; milestone 2 is now separately authorized below |
| R28 | User accepted the refined movement pace, glove reach, and punch speed as the basis for continuing. This is feel acceptance, not new device/browser metadata, complete physical compatibility coverage, or acceptance of any visual alternative |
| R29 | Milestone 2 input scope: semantic gameplay/menu actions, complete customization/rebinding and safe recovery, named keyboard/mouse/controller profiles, calibration, active-controller selection, dynamic prompts, guided nonstandard mapping, and validated versioned local settings with storage-failure recovery. `R` defaults to reload; restart is a separate remappable menu action |
| R30 | Authorized adjustable milestone 2 weapon behaviors and balance are authoritative in [GDD section 6.4](GAME_DESIGN_TEMPLATE.md#64-authorized-milestone-2-combat-foundation): all three weapons available at preparation, one equipped per session, no in-combat switching, preserved glove feel, equal melee and 10% lower rifle benchmark. Measure actual simulation over complete equal windows, preserving fractional damage and full reload/recovery timing |
| R31 | Milestone 2 encounter scope: separate resettable dummy mode and a fixed group of three basic `B01_E01` boxers in the gym, with readable attacks, health/protection, stagger/knockback, defeat/completion, retry, preparation return, and deterministic reset. Original procedural placeholders only; remain silent. No bosses, upgrades/rewards, level/run progression/saves, production assets/audio, music, or deployment |
| R32 | Commit and push validated milestone 2 work to `Dev`, update existing PR #2, verify remote results, and leave it open/unmerged with `Dev` active/default. Preserve unrelated changes/history, milestone 1 evidence, and pending physical tests; record current checks separately in [milestone 2 validation](MILESTONE_2_VALIDATION.md) |

The GDD owns game rules, balance calculations, and content identifiers. The art/audio draft owns presentation and asset specifications. The TDD owns architecture, platform constraints, and technical validation. Their details are proposals unless explicitly tied to a confirmed requirement above.

## Proposals awaiting review

| ID | Proposal | Why it is provisional / what could change it |
| --- | --- | --- |
| P01 | TypeScript + Babylon.js for production browser 3D | **Approved for milestones 1 and 2 with Vite.** The wider production choice remains subject to measured performance/compatibility; exact installed dependencies are recorded in package.json/package-lock.json |
| P02 | Real-time 3D with a fixed orthographic isometric camera and combat on a two-dimensional plane | **Approved for milestones 1 and 2.** Exact production camera tuning and asset workflow remain Proposed; this does not claim to reproduce Hades II internals |
| P03 | Windows 11 with current stable Chrome, Edge, and Firefox for initial validation | Windows-first scope is confirmed; minimum OS/browser versions and baseline hardware are proposed |
| P04 | Identify exact controller revisions, firmware, and Bluetooth adapters before compatibility testing | USB/Bluetooth scope is confirmed; individual hardware capabilities must be verified |
| P05 | Single-player local runs and local saves for later run/progression milestones | Milestone 2 is a local repeatable combat test; only controls/settings persist. One playable character does not itself establish broader multiplayer scope; networking/cloud saves are not confirmed requirements |
| P06 | Data-driven content and versioned run saves | Semantic actions, full rebinding/recovery, versioned local controls/settings, and renderer-independent combat are authorized for milestone 2. Full content catalogs, run checkpoints, and progression remain future systems |
| P07 | Historical proposed production baseline of 100 sustained single-target DPS for each melee weapon and 90 for the rifle | Section 6.2 records an earlier production proposal, not current prototype settings. Section 6.4 authorizes the adjusted milestone 2 benchmark while preserving the confirmed relative relationship. Final production timing/damage and practical encounter balance remain subject to playtesting and review |
| P08 | Fixed nine-level route, with minibosses ending B01L03/B02L03 and the final boss ending B03L03 | Counts and setting order are confirmed; placements, room composition, enemy variants, and authored/random encounter details are proposed |
| P09 | Borys “Błysk” Rudzki as the fictional protagonist; a separate fictional president antagonist | Name, narrative premise, relationship, and president interpretation await creative approval; no real-person identity is implied |
| P10 | Three example upgrades per source, with explicit triggers, stacking, finite proc rules, and run-only progression | The seven sources are confirmed; 21 examples illustrate a proposed system rather than establish a final production upgrade count |
| P11 | Painterly stylized 3D urban presentation, reusable environment kits, prioritized original assets, and non-musical sound event mixing | User feedback rejected the current placeholder quality. Review the [Proposed visual brief](ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1) for palette, silhouette, materials/textures, and animation feel before selecting a production target; camera, rigs, budgets, asset scope, and mix values also remain provisional |

The project records exact direct versions in [package.json](../package.json) and the dependency graph in [package-lock.json](../package-lock.json). Node.js 24.21.0 LTS and npm 11.19.0 were verified for milestone 1; use `npm.cmd` in Windows PowerShell where the script wrapper is blocked. [Milestone 1 validation](MILESTONE_1_VALIDATION.md) remains historical; [milestone 2 validation](MILESTONE_2_VALIDATION.md) records current checks and observations separately from the TDD's proposed production budgets. No production budget is accepted merely because the small prototype runs.

## Manual feedback and retest status

**User-reported observations, 2026-10-09:** The initial results below concern the original milestone 1 prototype. The subsequent “yes to all questions” accepts refined movement/reach/punch feel only. Neither report supplies a comprehensive per-action checklist, new hardware metadata, or a milestone 2 physical test.

| Area | Supplied observation | Consequence / evidence limit |
| --- | --- | --- |
| Chrome gameplay | Generally successful; everything worked as expected | Supports the original prototype's manual usability result, not other browsers or production readiness. Exact Chrome version was not supplied |
| Keyboard movement and mouse aiming | Initially responsive/natural, but approximately 10% too slow; refined movement pace subsequently accepted | Preserve GDD section 6.3 movement. The acceptance does not establish additional browser/device coverage |
| Glove feel | Requested longer reach and faster strikes; refined reach and cadence subsequently accepted | Preserve GDD section 6.3 feel and damage. Section 6.4 authorizes the three-weapon prototype comparison, not final production balance |
| Physical PS4 DualShock 4 | Successfully tested through **USB in Chrome** on the earlier prototype | General user-reported pass only. Controller revision/firmware and detailed per-action results were not supplied. Milestone 2 needs a fresh physical test; do not infer every remapping/safety/reconnect action passed |
| Other hardware and transports | No supplied physical evidence | DualShock Bluetooth, Xbox One/Series USB/Bluetooth, and other browser/hardware combinations remain unverified; simulated controller tests do not establish these results |
| Visual quality | Colors, animations, textures, and character design were unsatisfactory | Record separately from technical function. The existing placeholder appearance is not an approved target; the art brief remains Proposed and production assets are not authorized |

Next manual retest: exercise all three weapons in dummy and boxer modes, confirm the accepted movement/glove feel remains intact, then rebind actions and verify prompts, persistence, cancellation, safe recovery, and DualShock USB reconnect/resume. Record browser version and controller details where available. [Milestone 2 validation](MILESTONE_2_VALIDATION.md) owns current check results; this register records the feedback and decision boundary.

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

These are review questions for future design/production decisions, not blockers to the explicitly authorized milestone 2. Proposed answers live in the linked design documents; no unanswered question authorizes later implementation. Prototype defaults may be revised without changing the confirmed creative scope.

| Priority | Decision for the owner | Current proposal / consequence |
| --- | --- | --- |
| Q01 | Approve or revise the protagonist's fictional name, motivation, comic tone, and separate fictional president interpretation? | Review P09 and the GDD's story; affects character, boss, dialogue, and presentation direction |
| Q02 | After milestone 2 testing, retain or revise the equipment and rifle resource model for production? | One weapon per test session, primary attack/dash, and magazine/reload are now authorized prototype defaults. Broader production rules remain reviewable rather than blocking this implementation |
| Q03 | Which final production damage/timing values should follow the three-weapon test? | The GDD section 6.4 prototype benchmark supersedes older current-tuning assumptions while preserving accepted glove feel. Assess range, stagger, exposure, crowd value, and encounter uptime separately from measured single-target DPS; final production values remain open |
| Q04 | Approve the proposed level lengths, room composition, fixed route, boss placements, and ordinary enemy roster? | Nine levels and the three major encounters are confirmed; detailed layouts, variants, pacing, and encounter density remain proposed |
| Q05 | Approve the seven mechanical identities, example upgrades, reward selection, and finite effect rules? | Proposed GDD system, including non-musical Chopin treatment; exact production upgrade count remains TBD |
| Q06 | Approve single-player local runs, the proposed save/resume behavior, and reset/persistence boundary? | P05; multiplayer, cloud saves, permanent progression, native builds, and mobile/touch remain unconfirmed scope |
| Q07 | Choose the palette, character proportions, surface treatment, and grounded/comic animation direction; approve remaining production camera/pipeline/performance targets? | The [visual-review brief](ART_DESIGN_TEMPLATE.md#21-proposed-visual-review-after-milestone-1) responds to dissatisfaction with the placeholders. Choose a coherent hero-and-gym target before production asset authorization; production budgets also require measured evidence |
| Q08 | What audience/age target, supported text languages, voice scope, and accessibility defaults should be finalized? | Review GDD/ADD proposals; preserve Polish glyph support, visual equivalents for sound, full action remapping, and confirmed no-music direction |
| Q09 | Which exact Windows/browser baseline and controller revisions, firmware, USB/Bluetooth adapters are available for future validation? | P03/P04; the original prototype has a general user-reported DualShock USB/Chrome pass, without detailed identifiers. Feel acceptance adds no hardware metadata. Complete milestone 2 physical remapping/safety tests and other combinations; do not assume every Xbox One revision supports Bluetooth |
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
| 2026-10-09 | User's “yes to all questions” and explicit milestone 2 prompt | Accept refined movement/reach/punch feel; authorize R29–R32 input/settings, three weapons, bounded boxer encounter, procedural presentation, checks, and Dev/PR #2 workflow. The GDD section 6.4 prototype benchmark supersedes older tuning assumptions while final production values remain open. Add no hardware or visual-approval claim | AGENTS, README, GDD, art/audio draft, TDD, milestone 2 validation, Collaboration, this register |

## Decision procedure

Record each accepted decision with date, owner, rationale, and affected documents. Update the relevant design document and this register together. If a proposal changes, state the new proposal and its reason without presenting the previous recommendation as an approved requirement.

Actual repository and access status is maintained in [Collaboration](COLLABORATION.md).
