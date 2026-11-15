# Aether's Trial — QA Report

Scope: Node-only logic tests (`node:assert` + `node:vm`, src files loaded in build.js order into one shared context, no DOM). Nothing in `src/` or `index.html` was modified.
Run date: 2026-11-15. Node v24.19.0.

## Summary

| Suite | Command | Exit | Passed | Failed |
|---|---|---|---|---|
| game | `node tests/game.test.js` | 0 | 22 | 0 |
| combat | `node tests/combat.test.js` | 1 | 23 | 1 |
| progression | `node tests/progression.test.js` | 0 | 20 | 0 |
| **Total** | | | **65** | **1** |

## Bugs found

1. **BUG-1 (minor, FAIL)** `src/combat.js:129` — `const combo = state.clock <= state.comboUntil ? ... : 0;`. After `AT.Combat.reset()` (called by `AT.Game._loadLevel` on every level start/retry) both `state.clock` and `state.comboUntil` are 0, so `0 <= 0` is true and the very first swing is combo index 1 instead of 0. The next swing is therefore combo 2 (x1.35 heavy hit) one swing early. Suggested fix: initialise `comboUntil = -1` in `state` and in `reset()`, or use `<`. Evidence: test `sword combo: the first swing after Combat.reset() is combo 0...` fails with `first swing combo index ... 1 !== 0`.

No other defects were found by these tests. Test-writing notes (not game bugs): `assert.deepStrictEqual` across the vm realm fails on prototypes, so tests compare via JSON; the Storm Drake sweep test places the player at distance ~190 because the sweep range is 200 and the drake holds a ~250 px hover distance, so sweeps only hit a player who stays close (expected AI behaviour, noted for balance).

## Requirement checklist

Each line is backed by the named test(s); full raw output is below.

| # | Item | Result | Test |
|---|---|---|---|
| 1 | Player movement (175 px/s, normalized diagonals, arrows) | PASS | game: movement x2 |
| 2 | World clamp (incl. dash) and obstacle collision | PASS | game: world clamp, collision |
| 3 | Sword hitbox: only targets inside cone | PASS | combat: sword cone |
| 4 | Sword: one hit per swing; cooldown | PASS | combat: sword cone, cooldown |
| 5 | Sword combo indexing after reset | **FAIL** | combat: sword combo (BUG-1) |
| 6 | Dash distance + invulnerability | PASS | combat: dash invuln |
| 7 | Dash cooldown 0.85s | PASS | combat: dash cooldown |
| 8 | Skill cooldown 5s | PASS | combat: skill cooldown, skill damage |
| 9 | Burst costs exactly 60 energy; 3 ticks; radius | PASS | combat: burst x2 |
| 10 | Vaporize exactly 1.5x on hydro, not on physical | PASS | combat: vaporize x2 |
| 11 | No damage to dead enemies; same hitId never twice | PASS | combat: dead enemies, same hitId |
| 12 | Enemy AI chase / telegraph (>=0.45s) / attack; passive out of range; dead inert | PASS | combat: enemy AI x3 |
| 13 | Mitachurl melee (cone), charge (line >=0.8s), slam (circle >=0.9s); damage only after telegraph | PASS | combat: Mitachurl x2 |
| 14 | Storm Drake projectile volley (electro, enemy-owned), sweep cone, AoE circles >=1s | PASS | combat: Storm Drake |
| 15 | Boss defeat events fire once | PASS | combat: boss defeat |
| 16 | Player damage, 0.6s invuln, death (once), no actions when dead | PASS | combat: player damage, death |
| 17 | XP and level-ups, stat growth (+18 hp, +3 atk), multi-level, cap | PASS | progression: xp x3 |
| 18 | Kill rewards once per enemy; coin pickup once | PASS | progression: kill rewards, loot |
| 19 | 3 chests on level 1 (2 on level 2) | PASS | progression: level 1 has exactly 3 chests |
| 20 | Chest rewards once only; F interact | PASS | progression: chest x3 |
| 21 | Potion heal clamped to max HP | PASS | progression: potion x2 |
| 22 | Minimap blips accuracy (living enemies, boss, unopened chests, player, coordinates) | PASS | game: minimap x3 |
| 23 | Level 1: 10 enemies + Mitachurl | PASS | progression: level 1 |
| 24 | Level 2: 15 enemies + Storm Drake | PASS | progression: level 2 |
| 25 | Level completion fires exactly once | PASS | progression: level completion x2; game: level 1 complete |
| 26 | Game over retry restores snapshot, no reward farming | PASS | progression: retry x3 |
| 27 | Progression carries to level 2 | PASS | progression: carries into level 2 |
| 28 | Cinematic 15s duration and skip | PASS | game: cinematic x4 |
| 29 | Pause freezes simulation | PASS | game: pause x2 |
| 30 | Final victory flow via AT.Game.step | PASS | game: full flow, victory |
| 31 | Real canvas rendering / visuals | NOT RUN | needs a browser |
| 32 | Audio (WebAudio) playback | NOT RUN | needs a browser |
| 33 | Speech synthesis narration | NOT RUN | needs a browser (only the timing logic was tested) |
| 34 | Offline `file://` open of index.html | NOT RUN | not opened in a browser |
| 35 | 60 FPS performance | NOT RUN | not measured |
| 36 | Real keyboard/mouse/focus/blur handling, button click regions | NOT RUN | only `AT.Input.press()`/`handleInput()` simulated |

Note: `minimap.draw()` was only run against a stub context (no exception, >20 draw calls); that is not a visual check.

## Raw command output

### `node tests/game.test.js`
```
PASS movement: WASD moves at 175 px/s, diagonals are normalized
PASS movement: arrow keys work; no input means no movement
PASS world clamp: player cannot leave 0..w / 0..h (including during a dash)
PASS collision: player cannot walk or dash through solid obstacles
PASS input: Space triggers a sword swing through AT.Player.update; E skill; Q burst needs energy
PASS minimap: blips match living enemies, boss, unopened chests and player exactly
PASS minimap: worldToMap maps world corners to the map square and is aspect-preserving
PASS minimap: draw() runs against a recording stub context without throwing
PASS cinematic: duration is 15s, finishes exactly at 15s, not before
PASS cinematic: skip() ends it immediately and is idempotent
PASS game flow: title -> cinematic (15s of AT.Game.step) -> playing level 1, plays only once
PASS game flow: Enter during cinematic skips it (handleInput) and starts level 1
PASS pause: step() freezes player, enemies, boss, projectiles, timers and level time
PASS pause/resume via Escape/P and gameplay resumes
PASS integration: enemy near player damages them through AT.Game.step (no dmg during invuln)
PASS integration: sword via Game.step kills a slime, grants xp, drops coin, minimap updates
PASS integration: player death -> gameOver after 0.8s delay; world frozen in gameOver
PASS game over: retry via Enter key (handleInput) and R key
PASS level 1 complete via Game.step: levelComplete event fires exactly once, state -> levelComplete, no repeat
PASS full flow: L1 complete -> Enter -> L2 -> complete -> victory (victory event once)
PASS victory: Enter returns to title; a new run resets progression and skips cinematic
PASS no double rewards: killing a dead-and-already-rewarded boss again does not grant xp twice

tests/game.test.js: 22 passed, 0 failed, 22 total
(exit code: 0)
```

### `node tests/combat.test.js`
```
PASS sword: only targets inside the cone are hit, once per swing
PASS sword: cooldown blocks immediate re-swing, next swing hits again
FAIL sword combo: the first swing after Combat.reset() is combo 0, second is combo 1 (x1.0 each)
     first swing combo index (clock==0 satisfies clock<=comboUntil==0)

     1 !== 0

PASS sword: a dead player cannot swing
PASS dash: moves ~88px, grants invulnerability, then expires
PASS dash: 0.85s cooldown (second press ignored, third works)
PASS skill: 5s cooldown
PASS skill: pyro damage = atk*1.7 on non-hydro, vaporized x1.5 on hydro slime
PASS burst: costs exactly 60 energy (CFG) and needs it
PASS burst: hits every enemy in radius once per tick (3 ticks), none outside
PASS vaporize: exactly 1.5x for pyro on hydro; physical never reacts nor applies aura
PASS vaporize: innate hydro slime keeps vaporizing; hydro aura on other enemy is consumed
PASS dead enemies take no damage and kill events fire once
PASS same hitId never damages an enemy twice
PASS boss knockback is reduced by kbResist (Mitachurl 0.85)
PASS enemy AI: idle -> chase -> telegraphed windup (>=0.45s) -> attack; no damage during windup
PASS enemy AI: stays passive when player is out of aggro range
PASS enemy AI: dead enemy does nothing
PASS Mitachurl: melee cone + slam circle telegraphs precede damage
PASS Mitachurl: charge line telegraph >=0.8s precedes dash damage
PASS Storm Drake: volley (electro projectiles), sweep cone, AoE circles >=1s
PASS boss defeat: enemyKilled and bossDefeated each fire exactly once
PASS player damage: reduces hp, 0.6s invuln blocks repeats, then damage works again
PASS player death: hp 0, dead flag, playerDied once, no further damage, no movement

tests/combat.test.js: 23 passed, 1 failed, 24 total
(exit code: 1)
```

### `node tests/progression.test.js`
```
PASS xp: table values and level-up at exactly 40 xp (stat growth +18 hp, +3 atk)
PASS xp: multiple level-ups from one grant, carry-over xp, level-up heals 40% of max hp (clamped)
PASS xp: max level cap (30) stops leveling
PASS kill rewards: xp granted once per enemy even if enemyKilled is re-emitted
PASS loot: coin pickup is collected once and credited exactly
PASS level 1 has exactly 3 chests, level 2 has 2, all unopened with CFG rewards
PASS chest: rewards granted once only, event once
PASS chest: F-interact opens only the nearest in range, never twice
PASS chest: all 3 level-1 chests together give 95 coins, 40 gems, +3 potions (1 start + 3 = 4)
PASS potion: heal 45 clamped to max hp, consumed, refused at full hp or with none
PASS potion: dead player cannot drink
PASS level 1: exactly 10 slimes + Mitachurl, >=3 hydro, objective text, enemies on open ground
PASS level 2: exactly 15 enemies + Storm Drake, scaled stats
PASS levels load deterministically with the same seed
PASS level completion: needs ALL enemies + boss dead; fires exactly once
PASS level completion: boss alone dead is not enough
PASS retry restores entry snapshot: no xp/coin/chest farming from a failed attempt
PASS retry never replays the cinematic and keeps AT.Game.levelIndex
PASS retry of level 2 restores the level-2 entry snapshot (keeps level-1 progress, drops level-2 gains)
PASS progression carries into level 2 (level, stats, coins, gems, potions)

tests/progression.test.js: 20 passed, 0 failed, 20 total
(exit code: 0)
```
