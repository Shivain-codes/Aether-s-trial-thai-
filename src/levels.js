// Aether's Trial — level definitions, loading and per-frame level update. Pure logic, no DOM.
// Decor entry shape: {visual, x, y, w?, h?, r?, color?, solid:false}. Visuals used:
//  fields: 'stream' (rect, flowing water), 'flower', 'grass', 'clearing' (circle, boss arena)
//  ruins : 'platform' (rect stone), 'glow' (circle glowing rune), 'crack' (rect)
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;

  function scatter(rng, n, minGap, w, h, margin, avoid, make) {
    const out = [];
    let tries = 0;
    while (out.length < n && tries++ < n * 60) {
      const x = margin + rng() * (w - 2 * margin), y = margin + rng() * (h - 2 * margin);
      if (avoid(x, y)) continue;
      let ok = true;
      for (const o of out) { if (Math.hypot(o.x - x, o.y - y) < minGap) { ok = false; break; } }
      if (!ok) continue;
      out.push(make(x, y));
    }
    return out;
  }

  function buildFields() {
    const W = 2000, H = 1500, rng = AT.rng(1337);
    const start = { x: 220, y: 1280 }, boss = { x: 1640, y: 340 };
    const chests = [{ x: 520, y: 360 }, { x: 1010, y: 1190 }, { x: 1720, y: 980 }];
    const pond = { x: 1180, y: 830, r: 105 };
    const obstacles = [], decor = [], water = [];

    // Flowing stream (shallow, walkable) across the map; every point is a ford
    for (let i = 0; i < 21; i++) {
      const x = i * 100 + 50, y = 640 + Math.sin(i * 0.55) * 110 + i * 6;
      const seg = { type: 'rect', visual: 'water', x: x - 60, y: y - 34, w: 120, h: 68, solid: false };
      decor.push(Object.assign({}, seg, { visual: 'stream', flow: i }));
      water.push({ x: seg.x, y: seg.y, w: seg.w, h: seg.h });
    }
    // Blocking pond
    obstacles.push({ type: 'circle', x: pond.x, y: pond.y, r: pond.r, visual: 'water', solid: true });
    water.push({ x: pond.x - pond.r, y: pond.y - pond.r, w: pond.r * 2, h: pond.r * 2 });
    decor.push({ visual: 'clearing', x: boss.x, y: boss.y, r: 250, solid: false });

    // Trees ring the boss clearing, with an opening to the south-west
    for (let a = 0; a < TAU; a += 0.27) {
      if (a > 1.35 && a < 2.9) continue;
      const x = boss.x + Math.cos(a) * 330, y = boss.y + Math.sin(a) * 330;
      if (x < 40 || y < 40 || x > W - 40 || y > H - 40) continue;
      obstacles.push({ type: 'circle', x, y, r: 24, visual: 'tree', solid: true });
    }
    const near = (x, y, p, d) => Math.hypot(x - p.x, y - p.y) < d;
    const avoid = (x, y) => near(x, y, start, 220) || near(x, y, boss, 300) || near(x, y, pond, pond.r + 60) ||
      chests.some(c => near(x, y, c, 75));
    const trees = scatter(rng, 42, 85, W, H, 50, avoid, (x, y) => ({ type: 'circle', x, y, r: 20 + rng() * 8, visual: 'tree', solid: true }));
    const rocks = scatter(rng, 14, 90, W, H, 50, (x, y) => avoid(x, y) || trees.some(t => Math.hypot(t.x - x, t.y - y) < 60),
      (x, y) => ({ type: 'circle', x, y, r: 15 + rng() * 11, visual: 'rock', solid: true }));
    obstacles.push(...trees, ...rocks);
    const colors = ['#ffffff', '#ffe27a', '#ff9ec7', '#9fd8ff'];
    for (let i = 0; i < 160; i++) {
      const x = rng() * W, y = rng() * H;
      decor.push({ visual: i % 3 ? 'flower' : 'grass', x, y, r: 3 + rng() * 2, color: colors[Math.floor(rng() * colors.length)], solid: false });
    }
    return { index: 0, name: AT.CFG.LEVELS[0].name, w: W, h: H, theme: 'fields', obstacles, decor, water,
      playerStart: start, spawnPoints: { player: start, boss, chests } };
  }

  function buildRuins() {
    const W = 2200, H = 1600, rng = AT.rng(4242);
    const start = { x: 250, y: 1380 }, boss = { x: 1700, y: 420 };
    const chests = [{ x: 820, y: 430 }, { x: 1560, y: 1250 }];
    const obstacles = [], decor = [], water = [];
    const E = 44; // void edge thickness
    obstacles.push({ type: 'rect', x: 0, y: 0, w: W, h: E, visual: 'void', solid: true },
      { type: 'rect', x: 0, y: H - E, w: W, h: E, visual: 'void', solid: true },
      { type: 'rect', x: 0, y: 0, w: E, h: H, visual: 'void', solid: true },
      { type: 'rect', x: W - E, y: 0, w: E, h: H, visual: 'void', solid: true });
    // central chasm with a bridge-gap in the middle
    const chasms = [{ x: 1060, y: E, w: 90, h: 540 }, { x: 1060, y: 980, w: 90, h: H - E - 980 },
      { x: 380, y: 760, w: 340, h: 90 }, { x: 1500, y: 700, w: 300, h: 80 }];
    for (const c of chasms) obstacles.push({ type: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, visual: 'void', solid: true });
    // stone platforms (walkable decor)
    const plats = [[110, 1180, 400, 300], [640, 200, 420, 300], [1250, 900, 520, 360], [1480, 190, 500, 480], [330, 480, 300, 240], [1650, 1220, 400, 280]];
    for (const p of plats) decor.push({ visual: 'platform', x: p[0], y: p[1], w: p[2], h: p[3], solid: false });
    // boss arena pillars (broken ring, opening to the south-west)
    for (let a = 0; a < TAU; a += 0.5) {
      if (a > 1.4 && a < 3.0) continue;
      const x = boss.x + Math.cos(a) * 300, y = boss.y + Math.sin(a) * 300;
      if (x < 90 || y < 90 || x > W - 90 || y > H - 90) continue;
      obstacles.push({ type: 'circle', x, y, r: 24, visual: 'pillar', solid: true });
    }
    const near = (x, y, p, d) => Math.hypot(x - p.x, y - p.y) < d;
    const inVoid = (x, y, m) => chasms.some(c => x > c.x - m && x < c.x + c.w + m && y > c.y - m && y < c.y + c.h + m);
    const avoid = (x, y) => near(x, y, start, 230) || near(x, y, boss, 250) || chests.some(c => near(x, y, c, 80)) || inVoid(x, y, 60);
    const pillars = scatter(rng, 26, 110, W, H, 90, avoid, (x, y) => ({ type: 'circle', x, y, r: 18 + rng() * 10, visual: 'pillar', solid: true }));
    const walls = scatter(rng, 9, 200, W, H, 120, (x, y) => avoid(x, y) || pillars.some(p => Math.hypot(p.x - x, p.y - y) < 80),
      (x, y) => (rng() < 0.5 ? { type: 'rect', x: x - 55, y: y - 14, w: 110, h: 28, visual: 'wall', solid: true }
        : { type: 'rect', x: x - 14, y: y - 55, w: 28, h: 110, visual: 'wall', solid: true }));
    obstacles.push(...pillars, ...walls);
    for (let i = 0; i < 34; i++) {
      const x = 80 + rng() * (W - 160), y = 80 + rng() * (H - 160);
      if (inVoid(x, y, 10)) continue;
      decor.push({ visual: 'glow', x, y, r: 8 + rng() * 10, color: rng() < 0.5 ? '#8fd6ff' : '#c9a0ff', solid: false });
    }
    for (let i = 0; i < 18; i++) decor.push({ visual: 'crack', x: 80 + rng() * (W - 160), y: 80 + rng() * (H - 160), w: 40 + rng() * 60, h: 6, solid: false });
    return { index: 1, name: AT.CFG.LEVELS[1].name, w: W, h: H, theme: 'ruins', obstacles, decor, water,
      playerStart: start, spawnPoints: { player: start, boss, chests } };
  }

  const defs = [
    { index: 0, name: 'Mondstadt Fields', w: 2000, h: 1500, theme: 'fields', bossId: 'mitachurl', build: buildFields },
    { index: 1, name: 'Stormterror Ruins', w: 2200, h: 1600, theme: 'ruins', bossId: 'stormdrake', build: buildRuins }
  ];

  const ELEMENTS = ['hydro', 'pyro', 'electro', 'anemo', 'cryo', 'geo'];

  function plan(index, rng) {
    if (index === 0) { // 10 slimes, >=3 hydro, at least one of each other variant
      const list = ['hydro', 'hydro', 'hydro', 'pyro', 'electro', 'anemo', 'cryo', 'geo'];
      while (list.length < 10) list.push(ELEMENTS[Math.floor(rng() * ELEMENTS.length)]);
      return list.map(el => ({ el, behavior: 'normal' }));
    }
    const out = [];
    const shooters = ['electro', 'anemo', 'electro'];
    for (const el of shooters) out.push({ el, behavior: 'shooter' });
    const fixed = ['hydro', 'hydro', 'pyro', 'cryo'];
    for (let i = 0; i < 12; i++) {
      const el = i < fixed.length ? fixed[i] : ELEMENTS[Math.floor(rng() * ELEMENTS.length)];
      out.push({ el, behavior: i % 3 === 0 ? 'lunger' : 'normal' });
    }
    return out;
  }

  const Levels = {
    defs,

    load(index, rng) {
      index = index === 1 ? 1 : 0;
      rng = rng || AT.rng(1000 + index * 77);
      const def = defs[index];
      const worldDef = def.build();
      const world = AT.World.create(worldDef);
      const L = AT.CFG.LEVELS[index];
      const sp = worldDef.spawnPoints;

      // player start must be open
      const ps = world.findOpenNear(sp.player.x, sp.player.y, 20);
      world.playerStart.x = ps.x; world.playerStart.y = ps.y;

      const bossPos = world.findOpenNear(sp.boss.x, sp.boss.y, AT.CFG.BOSS[def.bossId].r + 6);
      const boss = AT.Bosses.create(def.bossId, bossPos.x, bossPos.y);

      const chestDefs = (AT.CFG.LOOT.chests && AT.CFG.LOOT.chests[index]) || [];
      const chests = sp.chests.map((p, i) => {
        const q = world.findOpenNear(p.x, p.y, 26);
        const rw = chestDefs[i] || { coins: 0, gems: 0, potions: 0 };
        return { kind: 'chest', id: AT.nextId(), x: q.x, y: q.y, r: 22, opened: false,
          rewards: { coins: rw.coins, gems: rw.gems, potions: rw.potions } };
      });

      const enemies = [];
      const slots = plan(index, rng);
      const er = AT.CFG.ENEMY.slime.r + 6;
      for (const s of slots) {
        let pt = null;
        for (let t = 0; t < 400 && !pt; t++) {
          const c = world.randomOpenPoint(rng, er);
          const strict = t < 300;
          if (Math.hypot(c.x - world.playerStart.x, c.y - world.playerStart.y) < (strict ? 420 : 300)) continue;
          if (Math.hypot(c.x - bossPos.x, c.y - bossPos.y) < (strict ? 300 : 220)) continue;
          if (strict && enemies.some(o => Math.hypot(o.x - c.x, o.y - c.y) < 90)) continue;
          if (chests.some(ch => Math.hypot(ch.x - c.x, ch.y - c.y) < 50)) continue;
          pt = c;
        }
        if (!pt) pt = world.findOpenNear(world.w * 0.5, world.h * 0.5, er);
        const e = AT.Enemies.create('slime', s.el, pt.x, pt.y, index, { behavior: s.behavior, rng: AT.rng(Math.floor(rng() * 1e9) + 1) });
        enemies.push(e);
      }

      return {
        index, name: L.name, world, enemies, boss, chests, pickups: [],
        objective: L.objective, completed: false, enemiesTotal: enemies.length,
        enemiesKilled: 0, bossDefeated: false, time: 0, rng
      };
    },

    update(dt, level, player) {
      if (!level || !player) return;
      if (player.dead || player.hp <= 0) return; // nothing runs while the player is dead
      level.time += dt;
      const world = level.world;
      const ctx = { player, world, level, rng: level.rng };

      for (const e of level.enemies) {
        AT.Enemies.update(e, dt, ctx);
        if (!e.dead) { world.resolveEntity(e); world.clampEntity(e); }
      }
      const boss = level.boss;
      if (boss) {
        AT.Bosses.update(boss, dt, ctx);
        if (!boss.dead) { world.resolveEntity(boss); world.clampEntity(boss); }
      }

      // soft separation (enemies push each other apart; boss is heavy and only pushes slimes)
      const live = level.enemies.filter(e => !e.dead);
      for (let i = 0; i < live.length; i++) {
        const a = live[i];
        for (let j = i + 1; j < live.length; j++) {
          const b = live[j];
          const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= m * m) continue;
          const d = Math.sqrt(d2) || 0.001, push = (m - d) * Math.min(1, 6 * dt) * 0.5;
          const nx = dx / d, ny = dy / d;
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
        }
        if (boss && !boss.dead) {
          const dx = a.x - boss.x, dy = a.y - boss.y, m = a.r + boss.r, d2 = dx * dx + dy * dy;
          if (d2 < m * m) { const d = Math.sqrt(d2) || 0.001, push = (m - d) * Math.min(1, 8 * dt); a.x += dx / d * push; a.y += dy / d * push; }
        }
        world.resolveEntity(a); world.clampEntity(a);
      }

      // count deaths exactly once, then drop corpses after the death animation
      const deathDur = (AT.CFG.ENEMY && AT.CFG.ENEMY.deathDur) || 0.8;
      for (const e of level.enemies) {
        if (e.dead && !e._counted) { e._counted = true; level.enemiesKilled++; }
      }
      if (level.enemies.some(e => e.dead && e.deathT >= deathDur)) {
        level.enemies = level.enemies.filter(e => !(e.dead && e.deathT >= deathDur));
      }
      if (boss && boss.dead) level.bossDefeated = true;

      if (!level.completed && level.enemiesKilled >= level.enemiesTotal && boss && boss.dead) {
        level.completed = true;
        AT.events.emit('levelComplete', { levelIndex: level.index });
      }
    }
  };

  AT.Levels = Levels;
})();
