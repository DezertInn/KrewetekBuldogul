# KrewetekBuldogul — Game Design Draft

**Document status:** Design draft with authorized milestone 2 combat foundation, 2026-10-09. The supplied creative brief is **Confirmed**; all names, story details, mechanics, quantities beyond that brief, and numerical tuning below are **Proposed** unless explicitly marked otherwise. **TBD** identifies an unresolved decision. The [milestone 2 prototype rules](#64-authorized-milestone-2-combat-foundation) preserve the accepted milestone 1 feel; they do not approve final production balance. The [current validation report](MILESTONE_2_VALIDATION.md) records checks separately from the [historical milestone 1 report](MILESTONE_1_VALIDATION.md).

**Design owner / approval:** TBD. This document owns gameplay rules, content IDs, and balance values. [Art Design](ART_DESIGN_TEMPLATE.md) owns presentation specifications; [Technical Design](TECHNICAL_DESIGN.md) owns architecture and platform validation. Cross-document decisions and prioritized open questions belong in the [decision register](DECISIONS_AND_OPEN_QUESTIONS.md). The existing filename is retained for link compatibility.

## 1. Confirmed foundation

| Area | Confirmed requirement |
| --- | --- |
| Identity and genre | KrewetekBuldogul; action roguelite with Hades as a reference for responsive combat, encounters, and repeated runs |
| Main character | One handsome, charming, funny adult Polish football hooligan; bright colors and a prominent red-and-white scarf |
| Loose inspiration | Karol Nawrocki as a loose creative reference, translated into an independently designed fictional character without direct recognizable likeness |
| Weapons | Exactly three: FB MSBS Grot assault rifle, quick boxing gloves, and a slow, strong melee pillar inspired by Kolumna Zygmunta |
| Weapon balance | Equal baseline sustained DPS for the two melee weapons; slightly lower ranged DPS |
| World scope | Three biomes with three levels each: nine levels initially; possible later expansion does not add current content |
| Biomes and major enemies | Boxing gym with boxers and one miniboss; football stadium with hooligans and one miniboss; presidential palace with clerks/lobbyists and the final boss, a president |
| Power-up sources | God, Fatherland, White Eagle with crown, Respect of the streets, Fryderyk Chopin, Maria Skłodowska-Curie, Mikołaj Kopernik |
| Presentation | 3D graphics with an isometric top-down presentation; Hades/Hades II inform readability and composition, interpreted as modern and urban |
| Audio | Cartoonish, pleasant sound effects; no music |
| Inputs | Customizable gameplay and menu actions on keyboard/mouse, DualShock 4, and Xbox One/Series; controller USB/Bluetooth validation on compatible hardware |
| Delivery and workflow | Browser deployment preferred; Windows desktop browsers first, other desktop systems later; free tools and a code-first Codex in VS Code workflow |
| Current authorization | Milestone 2 input/combat foundation: TypeScript/Babylon.js/Vite, procedural gym/player/three weapons/boxers, dummy and encounter modes, complete input customization, local settings profiles, and validation. Section 6.4 governs current prototype tuning; milestone 3 and later, production assets/audio, and deployment remain outside scope |

One local player, a fixed orthographic camera, and TypeScript + Babylon.js + Vite are approved for milestones 1–2; broader production design remains subject to review. Multiplayer, accounts, cloud saves, mobile/touch input, native builds, and a licensed real-person portrayal are not requirements. References do not authorize copying Hades characters, narrative, compositions, UI, or assets, and do not establish how Hades II renders internally.

## 2. Vision and experience

**Proposed pitch:** A charismatic scarf-wearing troublemaker punches, shoots, and swings a pocket monument through an absurd Polish city to persuade a fictional presidency to reopen the neighborhood football pitch.

The player fantasy is cheerful audacity backed by good footwork: read a threat, commit to a weapon's rhythm, slip away, and turn a new cultural power-up into a useful combat choice. Humor comes from personality, sporting rivalry, impossible paperwork, and exaggerated situations. Ordinary Polish people, religious belief, or historical figures are not automatic punchlines.

| Proposed pillar | Design consequence | Evidence to collect later |
| --- | --- | --- |
| Read, commit, recover | Every damaging enemy action has an identifiable preparation and a punishable recovery; weapon commitment differs visibly | First-time players explain what hit them and demonstrate a counter after a retry |
| Three equally useful approaches | Boxing rewards proximity, the column rewards prediction and space, and the rifle trades DPS for safety | Compare completion, damage taken, uptime, and enjoyment, rather than only dummy DPS |
| Builds change decisions | Seven sources create movement, defense, positioning, and damage combinations without extra weapon identities | Players can describe why one offered upgrade suits their current build |
| Bright urban absurdity | Sharp silhouettes and playful physical comedy carry the theme at gameplay distance | Character, enemy roles, and biome identity remain recognizable in small screenshots |
| A run fits a sitting | Target 25–35 minutes for a practiced full clear; pausing and safe-room suspension support interruptions | Measure combat, travel, reward reading, and loading separately |

**Proposed audience:** Players comfortable with action games, with assist options for newcomers. Non-graphic knockouts, exaggerated impacts, and fictional political satire are proposed content boundaries; age rating and release-language selection remain TBD. English working copy preserves Polish names; Polish/English localization is proposed, not a confirmed production commitment.

## 3. Main character and fictional story

**Proposed identity:** Borys “Błysk” Rudzki, an adult man and neighborhood football supporter whose confidence is larger than his planning ability. He is handsome, warmly charismatic, quick with a self-deprecating joke, and fiercely attached to his local pitch. His hooligan persona appears in swagger, rival chants expressed as text, and reckless sporting rivalry; it does not require real club allegiance or hate symbols.

**Proposed premise:** A fictional presidential “Committee for Perfect Public Recreation” has sealed the neighborhood pitch under an impossible stack of permits. Borys must obtain a gym coach's endorsement, win passage through the stadium's rival supporters, and carry his petition into the presidential palace. The president is a separate original fictional antagonist, referred to by title in this draft; their identity is not Karol Nawrocki. Their connection to Borys is bureaucratic opposition, not a shared biography or real-world allegation.

Repeated runs are stylized retellings of Borys's escalating attempts. Defeat returns him to a preparation screen with a short comic text response; it does not imply literal repeated deaths or require a playable hub. Success ends with the fictional president's extravagant permit machine collapsing into a harmless shower of paperwork and the pitch reopening. Ending dialogue and supporting characters remain proposals to review.

| Character specification | Proposed direction |
| --- | --- |
| Independent appearance | Original face, swept asymmetric hair, arched expressive eyebrows, a crooked smile, and an athletic but compact build; no traced face, voice imitation, campaign identity, or copied biography |
| Silhouette and outfit | Broad cropped sports jacket, tapered trousers, large trainers, and two large scarf tails; teal/yellow outfit accents contrast with the dominant red-and-white scarf |
| Personality in motion | A loose, springy stance; confident pointing when interacting; overcommitted but controlled column swings; a quick grin after a narrow escape |
| Combat expression | Gloves use nimble boxer footwork; rifle firing is brisk and exaggerated; the column briefly pulls his whole body into its recovery pose |
| Readability | Scarf, jacket mass, and weapon pose identify him before facial detail; preserve the scarf silhouette and feet/ground contact at the actual orthographic camera distance |
| Story delivery | Brief text-only exchanges before safe transitions; no modal dialogue during active enemy attacks; dialogue/voice recording is not part of this proposed first scope |

Detailed proportions, palettes, camera framing, and animation requirements are authoritative in [Art Design](ART_DESIGN_TEMPLATE.md). Likeness assessment, rifle branding, monument/reference imagery, national-symbol treatment, and asset provenance require later review recorded in the [decision register](DECISIONS_AND_OPEN_QUESTIONS.md). Stylization or a disclaimer does not establish legal clearance; this draft makes no such claim.

## 4. Core loop and run state

All rules in this section are **Proposed**.

| Timescale | Loop and meaningful decision | Completion and feedback |
| --- | --- | --- |
| Preparation | Review controls/help and choose one of all three available weapons | Start at B01L01 with full health, full rifle magazine if applicable, and no power-ups |
| Moment to moment | Move and aim independently, attack in a safe window, dash through or away from danger, reload if needed | Clear preparation/impact/recovery cues; damage and stagger feedback |
| Encounter | Read a small threat combination, prioritize support/ranged enemies, use space and weapon strengths | Defeated enemies become non-blocking; exits open only after the encounter is resolved |
| Level | Complete its authored sequence of rooms/encounters, then inspect the next level transition | One upgrade choice after each of the first eight levels; no extra reward level |
| Biome | Learn the family in level 1, combine its roles in level 2, face its major enemy in level 3 | Gym/stadium minibosses gate biome transitions; palace final boss gates the ending |
| Between runs | Review result, discovered upgrades, damage causes, and an optional help tip; choose another weapon | Knowledge and records persist; temporary combat power does not |

Victory means defeating B03_B01. Health reaching zero ends the run and returns to results; abandoning requires a clear confirmation explaining loss of current run power. There is no mandatory currency grind, weapon unlock gate, or persistent stat bonus in this first draft. Upgrade discovery records and best results may persist without affecting combat power.

Pause stops simulation, cooldowns, effects, and combat audio. Blur, hidden tab, or active-controller disconnect pauses and clears held actions; deliberate input is required to resume. Settings/rebinding always pause gameplay. Suspension is offered only in safe rooms, outside live combat. Abrupt closure returns to the last safe-room checkpoint rather than promising mid-attack continuation.

Checkpoint on entering a safe room before its encounter and after settling a reward. Store health, ammunition, route position, run seed/state, owned upgrades, fractional Impact meters, remaining cooldown/buff durations, and the pending offer or committed choice. Persist a cleared level and its already-rolled offer together; resuming must not duplicate rewards or reroll that offer. Defeat/victory settles once, clears the active run, and preserves settings/profile records. The [TDD](TECHNICAL_DESIGN.md) defines storage failures, migrations, and browser limitations.

## 5. Movement, combat, and common rules

The table below retains **Proposed production tuning inputs**, not approved final balance. For the current prototype, the [milestone 2 rules](#64-authorized-milestone-2-combat-foundation), including the retained section 6.3 overrides, take precedence; relevant unchanged rules are authorized as adjustable prototype defaults.

| Rule | Proposed definition |
| --- | --- |
| Coordinates and movement | Ground-plane combat; 1 design meter is the shared distance unit. Walk/run maximum 6 m/s; normalized keyboard diagonals, analog stick magnitude controls speed; no jump or free camera rotation |
| Health | 100 maximum health. No base armor, critical hits, stamina, damage types, friendly fire, or player stagger meter in this draft |
| Damage response | One brief reaction; 0.35 s post-hit invulnerability prevents simultaneous crowd hits. Does not add weapon damage or stagger an enemy automatically |
| Dash | Travel up to 3 m over 0.30 s in the input movement direction, or retained aim if movement is neutral; invulnerable during its first 0.15 s; 1.20 s cooldown starting at dash start; enemy bodies can be crossed, walls cannot |
| Aim | Pointer ray selects a point on the gameplay plane; right stick supplies a direction; releasing stick aim retains its last direction. No vertical targeting or free camera controls |
| Aim assistance | Optional controller target steering within a proposed 8° cone, maximum 10 m, only toward visible unoccluded enemies; never changes target through a wall. Start disabled for comparable balance tests |
| Buffering and cancellation | Buffer latest attack/dash for 0.10 s. Dash may cancel attack startup/recovery or rifle reload, never an already-open active window; canceled startup gives no hit/Impact. Retain the interrupted attack's original scheduled end time as the earliest next-attack time, so canceling recovery cannot increase attack rate |
| Combo handling | Releasing attack completes the current strike then stops; gloves reset to strike 1 after a 0.40 s gap. Continuous attack repeats the complete sequence with no extra hidden combo pause |
| Facing | Glove/column direction locks at active-window start; rifle direction is sampled for each round; turning during startup is allowed |
| Collision | Walls stop movement and rifle rays; weapons cannot hit through solid cover. Melee clips each target once per strike within the visible cone, with line of sight |
| Stagger | Ordinary enemies have 30 poise, restored after 2 s without stagger damage; reaching zero causes 0.45 s stagger, then a 1 s stagger-immunity window. Interrupts enemy preparation, not an already active hit |
| Major-enemy resistance | Minibosses/boss use 120 poise, receive 25% of ordinary stagger, and can be staggered only during recovery; 0.40 s stagger followed by 3 s immunity. No forced phase skips |
| Knockback | Stops at obstacles and does not create damage; major enemies ignore forced displacement. Enemy defeat removes collision promptly |
| Fair telegraphs | No damaging offscreen initiation; entering view alone cannot skip preparation. During ordinary mixed encounters, at most two enemies may prepare damaging attacks simultaneously |

Base damage always belongs to one identifiable attack opportunity: one rifle round, one glove strike, or one column strike. A glove combo contains four opportunities. Decorative trails, audio, and animation events never create extra hits. VFX must match the collision/range envelope; the art document defines its presentation. Dash itself cannot attack; buffered attacks wait for both dash completion and the retained attack end time. Canceling reload retains current ammunition and requires a new full reload before missing rounds return.

## 6. Exactly three weapons

The identities are **Confirmed**. Names, final production mechanics, timings, and selection rules remain **Proposed**; [section 6.4](#64-authorized-milestone-2-combat-foundation) separately records authorized prototype behavior. The proposed production rule is to choose one weapon before the run; all three are available immediately. No in-run switching, carried backup weapon, secondary attack, alternate form, or fourth weapon is included. The same attack action drives every weapon; the rifle additionally uses reload.

### 6.1 Weapon definitions

These are the retained **Proposed production** definitions. Section 6.4 authorizes relevant behavior as adjustable prototype defaults and overrides damage/timing where specified; this table does not replace the current prototype values.

| Field | weapon_01 | weapon_02 | weapon_03 |
| --- | --- | --- | --- |
| Identity and proposed display name | FB MSBS Grot assault rifle — “Błyskawica” | Boxing gloves — “Szybkie Pięści” | Kolumna Zygmunta-inspired pillar — “Kolumnator” |
| Role | Precision ranged pressure with reload planning | Fast close-range pressure and frequent repositioning | Slow committed sweeps that control a group |
| Range and shape | 12 m hitscan, first eligible target/obstacle only; cosmetic tracer | 1.5 m reach, 60° frontal cone, nearest eligible target only | 2.6 m reach, 100° frontal cone, all eligible targets once per swing |
| Sequence and base damage | 20 rounds, 18 damage each | Four strikes: 20, 20, 30, 30 damage | One 150-damage sweep |
| Startup / active / recovery | Per round: 0.05 / 0.0167 / 0.0833 s; exact 60 Hz intent 3/1/5 ticks = 0.15 s | Strikes 1–2: 0.05 / 0.05 / 0.10 s each; strikes 3–4: 0.10 / 0.05 / 0.15 s each | 0.55 / 0.15 / 0.80 s = 1.50 s |
| Movement during attack | 80% of normal movement | 70%; aim turning allowed until each strike activates | 35%; no automatic lunge outside the stated hit shape |
| Stagger per hit | 2 | 4, 4, 6, 8 | 30 |
| Knockback per hit | None | None on first three; 0.35 m on finisher | 1 m on ordinary targets |
| Resources | Magazine 20, unlimited reserve; automatic empty reload or manual reload; 1 s reload replaces missing rounds only when complete | No ammunition or stamina | No ammunition or stamina |
| Reload details | Canceling reload keeps current rounds; full restart required. Manual/automatic reload waits for the current attack's scheduled end and cannot skip recovery. Reload moves at 80% speed; manual reload of a full magazine does nothing | Reload action unavailable and shown inactive | Reload action unavailable and shown inactive |
| Strength / exposure | Range and safe uptime; narrow single-target damage, cover and reload expose weakness | Low commitment, quick response; short reach and weaker crowd coverage | Reach, cleave, stagger; long preparation/recovery and slow attack movement |
| Device aiming | Per-round pointer/right-stick direction; no homing; controller assistance follows common settings | Pointer/right-stick cone; retained stick facing is sufficient for close combat | Visible cone preview during startup uses pointer/right-stick facing; direction locks at activation |
| Animation / effects / sound brief | Shouldered aim, shot recoil, distinct reload; short readable tracer and soft cartoon pop | Four differentiated punch poses, finisher recovery; brief impact puff and rounded glove thump | Two-hand windup, heavy sweep, weighty recovery; arc and dust, low cartoon clonk without abrasive rumble |

The pillar is an exaggerated portable monument: a shortened shaft, oversized base/capital, and abstract finial that preserve the reference while remaining readable as a wielded melee object. It is not a promise to reproduce an existing photograph, sculpture scan, or exact architectural model. Rifle markings and final model detail require the art/provenance review, while the confirmed Grot reference remains intact.

### 6.2 Shared balance benchmark

**Confirmed production relationship:** melee baseline sustained single-target DPS matches; rifle is slightly lower. **Historical Proposed production numerical interpretation:** gloves 100 DPS, column 100 DPS, rifle 90 DPS (10% lower). The accepted glove feel in section 6.3 is retained in the milestone 2 prototype benchmark in section 6.4. Neither benchmark establishes approved final production balance.

The benchmark uses the same stationary, effectively unlimited-health, zero-defense target with no invulnerability, guards, knockback, power-ups, assists, critical hits, misses, dash cancels, or movement interruptions. Every eligible strike hits one target. Measure complete repeat cycles, including preparation, active time, recovery, combo boundaries, and rifle reload. These are spreadsheet-style design calculations, not application test results.

| Weapon | Complete repeat cycle | Damage / cycle | Cycle duration | Sustained DPS |
| --- | --- | --- | --- | --- |
| Grot rifle | 20 × (0.05 + 0.0167 + 0.0833) s, followed by 1 s reload | 20 × 18 = 360 | 20 × 0.15 + 1 = 4.00 s | 360 / 4 = **90** |
| Boxing gloves | Four complete strikes; repeat begins immediately after fourth recovery | 20 + 20 + 30 + 30 = 100 | 0.20 + 0.20 + 0.30 + 0.30 = 1.00 s | 100 / 1 = **100** |
| Column | Complete swing and recovery | 150 | 0.55 + 0.15 + 0.80 = 1.50 s | 150 / 1.5 = **100** |

Rifle decimal phase lengths are display-rounded; use exact 3/1/5 simulation ticks so each shot stays 9 ticks. The rifle's last recovery occurs before reload starts; first-round startup is included in every cycle. Gloves have no extra pause beyond listed recoveries. Over a common 12-second repeat horizon, the calculated totals are rifle 1,080, gloves 1,200, and column 1,200 damage, with boundary events assigned consistently to one cycle.

This does not make weapons equally effective in play. Rifle firing-only DPS is 120 before reload, column damage arrives in 150-point bursts and may hit several enemies, and gloves lose less progress when repositioning. Range, stagger, knockback, overkill, time on target, target count, defense patterns, reload choice, and dash cancellation alter realized output. Future comparisons must report sustained single-target damage, burst windows, aggregate crowd damage, and completion/survival separately. Upgrade normalization is defined in section 9.

### 6.3 Approved milestone 1 prototype overrides

**Confirmed for the milestone 1 prototype feel test, 2026-10-09:** The user authorized these changes after reporting responsive, natural movement and mouse aiming, but movement that felt too slow and glove attacks needing more reach and speed. The later milestone 2 request accepts and retains these settings under section 6.4. This earlier refinement alone did not authorize milestone 2 or final production balance.

| Parameter | Original milestone 1 default | Approved refinement |
| --- | --- | --- |
| Normal movement speed | 6.0 design m/s | **6.6 design m/s**, a 10% increase; normalized keyboard diagonals and proportional analog movement retained |
| Glove reach | 1.5 m | **1.95 m**, a 30% increase; existing 60-degree cone, nearest eligible target, obstruction checks, and visible range correspondence retained |
| Glove attack rate | One four-strike cycle per second | **1.20 cycles/s**; every startup, active, and recovery duration divided by 1.20, rather than reduced by 20% |
| Strike damage | 20, 20, 30, 30 | **Unchanged**, 100 damage per four-strike cycle |
| Attack movement multiplier | 70% of normal movement | **Unchanged**, applied to the new normal speed |
| Dash | 3 m travel, 0.30 s duration, 1.20 s cooldown, first 0.15 s invulnerable | **Unchanged**; movement tuning must not increase dash travel |

| Glove strike | Startup / active / recovery (seconds, display-rounded) | Exact durations in 60 Hz tick units | Total |
| --- | --- | --- | --- |
| 1 and 2, each | 0.0416667 / 0.0416667 / 0.0833333 | 2.5 / 2.5 / 5 | 10 ticks = 1/6 s |
| 3 and 4, each | 0.0833333 / 0.0416667 / 0.125 | 5 / 2.5 / 7.5 | 15 ticks = 1/4 s |

The complete four-strike cycle is **50 ticks at 60 Hz = 5/6 s, approximately 0.8333 s**. Preserve fractional phase boundaries across the cycle; do not independently round each phase to whole ticks or discard elapsed time at transitions. Facing locks when the active phase begins; each intended strike can hit its target only once. Existing input buffering, cancellation barriers, safe pause/resume, and combo handling remain in effect. Dash cancellation must retain the canceled strike's scheduled end so it cannot shorten attack cadence.

Under the same ideal benchmark assumptions as section 6.2, theoretical sustained glove DPS is **100 / (5/6) = 120**. Use complete cycles when measuring this override (for example, 12 cycles over 10 s yield 1,200 theoretical damage); the proposed production 12-second comparison is not the current glove acceptance target. This figure is a timing calculation, not a claim about combat effectiveness or owner acceptance of the newly tuned build. Actual check results and pending manual retests belong in the [validation report](MILESTONE_1_VALIDATION.md).

Keep the historical proposed 100/100/90 production benchmark visible for later review. The subsequent milestone 2 request reconciles prototype weapons under section 6.4, preserving equal melee baseline DPS and slightly lower rifle DPS. No upgrades or final production balance changes were authorized by this earlier refinement.

### 6.4 Authorized milestone 2 combat foundation

**Confirmed for the milestone 2 prototype, 2026-10-09:** The owner accepted the refined movement, glove reach, and punch cadence, then authorized all three weapon behaviors, full input customization with local settings profiles, and a bounded repeatable boxer encounter. This does not approve final production balance, physical hardware not explicitly tested, or any production visual alternative. The section 6.3 glove and movement settings remain in force. The older section 6.2 numbers remain historical Proposed production inputs, not the current prototype benchmark.

Choose one of the three weapons in preparation before starting a dummy or boxer test. All weapons are available immediately; no in-combat switching is implemented. Starting/restarting creates fresh health, ammunition, cooldowns, buffers, attack/reload state, enemies, and measurements. Settings/profiles persist independently. Restart and changing equipment during a paused round require confirmation; defeat/completion permits retry or return to preparation. Interact at the marked preparation station pauses the round and opens these options; it does not create a reward or level transition.

| Prototype weapon | Authorized damage and complete repeat cycle | Sustained single-target DPS | Complete cycles / damage in 60 s |
| --- | --- | --- | --- |
| `weapon_01` Grot | 21.6 damage × 20 shots, each 3/1/5 ticks at 60 Hz, then 60-tick reload; 240 ticks / 4 s per magazine cycle | **108** | 15 magazines / **6,480** |
| `weapon_02` gloves | Unchanged 20/20/30/30 damage; exact fractional phases from section 6.3; 50 ticks / 5⁄6 s | **120** | 72 combos / **7,200** |
| `weapon_03` pillar | 180 damage per 33/9/48-tick sweep; 90 ticks / 1.5 s | **120** | 40 sweeps / **7,200** |

Section 6.1's other weapon behaviors are authorized as adjustable prototype defaults: rifle 12 m single-target hitscan, 20-round magazine, unlimited reserve, manual/automatic reload and 80% movement; gloves 60-degree nearest-target cone and 70% movement with the accepted reach; pillar 2.6 m / 100-degree cleave and 35% movement. Stagger, knockback, shot/activation facing, cover, cancellation barriers, and reload rules follow sections 5 and 6.1. Actual implementation and check results are recorded separately in [milestone 2 validation](MILESTONE_2_VALIDATION.md).

Use fractional damage internally; HUD rounding cannot change health or damage calculations. Measure real fixed-step simulation over ticks `[0, 3600)`, with the next cycle beginning at tick 3600 outside the sample. The benchmark target is stationary, effectively unlimited-health, unguarded, and unarmored; disable displacement, assistance, upgrades, misses, and invulnerability. Include all recovery/reload time. A small stated floating-point tolerance may cover arithmetic representation, never a missing or extra hit. Report burst and aggregate crowd output separately; equal ideal melee DPS is not evidence of equal encounter effectiveness.

The combat test uses exactly three instances of the proposed `B01_E01` Jabber in the existing gym, separately from dummy practice. Their GDD health/damage/telegraph/poise behavior is an adjustable prototype default. Test-fixture additions are radius 0.36 m, movement 2.8 m/s, a 60-degree jab cone with a 3-tick active window, one second of initial preparation grace, and fixed starting positions `(-1.2, 1.7)`, `(1.2, 1.7)`, `(0, 3.4)` in ground-plane coordinates. At most two enemies prepare or actively attack simultaneously. Visibility and unobstructed attack checks prevent offscreen initiation and hitting through cover. Health reaching zero stops the round; killing all three completes it. These fixture choices do not approve full-level layouts or roster production.

Milestone 2 remains silent and uses original procedural placeholders. No bosses, rewards, power-ups, route progression, run saves, production assets, or public deployment are included. Production balance still needs playtesting and owner review; preserve equal melee baseline sustained DPS and slightly lower rifle DPS.

## 7. Biomes, levels, rooms, and route

**Confirmed:** B01 is the boxing gym, B02 the football stadium, B03 the presidential palace; each contains three levels. Identifiers, level names, encounter layout, rewards, and major-enemy placement below are **Proposed**.

A **biome** groups setting, enemy family, and three ordered levels. A **level** is a named progression segment with an objective, entry/exit, and one completion reward or run result. A **room** is a bounded traversal/combat space within a level; an **encounter** is one combat setup inside a room. A level may contain several rooms and encounters. Boss arenas are rooms within levels, not extra levels.

Use authored room geometry, landmarks, and navigation. For ordinary encounters, seed enemy composition, spawn anchors, and cosmetic dressing from curated compatible options; do not generate arbitrary geometry. Each ordinary level proposes two encounter rooms with safe connecting space. Each third level proposes one approach encounter and one major-enemy room. Room count is proposed and does not alter the confirmed nine-level scope. An encounter proposes 3–5 ordinary enemies, at most five alive, no unavoidable entry hit, and no new attack before spawn preparation finishes.

| Level ID / proposed title | Objective and encounter progression | Environmental identity | Completion reward and transition |
| --- | --- | --- | --- |
| B01L01 — Warm-up Floor | Learn movement/attack/dash; first Jabbers alone, then Jabber plus one Counterpuncher | Open warm-up mats, oversized mirror frames, clear coaching lanes | Upgrade pick 1; door to Heavy Bag Hall |
| B01L02 — Heavy Bag Hall | Learn to move around guards and evade a Clincher lane; combine all three boxer roles | Heavy bags mark cover edges; painted floor circles provide readable spacing | Upgrade pick 2; passage to Main Ring |
| B01L03 — Main Ring | Win one mixed boxer encounter, then defeat B01_M01 | Ring approach and a broad central ring; ropes are readable collision boundaries | Upgrade pick 3 and heal 20 health capped at maximum; endorsement text, transition to B02L01 |
| B02L01 — Concourse | Learn Rusher tackle timing, then combine Rusher with Banner Guard | Turnstiles, kiosks, and open queue lanes; no damaging ambient crowd | Upgrade pick 4; ramp to Stands |
| B02L02 — Stands | Locate Cup Throwers and cross telegraphed ground attacks; combine all hooligan roles | Broad terraces connected by readable aisles; no unsupported jumping requirement | Upgrade pick 5; tunnel toward Centre Circle |
| B02L03 — Centre Circle | Clear a field approach, then defeat B02_M01 | Bright pitch markings, broad flat arena, decorative distant crowd | Upgrade pick 6 and heal 20 capped at maximum; petition passage, transition to B03L01 |
| B03L01 — Reception | Read Stamp Clerk cones, then prioritize a Lobbyist-supported clerk | Queue rails, broad desk islands, numbered counters | Upgrade pick 7; approved form unlocks Committee Wing |
| B03L02 — Committee Wing | Evade Filing Clerk paper lines while separating support tethers; combine palace roles | Modular meeting rooms and open corridors, long sightlines broken by low furniture | Upgrade pick 8; ceremonial doors open to Grand Chamber |
| B03L03 — Grand Chamber | Survive one palace-role combination, then defeat B03_B01 | Formal antechamber and large presidential dais arena with clear floor zones | Run victory/result; no ninth upgrade, no extra biome or level |

No damaging environmental traps are proposed for this first content set; enemy-created zones supply pressure. Failed spawns and stranded enemies must not lock an exit permanently. Encounters are hand-reviewed for each weapon: a short-range player must always have a navigable approach, and a ranged player must have a way around hard cover. Levels introduce roles before combining them; procedural selection cannot place an unintroduced role earlier than its first lesson.

## 8. Ordinary enemies and major encounters

Enemy identities within the confirmed families, exact roster size, names, health, damage, timing, and phase rules are **Proposed**. Health values are starting inputs for playtests, not evidence of run duration. Telegraphs use shape, motion, and non-musical SFX together; essential threat information remains visible with audio muted.

### 8.1 Nine ordinary enemy proposals

| ID / working name | Role and starting health | Attack, telegraph, and counterplay | Weapon interactions |
| --- | --- | --- | --- |
| B01_E01 — Jabber | Chasing close-range boxer; 100 HP | Raised elbow and short floor wedge for 0.45 s, 1 m jab for 10 damage, then 0.55 s recovery; step away and re-enter | Rifle kites; gloves punish recovery; column intercepts approach but should not trade through preparation |
| B01_E02 — Counterpuncher | Defensive boxer; 140 HP | Front 120° guard reduces received damage 70%; clear 1 s guard pose, then a 0.60 s windup counter for 14 damage and 0.85 s unguarded recovery; circle or wait | Rifle must flank/wait; gloves use dash to the side; column's area does not bypass frontal defense merely because its cone is wide |
| B01_E03 — Clincher | Large boxer that closes space; 180 HP | Crouch and marked 4 m lane for 0.80 s, then a straight charge for 16 damage, followed by 1 s recovery; no grab minigame or forced input struggle | Rifle attacks after lateral evade; gloves slip around endpoint; column punishes the long stop |
| B02_E01 — Rusher | Direct hooligan tackle; 120 HP | Lean and shout-puff, 5 m lane shown for 0.65 s, tackle for 12 damage, 0.90 s recovery; dash perpendicular | Rifle tracks approach; gloves flank after the rush; column times a sweep at the endpoint |
| B02_E02 — Banner Guard | Slow hooligan cover unit; 180 HP | Frontal banner guard uses the same 70% reduction/120° arc; lifts banner for a 0.75 s, 2 m shove cone dealing 14 damage, then 1 s exposed | Rifle goes around its screen; gloves bait shove then circle; column may cleave nearby enemies but must still respect the guard |
| B02_E03 — Cup Thrower | Ranged hooligan area denial; 110 HP | Arm winds for 0.70 s; marked 1.2 m ground circle tracks player only during first 0.30 s, then locks; 0.60 s visible travel, 10 damage splash, 0.80 s recovery | Rifle interrupts exposed throw; gloves close after lock; column clears escorts before committing to thrower |
| B03_E01 — Stamp Clerk | Bureaucratic melee bruiser; 160 HP | Oversized stamp rises over a 2 m cone for 0.85 s; stamp deals 16 damage, then sticks for 1.10 s recovery | Rifle uses stuck recovery; gloves circle around cone; column counter-swings into the long opening |
| B03_E02 — Lobbyist | Support that avoids close range; 130 HP | Visible tether to one ally grants that ally 20% outgoing damage; 1 s tether setup, no direct attack; lose tether beyond 5 m or through solid cover | All weapons can attack it directly; rifle has easy target access, gloves use open routes, column cleaves escort and support when grouped |
| B03_E03 — Filing Clerk | Ranged line controller; 120 HP | Fans papers and shows three narrow lines for 0.80 s; fires three slow straight projectiles at 6 m/s, 8 damage each, then 1 s recovery; step between lines or around cover | Rifle fires through open lanes; gloves close between volleys; column waits out volley before its slower commitment |

Ordinary enemy attacks do not damage other enemies. Lobbyist buffs do not stack: one target accepts one tether. At most one Lobbyist is present in a normal encounter in this initial draft. Reinforcements, if allowed by the encounter definition, count toward the five-alive limit; no spawn is placed directly on the player.

### 8.2 Two minibosses and one final boss

| ID / role | Proposed phases and attacks | Readable vulnerability and weapon counterplay |
| --- | --- | --- |
| B01_M01 — Coach; boxing-gym miniboss, 900 HP | Phase 1 above 50% HP: clearly separated two-jab sequence (10 damage each) and 2.5 m sweep (16). Phase 2: double jab can lead into a marked 2 m center slam (20). Each sequence starts with at least 0.80 s preparation; center slam shows its final zone for 1 s | 1.20 s recovery after jabs; 1.60 s after sweep/slam. Gloves enter during recovery; column has time for one predicted sweep; rifle can reload during preparation. No adds or invulnerable attack phase |
| B02_M01 — Capo; stadium miniboss, 1,200 HP | Phase 1 above 50% HP: 4 m shout cone (14) and 6 m charge (20), each with 0.90 s preparation and 1.40 s recovery. Phase 2 adds two visible banner obstacles and summons one pair of Rushers at most once; their appearance has 1 s warning and respects the attack-concurrency limit | Charge collision with a banner ends charge and opens 1.80 s recovery. Gaps always allow gloves/column access; rifle finds lanes instead of firing through barriers. Destroying/clearing banners is not an extra weapon requirement |
| B03_B01 — President; palace final boss, 1,800 HP | Phase 1 above 66% HP: stamp cones (18) and straight paper volleys (10 each). Phase 2 at 66–33%: summon one Lobbyist once and use rotating decree sectors (16). Phase 3 below 33%: no new summons; three premarked floor zones activate in stated order (18 each). All damaging actions have at least 1 s preparation; sector/zone ordering is shown by numbers and arrows | 1.50 s opening after phase-1 pattern, 1.80 s after decree rotation, 2.20 s exhausted opening after phase-3 sequence. Remove the support tether, then punish openings. Every phase permits direct damage; no ranged immunity, mandatory parry, or weapon-specific key |

Phase thresholds are latched once, presented during a non-damaging 1 s transition, and cannot spawn duplicate adds. Finish an already active hit, cancel further preparations, then enter the next phase; do not chain an unseen attack through the transition. Major-enemy zone geometry must leave a reachable safe area within the player's movement/dash budget. Already spawned ordinary enemies remain subject to the shared concurrency limit. Boss defeat clears remaining enemy attacks before results. Detailed timings and health need later playtesting against all three weapons and representative builds.

## 9. Power-ups and build rules

The seven symbolic/cultural sources are **Confirmed**. Their mechanical roles, UI terminology, upgrade examples, numeric values, and selection rules are **Proposed**. They are sources of imagery and playstyle, not seven NPC gods; personification, dialogue, or voiced appearances are not required.

### 9.1 Shared rules

1. Offer three distinct unowned upgrades after each of the first eight levels; select one while paused. Prefer three different sources when the remaining pool allows it. The run begins with none and can end with eight. Seed and save the offer when granted; resuming shows the same offer. No extra reward after the final boss.
2. The 21 entries below are a design sample, not an approved total upgrade count. For this draft's test pool, each has one rank and the same rarity; duplicates are excluded. No rerolls, replacement, respec, upgrade currency, or rarity multiplier is proposed initially. Inspect owned effects at any safe pause.
3. Every sample supports all three weapons. Buffs explicitly state whether they change base attacks, player state, or secondary effects. Extra damage is an upgrade effect, not another equipped weapon.
4. Temporary stacks, meters, marks, barriers, and cooldowns belong to the run, persist across encounters/checkpoints with remaining simulation time, pause with gameplay, and reset at run end. A timed duration expires through active simulation, including safe-room time; menus do not consume it. Unless stated otherwise, acquisition activates an effect immediately and starts its cooldown ready.
5. Resolve a primary attack by checking eligibility/line of sight and snapshotting target health and base damage, adding outgoing percentage bonuses, applying target defenses, applying direct damage, updating hit credit/status, resolving queued secondary effects in effect-ID order, then settling defeat and rewards once. A newly applied mark/buff does not retroactively boost its triggering hit. Snapshot eligibility before effects resolve so ordering does not manufacture another trigger.
6. Outgoing percentage bonuses add and cap at +100%; player incoming reductions add and cap at 50%. Temporary barriers absorb remaining incoming damage after reduction and expire as stated; consume the barrier expiring soonest first, then effect ID for ties. Enemy frontal guards have their own documented 70% reduction and are not player upgrade reductions. No sample grants attack speed; any later proposal must cap combined speed at +25% and scale complete attack/reload cycles together.
7. Secondary damage, damage-over-time ticks, reflected/environmental damage, barriers, healing, and status expiry never generate primary-hit credit or trigger another upgrade. No recursive procs, on-kill chains, self-triggered loops, or damage-derived healing exist in this sample. Clamp health to maximum and reject negative durations/values.
8. **Impact normalization:** each successful primary attack opportunity credits each owned Impact effect with `min(unmodified base damage, primary target pre-hit health) / 100`. On the first simulation tick dealing positive damage, select the nearest positive-damage recipient measured from the attacker at that hit snapshot, then stable target ID for ties. Award once for the whole opportunity; later contacts do not award again. One column sweep awards once across its whole area; each glove strike and rifle round awards separately. A blocked/invulnerable/missed hit or one dealing zero damage awards nothing. Outgoing upgrades and extra targets do not increase credit.
9. Each Impact effect has its own meter. Consume each whole point, retain the fraction, and batch multiple whole points from one hit into a single outcome with pulse count `n`; there is no per-hit random chance. At the proposed production benchmark in section 6.2, rifle contributes 0.18 per round (0.9 pulses/s sustained), gloves 0.20/0.20/0.30/0.30 (1 pulse/s), and column 1.50 (1 pulse/s). These production rates do not describe the faster prototype override; upgrades are not implemented in milestone 1, and future normalization must be reviewed with all three weapons. A column may earn two pulses on a later swing; listed caps still apply. Overkill reduces credit instead of rewarding farming tiny targets.
10. Unless a row says otherwise: one owned copy, no rank/stacking, passive duration while owned, zero internal cooldown, and no extension from duplicate acquisition. A stated cooldown belongs to that effect, starts on its trigger, and is shared across targets; a cooldown blocks reapplication rather than silently refreshing a buff. Effects on an already defeated primary target dissipate unless the row explicitly retargets.

Normalization removes the automatic advantage of many weak hits; it does not prove identical build strength. Burst timing, missed slow attacks, overkill, support targeting, and status caps remain measurable tradeoffs. Keep raw primary damage, secondary damage, meter credit, and target count separate in future telemetry/tests.

### 9.2 Source identities

The motif column is the gameplay handoff; exact palettes/icons/audio are authoritative in [Art Design](ART_DESIGN_TEMPLATE.md).

| Source ID / confirmed source | Proposed mechanical identity and rationale | Proposed motif / non-musical feedback | Synergy, incompatibility, and balance risk |
| --- | --- | --- | --- |
| SRC_GOD — Bóg | Mercy, resilience, and calm recovery; protection rather than a weaponized depiction of a deity | Soft light arch and open hands; gentle airy puff | Pairs with movement defense and uninterrupted damage bonuses. No source lockout; incoming-damage triggers conflict behaviorally with avoiding damage. Healing/barrier caps prevent effortless immortality |
| SRC_FATHERLAND — Ojczyzna | Holding ground and rallying after effort | Woven banner folds and grounded border shapes; fabric flutter | Works with column area control and guarded firing positions. Stationary benefits compete with Chopin movement, intentionally; overlapping reductions share the 50% cap |
| SRC_EAGLE — Orzeł Biały w koronie | Reach, decisive movement, and controlled secondary strikes | Crowned wing silhouette and angular feather arcs; short air swish | Helps gloves reach and supports crowd builds. No source lockout; extra-target damage must not add Impact or recursive lightning chains |
| SRC_STREETS — Szacunek ulicy | Close pressure, confidence, and escape routes | Chalk marks and sports-tape chevrons; trainer squeak/tape snap | Suits glove pressure and column stagger. Can support an aggressive rifle style. Crowd bonuses invite damage; stagger immunity prevents permanent locks |
| SRC_CHOPIN — Fryderyk Chopin | Poise and flowing motion, with no rhythm input | Flowing ink, elegant curls, and coat-tail-like streaks; paper brush and soft shoe slide | Complements movement/range defense. Conflicts behaviorally with standing still; no beat timing, music, recording, or musical reward cue |
| SRC_SKLODOWSKA — Maria Skłodowska-Curie | Controlled accumulation and careful interaction of effects | Abstract luminous dots and laboratory-glass shapes; small rounded bubble pop | Works with steady targeting and defensive barriers. Damage-over-time is a game abstraction, not a historical claim or practical chemistry. Tick/stack caps prevent multiplication |
| SRC_KOPERNIK — Mikołaj Kopernik | Position, orbit, and changing the angle of attack | Offset orbital rings and a small central point; soft mechanical ratchet and rounded wooden click | Flanking helps every weapon and combines with Chopin mobility. No source lockout; dash reset reductions cannot trigger attacks or recursively recharge themselves |

### 9.3 Twenty-one sample upgrades

Every numerical entry is **Proposed**. IDs are stable data identifiers; display names can change without changing saves. All entries apply to rifle, gloves, and column through the shared rules. `n` means whole Impact pulses earned by that hit; “refresh” changes only the stated timer, not the listed cap.

| Effect ID / proposed name | Exact trigger and effect | Duration / cooldown / stacking |
| --- | --- | --- |
| SRC_GOD_01 — Second Breath | On entering a new level, heal 12 HP; acquisition also heals 12 once | Instant; once per distinct level entry, with acquisition consuming the current level's allowance. Reopening/reloading the same level cannot heal again; cap at maximum health |
| SRC_GOD_02 — Grace Guard | After receiving positive health damage, gain a 15-point barrier; triggering damage is already resolved | Barrier 3 s; 12 s cooldown; one barrier of this type, no stacking or refresh while cooling down |
| SRC_GOD_03 — Quiet Resolve | After 4 continuous seconds without taking health damage, gain +15% outgoing primary damage | Remains until taking health damage; then rebuild the 4 s condition; no additional cooldown or stacking |
| SRC_FATHERLAND_01 — Stand Firm | After 0.50 s with no movement displacement, gain 20% incoming damage reduction | Ends immediately on movement/dash/forced displacement; no cooldown; one modifier, subject to shared cap |
| SRC_FATHERLAND_02 — Rally Banner | Each Impact pulse adds one Rally stack; each grants +3% outgoing primary damage | Maximum 5 stacks; 8 s common timer refreshed on an earned pulse, including at cap; no cooldown; apply up to `n` stacks |
| SRC_FATHERLAND_03 — Home Ground | On encounter start, place a visible 3 m-radius circle at player entry position; being inside grants 15% incoming reduction | Circle lasts 8 s; once per encounter; does not follow player or stack with another circle; use shared reduction cap |
| SRC_EAGLE_01 — Crowned Arc | Impact deals `10 × n` secondary damage to the nearest other visible enemy within 4 m of the primary target; if none exists, use the surviving primary target | Instant; no extra cooldown; one selected target and one batched event, no chaining or Impact from it |
| SRC_EAGLE_02 — High View | Increase primary attack reach/range by 15%; melee cone angle is unchanged and cover still blocks hits | Passive while owned; no cooldown/stacking; one additive range modifier |
| SRC_EAGLE_03 — Royal Passage | Each dash extends its initial invulnerability from 0.15 to 0.25 s; total travel duration remains 0.30 s | Per dash; uses the shared dash cooldown, no extra charge/stack; walls still block |
| SRC_STREETS_01 — Earned Respect | Impact adds `8 × n` stagger to the surviving primary target | Instant; no extra cooldown; ordinary/major-enemy resistance and stagger-immunity rules apply; no damage or secondary trigger |
| SRC_STREETS_02 — Close Company | When a primary hit resolves with at least two living enemies within 3 m of the player, gain +15% damage for that hit | Hit-local snapshot; no cooldown/stacking; extra targets do not increase bonus |
| SRC_STREETS_03 — Slip Away | On dash completion, gain +15% movement speed | 2 s duration, 3 s cooldown; no stacking; dashes during cooldown do not refresh it |
| SRC_CHOPIN_01 — Poise in Motion | After 0.80 s of continuous voluntary movement, gain +20% outgoing primary damage | 2 s duration, 5 s cooldown from activation; condition must be rebuilt after cooldown; no stacking; no timed beat or input sequence |
| SRC_CHOPIN_02 — Flowing Step | Add 20 percentage points to the weapon's attack movement factor: rifle 100%, gloves 90%, column 55%; cap at normal movement speed before separate speed buffs | Passive while owned; no cooldown/stacking; does not shorten attack phases or change dash/reload timing |
| SRC_CHOPIN_03 — Composure | After taking positive health damage, gain 15% incoming damage reduction against subsequent hits | 3 s duration, 5 s cooldown; does not reduce the triggering hit; no stacking/refresh during cooldown; shares reduction cap |
| SRC_SKLODOWSKA_01 — Luminescence | Impact places up to `n` luminous stacks on the surviving primary target; each stack deals 4 secondary damage at 1, 2, and 3 s after application | Each stack expires at 3 s; maximum 3 per target; independent schedules, no refresh/replacement at cap, excess pulses discarded; ticks never proc |
| SRC_SKLODOWSKA_02 — Controlled Shield | Impact adds `2 × n` points to this effect's barrier, capped at 10 | Barrier 4 s, timer refreshed on each earned pulse; no extra cooldown; distinct from Grace Guard, whose barrier absorbs first when it expires sooner |
| SRC_SKLODOWSKA_03 — Careful Observation | Primary hits against a target already carrying Luminescence gain +15% outgoing damage | Per-hit snapshot before new stacks; no cooldown/stacking; without Luminescence this is a synergy choice whose preview says it is inactive |
| SRC_KOPERNIK_01 — Changed Perspective | Each attack opportunity marks only its canonical primary target selected by rule 9.1(8). A hit on the previously marked target from more than 90° away from its forward direction gains +20% damage, evaluated against the mark snapshot at attack start | One marked target, 3 s duration; selecting that target refreshes it, selecting another moves it. Update once per opportunity after direct damage; column cleave cannot move it between recipients. No cooldown/stacking; a newly marked target gets no bonus from that marking attack |
| SRC_KOPERNIK_02 — Returning Orbit | Impact shortens the currently remaining dash cooldown by `0.10 × n` s | Instant; cannot reduce below zero or bank future cooldown credit; no extra cooldown, no dash trigger or secondary damage |
| SRC_KOPERNIK_03 — Wider Orbit | Increase dash travel distance by 20%, from 3 to 3.6 m, while retaining 0.30 s duration and existing invulnerability | Every dash; shared dash cooldown, no stacking; sweep against walls and stop safely instead of passing through |

No pair is forbidden by source. Three deliberate tensions remain visible in tooltips: Stand Firm versus movement bonuses; reaction-to-damage effects versus Quiet Resolve; Careful Observation needing Luminescence. The offer UI must show unmet prerequisites before selection rather than promising immediate benefit. If a synergy-only choice proves consistently undesirable, revise its effect before adding reroll complexity.

## 10. Progression, controls, and accessibility

### 10.1 Run and profile boundaries

**Proposed:** Health, ammunition, upgrade ownership/stacks, active effects, and route progress belong to the current run. At preparation, health/magazine reset and no upgrade is retained. Settings, discovered descriptions, tutorial acknowledgement, and best results persist. No permanent attack/health upgrades, currency economy, unlock weapons, or additional playable characters are implied. Use the preparation menu to review knowledge without requiring another run.

### 10.2 Prototype action set and defaults

**Confirmed:** All gameplay and menu actions are customizable across supported inputs. The mappings below are editable milestone 2 defaults, not fixed controls or final production approval. The game displays current bindings rather than hardcoded glyphs. The owner accepted refined movement/reach/punch feel. The user-reported physical DualShock 4 USB success in Chrome concerns the earlier prototype; detailed per-action results and fresh milestone 2 physical testing remain pending. Other hardware/transport combinations and exact Xbox One capability still require physical validation, as detailed in the [TDD compatibility matrix](TECHNICAL_DESIGN.md#10-validation-and-compatibility-matrix).

| Context / action | Keyboard / mouse default | DualShock 4 default | Xbox default | Semantics |
| --- | --- | --- | --- | --- |
| Gameplay: move | WASD | Left stick | Left stick | Vector; digital or analog mapping; normalize diagonals |
| Gameplay: aim | Pointer; optional arrow-key aim profile | Right stick | Right stick | Vector; configurable sensitivity/inversion/dead zones; retain last aim when neutral |
| Gameplay: primary attack | Left mouse button | R2 | RT | Hold repeats complete attack sequence; optional toggle-to-repeat setting; no compulsory rapid tapping |
| Gameplay: dash | Space | L2 | LT | Press once; can map to button, trigger, or supported axis direction |
| Gameplay: reload | R | Square | X | Press; manual rifle reload only, clearly inactive on melee |
| Gameplay: interact | E | Cross | A | Press at the marked preparation station to pause/open round options; no rewards or level exits in milestone 2 |
| Gameplay: pause | Escape | Options | Menu | Press; resume with menu Confirm on Resume or menu Back; clear held attacks before resuming |
| Menus: directional navigation | Arrow keys / WASD; pointer hover/click | D-pad or left stick | D-pad or left stick | Repeat delay/rate configurable; digital/analog alternatives |
| Menus: confirm | Enter / left mouse button | Cross | A | Press; destructive run abandonment uses explicit confirmation |
| Menus: back / cancel | Escape / right mouse button | Circle | B | Press; does not also dash/attack because gameplay context is suspended |
| Menus: previous / next tab or focus | Shift+Tab / Tab | L1 / R1 | LB / RB | Separate remappable actions; bindings/calibration tabs are also focusable controls |
| Menus: restart round | F5 or labeled button | Triangle | Y | Paused rounds require discard confirmation; never a gameplay reload shortcut |
| Menus: open controls | F2 or labeled button | Share | View | Opens the controls/settings editor while gameplay stays paused |
| Menus: scroll up / down | Mouse wheel / Page Up / Page Down | Right stick vertical | Right stick vertical | Remappable scalar/digital actions; navigable scroll controls are an alternative |
| Rebinding: begin capture / apply | Menu confirm | Menu confirm | Menu confirm | Uses current valid menu mapping; wait for initiating control release before capture |
| Rebinding: cancel capture | Hold current menu Back for 1.2 s, or pointer Cancel | Same | Same | Tap Back can itself be captured; preview dialogs use ordinary Back. Last valid mapping remains available |
| Rebinding: clear / restore selected / restore profile | Focusable labeled buttons using menu confirm | Same | Same | No inaccessible hidden shortcut; restoring mappings does not reset saves |

Each action accepts compatible alternate controls: keys, mouse buttons/wheel, exposed controller buttons/triggers, axes, and axis directions. Allow physical-key-position versus character-label choice, keyboard-only menu use, and digital aim/movement alternatives. Browsers/OS may reserve some keys/system buttons or omit hardware features; explain unavailable controls without falsely promising capture. No touchpad, motion sensor, or haptics dependency is required.

Detect same-context conflicts and offer replace/swap/cancel with preview. Never apply a mapping that leaves confirm/back/navigation inaccessible; retain the last valid profile and a reachable recovery control. Save separate keyboard/mouse and user-selected controller profiles; indices alone are not persistent identities. Reconnect/device switching requires explicit resume and must not replay the button that reconnected. Controller stick drift or incidental mouse movement must not constantly change prompts.

### 10.3 UI and accessibility proposals

Screens: title, preparation/weapon choice, controls/help, gameplay HUD, paused upgrade choice, pause/settings, safe-room suspend, results, and recoverable loading/save errors. The HUD prioritizes health/barrier, dash readiness, rifle ammunition/reload when relevant, current objective, and major-enemy health. Upgrade details show actual numbers, remaining duration, stacking cap, and unmet dependencies in plain language.

Offer UI scaling, high-contrast focus/telegraphs, color-plus-shape cues, adjustable flashes/shake/effects density, optional controller haptics when supported, and visible equivalents for every essential sound. Rebinding and all settings must be operable without a mouse. Text is not overlaid on an active boss attack. Reduced-effects mode retains attack geometry and phase cues.

Propose an optional assist profile with incoming damage reduced by 25%, target-assistance options, and 80% game speed. Mark assist-enabled records, but keep all story/content available. Assist reduction participates in the shared 50% player reduction cap; speed changes the simulation uniformly, including cooldowns, attacks, and telegraphs. These options require usability review and do not replace controller or accessibility validation.

## 11. Audio requirements

**Confirmed:** Cartoonish, pleasant SFX and no music. No soundtrack, menu/combat/boss music, musical reward stinger, Chopin recording, musical playback, or rhythm-game input is part of this design.

**Proposed:** Use rounded pops, soft thumps, fabric/air movement, paper sounds, and restrained room ambience. Keep gunfire deliberately stylized and comfortable over repeated volleys; major threats stand out through brief distinctive non-musical cues rather than simply higher loudness. Gameplay and menus remain understandable when muted. Voice acting and audio dialogue are TBD; this draft proposes text-only dialogue and no recorded voice production.

The authoritative SFX event inventory, variations, repetition limits, priorities, and audio budgets are in [Art Design](ART_DESIGN_TEMPLATE.md). Settings expose master, effects, UI, and ambience levels plus reduced-impact intensity; there is no music bus, music slider, or unused music asset requirement. Browser interaction/audio resume handling belongs in the [TDD](TECHNICAL_DESIGN.md).

## 12. Scope and future playtest plan

Milestones 1–2 have explicit implementation authorization; milestone 3 and later need a separate request. The playable foundation is a validation subset, not a reduction of the confirmed eventual nine-level scope. This design document is not validation evidence; consult the [milestone 2 report](MILESTONE_2_VALIDATION.md) for current results and outstanding checks. Production balance and rights clearance remain unestablished.

| Proposed stage | Content and question to resolve |
| --- | --- |
| Technical/combat foundations (TDD milestones 1–3) | First validate one placeholder character/test room and camera/aim/collision, then a first weapon and complete input/remapping flow, then all three weapon definitions and measured cycle damage; these are sequential foundations before the vertical slice |
| Representative vertical slice | B01 with its three levels, three boxer roles, and miniboss; all seven sources represented in a small test pool, one finished art/audio treatment, run failure/suspension/reward flow |
| Initial content completion | All nine levels, nine proposed ordinary roles, two minibosses, one final boss, and reviewed power-up pool; scope of sample upgrades approved before asset multiplication |
| Release preparation | Device/browser/accessibility and persistence checks, content/rights review, tuning and performance on approved hardware; hosting/release needs separate authorization |

| Future question | Scenario / proposed acceptance criterion | Evidence status |
| --- | --- | --- |
| Does production baseline damage meet the relationship? | Historical section 6.2 proposal: zero-defense stationary target; exact 12 s complete cycles yield 1,080/1,200/1,200 for rifle/gloves/column; log every phase and reload; no upgrades or assists | Current prototype comparison uses section 6.4's different 60-second benchmark; measured checks belong in the milestone 2 report. Final production balance remains unapproved |
| Do interrupts preserve honest timing? | Cancel every startup/recovery/reload boundary; no phantom hit, ammunition refill, Impact credit, or shortened next-cycle start | Untested |
| Are weapons viable beyond a dummy? | Each weapon completes the same seeded route without upgrades and with matched budgets; compare uptime, damage taken, overkill, crowd damage, and reload/cancel behavior before setting a win-rate tolerance | Untested; participant count and final tolerance TBD |
| Are upgrade combinations bounded? | Exercise all 21 effects individually, the identified synergy pairs, and an eight-effect stress build; no recursive proc, duplicate reward, over-cap stack, or multiple column Impact awards per sweep | Untested |
| Are fast weapons normalized? | Same benchmark with one Impact effect: expected credit totals over 12 s are 10.8 rifle, 12 gloves, 12 column; retain fractions and separate generated pulses from damage actually delivered after caps/deaths | Arithmetic target only |
| Does the route match scope? | Traverse B01L01 through B03L03; exactly nine level completions, eight upgrade choices, two minibosses, and one final boss; no boss arena counted as a tenth level | Design inventory checked; runtime untested |
| Can new players read threats? | First encounter with each role, then repeat without commentary; player identifies preparation, safe response, and recovery; muted/reduced-effects alternatives preserve required cues | Untested; recruitment TBD |
| Do controls recover safely? | Remap every gameplay/menu action on keyboard/mouse and each controller; force conflicts, disconnect, reconnect, focus loss, and profile restore; complete menus without mouse | Untested; full USB/Bluetooth/browser matrix in TDD |
| Do builds/saves remain consistent? | Suspend before/after reward; reopen pending offer; fail/finish; profiles retain settings while run power resets; no duplicate healing, stack, or rerolled offer | Untested |
| Does pacing fit the intended sitting? | Practiced unassisted clear targets 25–35 minutes; record combat/travel/reading/loading separately and revise HP/room content from observations | Untested; this is a target, not an estimate validated by play |

## 13. Review record and unresolved decisions

| Date | Change | Status / evidence |
| --- | --- | --- |
| 2026-10-09 | Supplied character/theme, three weapon identities, three-by-three biome scope, enemy families/major roles, seven sources, modern urban visual direction, pleasant SFX, and no music | Confirmed by the creative brief |
| 2026-10-09 | Populated fictional story, original protagonist proposal, combat values, nine-level route, enemy roles/phases, sample power-ups, controls, and validation plan | Proposed design draft; arithmetic/content review only |
| 2026-10-09 | Approved milestone 1 movement, glove reach, and glove rate overrides with unchanged damage; retained proposed production balance separately | Confirmed user refinement request; newly tuned feel requires a fresh manual retest, with evidence in the validation report |
| 2026-10-09 | Accepted refined movement/reach/punch feel; authorized milestone 2 input customization, settings profiles, three weapons, a bounded boxer encounter, and the section 6.4 benchmark | Confirmed later user request; not new physical-hardware metadata, visual-direction selection, or final production balance approval |

The [prioritized review queue](DECISIONS_AND_OPEN_QUESTIONS.md#prioritized-open-questions) contains at most ten questions for this initial review. Highest-impact GDD decisions are the fictional premise/president separation, one-weapon-per-run rule, movement/aim/dash feel, upgrade selection and persistence, and content/rating boundaries. Those proposals can be revised without treating this document as permission to implement.
