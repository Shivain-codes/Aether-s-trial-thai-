// Aether's Trial — projectiles (pure logic, no DOM). Owner: combat subagent.
(function () {
  const AT = globalThis.AT;
  const PASS_THROUGH = { water: true, void: true }; // visuals that don't block projectiles

  const P = {
    list: [],

    spawn(def) {
      def = def || {};
      const cap = (AT.CFG.LIMITS && AT.CFG.LIMITS.projectiles) || 60;
      const p = {
        kind: 'projectile',
        owner: def.owner || 'enemy',
        element: def.element || 'none',
        x: def.x || 0, y: def.y || 0,
        vx: def.vx || 0, vy: def.vy || 0,
        r: def.r || 8,
        dmg: def.dmg || 0,
        life: def.life > 0 ? def.life : 2,
        pierce: !!def.pierce,
        hitIds: {},
        dead: false,
        hitId: def.hitId || AT.nextId(),
        color: def.color || null,
        knockback: def.knockback || 0
      };
      if (def.id) p.id = def.id;
      while (P.list.length >= cap) P.list.shift(); // drop oldest
      P.list.push(p);
      return p;
    },

    // ctx = {enemies, player, world}
    update(dt, ctx) {
      ctx = ctx || {};
      const player = ctx.player || AT.player;
      const enemies = ctx.enemies || [];
      const world = ctx.world;
      const C = AT.Collision;
      for (let i = 0; i < P.list.length; i++) {
        const p = P.list[i];
        if (p.dead) continue;
        const ox = p.x, oy = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0) { p.dead = true; continue; }
        if (world && world.w > 0 && (p.x < -50 || p.y < -50 || p.x > world.w + 50 || p.y > world.h + 50)) { p.dead = true; continue; }
        if (world && world.obstacles) {
          const blockers = world.obstacles.filter(o => o.solid !== false && !PASS_THROUGH[o.visual]);
          if (blockers.length && C.segmentHitsObstacle(ox, oy, p.x, p.y, blockers, p.r * 0.5)) { p.dead = true; continue; }
        }
        if (p.owner === 'player') {
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (!e || e.dead || e.hp <= 0) continue;
            if (p.hitIds[e.id !== undefined ? e.id : j]) continue;
            if (!C.circleCircle(p, e)) continue;
            p.hitIds[e.id !== undefined ? e.id : j] = true;
            const sp = Math.hypot(p.vx, p.vy) || 1;
            AT.Combat.dealDamageToEnemy(e, {
              amount: p.dmg, element: p.element, source: 'player', hitId: p.hitId,
              knockback: p.knockback ? { x: p.vx / sp * p.knockback, y: p.vy / sp * p.knockback } : null,
              kind: 'projectile'
            });
            if (!p.pierce) { p.dead = true; break; }
          }
        } else if (player && !player.dead && !(player.invuln > 0)) {
          if (!p.hitIds.player && C.circleCircle(p, player)) {
            p.hitIds.player = true;
            AT.Combat.damagePlayer(player, p.dmg, { x: p.x, y: p.y, element: p.element, source: 'projectile' });
            if (!p.pierce) p.dead = true;
          }
        }
      }
      let w = 0;
      for (let i = 0; i < P.list.length; i++) if (!P.list[i].dead) P.list[w++] = P.list[i];
      P.list.length = w;
    },

    clear() { P.list.length = 0; }
  };

  AT.Projectiles = P;
})();
