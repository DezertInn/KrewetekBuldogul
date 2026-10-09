# KrewetekBuldogul — Game Design Template

**Document status:** Fill-in template; unapproved content remains TBD.

**Owner:** TBD

**Last reviewed:** TBD

**Design version / approval:** TBD

## How to use this document

Fill each TBD field with a concrete answer or retain TBD until a decision is made. Mark new material **Proposed** until approved, and record consequential decisions in [Decisions and Open Questions](DECISIONS_AND_OPEN_QUESTIONS.md). A guiding prompt is a question to resolve, not an approved feature. Do not turn an example or a reference into a requirement.

This document defines the player experience and content. [Technical Design](TECHNICAL_DESIGN.md) owns implementation architecture and compatibility; [Art Design Template](ART_DESIGN_TEMPLATE.md) owns visual specifications. Reconcile changes across these documents before implementation. This phase authorizes documentation and project structure only.

## 1. Confirmed foundation

| Area | Confirmed requirement |
| --- | --- |
| Name | KrewetekBuldogul |
| Genre and reference | Action roguelite; Hades is a reference for responsive combat, movement, encounters, and repeated runs. |
| Playable character | One main playable character. Identity and abilities: TBD. |
| Weapons | Exactly three weapons. Names, identities, and detailed mechanics: TBD. |
| World structure | Levels grouped into biomes. Number of biomes and levels per biome: TBD. |
| Input devices | PS4 / DualShock 4, Xbox One / Series controllers, and keyboard with mouse. Controller test scope includes USB and Bluetooth; exact hardware models / revisions TBD. |
| Customization | Gameplay and menu controls customizable across supported input devices. |
| Presentation | 3D graphics and assets presented as a 2D-looking fixed isometric / top-down view; Hades 2 is the user's presentation reference. |
| Deployment preference | Direct browser play preferred. Windows desktop browsers first; other desktop operating systems later. Exact browser versions and hardware baseline TBD. |
| Development workflow | Use free development tools and develop code with Codex in VS Code when implementation is authorized. |
| Creative direction | Character identity, theme, story, and art direction: TBD. |

Specific Hades mechanics, characters, narrative, progression systems, or art style are not approved features of this game. The presentation reference describes the desired appearance, not a verified claim about Hades 2's internal rendering pipeline. Runtime 3D with an orthographic camera is a proposed technical interpretation; see [Technical Design](TECHNICAL_DESIGN.md). Exact camera angle, framing, multiplayer scope, target audience, and team capabilities remain TBD.

## 2. Vision and intended experience

**Purpose:** State what the player should do, feel, and return for.

| Field | Draft answer |
| --- | --- |
| One-sentence pitch | TBD |
| Intended audience and experience level | TBD |
| Main player fantasy | TBD |
| Desired emotions during combat / between encounters | TBD |
| Distinctive qualities | TBD |
| Intended session length / run length | TBD |
| Intended solo / multiplayer scope | TBD |
| Presentation and perspective | Confirmed: 3D graphics/assets with a fixed isometric / top-down view that reads as 2D. Camera tuning TBD. |
| Initial browser, desktop, and device targets | Confirmed: Windows desktop browsers first; other desktop operating systems later. Specific browser/hardware matrix TBD. |

**Guiding prompts:** What makes a successful minute of play? Which skill should improve across repeated runs? Why would the player choose another run? Which ideas are intentionally outside the scope?

### Gameplay pillars

Add only as many pillars as needed; each should guide tradeoffs and be testable.

| Pillar | Player-facing promise | Consequence for design | Evidence from a playtest | Status |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |

## 3. Core loop and run structure

**Purpose:** Describe the player's decisions at encounter, level, and run timescales without prematurely selecting progression mechanics.

| Timescale | Player goal and repeated actions | Choices and feedback | Start/end conditions |
| --- | --- | --- | --- |
| Moment-to-moment combat | TBD | TBD | TBD |
| Encounter | TBD | TBD | TBD |
| Level / biome | TBD | TBD | TBD |
| Complete run | TBD | TBD | TBD |
| Between runs | TBD | TBD | TBD |

- How a run starts and which choices precede it: TBD.
- Success, failure, abandonment, and retry behavior: TBD.
- Pause, browser focus loss, interrupted sessions, and resume expectations: TBD.
- Whether runs use randomness; what is randomized and what remains authored: TBD.
- Onboarding and introduction of complexity: TBD.
- Information shown before a commitment or irreversible in-game choice: TBD.

## 4. Main character, world, and story

**Purpose:** Reserve creative ownership for later authors while capturing the questions gameplay and art need answered.

### Single main playable character

| Field | Draft answer |
| --- | --- |
| Identity / name / pronouns | TBD |
| Motivation and personality | TBD |
| Narrative role and relationship to the world | TBD |
| Movement capabilities | TBD |
| Baseline combat capabilities independent of weapons | TBD |
| Vulnerabilities, resources, and constraints | TBD |
| Growth across the game | TBD |
| Silhouette / animation implications | TBD; coordinate with art design |

### Setting and narrative

- World premise, theme, tone, and intended age suitability: TBD.
- Initial situation, central conflict, and stakes: TBD.
- Relationship between repeated runs and the story: TBD.
- Story structure, delivery methods, and interruption rules during action: TBD.
- Supporting characters and factions, if needed: TBD.
- Dialogue, localization, subtitles, and content boundaries: TBD.
- Story milestones and ending conditions: TBD.

## 5. Movement and combat

**Purpose:** Define readable rules and responsive decisions before choosing numerical tuning values.

| Topic | Questions to resolve | Decision / status |
| --- | --- | --- |
| Movement | How do direction, acceleration, facing, and aim interact for each device? | TBD |
| Attacks | Which actions exist, and when can the player act again? | TBD |
| Defense | Which defensive actions, if any, exist and what do they cost? | TBD |
| Timing | What are the rules for input buffering, interruption, recovery, and cancellation? | TBD |
| Targeting | How do pointer aiming, stick aiming, target assistance, and target selection work? | TBD |
| Damage | What determines a hit, its consequence, and player understanding of it? | TBD |
| Resources | Which combat resources, cooldowns, or status effects, if any, are needed? | TBD |
| Collision | What blocks movement or attacks, and how are boundaries communicated? | TBD |
| Feedback | What visual, sound, and optional haptic cues communicate intent and outcome? | TBD |
| Fairness | What makes damage avoidable, foreseeable, and understandable? | TBD |

**Acceptance examples to fill:** A player can recognize TBD threat before TBD outcome. The same intended action is practical on TBD device layouts. Device-specific assistance policy: TBD.

## 6. The three weapons

**Purpose:** Define exactly three distinct weapon designs. These slot labels are placeholders, not final names. Do not add a fourth weapon slot without an explicit change to the confirmed scope.

| Design field | Weapon 1 | Weapon 2 | Weapon 3 |
| --- | --- | --- | --- |
| Name and identity | TBD | TBD | TBD |
| Intended playstyle and role | TBD | TBD | TBD |
| Attack actions and their purpose | TBD | TBD | TBD |
| Range, area, and targeting behavior | TBD | TBD | TBD |
| Timing, commitment, and mobility interaction | TBD | TBD | TBD |
| Strengths and tradeoffs | TBD | TBD | TBD |
| Resources or special rules, if any | TBD | TBD | TBD |
| Selection / acquisition / switching rules | TBD | TBD | TBD |
| Improvement or variation rules, if any | TBD | TBD | TBD |
| Controller and pointer aiming needs | TBD | TBD | TBD |
| Animation / effects / audio requirements | TBD | TBD | TBD |
| Learning challenge and mastery expression | TBD | TBD | TBD |
| Playtest evidence needed | TBD | TBD | TBD |

**Shared decisions:** How many weapons can be equipped at once? When can selection change? How should each remain viable across the planned content? All answers: TBD.

## 7. Enemies, encounters, and bosses

**Purpose:** Connect enemy behavior to decisions the player can learn and counter. Boss inclusion, count, and placement remain TBD.

### Enemy entry — duplicate only when a design is proposed

- Working identifier / final name: TBD.
- Combat role and intended player response: TBD.
- Movement, attack patterns, and state changes: TBD.
- Telegraph, danger window, recovery, and counterplay: TBD.
- Health/damage tuning inputs and difficulty scaling: TBD.
- Interactions with each of the three weapons: TBD.
- Visual/audio readability and accessibility needs: TBD.
- Valid biomes, encounter combinations, and exclusions: TBD.
- Defeat outcome and rewards, if any: TBD.

### Encounter and boss planning

| Topic | Draft answer |
| --- | --- |
| Encounter entry / completion rules | TBD |
| Authored, generated, or mixed encounter composition | TBD |
| Threat combinations and maximum simultaneous complexity | TBD |
| Arena geometry, cover, hazards, and navigation needs | TBD |
| Difficulty pacing within a level, biome, and run | TBD |
| Boss role, structure, phases, and defeat/retry rules, if included | TBD |
| Encounter variety and repeat avoidance criteria | TBD |

## 8. Biomes and levels

**Purpose:** Plan a scalable hierarchy of levels within biomes without fixing content counts.

**Number of biomes:** TBD. **Levels per biome:** TBD; equality between biomes is not assumed.

### Biome entry — reuse when content is defined

- Working identifier / name / narrative purpose: TBD.
- Gameplay identity and distinguishing decisions: TBD.
- Level count and progression connections: TBD.
- Enemy and encounter selection rules: TBD.
- Environmental interactions or hazards, if any: TBD.
- Visual/audio identity: TBD; link the matching art entry when defined.
- Entry, exit, transition, and completion conditions: TBD.
- Repetition, revisit, and difficulty rules: TBD.

### Level entry — associate each level with a biome

- Working identifier and owning biome: TBD.
- Objective and player choices: TBD.
- Authored / generated approach and constraints: TBD.
- Traversal layout, encounter spaces, and landmark requirements: TBD.
- Entry/exit rules and expected duration: TBD.
- Rewards, narrative events, and optional content, if any: TBD.
- Readability, navigation, and playtest acceptance criteria: TBD.

## 9. Progression, rewards, and balance

**Purpose:** Separate what changes during a run from what survives it. Persistent upgrades, currencies, and unlock systems are not approved merely because they appear as questions here.

| State category | What may change | What resets and when | What persists | Player-facing explanation |
| --- | --- | --- | --- | --- |
| Current encounter / level | TBD | TBD | TBD | TBD |
| Current run | TBD | TBD | TBD | TBD |
| Across runs | TBD | TBD | TBD | TBD |

- Reward purposes, timing, choice, and presentation: TBD.
- Progression goals and safeguards against repetitive mandatory play: TBD.
- Difficulty options, assistance, scaling, and their effects on rewards: TBD.
- Tuning measures for weapon viability, enemy threats, run duration, and failure: TBD.
- Save, reset, and recovery expectations communicated to the player: TBD.
- Balance review process and required playtest evidence: TBD.

## 10. Controls and input customization

**Purpose:** Define actions independently of physical keys and buttons, with usable gameplay and menu navigation for every supported device.

The confirmed requirement covers keyboard/mouse, PS4 / DualShock 4, and Xbox One / Series controllers, including customizable gameplay and menu controls. USB and Bluetooth are confirmed controller test paths, with Windows desktop browsers first and other desktop operating systems later. Exact hardware models / revisions, browser versions, and the later operating-system matrix remain TBD. Browser-reserved or unavailable inputs require compatibility validation; do not promise that every physical key/button can be captured in every environment.

Create one row per approved action. The rows below identify design areas, not final bindings or mandatory combat abilities.

| Context / action | Keyboard / mouse default | DualShock 4 default | Xbox default | Remapping and hold/press behavior | Status |
| --- | --- | --- | --- | --- | --- |
| Gameplay: movement | TBD | TBD | TBD | TBD | Proposed action; binding TBD |
| Gameplay: aim / facing | TBD | TBD | TBD | TBD | Behavior TBD |
| Gameplay: approved combat actions | TBD | TBD | TBD | TBD | Action list TBD |
| Gameplay: pause / resume | TBD | TBD | TBD | TBD | Behavior TBD |
| Menus: navigation | TBD | TBD | TBD | TBD | Behavior TBD |
| Menus: confirm / back | TBD | TBD | TBD | TBD | Behavior TBD |
| Settings: capture / cancel a new binding | TBD | TBD | TBD | TBD | Behavior TBD |

- Duplicate bindings and context-specific conflicts: TBD.
- Clearing a binding, alternate bindings, and restoring defaults: TBD.
- Preventing or recovering from an unusable menu layout: TBD.
- Persistence of mappings and selection of input profiles: TBD.
- Controller connect/disconnect, reconnect, and active-device switching: TBD.
- Button prompt style, device naming, and changes after rebinding: TBD.
- Stick dead zones, aim sensitivity, inversion, pointer sensitivity, and haptics options: TBD.
- Keyboard-only navigation and reduced dexterity considerations: TBD.

## 11. UI, accessibility, and player communication

**Purpose:** Ensure that players can understand state, configure play, and recover from interruptions.

- Screen inventory and transitions: TBD.
- Combat information hierarchy; what must remain visible under pressure: TBD.
- Settings organization and control-remapping flow: TBD.
- Text sizes, language support, contrast, and non-color cues: TBD.
- Motion, screen shake, flashes, effects density, and audio options: TBD.
- Tutorial and help access without relying on one input device: TBD.
- Failure, loading, save availability, and interrupted-input messaging: TBD.
- Criteria for equivalent understanding on controller and keyboard/mouse: TBD.

## 12. Scope and playtesting

**Purpose:** Turn the design into reviewable scope and measurable learning goals. Implementation requires a separate user instruction.

| Delivery stage | Player experience to demonstrate | Required content / systems | Explicit exclusions | Approval / evidence |
| --- | --- | --- | --- | --- |
| First playable proposal | TBD | TBD | TBD | TBD |
| Vertical slice proposal | TBD | TBD | TBD | TBD |
| Release scope | TBD | TBD | TBD | TBD |

| Playtest question | Participants / device matrix | Task or scenario | Observable measure | Acceptance threshold | Findings |
| --- | --- | --- | --- | --- | --- |
| Is combat responsive and understandable? | TBD | TBD | TBD | TBD | TBD |
| Are all three weapons distinct and viable? | TBD | TBD | TBD | TBD | TBD |
| Can users remap gameplay and menu actions and recover from conflicts? | TBD | TBD | TBD | TBD | TBD |
| Are controller reconnect and device switching understandable? | TBD | TBD | TBD | TBD | TBD |
| Do repeated runs create meaningful new decisions? | TBD | TBD | TBD | TBD | TBD |
| Are biomes and levels readable and sufficiently distinct? | TBD | TBD | TBD | TBD | TBD |

## 13. Design review record

| Date | Section / decision | Proposed or approved | Rationale / playtest evidence | Reviewer |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |

Unresolved cross-document decisions belong in [Decisions and Open Questions](DECISIONS_AND_OPEN_QUESTIONS.md), with links back to the affected sections.
