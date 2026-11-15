// Aether's Trial — central configuration, event bus, shared helpers. Owner: orchestrator.
const AT = (globalThis.AT = globalThis.AT || {});

AT.CFG = {
  VIEW_W: 960, VIEW_H: 540,
  MAX_DT: 0.05,

  PLAYER: { radius: 13, speed: 175, baseHp: 100, hpPerLevel: 18, baseAtk: 10, atkPerLevel: 3,
            maxEnergy: 60, invulnAfterHit: 0.6, hurtKnock: 160, healOnLevelUp: 0.4 },
  SWORD:  { cooldown: 0.38, damageMul: 1.0, range: 62, arc: Math.PI * 0.85, duration: 0.2, hitDelay: 0.06,
            knockback: 190, lunge: 60, comboWindow: 0.6, comboMul: [1.0, 1.0, 1.35] },
  SKILL:  { cooldown: 5, damageMul: 1.7, range: 120, arc: Math.PI * 0.7, duration: 0.3, hitDelay: 0.08,
            knockback: 260, energyGain: 12 },
  BURST:  { cost: 60, damageMul: 3.4, radius: 175, ticks: 3, tickInterval: 0.18, knockback: 330, invuln: 0.9 },
  DASH:   { speed: 520, duration: 0.17, cooldown: 0.85, invuln: 0.28 },
  REACTION: { vaporize: 1.5, auraDuration: 6 },
  ENERGY: { perSwordHit: 4, perSkillHit: 6, perKill: 3, perDamageTaken: 0.0 },

  // XP needed from level L to L+1 = base + growth * (L-1)^1.4
  XP: { base: 40, growth: 28, exponent: 1.4, maxLevel: 30, perKillMul: 1 },
  LOOT: {
    coinPerKill: [3, 6], potionDropChance: 0.12, bossPotionDrops: 2, potionHeal: 45, interactRange: 64,
    startPotions: 1, maxPotions: 9, magnetRange: 80, pickupRange: 18, pickupLife: 25,
    chests: [ // per level, per chest index
      [{ coins: 25, gems: 10, potions: 1 }, { coins: 30, gems: 10, potions: 1 }, { coins: 40, gems: 20, potions: 1 }],
      [{ coins: 60, gems: 20, potions: 1 }, { coins: 80, gems: 30, potions: 2 }]
    ]
  },
  ENEMY: {
    slime: { hp: 38, speed: 62, dmg: 9, r: 14, xp: 12, aggro: 220, windup: 0.55, leapSpeed: 280, leapTime: 0.28,
             recover: 0.7, attackRange: 80, kbResist: 0, contactDmgMul: 0.6, attackCd: 1.2 }
  },
  BOSS: {
    mitachurl: { name: 'Mitachurl', hp: 520, speed: 70, r: 30, xp: 140, coins: 80, kbResist: 0.85, aggro: 340,
                 melee: { dmg: 22, range: 95, arc: 1.5, windup: 0.8, recover: 0.8 },
                 charge: { dmg: 28, windup: 1.0, speed: 420, dur: 0.6, recover: 1.0, width: 60 },
                 slam: { dmg: 30, radius: 120, windup: 1.1, recover: 1.1 }, cd: 1.3 },
    stormdrake: { name: 'Storm Drake', hp: 900, speed: 80, r: 34, xp: 300, coins: 150, kbResist: 0.9, aggro: 420,
                 projectile: { dmg: 14, speed: 250, count: 5, spread: 0.9, windup: 0.7, recover: 0.8, r: 9, life: 3 },
                 sweep: { dmg: 24, range: 200, arc: 1.2, windup: 1.0, sweepTime: 0.9, recover: 0.9 },
                 aoe: { dmg: 26, radius: 85, count: 4, windup: 1.2, recover: 1.0, range: 260 }, cd: 1.0 }
  },
  LEVELS: [
    { name: 'Mondstadt Fields', w: 2000, h: 1500, regular: 10, enemySpeedMul: 1.0, enemyDmgMul: 1.0, enemyHpMul: 1.0,
      objective: 'Defeat all slimes and the Mitachurl' },
    { name: 'Stormterror Ruins', w: 2200, h: 1600, regular: 15, enemySpeedMul: 1.35, enemyDmgMul: 1.5, enemyHpMul: 1.4,
      objective: 'Defeat all enemies and the Storm Drake' }
  ],
  FLOW: { deathDelay: 0.8, completeDelay: 0.5 },
  SEED: 1337,
  CAMERA: { follow: 8 },
  LIMITS: { particles: 600, projectiles: 60, pickups: 80, damageNumbers: 40, afterimages: 8 },
  CINEMATIC: { duration: 15, narration: 'Awaken, traveller. The winds have brought you to a world in need. Your journey begins now.' }
};

// ---- event bus ----
AT.events = (function () {
  const map = {};
  return {
    on(n, f) { (map[n] = map[n] || []).push(f); },
    off(n, f) { const a = map[n]; if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); } },
    emit(n, p) { const a = map[n]; if (!a) return; for (const f of a.slice()) { try { f(p); } catch (e) { if (typeof console !== 'undefined') console.error('[event ' + n + ']', e); } } },
    clear() { for (const k in map) delete map[k]; }
  };
})();

// ---- helpers ----
AT._id = 0;
AT.nextId = function () { return ++AT._id; };
AT.rng = function (seed) { // mulberry32
  let a = (seed >>> 0) || 1;
  const f = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.range = (lo, hi) => lo + (hi - lo) * f();
  f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
  return f;
};
AT.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
AT.lerp = (a, b, t) => a + (b - a) * t;
