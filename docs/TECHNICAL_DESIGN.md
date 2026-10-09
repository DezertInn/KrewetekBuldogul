# KrewetekBuldogul — Technical Design

Status: initial planning document; no implementation authorized in this phase.

Prepared: 2026-10-09.

Technology recommendation: **TypeScript + Babylon.js**, subject to a browser performance slice; real-time 3D graphics with a fixed isometric/top-down presentation.

## 1. Scope and decision status

This document describes a feasible browser game architecture and the questions that must be resolved before implementation. It is a design proposal, not a claim that systems, compatibility, or performance have already been implemented or tested. The project currently contains documentation and directory structure only.

**Confirmed** means explicitly required by the project brief. **Proposed** means a recommended starting point requiring design review. **TBD** means intentionally unresolved. Unless identified as confirmed or as an externally documented platform fact, the architecture and budgets below are proposed.

| Area | Confirmed requirement | Proposed starting point / unresolved detail |
| --- | --- | --- |
| Genre | Action roguelite; Hades is the gameplay reference | Responsive movement, readable attacks, room encounters, and repeated runs. Specific Hades mechanics are not automatically requirements. |
| Presentation | 3D graphics presenting as 2D isometric top-down; Hades 2 is the visual/production reference | Technical interpretation: real-time 3D assets, fixed orthographic camera, and a 2D gameplay plane. Exact angle and art style TBD. This does not assert how Hades 2 is implemented internally. |
| Player | One main playable character | Identity, appearance, narrative, and abilities TBD |
| Weapons | Exactly three weapons | Stable identifiers `weapon_01`, `weapon_02`, `weapon_03`; names, mechanics, acquisition, and equipment rules TBD |
| World | Levels grouped into biomes | Biome count and levels per biome remain TBD; authored rooms with optional seeded selection proposed |
| Input | DualShock 4, Xbox One/Series controllers, keyboard and mouse; customizable gameplay and menu controls; USB and Bluetooth | Browser-exposed controls must be remappable; exact hardware revisions and firmware must be recorded during validation |
| Delivery | Windows desktop browsers first; other desktop systems later | Browser versions and baseline hardware TBD; mobile scope unconfirmed |
| Development | Free tools; development through Codex in Visual Studio Code | Code-first scenes/data and repeatable command-line workflows; no required paid editor or visual-editor-only build step |
| Creative design | Character, theme, story, and art direction supplied later | See [game design template](GAME_DESIGN_TEMPLATE.md) and [art design template](ART_DESIGN_TEMPLATE.md) |

Assume one local player for initial architecture. Multiplayer, accounts, cloud saves, online services, touch controls, native releases, and offline installation are not part of the proposed first milestone; their product scope remains open. Browser play does not imply mobile touch support.

Use [decisions and open questions](DECISIONS_AND_OPEN_QUESTIONS.md) to approve or replace proposals. The 3D presentation, Windows-first delivery, controller families, and VS Code workflow are now clarified. Exact camera parameters, hardware baseline, and supported browser versions remain to be validated. Final content counts are not prerequisites for this architecture.

## 2. Technology selection

### 2.1 Options

The comparison separates documented capabilities from engineering judgment. Relative workflow and project-fit assessments are recommendations, not measured performance results. Documentation was checked on 2026-10-09; exact compatible dependency versions must be selected and pinned when implementation is authorized.

| Option | Documented capabilities | Project-fit assessment and tradeoffs |
| --- | --- | --- |
| **TypeScript + Babylon.js — recommended** | Browser 3D engine with TypeScript support, modular packages, asset tooling, and Apache-2.0 licensing. [Official repository](https://github.com/BabylonJS/Babylon.js) WebGL/WebGPU rendering, skeletal animation, scene picking, and an inspector are available. [Engine specifications](https://www.babylonjs.com/specifications/) | Best fit for actual 3D graphics and code-first browser development in VS Code. Author scenes and gameplay rules in text; import models and animations. Modular loading can limit downloaded features, but real payload and GPU cost need measurement. Browser tools and isolated simulation tests support debugging. Native packaging remains a separate future evaluation. |
| **GDScript + Godot — alternative** | Web export uses WebAssembly, WebGL 2, and the Compatibility renderer. Current Godot 4 C# projects cannot export to web. Single-threaded export is the preferred default; threaded export needs cross-origin isolation. [Web export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) The engine is MIT-licensed. [License](https://godotengine.org/license/) | Viable 3D option if integrated animation/scene tools or future native exports become more important. GDScript and text resources can be versioned, but the normal editor workflow adds another tool to the requested VS Code process. Compare WebAssembly/asset payload and export latency with the same scene; no size estimate is assumed. |
| **TypeScript + Phaser — scope-changing alternative only** | 2D browser framework with TypeScript support, MIT licensing, and desktop packaging through additional tools. [Official repository](https://github.com/phaserjs/phaser) | Could display sprites prerendered from 3D assets, but is not the primary choice for the chosen runtime-3D interpretation. Requires explicit approval to change that interpretation. Frame atlases can trade geometry cost for large texture downloads and directional-animation workloads. Text-based development is convenient, but that does not outweigh the mismatch with the clarified presentation. |

For Babylon.js, put the browser's keyboard/pointer/gamepad input behind a project-owned action layer and keep camera controls disconnected from those default handlers during gameplay. Engine input helpers are building blocks, not a complete remapping product. Godot's input actions provide an alternative starting point. Every option still depends on the browser's controller behavior and needs the acceptance matrix in section 10. [Godot input actions](https://docs.godotengine.org/en/stable/tutorials/inputs/input_examples.html), [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API)

All three engine/framework options can be evaluated without purchasing an engine license. Use free tooling and no required paid plugins or assets. Hosting, distribution, and optional services must be reviewed against the free-tool constraint before adoption; this is not a promise that existing account subscriptions or future services have no cost. The game repository's own license and asset licenses are separate decisions; no game license is selected by this recommendation. Preserve dependency notices when distributing.

### 2.2 Recommendation and reversal criteria

Recommend **TypeScript + Babylon.js**, with a conventional static web build and a lightweight build tool selected later. The recommendation follows the clarified 3D presentation and code-first workflow; it remains subject to the first performance/compatibility slice. Keep the current repository engine-neutral: do not install packages, generate configuration, or create a starter game during this phase.

The proposed implementation uses real-time 3D models, materials, lighting, and animation viewed through a fixed orthographic camera. Movement and hit resolution stay on a 2D ground plane; visual height does not imply jumping, free camera rotation, or full 3D physics. This is our technical interpretation of the requested Hades 2-style presentation, not a verified description of that game's engine. TypeScript should make data contracts and agent-authored changes reviewable in VS Code.

Propose WebGL 2 as the initial rendering baseline; evaluate WebGPU later without making it a minimum requirement. Author scene composition and level definitions in text so Codex can edit them from VS Code. Keep optional inspectors as diagnostic tools, not required sources of hidden project state. Imported production art will still need an agreed free asset-authoring process; code generation alone does not guarantee finished character animation or final art quality.

Revisit the choice before implementation if:

- Browser 3D performance or the required animation pipeline proves unsuitable: compare Babylon.js with Godot using the same representative encounter.
- The collaborators change their workflow preference and native desktop becomes equally important: favor a Godot evaluation.
- Target hardware, browser coverage, or art density cannot meet the proposed budgets: test a representative slice before committing to a production pipeline.

Select one tested release of the chosen engine with matching documentation rather than mixing tutorials and APIs across versions. No exact release is pinned in this planning-only repository.

## 3. System responsibilities and boundaries

Use a small modular architecture, not a general-purpose engine layered over the selected engine. Game rules should be testable without drawing a frame. Rendering and audio consume gameplay events; they do not decide whether an attack hits or a reward is granted.

| System | Owns | Interface / information exchanged |
| --- | --- | --- |
| Application flow | Boot, title, settings, run preparation, active run, results | Requests scene transitions and loading; creates/disposes run services |
| Input actions | Device samples, bindings, contexts, calibration, prompts | Produces movement/aim vectors and pressed/held/released actions; never changes health directly |
| Simulation | Character state, movement, attack timing, damage, effects | Consumes action snapshots and content definitions; emits gameplay events |
| Encounter director | Spawn scheduling, active enemies, completion conditions | Starts validated encounter definitions; reports completion once |
| Run director | Route, run seed, chosen weapon, run rewards, transitions | Owns temporary progression and asks persistence to checkpoint at defined boundaries |
| Content catalog | Definitions for weapons, enemies, rooms, biomes, rewards | Resolves stable IDs; validates references and content versions |
| Presentation | Fixed orthographic camera, 3D models/materials, HUD, animation, VFX, sound | Maps ground-plane state into the 3D scene; responds to named events with asset IDs |
| Persistence/settings | Profile, settings, checkpoints, migrations | Validates and saves data; reports recoverable storage failures |
| Browser adapter | Focus, visibility, fullscreen, storage, device availability | Converts platform events into application events |

Example interaction: a bound physical input becomes an Attack action; the simulation validates the player's current state and cooldown; the weapon's attack timeline opens a hit window; damage resolution emits a hit event; presentation plays feedback; the encounter director observes defeated enemies and completes the encounter when its explicit conditions are met.

Propose a 60 Hz fixed simulation step with rendering independent of simulation frequency. Read current input before the next simulation step; retain edge events until consumed so quick presses are not lost. Limit catch-up work after a long stall; pause on hidden/unfocused gameplay and require explicit resume. A reproducible content seed is useful for debugging, but cross-browser bit-for-bit simulation determinism is not promised.

For implementation, subdivide future source only as needed into application, gameplay, input, content, presentation, persistence, and platform responsibilities. The current empty source/assets/tests directories do not commit to a framework-specific layout.

## 4. Character, combat, and weapons

### 4.1 Movement and player state

Represent one player entity with position, facing/aim, health, movement state, current weapon ID, attack state, and temporary modifiers. Separate movement direction from aim. Keyboard movement is normalized so diagonals do not move faster; analog magnitude may control speed if the game design approves it.

Propose states for locomotion, attack, dodge, hit reaction, and defeated, with explicit transition rules. Dash/dodge, invulnerability, attack cancellation, input buffering, and knockback are proposals to tune through playtesting. Define their timing in simulation units and document cancel windows in weapon data. Do not let animation playback speed silently alter combat timing.

Use simple 2D collision shapes on the ground plane for navigation and explicit attack/hurt regions for combat. Keep rendered mesh bounds, animation bones, and visual height separate from authoritative collision. Collision layers distinguish walls, player, enemies, projectiles, triggers, and attack queries. Fast projectiles and dashes need swept collision or equivalent tests to avoid passing through thin obstacles. A general 3D physics package is not required by this proposal; select a free planar collision approach during the slice and add vertical gameplay only if approved.

### 4.2 Damage and attack resolution

An attack definition describes anticipation, active windows, recovery, reach/shape, damage parameters, displacement, and optional projectile/effect references. A hit record identifies attacker, attack instance, target, and simulation tick. Track targets already hit by that attack so a single active window cannot apply accidental repeated damage. Intentional multihit attacks must specify their repeat interval.

Resolve eligibility, invulnerability, mitigation, damage, knockback, defeat, and rewards in a documented order. Emit one authoritative defeat event per entity and grant each encounter reward once. Damage types, status effects, critical hits, friendly fire, and stacking rules remain TBD; support extension through explicit definitions instead of implementing speculative systems now.

### 4.3 Exactly three weapons

Maintain three production weapon definitions, identified as `weapon_01`, `weapon_02`, and `weapon_03` until the game design names them. These are catalog identifiers, not three simultaneous equipment slots. Validate the approved production catalog against the confirmed count.

Each definition owns presentation references, supported actions, attack sequences, timing, hit behavior, movement adjustments, and tuning values. Shared execution handles targeting, attack windows, damage, and feedback. Add a specialized behavior only when an approved weapon requires it; avoid duplicating the player controller for each weapon.

Propose selecting one weapon before a run for the first playable slice. Whether weapons unlock, can be switched during a run, use ammunition, or share a special attack remains TBD. Do not create weapon-switch controls until the equipment rule is approved. The GDD must make the three weapons meaningfully distinct before balance work begins.

## 5. Enemies, encounters, levels, and biomes

Begin with enemy behavior states such as idle, acquire target, approach, telegraph, attack, recover, stagger, and defeated. Enemy data specifies movement, engagement ranges, attack definitions, and readable signals. Navigation should use the room's walkable geometry; pathfinding and local avoidance are separate responsibilities. Bosses, enemy families, and their counts remain TBD.

An encounter definition references enemy groups, spawn points, entry/exit conditions, and reward rules. The director validates spawn locations, prevents duplicate completion, and exposes remaining objective state to the HUD. Explicitly handle failed spawns, enemies outside playable bounds, and interrupted room transitions so a room cannot become permanently locked.

| Definition | Proposed data responsibilities |
| --- | --- |
| Room/level | Stable ID, biome eligibility, geometry, collision, navigation, entrances/exits, spawn anchors, encounter reference, asset bundle |
| Biome | Stable ID, eligible room pool, environmental assets/audio, encounter/reward pools, route constraints, transition rules |
| Route/run rules | Start/end conditions, biome ordering/selection, room selection rules, repeat restrictions, difficulty parameters |
| Enemy | Stable ID, behavior configuration, attack IDs, collision dimensions, presentation IDs, rewards |
| Weapon | One of three stable IDs, action/timing definitions, tuning, presentation and effect references |

Store relationships by ID rather than array position. Validate missing references, unreachable exits, incompatible encounter/room combinations, and impossible route constraints before loading gameplay. The biome registry and route rules must accept variable collection lengths. **Biome count and levels per biome stay TBD and must not be hardcoded.**

Propose authored rooms first, with seeded selection as a later run-variety option. Procedurally generating room geometry is a separate product/technical decision. Content seeds reproduce selection only for the same content and algorithm version; store those versions with checkpoints.

## 6. Run lifecycle and persistence

Proposed flow: boot → title/settings → run preparation → load room → encounter → reward/exit → next room or biome → defeat/completion → results → preparation. A hub, narrative conversations, and permanent upgrades are possible design choices, not confirmed features.

| State category | Examples | Lifetime and save policy |
| --- | --- | --- |
| Runtime-only | Collision contacts, current animation, held input, audio handles | Recreated on load; never serialized as engine objects |
| Run state | Run ID/seed, route position, selected weapon, health, temporary modifiers, earned run rewards | Reset when a run ends; checkpoint at approved safe boundaries |
| Persistent profile | Approved unlocks, records, progression, tutorial flags | Survives runs; only add fields for approved progression mechanics |
| Settings | Bindings, calibration, prompt family, audio/accessibility/display preferences | Independent of run/profile resets |

Propose checkpointing at completed room transitions rather than saving arbitrary mid-attack physics. Suspend/resume behavior, defeat penalties, and rewards retained after failure require GDD approval. A browser close may terminate work immediately, so save when a checkpoint is reached instead of relying on an exit event.

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

The following mappings are **proposed defaults for discussion**, not approved mechanics or fixed bindings:

| Action | Keyboard/mouse proposal | DualShock 4 proposal | Xbox proposal |
| --- | --- | --- | --- |
| Move | WASD | Left stick | Left stick |
| Aim | Pointer | Right stick | Right stick |
| Primary attack | Left mouse button | R2 | RT |
| Dodge, if approved | Space | L2 | LT |
| Secondary action, if approved | Right mouse button | R1 | RB |
| Interact | E | Cross | A |
| Pause | Escape | Options | Menu |
| Menu navigation | Arrow keys / pointer | D-pad or left stick | D-pad or left stick |
| Menu confirm / back | Enter / Escape | Cross / Circle | A / B |
| Menu tabs / scrolling | Remappable keys / wheel | L1/R1 and stick | LB/RB and stick |

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

Keep camera projection, aim conversion, and world/UI coordinate conversion explicit. Use a fixed orthographic isometric/top-down camera with a bounded follow offset; exact pitch, yaw, and framing are art/readability decisions. Render the ground plane as world X/Z with Y reserved for visual height. Convert pointer aim by intersecting its camera ray with the gameplay plane; convert stick/keyboard movement through the camera's planar basis so screen directions remain intuitive. Mesh picking must not make a wall or overhead prop redirect combat aim.

Propose foreground occlusion handling through authored visibility groups or controlled fading, and test character silhouettes behind tall props. Camera shake, hit flashes, and motion effects have adjustable intensity or off settings. Pause gameplay while controls/settings are being edited. Responsive layout must preserve readable HUD text and focus indicators at the agreed minimum window size.

Propose native HTML controls for settings and other text-heavy menus where practical, linked to the same input-action system as the game. Document ownership of browser focus between the canvas and menus. Do not claim canvas gameplay is screen-reader accessible merely because surrounding menus use semantic HTML; assess gameplay accessibility separately.

Provide UI scaling, high-contrast focus, cues that do not rely solely on color, separate master/music/effects levels, readable subtitles if dialogue is added, and reduced screen shake/flashing. Aim assistance, difficulty assists, and game-speed options need explicit GDD decisions and playtesting across input devices. Store preference changes separately from run state.

Final art direction remains TBD within the confirmed 3D presentation. Proposed asset pipeline:

1. Keep editable source assets separate from runtime exports. Use stable asset IDs and lowercase descriptive filenames; never couple narrative names to save IDs.
2. Define model units, axis/handedness conversion, origin points, skeletal rigs, animation clip names, attachment sockets, material conventions, and attack cue readability in the art document before volume production. Combat timing remains simulation-owned; animation follows those timelines.
3. Use glTF/GLB for runtime models/materials/animations, with separate text metadata for planar collision, navigation, spawn anchors, and gameplay IDs. Babylon provides glTF/GLB loading and asset containers. [Official loading documentation](https://doc.babylonjs.com/features/featuresDeepDive/importers/loadingFileTypes/) Validate a representative rig, material, and export before standardizing the pipeline.
4. Keep levels and scene composition editable as text and make any generated exports reproducible through a documented command. Use free authoring tools for art; select them with the collaborators before production. No required visual-editor-only step may block code/build work from VS Code.
5. Load only the boot/menu and next required room/biome bundle; release unneeded meshes, textures, animation groups, and audio at safe transitions. Use 2D atlases only for appropriate UI/particle elements. Keep authored assets and generated exports distinguishable.
6. Validate missing IDs, triangle/material/texture budgets, clip names, duplicate names, licensing/attribution, and compressed transfer budgets as part of future builds. Choose Git LFS for large editable sources only after evaluating free storage limits and collaboration needs.

Propose a small number of real-time lights, restrained shadow casting, shared materials, and optional post-processing quality tiers. Decide between baked and real-time lighting after the art slice. Limit transparent overlap from particles; do not make the game's readability depend on expensive lighting or effects. Geometry, skeletal animation, texture memory, draw calls, and shader compilation need separate profiling.

Gameplay emits semantic sound events, routed to music, effects, and UI buses with limits on repeated simultaneous sounds. Select browser-tested audio formats during the slice. Browsers may block audible playback until interaction, so provide an explicit start/audio-enable flow and handle failed resume gracefully. [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)

Hidden pages can have animation callbacks suspended or timers throttled; pause the simulation and audio intentionally rather than advancing a large elapsed-time jump on return. [MDN page visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

## 9. Proposed performance targets

These are initial acceptance budgets, **not measured results or engine guarantees**. Before the implementation slice, record one actual Windows laptop with an integrated GPU, at least 8 GB RAM, its CPU/GPU model, OS, browser version, power mode, and display refresh rate. Review the budgets against representative 3D art and animation before content production.

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

Use a defined stress encounter with its enemy/projectile/VFX counts recorded when the combat design is known. Avoid inventing production encounter counts now. Pool short-lived objects if profiling demonstrates allocation pressure; use mesh instancing, shared materials, limited transparent overdraw, reduced shadows, and effects quality tiers before compromising gameplay timing. Input sampling, hit detection, and readable attack cues take precedence over decorative effects.

## 10. Future validation and compatibility matrix

No implementation tests can run during this documentation-only phase. The following are future acceptance criteria, not completed checks.

| Layer | High-value validation |
| --- | --- |
| Game rules | Damage once per intended hit; cancellation windows; no duplicate defeat/reward; three valid weapon definitions; run reset does not erase profile/settings |
| Content | Every referenced asset/definition resolves; routes can reach an end; zero missing spawn/exit references; varying biome/room counts require no code changes |
| 3D presentation | Orthographic framing at all aspect ratios; pointer-to-plane aim and camera-relative movement; rig/clip import; collision aligned with ground contacts; occlusion and graphics context recovery |
| Input | Rebind every gameplay/menu action; collision swap; axis capture; persistence/reset; no sticky actions on blur/disconnect; device changes do not trigger unintended attacks |
| Persistence | Migration from supported older saves; reject future/corrupt saves safely; interrupted settlement; quota/denied storage; two tabs; export/import; version mismatch |
| Browser lifecycle | Cold/warm load, resize, fullscreen transitions, tab hiding, focus loss, audio unlock, offline request failure, graphics context loss/recovery |
| Gameplay and accessibility | Complete a representative run flow entirely by each supported input family; settings without a mouse; prompts reflect bindings; cues remain understandable with reduced effects and muted audio |
| Release smoke | Hosted HTTPS build loads assets from its actual base path, saves/reloads, reconnects controller, and survives a room transition without console errors |

Confirmed launch focus: Windows desktop browsers, with other desktop operating systems later. Proposed initial test baseline: Windows 11 with current stable Chrome, Edge, and Firefox; supported OS/browser versions require final confirmation. Record exact versions at each release candidate. Evaluate macOS Safari/Chrome and Linux Firefox/Chrome in the later desktop phase; mobile browsers remain a separate decision. Engine support lists alone are insufficient evidence of game compatibility.

For **every approved OS/browser combination**, record the following rows separately:

| Input configuration | Required checks | Current status |
| --- | --- | --- |
| Keyboard + mouse | Non-US keyboard layout, alternate buttons/wheel, menu-only keyboard use, browser reserved shortcuts | Untested |
| DualShock 4 over USB | Mapping, both sticks/triggers, complete remapping, prompts, cold connection, disconnect/reconnect | Untested |
| DualShock 4 over Bluetooth | Same tests; reconnect after sleep; record adapter/OS behavior | Untested |
| Xbox One controller over USB | Same mapping/rebinding/lifecycle tests; record exact hardware revision | Required family; revision TBD; untested |
| Xbox One controller over Bluetooth | Same tests using a Bluetooth-capable revision; verify device capability before enrollment | Required transport on compatible hardware; revision TBD; untested |
| Xbox Series controller over USB | Same mapping/rebinding/lifecycle tests; record exact hardware revision | Required family; revision TBD; untested |
| Xbox Series controller over Bluetooth | Same tests plus reconnect after sleep; record firmware and Bluetooth adapter | Required transport; revision TBD; untested |
| Multiple devices connected | Controller selection, keyboard/controller switching, no double actions, profile isolation | Untested |

Automated browser tests can exercise synthetic actions and menu flows, but they do not replace physical controller checks. Record tester, date, exact device/model, firmware when known, transport, OS, browser, build ID, observed mapping, result, and limitations. Verify Bluetooth capability for each Xbox One hardware revision; a device lacking that radio cannot meet a Bluetooth test through software remapping. Mark unsupported combinations clearly rather than treating an untested row as passed. Proprietary Xbox wireless adapters are a separate optional transport, not a substitute for the required Bluetooth coverage.

## 11. Build and hosting proposal

When implementation is authorized, use a reproducible static build with a pinned runtime/toolchain, lockfile, type checks, game-rule tests, content validation, and a production build check. Expose install, development server, checks, and build through documented commands usable from the VS Code terminal and Codex. The first slice must demonstrate that project setup and ordinary development do not require a separate scene editor. Serve versioned local dependencies and hashed assets; avoid relying on an unpinned runtime CDN. Keep save/content compatibility separate from cache versions.

**Proposed first host: GitHub Pages** for a static browser build; it serves HTML, CSS, and JavaScript from a repository and is available for public repositories on GitHub Free. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

Use `Dev` for ongoing work and reviewed promotion to `Main` for a release candidate, following [collaboration workflow](COLLABORATION.md). A later deployment workflow can publish build artifacts from reviewed `Main` without adding a permanent branch. Configure the actual repository subpath and test deep asset URLs. Hosting is a proposal only; this phase creates no workflow, executable build, or deployed game.

Prefer first-party HTTPS hosting for the first compatibility pass. Embedded distribution is a later test target because focus, controller permissions, storage, and fullscreen behavior may differ. If Godot with threads is selected, reassess the host's cross-origin isolation support before choosing that export mode. Keep production saves distinct from development origins; do not promise automatic transfer between them.

PWA/offline caching, custom domains, analytics, and remote services need separate scope decisions. A future release should include a version display and a way to recover from stale assets or an interrupted update.

## 12. Risks and proposed implementation milestones

| Risk / dependency | Consequence | Next resolving step |
| --- | --- | --- |
| Final 3D art/animation direction unresolved | Geometry, shader, and export budgets might change | Prototype one representative model, rig, room, and orthographic visual treatment after implementation approval |
| Code-first workflow versus asset production | Asset editing may need specialized free tools even when code lives in VS Code | Agree a reproducible asset export process and keep gameplay/scene composition text-based |
| Controller/browser variation | Some bindings or devices may behave differently | Run physical USB/Bluetooth matrix before content production |
| Full remapping complexity | Player can become unable to navigate menus | Build context-aware rebinding and recovery early; test every action |
| Combat feel | Technically correct gameplay may still feel unresponsive | Playtest input, timing, readability, and camera with placeholder assets |
| Unknown content scope | Premature production estimates become misleading | Keep counts data-driven; estimate after a representative room and weapon are accepted |
| Browser persistence limitations | Lost/duplicated progress | Checkpoint transactions, explicit save status, versioning, export/import, and failure tests |
| Asset and effect density | Loading and frame budgets exceeded | Validate a representative encounter on baseline hardware before asset multiplication |
| Small-team concurrent edits | Merge conflicts and inconsistent decisions | Small reviewed changes, explicit file ownership during parallel work, decision log |

| Milestone | Deliverable and exit condition |
| --- | --- |
| 0 — Current planning phase | Project/repository structure, design documents, technology comparison, collaboration instructions; no game implementation |
| 1 — Technical slice, after explicit implementation request | Validate Babylon.js recommendation and orthographic 3D interpretation; one character with placeholder movement/attack on a 2D plane; one 3D test room; keyboard/mouse, DualShock 4, Xbox One and Series over required transports; initial Windows browser compatibility and performance measurements |
| 2 — Input and combat foundation | Complete gameplay/menu action mapping, rebinding and recovery; first approved weapon behavior; pause/disconnect/focus robustness; readable damage and enemy encounter |
| 3 — Run and content foundation | Data-driven room/biome route, versioned saves, transitions, results, failure recovery; all three approved weapon definitions and their distinct behavior |
| 4 — Representative vertical slice | Approved sample biome content and art/audio pipeline; actual content counts remain design decisions; stress encounter and controller matrix meet acceptance targets |
| 5 — Production and release preparation | Add agreed content, balance/accessibility passes, validate saves/hosting, review release candidate from `Dev` into `Main` |

No milestone beyond phase 0 authorizes work now. Re-estimate milestones and technical risks once the game design, detailed art direction, baseline hardware, and browser versions are known.
