# KrewetekBuldogul — Art Design Template

**Document status:** Fill-in template; no art direction or production assets approved.

**Owner:** TBD

**Last reviewed:** TBD

**Art direction version / approval:** TBD

## How to use this document

Replace TBD fields as creative and technical decisions are made. Label unapproved directions **Proposed**. Guiding prompts identify decisions; they do not prescribe a style or authorize asset production. Keep source references, ownership, and usage permissions with each proposed visual direction.

[Game Design Template](GAME_DESIGN_TEMPLATE.md) owns gameplay meaning and narrative; [Technical Design](TECHNICAL_DESIGN.md) owns rendering architecture, platform constraints, and technical validation. Record shared decisions in [Decisions and Open Questions](DECISIONS_AND_OPEN_QUESTIONS.md).

## 1. Confirmed constraints and open foundations

| Area | Constraint / status |
| --- | --- |
| Project | KrewetekBuldogul, action roguelite |
| Playable cast | One main playable character; identity and appearance TBD |
| Weapons | Exactly three; names, identities, and designs TBD |
| Environments | Levels grouped into biomes; biome count and levels per biome TBD |
| Gameplay reference | Hades informs responsive combat, movement, encounters, and repeated runs; no matching art style is assumed |
| Presentation | Confirmed: 3D graphics and assets presented as a 2D-looking fixed isometric / top-down view; Hades 2 is the user's presentation reference |
| Inputs | Keyboard/mouse, PS4 / DualShock 4, and Xbox One / Series controllers; USB and Bluetooth in test scope, exact hardware models / revisions TBD. Prompts must support customizable gameplay and menu controls |
| Deployment | Browser deployment preferred; Windows desktop browsers first, other desktop operating systems later. Engine, browser versions, and hardware baseline pending |
| Development workflow | Free development tools; code developed with Codex in VS Code when implementation is authorized. Specific art tools TBD |
| Creative foundations | Theme, story, tone, art style, precise camera angle, and composition TBD within the confirmed presentation |
| Current scope | Documentation and structure only; no production assets or implementation |

## 2. Visual direction and reference board

**Purpose:** Establish a coherent visual language that supports play and is feasible for the team.

| Field | Draft direction |
| --- | --- |
| Visual thesis in one sentence | TBD |
| Mood, tone, and desired emotional response | TBD |
| Shape language and silhouette principles | TBD |
| Materials, surface detail, and texture treatment | TBD |
| Stylization / realism / abstraction | TBD |
| Value, color, and lighting principles | TBD |
| Target audience and visual content boundaries | TBD |
| Team production capabilities and constraints | TBD |
| Consistency rules and intentionally excluded directions | TBD |

### Reference register

Record what a reference teaches; do not treat reference imagery as automatically licensed for the game or public repository.

| Reference title / creator | Source link | Specific quality to study | How the game will interpret it | Rights / permission to store or reuse | Status |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD |

### Direction approval

- Decision makers and review process: TBD.
- Proposed alternatives and evaluation criteria: TBD.
- Approved reference set and date: TBD.
- Evidence that the direction supports combat readability: TBD.

## 3. Perspective, camera, and composition

**Purpose:** Turn the confirmed 3D-asset, fixed isometric / top-down presentation into production specifications without prematurely selecting technical formats or inventing an art style.

- Confirmed visual approach: 3D graphics and assets that present as a 2D isometric / top-down game.
- Technical proposal: runtime 3D with an orthographic camera; approval and details are tracked in [Technical Design](TECHNICAL_DESIGN.md). The user's Hades 2 reference specifies the desired appearance and is not a claim about that game's internal production or rendering pipeline.
- Fixed isometric / top-down viewing orientation is confirmed; exact camera angle, framing, and player screen position: TBD.
- Camera following, transitions, zoom, and motion constraints: TBD.
- Resolution, aspect ratios, scaling, and minimum readable object sizes: TBD.
- Foreground occlusion, object fading, and visibility of threats behind scenery: TBD.
- Depth ordering / layering rules appropriate to the chosen approach: TBD.
- Visible combat space and advance warning for offscreen threats: TBD.
- Camera shake and motion-reduction options: TBD.
- Constraints shared with level layout and targeting: TBD.

## 4. Main playable character

**Purpose:** Make the single protagonist recognizable while keeping the character's identity and story open.

| Field | Draft specification |
| --- | --- |
| Identity, story links, and thematic motifs | TBD; align with game design |
| Silhouette and distinguishing shapes | TBD |
| Proportions, scale, and palette | TBD |
| Clothing, anatomy, materials, and equipment | TBD |
| Facing directions / views required | TBD |
| Visibility at intended camera distance | TBD |
| Relationship to the three weapons | TBD |
| Damage, status, and action-state readability | TBD |
| Movement personality and animation constraints | TBD |
| Portraits or narrative presentation, if required | TBD |
| Customization or alternate appearances, if any | TBD; not assumed in scope |

**Review prompts:** Can the player locate the character in a crowded encounter? Does the design remain legible without relying on color alone? Which details survive the actual browser viewport size?

## 5. Three weapon art entries

**Purpose:** Support each approved weapon's gameplay identity without inventing it here. Slot labels are placeholders.

| Specification | Weapon 1 | Weapon 2 | Weapon 3 |
| --- | --- | --- | --- |
| Name / gameplay design link | TBD | TBD | TBD |
| Form, silhouette, and scale | TBD | TBD | TBD |
| Materials and palette | TBD | TBD | TBD |
| Held / equipped / menu presentation | TBD | TBD | TBD |
| Pose and animation needs | TBD | TBD | TBD |
| Attack range and danger-area readability | TBD | TBD | TBD |
| Effects and trails, if applicable | TBD | TBD | TBD |
| Icon and selection-state needs | TBD | TBD | TBD |
| Distinction from the other two weapons | TBD | TBD | TBD |
| Asset list and validation status | TBD | TBD | TBD |

## 6. Enemies and bosses

**Purpose:** Make threats and counterplay understandable. Enemy roster and boss inclusion/count remain TBD.

### Enemy / boss entry — reuse when a design is proposed

- Identifier and linked gameplay role: TBD.
- Narrative / biome relationship: TBD.
- Silhouette, size, pose, and motion signature: TBD.
- Distinction from player, allies if any, and other enemy roles: TBD.
- Attack anticipation, active danger, recovery, and defeat cues: TBD.
- Palette and redundant shape / motion signals: TBD.
- Hit, status, phase, and vulnerability presentation: TBD.
- Required views, animations, effects, and UI assets: TBD.
- Crowd readability and overlap concerns: TBD.
- Visual scope, effort estimate, and review evidence: TBD.

## 7. Environments, biomes, and levels

**Purpose:** Define navigable spaces and biome identity while preserving content counts as TBD.

**Biome count:** TBD. **Levels per biome:** TBD. Reuse the following entry only as content is approved; this template does not imply a fixed number of environments.

### Biome visual entry

- Working identifier / final name / gameplay design link: TBD.
- Theme, mood, narrative role, and reference links: TBD.
- Landmark shapes, materials, palette, and lighting: TBD.
- Distinction from other biomes: TBD.
- Ground, walls, boundaries, props, and transition vocabulary: TBD.
- Navigable versus blocked space cues: TBD.
- Hazard, interaction, and reward visibility: TBD.
- Reusable environment kit and variation rules: TBD.
- Background and foreground detail hierarchy: TBD.
- Effects or weather, if any, and readability limits: TBD.
- Level-specific exceptions and asset needs: TBD.

### Level composition entry

- Owning biome and level identifier: TBD.
- Focal points, landmarks, and navigation cues: TBD.
- Encounter space and camera constraints: TBD.
- Spawn / entry / exit presentation: TBD.
- Occlusion, visual clutter, and repeated-pattern checks: TBD.
- Asset reuse, unique assets, and loading implications: TBD.

## 8. Color, lighting, and combat readability

**Purpose:** Make visual meaning consistent across biomes, devices, and accessibility settings.

| Meaning to communicate | Value / color rule | Redundant shape / motion / text cue | Visibility under effects and background variation | Decision |
| --- | --- | --- | --- | --- |
| Player location and current state | TBD | TBD | TBD | TBD |
| Enemy identity and threat | TBD | TBD | TBD | TBD |
| Incoming attack / danger area | TBD | TBD | TBD | TBD |
| Safe / traversable space | TBD | TBD | TBD | TBD |
| Interaction / selection | TBD | TBD | TBD | TBD |
| Damage, recovery, or status change | TBD | TBD | TBD | TBD |

- Palette and lighting consistency across environments: TBD.
- Shadow and highlight roles in identifying depth and collision: TBD.
- Priority when multiple effects overlap: TBD.
- Color-vision, low-contrast, small-screen, and visual-clutter review approach: TBD.
- Limits and options for flashes, intense motion, and screen effects: TBD.

## 9. Animation and visual effects

**Purpose:** Tie timing and presentation to approved gameplay states. Final state names, timings, frame counts, and rigs are TBD.

### Animation inventory

| Subject / state | Gameplay meaning and timing dependency | Views / directions | Loop / transition rules | Deliverable format | Status |
| --- | --- | --- | --- | --- | --- |
| Main character — approved states TBD | TBD | TBD | TBD | TBD | TBD |
| Weapons 1–3 — approved actions TBD | TBD | TBD | TBD | TBD | TBD |
| Enemy / boss entry TBD | TBD | TBD | TBD | TBD | TBD |
| Environment / UI motion, if needed | TBD | TBD | TBD | TBD | TBD |

- Pose readability and silhouette checks at gameplay scale: TBD.
- Authored versus procedural motion responsibilities: TBD.
- Timing ownership and synchronization with damage / collision: TBD.
- Transitions, interruption, blending, and cancellation expectations: TBD.
- Export conventions for pivots, origins, attachment points, and animation names: TBD.

### Effect entry

- Linked action or event and intended information: TBD.
- Anticipation / active / recovery stages and duration: TBD.
- Shape, palette, opacity, layering, and spatial bounds: TBD.
- Maximum overlap and effect-density behavior: TBD.
- Reduced-effects alternative: TBD.
- Asset, audio, and optional haptic coordination: TBD.
- Performance cost and validation evidence: TBD.

## 10. UI, typography, icons, and input prompts

**Purpose:** Extend the visual language to navigation and settings without hiding actionable information.

- Screen inventory and visual hierarchy: TBD; align with game design.
- HUD layout, safe areas, scaling, and minimum readable sizes: TBD.
- Typography, font licensing, language coverage, and fallback plan: TBD.
- Icon grid, stroke / fill language, labels, and selected / disabled / focus states: TBD.
- Keyboard/mouse, DualShock 4, and Xbox prompt families: TBD.
- Glyph source, ownership, usage permissions, and generic fallback: TBD.
- Prompt behavior for active-device switching and user-remapped bindings: TBD.
- Menus and rebinding UI: visible focus, capture state, conflict, cancel, and reset states TBD.
- Avoiding color-only distinctions and icon-only ambiguity: TBD.
- Text expansion, localization, and controller navigation review: TBD.

## 11. Asset specifications and naming

**Purpose:** Set reproducible handoff requirements for 3D assets after the engine and rendering details are approved. Use free tools; exact tools, formats, and numeric budgets remain TBD. Optional 2D UI assets can follow a separate export path where useful.

| Asset category | Editable source format / tool | Delivery format | Scale / dimensions | Technical constraints | Review owner |
| --- | --- | --- | --- | --- | --- |
| Character / enemy 3D geometry and textures | TBD | TBD | TBD | TBD | TBD |
| Weapon 3D geometry and textures | TBD | TBD | TBD | TBD | TBD |
| Environment 3D pieces and textures | TBD | TBD | TBD | TBD | TBD |
| 3D rigs and animation | TBD | TBD | TBD | TBD | TBD |
| Effects | TBD | TBD | TBD | TBD | TBD |
| UI / icons / fonts, with 2D assets where appropriate | TBD | TBD | TBD | TBD | TBD |

- Naming convention, stable identifiers, and case rules: TBD.
- Source versus exported-asset locations: TBD.
- Units, axes, orientation, origin, pivots, and scale reference: TBD.
- Color space, transparency, filtering, and compression: TBD.
- 3D pipeline: geometry limits, UVs, materials, texture sets, rigs, animation export, and export orientation: TBD.
- Optional 2D UI / icon pipeline: canvas size, pixel density, trimming, atlases, padding, and scaling conventions: TBD.
- Versioning, large-file storage policy, and dependency tracking: TBD.

## 12. Production, export, and review workflow

**Purpose:** Describe a repeatable asset lifecycle. This is a future workflow proposal; the current phase does not produce assets.

| Stage | Expected handoff | Review / acceptance criteria | Owner / tool |
| --- | --- | --- | --- |
| Brief | Gameplay role, reference links, and constraints | TBD | TBD |
| Concept | Proposed direction and alternatives | TBD | TBD |
| Source creation | Editable source with documented dependencies | TBD | TBD |
| Export | Delivery asset with traceable source revision | TBD | TBD |
| Integration preview | Asset at actual camera scale and representative lighting | TBD | TBD |
| Validation | Readability, compatibility, rights, and budget evidence | TBD | TBD |
| Approval / revision | Recorded decision and remaining issues | TBD | TBD |

- Export settings and who maintains them: TBD.
- How updates avoid breaking identifiers or references: TBD.
- Review environment, representative combat scenes, and screenshot conventions: TBD.
- Public-repository suitability of source and delivery files: TBD.
- Approval criteria before an asset replaces a placeholder: TBD.

## 13. Performance and loading budgets

**Purpose:** Agree measurable limits with technical design before production. Validate first against Windows desktop browsers; plan other desktop operating systems later. The confirmed 3D presentation does not establish numeric budgets or a hardware baseline.

| Budget | Target | Test hardware / browser and scenario | Measurement owner | Decision status |
| --- | --- | --- | --- | --- |
| Initial downloadable art payload | TBD | TBD | TBD | TBD |
| Additional biome / level payload | TBD | TBD | TBD | TBD |
| Resident texture / geometry memory | TBD | TBD | TBD | TBD |
| Maximum texture / atlas dimensions | TBD | TBD | TBD | TBD |
| Visible 3D geometry and optional UI / effect sprite counts | TBD | TBD | TBD | TBD |
| Materials / draw work | TBD | TBD | TBD | TBD |
| Simultaneous effects and transparency overlap | TBD | TBD | TBD | TBD |
| Animation storage and runtime cost | TBD | TBD | TBD | TBD |
| Rendering time allowance | TBD | TBD | TBD | TBD |

- Quality levels and which artistic details may scale down: TBD.
- Loading order and assets required before play: TBD.
- Asset reuse / deduplication and compression strategy: TBD.
- Validation against technical design targets and representative combat load: TBD.

## 14. Attribution and asset provenance

**Purpose:** Keep the origin and permitted uses of every future asset reviewable, particularly in a public repository.

| Asset / reference identifier | Creator / source URL | License or permission evidence | Required credit | Modification record | Approved for public repository / game distribution |
| --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD |

- Attribution location and credit wording: TBD.
- Treatment of commissioned, stock, generated, or third-party assets: TBD.
- Restrictions on editable source redistribution: TBD.
- Process for replacement when rights or provenance are unresolved: TBD.

## 15. Art review and open decisions

| Review question | Evidence / viewing condition | Result / action | Reviewer |
| --- | --- | --- | --- |
| Can the player distinguish the character, threats, and safe space? | TBD | TBD | TBD |
| Are the three weapons visually distinct at gameplay scale? | TBD | TBD | TBD |
| Are biome identities distinct without harming consistent visual cues? | TBD | TBD | TBD |
| Are prompts correct after device switching and remapping? | TBD | TBD | TBD |
| Is the UI readable across approved sizes and languages? | TBD | TBD | TBD |
| Do representative assets fit agreed browser performance budgets? | TBD | TBD | TBD |
| Are attribution and redistribution permissions recorded? | TBD | TBD | TBD |

Record decisions that affect scope, architecture, or game design in [Decisions and Open Questions](DECISIONS_AND_OPEN_QUESTIONS.md). No approved art direction is implied by an unfilled entry.
