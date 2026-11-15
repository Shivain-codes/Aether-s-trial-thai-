// Aether's Trial — player entity + logic (no DOM). Owner: core.
(function () {
  const AT = globalThis.AT;
  const CFG = () => AT.CFG;

  function create() {
    const C = CFG();
    const P = C.PLAYER;
    const p = {
      id: AT.nextId(), kind: 'player',
      x: 0, y: 0, vx: 0, vy: 0, r: P.radius, facing: 0,
      hp: P.baseHp, maxHp: P.baseHp, atk: P.baseAtk, speed: P.speed,
      dead: false, hitFlash: 0, kb: { x: 0, y: 0 },
      energy: 0, maxEnergy: P.maxEnergy,
      level: 1, xp: 0, invuln: 0,
      dashTime: 0, dashCd: 0, dashDir: { x: 1, y: 0 },
      atkCd: 0, skillCd: 0, swinging: 0, swingAngle: 0, swingId: 0, combo: 0,
      moving: false, anim: 'idle', animT: 0,
      potions: 0, coins: 0, gems: 0,
      afterimages: [],
      // internal
      _act: null, _actT: 0, _hurtT: 0, _lastHp: P.baseHp, _afterT: 0
    };
    if (AT.Progression && typeof AT.Progression.applyToPlayer === 'function') AT.Progression.applyToPlayer(p);
    p.hp = p.maxHp;
    p._lastHp = p.hp;
    AT.player = p;
    return p;
  }

  function nearestEnemy(p, enemies, range) {
    let best = null, bd = range * range;
    if (!enemies) return null;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function resolveWorld(p, world) {
    if (!world) return;
    const Col = AT.Collision;
    if (Col && Col.resolveCircleVsObstacles && world.obstacles) Col.resolveCircleVsObstacles(p, world.obstacles);
    if (Col && Col.clampToWorld) Col.clampToWorld(p, world);
    else if (world.w != null && world.h != null) {
      p.x = AT.clamp(p.x, p.r, world.w - p.r);
      p.y = AT.clamp(p.y, p.r, world.h - p.r);
    }
  }

  /** Move in sub-steps so fast dashes cannot tunnel through obstacles. */
  function moveWithCollision(p, dx, dy, world) {
    const dist = Math.hypot(dx, dy);
    const n = Math.max(1, Math.ceil(dist / Math.max(4, p.r * 0.6)));
    const sx = dx / n, sy = dy / n;
    for (let i = 0; i < n; i++) { p.x += sx; p.y += sy; resolveWorld(p, world); }
  }

  function setAnim(p, name, dt) {
    if (p.anim !== name) { p.anim = name; p.animT = 0; }
    else p.animT += dt;
  }

  function update(a, b, c) {
    let p, dt, ctx;
    if (a && typeof a === 'object') { p = a; dt = b; ctx = c || {}; }
    else { dt = a; ctx = b || {}; p = ctx.player || AT.player; }
    if (!p) return p;
    const C = CFG();
    dt = Math.max(0, Math.min(dt || 0, C.MAX_DT));
    const In = ctx.input || AT.Input;
    const world = ctx.world;

    // ---- timers ----
    const tick = (k) => { if (p[k] > 0) p[k] = Math.max(0, p[k] - dt); };
    tick('invuln'); tick('hitFlash'); tick('dashCd'); tick('atkCd'); tick('skillCd');
    tick('swinging'); tick('_hurtT'); tick('_actT');
    if (p._actT <= 0) p._act = null;
    if (!p.kb) p.kb = { x: 0, y: 0 };

    // afterimages always fade out
    const ai = p.afterimages;
    for (let i = ai.length - 1; i >= 0; i--) { ai[i].life -= dt; if (ai[i].life <= 0) ai.splice(i, 1); }

    // damage taken this frame -> hurt flag
    if (p.hp < p._lastHp) p._hurtT = 0.25;
    p._lastHp = p.hp;

    if (!p.dead && p.hp <= 0) { p.hp = 0; p.dead = true; p.animT = 0; }

    // ---- dead: only knockback drift ----
    if (p.dead) {
      p.moving = false; p.vx = 0; p.vy = 0; p.dashTime = 0;
      if (Math.abs(p.kb.x) + Math.abs(p.kb.y) > 1) {
        moveWithCollision(p, p.kb.x * dt, p.kb.y * dt, world);
        const f = Math.exp(-10 * dt); p.kb.x *= f; p.kb.y *= f;
      }
      setAnim(p, 'dead', dt);
      return p;
    }

    // ---- input ----
    const ax = In ? In.axis() : { x: 0, y: 0 };
    let mx = ax.x, my = ax.y;
    const mlen = Math.hypot(mx, my);
    if (mlen > 0) { mx /= mlen; my /= mlen; }          // normalized diagonals
    const hasMove = mlen > 0;
    const pressed = (k) => !!(In && In.pressed(k));
    const held = (k) => !!(In && In.isDown(k));

    // ---- dash ----
    if (p.dashTime <= 0 && p.dashCd <= 0 && (pressed('ShiftLeft') || pressed('ShiftRight'))) {
      const D = C.DASH;
      const dx = hasMove ? mx : Math.cos(p.facing), dy = hasMove ? my : Math.sin(p.facing);
      p.dashDir = { x: dx, y: dy };
      p.dashTime = D.duration; p.dashCd = D.cooldown;
      p.invuln = Math.max(p.invuln, D.invuln);
      p._afterT = 0;
      if (hasMove) p.facing = Math.atan2(dy, dx);
      if (AT.events) AT.events.emit('dash', { x: p.x, y: p.y, angle: p.facing });
    }
    const dashing = p.dashTime > 0;

    // ---- actions (not while dashing) ----
    if (!dashing) {
      const wantsAct = held('Space') || held('KeyE') || pressed('KeyQ');
      if (wantsAct && !hasMove && p.swinging <= 0) {   // keyboard aim assist when standing still
        const t = nearestEnemy(p, ctx.enemies, 170);
        if (t) p.facing = Math.atan2(t.y - p.y, t.x - p.x);
      }
      const cctx = { enemies: ctx.enemies || [], world: world, level: ctx.level, player: p };
      const Cb = AT.Combat;
      if (Cb) {
        if (pressed('KeyQ') && typeof Cb.playerBurst === 'function') {
          p.swingAngle = p.facing;
          if (Cb.playerBurst(p, cctx)) {
            const B = C.BURST;
            p._act = 'burst'; p._actT = (B.ticks || 3) * (B.tickInterval || 0.18) + 0.25;
            p.invuln = Math.max(p.invuln, B.invuln || 0);
          }
        }
        if (held('KeyE') && typeof Cb.playerSkill === 'function') {
          p.swingAngle = p.facing;
          if (Cb.playerSkill(p, cctx)) { p._act = 'skill'; p._actT = C.SKILL.duration; }
        }
        if (held('Space') && typeof Cb.playerSword === 'function') {
          p.swingAngle = p.facing;
          if (Cb.playerSword(p, cctx)) {
            p._act = 'attack'; p._actT = C.SWORD.duration;
            if (!(p.swinging > 0)) p.swinging = C.SWORD.duration;
          }
        }
      }
      if (pressed('KeyF') && AT.Loot && typeof AT.Loot.interact === 'function') AT.Loot.interact(p, ctx.level);
      if (pressed('KeyH') && AT.Inventory && typeof AT.Inventory.usePotion === 'function') AT.Inventory.usePotion(p);
    } else {
      // interact / potion still allowed mid-dash
      if (pressed('KeyH') && AT.Inventory && typeof AT.Inventory.usePotion === 'function') AT.Inventory.usePotion(p);
    }

    // ---- velocity ----
    if (dashing) {
      p.dashTime = Math.max(0, p.dashTime - dt);
      p.vx = p.dashDir.x * C.DASH.speed; p.vy = p.dashDir.y * C.DASH.speed;
      p._afterT -= dt;
      if (p._afterT <= 0) {
        p._afterT = 0.03;
        ai.push({ x: p.x, y: p.y, facing: p.facing, life: 0.28 });
        const cap = (C.LIMITS && C.LIMITS.afterimages) || 8;
        while (ai.length > cap) ai.shift();
      }
    } else {
      p.vx = mx * p.speed; p.vy = my * p.speed;
      if (hasMove && !(p.swinging > 0)) p.facing = Math.atan2(my, mx);
    }
    p.moving = hasMove || dashing;

    // ---- integrate + collide ----
    const dx = (p.vx + p.kb.x) * dt, dy = (p.vy + p.kb.y) * dt;
    if (dx !== 0 || dy !== 0) moveWithCollision(p, dx, dy, world); else resolveWorld(p, world);
    const f = Math.exp(-10 * dt);
    p.kb.x *= f; p.kb.y *= f;
    if (Math.abs(p.kb.x) < 1) p.kb.x = 0;
    if (Math.abs(p.kb.y) < 1) p.kb.y = 0;

    // ---- animation state ----
    let anim = 'idle';
    if (p._hurtT > 0) anim = 'hurt';
    else if (dashing) anim = 'dash';
    else if (p._act === 'burst') anim = 'burst';
    else if (p._act === 'skill') anim = 'skill';
    else if (p._act === 'attack' || p.swinging > 0) anim = 'attack';
    else if (p.moving) anim = 'run';
    setAnim(p, anim, dt);
    return p;
  }

  AT.Player = { create, update, nearestEnemy };
})();
