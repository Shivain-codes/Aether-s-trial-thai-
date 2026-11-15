// Aether's Trial — world geometry (obstacles, decor, spawn queries). Pure logic, no DOM.
(function () {
  const AT = globalThis.AT;

  // Push a circle entity out of a single obstacle. Returns true if moved.
  function pushOut(ent, o) {
    const r = ent.r || 0;
    if (o.type === 'circle') {
      let dx = ent.x - o.x, dy = ent.y - o.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      const min = o.r + r;
      if (d >= min) return false;
      if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
      ent.x = o.x + (dx / d) * min;
      ent.y = o.y + (dy / d) * min;
      return true;
    }
    const cx = Math.max(o.x, Math.min(ent.x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(ent.y, o.y + o.h));
    let dx = ent.x - cx, dy = ent.y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return false;
    if (d2 > 1e-9) {
      const d = Math.sqrt(d2);
      ent.x = cx + (dx / d) * r;
      ent.y = cy + (dy / d) * r;
      return true;
    }
    // centre inside rect: exit by the shortest side
    const l = ent.x - o.x, rt = o.x + o.w - ent.x, t = ent.y - o.y, b = o.y + o.h - ent.y;
    const m = Math.min(l, rt, t, b);
    if (m === l) ent.x = o.x - r;
    else if (m === rt) ent.x = o.x + o.w + r;
    else if (m === t) ent.y = o.y - r;
    else ent.y = o.y + o.h + r;
    return true;
  }

  function hitsObstacle(x, y, r, o) {
    if (o.type === 'circle') {
      const dx = x - o.x, dy = y - o.y, m = o.r + r;
      return dx * dx + dy * dy < m * m;
    }
    const cx = Math.max(o.x, Math.min(x, o.x + o.w));
    const cy = Math.max(o.y, Math.min(y, o.y + o.h));
    const dx = x - cx, dy = y - cy;
    return dx * dx + dy * dy < r * r || (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h);
  }

  const World = {
    pushOut, hitsObstacle,

    // def: {index,name,w,h,theme,obstacles[],decor[],water[],playerStart,spawnPoints}
    create(def) {
      def = def || {};
      const w = def.w || 2000, h = def.h || 1500;
      const world = {
        index: def.index || 0,
        name: def.name || '',
        w, h,
        theme: def.theme || 'fields',
        obstacles: (def.obstacles || []).map(o => Object.assign({ solid: true }, o)),
        decor: (def.decor || []).slice(),
        water: (def.water || []).slice(),
        playerStart: Object.assign({ x: 150, y: h - 150 }, def.playerStart || {}),
        spawnPoints: def.spawnPoints || {},
        bounds: { x: 0, y: 0, w, h },
        isBlocked(x, y, r) {
          r = r || 0;
          if (x < r || y < r || x > w - r || y > h - r) return true;
          const obs = world.obstacles;
          for (let i = 0; i < obs.length; i++) {
            const o = obs[i];
            if (o.solid !== false && hitsObstacle(x, y, r, o)) return true;
          }
          return false;
        },
        randomOpenPoint(rng, r) {
          r = r || 14;
          const rnd = typeof rng === 'function' ? rng : Math.random;
          const m = r + 40;
          for (let i = 0; i < 400; i++) {
            const x = m + rnd() * (w - 2 * m), y = m + rnd() * (h - 2 * m);
            if (!world.isBlocked(x, y, r)) return { x, y };
          }
          return world.findOpenNear(world.playerStart.x, world.playerStart.y, r);
        },
        // Spiral search for the nearest open spot to (x,y).
        findOpenNear(x, y, r) {
          r = r || 14;
          if (!world.isBlocked(x, y, r)) return { x, y };
          for (let rad = 12; rad < 800; rad += 12) {
            const steps = Math.max(8, Math.floor(rad / 6));
            for (let k = 0; k < steps; k++) {
              const a = (k / steps) * Math.PI * 2;
              const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
              if (!world.isBlocked(px, py, r)) return { x: px, y: py };
            }
          }
          return { x, y };
        },
        resolveEntity(ent) {
          let moved = false;
          for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < world.obstacles.length; i++) {
              const o = world.obstacles[i];
              if (o.solid !== false && pushOut(ent, o)) moved = true;
            }
          }
          return moved;
        },
        clampEntity(ent) {
          const r = ent.r || 0;
          ent.x = Math.max(r, Math.min(w - r, ent.x));
          ent.y = Math.max(r, Math.min(h - r, ent.y));
        }
      };
      return world;
    }
  };

  AT.World = World;
})();
