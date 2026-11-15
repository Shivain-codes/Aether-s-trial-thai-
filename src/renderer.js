// Aether's Trial — world renderer: backgrounds (cached offscreen), obstacles/decor, y-sorted entities, slashes,
// telegraphs, projectiles, floating numbers, lighting. Owner: visuals.
// Camera convention (camera.js): cam.x / cam.y = top-left of the view in world space.
// Telegraph convention (enemies.js): tg.t = seconds elapsed, tg.dur = total.
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;
  const OUT = '#1b1430';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hash(a, b) { const s = Math.sin((a || 0) * 127.1 + (b || 0) * 311.7) * 43758.5453; return s - Math.floor(s); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function mkCanvas(w, h) {
    if (typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c;
  }
  function ellipse(g, x, y, rx, ry, fill, stroke, lw) {
    g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU);
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.stroke(); }
  }
  function poly(g, pts, fill, stroke, lw) {
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    if (fill) { g.fillStyle = fill; g.fill(); }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 1.5; g.lineJoin = 'round'; g.stroke(); }
  }
  const ELC = { pyro: ['#fff0c0', '#ff8a3a'], hydro: ['#e8fbff', '#4ab8ff'], electro: ['#f6e8ff', '#b27cff'], anemo: ['#f0fff8', '#6af0c0'], cryo: ['#ffffff', '#9fe0ff'], geo: ['#fff4c8', '#f0b840'], physical: ['#ffffff', '#bfe6ff'], none: ['#ffffff', '#bfe6ff'] };

  const FLOWER_COLS = ['#ffffff', '#ffd84a', '#ff7aa8', '#8ec8ff', '#ffa84a', '#d8a8ff'];

  // ---------- world data helpers ----------
  function waterRects(world) {
    const out = [];
    const w = world.water || [];
    for (let i = 0; i < w.length; i++) if (w[i] && w[i].w > 0) out.push(w[i]);
    const ob = world.obstacles || [];
    for (let i = 0; i < ob.length; i++) if (ob[i].visual === 'water' && ob[i].type !== 'circle') out.push(ob[i]);
    return out;
  }
  function blockedBy(world, x, y, r) {
    const ob = world.obstacles || [];
    const H = AT.World && AT.World.hitsObstacle;
    for (let i = 0; i < ob.length; i++) {
      const o = ob[i];
      if (H) { if (H(x, y, r, o)) return true; }
      else if (o.type === 'circle' ? (Math.hypot(x - o.x, y - o.y) < o.r + r) : (x > o.x - r && x < o.x + o.w + r && y > o.y - r && y < o.y + o.h + r)) return true;
    }
    const wr = waterRects(world);
    for (let i = 0; i < wr.length; i++) { const q = wr[i]; if (x > q.x - r && x < q.x + q.w + r && y > q.y - r && y < q.y + q.h + r) return true; }
    return false;
  }

  // ---------- background builders ----------
  function buildFields(world, pad) {
    const W = world.w, H = world.h, rng = AT.rng(1000 + (world.index || 0) * 77 + 5);
    const cv = mkCanvas(W + pad * 2, H + pad * 2); if (!cv) return null;
    const g = cv.getContext('2d');
    g.translate(pad, pad);
    const gr = g.createLinearGradient(0, -pad, 0, H + pad);
    gr.addColorStop(0, '#93e06c'); gr.addColorStop(0.5, '#7ad65d'); gr.addColorStop(1, '#63c452');
    g.fillStyle = gr; g.fillRect(-pad, -pad, W + pad * 2, H + pad * 2);
    // cel-shaded grass patches (hard edged, two-tone)
    for (let i = 0; i < Math.round(W * H / 14000); i++) {
      const x = rng() * W, y = rng() * H, rx = 50 + rng() * 130, ry = rx * (0.4 + rng() * 0.3), dark = rng() < 0.5;
      ellipse(g, x, y, rx, ry, dark ? 'rgba(70,168,76,0.38)' : 'rgba(190,248,130,0.34)');
      ellipse(g, x - 6, y - 7, rx * 0.86, ry * 0.8, dark ? 'rgba(96,190,84,0.35)' : 'rgba(214,255,160,0.3)');
    }
    // winding dirt trail
    g.strokeStyle = 'rgba(214,190,130,0.55)'; g.lineWidth = 46; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); let px = 120, py = H - 120; g.moveTo(px, py);
    for (let i = 1; i <= 9; i++) { px = 120 + (W - 240) * i / 9 + Math.sin(i * 1.3) * 120; py = H - 120 - (H - 240) * i / 9 + Math.cos(i * 1.7) * 90; g.lineTo(px, py); }
    g.stroke(); g.strokeStyle = 'rgba(236,216,160,0.5)'; g.lineWidth = 28; g.stroke();
    // water shores
    const wr = waterRects(world);
    for (const q of wr) {
      g.fillStyle = 'rgba(232,214,150,0.9)'; roundRect(g, q.x - 12, q.y - 12, q.w + 24, q.h + 24, 26); g.fill();
      g.fillStyle = 'rgba(190,170,110,0.6)'; roundRect(g, q.x - 6, q.y - 6, q.w + 12, q.h + 12, 22); g.fill();
    }
    // static tufts
    for (let i = 0; i < Math.round(W * H / 1700); i++) {
      const x = rng() * W, y = rng() * H;
      g.strokeStyle = rng() < 0.5 ? 'rgba(52,150,64,0.55)' : 'rgba(168,236,120,0.6)'; g.lineWidth = 1.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x - 4, y - 5); g.moveTo(x, y); g.lineTo(x, y - 7); g.moveTo(x + 3, y); g.lineTo(x + 4.5, y - 5); g.stroke();
    }
    // hedge border
    const bush = (x, y, r) => {
      ellipse(g, x, y + 3, r, r * 0.8, '#1f6a3a', OUT, 1.5);
      ellipse(g, x - 2, y - 2, r * 0.8, r * 0.66, '#2f9a4c');
      ellipse(g, x - r * 0.25, y - r * 0.35, r * 0.4, r * 0.26, '#6ad26c');
    };
    for (let x = -10; x < W + 30; x += 30) { bush(x, -6 + rng() * 8, 22 + rng() * 10); bush(x, H + 4 + rng() * 8, 22 + rng() * 10); }
    for (let y = -10; y < H + 30; y += 30) { bush(-6 + rng() * 8, y, 22 + rng() * 10); bush(W + 4 + rng() * 8, y, 22 + rng() * 10); }
    // sway items
    const sway = [];
    const nF = Math.round(W * H / 4200), nT = Math.round(W * H / 5200);
    for (let i = 0; i < nF; i++) {
      const x = 40 + rng() * (W - 80), y = 40 + rng() * (H - 80);
      if (blockedBy(world, x, y, 8)) continue;
      sway.push({ k: 'f', x, y, ph: rng() * TAU, s: 0.8 + rng() * 0.6, c: FLOWER_COLS[Math.floor(rng() * FLOWER_COLS.length)] });
    }
    for (let i = 0; i < nT; i++) {
      const x = 30 + rng() * (W - 60), y = 30 + rng() * (H - 60);
      if (blockedBy(world, x, y, 6)) continue;
      sway.push({ k: 't', x, y, ph: rng() * TAU, s: 0.8 + rng() * 0.7, c: rng() < 0.5 ? '#3da552' : '#69c85a' });
    }
    return { canvas: cv, pad, sway, runes: [] };
  }

  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }

  function buildRuins(world, pad) {
    const W = world.w, H = world.h, rng = AT.rng(2000 + (world.index || 0) * 91 + 11);
    const cv = mkCanvas(W + pad * 2, H + pad * 2); if (!cv) return null;
    const g = cv.getContext('2d');
    g.translate(pad, pad);
    const T = 64, cols = ['#454c72', '#4b5379', '#3f4668', '#51597f', '#484f75'];
    for (let ty = 0; ty < H; ty += T) for (let tx = 0; tx < W; tx += T) {
      const c = cols[Math.floor(rng() * cols.length)];
      g.fillStyle = c; g.fillRect(tx, ty, T, T);
      g.fillStyle = 'rgba(190,205,255,0.12)'; g.fillRect(tx, ty, T, 2); g.fillRect(tx, ty, 2, T);
      g.fillStyle = 'rgba(8,10,30,0.34)'; g.fillRect(tx, ty + T - 2, T, 2); g.fillRect(tx + T - 2, ty, 2, T);
      if (rng() < 0.12) { g.fillStyle = 'rgba(10,14,40,0.16)'; g.fillRect(tx + 4, ty + 4, T - 8, T - 8); }
    }
    // raised platforms (lighter slabs with bevel)
    for (let i = 0; i < 10; i++) {
      const w = 160 + rng() * 200, h = 120 + rng() * 160, x = rng() * (W - w), y = rng() * (H - h);
      g.fillStyle = 'rgba(140,156,220,0.10)'; g.fillRect(x, y, w, h);
      g.strokeStyle = 'rgba(170,190,255,0.28)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2);
      g.strokeStyle = 'rgba(6,8,26,0.4)'; g.strokeRect(x + 5, y + 5, w - 10, h - 10);
    }
    // dim rune circles (static ring, animated glow added per frame)
    const runes = [];
    for (let i = 0; i < 22; i++) {
      const x = 80 + rng() * (W - 160), y = 80 + rng() * (H - 160), r = 22 + rng() * 26;
      if (blockedBy(world, x, y, r)) continue;
      runes.push({ x, y, r, ph: rng() * TAU, n: 3 + Math.floor(rng() * 4) });
      g.strokeStyle = 'rgba(70,120,210,0.4)'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
      g.beginPath(); g.arc(x, y, r * 0.62, 0, TAU); g.stroke();
    }
    // cracks and moss
    g.lineCap = 'round';
    for (let i = 0; i < Math.round(W * H / 22000); i++) {
      let x = rng() * W, y = rng() * H; g.strokeStyle = 'rgba(6,8,24,0.55)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (rng() - 0.5) * 40; y += (rng() - 0.5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
    for (let i = 0; i < Math.round(W * H / 40000); i++) ellipse(g, rng() * W, rng() * H, 18 + rng() * 30, 8 + rng() * 14, 'rgba(70,150,130,0.18)');
    // crumbling edge: erase jagged strip outside and draw a cliff lip
    const E = 34;
    const jag = (n, len) => { const a = []; for (let i = 0; i <= n; i++) a.push(6 + rng() * E * 0.9 * (i % 2 ? 1 : 0.4)); return a; };
    const lip = '#8fa4ff';
    const edge = (pts, outsidePts) => {
      g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.beginPath(); g.moveTo(outsidePts[0][0], outsidePts[0][1]);
      for (let i = 1; i < outsidePts.length; i++) g.lineTo(outsidePts[i][0], outsidePts[i][1]); g.closePath(); g.fill(); g.restore();
      g.strokeStyle = 'rgba(8,8,24,0.6)'; g.lineWidth = 8; g.lineJoin = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
      g.strokeStyle = lip; g.globalAlpha = 0.55; g.lineWidth = 2; g.stroke(); g.globalAlpha = 1;
    };
    const nx = Math.ceil(W / 40), ny = Math.ceil(H / 40);
    let jt = jag(nx), jb = jag(nx), jl = jag(ny), jr = jag(ny);
    let pts = [], out; for (let i = 0; i <= nx; i++) pts.push([i * W / nx, jt[i]]);
    out = [[-pad, -pad], [W + pad, -pad], [W + pad, 0]].concat(pts.slice().reverse()).concat([[-pad, 0]]);
    edge(pts, out);
    pts = []; for (let i = 0; i <= nx; i++) pts.push([i * W / nx, H - jb[i]]);
    out = [[-pad, H + pad], [W + pad, H + pad], [W + pad, H]].concat(pts.slice().reverse()).concat([[-pad, H]]); edge(pts, out);
    pts = []; for (let i = 0; i <= ny; i++) pts.push([jl[i], i * H / ny]);
    out = [[-pad, -pad], [0, -pad], [0, 0]].concat(pts).concat([[0, H], [-pad, H + pad]]); edge(pts, out);
    pts = []; for (let i = 0; i <= ny; i++) pts.push([W - jr[i], i * H / ny]);
    out = [[W + pad, -pad], [W, -pad], [W, 0]].concat(pts).concat([[W, H], [W + pad, H + pad]]); edge(pts, out);
    // inner shadow near edges
    const shade = (x0, y0, x1, y1, rx, ry, rw, rh) => {
      const gg = g.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, 'rgba(4,6,22,0.55)'); gg.addColorStop(1, 'rgba(4,6,22,0)');
      g.fillStyle = gg; g.fillRect(rx, ry, rw, rh);
    };
    shade(0, 0, 0, 90, 0, 0, W, 90); shade(0, H, 0, H - 90, 0, H - 90, W, 90);
    shade(0, 0, 90, 0, 0, 0, 90, H); shade(W, 0, W - 90, 0, W - 90, 0, 90, H);
    return { canvas: cv, pad, sway: [], runes };
  }

  // ---------- obstacle drawing ----------
  function drawTree(g, o, t) {
    const r = o.r || (o.w ? o.w / 2 : 26), x = o.cx != null ? o.cx : o.x, y = o.cy != null ? o.cy : o.y;
    const sw = Math.sin(t * 1.1 + x * 0.013) * 1.8;
    ellipse(g, x + r * 0.35, y + r * 0.45, r * 1.5, r * 0.55, 'rgba(10,40,20,0.28)');
    poly(g, [[x - r * 0.34, y + r * 0.5], [x - r * 0.22, y - r * 1.2], [x + r * 0.22, y - r * 1.2], [x + r * 0.34, y + r * 0.5]], '#7b4d2a', OUT, 1.6);
    poly(g, [[x + r * 0.06, y + r * 0.5], [x + r * 0.08, y - r * 1.2], [x + r * 0.22, y - r * 1.2], [x + r * 0.34, y + r * 0.5]], '#5a3519', null);
    const cy = y - r * 1.75;
    const cs = [[-0.95, 0.25, 0.85], [0.95, 0.25, 0.82], [0, -0.5, 1.05], [-0.45, 0.55, 0.78], [0.5, 0.55, 0.78]];
    for (const c of cs) ellipse(g, x + c[0] * r + sw * (1 - c[1] * 0.4), cy + c[1] * r, c[2] * r, c[2] * r * 0.92, '#2b8444', OUT, 1.6);
    for (const c of cs) ellipse(g, x + c[0] * r + sw - r * 0.08, cy + c[1] * r - r * 0.1, c[2] * r * 0.82, c[2] * r * 0.74, '#46b556');
    for (const c of cs) ellipse(g, x + c[0] * r + sw - r * 0.26, cy + c[1] * r - r * 0.3, c[2] * r * 0.42, c[2] * r * 0.3, '#86e47c');
    for (let i = 0; i < 4; i++) ellipse(g, x + (hash(x, i) - 0.5) * r * 1.8 + sw, cy + (hash(y, i) - 0.4) * r * 1.2, 2.2, 1.4, '#c4ff9a');
  }

  function drawRock(g, o) {
    const rect = o.type !== 'circle' && o.w != null;
    const cx = rect ? o.x + o.w / 2 : o.x, cy = rect ? o.y + o.h / 2 : o.y;
    const rx = rect ? o.w / 2 : (o.r || 18), ry = rect ? o.h / 2 : (o.r || 18) * 0.85;
    const h = hash(cx, cy);
    ellipse(g, cx + rx * 0.2, cy + ry * 0.85, rx * 1.1, ry * 0.4, 'rgba(10,20,30,0.3)');
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, k = 0.88 + hash(cx + i, cy) * 0.22; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * 1.05 - ry * 0.12]); }
    poly(g, pts, '#79829a', OUT, 2);
    poly(g, [pts[5], pts[6], pts[7], pts[0], [cx + rx * 0.1, cy - ry * 0.1], [cx - rx * 0.35, cy - ry * 0.05]], '#aeb8cf', null);
    poly(g, [pts[1], pts[2], pts[3], [cx - rx * 0.2, cy + ry * 0.35]], '#566078', null);
    g.strokeStyle = 'rgba(20,24,44,0.55)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(cx - rx * 0.3, cy - ry * 0.05); g.lineTo(cx + rx * 0.05, cy + ry * 0.4); g.stroke();
    if (h > 0.4) ellipse(g, cx - rx * 0.3, cy - ry * 0.55, rx * 0.4, ry * 0.2, '#6cc65a', null);
    ellipse(g, cx - rx * 0.4, cy - ry * 0.45, rx * 0.16, ry * 0.08, 'rgba(255,255,255,0.55)');
  }

  function drawPillar(g, o, t) {
    const rect = o.type !== 'circle' && o.w != null;
    const cx = rect ? o.x + o.w / 2 : o.x, by = rect ? o.y + o.h : o.y + (o.r || 20) * 0.6;
    const hw = rect ? Math.min(o.w, 70) / 2 : (o.r || 20);
    const broken = hash(cx, by) < 0.55, H = broken ? 38 + hash(by, cx) * 26 : 92;
    ellipse(g, cx + hw * 0.4, by + 2, hw * 1.5, hw * 0.5, 'rgba(0,0,10,0.4)');
    // base
    g.fillStyle = '#6d78a0'; g.strokeStyle = OUT; g.lineWidth = 1.6; roundRect(g, cx - hw * 1.2, by - 12, hw * 2.4, 14, 3); g.fill(); g.stroke();
    g.fillStyle = '#9aa6cc'; g.fillRect(cx - hw * 1.1, by - 11, hw * 2.2, 3);
    // shaft
    const top = by - H;
    g.beginPath(); g.moveTo(cx - hw, by - 12);
    if (broken) { g.lineTo(cx - hw, top + 6); g.lineTo(cx - hw * 0.5, top - 3); g.lineTo(cx - hw * 0.15, top + 8); g.lineTo(cx + hw * 0.3, top - 6); g.lineTo(cx + hw * 0.7, top + 5); g.lineTo(cx + hw, top + 1); }
    else { g.lineTo(cx - hw, top + 6); g.lineTo(cx + hw, top + 6); }
    g.lineTo(cx + hw, by - 12); g.closePath(); g.fillStyle = '#9aa4c6'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.8; g.stroke();
    g.save(); g.clip(); g.fillStyle = '#6a7498'; g.fillRect(cx + hw * 0.1, top - 10, hw, H + 10); g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(cx - hw * 0.85, top - 10, hw * 0.22, H + 10);
    g.strokeStyle = 'rgba(20,26,56,0.45)'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(cx + i * hw * 0.5, top - 10); g.lineTo(cx + i * hw * 0.5, by); g.stroke(); }
    // glowing rune band
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + cx * 0.05);
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(90,200,255,' + (0.45 + pulse * 0.4).toFixed(2) + ')'; g.lineWidth = 2;
    const ry = by - H * 0.45; g.beginPath(); g.moveTo(cx - hw * 0.5, ry); g.lineTo(cx, ry - 6); g.lineTo(cx + hw * 0.4, ry + 1); g.lineTo(cx - hw * 0.1, ry + 8); g.stroke();
    g.restore();
    if (!broken) { g.fillStyle = '#b4bedc'; g.strokeStyle = OUT; g.lineWidth = 1.6; roundRect(g, cx - hw * 1.3, top - 6, hw * 2.6, 12, 3); g.fill(); g.stroke(); }
    // rubble
    ellipse(g, cx + hw * 1.3, by, 5, 3, '#7a84a8', OUT, 1); ellipse(g, cx - hw * 1.4, by - 2, 3.4, 2.2, '#7a84a8', OUT, 1);
  }

  function drawBlock(g, o, t, theme) {
    const lift = 18, x = o.x, y = o.y, w = o.w, h = o.h;
    g.fillStyle = 'rgba(0,0,10,0.32)'; g.fillRect(x + 4, y + h - 2, w, 8);
    // front face
    const front = theme === 'ruins' ? '#4a5278' : '#7c8499', top = theme === 'ruins' ? '#7683ae' : '#a8b0c4';
    g.fillStyle = front; g.fillRect(x, y + h - lift, w, lift); g.strokeStyle = OUT; g.lineWidth = 1.8; g.strokeRect(x, y + h - lift, w, lift);
    g.strokeStyle = 'rgba(10,12,34,0.5)'; g.lineWidth = 1;
    for (let bx = x + 22; bx < x + w - 6; bx += 34) { g.beginPath(); g.moveTo(bx, y + h - lift); g.lineTo(bx, y + h); g.stroke(); }
    // top face
    g.fillStyle = top; g.fillRect(x, y - lift, w, h); g.strokeStyle = OUT; g.lineWidth = 1.8; g.strokeRect(x, y - lift, w, h);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x + 2, y - lift + 2, w - 4, 4);
    g.fillStyle = 'rgba(10,12,40,0.16)'; g.fillRect(x + w * 0.55, y - lift + 6, w * 0.4, h - 10);
    g.strokeStyle = 'rgba(10,12,34,0.35)'; for (let by = y - lift + 26; by < y - lift + h - 4; by += 26) { g.beginPath(); g.moveTo(x, by); g.lineTo(x + w, by); g.stroke(); }
    if (theme === 'ruins') {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.03);
      g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(90,200,255,' + (0.35 + pulse * 0.45).toFixed(2) + ')'; g.lineWidth = 2;
      const mx = x + w / 2, my = y + h - lift / 2; g.beginPath(); g.moveTo(mx - 10, my); g.lineTo(mx - 3, my - 5); g.lineTo(mx + 4, my + 2); g.lineTo(mx + 11, my - 3); g.stroke(); g.restore();
    } else {
      ellipse(g, x + w * 0.2, y - lift + 6, 14, 5, 'rgba(100,200,90,0.8)');
    }
  }

  function drawVoidPit(g, o, t) {
    const rect = o.type !== 'circle' && o.w != null;
    const cx = rect ? o.x + o.w / 2 : o.x, cy = rect ? o.y + o.h / 2 : o.y;
    g.save();
    g.beginPath();
    if (rect) { roundRect(g, o.x, o.y, o.w, o.h, 14); } else g.ellipse(cx, cy, o.r, o.r * 0.85, 0, 0, TAU);
    g.clip();
    const R = rect ? Math.max(o.w, o.h) : o.r * 1.2;
    const gr = g.createRadialGradient(cx, cy, 2, cx, cy, R);
    gr.addColorStop(0, '#02010a'); gr.addColorStop(0.7, '#0a0824'); gr.addColorStop(1, '#1a1a52');
    g.fillStyle = gr; g.fillRect(cx - R, cy - R, R * 2, R * 2);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(80,120,255,0.12)'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, (R * 0.3 + i * R * 0.22 + (t * 8) % (R * 0.22)) * (rect ? 0.9 : 0.8), (R * 0.22 + i * R * 0.16) , t * 0.2 + i, 0, TAU); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(120,150,255,' + (0.5 + 0.2 * Math.sin(t * 2)).toFixed(2) + ')'; g.lineWidth = 2.5;
    g.beginPath(); if (rect) roundRect(g, o.x, o.y, o.w, o.h, 14); else g.ellipse(cx, cy, o.r, o.r * 0.85, 0, 0, TAU); g.stroke();
  }

  // ---------- sway items ----------
  function drawSway(g, s, t) {
    const sx = Math.sin(t * 1.9 + s.ph + s.x * 0.01) * 2.8 * s.s;
    if (s.k === 'f') {
      const h = 9 * s.s;
      g.strokeStyle = '#3a9a48'; g.lineWidth = 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(s.x, s.y); g.quadraticCurveTo(s.x + sx * 0.3, s.y - h * 0.6, s.x + sx, s.y - h); g.stroke();
      const hx = s.x + sx, hy = s.y - h;
      g.fillStyle = s.c; const pr = 2.4 * s.s;
      for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; g.beginPath(); g.arc(hx + Math.cos(a) * pr, hy + Math.sin(a) * pr * 0.85, pr * 0.85, 0, TAU); g.fill(); }
      g.fillStyle = '#ffcf3a'; g.beginPath(); g.arc(hx, hy, pr * 0.55, 0, TAU); g.fill();
    } else {
      g.strokeStyle = s.c; g.lineWidth = 1.8; g.lineCap = 'round'; const h = 10 * s.s;
      g.beginPath(); g.moveTo(s.x - 3, s.y); g.quadraticCurveTo(s.x - 3 + sx * 0.4, s.y - h * 0.6, s.x - 4 + sx, s.y - h * 0.8);
      g.moveTo(s.x, s.y); g.quadraticCurveTo(s.x + sx * 0.5, s.y - h * 0.7, s.x + sx * 1.1, s.y - h);
      g.moveTo(s.x + 3, s.y); g.quadraticCurveTo(s.x + 3 + sx * 0.4, s.y - h * 0.6, s.x + 4 + sx, s.y - h * 0.8); g.stroke();
    }
  }

  function drawWater(g, q, t, theme) {
    g.save();
    roundRect(g, q.x, q.y, q.w, q.h, 22); g.clip();
    const gr = g.createLinearGradient(q.x, q.y, q.x, q.y + q.h);
    if (theme === 'ruins') { gr.addColorStop(0, '#2a5a9a'); gr.addColorStop(1, '#14306a'); } else { gr.addColorStop(0, '#52c4f0'); gr.addColorStop(1, '#2a86dc'); }
    g.fillStyle = gr; g.fillRect(q.x, q.y, q.w, q.h);
    g.lineCap = 'round';
    const flow = t * 22;
    for (let yy = q.y + 8; yy < q.y + q.h; yy += 16) {
      g.strokeStyle = 'rgba(255,255,255,0.26)'; g.lineWidth = 1.6; g.beginPath();
      const off = mod(flow + yy * 3.1, 90);
      for (let xx = q.x - 90 + off; xx < q.x + q.w; xx += 90) { g.moveTo(xx, yy + Math.sin(xx * 0.05 + t) * 2); g.quadraticCurveTo(xx + 20, yy - 5, xx + 40, yy + Math.sin((xx + 40) * 0.05 + t) * 2); }
      g.stroke();
    }
    // ripples
    for (let i = 0; i < Math.min(6, Math.floor(q.w * q.h / 9000) + 1); i++) {
      const rx = q.x + hash(q.x, i) * q.w, ry = q.y + hash(q.y, i + 9) * q.h, ph = mod(t * 0.5 + i * 0.37, 1);
      g.strokeStyle = 'rgba(255,255,255,' + (0.45 * (1 - ph)).toFixed(2) + ')'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(rx, ry, 6 + ph * 26, (6 + ph * 26) * 0.45, 0, 0, TAU); g.stroke();
    }
    // sparkles
    for (let i = 0; i < 8; i++) { const sp = Math.max(0, Math.sin(t * 2 + i * 1.9)); if (sp < 0.5) continue; const sx = q.x + hash(i, q.w) * q.w, sy = q.y + hash(q.h, i) * q.h; g.fillStyle = 'rgba(255,255,255,' + (sp * 0.8).toFixed(2) + ')'; g.fillRect(sx - 2, sy - 0.5, 4, 1); g.fillRect(sx - 0.5, sy - 2, 1, 4); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.65)'; g.lineWidth = 2; roundRect(g, q.x, q.y, q.w, q.h, 22); g.stroke();
    g.strokeStyle = 'rgba(20,70,130,0.55)'; g.lineWidth = 1.5; roundRect(g, q.x - 2, q.y - 2, q.w + 4, q.h + 4, 24); g.stroke();
  }

  // ---------- small decor ----------
  const BIG_DECOR = { tree: 1, rock: 1, boulder: 1, pillar: 1, column: 1, ruin: 1, wall: 1, statue: 1, arch: 1 };
  function decorKind(d) { return String(d.visual || d.type || d.kind || '').toLowerCase(); }

  function drawSmallDecor(g, d, t, theme) {
    const k = decorKind(d), x = d.x, y = d.y;
    switch (k) {
      case 'flower': case 'flowers': drawSway(g, { k: 'f', x, y, ph: hash(x, y) * TAU, s: d.s || 1, c: d.color || FLOWER_COLS[Math.floor(hash(y, x) * 6)] }, t); break;
      case 'grass': case 'tuft': drawSway(g, { k: 't', x, y, ph: hash(x, y) * TAU, s: d.s || 1.2, c: '#4fb556' }, t); break;
      case 'bush': { const r = d.r || 14; ellipse(g, x, y + 3, r, r * 0.75, '#1f6a3a', OUT, 1.4); ellipse(g, x - 1, y - 1, r * 0.8, r * 0.6, '#38aa52'); ellipse(g, x - r * 0.25, y - r * 0.35, r * 0.35, r * 0.2, '#7de27a'); break; }
      case 'mushroom': ellipse(g, x, y, 5, 3, '#e8486a', OUT, 1); ellipse(g, x - 1.5, y - 1, 1, 0.8, '#fff'); break;
      case 'rune': case 'glyph': { const p = 0.5 + 0.5 * Math.sin(t * 2 + x); g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(90,200,255,' + (0.35 + p * 0.5).toFixed(2) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, d.r || 16, 0, TAU); g.stroke(); g.restore(); break; }
      case 'crystal': { const p = 0.5 + 0.5 * Math.sin(t * 2.4 + x); poly(g, [[x, y - 20], [x + 7, y - 4], [x + 3, y + 3], [x - 4, y + 3], [x - 8, y - 5]], '#5ac8ff', OUT, 1.4); poly(g, [[x, y - 20], [x + 7, y - 4], [x, y - 6]], '#c8f2ff', null); glowBlob(g, x, y - 8, 22, '#6ad0ff', 0.25 + 0.2 * p); break; }
      case 'debris': case 'rubble': case 'stone': ellipse(g, x, y, 5, 3.2, '#7a84a8', OUT, 1); ellipse(g, x + 6, y + 2, 3, 2, '#6a7498', OUT, 1); break;
      default: ellipse(g, x, y, 3, 2, theme === 'ruins' ? '#6a7498' : '#4fb556');
    }
  }
  function glowBlob(g, x, y, r, color, a) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
    const pa = g.globalAlpha, po = g.globalCompositeOperation; g.globalCompositeOperation = 'lighter'; g.globalAlpha = pa * a; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalCompositeOperation = po; g.globalAlpha = pa;
  }

  // ---------- Renderer ----------
  const R = {
    floatingText: [],
    _bound: false,
    _handlers: [],
    _cache: {},
    _keys: [],
    _cam: { x: 0, y: 0, w: 960, h: 540 },
    _theme: 'fields',
    _items: [],
    _ghost: { x: 0, y: 0, facing: 0, anim: 'dash', animT: 0, vx: 0, vy: 0, combo: 0, swinging: 0, hitFlash: 0, invuln: 0, dead: false },

    clearCache() { this._cache = {}; this._keys = []; },

    // ----- floating text / events -----
    pushText(o) {
      const cap = (AT.CFG && AT.CFG.LIMITS && AT.CFG.LIMITS.damageNumbers) || 40;
      const L = this.floatingText;
      while (L.length >= cap) L.shift();
      o.age = 0; L.push(o); return o;
    },

    bind() {
      if (this._bound) return;
      this._bound = true;
      const ev = AT.events; if (!ev) return;
      const self = this;
      const on = (n, f) => { ev.on(n, f); self._handlers.push([n, f]); };
      on('damage', (p) => {
        if (!p || !(p.amount > 0)) return;
        const toPlayer = p.target && p.target.kind === 'player';
        const amt = Math.round(p.amount);
        const el = p.element || 'physical';
        let col = (ELC[el] || ELC.physical)[0], size = 15, text = String(amt), life = 0.9;
        if (toPlayer) { col = '#ff6a6a'; text = '-' + amt; size = 17; }
        else if (p.reaction) { col = '#ffd08a'; size = 22; life = 1.1; }
        else if (p.crit) { col = '#ffe14a'; size = 21; text = amt + '!'; life = 1.1; }
        else if (el === 'pyro') col = '#ffb070';
        else if (el === 'hydro') col = '#8ad8ff';
        else if (el === 'electro') col = '#d8b0ff';
        self.pushText({ x: (p.x || 0) + (Math.random() - 0.5) * 14, y: (p.y || 0) - 22, vx: (Math.random() - 0.5) * 24, vy: -52, life, text, size, color: col, kind: p.reaction ? 'reaction' : p.crit ? 'crit' : toPlayer ? 'hurt' : 'dmg' });
      });
      on('reaction', (p) => {
        if (!p) return;
        self.pushText({ x: p.x || 0, y: (p.y || 0) - 46, vx: 0, vy: -26, life: 1.35, text: String(p.name || 'vaporize').toUpperCase(), size: 24, color: '#ffffff', kind: 'vaporize' });
      });
    },

    update(dt) {
      this._bind();
      const L = this.floatingText;
      let w = 0;
      for (let i = 0; i < L.length; i++) {
        const f = L[i]; f.age += dt;
        if (f.age >= f.life) continue;
        f.x += f.vx * dt; f.y += f.vy * dt; f.vy *= Math.max(0, 1 - 2.2 * dt);
        L[w++] = f;
      }
      L.length = w;
      if (AT.Particles && AT.Particles.ambient) AT.Particles.ambient(dt, this._cam, this._theme);
    },
    _bind() { if (!this._bound) this.bind(); if (AT.Particles && AT.Particles.bind && !AT.Particles._bound) AT.Particles.bind(); },

    _bg(world) {
      const theme = world.theme === 'ruins' ? 'ruins' : 'fields';
      const key = (world.index || 0) + ':' + theme + ':' + world.w + 'x' + world.h;
      let e = this._cache[key];
      if (e === undefined) {
        e = theme === 'ruins' ? buildRuins(world, 48) : buildFields(world, 48);
        if (e) {
          // convert world.decor into small / big lists once
          e.small = []; e.big = [];
          const dc = world.decor || [];
          for (let i = 0; i < dc.length; i++) { const d = dc[i]; if (!d) continue; (BIG_DECOR[decorKind(d)] ? e.big : e.small).push(d); }
          e.water = waterRects(world);
        }
        this._cache[key] = e || null;
        this._keys.push(key);
        while (this._keys.length > 3) delete this._cache[this._keys.shift()];
      }
      return e;
    },

    // ----- the main entry -----
    drawWorld(ctx, game, cam, t) {
      this._bind();
      t = t || 0;
      const VW = (AT.CFG && AT.CFG.VIEW_W) || 960, VH = (AT.CFG && AT.CFG.VIEW_H) || 540;
      const level = (game && game.level) || {};
      const world = level.world || (game && game.world) || { w: 2000, h: 1500, theme: 'fields', obstacles: [], decor: [], water: [] };
      const player = (game && game.player) || AT.player;
      cam = cam || (game && game.cam) || { x: 0, y: 0 };
      const cx = Math.round(cam.x || 0), cy = Math.round(cam.y || 0);
      const theme = world.theme === 'ruins' ? 'ruins' : 'fields';
      this._cam = { x: cx, y: cy, w: VW, h: VH }; this._theme = theme;
      const bg = this._bg(world);

      ctx.save();
      if (theme === 'ruins') this._drawVoid(ctx, cx, cy, VW, VH, t);
      else { ctx.fillStyle = '#4a9a48'; ctx.fillRect(0, 0, VW, VH); }

      ctx.translate(-cx, -cy);
      const view = { x0: cx - 120, y0: cy - 160, x1: cx + VW + 120, y1: cy + VH + 160 };
      // static background
      if (bg && bg.canvas) {
        const pad = bg.pad, cw = bg.canvas.width, ch = bg.canvas.height;
        const sx = Math.max(0, cx + pad), sy = Math.max(0, cy + pad);
        const ex = Math.min(cw, cx + VW + pad), ey = Math.min(ch, cy + VH + pad);
        if (ex > sx && ey > sy) ctx.drawImage(bg.canvas, sx, sy, ex - sx, ey - sy, sx - pad, sy - pad, ex - sx, ey - sy);
      } else {
        ctx.fillStyle = theme === 'ruins' ? '#434b70' : '#78d45c'; ctx.fillRect(0, 0, world.w || 2000, world.h || 1500);
      }

      // animated ground layer
      const waters = bg ? bg.water : waterRects(world);
      for (let i = 0; i < waters.length; i++) { const q = waters[i]; if (q.x < view.x1 && q.x + q.w > view.x0 && q.y < view.y1 && q.y + q.h > view.y0) drawWater(ctx, q, t, theme); }
      if (bg) {
        const sw = bg.sway;
        for (let i = 0; i < sw.length; i++) { const s = sw[i]; if (s.x > view.x0 && s.x < view.x1 && s.y > view.y0 && s.y < view.y1) drawSway(ctx, s, t); }
        if (theme === 'ruins') this._drawRunes(ctx, bg.runes, view, t);
        for (let i = 0; i < bg.small.length; i++) { const d = bg.small[i]; if (d.x > view.x0 && d.x < view.x1 && d.y > view.y0 && d.y < view.y1) drawSmallDecor(ctx, d, t, theme); }
      }
      const obs = world.obstacles || [];
      const items = this._items; items.length = 0;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i]; const v = o.visual || (theme === 'ruins' ? 'ruin' : 'rock');
        if (v === 'water') continue;
        const circ = o.type === 'circle';
        const ox = circ ? o.x - o.r : o.x, oy = circ ? o.y - o.r : o.y, ow = circ ? o.r * 2 : o.w, oh = circ ? o.r * 2 : o.h;
        if (ox > view.x1 || ox + ow < view.x0 || oy - 120 > view.y1 || oy + oh < view.y0) continue;
        if (v === 'void') { drawVoidPit(ctx, o, t); continue; }
        items.push([circ ? o.y + o.r * 0.6 : o.y + o.h, 'o', o, v]);
      }
      if (bg) for (let i = 0; i < bg.big.length; i++) {
        const d = bg.big[i]; if (d.x < view.x0 || d.x > view.x1 || d.y < view.y0 - 120 || d.y > view.y1) continue;
        items.push([d.y + (d.h || (d.r || 16) * 0.5), 'd', d, decorKind(d)]);
      }

      // afterimages (below actors)
      if (player && player.afterimages && AT.Sprites) {
        const gh = this._ghost;
        for (let i = 0; i < player.afterimages.length; i++) {
          const a = player.afterimages[i]; if (!(a.life > 0)) continue;
          gh.x = a.x; gh.y = a.y; gh.facing = a.facing || 0;
          AT.Sprites.drawPlayer(ctx, gh, t, { ghost: true, alpha: clamp(a.life * 3, 0, 1) * 0.5 });
        }
      }
      // pickups
      const pk = level.pickups || [];
      for (let i = 0; i < pk.length; i++) { const p = pk[i]; if (p.x > view.x0 && p.x < view.x1 && p.y > view.y0 && p.y < view.y1) AT.Sprites.drawPickup(ctx, p, t); }
      // chests, enemies, boss, player into the sort list
      const ch = level.chests || [];
      for (let i = 0; i < ch.length; i++) { const c = ch[i]; if (c.x > view.x0 && c.x < view.x1 && c.y > view.y0 && c.y < view.y1) items.push([c.y + 4, 'c', c]); }
      const en = level.enemies || [];
      for (let i = 0; i < en.length; i++) { const e = en[i]; if (!e) continue; if (e.dead && (e.deathT || 0) > 0.4) continue; if (e.x > view.x0 && e.x < view.x1 && e.y > view.y0 && e.y < view.y1) items.push([e.y, 'e', e]); }
      const boss = level.boss;
      if (boss && !(boss.dead && (boss.deathT || 0) > 1)) items.push([boss.y, 'b', boss]);
      if (player) items.push([player.y, 'p', player]);
      items.sort(byY);
      for (let i = 0; i < items.length; i++) {
        const it = items[i], ref = it[2];
        ctx.save();
        switch (it[1]) {
          case 'o': case 'd': this._drawStatic(ctx, ref, it[3], t, theme); break;
          case 'c': AT.Sprites.drawChest(ctx, ref, t); break;
          case 'e': AT.Sprites.drawEnemy(ctx, ref, t); break;
          case 'b': AT.Sprites.drawBoss(ctx, ref, t); break;
          case 'p': AT.Sprites.drawPlayer(ctx, ref, t); break;
        }
        ctx.restore();
      }
      // enemy hp bars
      for (let i = 0; i < en.length; i++) {
        const e = en[i]; if (!e || e.dead || !(e.hp < e.maxHp)) continue;
        const w = 30, x = e.x - w / 2, y = e.y + (e.r || 14) + 6;
        ctx.fillStyle = 'rgba(10,10,30,0.7)'; ctx.fillRect(x - 1, y - 1, w + 2, 5);
        ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 3);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, w * clamp(e.hp / e.maxHp, 0, 1), 1);
      }
      this._drawProjectiles(ctx, t);
      this._drawSlashes(ctx, t);
      if (AT.Particles) AT.Particles.draw(ctx, this._cam);
      ctx.restore();

      // ----- screen-space lighting -----
      ctx.save();
      this._drawLighting(ctx, theme, player, cx, cy, VW, VH, t);
      ctx.restore();

      // ----- world-space overlays that must stay readable: telegraphs, then numbers -----
      ctx.save(); ctx.translate(-cx, -cy);
      this._drawTelegraphs(ctx, level, t);
      this._drawFloatingText(ctx, t);
      ctx.restore();
    },

    _drawStatic(g, o, v, t, theme) {
      switch (v) {
        case 'tree': { const c = o.type === 'circle' || o.r ? o : { x: o.x + (o.w || 40) / 2, y: o.y + (o.h || 40) / 2, r: Math.min(o.w || 40, o.h || 40) / 2 }; drawTree(g, c, t); break; }
        case 'rock': case 'boulder': drawRock(g, o); break;
        case 'pillar': case 'column': case 'statue': case 'arch': drawPillar(g, o, t); break;
        case 'wall': case 'ruin': default:
          if (o.type === 'circle') { if (theme === 'ruins') drawPillar(g, o, t); else drawRock(g, o); }
          else if (v === 'rock') drawRock(g, o);
          else drawBlock(g, o.w != null ? o : { x: o.x - 30, y: o.y - 20, w: 60, h: 40 }, t, theme);
      }
    },

    _drawRunes(g, runes, view, t) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < runes.length; i++) {
        const r = runes[i]; if (r.x < view.x0 || r.x > view.x1 || r.y < view.y0 || r.y > view.y1) continue;
        const p = 0.5 + 0.5 * Math.sin(t * 1.8 + r.ph);
        g.strokeStyle = 'rgba(90,190,255,' + (0.35 + 0.5 * p).toFixed(2) + ')'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.arc(r.x, r.y, r.r, 0, TAU); g.stroke();
        for (let k = 0; k < r.n * 2; k++) { const a = k / (r.n * 2) * TAU + t * 0.15; g.beginPath(); g.moveTo(r.x + Math.cos(a) * r.r * 0.65, r.y + Math.sin(a) * r.r * 0.65); g.lineTo(r.x + Math.cos(a + 0.2) * r.r * 0.9, r.y + Math.sin(a + 0.2) * r.r * 0.9); if (k % 2) g.lineTo(r.x + Math.cos(a - 0.1) * r.r * 0.8, r.y + Math.sin(a - 0.1) * r.r * 0.8); g.stroke(); }
        const gr = g.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.r * 1.5); gr.addColorStop(0, 'rgba(80,170,255,' + (0.18 * p).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(r.x - r.r * 1.5, r.y - r.r * 1.5, r.r * 3, r.r * 3);
      }
      g.restore();
    },

    _drawVoid(g, cx, cy, W, H, t) {
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#0a0924'); gr.addColorStop(0.6, '#1a2252'); gr.addColorStop(1, '#2d3d7c');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) { const x = hash(i, 3) * W, y = hash(i, 9) * H * 0.7, a = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); g.fillStyle = 'rgba(220,230,255,' + (a * 0.6).toFixed(2) + ')'; g.fillRect(x, y, 1.5, 1.5); }
      for (let L = 0; L < 2; L++) {
        const par = 0.12 + L * 0.14, spd = 6 + L * 10;
        for (let i = 0; i < 7; i++) {
          const x = mod(i * 240 + t * spd - cx * par, W + 400) - 200, y = H * (0.55 + L * 0.2) + (i % 3) * 36 - cy * par * 0.4;
          g.fillStyle = 'rgba(' + (150 + L * 20) + ',' + (170 + L * 15) + ',235,' + (0.11 + L * 0.06) + ')';
          for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(x + k * 34 - 50, y + Math.sin(k * 2 + i) * 6, 50 + (k % 2) * 16, 18 + L * 6, 0, 0, TAU); g.fill(); }
        }
      }
      // distant floating islands
      for (let i = 0; i < 3; i++) {
        const x = mod(i * 420 + 150 - cx * 0.08, W + 300) - 100, y = 90 + i * 60 + Math.sin(t * 0.5 + i) * 6;
        g.fillStyle = 'rgba(20,26,60,0.85)'; g.beginPath(); g.moveTo(x - 50, y); g.lineTo(x + 50, y); g.lineTo(x + 20, y + 30); g.lineTo(x, y + 52); g.lineTo(x - 22, y + 28); g.closePath(); g.fill();
        g.fillStyle = 'rgba(70,110,170,0.8)'; g.fillRect(x - 50, y - 3, 100, 4);
      }
    },

    _drawLighting(g, theme, player, cx, cy, W, H, t) {
      if (theme === 'ruins') {
        g.fillStyle = 'rgba(8,10,34,0.26)'; g.fillRect(0, 0, W, H);
        if (player) {
          const px = player.x - cx, py = player.y - cy - 10;
          const gr = g.createRadialGradient(px, py, 10, px, py, 290); gr.addColorStop(0, 'rgba(130,180,255,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
        }
        // low mist streaks
        g.fillStyle = 'rgba(170,190,255,0.05)';
        for (let i = 0; i < 4; i++) { const x = mod(i * 300 + t * (14 + i * 4) - cx * 0.4, W + 500) - 250, y = H * (0.2 + i * 0.22); g.beginPath(); g.ellipse(x, y, 230, 22, 0, 0, TAU); g.fill(); }
        const ph = mod(t, 9);
        if (ph < 0.18) { g.fillStyle = 'rgba(200,220,255,' + (0.14 * (1 - ph / 0.18)).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
        const vg = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,16,0)'); vg.addColorStop(1, 'rgba(0,0,16,0.72)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      } else {
        g.fillStyle = 'rgba(255,214,140,0.06)'; g.fillRect(0, 0, W, H);
        // drifting cloud shadows
        g.fillStyle = 'rgba(30,70,60,0.07)';
        for (let i = 0; i < 4; i++) { const x = mod(i * 330 + t * 14 - cx * 0.9, W + 600) - 300, y = mod(i * 190 + 40 - cy * 0.9, H + 300) - 100; g.beginPath(); g.ellipse(x, y, 190, 70, -0.3, 0, TAU); g.fill(); }
        // sun shafts
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 5; i++) {
          const x0 = 80 + i * 210 + Math.sin(t * 0.3 + i * 1.7) * 28, wdt = 46 + (i % 3) * 22;
          const gr = g.createLinearGradient(x0, 0, x0 - 180, H); const a = (0.10 + 0.05 * Math.sin(t * 0.7 + i * 2.3)).toFixed(3);
          gr.addColorStop(0, 'rgba(255,236,170,' + a + ')'); gr.addColorStop(1, 'rgba(255,236,170,0)');
          g.fillStyle = gr; g.beginPath(); g.moveTo(x0, -10); g.lineTo(x0 + wdt, -10); g.lineTo(x0 + wdt - 300, H + 10); g.lineTo(x0 - 300, H + 10); g.closePath(); g.fill();
        }
        g.restore();
        const vg = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.98); vg.addColorStop(0, 'rgba(20,40,20,0)'); vg.addColorStop(1, 'rgba(14,30,18,0.4)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
      }
    },

    _drawProjectiles(g, t) {
      const L = AT.Projectiles && AT.Projectiles.list; if (!L) return;
      for (let i = 0; i < L.length; i++) {
        const p = L[i]; if (!p || p.dead) continue;
        const c = ELC[p.element] || ELC.physical, r = p.r || 8;
        const sp = Math.hypot(p.vx || 0, p.vy || 0) || 1, dx = (p.vx || 0) / sp, dy = (p.vy || 0) / sp;
        g.save(); g.globalCompositeOperation = 'lighter';
        const gr = g.createLinearGradient(p.x, p.y, p.x - dx * r * 4, p.y - dy * r * 4); gr.addColorStop(0, c[1]); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.strokeStyle = gr; g.lineWidth = r * 1.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - dx * r * 4, p.y - dy * r * 4); g.stroke();
        const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4); rg.addColorStop(0, c[0]); rg.addColorStop(0.35, c[1]); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.beginPath(); g.arc(p.x, p.y, r * 2.4, 0, TAU); g.fill();
        if (p.element === 'electro') {
          g.strokeStyle = c[0]; g.lineWidth = 1.4; g.beginPath(); const s = Math.floor(t * 20) + i;
          let ax = p.x, ay = p.y; g.moveTo(ax, ay); for (let k = 0; k < 3; k++) { ax += (hash(s, k) - 0.5) * r * 3.2; ay += (hash(k, s) - 0.5) * r * 3.2; g.lineTo(ax, ay); } g.stroke();
        }
        g.restore();
        g.fillStyle = '#ffffff'; g.beginPath(); g.arc(p.x, p.y, r * 0.45, 0, TAU); g.fill();
      }
    },

    _drawSlashes(g, t) {
      const H = AT.Combat && AT.Combat.activeHitboxes; if (!H) return;
      for (let i = 0; i < H.length; i++) {
        const h = H[i], dur = h.dur || 0.2, p = clamp((h.t || 0) / dur, 0, 1);
        const c = ELC[h.element] || ELC.physical;
        g.save(); g.globalCompositeOperation = 'lighter';
        if (h.shape === 'circle') {
          const e = 1 - Math.pow(1 - p, 3), rad = (h.r || h.range || 100) * (0.25 + 0.75 * e);
          const gr = g.createRadialGradient(h.x, h.y, rad * 0.5, h.x, h.y, rad); gr.addColorStop(0, 'rgba(255,140,40,0)'); gr.addColorStop(1, 'rgba(255,170,70,' + (0.5 * (1 - p)).toFixed(3) + ')');
          g.fillStyle = gr; g.beginPath(); g.arc(h.x, h.y, rad, 0, TAU); g.fill();
          g.strokeStyle = 'rgba(255,225,160,' + (0.9 * (1 - p)).toFixed(3) + ')'; g.lineWidth = 6 * (1 - p) + 1.5; g.beginPath(); g.arc(h.x, h.y, rad, 0, TAU); g.stroke();
          g.strokeStyle = 'rgba(255,120,40,' + (0.7 * (1 - p)).toFixed(3) + ')'; g.lineWidth = 3; g.beginPath(); g.arc(h.x, h.y, rad * 0.78, 0, TAU); g.stroke();
        } else {
          const range = h.range || h.r || 62, arc = h.arc || 2.4, a0 = (h.angle || 0) - arc / 2;
          const e = 1 - Math.pow(1 - clamp(p * 1.7, 0, 1), 2), sweep = arc * e;
          const fade = Math.pow(1 - p, 1.4);
          const crescent = (from, to, inner, outer) => {
            g.beginPath(); g.arc(h.x, h.y, outer, from, to); g.arc(h.x, h.y, inner, to, from, true); g.closePath();
          };
          const big = h.element === 'pyro';
          crescent(a0, a0 + sweep, range * (big ? 0.35 : 0.6), range * 1.02);
          g.fillStyle = (big ? 'rgba(255,140,50,' : 'rgba(190,235,255,') + (0.42 * fade).toFixed(3) + ')'; g.fill();
          crescent(Math.max(a0, a0 + sweep - arc * 0.35), a0 + sweep, range * (big ? 0.6 : 0.78), range * 1.02);
          g.fillStyle = 'rgba(255,255,255,' + (0.8 * fade).toFixed(3) + ')'; g.fill();
          g.strokeStyle = c[1]; g.globalAlpha = 0.8 * fade; g.lineWidth = 2.5; g.beginPath(); g.arc(h.x, h.y, range * 1.02, a0, a0 + sweep); g.stroke();
        }
        g.restore();
      }
    },

    _drawTelegraphs(g, level, t) {
      const draw = (tg) => { if (tg && tg.shape) drawTelegraph(g, tg, t); };
      const en = level.enemies || [];
      for (let i = 0; i < en.length; i++) { const e = en[i]; if (e && !e.dead) draw(e.telegraph); }
      const b = level.boss;
      if (b && !b.dead) { if (b.telegraphs && b.telegraphs.length) for (let i = 0; i < b.telegraphs.length; i++) draw(b.telegraphs[i]); else draw(b.telegraph); }
    },

    _drawFloatingText(g, t) {
      const L = this.floatingText;
      g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      for (let i = 0; i < L.length; i++) {
        const f = L[i], k = f.age / f.life;
        const pop = 1 + 0.45 * Math.max(0, 1 - f.age * 7);
        g.globalAlpha = clamp((1 - k) * 3, 0, 1);
        const sz = f.size * pop;
        g.font = 'bold ' + Math.round(sz) + 'px Georgia, "Times New Roman", serif';
        if (f.kind === 'vaporize') {
          g.font = 'bold italic ' + Math.round(sz) + 'px Georgia, "Times New Roman", serif';
          const w = g.measureText ? (g.measureText(f.text).width || 80) : 80;
          const gr = g.createLinearGradient(f.x, f.y - sz / 2, f.x, f.y + sz / 2);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#ffe2b0'); gr.addColorStop(1, '#ff8a2a');
          g.shadowColor = 'rgba(255,140,40,0.9)'; g.shadowBlur = 10;
          g.strokeStyle = '#7a2208'; g.lineWidth = 5; g.strokeText(f.text, f.x, f.y);
          g.shadowBlur = 0; g.fillStyle = gr; g.fillText(f.text, f.x, f.y);
          g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1; g.beginPath(); g.moveTo(f.x - w / 2, f.y + sz * 0.62); g.lineTo(f.x + w / 2, f.y + sz * 0.62); g.stroke();
        } else {
          g.strokeStyle = f.kind === 'hurt' ? '#3a0a0a' : 'rgba(20,16,40,0.9)'; g.lineWidth = f.kind === 'reaction' || f.kind === 'crit' ? 4.5 : 3.5;
          g.strokeText(f.text, f.x, f.y);
          g.fillStyle = f.color; g.fillText(f.text, f.x, f.y);
        }
      }
      g.restore();
    }
  };

  function byY(a, b) { return a[0] - b[0]; }

  // ---------- telegraphs ----------
  function drawTelegraph(g, tg, t) {
    const prog = tg.dur > 0 ? clamp((tg.t || 0) / tg.dur, 0, 1) : 0.5;
    const pulse = 0.5 + 0.5 * Math.sin(t * 16);
    const hot = prog > 0.8 ? 1 : 0;
    const fill = 'rgba(255,50,40,' + (0.2 + 0.08 * pulse + hot * 0.1).toFixed(3) + ')';
    const inner = 'rgba(255,120,40,' + (0.28 + 0.2 * prog).toFixed(3) + ')';
    const stroke = 'rgba(255,' + Math.round(150 + 60 * pulse) + ',90,' + (0.85 + 0.15 * pulse).toFixed(2) + ')';
    g.save();
    g.globalCompositeOperation = 'source-over';
    const path = (scale) => {
      g.beginPath();
      switch (tg.shape) {
        case 'circle': g.arc(tg.x, tg.y, Math.max(1, (tg.r || 40) * scale), 0, TAU); break;
        case 'cone': {
          const r = (tg.r || tg.range || tg.len || 100) * scale, arc = tg.arc || (tg.w && tg.w < 6.3 ? tg.w : 1.2), a = tg.angle || 0;
          g.moveTo(tg.x, tg.y); g.arc(tg.x, tg.y, r, a - arc / 2, a + arc / 2); g.closePath(); break;
        }
        default: { // rect / line
          const len = (tg.len || tg.h || 100) * scale, w = tg.w || (tg.shape === 'line' ? 14 : 40);
          if (tg.angle == null && tg.h != null) { g.rect(tg.x, tg.y, tg.w, tg.h * scale); break; }
          const a = tg.angle || 0, ca = Math.cos(a), sa = Math.sin(a), nx = -sa * w / 2, ny = ca * w / 2;
          g.moveTo(tg.x + nx, tg.y + ny); g.lineTo(tg.x + nx + ca * len, tg.y + ny + sa * len); g.lineTo(tg.x - nx + ca * len, tg.y - ny + sa * len); g.lineTo(tg.x - nx, tg.y - ny); g.closePath();
        }
      }
    };
    path(1); g.fillStyle = fill; g.fill();
    path(Math.max(0.05, prog)); g.fillStyle = inner; g.fill();
    // dark under-stroke for contrast on bright grass, then pulsing bright outline
    path(1); g.strokeStyle = 'rgba(90,10,10,0.55)'; g.lineWidth = 6 + pulse * 1.5; g.lineJoin = 'round'; g.stroke();
    path(1); g.strokeStyle = stroke; g.lineWidth = 2.6 + pulse * 1.2; g.setLineDash && g.setLineDash(hot ? [] : [10, 6]); g.lineDashOffset = -t * 30; g.stroke();
    g.setLineDash && g.setLineDash([]);
    g.restore();
  }

  R.drawTelegraph = drawTelegraph;
  AT.Renderer = R;
})();
