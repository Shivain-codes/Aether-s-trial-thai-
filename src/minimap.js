// Aether's Trial — minimap. collectBlips is pure; draw only uses the passed ctx.
(function () {
  const AT = globalThis.AT;
  const M = {};

  function worldSize(game) {
    const w = game && game.level && game.level.world;
    if (!w) return { x: 0, y: 0, w: 1, h: 1 };
    const b = w.bounds;
    if (b && b.w > 0 && b.h > 0) return { x: b.x || 0, y: b.y || 0, w: b.w, h: b.h };
    return { x: 0, y: 0, w: w.w || (b && b.width) || 1, h: w.h || (b && b.height) || 1 };
  }

  M.collectBlips = function (game) {
    const out = [];
    if (!game) return out;
    const p = game.player;
    if (p) out.push({ type: 'player', x: p.x, y: p.y, facing: p.facing || 0 });
    const lv = game.level;
    if (!lv) return out;
    for (const e of lv.enemies || []) {
      if (e && !e.dead && e.kind !== 'boss' && !(e.hp <= 0)) out.push({ type: 'enemy', x: e.x, y: e.y });
    }
    const b = lv.boss;
    if (b && !b.dead && !(b.hp <= 0)) out.push({ type: 'boss', x: b.x, y: b.y });
    for (const c of lv.chests || []) if (c && !c.opened) out.push({ type: 'chest', x: c.x, y: c.y });
    return out;
  };

  // Layout of the world inside a square map of `size`, aspect preserved and centred.
  M.layout = function (game, x, y, size) {
    const ws = worldSize(game);
    const s = size / Math.max(ws.w, ws.h);
    const w = ws.w * s, h = ws.h * s;
    return { ws: ws, scale: s, ox: x + (size - w) / 2, oy: y + (size - h) / 2, w: w, h: h };
  };

  M.worldToMap = function (wx, wy, game, x, y, size) {
    const l = M.layout(game, x, y, size);
    return { x: l.ox + (wx - l.ws.x) * l.scale, y: l.oy + (wy - l.ws.y) * l.scale };
  };

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  M.draw = function (ctx, x, y, size, game) {
    if (!ctx || !game || !game.level) return;
    const l = M.layout(game, x, y, size);
    ctx.save();
    // frame
    ctx.shadowColor = 'rgba(60,40,20,0.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
    rr(ctx, x - 5, y - 5, size + 10, size + 10, 14);
    ctx.fillStyle = '#c99a4a'; ctx.fill();
    ctx.shadowColor = 'transparent';
    rr(ctx, x - 3, y - 3, size + 6, size + 6, 12);
    ctx.fillStyle = '#f7ebcb'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#e8c26a'; ctx.stroke();
    // parchment interior
    rr(ctx, x, y, size, size, 9);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#efdcb0'; ctx.fillRect(x, y, size, size);
    ctx.fillStyle = '#cfe3b4'; ctx.fillRect(l.ox, l.oy, l.w, l.h);
    ctx.strokeStyle = 'rgba(150,110,50,0.55)'; ctx.lineWidth = 1;
    ctx.strokeRect(l.ox + 0.5, l.oy + 0.5, l.w - 1, l.h - 1);
    const obs = (game.level.world && game.level.world.obstacles) || [];
    for (let i = 0; i < obs.length && i < 200; i++) {
      const o = obs[i];
      if (!o || o.type !== 'rect') continue;
      const a = M.worldToMap(o.x, o.y, game, x, y, size);
      ctx.fillStyle = o.visual === 'water' ? 'rgba(95,208,196,0.7)' : (o.visual === 'void' ? 'rgba(90,70,110,0.5)' : 'rgba(140,110,80,0.55)');
      ctx.fillRect(a.x, a.y, Math.max(1, o.w * l.scale), Math.max(1, o.h * l.scale));
    }
    // camera viewport
    const cam = game.cam;
    if (cam && typeof cam.x === 'number' && typeof cam.y === 'number') {
      const a = M.worldToMap(cam.x, cam.y, game, x, y, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)';
      ctx.strokeRect(a.x, a.y, AT.CFG.VIEW_W * l.scale, AT.CFG.VIEW_H * l.scale);
    }
    const blips = M.collectBlips(game);
    for (const b of blips) {
      const m = M.worldToMap(b.x, b.y, game, x, y, size);
      if (b.type === 'enemy') {
        ctx.fillStyle = '#e8706a'; ctx.beginPath(); ctx.arc(m.x, m.y, 2.4, 0, 6.2832); ctx.fill();
      } else if (b.type === 'boss') {
        ctx.fillStyle = '#c7413f'; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(m.x, m.y, 5, 0, 6.2832); ctx.fill(); ctx.stroke();
      } else if (b.type === 'chest') {
        ctx.fillStyle = '#f2c24e'; ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 1;
        ctx.fillRect(m.x - 3, m.y - 2.5, 6, 5); ctx.strokeRect(m.x - 3, m.y - 2.5, 6, 5);
      }
    }
    for (const b of blips) {
      if (b.type !== 'player') continue;
      const m = M.worldToMap(b.x, b.y, game, x, y, size);
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(b.facing || 0);
      ctx.fillStyle = '#35c2b5'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, 4); ctx.lineTo(-2, 0); ctx.lineTo(-4, -4); ctx.closePath();
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.restore();
    rr(ctx, x, y, size, size, 9);
    ctx.strokeStyle = '#b8873a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  };

  AT.Minimap = M;
})();
