# KrewetekBuldogul — Art and Audio Design

**Document status:** Populated design draft v0.1. Creative requirements are confirmed; detailed production choices await review.

**Prepared:** 2026-10-09. **Art approval owner:** TBD. No assets have been created or approved for production.

## 1. Scope and status

**Confirmed** identifies the user's requirements. **Proposed** identifies recommendations, including every new name, palette, dimension, asset budget, animation treatment and production method below. **TBD** identifies a decision needing further input. Unless a paragraph or table explicitly says Confirmed, it describes a Proposed starting point.

This document owns presentation, audio direction and asset specifications. [Game Design](GAME_DESIGN_TEMPLATE.md) owns narrative, abilities, attack timings, power-up effects, enemy behavior and balance. [Technical Design](TECHNICAL_DESIGN.md) owns architecture, global performance targets and compatibility. Shared decisions and the prioritized questions live in [Decisions and Open Questions](DECISIONS_AND_OPEN_QUESTIONS.md). This draft authorizes no implementation or asset generation.

| Area | Confirmed creative requirement |
| --- | --- |
| Protagonist | One handsome, charming, funny adult Polish football hooligan; bright colors and a prominent red-and-white scarf. Karol Nawrocki is a loose creative reference; the character must have an original identity without a direct, recognizable likeness. |
| Playable weapons | Exactly three: FB MSBS Grot assault rifle, fast boxing gloves, and a slow, strong melee pillar inspired by Kolumna Zygmunta. |
| World | Three biomes with three levels each: boxing gym, football stadium, presidential palace. Two minibosses and one final president boss. Expansion is possible, outside this initial content commitment. |
| Presentation | 3D with isometric top-down presentation; Hades-style clarity and expressive art interpreted as modern Polish urban design. |
| Power-up sources | Exactly seven: Bóg, Ojczyzna, Orzeł Biały w koronie, Szacunek ulicy, Fryderyk Chopin, Maria Skłodowska-Curie, Mikołaj Kopernik. |
| Sound | Pleasant, cartoonish sound effects. No music, including musical reward stingers or Chopin recordings. |
| Input and delivery | Remappable gameplay and menu actions for keyboard/mouse, DualShock 4 and Xbox One/Series; USB/Bluetooth validation on compatible hardware. Windows desktop browsers first; other desktop systems later. |
| Workflow | Free tools and code-first development through Codex in VS Code. TypeScript + Babylon.js remains provisional; no tool installation or engine project in this phase. |

## 2. Visual direction

**Visual thesis:** A bright scarf cuts through angular, painted urban spaces while theatrical athletes and impossible paperwork turn everyday rivalry into an oversized comic adventure.

| Component | Proposed production direction |
| --- | --- |
| Shapes | Broad torso wedges, rounded fists, tapered legs and oversized props. Use one dominant silhouette feature per enemy role. Keep proportions expressive without bobblehead anatomy. |
| Surfaces | Broad hand-painted color planes, deliberate edge highlights, restrained material roughness. Dirt appears in a few authored strokes, not dense photo texture. Avoid tiny patterns at gameplay scale. |
| Lighting | Consistent upper-left key lighting establishes form; baked or painted value structure keeps assets readable without post-processing. Soft contact shadows anchor feet and props. |
| Composition | Quiet mid-value combat floor, darker enclosing architecture, restrained bright landmarks, then highest local contrast for actors and attack cues. |
| Urban identity | Sportswear, tiled changing rooms, concrete concourses, worn noticeboards, overformal furniture and exaggerated filing systems. Invent club identities, commercial signage and decorative lettering. |
| Humor | Confident poses become awkward recoveries; clerks wrestle huge stamps; a heavyweight carefully adjusts his gloves before a ridiculous attack. |
| Originality | Study readable silhouettes, expressive posing and composed spaces from the Hades reference. Produce original characters, environments, interface, symbols and effects; do not trace or reproduce its designs. |
| Defeat treatment | Slumps, spinning stars, scattered papers and recoverable cartoon daze. Blood and dismemberment are excluded from this proposed treatment; age target remains TBD. |

The reference brief is conceptual only: Hades/Hades II for composition and clarity, contemporary sportswear and urban facilities for materials, Grot for weapon identity, and Kolumna Zygmunta for the pillar motif. No reference image, portrait, scan, recording, font or third-party asset is acquired or cleared by this document. Before production, build a reference register with source, creator, intended study and permission to redistribute recorded separately.

## 3. Camera and composition

Use an orthographic camera at a proposed 45° yaw and 35° downward pitch, with no player-controlled rotation. This is a first review setup, not a statement about Hades II's internals. Gameplay remains on a plane; visual height does not add jumping or vertical combat.

- Begin with a 20 m horizontal view at 16:9; tune against the longest approved attack and threat telegraphs before art lock. Follow the player with a small bounded offset, clamped to authored room limits. Do not tilt or zoom during attacks.
- Check the character at 1920×1080 and 1280×720. Target roughly 90–150 screen pixels of standing character height across these settings; validate actual rig and framing rather than relying on this estimate.
- Preserve vertical combat visibility on wider windows; on narrow windows use a reviewed framing adjustment or presentation bars. Supported aspect ratios remain TBD. Never hide active threats behind the HUD simply to fill the viewport.
- Keep clear movement lanes between prop masses. Detail clusters sit near walls; floor motifs cannot resemble danger decals. Painted lines alone do not indicate collision.
- Tall near-side walls and foreground props use authored fade groups. Fade them while they cover the player or an active threat; keep their ground footprint readable. Show a player outline if occlusion remains.
- Keep scarf, weapon reach, anticipation and ground contact visible in all facing directions. Review eight facing samples even though runtime meshes rotate continuously.
- Offscreen threats use directional edge markers linked to their telegraph. Shake defaults low and is optional. Reduced motion removes shake, large zoom transitions and UI bounce while preserving timing cues.

## 4. Main character

The GDD proposes **Borys “Błysk” Rudzki**. This is a working fictional name, not an approved identity. Motivation, comic appeal and relationships are authoritative in [Game Design](GAME_DESIGN_TEMPLATE.md). The separate fictional president is not the protagonist or automatically the real-world reference.

| Feature | Proposed art specification |
| --- | --- |
| Build and proportions | Adult athletic build, approximately 1.85 m visual height, six heads tall, strong shoulders, compact waist, expressive large hands and broad sneakers. Visual measurements do not determine collision dimensions. |
| Original face | Narrow oval face, short copper curls with an asymmetric forelock, expressive dark eyebrows, slightly crooked grin, light freckles and clean-shaven cheeks. Use independent shape studies rather than tracing or blending reference photographs. |
| Outfit | Cropped teal training jacket with warm yellow shoulder panels, dark plum tapered trousers, off-white sneakers and rolled cuffs. No real club badge, campaign mark, sponsor or copied tattoo. |
| Palette | Teal `#178F91`, yellow `#F4C950`, plum `#302D48`; scarf red `#D93445` and warm white `#FFF3DD`. Shoes/trousers remain darker than the scarf. These are review swatches, not accessibility guarantees. |
| Scarf | Large alternating red/white blocks, one broad tail over the shoulder and one shorter tail forward; no lettering needed for recognition. Its knot forms a bright mass at neck/chest in front, side and rear views. |
| Charm and comedy | Lifted eyebrow, open grin, menu wink, buoyant shoulders and self-satisfied glove adjustments. During combat, expressions remain secondary to readable body poses. |
| Movement | Bouncy forward intent with planted feet; confident idle shifts; fast dash pose with trailing scarf. Pillar recovery shows effort without changing the GDD recovery duration. |
| Hit and defeat | Compact flinch, persistent state indicator where required, theatrical seated daze on defeat. No flash may erase enemy anticipation or aiming information. |
| Portrait | One original three-quarter portrait with neutral, cheerful, determined and embarrassed variants proposed for dialogue/results. No lip-sync or voice imitation. |

Use a shared humanoid skeleton, weapon sockets and a small authored scarf chain. Begin with keyed scarf poses plus damped secondary motion; do not require cloth simulation. The scarf cannot obscure aiming hands or sweep over danger decals. Its silhouette must read with textures disabled and in grayscale. Review against the palace's white surfaces and stadium signage before palette approval.

The Nawrocki reference contributes only the brief's general confident public presence. Do not use his face, voice, biography, campaign identity or allegations about him to fill gaps. An independent appearance, changed name or stylization does not by itself establish legal clearance; see section 14.

## 5. Three weapons

These are the only playable weapon identities. Names below are **Proposed**; stable IDs survive name changes. Attack rules, durations, damage, and the equal-melee/slightly-lower-ranged DPS benchmark are specified once in [Game Design](GAME_DESIGN_TEMPLATE.md).

| ID / working name | Silhouette and material | Pose and animation | VFX and icon needs |
| --- | --- | --- | --- |
| `weapon_01` — Grot “Błyskawica” | Preserve FB MSBS Grot identity through approved studies of the overall receiver, stock, magazine and handguard. Simplify into a charcoal silhouette with pale edge planes and a small teal accent; no manufacturer logo by default. | Two-hand grip, clear muzzle direction, compact recoil and readable reload. Separate barrel from torso in silhouette; aiming follows the gameplay plane. | Short soft muzzle puff, thin directional shot cue, small impact chip, ammunition/reload HUD if retained by the GDD. Long horizontal selection icon. |
| `weapon_02` — “Szybkie Pięści” | Broad padded gloves with contrasting cuffs; one warm red, one light cream with matching dark seams. Read as two fists, not tiny held objects. | Quick alternating punches and clear return to guard. Exaggerate shoulder direction and glove compression; animation never adds a damaging hit. | Brief bent arc near each glove, soft squash ring on impact, compact paired-fist icon. Trails accurately show reach. |
| `weapon_03` — “Kolumnator” | Exaggerated carried column shaft, broad capital and tiny simplified statue silhouette inspired by Kolumna Zygmunta. Warm stone, dark bronze-like cap, red-white grip wrap. Proposed length about 1.6× character height; refine to GDD reach. | Two-handed heavy ready pose, torso wind-up, committed swing, follow-through and slow reset matching GDD timing. Grip and centre of mass make absurd size feel deliberate. | Bounded low dust crescent matching the active area; blunt fragments settle quickly. Tall column icon. Decoration outside the hit shape never implies extra reach. |

Avoid real firearm sound pressure and realistic injury effects. The pillar is a fictional carried object inspired by the monument, not a claim that the actual monument was stolen or damaged. Final brand use and all reference/source assets need review before distribution.

## 6. Enemies and bosses

One gym miniboss, one stadium miniboss and one final palace president are **Confirmed**. The ordinary roster, names and treatments below are **Proposed**. Exact behavior and telegraph durations belong to the GDD. Enemy-held props are presentation, not additional playable weapons.

| ID / GDD role | Silhouette and anticipation | Recovery / defeat signature |
| --- | --- | --- |
| `B01_E01` — Jabber | Narrow springy boxer, high small gloves, blue top with one vertical stripe; shoulders dip before step-in punch. | Open elbows expose recovery; dazed seated defeat. |
| `B01_E02` — Counterpuncher | Broad torso, square guard, dark vest and cream wraps. Closed gloves form a visible guard bracket; counter wind-up opens one side. | Guard break visibly precedes vulnerability; glove stars and crouch. |
| `B01_E03` — Clincher | Round torso, low stance, long open arms; planted feet and straight bracketed lane announce grab-charge. | Miss leaves arms overextended; tumbles into seated pose. |
| `B02_E01` — Rusher | Lean forward wedge, broad trainers, short invented club scarf unlike the hero's; crouch and lane arrow before tackle. | Missed rush ends in clear skid and bent knees. |
| `B02_E02` — Banner Guard | Wide rigid silhouette, invented banner stretched on stout frame. Flat protected side and frame lift show guard/attack direction. | Banner droops during vulnerability; wraps around him on defeat. |
| `B02_E03` — Cup Thrower | Narrow body, oversized cup carrier, raised elbow; target landing circle appears before release. Invented cup design. | Extended empty hand marks recovery; harmless cup scatter. |
| `B03_E01` — Stamp Clerk | Squat rectangular suit, huge stamp overhead; cone footprint and raised elbow announce impact. | Stamp remains down through recovery; orderly forms scatter on defeat. |
| `B03_E02` — Lobbyist | Tall tapering suit, broad folder and sweeping free hand. One linking ribbon clearly identifies the supported ally; avoids armed combat. | Link visibly breaks when interrupted; paper decoration stays above the danger layer. |
| `B03_E03` — Filing Clerk | Lean trolley silhouette, segmented file sleeves and straight arm before volleys; rectangular line markers separate it from the Stamp Clerk. | Trolley jam marks recovery; folder piles remain non-blocking. |
| `B01_M01` — Coach | Oversized boxer, thick gloves, cropped warm-up jacket, square shoulders. Readable jab/sweep poses; second phase adds double-jab and a ring-centre slam footprint. | Breathing/reset pose and open stance identify recovery; phase change uses stance and glove position, not color alone. |
| `B02_M01` — Capo | Broad hooligan, layered invented club clothing, banner-shaped collar. Cone gesture and charge lane distinguish attacks; phase-two arena banners and summoned Rushers use existing visual language. | Commands stop and stance opens during vulnerability. Phase label and arena change are readable without a voice recording. |
| `B03_B01` — President | Original fictional adult, swept silhouette, crescent eyebrows, long suit jacket, oversized sash and absurd desk props. Stamp cones, paper lines and decree-zone shapes remain distinct. No real politician's face or official portrait. | Posture grows less composed across GDD phases. Three-zone sequence has numbered markers; exhausted recovery is an unmistakable open pose. |

Every attacker has anticipation pose plus ground cue, active attack aligned with simulation, then open recovery. Stagger uses body compression and a broken bracket. Any GDD invulnerability uses a shield icon. Boss health, phase and temporary immunity remain visible without audio. Do not create mechanics merely because an animation can depict them.

## 7. Biomes and nine-level art plan

Three biomes with three levels each are **Confirmed**. A level contains rooms/encounters as defined by the GDD; landmarks below do not add rooms or levels. Use one modular kit per biome with level-specific dressing. Palettes, lighting and staging below are **Proposed**.

| Biome | Palette and materials | Lighting and landmarks | Modular kit and readability |
| --- | --- | --- | --- |
| `B01` — Boxing gym | Turquoise `#377C83`, cream `#D8C9A6`, coral `#BA6659`, charcoal `#303D45`. Canvas, plaster, padded vinyl and worn wood. | Broad overhead pools, warm window stripes near walls; ring frame and oversized training timer. Quiet floors behind gloves/scarf. | Mat tiles/edges, short walls, benches, lockers, bag hooks, ring posts/ropes, doors. Ropes fade over threats. Bags are scenery unless GDD says otherwise. |
| `B02` — Football stadium | Concrete blue-gray `#526575`, turf green `#527C65`, rust `#AC6951`, pale plastic `#C8D7D4`. Concrete, painted steel, vinyl flags. | Cool floodlight wash, warm concourse pockets; tunnel mouth, turnstiles and stepped seating. Distant spectators are abstract decoration. | Slabs, railings, invented kiosks, seat banks, arches, turf strips, gates, banners. Crowds and busy banners stay outside combat sightlines. |
| `B03` — Presidential palace | Ivory `#D5C7A8`, ink blue `#263F58`, brass `#AD8C54`, dusty plum `#73586F`. Faceted stone, wood, woven runners and paper. | Soft interior light, restrained warm pools; impossibly tall files, ceremonial doors and huge desk. Ensure scarf contrast against pale stone. | Floor/wall panels, shallow pilasters, desks, shelves, curtains, queue barriers, doors, pedestals. Near-side furniture fades; sparse marble veins never resemble attacks. |

| Level ID / GDD working name | Proposed visual progression and focal cue | Reuse and encounter constraint |
| --- | --- | --- |
| `B01L01` — Warm-up Floor | Simple training floor, towel rail and bold floor lanes; changing-area dressing at entry. | Sparse first use of gym kit for clear silhouettes. |
| `B01L02` — Heavy Bag Hall | Layered bag silhouettes at the perimeter, diagonal strips of warm light. | Recombine lockers/mats; bags stay outside required movement lanes. |
| `B01L03` — Main Ring | Wide ring hall; giant timer draws attention to the Coach's space. | Same kit with ring surround; miniboss remains within this level. |
| `B02L01` — Concourse | Tunnel sign and turnstile rhythm lead inward through concrete circulation space. | Introduce stadium values; directional labels use arrows as well as text. |
| `B02L02` — Stands | Layered seating and banners frame a bowl-side route. | Low-cost repeated seat groups; foreground rails fade as needed. |
| `B02L03` — Centre Circle | Pitch markings converge on an open Capo arena. | Reuse stadium surfaces and turf; this is not an extra miniboss level. |
| `B03L01` — Reception | Queue hall with an absurdly tall ticket dispenser as landmark. | Introduce paper motifs without airborne clutter during attacks. |
| `B03L02` — Committee Wing | Opposing desk masses, towering folders and procedural notices. | Reuse desks/shelves with changed orientation; clear volley lanes. |
| `B03L03` — Grand Chamber | Presidential desk and high empty seal recess frame the finale. | Palace kit plus one landmark; danger decals outrank carpet patterns. |

Available exits share a light frame, directional arrow and interaction prompt. Locked exits show a closed shape and short explanation. Rewards use source icon plus label. Environmental hazards exist only where the GDD specifies them; decorative objects do not become damaging hazards through art direction.

## 8. Power-up presentation

Seven source identities are **Confirmed**; their visual/audio treatments are **Proposed**. The GDD owns its three sample upgrades per source, IDs, mechanics and stacking. Samples inherit the source language plus an effect-specific modifier icon. Do not add an eighth source or copy Hades characters for these categories.

| Source ID / label | Proposed icon and motif | Palette and effect | Non-musical acquisition sound |
| --- | --- | --- | --- |
| `SRC_GOD` — Bóg | Open hands enclosing a rayburst, protective arch, no portrait. Specific religious symbolism requires user review. | Ivory/gold, steady radial light and explicit protective bracket only where the GDD effect applies. | Gentle cloth unfurl and soft air bloom; no bell, choir or sung tone. |
| `SRC_FATHERLAND` — Ojczyzna | Interwoven red-white ribbons forming a stable knot; woven material and grounded plinth shape. | Red/white/slate; anchored angular border distinct from enemy danger. | Fabric snap and soft wooden tap. |
| `SRC_EAGLE` — Orzeł Biały w koronie | Newly drawn crowned white eagle in an open shield frame; broad wings and readable crown. Do not copy a downloaded emblem. | White/gold/deep blue outline; brief feather accents and directional wedges. | Cushioned wing rush and feather brush. |
| `SRC_STREETS` — Szacunek ulicy | Clasped wrists in a rough painted circle; pavement and athletic tape. | Orange/asphalt/cream; compact impact marks and segmented ring. | Friendly glove slap and short sneaker squeak. |
| `SRC_CHOPIN` — Fryderyk Chopin | Flowing quill and fan of black-white rectangles; elegance through spacing/curves, no copied portrait. | Ink/cream/rose; smooth curved accent follows the relevant action. No rhythm input or music. | Paper flick and soft air; no piano sample, notes or melodic sequence. |
| `SRC_SKLODOWSKA` — Maria Skłodowska-Curie | Double vessel silhouette within a precise geometric frame; original laboratory-inspired forms. | Violet/mint/graphite; measured dots and segments rather than dense fog or bright glare. | Small glass-like ticks and dry bubbling pop, treated as effects rather than pitched cues. |
| `SRC_KOPERNIK` — Mikołaj Kopernik | Nested orbital arcs with offset central disc; brass instrument-like linework. | Midnight/ochre/cream; thin orbit arcs within the actual effect footprint. | Soft mechanical ratchet and rounded wooden click. |

Source color never serves as the only mechanical cue. Cards combine source icon, effect title, affected action, concise rules and numerical changes from the GDD. The current GDD proposal has no rarity system, so cards have no rarity indicator. If rarity is approved later, use a labeled border independent of source identity. Only show gameplay effects that are actually active; an emblem alone never implies damage or invulnerability.

## 9. Animation and VFX

Animation follows the simulation timeline in [Technical Design](TECHNICAL_DESIGN.md). Artists receive GDD anticipation/active/recovery markers and cancellation rules. SFX and VFX consume the same authoritative events. An animation notification never independently applies damage or grants rewards.

| Asset group | Proposed minimum clip coverage | Review constraint |
| --- | --- | --- |
| Hero shared rig | Idle, run, strafe/backward locomotion, dash, hit, stagger if used, defeated, interact, celebration, menu pose. | Continuous facing, grounded feet, clear scarf. GDD actions determine which clips ship. |
| `weapon_01` | Ready/aim layer, fire, reload, equip/unequip presentation. | Aim-independent legs; muzzle cue and reload completion synchronized to simulation. |
| `weapon_02` | Guard, four-punch combo, combo recovery, equip/unequip. | Each damaging contact maps to the GDD sequence; no hidden flourish hits. |
| `weapon_03` | Heavy ready, wind-up, swing, follow-through, recovery, equip/unequip. | Full arc visible from eight review angles; visual commitment matches gameplay. |
| Ordinary enemies | Per role: idle/locomotion, anticipation/attack/recovery, hit, stagger where used, defeated. | Share skeletons where useful; silhouette/pose still distinguishes roles. |
| Bosses | Locomotion/hit/defeat plus each GDD attack sequence, phase transition and vulnerability pose. | Phase cues expose actual state; animation adds no attacks or phases. |
| Environment/UI | Door states, reward reveal/selection, focus transition, loading indicator. | No movement required to understand a control or reward. |

Keep anticipation legible from the first cue through the active transition. Adjust playback to approved timing only within a reviewed range; redesign unreadable clips. Interrupted attacks clear stale telegraphs and decorative loops immediately. Gameplay pauses freeze gameplay effects while intentional menu feedback remains usable.

**VFX priority:** imminent danger and player location → targeting/active hit area → state changes and reward interaction → hit decoration → ambience. Suppress lower-priority layers first under overlap or performance pressure.

| Meaning | Proposed visual treatment | Reduced-effects alternative |
| --- | --- | --- |
| Anticipation | Dark-edged amber footprint/line, distinct shape, countdown fill and body wind-up. | Outlined footprint with filling boundary; no bloom. |
| Active danger | Strong boundary and inward pattern become active exactly with the attack. Player trails remain shorter/lighter. | Flat patterned area with identical timing and bounds. |
| Player damage/status | Brief body tint, health change, directional notch and labeled status icon. | No screen flash; keep health/status/direction. |
| Recovery/stagger | Open pose, broken bracket and compact stars above actor. | Static broken bracket for the real duration. |
| Weapon impact | Small puff, chip or squash ring appropriate to the weapon and actual hit. | One compact shape or short outline pulse. |
| Power-up/interaction | Source icon, selection frame and small rising shape. | Immediate labeled state change without particles. |

Avoid full-screen white flashes and repeated strobes. Adjustable shake, flash intensity and particle density preserve gameplay cues at their minimum. Review grayscale, simulated color-vision differences and actual player readability; simulations alone do not establish accessibility. High-contrast cues use paired light/dark edges without changing hit regions.

## 10. UI, typography and remapped prompts

Use an urban editorial style: rectangular cards, slightly offset printed borders, athletic tape accents and large plain-language labels. Decoration stays outside click/focus targets. Screens cover title/start, weapon preparation, HUD, power-up choice, pause, settings/rebinding, loading/save feedback, results and credits; narrative panels follow GDD scope.

- HUD: health/status upper left, weapon and relevant ammo/reload/dash state lower left, level objective upper right; boss bar only in its encounter. Power-up cards compare numerical effects side by side and use the GDD's pause rule.
- At 1280×720 start with 18 px body labels and 24 px key values; offer UI scale, reflow and scrolling instead of clipping. Measure contrast/focus in the eventual browser build; swatches are not proof.
- Use a readable sans serif with real Polish glyphs: `ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż`. Freely redistributable font and exact license are TBD; start with a system-font fallback for the later slice. Expressive lettering belongs in titles, not bindings/tooltips.
- Draw source icons on a 64 px grid and review at 32 px; add labels in choice menus. Weapon icons are horizontal, paired and vertical respectively. Disabled, focus, selected and unavailable states differ by outline, marker and label, not only color.
- Resolve keyboard/mouse, DualShock 4 and Xbox prompts from the active profile and current binding. Every HUD/tutorial/menu hint updates after remapping. Never bake `R2`, `RT` or `Space` into artwork.
- Unknown mappings get neutral button/axis labels and a manual prompt-family override. Specific controller glyph artwork needs distribution permission; generic text is the fallback.
- Rebinding shows capture, preview, conflict, swap/replace, cancel, apply, clear and restore states. Explain unavailable controls, maintain visible focus and preserve an obvious recovery path.
- Settings expose UI scale, reduced motion, flash/effects intensity, high contrast and audio controls from section 11. No music slider or music preference exists.
- English documentation does not establish English-only gameplay. Keep strings out of textures, allow Polish labels and about 30% text expansion; localization scope is TBD.

## 11. Audio direction: no music

**Confirmed:** Effects are cartoonish, pleasant and repeatable. No soundtrack, menu music, combat/boss music, musical reward stinger, Chopin recording or other musical playback. Ambience also remains non-musical. Voice acting/dialogue audio are **TBD**; propose text-only dialogue for the first slice, without recorded speech or crowd chants.

| Event family | Proposed sound and variation | Essential visible equivalent |
| --- | --- | --- |
| Movement/dash | Cushioned sneaker steps by material, soft cloth rush. Four step variants per shared surface family, three dash variants. | Foot contact and dash silhouette. |
| Grot fire/reload | Rounded pneumatic pop plus dry mechanical tick, soft magazine click-clack; four fire, three impact, two reload variants. No realistic explosive crack. | Shot/muzzle direction, impact, ammo and reload progress. |
| Gloves/pillar | Padded thup/squeak; rounded stone thonk, brief scrape and settling grit. Four impact, three miss/air variants per weapon. No long low rumble. | Attack arc, hit response and recovery pose. |
| Player hit/defeat | Cloth bump and muted impact; soft comedic settling thud. Three hit variants, one short defeat set; no scream needed. | Health/status, direction and defeat state. |
| Boxers/Coach | Floor scuff, glove rub, padded impact; heavier glove stretch distinguishes Coach wind-up. Three role cues each. | Anticipation, attack footprint, boss phase and recovery. |
| Hooligans/Capo | Sneaker skid, banner snap, harmless cup clatter; Capo's cone cue uses a short breath/cloth burst without recorded speech. Three role cues each. | Charge lane, guard side, landing marker and command pose. |
| Clerks/President | Paper sweep, blunt stamp, folder flap, padded desk knock. Boss attack families differ by texture/duration, never melody. Three role cues each. | Attack geometry, support links, phase labels and wind-up. |
| Power-up/UI choice | Source texture from section 8, two variants; dry focus click and cushioned confirmation snap. No note ladder, fanfare or reward bell. | Source/effect labels, focus, selection and changed stats. |
| Menus/saves/transitions | Quiet tick, back swish, error rustle, optional save pop; two variants for frequent events. | Focus, inline error, progress and save-status text. |
| Gym ambience | Sparse ventilation, bag creak, occasional bench settling. | Decorative only; gameplay cues stay in Effects. |
| Stadium ambience | Air through railings, seat clicks, fabric rustle. No chant, song, announcer or rhythmic loop. | Decorative only. |
| Palace ambience | Soft room air, intermittent paper settling, curtain rustle. | Decorative only. |

**Proposed mix:** Master with Effects, UI and Ambience subgroups, each with an accessible slider. Critical cues route to Effects, never Ambience. Muting any subgroup leaves visual equivalents. Priority is danger → player feedback → interaction/UI → minor impacts/debris → ambience. Briefly duck ambience/decoration for warnings.

Begin with a 24-voice global cap and at most three concurrent instances of one repeated effect. Merge low-priority same-family events within 50 ms into one representative cue; preserve distinct imminent warnings ahead of decoration. Footsteps play once per foot contact. Frequent effects start around 0.05–0.3 seconds with softened edges; longer sounds need a gameplay reason. Shuffle samples without immediate repeat; narrow ±3% pitch variation may apply to non-critical impacts, never automatic pitch ladders. Validate during the future stress encounter.

Offer reduced-intensity mixing with narrower dynamics, softer transients and quieter repeated impacts. Loudness never scales endlessly with enemy count. Pause gameplay audio on pause/focus loss; UI sounds continue only for intentional menu input. The TDD owns browser unlock/resume and codec selection. No sound has been created, mixed or tested.

## 12. Asset pipeline and budgets

This is a future proposal. Free source-authoring tools and versions are **TBD**. Scene composition, collision/navigation data, content IDs and reproducible export/build commands stay text-based and usable through Codex in VS Code. Asset quality still needs visual/audio review.

- Separate editable sources and runtime exports in future asset subdirectories; create neither in this phase. GLB/glTF is proposed for models/rigs. Retain editable textures and lossless audio sources with tested runtime exports.
- Use stable catalog IDs and lowercase descriptive filenames, for example `weapon_03_column` as an asset label. Never derive save IDs from names. Record source revision, export settings, dependencies, author and permissions.
- Adopt metre scale; ground X/Z, visual height Y. Validate handedness, orientation and bone-axis conversion with one reference asset before volume production. Actor origin at foot centre; weapon origin at grip, plus muzzle/secondary-grip markers where relevant.
- Rig exports include bind pose, consistent scale, named clips and attachment sockets. Collision/navigation remains separate metadata, not inferred from decorative mesh bounds.
- Share materials/atlases, keep transparency sparse, and pad atlas sprites against bleeding. Validate color space, texture compression, audio codecs and font embedding in the technical slice.
- Global targets are authoritative in [Technical Design](TECHNICAL_DESIGN.md): initial compressed transfer ≤15 MiB, ≤150 draw calls, ≤300,000 visible triangles, one shadow-casting light, and maximum 2048 px textures absent review. These are hypotheses, not measured limits.

| Asset-level budget | Proposed starting cap/allocation | Future validation |
| --- | --- | --- |
| Initial art/SFX transfer | ≤10 MiB compressed combined, leaving 5 MiB of the global payload for code/fonts/UI/metadata. Actor assets ≤4 MiB, initial environment ≤4 MiB, initial SFX ≤2 MiB within that allocation. | Count actual transferred bytes, including prefetch before first play; allocations may trade within the global limit. |
| Later biome bundle | ≤8 MiB compressed incremental art/audio per biome; references to shared assets, not duplication. | Measure actual bundle/transition loading. Entire game is not assumed to fit initial payload. |
| Actor geometry | Hero ≤8,000 triangles, ordinary enemy ≤4,000, boss ≤10,000, each weapon ≤3,000. | Inspect exports and crowded-scene totals; material passes also cost draw work. |
| Rigs | Hero/boss ≤48 deform bones including scarf; ordinary enemy ≤32; no cloth simulation dependency. | Measure animation CPU/GPU cost and payload. |
| Materials/textures | Prefer ≤2 materials per actor, one per prop; start with 1024 px actor maps, up to TDD 2048 px ceiling only where justified. | Review at camera scale before raising resolution; reuse palettes/masks. |
| VFX | Start with ≤200 decorative particles and three transparent layers over a combat area. Essential telegraphs have separate guaranteed priority. | Lower quality drops dust/debris before attack boundaries. |
| Memory/frame cost | Follow TDD recorded-hardware process, leak checks and frame targets; no independent unmeasured GPU/memory promise. | Record peak textures, geometry, audio/process use before setting final caps. |

Load lightweight UI for all three weapon choices, then the shared hero, selected weapon and first-room assets before play; stream later levels/biomes per the TDD. Unselected weapon models need not enter the initial playable bundle. Deduplicate repeated kits and dispose unused resources at safe transitions. Lower quality may reduce shadows, texture detail, particles and backgrounds; silhouettes, labels, dangerous bounds and gameplay timing must remain.

## 13. Prioritized asset inventory

These are specifications, not produced assets. After explicit implementation authorization, **P0** validates the pipeline, **P1** covers initial content, **P2** is optional polish needing review. The review slice is not authorization to build it now.

| Priority / inventory ID | Deliverable and content mapping | Approval criterion |
| --- | --- | --- |
| P0 — `ART_HERO` | One hero model/rig, scarf, shared movement/dash/hit set, original portrait study; [GDD protagonist](GAME_DESIGN_TEMPLATE.md). | Recognizable in all biome palettes, eight facings and reduced effects. |
| P0 — `ART_WEAPONS` | Three models/icons and attack/recovery sets: `weapon_01`, `weapon_02`, `weapon_03`. | Identities/reach distinct; GDD timing preserved without extra hits. |
| P0 — `ART_GYM_SLICE` | Small B01 kit sample, `B01_E01`, one review encounter's cues. | Demonstrates source-to-runtime process, clarity, occlusion and budgets. |
| P0 — `ART_UI_CORE` | HUD, focus/selection, neutral input prompts, rebinding states, seven source base icons from section 8. | Correct prompts after remapping, Polish glyphs, complete menu input coverage. |
| P0 — `AUDIO_CORE` | Reviewed variants for each weapon, movement, damage, warning, menu and non-musical reward. | Repeated listening and muted-play equivalence. |
| P1 — `ART_B01` | Gym kit/dressing for `B01L01`–`B01L03`; `B01_E01`–`B01_E03`, `B01_M01` clips/VFX. | Three-level reuse; Coach arena within level 3. |
| P1 — `ART_B02` | Stadium kit/dressing for `B02L01`–`B02L03`; `B02_E01`–`B02_E03`, `B02_M01` clips/VFX. | Distinct stadium identity, inexpensive stands and readable lanes. |
| P1 — `ART_B03` | Palace kit/dressing for `B03L01`–`B03L03`; `B03_E01`–`B03_E03`, `B03_B01` clips/VFX. | Separate fictional president, clear paperwork attacks, final arena within level 3. |
| P1 — `ART_UPGRADES` | Sample-card modifier treatments for the GDD's three examples per source, plus reusable effect shapes. | Twenty-one examples are a system review, not a confirmed production count or 21 bespoke VFX systems. |
| P1 — `AUDIO_CONTENT` | Enemy/boss warning sets, three non-musical ambience sets, complete UI/save cues. | Voice/repetition caps; danger remains understandable with Effects muted. |
| P1 — `ART_FLOW` | Title/preparation, choice, pause/results, loading/error/credits using shared UI. | Approved flow without extra mechanics or music settings. |
| P2 — `ART_POLISH` | Additional expressions, background prop variants and optional ambient motion. | Review after clarity/content/loading targets; no implied skins, biomes or weapons. |

## 14. Provenance and future review

Each future asset/reference record identifies stable ID, creator/source, source URL where applicable, license/written permission, modification history, credit, and whether game distribution and public editable-source publication are permitted. Do not assume a downloadable image, old composition, monument photograph, public emblem, generated output or font can be redistributed. This draft copies no third-party assets into the repository.

Targeted matters **TBD** before public asset distribution: possible unwanted identifiable likeness in final protagonist/president designs; intended Grot name/logo/reference use; treatment of the crowned White Eagle and other national/religious symbolism; permissions for monument photos/scans, portraits, fonts, controller glyphs and third-party art/audio. These are unresolved questions for qualified review, not legal conclusions. Stylization and disclaimers do not guarantee clearance.

| Future review | Evidence needed | Current result |
| --- | --- | --- |
| Character/weapons | Actual-camera eight-facing images, grayscale checks, recognition in crowded scenes. | Not tested; no assets. |
| Enemy/boss fairness | Every GDD anticipation/vulnerable state readable with muted audio, reduced effects and overlaps. | Not tested. |
| Nine-level coverage | Each level ID with landmarks, navigation, occlusion and kit reuse. | Documented plan only. |
| UI/controls | Gameplay/menu remapping, device switching, prompts and Polish glyphs at minimum viewport/UI scale. | Not tested. |
| Audio comfort | Repeated encounter listening, intensity/voice caps, no-music audit and visual equivalence. | Not tested; no audio. |
| Browser fit | Actual payload, draw/triangle/rig/material cost, loading/memory on recorded Windows hardware/browser. | Targets only. |
| Provenance | Completed asset records and design/rights review before distribution. | TBD. |

The [decision register](DECISIONS_AND_OPEN_QUESTIONS.md) contains the single prioritized question list for creative approval, audience/localization, tools, budgets and rights review. This draft does not establish art, audio, performance, input or legal acceptance.
