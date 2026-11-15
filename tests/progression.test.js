'use strict';
// Dependency-free harness: loads src/*.js (build.js order) into one shared vm context.
const fs = require('fs'), path = require('path'), vm = require('node:vm'), assert = require('node:assert');
const ORDER = ['config','collision','elements','projectiles','combat','world','enemies','bosses','levels','progression','inventory','loot','minimap','hud','audio','particles','sprites','renderer','cinematic','input','camera','player','engine'];
const ctx = vm.createContext({ console, setTimeout, clearTimeout });
for (const n of ORDER) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', n + '.js'), 'utf8'), ctx, { filename: n + '.js' });
const AT = ctx.AT;
const results = [];
function test(name, fn) {
  try { fn(); results.push(true); console.log('PASS ' + name); }
  catch (e) { results.push(false); console.log('FAIL ' + name + '\n     ' + String(e && e.message).split('\n').join('\n     ')); }
}
function finish(file) {
  const pass = results.filter(Boolean).length, fail = results.length - pass;
  console.log('\n' + file + ': ' + pass + ' passed, ' + fail + ' failed, ' + results.length + ' total');
  process.exit(fail ? 1 : 0);
}
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= (eps == null ? 1e-6 : eps), (msg || 'value') + ': expected ' + b + ' got ' + a);
function reset(getLevel) {
  AT.events.clear(); AT.Combat.reset(); AT.Projectiles.clear(); AT.Input.clear();
  AT.Progression.reset(); AT.Progression.bind(getLevel || (() => null));
  AT.player = null;
}
function record(names) { const log = {}; for (const n of names) { log[n] = []; AT.events.on(n, p => log[n].push(p)); } return log; }
function mkPlayer(x, y, facing) { const p = AT.Player.create(); p.x = x; p.y = y; p.facing = facing || 0; return p; }
function mkEnemy(el, x, y, li) { return AT.Enemies.create('slime', el || 'pyro', x, y, li || 0); }
function bigWorld() { return AT.World.create({ w: 2000, h: 1500, obstacles: [] }); }
function combatRun(p, enemies, secs, dt) { dt = dt || 0.02; const n = Math.round(secs / dt); for (let i = 0; i < n; i++) AT.Combat.update(dt, { enemies, player: p }); }
function killAll(level) { // kills every enemy and the boss through the real damage path
  const all = level.enemies.concat(level.boss ? [level.boss] : []);
  for (const e of all) AT.Combat.dealDamageToEnemy(e, { amount: 1e6, element: 'physical', source: 'player', hitId: AT.nextId() });
}

const loadL = (i) => AT.Levels.load(i, AT.rng(1337 + i * 101));
const killOne = (e) => AT.Combat.dealDamageToEnemy(e, { amount: 1e6, element: 'physical', source: 'player', hitId: AT.nextId() });

// ---------------------------------------------------------------- XP / levels
test('xp: table values and level-up at exactly 40 xp (stat growth +18 hp, +3 atk)', () => {
  reset(); const P = AT.Progression, log = record(['levelUp']);
  assert.strictEqual(P.xpToNext(1), 40); assert.strictEqual(P.xpToNext(2), 68); assert.strictEqual(P.xpToNext(3), 114);
  const p = AT.Player.create(); assert.strictEqual(p.maxHp, 100); assert.strictEqual(p.atk, 10);
  assert.strictEqual(P.addXp(39), 0); assert.strictEqual(P.state.level, 1);
  assert.strictEqual(P.addXp(1), 1);
  assert.strictEqual(P.state.level, 2); assert.strictEqual(P.state.xp, 0);
  assert.strictEqual(P.state.maxHp, 118); assert.strictEqual(P.state.atk, 13);
  assert.strictEqual(p.maxHp, 118); assert.strictEqual(p.atk, 13); assert.strictEqual(p.level, 2);
  assert.deepStrictEqual(log.levelUp.map(l => l.level), [2]);
});
test('xp: multiple level-ups from one grant, carry-over xp, level-up heals 40% of max hp (clamped)', () => {
  reset(); const P = AT.Progression, log = record(['levelUp']); const p = AT.Player.create(); p.hp = 50;
  assert.strictEqual(P.addXp(40 + 68 + 10), 2);
  assert.strictEqual(P.state.level, 3); assert.strictEqual(P.state.xp, 10);
  assert.strictEqual(P.state.maxHp, 136); assert.strictEqual(P.state.atk, 16);
  assert.deepStrictEqual(log.levelUp.map(l => l.level), [2, 3]);
  near(p.hp, Math.min(136, (50 + 118 * 0.4) + 136 * 0.4), 1e-9, 'hp after two heals');
  const q = AT.Player.create(); assert.strictEqual(q.hp, 136, 'new player starts at max hp'); assert.strictEqual(q.atk, 16);
});
test('xp: max level cap (30) stops leveling', () => {
  reset(); const P = AT.Progression; AT.Player.create(); P.addXp(1e7);
  assert.strictEqual(P.state.level, 30); assert.strictEqual(P.state.xp, 0); assert.strictEqual(P.addXp(500), 0); assert.strictEqual(P.state.level, 30);
});
test('kill rewards: xp granted once per enemy even if enemyKilled is re-emitted', () => {
  reset(() => lv); const P = AT.Progression; AT.Player.create(); const lv = loadL(0), e = lv.enemies[0];
  killOne(e); assert.strictEqual(P.state.xp, 12); assert.strictEqual(e.rewardGiven, true);
  AT.events.emit('enemyKilled', { enemy: e, x: 0, y: 0, byPlayer: true }); AT.events.emit('enemyKilled', { enemy: e });
  assert.strictEqual(P.state.xp, 12, 'no double reward'); assert.strictEqual(P.stats.kills, 1);
  assert.ok(lv.pickups.some(k => k.type === 'coin'), 'coin dropped into the level');
});
test('loot: coin pickup is collected once and credited exactly', () => {
  reset(() => lv); const P = AT.Progression; const p = AT.Player.create(); const lv = loadL(0), e = lv.enemies[0];
  killOne(e); const coin = lv.pickups.find(k => k.type === 'coin'); assert.ok(coin && coin.amount >= 3 && coin.amount <= 6);
  p.x = coin.x; p.y = coin.y; const log = record(['pickup']);
  for (let i = 0; i < 5; i++) AT.Loot.update(0.05, lv, p);
  assert.strictEqual(P.state.coins, coin.amount); assert.strictEqual(log.pickup.length >= 1, true);
  for (let i = 0; i < 20; i++) AT.Loot.update(0.05, lv, p);
  assert.strictEqual(P.state.coins, coin.amount, 'not collected twice');
});

// ---------------------------------------------------------------- chests / potions
test('level 1 has exactly 3 chests, level 2 has 2, all unopened with CFG rewards', () => {
  reset(); const a = loadL(0), b = loadL(1);
  assert.strictEqual(a.chests.length, 3); assert.strictEqual(b.chests.length, 2);
  assert.ok(a.chests.every(c => !c.opened && c.kind === 'chest'));
  assert.deepStrictEqual(a.chests.map(c => c.rewards), AT.CFG.LOOT.chests[0]);
  assert.deepStrictEqual(b.chests.map(c => c.rewards), AT.CFG.LOOT.chests[1]);
  assert.ok(a.chests.every(c => !a.world.isBlocked(c.x, c.y, 10)), 'chests are reachable (not inside obstacles)');
});
test('chest: rewards granted once only, event once', () => {
  reset(); const P = AT.Progression, p = AT.Player.create(), lv = loadL(0), c = lv.chests[0], log = record(['chestOpened']);
  const r1 = AT.Inventory.openChest(c, p, lv); const r2 = AT.Inventory.openChest(c, p, lv);
  assert.strictEqual(JSON.stringify(r1), JSON.stringify({ coins: 25, gems: 10, potions: 1 })); assert.strictEqual(r2, null);
  assert.strictEqual(P.state.coins, 25); assert.strictEqual(P.state.gems, 10); assert.strictEqual(P.state.potions, 2);
  assert.strictEqual(c.opened, true); assert.strictEqual(log.chestOpened.length, 1);
});
test('chest: F-interact opens only the nearest in range, never twice', () => {
  reset(); const P = AT.Progression, p = AT.Player.create(), lv = loadL(0), c = lv.chests[1];
  p.x = c.x + 30; p.y = c.y; assert.strictEqual(AT.Loot.interact(p, lv), c); assert.strictEqual(AT.Loot.interact(p, lv), null);
  assert.strictEqual(P.state.coins, 30); p.x = c.x + 500; assert.strictEqual(AT.Loot.interact(p, lv), null, 'out of range');
  assert.strictEqual(lv.chests.filter(k => k.opened).length, 1);
});
test('chest: all 3 level-1 chests together give 95 coins, 40 gems, +3 potions (1 start + 3 = 4)', () => {
  reset(); const P = AT.Progression, p = AT.Player.create(), lv = loadL(0);
  for (const c of lv.chests) AT.Inventory.openChest(c, p, lv);
  assert.strictEqual(P.state.coins, 95); assert.strictEqual(P.state.gems, 40); assert.strictEqual(P.state.potions, 4);
});
test('potion: heal 45 clamped to max hp, consumed, refused at full hp or with none', () => {
  reset(); const P = AT.Progression, p = AT.Player.create(), log = record(['potionUsed']);
  P.state.potions = 3;
  p.hp = p.maxHp; assert.strictEqual(AT.Inventory.usePotion(p), false); assert.strictEqual(P.state.potions, 3, 'not consumed at full hp');
  p.hp = 95; assert.strictEqual(AT.Inventory.usePotion(p), true); assert.strictEqual(p.hp, 100); assert.strictEqual(log.potionUsed[0].healed, 5);
  p.hp = 20; AT.Inventory.usePotion(p); assert.strictEqual(p.hp, 65); assert.strictEqual(log.potionUsed[1].healed, 45);
  assert.strictEqual(P.state.potions, 1); p.hp = 10; AT.Inventory.usePotion(p); assert.strictEqual(P.state.potions, 0);
  p.hp = 10; assert.strictEqual(AT.Inventory.usePotion(p), false); assert.strictEqual(p.hp, 10); assert.strictEqual(p.potions, 0);
});
test('potion: dead player cannot drink', () => {
  reset(); const p = AT.Player.create(); p.hp = 0; p.dead = true; assert.strictEqual(AT.Inventory.usePotion(p), false);
});

// ---------------------------------------------------------------- level contents
test('level 1: exactly 10 slimes + Mitachurl, >=3 hydro, objective text, enemies on open ground', () => {
  reset(); const lv = loadL(0);
  assert.strictEqual(lv.enemies.length, 10); assert.strictEqual(lv.enemiesTotal, 10);
  assert.ok(lv.enemies.every(e => e.type === 'slime' && !e.dead));
  assert.ok(lv.enemies.filter(e => e.element === 'hydro').length >= 3);
  assert.ok(lv.boss && lv.boss.id === 'mitachurl' && lv.boss.hp === 520);
  assert.ok(lv.enemies.every(e => !lv.world.isBlocked(e.x, e.y, e.r)), 'no enemy spawns inside an obstacle');
  assert.ok(lv.objective.length > 0); assert.strictEqual(lv.world.w, 2000); assert.strictEqual(lv.world.h, 1500);
});
test('level 2: exactly 15 enemies + Storm Drake, scaled stats', () => {
  reset(); const lv = loadL(1);
  assert.strictEqual(lv.enemies.length, 15); assert.ok(lv.boss && lv.boss.id === 'stormdrake' && lv.boss.hp === 900);
  const sl = lv.enemies.find(e => e.behavior === 'normal'); assert.strictEqual(sl.hp, Math.round(38 * 1.4)); near(sl.dmg, 9 * 1.5, 1e-9);
  assert.ok(lv.enemies.some(e => e.behavior === 'shooter'), 'ranged variants exist'); assert.strictEqual(lv.world.w, 2200);
});
test('levels load deterministically with the same seed', () => {
  reset(); const a = loadL(0), b = loadL(0);
  assert.deepStrictEqual(a.enemies.map(e => [Math.round(e.x), Math.round(e.y), e.element]), b.enemies.map(e => [Math.round(e.x), Math.round(e.y), e.element]));
});

// ---------------------------------------------------------------- level completion
test('level completion: needs ALL enemies + boss dead; fires exactly once', () => {
  reset(() => lv); const p = AT.Player.create(), lv = loadL(0), log = record(['levelComplete']);
  p.x = lv.world.playerStart.x; p.y = lv.world.playerStart.y;
  for (const e of lv.enemies) killOne(e);
  for (let i = 0; i < 10; i++) AT.Levels.update(0.05, lv, p);
  assert.strictEqual(lv.completed, false, 'boss still alive'); assert.strictEqual(log.levelComplete.length, 0);
  killOne(lv.boss);
  for (let i = 0; i < 60; i++) AT.Levels.update(0.05, lv, p);
  assert.strictEqual(lv.completed, true); assert.strictEqual(log.levelComplete.length, 1); assert.strictEqual(log.levelComplete[0].levelIndex, 0);
});
test('level completion: boss alone dead is not enough', () => {
  reset(() => lv); const p = AT.Player.create(), lv = loadL(0), log = record(['levelComplete']); killOne(lv.boss);
  for (let i = 0; i < 40; i++) AT.Levels.update(0.05, lv, p);
  assert.strictEqual(lv.completed, false); assert.strictEqual(log.levelComplete.length, 0);
});

// ---------------------------------------------------------------- game over / retry / carry-over (via AT.Game)
function newGame() {
  reset(() => AT.Game.level); AT.Game.cinematicPlayed = true; AT.Cinematic.played = true; AT.Game.state = 'title'; AT.Game.startGame();
  assert.strictEqual(AT.Game.state, 'playing'); return AT.Game;
}
function stepN(n, dt) { for (let i = 0; i < n; i++) AT.Game.step(dt || 0.05); }
test('retry restores entry snapshot: no xp/coin/chest farming from a failed attempt', () => {
  const G = newGame(), P = AT.Progression;
  const first = G.level.enemies.slice(0, 3); first.forEach(killOne); AT.Inventory.openChest(G.level.chests[0], G.player, G.level);
  const xp1 = P.state.xp; const coinAfterChest = P.state.coins;
  assert.strictEqual(xp1, 36); assert.ok(coinAfterChest >= 25);
  AT.Combat.damagePlayer(G.player, 99999, {}); stepN(30); assert.strictEqual(G.state, 'gameOver');
  G.retry();
  assert.strictEqual(G.state, 'playing'); assert.strictEqual(P.state.xp, 0); assert.strictEqual(P.state.coins, 0); assert.strictEqual(P.state.gems, 0);
  assert.strictEqual(P.state.potions, AT.CFG.LOOT.startPotions); assert.strictEqual(P.state.level, 1);
  assert.strictEqual(G.level.enemies.length, 10); assert.ok(G.level.enemies.every(e => !e.dead) && G.level.chests.every(c => !c.opened));
  assert.ok(!G.player.dead && G.player.hp === G.player.maxHp);
  G.level.enemies.slice(0, 3).forEach(killOne); AT.Inventory.openChest(G.level.chests[0], G.player, G.level);
  assert.strictEqual(P.state.xp, xp1, 'same kills give same xp, not double'); assert.strictEqual(P.state.coins, coinAfterChest);
});
test('retry never replays the cinematic and keeps AT.Game.levelIndex', () => {
  const G = newGame(); AT.Combat.damagePlayer(G.player, 99999, {}); stepN(30); assert.strictEqual(G.state, 'gameOver');
  G.retry(); assert.strictEqual(G.state, 'playing'); assert.strictEqual(G.levelIndex, 0);
});
test('retry of level 2 restores the level-2 entry snapshot (keeps level-1 progress, drops level-2 gains)', () => {
  const G = newGame(), P = AT.Progression; killAll(G.level); stepN(40); assert.strictEqual(G.state, 'levelComplete');
  G.nextLevel(); assert.strictEqual(G.levelIndex, 1);
  const entry = JSON.stringify(P.snapshot()); G.level.enemies.slice(0, 4).forEach(killOne); AT.Inventory.openChest(G.level.chests[0], G.player, G.level);
  assert.notStrictEqual(JSON.stringify(P.snapshot()), entry);
  AT.Combat.damagePlayer(G.player, 99999, {}); stepN(30); assert.strictEqual(G.state, 'gameOver'); G.retry();
  assert.strictEqual(JSON.stringify(P.snapshot()), entry); assert.strictEqual(G.levelIndex, 1); assert.strictEqual(G.level.enemies.length, 15);
});
test('progression carries into level 2 (level, stats, coins, gems, potions)', () => {
  const G = newGame(), P = AT.Progression; G.level.chests.forEach(c => AT.Inventory.openChest(c, G.player, G.level)); killAll(G.level);
  stepN(40); assert.strictEqual(G.state, 'levelComplete');
  const st = P.snapshot(); assert.ok(st.level >= 4, 'level after 10 slimes + Mitachurl: ' + st.level);
  assert.strictEqual(st.coins >= 95, true);
  G.nextLevel(); assert.strictEqual(G.state, 'playing'); assert.strictEqual(G.levelIndex, 1);
  assert.strictEqual(G.level.enemies.length, 15); assert.strictEqual(G.level.boss.id, 'stormdrake'); assert.strictEqual(G.level.chests.length, 2);
  const p = G.player; assert.strictEqual(p.level, st.level); assert.strictEqual(p.maxHp, 100 + 18 * (st.level - 1)); assert.strictEqual(p.atk, 10 + 3 * (st.level - 1));
  assert.strictEqual(p.hp, p.maxHp); assert.strictEqual(P.state.coins, st.coins); assert.strictEqual(P.state.gems, st.gems); assert.strictEqual(P.state.potions, st.potions);
});

finish('tests/progression.test.js');
