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

function stepN(n, dt) { for (let i = 0; i < n; i++) { AT.Game.step(dt || 0.05); AT.Input.endFrame(); } }
function newGame(cin) {
  reset(() => AT.Game.level); AT.Game.cinematicPlayed = !cin; AT.Cinematic.played = !cin; AT.Cinematic.started = false; AT.Cinematic.done = false;
  AT.Game.state = 'title'; AT.Game.startGame(); return AT.Game;
}
const loadL = (i) => AT.Levels.load(i, AT.rng(1337 + i * 101));

// ---------------------------------------------------------------- movement / world clamp
test('movement: WASD moves at 175 px/s, diagonals are normalized', () => {
  reset(); const w = bigWorld(), p = mkPlayer(1000, 700), c = { world: w, enemies: [] };
  AT.Input.press('KeyD'); for (let i = 0; i < 20; i++) AT.Player.update(p, 0.05, c); AT.Input.clear();
  near(p.x, 1000 + 175, 0.5, 'x after 1s'); near(p.y, 700, 1e-6, 'y');
  const q = mkPlayer(1000, 700); AT.Input.press('KeyD'); AT.Input.press('KeyS'); for (let i = 0; i < 20; i++) AT.Player.update(q, 0.05, c); AT.Input.clear();
  near(Math.hypot(q.x - 1000, q.y - 700), 175, 0.5, 'diagonal distance');
});
test('movement: arrow keys work; no input means no movement', () => {
  reset(); const p = mkPlayer(1000, 700), c = { world: bigWorld(), enemies: [] };
  AT.Input.press('ArrowLeft'); for (let i = 0; i < 10; i++) AT.Player.update(p, 0.05, c); AT.Input.clear();
  near(p.x, 1000 - 87.5, 0.5); const x = p.x; for (let i = 0; i < 10; i++) AT.Player.update(p, 0.05, c); assert.strictEqual(p.x, x);
});
test('world clamp: player cannot leave 0..w / 0..h (including during a dash)', () => {
  reset(); const w = bigWorld(), p = mkPlayer(30, 30), c = { world: w, enemies: [] };
  AT.Input.press('KeyA'); AT.Input.press('KeyW'); for (let i = 0; i < 60; i++) AT.Player.update(p, 0.05, c);
  assert.strictEqual(p.x, p.r); assert.strictEqual(p.y, p.r); AT.Input.clear();
  p.x = 1990; p.y = 1490; AT.Input.press('KeyD'); AT.Input.press('KeyS'); AT.Input.press('ShiftLeft'); for (let i = 0; i < 60; i++) AT.Player.update(p, 0.05, c);
  assert.strictEqual(p.x, 2000 - p.r); assert.strictEqual(p.y, 1500 - p.r);
});
test('collision: player cannot walk or dash through solid obstacles', () => {
  reset(); const w = AT.World.create({ w: 2000, h: 1500, obstacles: [{ type: 'rect', x: 1100, y: 600, w: 40, h: 200, visual: 'wall' }, { type: 'circle', x: 800, y: 700, r: 30, visual: 'tree' }] });
  const p = mkPlayer(1000, 700), c = { world: w, enemies: [] };
  AT.Input.press('KeyD'); AT.Input.press('ShiftLeft'); for (let i = 0; i < 60; i++) { AT.Player.update(p, 0.05, c); AT.Input.endFrame(); }
  assert.ok(p.x <= 1100 - p.r + 1e-6, 'stopped by wall, x=' + p.x);
  AT.Input.clear(); const q = mkPlayer(900, 700); AT.Input.press('KeyA'); for (let i = 0; i < 60; i++) AT.Player.update(q, 0.05, c);
  assert.ok(q.x >= 830 + q.r - 1e-6, 'stopped by tree, x=' + q.x);
});
test('input: Space triggers a sword swing through AT.Player.update; E skill; Q burst needs energy', () => {
  reset(); const p = mkPlayer(1000, 700), e = mkEnemy('geo', 1040, 700), c = { world: bigWorld(), enemies: [e] }, log = record(['swordSwing', 'skillCast', 'burstCast']);
  AT.Input.press('Space'); AT.Player.update(p, 0.016, c); AT.Input.release('Space');
  AT.Input.press('KeyE'); AT.Player.update(p, 0.016, c); AT.Input.release('KeyE');
  AT.Input.press('KeyQ'); AT.Player.update(p, 0.016, c); AT.Input.release('KeyQ');
  assert.strictEqual(log.swordSwing.length, 1); assert.strictEqual(log.skillCast.length, 1); assert.strictEqual(log.burstCast.length, 0, 'no burst without energy');
  p.energy = 60; AT.Input.press('KeyQ'); AT.Player.update(p, 0.016, c); assert.strictEqual(log.burstCast.length, 1); assert.strictEqual(p.energy, 0);
});

// ---------------------------------------------------------------- minimap
test('minimap: blips match living enemies, boss, unopened chests and player exactly', () => {
  const G = newGame(); const lv = G.level, M = AT.Minimap;
  let b = M.collectBlips(G); const n = t => b.filter(x => x.type === t).length;
  assert.strictEqual(n('player'), 1); assert.strictEqual(n('enemy'), 10); assert.strictEqual(n('boss'), 1); assert.strictEqual(n('chest'), 3);
  const pb = b.find(x => x.type === 'player'); assert.strictEqual(pb.x, G.player.x); assert.strictEqual(pb.y, G.player.y);
  const bb = b.find(x => x.type === 'boss'); assert.strictEqual(bb.x, lv.boss.x); assert.strictEqual(bb.y, lv.boss.y);
  for (const e of lv.enemies) assert.ok(b.some(x => x.type === 'enemy' && x.x === e.x && x.y === e.y), 'enemy blip at true position');
  AT.Combat.dealDamageToEnemy(lv.enemies[0], { amount: 1e6, element: 'physical', hitId: AT.nextId() }); AT.Inventory.openChest(lv.chests[0], G.player, lv);
  b = M.collectBlips(G); assert.strictEqual(n('enemy'), 9, 'dead enemy removed'); assert.strictEqual(n('chest'), 2, 'opened chest removed');
  AT.Combat.dealDamageToEnemy(lv.boss, { amount: 1e6, element: 'physical', hitId: AT.nextId() }); b = M.collectBlips(G); assert.strictEqual(n('boss'), 0);
});
test('minimap: worldToMap maps world corners to the map square and is aspect-preserving', () => {
  const G = newGame(), M = AT.Minimap; // level 1 world 2000x1500 in a 100px square at (10,20)
  const tl = M.worldToMap(0, 0, G, 10, 20, 100), br = M.worldToMap(2000, 1500, G, 10, 20, 100), c = M.worldToMap(1000, 750, G, 10, 20, 100);
  near(tl.x, 10, 1e-9); near(br.x, 110, 1e-9); near(tl.y, 20 + (100 - 75) / 2, 1e-9); near(br.y, 20 + (100 + 75) / 2, 1e-9);
  near(c.x, 60, 1e-9); near(c.y, 70, 1e-9);
});
test('minimap: draw() runs against a recording stub context without throwing', () => {
  const G = newGame(); let calls = 0; const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls++; }), set: (t, k, v) => { t[k] = v; return true; } });
  AT.Minimap.draw(ctx, 10, 10, 120, G); assert.ok(calls > 20, 'draw issued ' + calls + ' calls');
});

// ---------------------------------------------------------------- cinematic
test('cinematic: duration is 15s, finishes exactly at 15s, not before', () => {
  reset(); const C = AT.Cinematic; C.played = false; C.start(); assert.strictEqual(C.duration, 15); assert.strictEqual(AT.CFG.CINEMATIC.duration, 15);
  let t = 0, done = false; while (!done && t < 30) { done = C.update(0.05) === true; t += 0.05; if (!done) assert.strictEqual(C.isDone(), false); }
  near(t, 15, 0.06, 'time to finish'); assert.strictEqual(C.isDone(), true); assert.strictEqual(C.skipped, false); assert.strictEqual(C.update(0.05), true);
});
test('cinematic: skip() ends it immediately and is idempotent', () => {
  reset(); const C = AT.Cinematic; C.start(); C.update(0.05); assert.strictEqual(C.isDone(), false);
  C.skip(); assert.strictEqual(C.isDone(), true); assert.strictEqual(C.skipped, true); C.skip(); assert.strictEqual(C.update(0.05), true);
});
test('game flow: title -> cinematic (15s of AT.Game.step) -> playing level 1, plays only once', () => {
  const G = newGame(true); assert.strictEqual(G.state, 'cinematic'); assert.strictEqual(G.cinematicPlayed, true);
  const log = record(['statechange']); let t = 0; while (G.state === 'cinematic' && t < 40) { G.step(0.05); t += 0.05; }
  near(t, 15, 0.1, 'cinematic length via Game.step'); assert.strictEqual(G.state, 'playing'); assert.strictEqual(G.levelIndex, 0); assert.strictEqual(AT.Cinematic.played, true);
  assert.deepStrictEqual(log.statechange.map(s => s.to), ['playing']);
  G.state = 'title'; G.startGame(); assert.strictEqual(G.state, 'playing', 'second start skips the cinematic');
});
test('game flow: Enter during cinematic skips it (handleInput) and starts level 1', () => {
  const G = newGame(true); G.step(0.05); G.step(0.05); AT.Input.press('Enter'); G.handleInput(); AT.Input.endFrame();
  assert.strictEqual(G.state, 'playing'); assert.strictEqual(AT.Cinematic.skipped, true); assert.strictEqual(G.level.index, 0);
});

// ---------------------------------------------------------------- pause
test('pause: step() freezes player, enemies, boss, projectiles, timers and level time', () => {
  const G = newGame(); const lv = G.level; G.player.x = lv.boss.x - 200; G.player.y = lv.boss.y; stepN(20); // get things moving
  AT.Input.press('KeyD'); G.pause(); assert.strictEqual(G.state, 'paused');
  const snap = () => JSON.stringify([G.player.x, G.player.y, G.time, lv.time, lv.boss.x, lv.boss.y, lv.boss.stateT, lv.enemies.map(e => [e.x, e.y, e.stateT]), AT.Projectiles.list.length, AT.Combat.state.clock]);
  const before = snap(); stepN(80); assert.strictEqual(snap(), before, 'nothing changes while paused'); AT.Input.clear();
});
test('pause/resume via Escape/P and gameplay resumes', () => {
  const G = newGame(); AT.Input.press('Escape'); G.handleInput(); AT.Input.endFrame(); assert.strictEqual(G.state, 'paused');
  AT.Input.press('KeyP'); G.handleInput(); AT.Input.endFrame(); assert.strictEqual(G.state, 'playing');
  const x = G.player.x; AT.Input.press('KeyD'); stepN(10); assert.ok(G.player.x > x); AT.Input.clear();
});

// ---------------------------------------------------------------- full step integration
test('integration: enemy near player damages them through AT.Game.step (no dmg during invuln)', () => {
  const G = newGame(), p = G.player, e = G.level.enemies[0]; e.x = p.x + 60; e.y = p.y; e.state = 'chase';
  const log = record(['playerHurt']); stepN(60); assert.ok(log.playerHurt.length >= 1, 'player was hurt'); assert.ok(p.hp < p.maxHp);
});
test('integration: sword via Game.step kills a slime, grants xp, drops coin, minimap updates', () => {
  const G = newGame(), p = G.player, e = G.level.enemies[0], P = AT.Progression; e.x = p.x + 40; e.y = p.y; e.hp = e.maxHp = 5; e.state = 'idle';
  p.facing = 0; AT.Input.press('Space'); stepN(10); AT.Input.clear(); assert.strictEqual(e.dead, true); assert.strictEqual(P.state.xp, 12);
  assert.ok(p.energy > 0, 'kill gave energy'); assert.strictEqual(AT.Minimap.collectBlips(G).filter(b => b.type === 'enemy').length, 9);
});
test('integration: player death -> gameOver after 0.8s delay; world frozen in gameOver', () => {
  const G = newGame(); AT.Combat.damagePlayer(G.player, 99999, {}); stepN(10); assert.strictEqual(G.state, 'playing', 'delay not elapsed (0.5s)');
  stepN(10); assert.strictEqual(G.state, 'gameOver'); const e = G.level.enemies[0], pos = [e.x, e.y]; stepN(20); assert.deepStrictEqual([e.x, e.y], pos);
});
test('game over: retry via Enter key (handleInput) and R key', () => {
  let G = newGame(); AT.Combat.damagePlayer(G.player, 99999, {}); stepN(30); AT.Input.press('Enter'); G.handleInput(); AT.Input.endFrame(); assert.strictEqual(G.state, 'playing');
  G = newGame(); AT.Combat.damagePlayer(G.player, 99999, {}); stepN(30); AT.Input.press('KeyR'); G.handleInput(); AT.Input.endFrame(); assert.strictEqual(G.state, 'playing');
});

// ---------------------------------------------------------------- level complete / victory
test('level 1 complete via Game.step: levelComplete event fires exactly once, state -> levelComplete, no repeat', () => {
  const G = newGame(), log = record(['levelComplete', 'victory']); killAll(G.level); stepN(60);
  assert.strictEqual(G.state, 'levelComplete'); assert.strictEqual(log.levelComplete.length, 1); stepN(100); assert.strictEqual(log.levelComplete.length, 1); assert.strictEqual(log.victory.length, 0);
});
test('full flow: L1 complete -> Enter -> L2 -> complete -> victory (victory event once)', () => {
  const G = newGame(), log = record(['levelComplete', 'victory']); killAll(G.level); stepN(40); assert.strictEqual(G.state, 'levelComplete');
  AT.Input.press('Enter'); G.handleInput(); AT.Input.endFrame(); assert.strictEqual(G.state, 'playing'); assert.strictEqual(G.levelIndex, 1);
  assert.strictEqual(G.level.enemies.length, 15); assert.strictEqual(G.level.boss.id, 'stormdrake');
  killAll(G.level); stepN(60);
  assert.strictEqual(G.state, 'victory'); assert.strictEqual(log.victory.length, 1); assert.strictEqual(log.levelComplete.length, 2);
  stepN(100); assert.strictEqual(log.victory.length, 1, 'victory not re-fired'); assert.strictEqual(log.levelComplete.length, 2);
});
test('victory: Enter returns to title; a new run resets progression and skips cinematic', () => {
  const G = newGame(); killAll(G.level); stepN(40); G.nextLevel(); killAll(G.level); stepN(60); assert.strictEqual(G.state, 'victory');
  AT.Input.press('Enter'); G.handleInput(); AT.Input.endFrame(); assert.strictEqual(G.state, 'title');
  G.startGame(); assert.strictEqual(G.state, 'playing'); assert.strictEqual(G.levelIndex, 0); assert.strictEqual(AT.Progression.state.level, 1); assert.strictEqual(AT.Progression.state.xp, 0);
});
test('no double rewards: killing a dead-and-already-rewarded boss again does not grant xp twice', () => {
  const G = newGame(), P = AT.Progression; const b = G.level.boss; AT.Combat.dealDamageToEnemy(b, { amount: 1e6, element: 'physical', hitId: AT.nextId() });
  const xp = [P.state.level, P.state.xp]; AT.Combat.dealDamageToEnemy(b, { amount: 1e6, element: 'physical', hitId: AT.nextId() }); AT.events.emit('bossDefeated', { boss: b, id: b.id });
  assert.deepStrictEqual([P.state.level, P.state.xp], xp);
});

finish('tests/game.test.js');
