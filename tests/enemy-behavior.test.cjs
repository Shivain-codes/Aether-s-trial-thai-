const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const {buildSync} = require('esbuild');
const {Scene} = require('three');

// Run the production battle, models, terrain and damage code without a renderer.
// Only canvas painting is replaced: labels and glow textures do not affect combat.
const previousDocument = global.document;
global.document = {
  createElement(tag) {
    assert.equal(tag, 'canvas');
    return {
      width: 0, height: 0,
      getContext() {
        return {
          createRadialGradient: () => ({addColorStop() {}}),
          fillRect() {}, strokeText() {}, fillText() {}
        };
      }
    };
  }
};
test.after(() => {
  if (previousDocument === undefined) delete global.document;
  else global.document = previousDocument;
});

const root = path.resolve(__dirname, '..');
const source = buildSync({
  stdin: {
    contents: "export {makeBattle} from './src3d/battle.js'; export {newSave,heightAt} from './src3d/core.js';",
    resolveDir: root, sourcefile: 'enemy-behavior-entry.js'
  },
  bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent'
}).outputFiles[0].text;
const bundled = new Module(path.join(__dirname, 'enemy-behavior-bundle.cjs'), module);
bundled.filename = path.join(__dirname, 'enemy-behavior-bundle.cjs');
bundled.paths = Module._nodeModulePaths(root);
bundled._compile(source, bundled.filename);
const {makeBattle, newSave, heightAt} = bundled.exports;

function fixture(t, kind, {distance = 10, outdoor = false, x = 0, z = 0} = {}) {
  const damage = [], messages = [], state = newSave();
  const battle = makeBattle(new Scene(), {
    hurt(amount) { damage.push(amount); state.hp = Math.max(0, state.hp - amount); },
    number(...args) { messages.push(args); }, toast() {}, sound() {}
  });
  battle.setup(0, {outdoor});
  const enemy = battle.enemies.find(e => e.kind === kind);
  assert(enemy, `The production roster contains ${kind}`);
  for (const other of battle.enemies) if (other !== enemy) other.hp = 0;
  Object.assign(enemy, {x, z, home: {x, z}, cd: 0, facing: 0});
  const player = {x, z: z + distance, y: outdoor ? heightAt(x, z + distance) : 0, facing: Math.PI};
  // Fixed 20 ms steps make wind-up and projectile timing repeatable.
  const step = frames => { for (let i = 0; i < frames; i++) battle.update(.02, player, state); };
  t.after(() => battle.clear());
  return {battle, enemy, player, state, damage, messages, step};
}

test('a frontal sword hit is mitigated and wears down an intact shield', t => {
  const {battle, enemy, player, state} = fixture(t, 'shield', {distance: 2});
  battle.attack('sword', player, state);
  assert.equal(enemy.hp, enemy.maxHp - 2.5);
  assert.equal(enemy.shieldHp, 25);
});

test('a sword hit from behind bypasses the shield without wearing it down', t => {
  const {battle, enemy, player, state} = fixture(t, 'shield', {distance: -2});
  player.facing = 0;
  battle.attack('sword', player, state);
  assert.equal(enemy.hp, enemy.maxHp - 10);
  assert.equal(enemy.shieldHp, 30);
});

test('Pyro bypasses and breaks the shield, exposing it to full sword damage', t => {
  const {battle, enemy, player, state, messages} = fixture(t, 'shield', {distance: 2});
  battle.attack('skill', player, state);
  assert.equal(enemy.hp, enemy.maxHp - 17);
  assert.equal(enemy.shieldHp, 4.5);
  battle.attack('skill', player, state);
  assert.equal(enemy.shieldHp, 0);
  assert.equal(enemy.mesh.userData.shield.visible, false);
  assert(messages.some(([text]) => text === 'Shield broken'));
  const hp = enemy.hp;
  battle.attack('sword', player, state);
  assert.equal(enemy.hp, hp - 10);
});

test('an archer warns before firing and its aimed bolt hits the player body', t => {
  const {battle, enemy, state, damage, step} = fixture(t, 'archer');
  step(1);
  assert.equal(enemy.phase, 'windup');
  assert.equal(battle.diagnostics.aimLines, 1);
  step(45);
  assert.equal(damage.length, 0);
  assert.equal(battle.diagnostics.projectiles, 0);
  step(10);
  assert.equal(battle.diagnostics.aimLines, 0);
  assert.equal(battle.diagnostics.projectiles, 1);
  step(40);
  assert.deepEqual(damage, [15]);
  assert.equal(state.hp, 85);
});

test('an archer locks its aim, allowing the player to sidestep its bolt', t => {
  const {player, damage, step} = fixture(t, 'archer');
  step(1);
  player.x += 5;
  step(100);
  assert.equal(damage.length, 0);
});

test('archer death cancels both a pending shot and an already flying bolt', t => {
  for (const framesBeforeDeath of [1, 60]) {
    const {battle, enemy, damage, step} = fixture(t, 'archer');
    step(framesBeforeDeath);
    if (framesBeforeDeath === 60) assert.equal(battle.diagnostics.projectiles, 1);
    else assert.equal(battle.diagnostics.aimLines, 1);
    enemy.hp = 0;
    step(60);
    assert.equal(damage.length, 0);
    assert.equal(battle.diagnostics.projectiles, 0);
    assert.equal(battle.diagnostics.aimLines, 0);
  }
});

test('outdoor archer bolts account for differing terrain elevations', t => {
  for (const z of [43, -126]) {
    const {enemy, player, damage, step} = fixture(t, 'archer', {outdoor: true, x: 113, z});
    assert(Math.abs(heightAt(enemy.x, enemy.z) - player.y) > .5);
    step(100);
    assert.deepEqual(damage, [15]);
  }
});

test('a mage circle warns before dealing delayed damage', t => {
  const {battle, state, damage, step} = fixture(t, 'mage');
  step(1);
  assert.equal(battle.diagnostics.areas, 1);
  step(60);
  assert.equal(damage.length, 0);
  step(10);
  assert.deepEqual(damage, [20]);
  assert.equal(state.hp, 80);
  assert.equal(battle.diagnostics.areas, 0);
});

test('leaving a mage circle during its warning avoids the hit', t => {
  const {player, damage, step} = fixture(t, 'mage');
  step(1);
  player.x += 4;
  step(80);
  assert.equal(damage.length, 0);
});

test('mage death cancels its pending circle without damage', t => {
  const {battle, enemy, damage, step} = fixture(t, 'mage');
  step(1);
  assert.equal(battle.diagnostics.areas, 1);
  enemy.hp = 0;
  step(80);
  assert.equal(damage.length, 0);
  assert.equal(battle.diagnostics.areas, 0);
});

test('a sentinel cone hits in front and can be avoided by moving behind it', t => {
  for (const flank of [false, true]) {
    const {battle, player, damage, step} = fixture(t, 'sentinel', {distance: 3});
    step(1);
    assert.equal(battle.diagnostics.areas, 1);
    if (flank) player.z = -3;
    step(60);
    assert.equal(damage.length, 0);
    step(15);
    assert.deepEqual(damage, flank ? [] : [28]);
  }
});

test('a sentinel radial slam reaches behind it, unlike its cone attack', t => {
  const {enemy, player, damage, step} = fixture(t, 'sentinel', {distance: 3});
  enemy.move = 1; // Start at the radial attack in its normal three-move cycle.
  step(1);
  player.z = -3;
  step(75);
  assert.deepEqual(damage, [28]);
});

test('a defeated enemy cannot receive hits or grant its rewards twice', t => {
  const {battle, enemy, player, state, step} = fixture(t, 'guardian', {distance: 2});
  enemy.hp = 1;
  battle.attack('sword', player, state);
  assert.equal(enemy.hp, 0);
  assert.equal(state.coins, 4);
  assert.equal(state.xp, 12);
  const energy = state.energy;
  battle.attack('skill', player, state);
  step(100);
  assert.equal(state.coins, 4);
  assert.equal(state.xp, 12);
  assert.equal(state.energy, energy);
});

test('clearing an encounter removes pending attacks, effects and models', t => {
  for (const kind of ['mage', 'archer']) {
    const {battle, player, state, step} = fixture(t, kind);
    step(kind === 'mage' ? 1 : 60);
    assert(battle.diagnostics.areas + battle.diagnostics.projectiles > 0);
    battle.attack('skill', player, state);
    assert(battle.effects > 0);
    battle.clear();
    assert.equal(battle.root.children.length, 0);
    assert.equal(battle.enemies.length, 0);
    assert.equal(battle.nearest(player), undefined);
    assert.equal(battle.effects, 0);
    assert.deepEqual(battle.diagnostics, {projectiles: 0, areas: 0, particles: 0, visualEffects: 0, aimLines: 0});
  }
});


test('a half-health boss enrages and keeps a dodgeable attack warning', t => {
 const {enemy,damage,messages,step}=fixture(t,'boss',{distance:3});
 assert.equal(enemy.maxHp,700);enemy.hp=350;step(1);
 assert.equal(enemy.enraged,true);assert.equal(enemy.phase,'windup');
 step(45);assert.equal(damage.length,0);
 step(15);assert(damage.length>0);assert(damage.every(n=>n>=32));
});
