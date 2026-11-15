# Aether's Trial — Shared Contracts (owner: orchestrator)

## Build model
- Plain browser scripts, NO ES modules. Every file is an IIFE that attaches to the global `AT` (`window.AT` / `globalThis.AT`). Every file (except config.js) is wrapped as `(function(){ const AT = globalThis.AT; ... })();` so concatenation has no duplicate top-level declarations. config.js is loaded first and defines AT. In Node tests, config.js is evaluated first via vm in a shared context.
- Concatenation order into index.html (engine last; it boots on DOMContentLoaded):
  1 `src/config.js` (orchestrator) 2 `src/collision.js` 3 `src/elements.js` 4 `src/projectiles.js` 5 `src/combat.js`
  6 `src/world.js` 7 `src/enemies.js` 8 `src/bosses.js` 9 `src/levels.js`
  10 `src/progression.js` 11 `src/inventory.js` 12 `src/loot.js` 13 `src/minimap.js` 14 `src/hud.js`
  15 `src/audio.js` 16 `src/particles.js` 17 `src/sprites.js` 18 `src/renderer.js` 19 `src/cinematic.js`
  20 `src/input.js` 21 `src/camera.js` 22 `src/player.js` 23 `src/engine.js` (engine last; it boots on DOMContentLoaded).
- Files must not execute DOM/Canvas/Audio work at load time (only define things) so they load in Node (`vm`) for tests. Guard browser globals with `typeof`.
- Pure logic modules (combat, elements, collision, enemies, bosses, levels, progression, inventory, loot, world, player logic) MUST NOT touch the DOM/canvas, so Node tests can run them. Drawing lives in renderer/sprites/hud/minimap/cinematic.
- Units: pixels, seconds. All `update(dt)` get dt in seconds, already clamped to <= 0.05 by the engine. Logical canvas = 960x540 (`AT.CFG.VIEW_W/H`). Y axis down. Angles in radians, `facing` = angle (0 = +x).
- The rendering coordinate for all entities is world space; the camera is applied by renderer.

## Events (`AT.events`, defined in config.js)
`AT.events.on(name, fn)`, `AT.events.off(name, fn)`, `AT.events.emit(name, payload)`, `AT.events.clear()` (tests). Listener errors are caught.
Event names and payloads:
- `damage` `{target, source, amount, element:'physical'|'pyro'|'hydro'|'electro'|'anemo'|'none', reaction:null|'vaporize', crit:false, x, y, killed:bool}` — emitted after HP is reduced (target is enemy OR player).
- `enemyKilled` `{enemy, x, y, byPlayer:true}` — exactly once per enemy.
- `bossDefeated` `{boss, id:'mitachurl'|'stormdrake'}` — exactly once.
- `playerHurt` `{amount, x, y}`; `playerDied` `{}` (once per life).
- `swordSwing` `{x,y,angle}`; `skillCast` `{x,y,angle}`; `burstCast` `{x,y}`; `dash` `{x,y,angle}`.
- `hit` `{x,y,element,reaction,heavy:bool}` (impact feedback for fx/audio).
- `reaction` `{name:'vaporize', x, y, multiplier}`
- `energyChanged`, `hpChanged` `{}`.
- `chestOpened` `{chest, x, y, rewards:{coins,gems,potions}}`
- `pickup` `{kind:'coin'|'potion'|'gem', amount, x, y}`
- `levelUp` `{level}`
- `potionUsed` `{healed}`
- `levelComplete` `{levelIndex}` (once); `victory` `{}`
- `telegraph` `{kind, x,y}` (optional audio cue); `bossPhase` `{id, name}`
- `statechange` `{from,to}`

## Central config: `AT.CFG` (src/config.js, orchestrator; all modules read it, never hardcode numbers)
See src/config.js. Key groups: VIEW_W/H, PLAYER, SWORD, SKILL, BURST, DASH, REACTION{vaporize:1.5}, ENERGY, XP (table fn), LOOT, ENEMY types, BOSS types, LEVELS tuning, LIMITS (particles, damage numbers).

## Entities (plain objects)
Common: `{id, kind, x, y, vx, vy, r (collision radius), hp, maxHp, dead:false, facing, hitFlash:0 (sec), kb:{x,y} knockback velocity}`
- Player `AT.player` (created by `AT.Player.create()`): common + `{kind:'player', speed, atk (attack stat), maxHp, energy, maxEnergy, level, xp, invuln (sec remaining), dashTime, dashCd, atkCd, skillCd, swinging (sec), swingAngle, swingId, combo, moving:bool, anim:'idle'|'run'|'attack'|'dash'|'skill'|'burst'|'hurt'|'dead', animT, potions, coins, gems, afterimages:[{x,y,facing,life}]}`
  Stats are mirrored from progression: `AT.Progression.applyToPlayer(player)`.
- Enemy `{kind:'enemy', type:'slime', element:'hydro'|'pyro'|'electro'|'anemo'|'cryo'|'geo', aura:null|{element:'hydro', t}  // t secs remaining, state:'idle'|'wander'|'chase'|'windup'|'attack'|'recover'|'dead', stateT, telegraph:null|{shape:'circle'|'cone'|'rect'|'line', x,y,r,angle,w,len,t,dur}, dmg (contact/attack damage), speed, xp, coins, rewardGiven:false, hitIds:{} }`
- Boss: enemy shape plus `{kind:'boss', id:'mitachurl'|'stormdrake', name, phase, attackName, active:bool (engaged), arena}`.
- Projectile `{kind:'projectile', owner:'player'|'enemy', element, x,y,vx,vy,r,dmg,life,pierce:bool,hitIds:{},dead:false, hitId (attack id), color}`
- Chest `{kind:'chest', id, x, y, r:22, opened:false, rewards:{coins,gems,potions}}`
- Pickup `{kind:'pickup', type:'coin'|'potion'|'gem', x,y, amount, life, vx,vy, collected:false}`
- Obstacle `{type:'rect'|'circle', x,y,w,h | r, visual:'tree'|'rock'|'pillar'|'water'|'ruin'|'wall'|'void', solid:true}`
- Hit/attack id: every attack gets a unique `hitId` (`AT.nextId()`); an enemy keeps `hitIds[hitId]=true` after being damaged by it, preventing repeat damage from the same attack.

## Module APIs

### collision.js — `AT.Collision`
`circleCircle(a,b)`, `circleRect(cx,cy,r,rect)`, `pointInCone(px,py,r, ox,oy,angle,arc,range)` (circle-vs-cone for sword), `circleInRectOriented`, `resolveCircleVsObstacles(ent, obstacles)` (pushes ent out; returns true if moved), `clampToWorld(ent, world)`, `segmentHitsObstacle`, `dist`, `angleTo`, `normalizeAngle`.

### elements.js — `AT.Elements`
`applyElement(enemy, element, gaugeUnits?)` sets enemy.aura; `tick(enemy, dt)` decays aura; `resolve(enemy, element, baseDamage)` → `{damage, reaction:null|'vaporize', multiplier, consumedAura}`. Rules: element 'physical' NEVER reacts and never applies aura. Pyro hitting enemy with hydro aura (including enemy.element==='hydro' innate wet status: hydro slimes ALWAYS count as hydro-affected) → vaporize, multiplier exactly `AT.CFG.REACTION.vaporize` (1.5); consumes the aura of non-innate hydro (innate hydro slimes keep it). Hydro hits on pyro aura also vaporize ×1.0? NO: only Pyro-triggered ×1.5 is required; hydro applying aura is allowed but no reaction. Pyro applies pyro aura otherwise.

### projectiles.js — `AT.Projectiles`
`list` array (capped `CFG.LIMITS.projectiles`), `spawn(def)`, `update(dt, ctx)` (moves, collides vs obstacles/targets, damages through `AT.Combat`), `clear()`. Player projectiles hit enemies; enemy projectiles hit player (respect invuln).

### combat.js — `AT.Combat`
`dealDamageToEnemy(enemy, {amount, element, source:'player', hitId, knockback:{x,y} or dir+force, heavy})` — the ONE path through which enemies take damage; ignores dead, repeated hitId; uses `AT.Elements.resolve`; applies knockback (bosses reduced via `CFG.BOSS.*.kbResist`), hitFlash, emits `damage`, `hit`, `reaction`, `enemyKilled`/`bossDefeated`, grants energy (`CFG.ENERGY`).
`damagePlayer(player, amount, srcInfo)` — respects `invuln`, dead; emits `playerHurt`, `damage`, `playerDied`.
`playerSword(player, ctx)` / `playerSkill(player, ctx)` / `playerBurst(player, ctx)` return true if executed (cooldown/energy checked inside). `ctx = {enemies:[...incl bosses], world}`. `update(dt, ctx)` processes active swing hitboxes (damage window in the swing), skill/burst delayed ticks.
Sword = physical, hits cone in front of the player once per swing. Skill (E) = pyro cone/fireball burst, `CFG.SKILL.cooldown`. Burst (Q) = pyro AoE, costs `CFG.BURST.cost` energy (full), clears energy. Damage = `player.atk * multiplier`.
`AT.Combat.state` = `{swings:[], effects:[]}` plus visible hit shapes for the renderer: `AT.Combat.activeHitboxes` (array of `{shape, x,y,r,angle,arc,range,t,dur,element}`) used by renderer for slash arcs.

### world.js — `AT.World`
`create(levelDef)` → `{index, w, h, obstacles[], decor[], spawnPoints, playerStart, theme:'fields'|'ruins', water:[rect], bounds}`. `isBlocked(x,y,r)`, `randomOpenPoint(rng, r)`.

### levels.js — `AT.Levels`
`AT.Levels.defs[0|1]` (data) and `AT.Levels.load(index, rng?)` → `level = {index, name, world, enemies[] (regular), boss, chests[], pickups[], objective:string, completed:false, enemiesTotal, bossDefeated:false}`; `AT.Levels.update(dt, level, player)` handles enemy/boss AI via `AT.Enemies/AT.Bosses`, removes cleaned dead, checks completion once (emits `levelComplete`; sets `level.completed=true` first). Deterministic when given seeded rng `AT.rng(seed)` (defined in config.js). Level 1: exactly 10 regular slimes + Mitachurl + 3 chests. Level 2: exactly 15 regular enemies + Storm Drake + 2 chests.
Completion rule: `enemies.every(dead) && boss.dead`.

### enemies.js — `AT.Enemies`
`create(type, element, x, y, levelIndex)`, `update(enemy, dt, ctx)`; `ctx={player, world, level}`; enemy contact/attack damage via `AT.Combat.damagePlayer`. Slime: wander → chase within aggro → windup (telegraph circle, ≥0.45s) → leap/attack → recover. Level 2 multiplies speed & dmg via `CFG.LEVELS[i].enemySpeedMul/enemyDmgMul`. Dead enemies do nothing.

### bosses.js — `AT.Bosses`
`create(id, x, y)`, `update(boss, dt, ctx)`. Mitachurl: heavy melee (cone telegraph), charge (line telegraph ≥0.8s then dash), ground slam (circle telegraph ≥0.9s). Storm Drake: projectile volley (enemy projectiles, element 'electro'), sweeping energy attack (cone/arc telegraph sweeping), AoE (several circle telegraphs ≥1s). Boss `active` once player within aggro range. Telegraph shapes drawn by renderer from `boss.telegraph` (fields as in enemy telegraph).

### progression.js — `AT.Progression`
Persistent state `AT.Progression.state = {level, xp, coins, gems, potions, maxHp, atk}`; `reset()`, `xpToNext(level)`, `addXp(n)` (multiple level-ups, emits `levelUp`), `addCoins`, `addGems`, `addPotions`, `snapshot()` / `restore(snap)` (retry restores level-entry snapshot), `applyToPlayer(p)`. `AT.Progression.beginLevel(levelIndex)` stores the entry snapshot. `retryLevel()` restores it.
Rewards given by listening to `enemyKilled` with `rewardGiven` flag guard (one grant per enemy id). Drops: coins always, potion by `CFG.LOOT.potionDropChance` (seeded).

### inventory.js — `AT.Inventory`
`usePotion(player)` (needs potions>0 and hp<maxHp; heals `CFG.LOOT.potionHeal` clamped; emits `potionUsed`), `openChest(chest, player)` (once only), `nearestChest(player, chests, range)`.

### loot.js — `AT.Loot`
`spawnDrops(enemy, level, rng)`, `update(dt, level, player)` (magnet + collect pickups, emits `pickup`, cap `CFG.LIMITS.pickups`), `interact(player, level)` handles F. Chest rewards from `CFG.LOOT.chests[levelIndex][i]`.

### hud.js / minimap.js
`AT.HUD.draw(ctx, game)`, `AT.HUD.drawScreen(ctx, game)` (title/pause/levelComplete/gameOver/victory overlays, returns clickable regions `AT.HUD.buttons`), `AT.Minimap.draw(ctx, x, y, size, game)`, `AT.Minimap.worldToMap(...)`, `AT.Minimap.collectBlips(game)` (pure, testable: returns [{type:'player'|'enemy'|'boss'|'chest', x,y}] only for living enemies and unopened chests).

### Visual stack
- `AT.Particles`: `spawn(def)`, `burst(kind,x,y,opts)`, `update(dt)`, `draw(ctx,cam)`, `clear()`, `count()`; hard cap `CFG.LIMITS.particles`; listens to events itself via `AT.Particles.bind()`.
- `AT.Sprites`: `drawPlayer(ctx, player, t)`, `drawEnemy(ctx, e, t)`, `drawBoss(ctx, b, t)`, `drawChest`, `drawPickup`; cached offscreen canvases allowed (lazy, created inside function).
- `AT.Renderer`: `drawWorld(ctx, game, cam, t)` (background, decor, obstacles, entities y-sorted, telegraphs, slashes, particles, damage numbers, vignette/lighting), `AT.Renderer.floatingText` list updated via `damage` events (`update(dt)`).
- `AT.Cinematic`: `start()`, `update(dt)` (returns true when finished), `draw(ctx, w, h)`, `skip()`, `isDone()`, `duration = 15`; narration via `speechSynthesis` guarded; subtitles always drawn. `AT.Cinematic.played` flag set once; the engine never replays.
- `AT.Audio`: `init()` (called from first user gesture), `play(name)`, `bind()` listens to events; names: swing, hit, fire, vaporize, burst, dash, chest, coin, levelup, bossdefeat, gameover, victory, hurt, potion, telegraph, click. All wrapped in try/catch.

### Engine — `AT.Game` (engine.js)
`AT.Game = {state:'title'|'cinematic'|'playing'|'paused'|'levelComplete'|'gameOver'|'victory', levelIndex, level, player, cam, time}`. `AT.Game.start(canvas)`, `AT.Game.step(dt)` (pure simulation step, used by tests), `AT.Game.setState(s)`, `AT.Game.beginLevel(i)`, `AT.Game.retry()`, `AT.Game.nextLevel()`. A single rAF loop (guard against duplicates). `AT.Input` : `down` map, `pressed(code)` edge-triggered, `endFrame()`, `bind(target)`; `preventDefault` for Space, arrows, WASD, Shift... when state is playing/paused.
Flow: title → (click/Enter) → cinematic (first time only) → playing L1 → levelComplete → playing L2 → victory. gameOver → Retry (R/Enter/button) restores entry snapshot and reloads same level, never plays cinematic.
`AT.Game.step(dt)` order: input→player.update→combat.update→projectiles.update→levels.update→loot.update→camera→particles/renderer fx.

## File ownership
Each subagent edits ONLY its listed files. Orchestrator owns config.js, contracts.md, index.html, build script, BUILD_REPORT.md. If a subagent needs a config value that is missing, it must NOT edit config.js: it uses `AT.CFG.X.y` with a fallback `|| default` and reports the key in its final message so the orchestrator can add it.
