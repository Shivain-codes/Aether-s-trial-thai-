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

// ---------------------------------------------------------------- sword
test('sword: only targets inside the cone are hit, once per swing', () => {
  reset();
  const p = mkPlayer(500, 500, 0); p.atk = 10;
  const front = mkEnemy('pyro', 540, 500), edge = mkEnemy('pyro', 500 + 45 * Math.cos(1.05), 500 + 45 * Math.sin(1.05));
  const far = mkEnemy('pyro', 620, 500), back = mkEnemy('pyro', 460, 500);
  const a120 = 2.094, side = mkEnemy('pyro', 500 + 50 * Math.cos(a120), 500 + 50 * Math.sin(a120));
  const log = record(['damage']);
  assert.strictEqual(AT.Combat.playerSword(p, {}), true);
  combatRun(p, [front, edge, far, back, side], 0.5);
  assert.strictEqual(front.hp, 28, 'front hp'); assert.strictEqual(edge.hp, 28, '60deg edge hp');
  for (const [n, e] of [['far', far], ['back', back], ['120deg', side]]) assert.strictEqual(e.hp, e.maxHp, n + ' must be untouched');
  assert.strictEqual(log.damage.filter(d => d.target === front).length, 1, 'front hit exactly once');
  assert.strictEqual(log.damage.length, 2);
});
test('sword: cooldown blocks immediate re-swing, next swing hits again', () => {
  reset();
  const p = mkPlayer(500, 500, 0), e = mkEnemy('pyro', 540, 500);
  combatRun(p, [], 0.1); // move the combat clock off 0 (clock==0 quirk is covered by the combo test)
  assert.strictEqual(AT.Combat.playerSword(p, {}), true);
  assert.strictEqual(AT.Combat.playerSword(p, {}), false, 'second swing during cooldown');
  combatRun(p, [e], 0.4);
  assert.strictEqual(e.hp, 28);
  assert.strictEqual(AT.Combat.playerSword(p, {}), true, 'swing after cooldown');
  combatRun(p, [e], 0.4);
  assert.strictEqual(e.hp, 18);
});
test('sword combo: the first swing after Combat.reset() is combo 0, second is combo 1 (x1.0 each)', () => {
  reset(); const p = mkPlayer(500, 500, 0);
  AT.Combat.playerSword(p, {}); const first = p.combo; combatRun(p, [], 0.4); AT.Combat.playerSword(p, {});
  assert.strictEqual(first, 0, 'first swing combo index (clock==0 satisfies clock<=comboUntil==0)');
  assert.strictEqual(p.combo, 1, 'second swing combo index');
});
test('sword: a dead player cannot swing', () => {
  reset(); const p = mkPlayer(0, 0); p.dead = true;
  assert.strictEqual(AT.Combat.playerSword(p, {}), false);
});

// ---------------------------------------------------------------- dash
function dashCtx() { return { world: bigWorld(), enemies: [] }; }
function tickPlayer(p, c, secs, dt) { dt = dt || 0.016; const n = Math.round(secs / dt); for (let i = 0; i < n; i++) { AT.Player.update(p, dt, c); AT.Input.endFrame(); } }
test('dash: moves ~88px, grants invulnerability, then expires', () => {
  reset(); const p = mkPlayer(1000, 700, 0), c = dashCtx(), log = record(['dash']);
  AT.Input.press('ShiftLeft'); AT.Input.press('KeyD');
  AT.Player.update(p, 0.016, c); AT.Input.endFrame();
  assert.ok(p.invuln >= 0.25, 'invuln after dash start: ' + p.invuln);
  assert.strictEqual(AT.Combat.damagePlayer(p, 10, {}), false, 'damage blocked while dashing');
  assert.strictEqual(p.hp, p.maxHp);
  AT.Input.release('KeyD');
  tickPlayer(p, c, 0.5);
  const d = p.x - 1000; assert.ok(d > 80 && d < 100, 'dash distance ' + d);
  assert.strictEqual(p.invuln, 0, 'invuln should have expired');
  assert.strictEqual(AT.Combat.damagePlayer(p, 10, {}), true, 'damage accepted after invuln');
  assert.strictEqual(log.dash.length, 1);
});
test('dash: 0.85s cooldown (second press ignored, third works)', () => {
  reset(); const p = mkPlayer(1000, 700, 0), c = dashCtx(), log = record(['dash']);
  AT.Input.press('ShiftLeft'); AT.Player.update(p, 0.016, c); AT.Input.endFrame(); AT.Input.release('ShiftLeft');
  assert.ok(Math.abs(p.dashCd - 0.85) < 0.02, 'dashCd ' + p.dashCd);
  tickPlayer(p, c, 0.3);
  AT.Input.press('ShiftLeft'); AT.Player.update(p, 0.016, c); AT.Input.endFrame(); AT.Input.release('ShiftLeft');
  assert.strictEqual(log.dash.length, 1, 'press at 0.3s must be ignored');
  tickPlayer(p, c, 0.65);
  AT.Input.press('ShiftLeft'); AT.Player.update(p, 0.016, c); AT.Input.endFrame();
  assert.strictEqual(log.dash.length, 2, 'press after cooldown must dash');
});

// ---------------------------------------------------------------- skill / burst
test('skill: 5s cooldown', () => {
  reset(); const p = mkPlayer(500, 500, 0);
  assert.strictEqual(AT.Combat.playerSkill(p, {}), true);
  assert.ok(Math.abs(p.skillCd - 5) < 1e-9);
  assert.strictEqual(AT.Combat.playerSkill(p, {}), false);
  combatRun(p, [], 4.8);
  assert.strictEqual(AT.Combat.playerSkill(p, {}), false, 'still cooling at 4.8s');
  combatRun(p, [], 0.3);
  assert.strictEqual(AT.Combat.playerSkill(p, {}), true, 'ready after 5.1s');
});
test('skill: pyro damage = atk*1.7 on non-hydro, vaporized x1.5 on hydro slime', () => {
  reset(); const p = mkPlayer(500, 500, 0); p.atk = 10;
  const a = mkEnemy('geo', 540, 500), b = mkEnemy('hydro', 540, 470);
  const log = record(['damage', 'reaction']);
  AT.Combat.playerSkill(p, {}); combatRun(p, [a, b], 0.5);
  near(a.hp, 38 - 17, 1e-9, 'geo hp'); near(b.hp, 38 - 25.5, 1e-9, 'hydro hp');
  assert.strictEqual(log.reaction.length, 1); assert.strictEqual(log.reaction[0].multiplier, 1.5);
});
test('burst: costs exactly 60 energy (CFG) and needs it', () => {
  reset(); const p = mkPlayer(500, 500, 0);
  assert.strictEqual(AT.CFG.BURST.cost, 60);
  p.energy = 59; assert.strictEqual(AT.Combat.playerBurst(p, {}), false); assert.strictEqual(p.energy, 59, 'energy untouched on failure');
  p.energy = 60; assert.strictEqual(AT.Combat.playerBurst(p, {}), true); assert.strictEqual(p.energy, 0, 'all 60 consumed');
  assert.ok(p.invuln > 0, 'burst grants invuln');
});
test('burst: hits every enemy in radius once per tick (3 ticks), none outside', () => {
  reset(); const p = mkPlayer(500, 500, 0); p.atk = 10; p.energy = 60;
  const inn = mkEnemy('geo', 600, 500), out = mkEnemy('geo', 900, 500); inn.hp = inn.maxHp = 500;
  const log = record(['damage']);
  AT.Combat.playerBurst(p, {}); combatRun(p, [inn, out], 1.0);
  assert.strictEqual(log.damage.filter(d => d.target === inn).length, 3, 'three ticks');
  near(inn.hp, 500 - 34, 1e-6, 'total = 10*3.4'); assert.strictEqual(out.hp, out.maxHp);
});

// ---------------------------------------------------------------- reactions / dead enemies
test('vaporize: exactly 1.5x for pyro on hydro; physical never reacts nor applies aura', () => {
  reset(); const log = record(['damage', 'reaction']);
  const h = mkEnemy('hydro', 0, 0); const r = AT.Combat.dealDamageToEnemy(h, { amount: 10, element: 'pyro', hitId: AT.nextId() });
  assert.strictEqual(r.damage, 15); assert.strictEqual(r.reaction, 'vaporize'); assert.strictEqual(h.hp, 23);
  assert.strictEqual(AT.CFG.REACTION.vaporize, 1.5); assert.strictEqual(log.reaction[0].multiplier, 1.5);
  const h2 = mkEnemy('hydro', 0, 0); const r2 = AT.Combat.dealDamageToEnemy(h2, { amount: 10, element: 'physical', hitId: AT.nextId() });
  assert.strictEqual(r2.damage, 10); assert.strictEqual(r2.reaction, null); assert.strictEqual(h2.hp, 28); assert.strictEqual(h2.aura, null);
  const g = mkEnemy('geo', 0, 0); const r3 = AT.Combat.dealDamageToEnemy(g, { amount: 10, element: 'pyro', hitId: AT.nextId() });
  assert.strictEqual(r3.damage, 10); assert.strictEqual(r3.reaction, null);
});
test('vaporize: innate hydro slime keeps vaporizing; hydro aura on other enemy is consumed', () => {
  reset(); const h = mkEnemy('hydro', 0, 0); h.hp = h.maxHp = 1000;
  for (let i = 0; i < 3; i++) assert.strictEqual(AT.Combat.dealDamageToEnemy(h, { amount: 10, element: 'pyro', hitId: AT.nextId() }).damage, 15);
  const e = mkEnemy('electro', 0, 0); e.hp = e.maxHp = 1000; AT.Elements.applyElement(e, 'hydro');
  assert.strictEqual(AT.Combat.dealDamageToEnemy(e, { amount: 10, element: 'pyro', hitId: AT.nextId() }).damage, 15);
  assert.strictEqual(e.aura, null, 'aura consumed');
  assert.strictEqual(AT.Combat.dealDamageToEnemy(e, { amount: 10, element: 'pyro', hitId: AT.nextId() }).damage, 10, 'no second vaporize');
});
test('dead enemies take no damage and kill events fire once', () => {
  reset(); const log = record(['damage', 'enemyKilled']); const e = mkEnemy('pyro', 0, 0);
  const k = AT.Combat.dealDamageToEnemy(e, { amount: 999, element: 'physical', hitId: AT.nextId() });
  assert.strictEqual(k.killed, true); assert.strictEqual(e.hp, 0); assert.strictEqual(e.dead, true);
  assert.strictEqual(AT.Combat.dealDamageToEnemy(e, { amount: 50, element: 'pyro', hitId: AT.nextId() }), null);
  assert.strictEqual(e.hp, 0); assert.strictEqual(log.damage.length, 1); assert.strictEqual(log.enemyKilled.length, 1);
});
test('same hitId never damages an enemy twice', () => {
  reset(); const e = mkEnemy('pyro', 0, 0), id = AT.nextId();
  assert.ok(AT.Combat.dealDamageToEnemy(e, { amount: 5, element: 'physical', hitId: id }));
  assert.strictEqual(AT.Combat.dealDamageToEnemy(e, { amount: 5, element: 'physical', hitId: id }), null);
  assert.strictEqual(e.hp, 33);
});
test('boss knockback is reduced by kbResist (Mitachurl 0.85)', () => {
  reset(); const b = AT.Bosses.create('mitachurl', 0, 0), s = mkEnemy('pyro', 0, 0);
  AT.Combat.dealDamageToEnemy(b, { amount: 1, element: 'physical', hitId: AT.nextId(), knockback: { x: 100, y: 0 } });
  AT.Combat.dealDamageToEnemy(s, { amount: 1, element: 'physical', hitId: AT.nextId(), knockback: { x: 100, y: 0 } });
  near(b.kb.x, 15, 1e-9); near(s.kb.x, 100, 1e-9);
});

// ---------------------------------------------------------------- enemy AI
test('enemy AI: idle -> chase -> telegraphed windup (>=0.45s) -> attack; no damage during windup', () => {
  reset(); const w = bigWorld(), p = mkPlayer(1150, 700); p.hp = 1e9;
  const e = mkEnemy('hydro', 1000, 700); const seen = {}; let tele = null, hurtDuringWindup = 0, hurts = 0, chaseFirst = false;
  AT.events.on('playerHurt', () => { hurts++; });
  for (let i = 0; i < 160; i++) {
    const before = e.state; p.invuln = 0; const hp0 = p.hp;
    AT.Enemies.update(e, 0.05, { player: p, world: w });
    if (before === 'windup' && p.hp < hp0) hurtDuringWindup++;
    seen[e.state] = (seen[e.state] || 0) + 1;
    if (e.state === 'windup' && e.telegraph) tele = tele || { shape: e.telegraph.shape, dur: e.telegraph.dur };
    if (e.state === 'chase' && !seen.windup) chaseFirst = true;
  }
  assert.ok(chaseFirst, 'chased before windup'); assert.ok(seen.windup > 0, 'windup'); assert.ok(seen.attack > 0, 'attack');
  assert.ok(tele && tele.shape === 'circle' && tele.dur >= 0.45, 'telegraph ' + JSON.stringify(tele));
  assert.strictEqual(hurtDuringWindup, 0); assert.ok(hurts > 0, 'slime eventually hurt the player');
});
test('enemy AI: stays passive when player is out of aggro range', () => {
  reset(); const p = mkPlayer(1800, 1400); const e = mkEnemy('hydro', 200, 200); let hurts = 0, chased = false;
  AT.events.on('playerHurt', () => hurts++);
  for (let i = 0; i < 200; i++) { AT.Enemies.update(e, 0.05, { player: p, world: bigWorld() }); if (e.state === 'chase') chased = true; }
  assert.strictEqual(chased, false); assert.strictEqual(hurts, 0);
});
test('enemy AI: dead enemy does nothing', () => {
  reset(); const p = mkPlayer(1010, 700); const e = mkEnemy('hydro', 1000, 700); let hurts = 0; AT.events.on('playerHurt', () => hurts++);
  AT.Combat.dealDamageToEnemy(e, { amount: 999, element: 'physical', hitId: AT.nextId() });
  for (let i = 0; i < 60; i++) AT.Enemies.update(e, 0.05, { player: p, world: bigWorld() });
  assert.strictEqual(e.x, 1000); assert.strictEqual(e.y, 700); assert.strictEqual(e.telegraph, null); assert.strictEqual(hurts, 0);
  assert.strictEqual(e.state, 'dead');
});

// ---------------------------------------------------------------- bosses
function runBoss(id, px, py, secs) {
  reset(); const w = bigWorld(), b = AT.Bosses.create(id, 1000, 700), p = mkPlayer(px, py); p.hp = 1e9;
  const rec = { tele: {}, hurts: [], proj: [], t: 0 }; let windStart = {}, prev = b.state;
  AT.events.on('damage', e => { if (e.target === p) rec.hurts.push({ t: rec.t, atk: b.atk, src: e.source === 'projectile' ? 'projectile' : 'boss', amount: e.amount, sinceWind: rec.t - (windStart[b.atk] || 0) }); });
  const c = { player: p, world: w, enemies: [], level: null };
  for (let i = 0; i < Math.round(secs / 0.05); i++) {
    rec.t += 0.05; p.invuln = 0;
    AT.Bosses.update(b, 0.05, c); AT.Projectiles.update(0.05, c);
    if (b.state === 'windup' && prev !== 'windup') windStart[b.atk] = rec.t;
    if (b.state === 'windup' && b.telegraph) { const r = rec.tele[b.atk] = rec.tele[b.atk] || { shape: b.telegraph.shape, dur: b.telegraph.dur, n: 0 }; r.n = Math.max(r.n, b.telegraphs.length); }
    for (const pr of AT.Projectiles.list) if (!rec.proj.includes(pr)) rec.proj.push(pr);
    prev = b.state;
  }
  rec.boss = b; return rec;
}
test('Mitachurl: melee cone + slam circle telegraphs precede damage', () => {
  const r = runBoss('mitachurl', 1050, 700, 90);
  assert.ok(r.tele.melee && r.tele.melee.shape === 'cone' && r.tele.melee.dur >= 0.7, 'melee ' + JSON.stringify(r.tele.melee));
  assert.ok(r.tele.slam && r.tele.slam.shape === 'circle' && r.tele.slam.dur >= 0.9, 'slam ' + JSON.stringify(r.tele.slam));
  for (const k of ['melee', 'slam']) {
    const hs = r.hurts.filter(h => h.atk === k); assert.ok(hs.length > 0, k + ' never damaged the player');
    for (const h of hs) assert.ok(h.sinceWind >= r.tele[k].dur - 0.001, k + ' hit before telegraph finished: ' + h.sinceWind);
  }
  assert.strictEqual(r.hurts.filter(h => h.atk === 'melee')[0].amount, 22); assert.strictEqual(r.hurts.filter(h => h.atk === 'slam')[0].amount, 30);
});
test('Mitachurl: charge line telegraph >=0.8s precedes dash damage', () => {
  const r = runBoss('mitachurl', 1280, 700, 12);
  assert.ok(r.tele.charge && r.tele.charge.shape === 'line' && r.tele.charge.dur >= 0.8, 'charge ' + JSON.stringify(r.tele.charge));
  const hs = r.hurts.filter(h => h.atk === 'charge'); assert.ok(hs.length > 0, 'charge never connected');
  for (const h of hs) assert.ok(h.sinceWind >= r.tele.charge.dur - 0.001, 'charge hit early ' + h.sinceWind);
  assert.strictEqual(hs[0].amount, 28);
});
test('Storm Drake: volley (electro projectiles), sweep cone, AoE circles >=1s', () => {
  const r = runBoss('stormdrake', 1190, 700, 120);
  assert.ok(r.tele.volley && r.tele.volley.shape === 'cone' && r.tele.volley.dur >= 0.7, 'volley ' + JSON.stringify(r.tele.volley));
  assert.ok(r.tele.sweep && r.tele.sweep.shape === 'cone' && r.tele.sweep.dur >= 1.0, 'sweep ' + JSON.stringify(r.tele.sweep));
  assert.ok(r.tele.aoe && r.tele.aoe.shape === 'circle' && r.tele.aoe.dur >= 1.0 && r.tele.aoe.n >= 4, 'aoe ' + JSON.stringify(r.tele.aoe));
  assert.ok(r.proj.length >= 5 && r.proj.every(p => p.owner === 'enemy' && p.element === 'electro'), 'enemy electro projectiles: ' + r.proj.length);
  for (const k of ['sweep', 'aoe']) {
    const hs = r.hurts.filter(h => h.src === 'boss' && h.atk === k); assert.ok(hs.length > 0, k + ' never damaged player');
    for (const h of hs) assert.ok(h.sinceWind >= r.tele[k].dur - 0.001, k + ' hit early ' + h.sinceWind);
  }
  assert.ok(r.hurts.some(h => h.src === 'projectile' && h.amount === 14), 'a volley projectile damaged the player for 14');
});
test('boss defeat: enemyKilled and bossDefeated each fire exactly once', () => {
  reset(); const log = record(['enemyKilled', 'bossDefeated']); const b = AT.Bosses.create('stormdrake', 0, 0);
  AT.Combat.dealDamageToEnemy(b, { amount: 5000, element: 'physical', hitId: AT.nextId() });
  AT.Combat.dealDamageToEnemy(b, { amount: 5000, element: 'physical', hitId: AT.nextId() });
  assert.strictEqual(log.enemyKilled.length, 1); assert.strictEqual(log.bossDefeated.length, 1); assert.strictEqual(log.bossDefeated[0].id, 'stormdrake');
});

// ---------------------------------------------------------------- player damage / death
test('player damage: reduces hp, 0.6s invuln blocks repeats, then damage works again', () => {
  reset(); const p = mkPlayer(0, 0), log = record(['playerHurt']);
  assert.strictEqual(AT.Combat.damagePlayer(p, 9, {}), true); assert.strictEqual(p.hp, 91); assert.strictEqual(p.invuln, 0.6);
  assert.strictEqual(AT.Combat.damagePlayer(p, 9, {}), false); assert.strictEqual(p.hp, 91);
  AT.Player.update(p, 0.05, { world: bigWorld(), enemies: [] }); for (let i = 0; i < 12; i++) AT.Player.update(p, 0.05, { world: bigWorld(), enemies: [] });
  assert.strictEqual(AT.Combat.damagePlayer(p, 9, {}), true); assert.strictEqual(p.hp, 82); assert.strictEqual(log.playerHurt.length, 2);
});
test('player death: hp 0, dead flag, playerDied once, no further damage, no movement', () => {
  reset(); const p = mkPlayer(500, 500), log = record(['playerDied']);
  AT.Combat.damagePlayer(p, 9999, {}); assert.strictEqual(p.hp, 0); assert.strictEqual(p.dead, true);
  p.invuln = 0; assert.strictEqual(AT.Combat.damagePlayer(p, 5, {}), false);
  AT.Input.press('KeyD'); for (let i = 0; i < 20; i++) AT.Player.update(p, 0.05, { world: bigWorld(), enemies: [] });
  assert.strictEqual(log.playerDied.length, 1); assert.strictEqual(p.anim, 'dead'); assert.ok(Math.abs(p.x - 500) < 40, 'dead player drifted only by knockback');
});

finish('tests/combat.test.js');
