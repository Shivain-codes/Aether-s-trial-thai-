# Windborne 3D engineering report

Date: 2026-11-15
Deliverable: `/Users/shivain/Desktop/space-invaders/index.html`

## Scope and result

The user's later instructions explicitly selected a new third-person 3D foundation, open exploration, Genshin-inspired characters/places, working residents, roaming enemies, and revisions to the intro; the latest request shortens it to 30 seconds and explains how Aether lost his memories. These supersede the original pasted brief's 2D-only, no-dependency, no-open-world and 15-second restrictions. The output remains one self-contained HTML file with bundled assets and no runtime CDN requirement. The 2D implementation and tests are preserved separately.

The result is a playable prototype with six landmarks, eight valley chests, six wind sigils, waypoints, a quest, 24 roaming foes in eight camps, eight working residents plus Lyra, and the two trial arenas. It does not match Genshin's asset quality, animation library, world scale, city complexity or every detail. The browser renderer is local. No cloud GPU was connected or used; the user subsequently chose local-only work.

## Reviewed and changed

The retained 2D systems are in `src/`: engine, player, input, camera, combat, elements, projectiles, collision, enemies, bosses, levels, world, progression, inventory, loot, HUD, minimap, renderer, sprites, particles, cinematic, audio, config and styles. Their existing 66 checks pass. Their functionality is not evidence that the new 3D systems pass.

The new implementation is in `src3d/core.js`, `main.js`, `world.js`, `battle.js`, `art.js`, `avatar.js`, `resident-avatars.js`, `residents.js`, `landmarks.js`, `buildings.js`, `companion.js`, `effects.js`, `ui.html` and `style.css`. `build-3d.cjs` bundles the final file. The former `build.js` now writes `legacy-2d.html` so it cannot accidentally replace the 3D deliverable.

## Important corrections

- Corrected custom hair/clothing attachment orientations for the sample VRM's nonstandard bone axes. Back carry and drawn-sword placement now use separate poses; the drawn sword follows the actual hand/forearm.
- Handled material arrays when cloning the avatar for residents; the initial single-material assumption caused a load failure.
- Prevented level-up healing from reviving a player killed in the same simulation frame.
- Restored trial snapshots on retry/abandon, reset outdoor enemies on world retry, and separated QA saves from playable saves.
- Enforced one hit per attack ID, dead-enemy reward guards, bounded hit history, potion/energy clamps, 5-second skill cooldown and 60-energy burst cost.
- Kept boss charge direction and projectile aim tied to the warning target. Melee/sweep danger cones now use matching angular damage limits.
- Bounded visual effects and disposed transient resources; fixed health-bar material cleanup. Audio nodes stop on pause and are disconnected on completion.
- Corrected FPS reporting to use real elapsed time rather than clamped simulation time.
- Kept gameplay paused outside playing mode, cleared held input on blur, capped simulation steps, and guarded mode changes during interaction.
- Replaced jagged mountain-pole artifacts and bubble-like cloud shading. Moved water-side props to the new shoreline, widened the lake, raised dry terrain around town, and excluded trees from buildings.
- Batched static decoration by material and split grass into distance-culled chunks to reduce geometry submitted per frame.

## Visual/gameplay additions

Detailed rigged anime base with layered blond locks, braid, dark/gold outfit, an embroidered split ivory cloak, sword and glider; a small white-haired floating companion; manual walk, run, swing, dash, jump and glide poses. Three sword swings alternate, with a stronger third hit. Colored slash arcs, sparks, steam, fire impacts, burst rings and dash trails accompany attacks.

Terrain-height movement, collision proxies, softened trails, fine curved grass/flowers, denser instanced foliage, azure sky, varied cloud banks, blue mountain layers with a snowy peak, shadows, and deep blue/turquoise water with animated normals, shallow edges and foam. Seabirds and pollen add ambient motion. Mondstadt-inspired houses have pitched tile roofs, timber braces, windows, shutters, planters, dormers, chimney caps, porches, hanging emblems, lanterns and supply baskets. The market has a striped canopy and a planked produce counter. Town walls and cathedral use stone textures; the cathedral has buttresses and a rosette window. Eight camps contain canvas tents, cooking fires, pots, crates, barrels and four themes of detail. Seventeen layered moss-topped rock outcrops have collision proxies. Dawn Winery has a manor, towers and vines. Windrise has a great tree/statue; the northern ruins have a broken tower.

Villagers follow short work routes and perform blacksmith, market, gardener, fisher, delivery, guard and porter routines. They use variants of the same humanoid base and simple authored animations; this is not a general NPC schedule/pathfinding system. The original 10+boss and 15+boss trial counts are retained. Six regular archetypes now fight differently: slimes, club raiders, shield wardens, aimed archers, ground-circle mages, and heavy sentinels. Shield guards reduce frontal physical damage; flanking and Pyro counter them. Ranged attacks lock their warning targets, respect terrain elevation, and cancel when their source dies.

The short-opening revision targets a locally rendered 30-second 1280×720, 24-FPS H.264/AAC film. Four original silhouette scenes show the wind shrine erupting (0–6 seconds), Aether dueling its guardian with a sword parry, dash and slash (6–16), his seal protecting the village while consuming his memories (16–23), and his awakening beside a companion who found him afterward (23–30). This is the prototype’s original fan-made backstory, not official Genshin Impact canon. `tools/render-intro-short.py` renders the film and `tools/render-voice-short.py` prepares local Kokoro-82M `af_heart` narration. The voice remains synthetic, with a ducked original score. The build embeds the video; subtitles from `src3d/intro-script.json` follow `video.currentTime`. The existing player supports pause, mute, skip, tab suspension, autoplay recovery, chapter indication and progress. Watch opening previews the film from the title without changing journey state. Short-revision verification is recorded separately below.

The three-act story is available from the title and pause menus. Lyra's opening dialogue and the final victory text connect the wind sigils and guardians to the valley's failed wind shrines. The editable presentation and PDF in `presentation/` explain the game and its story; the longer narrative remains a treatment rather than fully acted cutscenes.

## Verification

- Before the short-opening revision, 44/44 Node tests passed: 16 core/roster/packaging checks 14 production combat integration tests, and 14 intro-controller lifecycle/timing checks. Coverage includes shield counters, archer aim and elevation, mage escape windows, sentinel cones/slams, death cancellation and cleanup, plus terrain continuity, collision, reactions, hit deduplication, rewards, healing, XP, save validation, retry snapshots, death priority and standalone packaging.
- 66/66 preserved 2D tests pass. These remain separately identified.
- The previous 20-second revision passed 46 browser checks in `qa.html`: detailed avatar/resident loading, intro skip, movement, pause/resume, three-chapter story and About navigation, embedded-film skip cleanup, landmark and resident counts, work routes, roaming foes, trial populations, Vaporize, cooldown, burst consumption, chests, potion use, actual game-over state, retry, progression, both completion screens and final victory.
- Both trial simulations defeat every enemy through the actual attack/damage implementation, expire effects and reject duplicate rewards. **These use controlled fixtures that restore player HP and position the player near targets. They are not manual, unassisted complete playthroughs or difficulty validation.**
- Browser interaction exercised movement, map travel, exploration, sword attacks, settings, and Lyra's dialogue. Screenshots were inspected during repeated visual revisions. No new runtime errors appeared after the material-array fix in the verified runs; earlier console logs retain the repaired failure.
- The original 15-second intro's tests apply only to the preserved 2D game. The prior 20-second film was fully decoded with ffmpeg, visually reviewed at five key frames, and played to natural completion in the browser. The video decoded without media errors, transitioned into gameplay and reset/paused its audio. Browser checks confirmed pause freezes media time, resume and mute work. The synthetic voice remains a limitation versus a recorded human performance.

- The previous 64-second film contained 1,536 frames and passed full ffmpeg audio/video decode. Eight scene previews were visually inspected and its 44 automated tests passed. A fresh browser check was unavailable because local browser use was disabled in Work settings. These results apply to that earlier revision; no human listening review is claimed.
- The current 30-second revision contains 720 frames at 1280×720/24 fps and passed full FFmpeg audio/video decode. Seven key stills were inspected. The rebuilt standalone game and QA bundle compile; all 51 Node tests pass (16 core/roster/packaging, 15 combat, 16 intro, 4 movement). The 11-slide PowerPoint passed OOXML validation, object-bound and placeholder checks, and visual review; its matching PDF has 11 pages. A fresh browser check remains unavailable because local browser use is disabled in Work settings. New movement feel and combat difficulty need a live playthrough; none is claimed.

## Performance and limits

Earlier browser samples varied around 19–34 FPS with multiple preview tabs open. The final graphics pass produced an observed overlook sample of 52 FPS, 444 draw calls and 676,207 triangles at the current app viewport. Older intermediate samples are not directly comparable because scene content and viewport dimensions changed. Static batching, grass chunking and distance culling remain in use. These are snapshots, not a benchmark or a 60-FPS guarantee. Quality controls reduce pixel ratio and shadows. A dedicated single-tab device profile is still needed.

Direct `file://` opening could not be tested in the automated browser, which rejects local-file navigation. The built file embeds JavaScript, CSS, model data and audio; browser verification used a loopback server. Verify direct file opening in the user's browser before claiming universal offline compatibility.

Remaining limitations: approximate human-like synthetic voice; simplified character likenesses and hand animation; no production-grade animation blending, climbing, in-engine narrative cutscenes, interiors, dynamic NPC planning or PBR reflection capture; limited camera obstruction handling; possible cloth/body clipping in some poses; coin rewards credit directly rather than spawning physical pickups. Full unassisted trial playthroughs, sustained memory profiling and complete small-screen control usability remain unverified. Keyboard/mouse desktop play is the target.

Cloud preparation notes in `tools/amd/` were written before the user said they had no droplet. They were not executed remotely and are not required by the game.

## Current movement and enemy tuning

Frame-rate independent acceleration/braking, continuous stride phase, quaternion pose blending, turn lean, landing compression, 120 ms jump buffering and 100 ms edge grace improve movement transitions. All six enemy types gained roughly 37–42% HP and 33–40% damage, faster movement and shorter attack cooldowns; attack-warning durations and counterplay remain. Boss HP is now 700/1,200, with faster pursuit and shorter cooldowns after half health. Automated tests preserve sidestepping, death cancellation and shield counters. This is implemented tuning, not a claim of playtested final balance.

## Character likeness revision

Implemented authored layered golden hair, new amber iris texture, shorter split cloak, black-and-gold cropped outfit, gold guards, fitted greaves/boots and a silver sword. Bone-axis alignment fixes keep the added armor attached to limbs. Companion has a curved feature-only face texture without rectangular seams, white bob, smaller rose-gold crown segments, stars, tunic and waving constellation cape.

Both production rigs loaded in a CPU-only Node harness using the actual VRM loader; all posed vertices were finite. Front, back, three-quarter and sword-attack views were rasterized from exported geometry and inspected. Studio previews do not reproduce browser lighting or establish live GPU performance. Both bundles build and 51 automated tests pass. Fresh browser playtesting remains disabled in Work settings. Game-event and save behavior is documented in `GAME_EVENTS_AND_SAVES.md`.
