// Aether's Trial — HUD and menu screens. Only draws through the ctx it is given.
(function () {
  const AT = globalThis.AT;
  const H = { buttons: [], toasts: [], banner: null, keys: { skill: 'E', burst: 'Q', interact: 'F', potion: null },
              _bound: false, _time: 0, _trail: 1 };
  const SERIF = 'Georgia, "Palatino Linotype", "Book Antiqua", serif';
  const C = { gold: '#e8c26a', gold2: '#b8873a', goldDk: '#7a5420', turq: '#5fd0c4', turqDk: '#2f9e94',
              emerald: '#4cae86', emeraldDk: '#2f7d60', parch: '#f7ebcb', parch2: '#ecd7a3', ink: '#4a3322',
              coral: '#f2827f', coralLt: '#f7b0a0', peach: '#f7c99a', sky: '#bfe8e3' };

  function W() { return AT.CFG.VIEW_W; }
  function Ht() { return AT.CFG.VIEW_H; }
  function nowOf(game) { return game && typeof game.time === 'number' ? game.time : Date.now() / 1000; }

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(ctx, s, x, y, size, color, align, weight, shadow) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + SERIF;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    if (shadow !== false) { ctx.fillStyle = 'rgba(60,35,15,0.45)'; ctx.fillText(s, x + 1, y + 1.5); }
    ctx.fillStyle = color || C.parch;
    ctx.fillText(s, x, y);
  }

  function diamond(ctx, x, y, r, fill) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }

  // Ornate parchment panel with a double gold border and corner studs.
  function panel(ctx, x, y, w, h, o) {
    o = o || {};
    const r = o.r != null ? o.r : 14;
    ctx.save();
    ctx.shadowColor = 'rgba(70,40,10,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
    rr(ctx, x, y, w, h, r);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, o.top || '#fff6dc'); g.addColorStop(1, o.bottom || C.parch2);
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    ctx.save();
    rr(ctx, x, y, w, h, r); ctx.lineWidth = 3; ctx.strokeStyle = C.gold2; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, Math.max(2, r - 4)); ctx.lineWidth = 1.2; ctx.strokeStyle = C.gold; ctx.stroke();
    if (o.studs !== false) {
      const d = 8;
      diamond(ctx, x + d, y + d, 3.5, C.turq); diamond(ctx, x + w - d, y + d, 3.5, C.turq);
      diamond(ctx, x + d, y + h - d, 3.5, C.turq); diamond(ctx, x + w - d, y + h - d, 3.5, C.turq);
    }
    ctx.restore();
  }

  function bar(ctx, x, y, w, h, frac, c1, c2, trail) {
    frac = Math.max(0, Math.min(1, frac));
    ctx.save();
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(70,45,25,0.55)'; ctx.fill();
    ctx.clip();
    if (trail != null && trail > frac) { ctx.fillStyle = 'rgba(255,240,200,0.75)'; ctx.fillRect(x, y, w * trail, h); }
    if (frac > 0) {
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fillRect(x, y, w * frac, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y + 1, w * frac, Math.max(1, h * 0.25));
    }
    ctx.restore();
    ctx.save();
    rr(ctx, x, y, w, h, h / 2); ctx.lineWidth = 1.6; ctx.strokeStyle = C.gold; ctx.stroke();
    ctx.restore();
  }

  function iconCoin(ctx, x, y, r) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = C.gold; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.goldDk; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.2832); ctx.strokeStyle = C.gold2; ctx.stroke();
  }
  function iconGem(ctx, x, y, r) {
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x - r * 0.55, y - r); ctx.lineTo(x + r * 0.55, y - r);
    ctx.lineTo(x + r, y - r * 0.2); ctx.lineTo(x, y + r); ctx.closePath();
    ctx.fillStyle = C.turq; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = C.turqDk; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r, y - r * 0.2); ctx.lineTo(x + r, y - r * 0.2); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
  }
  function iconPotion(ctx, x, y, r) {
    ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 0.78, 0, 6.2832); ctx.fill();
    ctx.lineWidth = 1.4; ctx.strokeStyle = C.goldDk; ctx.stroke();
    ctx.fillStyle = '#fff3d6'; ctx.fillRect(x - r * 0.28, y - r * 0.95, r * 0.56, r * 0.7);
    ctx.strokeRect(x - r * 0.28, y - r * 0.95, r * 0.56, r * 0.7);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(x - r * 0.28, y, r * 0.18, 0, 6.2832); ctx.fill();
  }

  function pill(ctx, x, y, w, icon, label) {
    rr(ctx, x, y, w, 24, 12);
    ctx.fillStyle = 'rgba(74,51,34,0.62)'; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.gold; ctx.stroke();
    icon(ctx, x + 14, y + 12, 7.5);
    text(ctx, label, x + 28, y + 12.5, 14, C.parch, 'left');
  }

  // ---- events -> toasts / banner ----
  function pushToast(kind, label, amount, color, now) {
    const last = H.toasts[H.toasts.length - 1];
    if (last && last.kind === kind && now - last.t0 < 0.7 && kind !== 'text') {
      last.amount += amount; last.t0 = now; last.text = label(last.amount); return;
    }
    H.toasts.push({ kind: kind, amount: amount, text: label(amount), color: color, t0: now, life: 2.4 });
    if (H.toasts.length > 5) H.toasts.shift();
  }

  H.bind = function () {
    if (H._bound) return;
    H._bound = true;
    const ev = AT.events;
    ev.on('pickup', function (p) {
      if (!p) return;
      if (p.kind === 'coin') pushToast('coin', function (n) { return '+' + n + ' Mora'; }, p.amount, C.gold, H._time);
      else if (p.kind === 'gem') pushToast('gem', function (n) { return '+' + n + ' Aether Gem'; }, p.amount, C.turq, H._time);
      else if (p.kind === 'potion') pushToast('potion', function (n) { return '+' + n + ' Potion'; }, p.amount, C.coralLt, H._time);
    });
    ev.on('chestOpened', function (p) {
      const r = (p && p.rewards) || {}; const parts = [];
      if (r.coins) parts.push(r.coins + ' Mora');
      if (r.gems) parts.push(r.gems + ' Gems');
      if (r.potions) parts.push(r.potions + ' Potion' + (r.potions > 1 ? 's' : ''));
      H.toasts.push({ kind: 'text', amount: 0, text: 'Chest: ' + (parts.join(', ') || 'empty'), color: C.gold, t0: H._time, life: 3.2 });
      if (H.toasts.length > 5) H.toasts.shift();
    });
    ev.on('potionUsed', function (p) {
      H.toasts.push({ kind: 'text', amount: 0, text: 'Restored ' + Math.round((p && p.healed) || 0) + ' HP', color: C.emerald, t0: H._time, life: 1.8 });
      if (H.toasts.length > 5) H.toasts.shift();
    });
    ev.on('levelUp', function (p) { H.banner = { level: p ? p.level : 0, t0: H._time, life: 3 }; });
  };

  H.reset = function () { H.toasts.length = 0; H.banner = null; H._trail = 1; };

  function drawToasts(ctx, now) {
    let y = 168;
    for (let i = H.toasts.length - 1; i >= 0; i--) {
      const t = H.toasts[i], age = now - t.t0;
      if (age > t.life || age < 0) { if (age > t.life) H.toasts.splice(i, 1); continue; }
    }
    for (const t of H.toasts) {
      const age = now - t.t0;
      const a = Math.min(1, age / 0.18, (t.life - age) / 0.5);
      const slide = (1 - Math.min(1, age / 0.2)) * 24;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.font = 'bold 14px ' + SERIF;
      const w = ctx.measureText(t.text).width + 30;
      const x = W() - 16 - w + slide;
      rr(ctx, x, y, w, 26, 13);
      ctx.fillStyle = 'rgba(74,51,34,0.75)'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = t.color; ctx.stroke();
      diamond(ctx, x + 12, y + 13, 3.5, t.color);
      text(ctx, t.text, x + 22, y + 13.5, 14, C.parch, 'left');
      ctx.restore();
      y += 32;
    }
  }

  function drawBanner(ctx, now) {
    const b = H.banner;
    if (!b) return;
    const age = now - b.t0;
    if (age > b.life || age < 0) { if (age > b.life) H.banner = null; return; }
    const a = Math.min(1, age / 0.3, (b.life - age) / 0.6);
    const grow = 0.85 + 0.15 * Math.min(1, age / 0.35);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(W() / 2, 150); ctx.scale(grow, grow);
    const w = 300, h = 66;
    const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    g.addColorStop(0, '#fff2c4'); g.addColorStop(1, '#f1c970');
    ctx.shadowColor = 'rgba(255,214,120,0.9)'; ctx.shadowBlur = 24;
    rr(ctx, -w / 2, -h / 2, w, h, 20); ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 3; ctx.strokeStyle = C.gold2; ctx.stroke();
    rr(ctx, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 15); ctx.lineWidth = 1.2; ctx.strokeStyle = C.turqDk; ctx.stroke();
    text(ctx, 'LEVEL UP', 0, -12, 15, C.turqDk, 'center', 'bold', false);
    text(ctx, 'Level ' + b.level, 0, 12, 24, C.ink, 'center', 'bold', false);
    diamond(ctx, -w / 2 + 22, 0, 6, C.turq); diamond(ctx, w / 2 - 22, 0, 6, C.turq);
    ctx.restore();
  }

  function remaining(level) {
    let n = 0;
    for (const e of level.enemies || []) if (e && !e.dead && e.kind !== 'boss') n++;
    if (level.boss && !level.boss.dead) n++;
    return n;
  }

  function ring(ctx, cx, cy, r, frac, ready, key, label, time, color, glowColor) {
    ctx.save();
    if (ready) {
      const pulse = 0.55 + 0.45 * Math.sin(time * 5);
      ctx.shadowColor = glowColor; ctx.shadowBlur = 10 + 16 * pulse;
    }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832);
    ctx.fillStyle = ready ? '#fff2c8' : 'rgba(74,51,34,0.78)'; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(40,25,12,0.55)'; ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, 6.2832); ctx.stroke();
    if (frac > 0) { // progress arc clockwise from top
      ctx.lineWidth = 4; ctx.strokeStyle = ready ? glowColor : color; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac)); ctx.stroke();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, 6.2832); ctx.stroke();
    ctx.restore();
    text(ctx, key, cx, cy - 3, 20, ready ? C.ink : C.parch, 'center', 'bold', !ready);
    text(ctx, label, cx, cy + r + 11, 11, C.parch, 'center', 'bold');
  }

  function toScreen(game, wx, wy) {
    const cam = game.cam;
    if (cam && typeof cam.x === 'number' && typeof cam.y === 'number') {
      const z = cam.zoom || 1;
      return { x: (wx - cam.x) * z, y: (wy - cam.y) * z };
    }
    const p = game.player;
    return { x: W() / 2 + (wx - p.x), y: Ht() / 2 + (wy - p.y) };
  }

  H.draw = function (ctx, game) {
    if (!ctx || !game || !game.player) return;
    H.bind();
    const now = nowOf(game);
    const dtSince = Math.max(0, Math.min(0.1, now - H._time));
    H._time = now;
    const p = game.player, lv = game.level;
    const S = AT.Progression && AT.Progression.state;
    const level = (S && S.level) || p.level || 1;
    ctx.save();
    ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.textBaseline = 'middle';

    // HP trail
    const hpF = p.maxHp > 0 ? Math.max(0, p.hp) / p.maxHp : 0;
    H._trail = hpF >= H._trail ? hpF : Math.max(hpF, H._trail - dtSince * 0.4);

    // level badge + bars
    panel(ctx, 12, 10, 318, 78, { r: 22, studs: false });
    ctx.beginPath(); ctx.arc(48, 49, 29, 0, 6.2832);
    const bg = ctx.createRadialGradient(44, 40, 4, 48, 49, 30);
    bg.addColorStop(0, '#8ae6da'); bg.addColorStop(1, C.turqDk);
    ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = C.gold2; ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff2c4'; ctx.beginPath(); ctx.arc(48, 49, 24.5, 0, 6.2832); ctx.stroke();
    text(ctx, 'LV', 48, 38, 10, '#e9fffb', 'center', 'bold');
    text(ctx, String(level), 48, 54, 22, '#ffffff', 'center', 'bold');

    const low = hpF < 0.3;
    bar(ctx, 90, 20, 226, 20, hpF, low ? '#f7a08a' : C.coralLt, low ? '#e0605e' : C.coral, H._trail);
    text(ctx, Math.ceil(Math.max(0, p.hp)) + ' / ' + Math.round(p.maxHp), 203, 30.5, 12, '#fffaf0', 'center');
    const en = p.maxEnergy > 0 ? p.energy / p.maxEnergy : 0;
    bar(ctx, 90, 46, 190, 11, en, '#9cf0e4', C.turqDk);
    const need = S ? AT.Progression.xpToNext(S.level) : 1;
    const xpF = isFinite(need) && need > 0 ? S.xp / need : 1;
    bar(ctx, 90, 64, 190, 9, xpF, '#bdeccb', C.emeraldDk);
    text(ctx, 'EN', 296, 51.5, 10, C.goldDk, 'center', 'bold', false);
    text(ctx, 'XP', 296, 69, 10, C.goldDk, 'center', 'bold', false);

    // resources
    const coins = S ? S.coins : p.coins || 0, gems = S ? S.gems : p.gems || 0, pots = S ? S.potions : p.potions || 0;
    pill(ctx, 14, 96, 82, iconCoin, String(coins));
    pill(ctx, 102, 96, 72, iconGem, String(gems));
    pill(ctx, 180, 96, H.keys.potion ? 92 : 72, iconPotion, pots + (H.keys.potion ? '  [' + H.keys.potion + ']' : ''));

    // minimap
    if (lv && AT.Minimap) AT.Minimap.draw(ctx, W() - 14 - 120, 14, 120, game);

    // objective
    if (lv) {
      const left = remaining(lv);
      const line1 = lv.name || '';
      const obj = lv.objective || '';
      ctx.font = 'bold 13px ' + SERIF;
      const w = Math.max(250, Math.min(330, ctx.measureText(obj).width + 40));
      const x = (W() - w) / 2;
      panel(ctx, x, 10, w, 48, { r: 16 });
      text(ctx, obj, W() / 2, 26, 13, C.ink, 'center', 'bold', false);
      text(ctx, left > 0 ? 'Foes remaining: ' + left : 'Area cleared', W() / 2, 44, 12, left > 0 ? C.emeraldDk : C.turqDk, 'center', 'bold', false);
      void line1;
      // boss bar
      const b = lv.boss;
      if (b && b.active && !b.dead && b.hp > 0) {
        const bw = 420, bx = (W() - bw) / 2, by = 74;
        const f = Math.max(0, b.hp / b.maxHp);
        panel(ctx, bx - 14, by - 14, bw + 28, 48, { r: 16, top: '#fff1d0', bottom: '#f0cf93' });
        text(ctx, b.name || 'Boss', W() / 2, by - 1, 15, C.ink, 'center', 'bold', false);
        bar(ctx, bx, by + 11, bw, 14, f, '#f6a08a', '#cf4a4a');
      }
    }

    // skill ring E and burst ring Q
    const cy = Ht() - 52, cx = W() / 2;
    const skillCdMax = AT.CFG.SKILL.cooldown;
    const skillF = skillCdMax > 0 ? 1 - Math.max(0, p.skillCd || 0) / skillCdMax : 1;
    const skillReady = !(p.skillCd > 0);
    ring(ctx, cx - 40, cy, 26, skillF, skillReady, H.keys.skill, 'Skill', now, C.turq, C.turq);
    if (!skillReady) text(ctx, (Math.ceil(p.skillCd * 10) / 10).toFixed(1), cx - 40, cy + 9, 12, '#fff', 'center', 'bold');
    const bc = AT.CFG.BURST.cost;
    const burstReady = (p.energy || 0) >= bc;
    ring(ctx, cx + 40, cy, 26, Math.min(1, (p.energy || 0) / bc), burstReady, H.keys.burst, 'Burst', now, C.coral, '#ffc46b');

    // chest prompt
    if (lv && lv.chests && AT.Inventory) {
      const c = AT.Inventory.nearestChest(p, lv.chests, AT.Inventory.interactRange());
      if (c) {
        const s = toScreen(game, c.x, c.y - (c.r || 22) - 26);
        const bob = Math.sin(now * 4) * 2;
        const px = Math.max(60, Math.min(W() - 60, s.x)), py = Math.max(30, Math.min(Ht() - 30, s.y + bob));
        rr(ctx, px - 46, py - 14, 92, 28, 14);
        ctx.fillStyle = 'rgba(74,51,34,0.85)'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = C.gold; ctx.stroke();
        rr(ctx, px - 38, py - 9, 18, 18, 5); ctx.fillStyle = C.gold; ctx.fill();
        text(ctx, H.keys.interact, px - 29, py + 0.5, 13, C.ink, 'center', 'bold', false);
        text(ctx, 'Open', px + 2, py + 0.5, 14, C.parch, 'left');
      }
    }

    drawToasts(ctx, now);
    drawBanner(ctx, now);
    ctx.restore();
  };

  // ---- screens ----
  function addButton(ctx, id, label, x, y, w, h, game, primary) {
    H.buttons.push({ id: id, x: x, y: y, w: w, h: h });
    const m = game && game.mouse;
    const hover = m && m.x >= x && m.x <= x + w && m.y >= y && m.y <= y + h;
    ctx.save();
    ctx.shadowColor = hover ? 'rgba(255,220,130,0.9)' : 'rgba(70,40,10,0.35)'; ctx.shadowBlur = hover ? 20 : 8; ctx.shadowOffsetY = 3;
    rr(ctx, x, y, w, h, h / 2);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (primary) { g.addColorStop(0, '#fff0b8'); g.addColorStop(1, '#eab654'); }
    else { g.addColorStop(0, '#d9f4ee'); g.addColorStop(1, '#8fd6cb'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.gold2; ctx.stroke();
    rr(ctx, x + 4, y + 4, w - 8, h - 8, (h - 8) / 2); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke();
    ctx.restore();
    text(ctx, label, x + w / 2, y + h / 2 + 1, 19, C.ink, 'center', 'bold', false);
  }

  function dim(ctx, color) { ctx.fillStyle = color; ctx.fillRect(0, 0, W(), Ht()); }

  function sparkles(ctx, t, n, color) {
    for (let i = 0; i < n; i++) {
      const s = i * 91.7;
      const x = ((Math.sin(s) * 0.5 + 0.5) * W() + Math.sin(t * 0.4 + s) * 12 + W()) % W();
      const y = ((Math.cos(s * 1.3) * 0.5 + 0.5) * Ht() - (t * (6 + (i % 5) * 3)) % Ht() + Ht()) % Ht();
      const a = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.5 + s));
      ctx.globalAlpha = a; diamond(ctx, x, y, 2 + (i % 3), color);
    }
    ctx.globalAlpha = 1;
  }

  function title(ctx, s, y, size) {
    ctx.save();
    ctx.shadowColor = 'rgba(255,214,120,0.8)'; ctx.shadowBlur = 22;
    text(ctx, s, W() / 2, y, size, '#fff3c4', 'center', 'bold', false);
    ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = C.goldDk;
    ctx.font = 'bold ' + size + 'px ' + SERIF; ctx.textAlign = 'center';
    ctx.strokeText(s, W() / 2, y);
  }

  function statRow(ctx, label, value, x, y, w) {
    text(ctx, label, x, y, 16, C.ink, 'left', 'normal', false);
    text(ctx, String(value), x + w, y, 16, C.goldDk, 'right', 'bold', false);
    ctx.strokeStyle = 'rgba(184,135,58,0.4)'; ctx.lineWidth = 1; ctx.setLineDash && ctx.setLineDash([2, 4]);
    ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + w, y + 12); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]);
  }

  H.drawScreen = function (ctx, game) {
    H.buttons = [];
    if (!ctx || !game) return H.buttons;
    const st = game.state, t = nowOf(game), cx = W() / 2;
    ctx.save();
    ctx.globalAlpha = 1; ctx.shadowColor = 'transparent'; ctx.textBaseline = 'middle';
    const S = AT.Progression && AT.Progression.state;
    if (st === 'title') {
      const g = ctx.createLinearGradient(0, 0, 0, Ht());
      g.addColorStop(0, '#9fdcd6'); g.addColorStop(0.55, '#f6e6b8'); g.addColorStop(1, '#f2b88c');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W(), Ht());
      ctx.fillStyle = 'rgba(76,174,134,0.55)';
      ctx.beginPath(); ctx.moveTo(0, Ht()); ctx.lineTo(0, 400);
      for (let x = 0; x <= W(); x += 40) ctx.lineTo(x, 400 + Math.sin(x * 0.011 + 1) * 24 + Math.sin(x * 0.027) * 10);
      ctx.lineTo(W(), Ht()); ctx.closePath(); ctx.fill();
      sparkles(ctx, t, 40, '#fffbe6');
      title(ctx, "Aether's Trial", 190, 68);
      text(ctx, 'A journey through wind and ruin', cx, 245, 18, C.ink, 'center', 'normal', false);
      addButton(ctx, 'start', 'Begin Journey', cx - 120, 310, 240, 54, game, true);
      text(ctx, 'Click or press Enter', cx, 392, 14, C.ink, 'center', 'normal', false);
    } else if (st === 'paused') {
      dim(ctx, 'rgba(40,28,20,0.55)');
      panel(ctx, cx - 190, 120, 380, 300);
      title(ctx, 'Paused', 175, 38);
      addButton(ctx, 'resume', 'Resume', cx - 110, 225, 220, 50, game, true);
      addButton(ctx, 'restart', 'Restart Level', cx - 110, 290, 220, 50, game, false);
      text(ctx, 'Esc to resume', cx, 375, 13, C.ink, 'center', 'normal', false);
    } else if (st === 'levelComplete') {
      dim(ctx, 'rgba(30,60,55,0.55)');
      panel(ctx, cx - 230, 70, 460, 400);
      title(ctx, 'Level Complete', 120, 38);
      const lvl = game.level;
      text(ctx, lvl && lvl.name ? lvl.name : '', cx, 158, 16, C.emeraldDk, 'center', 'bold', false);
      const gains = AT.Progression && AT.Progression.levelGains ? AT.Progression.levelGains() : { kills: 0, xp: 0, coins: 0, gems: 0 };
      const x0 = cx - 170, w = 340;
      statRow(ctx, 'Foes defeated', gains.kills, x0, 205, w);
      statRow(ctx, 'Experience gained', gains.xp, x0, 238, w);
      statRow(ctx, 'Mora collected', gains.coins, x0, 271, w);
      statRow(ctx, 'Aether Gems', gains.gems, x0, 304, w);
      statRow(ctx, 'Adventurer level', S ? S.level : 1, x0, 337, w);
      statRow(ctx, 'Potions', S ? S.potions : 0, x0, 370, w);
      addButton(ctx, 'continue', 'Continue', cx - 100, 405, 200, 46, game, true);
    } else if (st === 'gameOver') {
      dim(ctx, 'rgba(90,30,40,0.62)');
      panel(ctx, cx - 190, 140, 380, 260, { top: '#fbe3d2', bottom: '#eebf9d' });
      title(ctx, 'Defeated', 195, 40);
      text(ctx, 'The wind still carries you. Rise again.', cx, 245, 15, C.ink, 'center', 'normal', false);
      addButton(ctx, 'retry', 'Retry', cx - 100, 290, 200, 52, game, true);
      text(ctx, 'R or Enter to retry', cx, 366, 13, C.ink, 'center', 'normal', false);
    } else if (st === 'victory') {
      const g = ctx.createLinearGradient(0, 0, 0, Ht());
      g.addColorStop(0, '#fff0b8'); g.addColorStop(0.5, '#bfe8e3'); g.addColorStop(1, '#8fd6b4');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W(), Ht());
      sparkles(ctx, t, 60, '#ffffff');
      panel(ctx, cx - 240, 70, 480, 400);
      title(ctx, 'Victory', 125, 54);
      text(ctx, 'The Mitachurl and the Storm Drake have fallen.', cx, 175, 15, C.ink, 'center', 'normal', false);
      const x0 = cx - 170, w = 340;
      statRow(ctx, 'Adventurer level', S ? S.level : 1, x0, 225, w);
      statRow(ctx, 'Mora', S ? S.coins : 0, x0, 258, w);
      statRow(ctx, 'Aether Gems', S ? S.gems : 0, x0, 291, w);
      statRow(ctx, 'Potions kept', S ? S.potions : 0, x0, 324, w);
      addButton(ctx, 'title', 'Return to Title', cx - 110, 385, 220, 50, game, true);
    }
    ctx.restore();
    return H.buttons;
  };

  AT.HUD = H;
})();
