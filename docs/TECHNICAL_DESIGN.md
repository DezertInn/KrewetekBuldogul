# KrewetekBuldogul — Technical Design

Status: milestone 1 implementation authorized on 2026-10-09; broader architecture remains a design proposal. See the [milestone validation report](MILESTONE_1_VALIDATION.md) for actual checks and limitations.

Prepared: 2026-10-09.

Approved milestone 1 stack: **TypeScript + Babylon.js + Vite**; real-time 3D graphics with a fixed isometric/top-down presentation. Production suitability remains subject to measured performance and compatibility.

## 1. Scope and decision status

This document describes the browser game architecture and distinguishes the authorized prototype from future systems. Milestone 1 covers one gym room, one procedural player with a red-and-white scarf, boxing-glove attacks, a resettable training dummy, initial keyboard/mouse/gamepad actions, and validation. It does not implement the full game. Detailed balance values remain **Proposed**, used only as adjustable prototype defaults under the user's authorization.

### Milestone 1 implementation boundary

| Module | Milestone responsibility |
| --- | --- |
| [Simulation types](../src/game/types.ts) and [configuration](../src/game/config.ts) | Plain state/action contracts and editable prototype tuning |
| [Simulation](../src/game/simulation.ts) | Fixed-step movement, planar collision, dash, four-strike glove timing, and per-strike target damage |
| [Input actions](../src/input/controls.ts) | Editable physical bindings, semantic actions, standard-mapped Gamepad API input, device status, and release gates across menu/focus transitions |
| [Presentation](../src/presentation/scene.ts) | Original procedural geometry/materials, orthographic camera, player/scarf/gloves, dummy, and visual feedback |
| [Application](../src/main.ts) | Browser lifecycle, loading/errors, start/pause/restart flow, HUD, and simulation/render integration |

Full rebinding UI, rifle/pillar implementation, enemies/bosses, nine-level content, upgrades, persistence, production art/audio, and public hosting are deferred. Audio is intentionally absent in this slice. Standard gamepad mapping is the initial implementation boundary; unknown mappings need an explicit diagnostic rather than a guessed layout. The [README](../README.md) owns launch commands and prototype controls. The [validation report](MILESTONE_1_VALIDATION.md) owns exact installed versions, test outcomes, observed performance, and unverified physical-controller combinations.

**Confirmed** means explicitly required by the project brief. **Proposed** means a recommended starting point requiring design review. **TBD** means intentionally unresolved. Unless identified as confirmed or as an externally documented platform fact, the architecture and budgets below are proposed.

| Area | Confirmed requirement | Proposed starting point / unresolved detail |
| --- | --- | --- |
| Genre | Action roguelite; Hades is the gameplay reference | Responsive movement, readable attacks, room encounters, and repeated runs. Specific Hades mechanics are not automatically requirements. |
| Presentation | 3D graphics presenting as 2D isometric top-down; Hades II informs composition, silhouettes, and combat clarity | Real-time 3D assets, a fixed orthographic camera, and a 2D gameplay plane remain proposed. Camera parameters and detailed visual treatment are in the art draft; this does not assert how Hades II is implemented internally. |
| Player | One handsome, charming, funny adult Polish football hooligan; bright colors and a prominent red-and-white scarf; original fictional identity without a recognizable real-person likeness | The proposed name, premise, movement, and abilities are defined in the game draft; character presentation is defined in the art draft |
| Weapons | Exactly three: FB MSBS Grot-style rifle, fast boxing gloves, slow Kolumna Zygmunta-inspired pillar; equal baseline melee DPS and slightly lower ranged DPS | Stable IDs `weapon_01`, `weapon_02`, `weapon_03` respectively; numerical balance, attack/resource rules, and pre-run selection are GDD proposals |
| World | Three biomes, each with three levels: boxing gym, football stadium, presidential palace; nine levels, two minibosses, and one presidential final boss | Major encounters at the ends of levels `B01L03`, `B02L03`, and `B03L03` are proposed; rooms and encounters sit within levels |
| Power-ups | Exactly seven symbolic/cultural sources: Bóg, Ojczyzna, Orzeł Biały w koronie, Szacunek ulicy, Fryderyk Chopin, Maria Skłodowska-Curie, Mikołaj Kopernik | Run-based definitions, choice rules, and three sample upgrades per source are proposed in the GDD; samples do not fix the final upgrade count |
| Audio | Pleasant, playful cartoon effects; no music, musical reward stingers, or Chopin playback/rhythm-input requirement | Non-musical effects, UI, and ambience mixing; dialogue/voice production remains a separate decision |
| Input | DualShock 4, Xbox One/Series controllers, keyboard and mouse; customizable gameplay and menu controls; USB and Bluetooth | Browser-exposed controls must be remappable; exact hardware revisions and firmware must be recorded during validation |
| Delivery | Windows desktop browsers first; other desktop systems later | Browser versions and baseline hardware TBD; mobile scope unconfirmed |
| Development | Free tools; development through Codex in Visual Studio Code | Code-first scenes/data and repeatable command-line workflows; no required paid editor or visual-editor-only build step |
| Creative design | Exaggerated contemporary Polish urban setting, original stylized presentation, sporting rivalry and bureaucratic humor | [Game design](GAME_DESIGN_TEMPLATE.md) owns narrative, combat numbers, content IDs, and upgrade rules; [art design](ART_DESIGN_TEMPLATE.md) owns presentation and asset specifications. Added names, detailed mechanics, and the separate fictional president are proposals |

Assume one local player for initial architecture. Multiplayer, accounts, cloud saves, online services, touch controls, native releases, and offline installation are not part of the proposed first milestone; their product scope remains open. Browser play does not imply mobile touch support.

Use [decisions and open questions](DECISIONS_AND_OPEN_QUESTIONS.md) to approve or replace proposals. Current content counts are confirmed; exact camera tuning, gameplay values, hardware baseline, and supported browser versions still need review or validation. Keep the nine-level content configuration separate from architecture that can support an explicitly approved later expansion.

## 2. Technology selection

### 2.1 Options

The comparison records the rationale for the approved milestone 1 stack. Relative workflow and project-fit assessments are engineering judgments, not measured performance results. Documentation was checked on 2026-10-09. Exact versions are recorded in [package.json](../package.json), transitive dependencies in [package-lock.json](../package-lock.json), and verified tooling in the [validation report](MILESTONE_1_VALIDATION.md).

| Option | Documented capabilities | Project-fit assessment and tradeoffs |
| --- | --- | --- |
| **TypeScript + Babylon.js — recommended** | Browser 3D engine with TypeScript support, modular packages, asset tooling, and Apache-2.0 licensing. [Official repository](https://github.com/BabylonJS/Babylon.js) WebGL/WebGPU rendering, skeletal animation, scene picking, and an inspector are available. [Engine specifications](https://www.babylonjs.com/specifications/) | Best fit for actual 3D graphics and code-first browser development in VS Code. Author scenes and gameplay rules in text; import models and animations. Modular loading can limit downloaded features, but real payload and GPU cost need measurement. Browser tools and isolated simulation tests support debugging. Native packaging remains a separate future evaluation. |
| **GDScript + Godot — alternative** | Web export uses WebAssembly, WebGL 2, and the Compatibility renderer. Current Godot 4 C# projects cannot export to web. Single-threaded export is the preferred default; threaded export needs cross-origin isolation. [Web export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) The engine is MIT-licensed. [License](https://godotengine.org/license/) | Viable 3D option if integrated animation/scene tools or future native exports become more important. GDScript and text resources can be versioned, but the normal editor workflow adds another tool to the requested VS Code process. Compare WebAssembly/asset payload and export latency with the same scene; no size estimate is assumed. |
| **TypeScript + Phaser — scope-changing alternative only** | 2D browser framework with TypeScript support, MIT licensing, and desktop packaging through additional tools. [Official repository](https://github.com/phaserjs/phaser) | Could display sprites prerendered from 3D assets, but is not the primary choice for the chosen runtime-3D interpretation. Requires explicit approval to change that interpretation. Frame atlases can trade geometry cost for large texture downloads and directional-animation workloads. Text-based development is convenient, but that does not outweigh the mismatch with the clarified presentation. |

For Babylon.js, put the browser's keyboard/pointer/gamepad input behind a project-owned action layer and keep camera controls disconnected from those default handlers during gameplay. Engine input helpers are building blocks, not a complete remapping product. Godot's input actions provide an alternative starting point. Every option still depends on the browser's controller behavior and needs the acceptance matrix in section 10. [Godot input actions](https://docs.godotengine.org/en/stable/tutorials/inputs/input_examples.html), [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)

All three engine/framework options can be evaluated without purchasing an engine license. Use free tooling and no required paid plugins or assets. Hosting, distribution, and optional services must be reviewed against the free-tool constraint before adoption; this is not a promise that existing account subscriptions or future services have no cost. The game repository's own license and asset licenses are separate decisions; no game license is selected by this recommendation. Preserve dependency notices when distributing.

### 2.2 Recommendation and reversal criteria

The user approved **TypeScript + Babylon.js + Vite** for milestone 1, with a conventional static web build. This follows the clarified 3D presentation and code-first workflow. Project dependencies, configuration, source, and validation tools are authorized for this slice; this does not approve production assets or later milestones.

The proposed implementation uses real-time 3D models, materials, lighting, and animation viewed through a fixed orthographic camera. Movement and hit resolution stay on a 2D ground plane; visual height does not imply jumping, free camera rotation, or full 3D physics. This is our technical interpretation of the requested Hades II-style presentation, not a verified description of that game's engine. TypeScript should make data contracts and agent-authored changes reviewable in VS Code.

Propose WebGL 2 as the initial rendering baseline; evaluate WebGPU later without making it a minimum requirement. Author scene composition and level definitions in text so Codex can edit them from VS Code. Keep optional inspectors as diagnostic tools, not required sources of hidden project state. Imported production art will still need an agreed free asset-authoring process; code generation alone does not guarantee finished character animation or final art quality.

Revisit the production choice after the prototype if:

- Browser 3D performance or the required animation pipeline proves unsuitable: compare Babylon.js with Godot using the same representative encounter.
- The collaborators change their workflow preference and native desktop becomes equally important: favor a Godot evaluation.
- Target hardware, browser coverage, or art density cannot meet the proposed budgets: test a representative slice before committing to a production pipeline.

Select tested releases with matching documentation rather than mixing tutorials and APIs across versions. Commit exact direct dependency versions and the npm lockfile; verify installation with `npm.cmd ci`. Use `npm.cmd` in Windows PowerShell where the `npm.ps1` wrapper is blocked by execution policy, without changing machine policy.

## 3. System responsibilities and boundaries

Use a small modular architecture, not a general-purpose engine layered over the selected engine. Game rules should be testable without drawing a frame. Rendering and audio consume gameplay events; they do not decide whether an attack hits or a reward is granted.

| System | Owns | Interface / information exchanged |
| --- | --- | --- |
| Application flow | Boot, title, settings, run preparation, active run, results | Requests scene transitions and loading; creates/disposes run services |
| Input actions | Device samples, bindings, contexts, calibration, prompts | Produces movement/aim vectors and pressed/held/released actions; never changes health directly |
| Simulation | Character state, movement, attack timing, damage, effects | Consumes action snapshots and content definitions; emits gameplay events |
| Encounter director | Spawn scheduling, active enemies, completion conditions | Starts validated encounter definitions; reports completion once |
| Run director | Route, current level/room, run seed, chosen weapon, owned upgrades, rewards, transitions | Owns temporary progression and asks persistence to checkpoint at defined boundaries |
| Modifier evaluator | Upgrade eligibility, timers, meters, stacking, ordered effects | Runs inside simulation using GDD rules; consumes typed events, never animation or audio callbacks |
| Content catalog | Definitions for weapons, enemies, encounters, rooms, levels, biomes, upgrades, rewards | Resolves stable IDs; validates references, current scope, and content versions |
| Presentation | Fixed orthographic camera, 3D models/materials, HUD, animation, VFX, non-musical sound | Maps ground-plane state into the 3D scene; responds to named events with asset IDs |
| Persistence/settings | Profile, settings, checkpoints, migrations | Validates and saves data; reports recoverable storage failures |
| Browser adapter | Focus, visibility, fullscreen, storage, device availability | Converts platform events into application events |

Example interaction: a bound physical input becomes an Attack action; the simulation validates the player's current state and cooldown; the weapon's attack timeline opens a hit window; damage resolution emits a hit event; presentation plays feedback; the encounter director observes defeated enemies and completes the encounter when its explicit conditions are met.

Propose a 60 Hz fixed simulation step with rendering independent of simulation frequency. Read current input before the next simulation step; retain edge events until consumed so quick presses are not lost. Limit catch-up work after a long stall; pause on hidden/unfocused gameplay and require explicit resume. A reproducible content seed is useful for debugging, but cross-browser bit-for-bit simulation determinism is not promised.

Milestone 1 implements only the simulation, input, presentation, and application boundaries listed above. It runs at 60 Hz, buffers attack/dash edges until the next simulation step, and clamps accumulated elapsed time per rendered frame to 0.10 seconds. The production catch-up target in section 9 remains Proposed. Subdivide future source into content, persistence, or directors only when the corresponding milestone is authorized; do not scaffold unneeded systems now.

## 4. Character, combat, and weapons

### 4.1 Movement and player state

Represent one player entity with position, facing/aim, health, movement state, current weapon ID, attack state, and temporary modifiers. Separate movement direction from aim. Keyboard movement is normalized so diagonals do not move faster; analog magnitude may control speed if the game design approves it.

Propose states for locomotion, attack, dodge, hit reaction, and defeated, with explicit transition rules. Dash/dodge, invulnerability, attack cancellation, input buffering, and knockback are proposals to tune through playtesting. Define their timing in simulation units and document cancel windows in weapon data. Preserve the GDD's original scheduled attack-end barrier after a dash cancel, and its full-restart rule for an interrupted reload; canceling or beginning a reload must not bypass attack recovery. Do not let animation playback speed silently alter combat timing.

Use simple 2D collision shapes on the ground plane for navigation and explicit attack/hurt regions for combat. Keep rendered mesh bounds, animation bones, and visual height separate from authoritative collision. Collision layers distinguish walls, player, enemies, projectiles, triggers, and attack queries. Fast projectiles and dashes need swept collision or equivalent tests to avoid passing through thin obstacles. A general 3D physics package is not required by this proposal; select a free planar collision approach during the slice and add vertical gameplay only if approved.

### 4.2 Damage and attack resolution

An attack definition describes anticipation, active windows, recovery, reach/shape, damage parameters, displacement, and optional projectile/effect references. A hit record identifies attacker, primary attack opportunity, combo if any, target, unmodified base damage, target health before damage, origin, and simulation tick. One rifle round, one glove strike, and one pillar swing each form an attack opportunity; a four-strike combo does not collapse into one opportunity. Track targets already hit by an opportunity so a single active window cannot apply accidental repeated damage. Intentional multihit attacks must specify their repeat interval and opportunity IDs.

The rifle and melee weapons share damage rules but use distinct hit queries. Proposed rifle resolution is an instantaneous ground-plane ray against the nearest eligible target or blocking geometry, with a cosmetic tracer and impact event; damage must not depend on the tracer reaching its endpoint. Melee uses the authored glove or pillar region during its active window, constrained by range, facing, and blocking geometry. Pillar area coverage can damage several valid targets, but must not gain an extra upgrade-trigger budget for every target. Enemy projectiles, where proposed, use their own swept travel queries rather than the player's rifle tracer.

Use the GDD's authoritative effect order: eligibility and invulnerability → snapshot pre-hit health/base damage → outgoing modifiers and cap → defense/reduction and applicable caps → direct damage → trigger-meter credit/status changes → queued secondary effects in effect-ID order → defeat and reward once. Player upgrade-reduction caps do not replace explicitly defined enemy guard rules. Recheck queued effects against valid recipients and mark secondary damage so it cannot become a new primary hit. Queue tie-breaking must be stable within a simulation tick. Resolve intentional knockback/stagger through their defined effect stage; animation cannot apply a second hit, defeat, or reward. The base benchmark has no critical hits; other damage types or new status interactions require explicit GDD definitions.

### 4.3 Exactly three weapons

Maintain exactly three production weapon definitions: `weapon_01` is the FB MSBS Grot-style rifle, `weapon_02` the boxing gloves, and `weapon_03` the Kolumna Zygmunta-inspired pillar. These are stable catalog identifiers, not three simultaneous equipment slots. Their display names can change without changing save references. Validate the production catalog against the confirmed count.

Each definition owns presentation references, supported actions, attack sequences, timing, hit behavior, movement adjustments, and tuning values. Shared execution handles targeting, attack windows, damage, and feedback. Add a specialized behavior only when an approved weapon requires it; avoid duplicating the player controller for each weapon.

The [GDD weapon specification and balance benchmark](GAME_DESIGN_TEMPLATE.md) proposes all three available before a run, one selected weapon throughout that run, and no in-run switching. The rifle has a magazine/reload cycle; gloves and pillar use repeatable melee timelines. Store ammo and reload state in the weapon runtime, and expose manual reload through the same remappable action catalog. Do not add a switching action or a fourth weapon through an upgrade.

The GDD owns the worked sustained-DPS calculation and all numerical attack data. Future validation must sum complete attack opportunities, combo pauses, recovery, and reload downtime under the same no-upgrade, equal-defense target conditions; it must reproduce equal melee DPS and the proposed lower rifle target. Burst, area damage, stagger, reach, movement restrictions, and practical attack uptime are separate measurements. Equal arithmetic DPS does not establish equal effectiveness in a moving encounter.

### 4.4 Run-upgrade definitions and execution

Use the [GDD power-up rules](GAME_DESIGN_TEMPLATE.md#9-power-ups-and-build-rules) as the sole authority for the seven sources, sample effects, choices, numerical caps, durations, and stacking. The proposed catalog includes source IDs `SRC_GOD`, `SRC_FATHERLAND`, `SRC_EAGLE`, `SRC_STREETS`, `SRC_CHOPIN`, `SRC_SKLODOWSKA`, and `SRC_KOPERNIK`; effect IDs extend the relevant source ID. The three examples for each source are a design sample, not a final production count.

| Definition / runtime record | Proposed responsibilities |
| --- | --- |
| Source | Stable source ID, display/localization references, motif/icon references, eligible upgrade IDs |
| Upgrade definition | Stable effect/source IDs; eligibility; trigger type; target query; operation and magnitude; duration; cooldown; stack key/policy/cap; exclusions; lifecycle; presentation references |
| Owned upgrade | Effect ID and schema/content version; runtime timer, remaining duration, meter remainder, charges, and any stated per-room/per-run use marker |
| Gameplay event | Simulation tick and sequence, root attack/opportunity ID, originating entity/effect, targets, pre-hit snapshot, and primary/secondary/environmental classification |
| Reward offer | Level/reward ID, already rolled choice IDs, selection/settlement state, and relevant seeded-selection state |

Definitions select supported operations rather than execute arbitrary scripts or asset callbacks. Validate units, nonnegative durations, allowed target/trigger combinations, effect references, caps, and explicit lifecycle rules. The proposed single-rank/no-duplicate ownership rule is separate from temporary stack rules inside an effect. Unsupported combinations fail content validation instead of silently accumulating effects.

Apply the GDD's damage-weighted **Impact** meter to avoid rewarding rapid attacks simply for hitting more often. Credit a primary opportunity once, on its first simulation tick dealing positive damage. Select the nearest positive-damage recipient measured from the attacker at that hit snapshot, breaking ties by stable target ID; use its pre-hit health and the attack's unmodified base damage, not upgraded or summed area damage. Later contacts by the same opportunity cannot earn another credit. Each owned effect maintains its own meter and consumes its stated threshold, retaining fractional credit; multiple earned pulses become one bounded effect application. Secondary damage, damage-over-time, reflection, and environmental damage neither refill meters nor recursively trigger upgrades. Other explicit triggers such as dodge, level entry, or encounter start have their own eligibility and cooldown, not an implied on-hit shortcut.

Run all timers in simulation time, paused with gameplay. Combine modifiers and enforce the GDD caps before applying them; consume separate barriers by earliest expiry then effect ID. Any later attack-speed effect must scale the complete cycle, including reload, and follow the defined extension cap. Cap simultaneous visual/audio feedback independently of mechanical effects so reducing effects does not change outcomes. Bound queued effect work through nonrecursive event rules, explicit stack/target limits, and deterministic application order. Meter, duplicate, trigger-origin, and lifecycle rules must be verified before adding more examples.

## 5. Enemies, encounters, levels, and biomes

Begin with enemy behavior states such as idle, acquire target, approach, telegraph, attack, recover, stagger, and defeated. Enemy data specifies movement, engagement ranges, attack definitions, and readable signals. Navigation should use the room's walkable geometry; pathfinding and local avoidance are separate responsibilities. Confirmed families are boxers in `B01`, football hooligans in `B02`, and clerks/lobbyists in `B03`; two minibosses and one presidential final boss are required. The GDD proposes the ordinary rosters, phase behaviors, vulnerabilities, and encounter compositions rather than treating them as approved counts or timings.

An encounter definition references enemy groups, spawn points, entry/exit conditions, and reward rules. The director validates spawn locations, prevents duplicate completion, and exposes remaining objective state to the HUD. Explicitly handle failed spawns, enemies outside playable bounds, and interrupted room transitions so a room cannot become permanently locked.

Use a consistent hierarchy: a **biome** groups levels with a shared setting and enemy family; a **level** is one progression stage containing rooms/encounters and an objective/exit; a **room** is a traversable spatial area within a level; an **encounter** is the combat or objective state run in that area, potentially with several waves. Loading a room does not advance a level. A boss arena is a room/encounter within an existing level, never an implicit tenth level.

| Definition | Proposed data responsibilities |
| --- | --- |
| Biome | Stable ID, ordered level IDs, environmental bundle, eligible enemy/encounter pools, entry/exit rules |
| Level | Stable ID and owning biome, room/encounter graph, objective/completion gate, reward ID, next-level reference |
| Room | Stable ID and owning level, geometry, collision, navigation, entrances/exits, spawn anchors, eligible encounters, asset bundle |
| Encounter | Stable ID, enemy/major-encounter references, waves and spawn rules, completion conditions, one-shot reward/event IDs |
| Route/run rules | Start/end conditions, ordered biome/level references, bounded encounter-variation rules, repeat restrictions, difficulty parameters |
| Enemy / major encounter | Stable ID, behavior/phase configuration, attack IDs, collision dimensions, telegraph/vulnerability presentation IDs, reward references |
| Weapon / upgrade | Canonical GDD ID, supported actions/triggers, simulation definitions and presentation references |

The [GDD content registry and nine-level overview](GAME_DESIGN_TEMPLATE.md) are authoritative for IDs and progression. The designed production configuration contains `B01` boxing gym with `B01L01`–`B01L03`, `B02` football stadium with `B02L01`–`B02L03`, and `B03` presidential palace with `B03L01`–`B03L03`; this route is not implemented in milestone 1's standalone test room. The proposed ordinary rosters use `B01_E01`–`B01_E03`, `B02_E01`–`B02_E03`, and `B03_E01`–`B03_E03`; these roster sizes are proposals. The two miniboss IDs are `B01_M01` and `B02_M01`; the final boss ID is `B03_B01`. Proposed placement attaches them to their biome's third level. Their display/narrative names are not save keys.

Store relationships by ID rather than array position. Validate missing/duplicate references, unreachable exits, incompatible encounter/room combinations, reward duplication, and impossible route constraints before loading gameplay. A project-specific content check must enforce the current three-biome, three-levels-each, nine-level configuration and the two-miniboss/one-final-boss totals. The underlying loader and route traversal accept variable-length collections; future expansion requires a deliberate content-scope change and updated validation, not magic numbers spread through gameplay code.

Propose authored room layouts and the fixed nine-level order, with bounded seeded enemy/wave/reward variation as described by the GDD. Random variation must preserve objectives, telegraph readability, navigable exits, and required major encounters. Procedural room geometry remains a separate decision. Content seeds reproduce selection only for the same content and algorithm version; store those versions with checkpoints.

## 6. Run lifecycle and persistence

Proposed flow: boot → title/settings → choose one weapon → load the starting level/room → encounter and objective progression → room transition or level completion → applicable upgrade choice → next level/biome → defeat/completion → results → preparation. The GDD proposes eight level-exit upgrade choices before the final level, with no upgrade at run start; choice generation must follow that rule rather than awarding one at every room. A separate hub and narrative conversations are not implied by this flow.

| State category | Examples | Lifetime and save policy |
| --- | --- | --- |
| Runtime-only | Collision contacts, current animation, held input, audio handles | Recreated on load; never serialized as engine objects |
| Run state | Run ID/seed and RNG state, level/room cursor and phase, selected weapon, health/ammo, owned effect IDs, fractional meters, cooldown/buff time remaining, reward offers and settlement markers | Reset on defeat/completion/abandonment under GDD rules; checkpoint at safe boundaries |
| Persistent profile | Best results, discovered upgrade descriptions, and tutorial flags in the current proposal | Survives runs; no permanent combat-power upgrades are proposed for this draft |
| Settings | Bindings, calibration, prompt family, audio/accessibility/display preferences | Independent of run/profile resets |

The GDD proposes safe-room checkpoints at room entry before combat and after reward settlement; explicit suspend is available at safe boundaries, while pause remains available during combat. An abrupt close resumes the last safe checkpoint, not arbitrary mid-attack physics. Persist a phase-tagged cleared-room/pending-offer state before presenting an upgrade choice, and commit the selected upgrade, consumed reward, and next cursor together. Reloading a pending offer must reopen the same paused choices; it cannot grant a duplicate pick or reroll them. Retain fractional Impact meters and remaining simulation-time cooldown/buff durations through a resumed run; wall-clock absence must neither earn meter credit nor expire/recharge effects. A browser close may terminate work immediately, so save at these boundaries rather than relying on an exit event.

On defeat, completion, or abandonment, clear run upgrades, their timers/meters/charges, and active offers as one settlement; settings and the proposed record/tutorial profile survive. Presentation handles and active hit windows are rebuilt only when appropriate and never serialized as live engine state. Treat changes to upgrade IDs, trigger semantics, or meter units as content/schema compatibility changes requiring migration or a clearly explained incompatible-checkpoint recovery.

Use IndexedDB for versioned local data. Browser storage is scoped to an origin, can fail on quota, and can be removed; private browsing commonly clears data when the session ends. A persistence request is not guaranteed to be granted. These limits make explicit save status and export/import useful. [MDN storage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

Proposed persistence rules:

- Keep settings, profile, and checkpoint records separate but commit related progression changes in one transaction.
- Include schema version, content version, build identifier, and a monotonically increasing save revision. Serialize stable data, not engine instances.
- Migrate supported older schemas through explicit steps; preserve a last-known-good revision. Reject a newer unsupported schema without overwriting it.
- Check imports for size, structure, valid references, and value ranges. Treat imported saves as data only. Offer a preview and explicit overwrite choice.
- Make run settlement idempotent by run ID so reloading cannot grant the same completed-run reward twice.
- If storage is unavailable, show that progress cannot be saved and allow an informed temporary session; do not report a successful save.
- Avoid concurrent writers: a second tab should offer read-only status or an explicit takeover with revision checks.
- Scope preview and release saves separately. Moving domains changes save availability; offer export/import before a hosting migration.

Cloud sync, anti-cheat, authentication, and server-authoritative progression are not part of the proposed local-save architecture.

## 7. Input and complete remapping

### 7.1 Actions and contexts

All gameplay and menu systems consume semantic actions. No system should depend directly on a hardcoded key, button number, or glyph. Action definitions include type (button, scalar, vector), context, trigger behavior, and a human-readable name. Maintain independent gameplay, menu, text-entry, and rebinding contexts so menu confirmation cannot also attack.

The [GDD controls specification](GAME_DESIGN_TEMPLATE.md) owns the proposed action set and physical defaults. Implement those defaults as editable data, not hardcoded input checks. The proposed gameplay catalog includes movement, aim, primary attack, dodge, manual rifle reload, interaction, and pause; menus additionally need navigation, confirmation/back, tabs/scrolling, and rebinding capture/cancel. Automatic reload does not remove the remappable manual action. No weapon-switch or generic secondary-attack action is implied by this draft.

The menu's actual actions must appear in the remapping screen alongside gameplay actions. If equipment rules or additional mechanics add an action, add it to the same catalog and acceptance tests.

Support keyboard keys, mouse buttons and wheel directions, controller buttons, triggers, stick axes and axis directions, plus configurable pointer/stick aiming. Allow digital inputs to compose movement/aim vectors and allow axis/button alternatives where meaningful. Show keyboard labels appropriate to the user's layout while preserving an explicit choice of physical-position versus character-based bindings. Store binding semantics so changing a displayed label does not change the binding.

### 7.2 Rebinding experience

The controls screen must be fully usable with keyboard, mouse, or a supported controller. Show current mappings, capture the next intentional input after the initiating control is released, and display a preview. Ignore stick noise; use a threshold and neutral-release step for axis capture. Provide cancel, clear, restore action defaults, and restore device-profile defaults.

Detect collisions within the same active context and offer replace, swap, or cancel. Permit deliberate shared bindings only when the affected actions can safely coexist. Different contexts may reuse a physical control. Validate the complete proposed mapping before applying it so a swap cannot leave navigation or confirmation inaccessible. Keep an on-screen recovery control reachable by pointer and a known-good recovery flow for the last working device profile.

Persist separate keyboard/mouse and controller profiles; let users label/controller-select their profiles. Do not use a transient controller index as a persistent device identity. Apply bindings immediately after confirmation and preserve the previous valid profile until the new one is saved. Reset controls must not erase other settings or progress.

### 7.3 Device lifecycle and platform boundaries

Browsers expose gamepad state and connection events; an already connected controller may become visible only after user interaction. Poll fresh state during play and do not assume the first array entry is populated. [MDN gamepad lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API)

The API's `mapping` field identifies whether a known layout is supplied. Use standard layout semantics when available; otherwise offer guided mapping and neutral button/axis labels. [MDN mapping](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad/mapping)

Proposed behavior:

- Require HTTPS in production, feature-detect gamepad availability, and offer a clear input diagnostic view. Embedded hosts must also allow the gamepad feature. [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)
- Pause and clear held actions when the active controller disconnects or the game loses focus. Keep menus usable on another device. Reconnection must not fire the action used to reconnect; require explicit resume.
- Let the player choose the active controller when several are connected. Refresh mapping after reconnect because indices can change.
- Switch prompts on deliberate input, with a small dwell/debounce window. Ignore stick drift and incidental pointer noise. Offer manual PlayStation, Xbox, or generic prompt selection.
- Offer inner/outer dead zones, stick sensitivity, axis inversion, trigger thresholds, menu-repeat timing, and hold/toggle alternatives where meaningful. Show live calibration feedback before saving.
- Keep haptics optional and detect support; their absence must not block gameplay. Pair all essential audio/haptic cues with visible cues.

**Meaning of full remapping:** every gameplay/menu action and every relevant control exposed to the page is configurable. Browsers and operating systems can reserve keys or controller system buttons; some hardware features such as motion sensors, touchpad gestures, or rumble may not be available. Do not promise they can be rebound without device testing. Explain unavailable controls in the input UI instead of silently accepting an unusable binding. DualShock 4 and Xbox USB/Bluetooth paths must each be validated on the chosen operating systems.

## 8. Presentation, accessibility, and asset pipeline

Keep camera projection, aim conversion, and world/UI coordinate conversion explicit. Use the proposed fixed orthographic isometric/top-down camera with a bounded follow offset; [art camera specifications](ART_DESIGN_TEMPLATE.md#3-camera-and-composition) own proposed pitch, yaw, scale, and framing. Render the ground plane as world X/Z with Y reserved for visual height. Convert pointer aim by intersecting its camera ray with the gameplay plane; convert stick/keyboard movement through the camera's planar basis so screen directions remain intuitive. Mesh picking must not make a wall or overhead prop redirect combat aim.

Propose foreground occlusion handling through authored visibility groups or controlled fading, and test character silhouettes behind tall props. Camera shake, hit flashes, and motion effects have adjustable intensity or off settings. Pause gameplay while controls/settings are being edited. Responsive layout must preserve readable HUD text and focus indicators at the agreed minimum window size.

Propose native HTML controls for settings and other text-heavy menus where practical, linked to the same input-action system as the game. Document ownership of browser focus between the canvas and menus. Do not claim canvas gameplay is screen-reader accessible merely because surrounding menus use semantic HTML; assess gameplay accessibility separately.

Provide UI scaling, high-contrast focus, cues that do not rely solely on color, separate Master/Effects/UI/Ambience levels, readable subtitles if dialogue is added, and reduced screen shake/flashing. Every attack telegraph, upgrade trigger, reload state, and boss vulnerability needs a visual equivalent when sound is muted. Aim assistance, difficulty assists, and game-speed options remain GDD proposals requiring review and playtesting across input devices. Store preference changes separately from run state.

The [art design draft](ART_DESIGN_TEMPLATE.md) specifies the original modern Polish urban direction, character/scarf treatment, three environment kits, and weapon/enemy/boss presentation. Detailed specifications and budgets remain proposals awaiting validation. Milestone 1 uses original procedural placeholder geometry and materials; production assets remain outside authorization. Proposed future asset pipeline:

1. Keep editable source assets separate from runtime exports. Use stable asset IDs and lowercase descriptive filenames; never couple narrative names to save IDs.
2. Use the art document's proposed units, axis/handedness conversion, origin points, rigs, clip names, attachment sockets, material conventions, and attack cue readability before volume production. Combat timing remains simulation-owned: attack start/active/recovery/cancel/reload events drive animation state and optional sound/VFX. Retiming a clip cannot move a damage window or ammo refill. If an accepted modifier changes attack speed, derive both gameplay and presentation from the same scaled timeline. Animation blending, a skipped render frame, or replayed visual markers must not duplicate events. Cosmetic scarf motion and the pillar's exaggerated silhouette never enlarge collision or create independent damage.
3. Use glTF/GLB for runtime models/materials/animations, with separate text metadata for planar collision, navigation, spawn anchors, and gameplay IDs. Babylon provides glTF/GLB loading and asset containers. [Official loading documentation](https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes/) Validate a representative rig, material, and export before standardizing the pipeline.
4. Keep levels and scene composition editable as text and make any generated exports reproducible through a documented command. Use free authoring tools for art; select them with the collaborators before production. No required visual-editor-only step may block code/build work from VS Code.
5. Load the boot/menu, selected hero/weapon, and first required gym room for initial play. Keep a small shared bundle for core HUD, essential telegraphs, upgrade icons, and common non-musical sounds; reference shared assets rather than copying them into nine level bundles. Stream biome kits and prefetch the next room/major encounter at safe boundaries without loading all nine levels at startup. Release unneeded meshes, textures, animation groups, and audio after leaving their dependency set; retries must not duplicate listeners or gameplay entities. Use 2D atlases only for appropriate UI/particle elements. Keep authored assets and generated exports distinguishable.
6. Validate missing IDs, triangle/material/texture budgets, clip names, duplicate names, licensing/attribution, and compressed transfer budgets as part of future builds. Choose Git LFS for large editable sources only after evaluating free storage limits and collaboration needs.

Propose a small number of real-time lights, restrained shadow casting, shared materials, and optional post-processing quality tiers. Decide between baked and real-time lighting after the art slice. The red-and-white scarf, distinct weapon poses, enemy anticipation, and ground danger shapes must survive low quality settings and foreground fading. Limit transparent overlap from seven-source build effects; coalesce repeated cosmetic pulses without combining their mechanical state. Readability must not depend on expensive lighting or effects. Geometry, skeletal animation, texture memory, draw calls, and shader compilation need separate profiling. Art-specific mesh/rig and initial asset sub-budgets live in [asset pipeline and budgets](ART_DESIGN_TEMPLATE.md#12-asset-pipeline-and-budgets) and must fit the global targets in section 9.

**Confirmed: no music.** There is no soundtrack, menu/combat/boss track, musical reward stinger, Chopin recording, or rhythm-game input. Chopin upgrades use their GDD mechanics, visual symbolism, and non-musical feedback. The asset manifest, audio mixer, and settings must not define a music channel or control.

Gameplay emits semantic sound events into Effects, UI, and Ambience groups under Master. The [art audio direction](ART_DESIGN_TEMPLATE.md#11-audio-direction-no-music) owns playful sound character, variation, voice limits, repetition rules, mixing priorities, and intensity controls. Enforce global/per-event voice caps and prioritize critical telegraphs over decorative impacts or ambience. Repeated rapid glove/rifle events cannot multiply loudness without bound; audio culling never removes their visible cues or gameplay effects. Ambience must also remain non-musical. Voice/dialogue production is unapproved; no separate voice system is required by this draft. Select browser-tested audio formats during the slice. Browsers may block audible playback until interaction, so provide an explicit start/audio-enable flow and handle failed resume gracefully. [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

Hidden pages can have animation callbacks suspended or timers throttled; pause the simulation and audio intentionally rather than advancing a large elapsed-time jump on return. [MDN page visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

## 9. Proposed performance targets

These are initial acceptance budgets, **not measured results or engine guarantees**. Prototype observations and available machine/browser conditions belong in the [validation report](MILESTONE_1_VALIDATION.md). Before production acceptance, record one actual Windows laptop with an integrated GPU, at least 8 GB RAM, its CPU/GPU model, OS, browser version, power mode, and display refresh rate. Review the budgets against representative 3D art and animation before content production.

| Area | Proposed target and measurement |
| --- | --- |
| Display | 60 fps target; test at 1920×1080 output and a 1280×720 low setting, with device-pixel-ratio scaling explicitly capped |
| Frame time | In a reproducible 10-minute stress encounter: at least 95% of frames within 16.7 ms and 99% within 33.3 ms; report CPU and GPU limits separately where tooling permits |
| Simulation | 60 Hz; process a newly sampled action by the next simulation step under normal frame budget; cap catch-up work at five steps before recovering |
| Responsiveness | Measure input-to-visible-response on each representative input family; proposed target ≤100 ms at the 95th percentile on baseline hardware, verified with high-speed capture or equivalent rather than inferred from frame time alone |
| First play | First interactive menu ≤5 seconds, first playable room ≤10 seconds on cold cache at 20 Mbit/s and 50 ms latency |
| Transfer | Initial playable payload ≤15 MiB compressed; stream later biome content. Reconcile the art budget against this limit before production |
| 3D content | Starting review caps: ≤150 draw calls and ≤300,000 visible triangles in the stress encounter, one shadow-casting light, and 2048-pixel maximum texture dimension unless reviewed. These are profiling hypotheses, not guaranteed hardware limits |
| Memory | After warm-up, no sustained memory growth across 20 room changes or five restarted runs; record peak process/GPU usage and establish an absolute cap after the slice |
| Loading | Prefetched room transition ≤1 second on the baseline; otherwise show progress and keep input responsive |

Define a reproducible stress encounter from the proposed GDD roster and compatible power-up combinations, with enemy/projectile/VFX counts and the selected weapon recorded separately from production encounter counts. Include the pillar's area hit, fast glove/rifle feedback, an effect-heavy build, and major-encounter telegraphs; use controlled scenarios rather than requiring every effect and boss simultaneously. Pool short-lived objects if profiling demonstrates allocation pressure; use mesh instancing, shared materials, limited transparent overdraw, reduced shadows, and effects quality tiers before compromising gameplay timing. Input sampling, hit detection, and readable attack cues take precedence over decorative effects.

## 10. Validation and compatibility matrix

Milestone 1 requires type checking, meaningful simulation/input tests, a production build, lockfile-install verification, and actual browser smoke checks. Exercise movement/aim, collision, attack/damage, dash, pause/resume, restart, resize, and lifecycle recovery; record runtime errors and measured conditions in the [validation report](MILESTONE_1_VALIDATION.md). The broader table below is a future acceptance plan, not a list of completed systems or checks.

| Layer | High-value validation |
| --- | --- |
| Game rules and weapons | Damage once per intended opportunity/target; wall blocking and melee area boundaries; cancellation/reload timing; no duplicate defeat/reward; exactly three valid weapons; reproduce the GDD no-upgrade sustained-DPS calculation including full cycles, and measure burst/area/practical uptime separately |
| Power-up rules | Validate all seven sources and every sample definition against each weapon; deterministic order/caps; ownership versus temporary stacks; positive-hit gating, fractional Impact carry, overkill/AOE normalization; secondary/DoT/reflection cannot recurse; cooldowns pause; no uncontrolled speed/reload scaling |
| Content and progression | Every reference resolves; exactly three biomes × three levels, two minibosses, one final boss; all nine level objectives/exits reachable; major encounters stay within levels; reward choices occur only at defined gates; bounded variation preserves progression; generic loaders accept revised data without adding unapproved content |
| 3D presentation | Orthographic framing at all aspect ratios; pointer-to-plane aim and camera-relative movement; rig/clip import; collision aligned with ground contacts; scarf/weapon readability; simulation events survive dropped frames and blended animations; occlusion and graphics context recovery |
| Input | Rebind every gameplay/menu action; collision swap; axis capture; persistence/reset; no sticky actions on blur/disconnect; device changes do not trigger unintended attacks |
| Persistence | Migration from supported older saves; reject future/corrupt saves safely; interrupted settlement; preserve pending offer and selected-upgrade transaction; restore meter fractions/cooldown durations and room-entry markers without regranting effects; clear run power on reset while keeping records/settings; quota/denied storage; two tabs; export/import; content-version mismatch |
| Browser lifecycle | Cold/warm load, resize, fullscreen transitions, tab hiding, focus loss, audio unlock, offline request failure, graphics context loss/recovery |
| Gameplay and accessibility | Complete the nine-level route with each weapon and supported input family; compare melee/ranged effectiveness without confusing it with benchmark DPS; settings and upgrade choices without a mouse; prompts reflect bindings; cues remain understandable with reduced effects and muted audio |
| Audio and loading | No music assets/events/channels/settings; non-musical Chopin feedback; repetition and priority caps under rapid attacks; start/unlock and volume persistence; shared/biome dependencies load once, missing-bundle retry is recoverable, safe transitions release unused assets |
| Release smoke | Hosted HTTPS build loads assets from its actual base path, saves/reloads, reconnects controller, and survives a room transition without console errors |

Confirmed launch focus: Windows desktop browsers, with other desktop operating systems later. Proposed initial test baseline: Windows 11 with current stable Chrome, Edge, and Firefox; supported OS/browser versions require final confirmation. Record exact versions at each release candidate. Evaluate macOS Safari/Chrome and Linux Firefox/Chrome in the later desktop phase; mobile browsers remain a separate decision. Engine support lists alone are insufficient evidence of game compatibility.

For **every approved OS/browser combination**, record the following rows separately:

| Input configuration | Required checks | Current status |
| --- | --- | --- |
| Keyboard + mouse | Non-US keyboard layout, alternate buttons/wheel, menu-only keyboard use, browser reserved shortcuts | Prototype checks are recorded separately; full remapping/layout matrix remains pending |
| DualShock 4 over USB | Mapping, both sticks/triggers, complete remapping, prompts, cold connection, disconnect/reconnect | Untested |
| DualShock 4 over Bluetooth | Same tests; reconnect after sleep; record adapter/OS behavior | Untested |
| Xbox One controller over USB | Same mapping/rebinding/lifecycle tests; record exact hardware revision | Required family; revision TBD; untested |
| Xbox One controller over Bluetooth | Same tests using a Bluetooth-capable revision; verify device capability before enrollment | Required transport on compatible hardware; revision TBD; untested |
| Xbox Series controller over USB | Same mapping/rebinding/lifecycle tests; record exact hardware revision | Required family; revision TBD; untested |
| Xbox Series controller over Bluetooth | Same tests plus reconnect after sleep; record firmware and Bluetooth adapter | Required transport; revision TBD; untested |
| Multiple devices connected | Controller selection, keyboard/controller switching, no double actions, profile isolation | Simulated lifecycle checks are separate from pending physical-device/profile validation |

Automated browser tests can exercise synthetic actions and menu flows, but they do not replace physical controller checks. Record tester, date, exact device/model, firmware when known, transport, OS, browser, build ID, observed mapping, result, and limitations. Verify Bluetooth capability for each Xbox One hardware revision; a device lacking that radio cannot meet a Bluetooth test through software remapping. Mark unsupported combinations clearly rather than treating an untested row as passed. Proprietary Xbox wireless adapters are a separate optional transport, not a substitute for the required Bluetooth coverage.

## 11. Build and hosting proposal

Milestone 1 uses a reproducible Vite static build, exact dependency versions and lockfile, type checks, game-rule/input tests, a production build check, and browser smoke tests. The [README](../README.md#run-locally) documents install, development, checks, and preview commands. Ordinary development needs no separate scene editor. Serve bundled dependencies and hashed build assets without a runtime CDN. Future save/content compatibility remains separate from cache versions.

**Proposed first host: GitHub Pages** for a static browser build; it serves HTML, CSS, and JavaScript from a repository and is available for public repositories on GitHub Free. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

Use `Dev` for ongoing work and reviewed promotion to `Main` for a release candidate, following [collaboration workflow](COLLABORATION.md). The authorized milestone ends with a pushed `Dev` commit and an unmerged review PR against `Main`, with `Dev` active. A later deployment workflow could publish build artifacts from reviewed `Main` without adding a permanent branch; configure the actual repository subpath and test deep asset URLs then. Milestone 1 permits local development/preview and a build artifact only: no public deployment or hosting workflow is authorized.

Prefer first-party HTTPS hosting for the first compatibility pass. Embedded distribution is a later test target because focus, controller permissions, storage, and fullscreen behavior may differ. If Godot with threads is selected, reassess the host's cross-origin isolation support before choosing that export mode. Keep production saves distinct from development origins; do not promise automatic transfer between them.

PWA/offline caching, custom domains, analytics, and remote services need separate scope decisions. A future release should include a version display and a way to recover from stale assets or an interrupted update.

## 12. Risks and proposed implementation milestones

| Risk / dependency | Consequence | Next resolving step |
| --- | --- | --- |
| Proposed 3D art/animation treatment unvalidated | Geometry, shader, scarf/weapon readability, and export budgets might change | Prototype one representative model, rig, room, and orthographic visual treatment after implementation approval |
| Code-first workflow versus asset production | Asset editing may need specialized free tools even when code lives in VS Code | Agree a reproducible asset export process and keep gameplay/scene composition text-based |
| Controller/browser variation | Some bindings or devices may behave differently | Run physical USB/Bluetooth matrix before content production |
| Full remapping complexity | Player can become unable to navigate menus | Build context-aware rebinding and recovery early; test every action |
| Combat feel and equal baseline DPS | Correct arithmetic may hide the pillar's area value, melee exposure, or rifle uptime advantage | Reproduce the GDD benchmark, then compare moving-target and mixed-encounter results with placeholder assets |
| Upgrade interactions and persistence | Rapid hits, area hits, recursion, or checkpoint reloads may grant unintended power | Validate weighted meters, caps, stable effect order, trigger-origin rules, and safe reward transactions before expanding the sample catalog |
| Nine-level production effort | Confirmed counts do not establish room density, art cost, or reliable production estimates | Keep the exact 3×3 scope explicit; estimate after a representative level, major encounter, and all three weapon behaviors are accepted |
| Browser persistence limitations | Lost/duplicated progress | Checkpoint transactions, explicit save status, versioning, export/import, and failure tests |
| Asset and effect density | Loading and frame budgets exceeded | Validate a representative encounter on baseline hardware before asset multiplication |
| Small-team concurrent edits | Merge conflicts and inconsistent decisions | Small reviewed changes, explicit file ownership during parallel work, decision log |

| Milestone | Deliverable and exit condition |
| --- | --- |
| 0 — Design baseline | Populated game/art drafts and aligned technical/supporting documents; exact content scope, measurable weapon benchmark, seven-source sample system, no-music direction, and unresolved decisions |
| 1 — Authorized technical slice | One procedural gym room/player, movement/aim/dash/collision, boxing-glove attacks and dummy, initial keyboard/mouse and standard gamepad actions, safe start/pause/restart; type checks, simulation/input tests, build, lockfile install, browser smoke, observed performance. Record unavailable physical-controller/browser checks explicitly; they remain pending rather than blocking independently verifiable work |
| 2 — Input and combat foundation | Complete gameplay/menu action mapping, rebinding and recovery; all three proposed weapon behaviors and benchmark measurement; pause/disconnect/focus robustness; readable enemy encounter |
| 3 — Run and content foundation | Distinct biome/level/room/encounter data with the nine-level configuration; versioned safe checkpoints, upgrade definitions/order/weighted triggers, stable reward offers, transitions, results, and failure recovery |
| 4 — Representative vertical slice | The GDD's proposed playable subset with original 3D art and non-musical audio; selected upgrades and a major encounter; measured stress, loading, and controller results against the acceptance targets |
| 5 — Production and release preparation | Complete the confirmed nine levels, two minibosses, and final boss; agree the final upgrade count separately from samples; balance/accessibility passes; validate saves/hosting; review release candidate from `Dev` into `Main` |

Only milestone 1 is currently authorized. Milestones 2–5 need a later implementation request. Re-estimate production after design review and measured prototype results; proposed art specifications, baseline hardware, browser versions, and final tuning still need validation. Consult the [validation report](MILESTONE_1_VALIDATION.md) for evidence; arithmetic, automated/simulated input, browser checks, physical hardware, and rights clearance remain distinct categories.
