// Aether's Trial — collision helpers (pure logic, no DOM). Owner: combat subagent.
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;

  function dist(ax, ay, bx, by) {
    if (ax && typeof ax === 'object') { by = ay && ay.y; bx = ay && ay.x; ay = ax.y; ax = ax.x; }
    return Math.hypot(bx - ax, by - ay);
  }
  function angleTo(ax, ay, bx, by) {
    if (ax && typeof ax === 'object') { by = ay && ay.y; bx = ay && ay.x; ay = ax.y; ax = ax.x; }
    return Math.atan2(by - ay, bx - ax);
  }
  function normalizeAngle(a) {
    a = a % TAU;
    if (a > Math.PI) a -= TAU;
    else if (a < -Math.PI) a += TAU;
    return a;
  }
  function circleCircle(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, rr = (a.r || 0) + (b.r || 0);
    return dx * dx + dy * dy <= rr * rr;
  }
  // rect = {x,y,w,h} with (x,y) the TOP-LEFT corner.
  function circleRect(cx, cy, r, rect) {
    const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
    const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
  }
  // Circle (px,py,r) versus a cone with apex (ox,oy), facing `angle`, full opening `arc`, length `range`.
  function pointInCone(px, py, r, ox, oy, angle, arc, range) {
    const dx = px - ox, dy = py - oy;
    const d = Math.hypot(dx, dy);
    if (d <= r) return true;
    if (d > range + r) return false;
    const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - angle));
    const margin = Math.asin(Math.min(1, r / d)); // angular size of the circle
    return diff <= arc / 2 + margin;
  }
  // Oriented rectangle starting at (ox,oy) extending `len` along `angle`, `w` wide (centered on the axis).
  function circleInRectOriented(cx, cy, r, ox, oy, angle, len, w) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const dx = cx - ox, dy = cy - oy;
    const lx = dx * c + dy * s;
    const ly = -dx * s + dy * c;
    const nx = Math.max(0, Math.min(lx, len));
    const ny = Math.max(-w / 2, Math.min(ly, w / 2));
    const ex = lx - nx, ey = ly - ny;
    return ex * ex + ey * ey <= r * r;
  }
  function isSolid(o) { return o && o.solid !== false; }

  function resolveCircleVsObstacles(ent, obstacles) {
    if (!ent || !obstacles) return false;
    let moved = false;
    const r = ent.r || 0;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!isSolid(o)) continue;
      if (o.type === 'circle') {
        const dx = ent.x - o.x, dy = ent.y - o.y;
        const d = Math.hypot(dx, dy), min = r + o.r;
        if (d < min) {
          if (d < 1e-6) { ent.x = o.x + min; }
          else { ent.x = o.x + dx / d * min; ent.y = o.y + dy / d * min; }
          moved = true;
        }
      } else {
        const nx = Math.max(o.x, Math.min(ent.x, o.x + o.w));
        const ny = Math.max(o.y, Math.min(ent.y, o.y + o.h));
        let dx = ent.x - nx, dy = ent.y - ny;
        const d2 = dx * dx + dy * dy;
        if (d2 > r * r) continue;
        if (d2 > 1e-9) {
          const d = Math.sqrt(d2);
          ent.x = nx + dx / d * r; ent.y = ny + dy / d * r;
        } else { // center inside the rect: push out through the nearest side
          const l = ent.x - o.x, rt = o.x + o.w - ent.x, t = ent.y - o.y, b = o.y + o.h - ent.y;
          const m = Math.min(l, rt, t, b);
          if (m === l) ent.x = o.x - r;
          else if (m === rt) ent.x = o.x + o.w + r;
          else if (m === t) ent.y = o.y - r;
          else ent.y = o.y + o.h + r;
        }
        moved = true;
      }
    }
    return moved;
  }

  // world: {w,h} or {bounds:{x,y,w,h}}. Returns true if the entity was moved.
  function clampToWorld(ent, world) {
    if (!ent || !world) return false;
    const b = world.bounds || { x: 0, y: 0, w: world.w, h: world.h };
    if (!(b.w > 0) || !(b.h > 0)) return false;
    const r = ent.r || 0;
    const ox = ent.x, oy = ent.y;
    ent.x = Math.max(b.x + r, Math.min(ent.x, b.x + b.w - r));
    ent.y = Math.max(b.y + r, Math.min(ent.y, b.y + b.h - r));
    return ent.x !== ox || ent.y !== oy;
  }

  // Segment (x1,y1)-(x2,y2), thickened by r, versus solid obstacles. Returns boolean.
  function segmentHitsObstacle(x1, y1, x2, y2, obstacles, r) {
    r = r || 0;
    if (!obstacles) return false;
    const sx = x2 - x1, sy = y2 - y1;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (!isSolid(o)) continue;
      if (o.type === 'circle') {
        const l2 = sx * sx + sy * sy;
        let t = l2 > 0 ? ((o.x - x1) * sx + (o.y - y1) * sy) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        if (Math.hypot(x1 + sx * t - o.x, y1 + sy * t - o.y) <= o.r + r) return true;
      } else {
        // slab test against the rect expanded by r
        const minX = o.x - r, maxX = o.x + o.w + r, minY = o.y - r, maxY = o.y + o.h + r;
        let t0 = 0, t1 = 1, ok = true;
        const p = [-sx, sx, -sy, sy];
        const q = [x1 - minX, maxX - x1, y1 - minY, maxY - y1];
        for (let k = 0; k < 4; k++) {
          if (p[k] === 0) { if (q[k] < 0) { ok = false; break; } }
          else {
            const t = q[k] / p[k];
            if (p[k] < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; }
            else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; }
          }
        }
        if (ok) return true;
      }
    }
    return false;
  }

  AT.Collision = {
    dist, angleTo, normalizeAngle, circleCircle, circleRect, pointInCone,
    circleInRectOriented, resolveCircleVsObstacles, clampToWorld, segmentHitsObstacle
  };
})();
