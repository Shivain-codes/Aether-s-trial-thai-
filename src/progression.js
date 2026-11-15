// Aether's Trial — progression (XP, levels, persistent rewards, retry snapshot). Pure logic, Node-safe.
(function () {
  const AT = globalThis.AT;
  const CFG = () => AT.CFG;

  const P = {
    state: null,
    entrySnap: null,
    levelIndex: 0,
    rewarded: {},          // enemy id -> true (one grant per enemy id, per level attempt)
    stats: { kills: 0, xp: 0, bossKills: 0 }, // per level attempt
    _rng: null,
    _handlers: null,
    _getLevel: null
  };

  function baseState() {
    const pc = CFG().PLAYER;
    return {
      level: 1, xp: 0, coins: 0, gems: 0,
      potions: (CFG().LOOT.startPotions != null ? CFG().LOOT.startPotions : 1),
      maxHp: pc.baseHp, atk: pc.baseAtk
    };
  }

  function seedRng(levelIndex) { P._rng = AT.rng(9001 + (levelIndex | 0) * 7717); }

  P.reset = function () {
    P.state = baseState();
    P.entrySnap = P.snapshot();
    P.levelIndex = 0;
    P.rewarded = {};
    P.stats = { kills: 0, xp: 0, bossKills: 0 };
    seedRng(0);
    P.syncPlayer(AT.player);
    return P.state;
  };

  P.xpToNext = function (level) {
    const x = CFG().XP;
    if (level >= x.maxLevel) return Infinity;
    return Math.round(x.base + x.growth * Math.pow(Math.max(0, level - 1), x.exponent));
  };

  // Mirror persistent counters onto a player object (does not touch hp).
  P.syncPlayer = function (p) {
    if (!p || !P.state) return;
    const s = P.state;
    p.level = s.level; p.xp = s.xp; p.coins = s.coins; p.gems = s.gems; p.potions = s.potions;
    p.maxHp = s.maxHp; p.atk = s.atk;
    if (typeof p.hp !== 'number') p.hp = s.maxHp;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  };

  P.applyToPlayer = function (p) { P.syncPlayer(p); return p; };

  P.addXp = function (n, player) {
    const s = P.state, pc = CFG().PLAYER;
    n = Math.floor(Number(n) || 0);
    if (n <= 0) return 0;
    const p = player || AT.player;
    if (s.level >= CFG().XP.maxLevel) { s.xp = 0; return 0; }
    s.xp += n;
    P.stats.xp += n;
    let ups = 0;
    while (s.level < CFG().XP.maxLevel && s.xp >= P.xpToNext(s.level)) {
      s.xp -= P.xpToNext(s.level);
      s.level++; ups++;
      s.maxHp += pc.hpPerLevel;
      s.atk += pc.atkPerLevel;
      if (p && !p.dead) {
        p.maxHp = s.maxHp; p.atk = s.atk;
        const base = typeof p.hp === 'number' ? p.hp : 0;
        p.hp = Math.min(s.maxHp, base + s.maxHp * pc.healOnLevelUp);
        AT.events.emit('hpChanged', {});
      }
      AT.events.emit('levelUp', { level: s.level });
    }
    if (s.level >= CFG().XP.maxLevel) s.xp = 0;
    P.syncPlayer(p);
    return ups;
  };

  P.addCoins = function (n) { n = Math.max(0, Math.floor(Number(n) || 0)); P.state.coins += n; P.syncPlayer(AT.player); return n; };
  P.addGems = function (n) { n = Math.max(0, Math.floor(Number(n) || 0)); P.state.gems += n; P.syncPlayer(AT.player); return n; };
  P.addPotions = function (n) {
    n = Math.max(0, Math.floor(Number(n) || 0));
    const max = CFG().LOOT.maxPotions != null ? CFG().LOOT.maxPotions : 9;
    const add = Math.max(0, Math.min(n, max - P.state.potions));
    P.state.potions += add; P.syncPlayer(AT.player);
    return add;
  };

  P.snapshot = function () { return JSON.parse(JSON.stringify(P.state)); };
  P.restore = function (snap) {
    if (!snap) return false;
    P.state = JSON.parse(JSON.stringify(snap));
    P.syncPlayer(AT.player);
    return true;
  };

  P.beginLevel = function (levelIndex) {
    if (!P.state) P.reset();
    P.levelIndex = levelIndex | 0;
    P.entrySnap = P.snapshot();
    P.rewarded = {};
    P.stats = { kills: 0, xp: 0, bossKills: 0 };
    seedRng(P.levelIndex);
  };

  // Restores the state recorded at level entry; kills / drops of the failed attempt are forgotten.
  P.retryLevel = function () {
    if (!P.entrySnap) return false;
    P.restore(P.entrySnap);
    P.rewarded = {};
    P.stats = { kills: 0, xp: 0, bossKills: 0 };
    seedRng(P.levelIndex);
    const p = AT.player;
    if (p) { p.maxHp = P.state.maxHp; p.atk = P.state.atk; p.hp = Math.min(p.hp || 0, p.maxHp); }
    return true;
  };

  // Gains since level entry (for the level complete screen).
  P.levelGains = function () {
    const e = P.entrySnap || P.state, s = P.state;
    return { kills: P.stats.kills, xp: P.stats.xp, coins: s.coins - e.coins, gems: s.gems - e.gems,
             levels: s.level - e.level };
  };

  function currentLevel() {
    if (typeof P._getLevel === 'function') return P._getLevel() || null;
    return (AT.Game && AT.Game.level) || null;
  }

  function grant(e, isBoss) {
    if (!e || e.rewardGiven) return false;
    const key = e.id != null ? e.id : null;
    if (key != null && P.rewarded[key]) { e.rewardGiven = true; return false; }
    if (key != null) P.rewarded[key] = true;
    e.rewardGiven = true;
    if (!P.state) P.reset();
    const cfg = isBoss ? (CFG().BOSS[e.id] || {}) : (CFG().ENEMY[e.type] || {});
    const xp = (e.xp != null ? e.xp : (cfg.xp || 0)) * (CFG().XP.perKillMul || 1);
    P.stats.kills++;
    if (isBoss) P.stats.bossKills++;
    P.addXp(xp);
    const level = currentLevel();
    const drops = AT.Loot && AT.Loot.spawnDrops ? AT.Loot.spawnDrops(e, level, P._rng) : [];
    if (!level) { // no world to drop into: grant directly
      for (const d of drops) {
        if (d.type === 'coin') P.addCoins(d.amount);
        else if (d.type === 'gem') P.addGems(d.amount);
        else if (d.type === 'potion') P.addPotions(d.amount);
      }
    }
    return true;
  }

  P.grantKill = function (enemy) { return grant(enemy, enemy && enemy.kind === 'boss'); };
  P.grantBoss = function (boss) { return grant(boss, true); };

  P.unbind = function () {
    if (!P._handlers) return;
    AT.events.off('enemyKilled', P._handlers.kill);
    AT.events.off('bossDefeated', P._handlers.boss);
    P._handlers = null;
  };

  // getLevel: optional function returning the active level (defaults to AT.Game.level).
  P.bind = function (getLevel) {
    P.unbind();
    if (typeof getLevel === 'function') P._getLevel = getLevel;
    if (!P.state) P.reset();
    P._handlers = {
      kill: function (ev) { if (ev && ev.enemy) P.grantKill(ev.enemy); },
      boss: function (ev) { if (ev && ev.boss) P.grantBoss(ev.boss); }
    };
    AT.events.on('enemyKilled', P._handlers.kill);
    AT.events.on('bossDefeated', P._handlers.boss);
  };

  AT.Progression = P;
  P.reset();
})();
