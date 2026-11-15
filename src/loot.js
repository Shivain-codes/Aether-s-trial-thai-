// Aether's Trial — loot drops, pickups, chest interaction. Pure logic, Node-safe.
(function () {
  const AT = globalThis.AT;
  const L = {};
  const cfg = () => AT.CFG.LOOT;

  function award(p) {
    const P = AT.Progression;
    if (p.type === 'coin') return P.addCoins(p.amount);
    if (p.type === 'gem') return P.addGems(p.amount);
    if (p.type === 'potion') return P.addPotions(p.amount);
    return 0;
  }

  function makePickup(type, amount, x, y, rng) {
    const a = rng ? rng() * Math.PI * 2 : 0;
    const sp = rng ? 50 + rng() * 90 : 0;
    return { kind: 'pickup', id: AT.nextId(), type: type, x: x, y: y, amount: amount,
             life: cfg().pickupLife, age: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, collected: false };
  }

  function addToLevel(level, p) {
    if (!level.pickups) level.pickups = [];
    const cap = AT.CFG.LIMITS.pickups;
    while (level.pickups.length >= cap) { // over cap: oldest pickup is paid out immediately
      const old = level.pickups.shift();
      if (old && !old.collected) { old.collected = true; award(old); }
    }
    level.pickups.push(p);
  }

  // Builds drops for a killed enemy/boss. Pushes them into level.pickups when a level is given.
  L.spawnDrops = function (enemy, level, rng) {
    const out = [];
    if (!enemy) return out;
    rng = rng || Math.random;
    const c = cfg();
    const isBoss = enemy.kind === 'boss';
    const bc = isBoss ? (AT.CFG.BOSS[enemy.id] || {}) : {};
    let coins = enemy.coins;
    if (!(coins > 0)) coins = isBoss ? (bc.coins || 0) : Math.round(c.coinPerKill[0] + rng() * (c.coinPerKill[1] - c.coinPerKill[0]));
    if (coins > 0) out.push(makePickup('coin', coins, enemy.x, enemy.y, rng));
    if (isBoss) {
      const n = c.bossPotionDrops || 0;
      for (let i = 0; i < n; i++) out.push(makePickup('potion', 1, enemy.x, enemy.y, rng));
    } else if (rng() < c.potionDropChance) {
      out.push(makePickup('potion', 1, enemy.x, enemy.y, rng));
    }
    if (level) for (const p of out) addToLevel(level, p);
    return out;
  };

  function fPressed() {
    const I = AT.Input;
    if (!I || typeof I.pressed !== 'function') return false;
    try { return !!(I.pressed('KeyF') || I.pressed('f') || I.pressed('F')); } catch (e) { return false; }
  }

  // F pressed near a chest opens it. Safe to call repeatedly: a chest opens once.
  L.interact = function (player, level) {
    if (!player || player.dead || !level || !level.chests) return null;
    const chest = AT.Inventory.nearestChest(player, level.chests, AT.Inventory.interactRange());
    if (!chest) return null;
    return AT.Inventory.openChest(chest, player, level) ? chest : null;
  };

  L.update = function (dt, level, player) {
    if (!level) return;
    if (player && !player.dead && fPressed()) L.interact(player, level);
    const list = level.pickups;
    if (!list || !list.length) return;
    const c = cfg();
    const alive = !!(player && !player.dead);
    const pr = (player && player.r) || AT.CFG.PLAYER.radius;
    const P = AT.Progression;
    for (const p of list) {
      if (p.collected) continue;
      p.age = (p.age || 0) + dt;
      p.life -= dt;
      if (p.vx || p.vy) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        const f = Math.exp(-5 * dt); p.vx *= f; p.vy *= f;
        if (Math.abs(p.vx) + Math.abs(p.vy) < 2) { p.vx = 0; p.vy = 0; }
      }
      if (!alive) continue;
      if (p.type === 'potion' && P.state.potions >= (c.maxPotions != null ? c.maxPotions : 9)) continue;
      const dx = player.x - p.x, dy = player.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d <= c.pickupRange + pr) {
        const amt = award(p);
        p.collected = true;
        if (amt > 0) AT.events.emit('pickup', { kind: p.type, amount: amt, x: p.x, y: p.y });
      } else if (d <= c.magnetRange && p.age > 0.25) {
        const spd = 220 + (1 - d / c.magnetRange) * 360;
        const step = Math.min(d, spd * dt);
        p.x += dx / d * step; p.y += dy / d * step;
        p.vx = 0; p.vy = 0;
      }
    }
    for (let i = list.length - 1; i >= 0; i--) if (list[i].collected || list[i].life <= 0) list.splice(i, 1);
  };

  AT.Loot = L;
})();
