// Aether's Trial — procedural anime-style sprites (cel-shaded hero, slimes, bosses, chests, pickups). Owner: visuals.
// Everything is drawn with Canvas 2D calls only; no external assets. All draw functions take world coordinates.
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;
  const OUT = '#1b1430'; // cel outline colour

  // ---------- colour helpers (flash / ghost tint applied to every hex colour) ----------
  const _pc = {};
  function parse(hex) {
    let c = _pc[hex]; if (c) return c;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    c = [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
    _pc[hex] = c; return c;
  }
  let _mix = null; // {r,g,b,a}
  function C(col) {
    if (!_mix || col.charAt(0) !== '#') return col;
    const c = parse(col), m = _mix;
    return 'rgb(' + Math.round(c[0] + (m.r - c[0]) * m.a) + ',' + Math.round(c[1] + (m.g - c[1]) * m.a) + ',' + Math.round(c[2] + (m.b - c[2]) * m.a) + ')';
  }
  function mixHex(a, b, t) {
    const x = parse(a), y = parse(b);
    return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')';
  }
  function setMix(r, g, b, a) { _mix = a > 0 ? { r, g, b, a } : null; }

  function paint(ctx, fill, stroke, lw) {
    if (fill) { ctx.fillStyle = C(fill); ctx.fill(); }
    if (stroke) { ctx.strokeStyle = C(stroke); ctx.lineWidth = lw || 1.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
  }
  function ell(ctx, x, y, rx, ry, fill, stroke, lw, rot) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); paint(ctx, fill, stroke, lw);
  }
  function poly(ctx, pts, fill, stroke, lw) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); paint(ctx, fill, stroke, lw);
  }
  function line(ctx, x0, y0, x1, y1, col, w) {
    ctx.strokeStyle = C(col); ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  // thick outlined limb
  function limb(ctx, x0, y0, x1, y1, w, col, outline) {
    line(ctx, x0, y0, x1, y1, outline || OUT, w + 2.4);
    line(ctx, x0, y0, x1, y1, col, w);
  }
  function glowBlob(ctx, x, y, r, color, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    const pa = ctx.globalAlpha, po = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pa * a;
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = po; ctx.globalAlpha = pa;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- element data & glyphs ----------
  const ELEM = {
    hydro: { main: '#4aa8ff', light: '#b4e4ff', dark: '#2057c8', glow: '#7fd0ff' },
    pyro: { main: '#ff6a3a', light: '#ffc58a', dark: '#b2271c', glow: '#ffa050' },
    electro: { main: '#b072ff', light: '#e6ccff', dark: '#6633b8', glow: '#d2a8ff' },
    anemo: { main: '#4fe0b0', light: '#c8ffec', dark: '#1d9478', glow: '#8affd8' },
    cryo: { main: '#a4e6ff', light: '#f0fcff', dark: '#4a9ec8', glow: '#d0f4ff' },
    geo: { main: '#f0b840', light: '#ffe8a0', dark: '#a06c18', glow: '#ffd870' },
    physical: { main: '#e8f0ff', light: '#ffffff', dark: '#8a9cc8', glow: '#ffffff' }
  };
  function elem(e) { return ELEM[e] || ELEM.hydro; }

  /** Small element glyph (no emoji). Drawn centred on (x,y) within radius s. */
  function drawElementGlyph(ctx, el, x, y, s) {
    const E = elem(el);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = C(E.main); ctx.strokeStyle = C(E.dark); ctx.lineWidth = Math.max(1, s * 0.16); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    switch (el) {
      case 'hydro': {
        ctx.beginPath(); ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.35, -s * 0.45, s * 0.8, 0.0, s * 0.8, s * 0.35);
        ctx.arc(0, s * 0.3, s * 0.8, 0, Math.PI, false);
        ctx.bezierCurveTo(-s * 0.8, 0.0, -s * 0.35, -s * 0.45, 0, -s);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-s * 0.28, s * 0.15, s * 0.14, s * 0.26, 0.4, 0, TAU); ctx.fill();
        break;
      }
      case 'pyro': {
        ctx.beginPath(); ctx.moveTo(0, -s);
        ctx.bezierCurveTo(s * 0.2, -s * 0.5, s * 0.85, -s * 0.2, s * 0.65, s * 0.35);
        ctx.bezierCurveTo(s * 0.55, s * 0.85, -s * 0.55, s * 0.85, -s * 0.65, s * 0.3);
        ctx.bezierCurveTo(-s * 0.7, -s * 0.1, -s * 0.2, -s * 0.2, 0, -s);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = C('#ffe08a'); ctx.beginPath(); ctx.ellipse(0, s * 0.38, s * 0.28, s * 0.36, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'electro': {
        poly(ctx, [[s * 0.2, -s], [-s * 0.6, s * 0.1], [-s * 0.05, s * 0.1], [-s * 0.3, s], [s * 0.65, -s * 0.2], [s * 0.05, -s * 0.2]], E.main, E.dark, Math.max(1, s * 0.16));
        break;
      }
      case 'anemo': {
        ctx.strokeStyle = C(E.main); ctx.lineWidth = Math.max(1.2, s * 0.24);
        ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0.3, Math.PI * 1.7); ctx.stroke();
        ctx.beginPath(); ctx.arc(s * 0.1, 0, s * 0.8, Math.PI * 1.1, Math.PI * 2.4); ctx.stroke();
        break;
      }
      case 'cryo': {
        ctx.strokeStyle = C(E.main); ctx.lineWidth = Math.max(1.2, s * 0.2);
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI / 3;
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * s, Math.sin(a) * s); ctx.lineTo(-Math.cos(a) * s, -Math.sin(a) * s); ctx.stroke();
        }
        ctx.fillStyle = C(E.light); ctx.beginPath(); ctx.arc(0, 0, s * 0.25, 0, TAU); ctx.fill();
        break;
      }
      case 'geo': {
        poly(ctx, [[0, -s], [s * 0.8, 0], [0, s], [-s * 0.8, 0]], E.main, E.dark, Math.max(1, s * 0.16));
        poly(ctx, [[0, -s], [s * 0.8, 0], [0, s * 0.1]], E.light, null);
        break;
      }
      default: {
        ctx.beginPath(); ctx.arc(0, 0, s * 0.7, 0, TAU); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------- HERO ----------
  const HAIR = '#3b82ff', HAIR_D = '#1f4fc4', HAIR_L = '#9fdcff', HAIR_TIP = '#ffd56a';
  const SKIN = '#ffe0c8', SKIN_D = '#f0b898';
  const CAPE = '#d9344a', CAPE_D = '#9c2038', GOLD = '#f2c35a', GOLD_D = '#b88628';
  const TUNIC = '#f6eedb', TUNIC_D = '#d4c49c', BLUE = '#2a62cc', BLUE_D = '#1a3d92';
  const SPIKES = [[-2.95, 14, 0.30], [-2.55, 18, 0.30], [-2.1, 16, 0.28], [-1.62, 21, 0.30], [-1.1, 17, 0.28], [-0.65, 19, 0.30], [-0.22, 14, 0.30]];

  function drawBlade(ctx, ang, o) {
    // Blade drawn from a grip point along local direction ang (already in mirrored local space).
    const len = o.len || 24, ca = Math.cos(ang), sa = Math.sin(ang) * (o.squash == null ? 0.8 : o.squash);
    const gx = o.gx, gy = o.gy;
    const x0 = gx + ca * 4, y0 = gy + sa * 4, x1 = gx + ca * (len + 4), y1 = gy + sa * (len + 4);
    if (o.glow) glowBlob(ctx, (x0 + x1) / 2, (y0 + y1) / 2, len * 0.95, o.glowColor || '#7fe4ff', o.glow);
    // handle + guard
    limb(ctx, gx, gy, x0, y0, 3, '#274a9a');
    const px = -sa / (Math.abs(sa) + Math.abs(ca) || 1), py = ca / (Math.abs(sa) + Math.abs(ca) || 1);
    line(ctx, x0 + px * 4.5, y0 + py * 3.6, x0 - px * 4.5, y0 - py * 3.6, GOLD_D, 4.2);
    line(ctx, x0 + px * 4.2, y0 + py * 3.4, x0 - px * 4.2, y0 - py * 3.4, GOLD, 2.4);
    // blade
    line(ctx, x0, y0, x1, y1, OUT, 5.6);
    line(ctx, x0, y0, x1, y1, o.blade || '#bfefff', 3.6);
    line(ctx, x0, y0, x1 - ca * 1.5, y1 - sa * 1.5, '#ffffff', 1.4);
    return [x1, y1];
  }

  /**
   * Core hero renderer.
   * o: {x,y,face,vx,vy,run,phase,bob,swingAng,swingP,lean,lie,eyes,t,flash,ghost,alpha,scale,act,glow,hurt}
   */
  function drawHero(ctx, o) {
    const t = o.t || 0;
    const fa = o.face || 0, ca = Math.cos(fa), sa = Math.sin(fa);
    const sx = ca < -0.12 ? -1 : 1, side = Math.min(1, Math.abs(ca) * 1.15);
    const back = sa < -0.45;
    const run = o.run || 0, ph = o.phase || 0;
    const lie = o.lie || 0;
    const alpha = o.alpha == null ? 1 : o.alpha;
    const vxl = (o.vx || 0) * sx, vyl = o.vy || 0;

    ctx.save();
    ctx.translate(o.x, o.y);
    if (o.scale && o.scale !== 1) ctx.scale(o.scale, o.scale);
    ctx.globalAlpha *= alpha;
    // tint
    if (o.ghost) setMix(120, 220, 255, 0.78);
    else if (o.flash > 0) setMix(255, 255, 255, Math.min(0.85, o.flash));
    else setMix(0, 0, 0, 0);

    // ground shadow
    if (!o.ghost) { ctx.fillStyle = 'rgba(10,12,30,0.30)'; ctx.beginPath(); ctx.ellipse(0, 2, 11 + lie * 16, 4 + lie * 1.5, 0, 0, TAU); ctx.fill(); }

    // body transform
    ctx.translate(0, -(o.bob || 0));
    if (lie > 0) { ctx.translate(0, lie * 9); ctx.translate(0, -14); ctx.rotate(lie * Math.PI / 2 * (o.lieDir || 1)); ctx.translate(0, 14); }
    const lean = o.lean || 0;
    if (lean) ctx.rotate(lean * sx);
    if (o.squash) ctx.scale(1 + o.squash, 1 - o.squash);
    ctx.scale(sx, 1);

    const swing = o.swingAng != null;
    // sword angle in local mirrored space
    let bAng = -1.05 + Math.sin(t * 2.4) * 0.04 + run * Math.sin(ph * 2) * 0.1;
    if (swing) { bAng = Math.atan2(Math.sin(o.swingAng), Math.cos(o.swingAng) * sx); }
    else if (o.act === 'skill') bAng = Math.atan2(sa * 0.6, ca * sx) * 0.8;
    else if (o.act === 'burst') bAng = -1.5;
    const swordFirst = (swing || o.act === 'skill') && Math.sin(bAng) < -0.35;

    // --- cape (behind unless facing away) ---
    const drawCape = () => {
      const tailX = clamp(-vxl * 0.075, -15, 15) + Math.sin(t * 7 + ph) * (1.2 + run * 2.2);
      const tailY = clamp(-vyl * 0.03, -7, 7);
      const lift = run * 5 + (o.dashing ? 6 : 0);
      const hemY = -4 - lift + tailY;
      const w = back ? 9.5 : 8.2;
      const wob = (i) => Math.sin(t * 6.5 + ph * 1.2 + i * 1.1) * (1.2 + run * 2.4);
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const u = i / 4;
        pts.push([-w + u * 2 * w + tailX * (0.55 + 0.45 * (1 - Math.abs(u - 0.5) * 2)) + wob(i), hemY + Math.sin(i * 2.1 + t * 5) * 1.4 + (i % 2) * 2]);
      }
      const path = () => {
        ctx.beginPath(); ctx.moveTo(-7.5, -29.5);
        ctx.quadraticCurveTo(-w - 2 + tailX * 0.2, -16, pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2 + 2.4;
          ctx.quadraticCurveTo(mx, my, pts[i][0], pts[i][1]);
        }
        ctx.quadraticCurveTo(w + 2 + tailX * 0.2, -16, 7.5, -29.5); ctx.closePath();
      };
      path(); paint(ctx, CAPE, OUT, 1.6);
      // cel shade band (right/inner) and gold trim
      ctx.save(); path(); ctx.clip();
      ctx.fillStyle = C(CAPE_D); ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(w + 4, -30); ctx.lineTo(w + 4 + tailX, hemY + 8); ctx.lineTo(1.5 + tailX * 0.5, hemY + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C('#ff7a8a'); ctx.beginPath(); ctx.moveTo(-6, -28); ctx.lineTo(-3.5, -28); ctx.lineTo(-5 + tailX * 0.3, hemY); ctx.lineTo(-w + tailX * 0.3, hemY); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = C(GOLD); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const mx = (pts[i - 1][0] + pts[i][0]) / 2, my = (pts[i - 1][1] + pts[i][1]) / 2 + 2.4;
        ctx.quadraticCurveTo(mx, my, pts[i][0], pts[i][1]);
      }
      ctx.stroke();
    };
    if (!back) drawCape();

    // sword behind body when swinging upward
    const hx = 7.5, hy = -22; // sword grip pivot
    const bladeOpt = { gx: hx, gy: hy, len: o.act === 'burst' ? 28 : 24, glow: o.glow == null ? 0.55 : o.glow, glowColor: o.act === 'skill' || o.act === 'burst' ? '#ffa860' : '#7fe4ff', blade: o.act === 'skill' || o.act === 'burst' ? '#ffe2b8' : '#bfefff' };
    let tip = null;
    if (swordFirst) tip = drawBlade(ctx, bAng, bladeOpt);

    // --- legs ---
    const s1 = Math.sin(ph) * run, s2 = -s1;
    const leg = (x0, s, c) => {
      const fx = x0 + s * 4.6, fy = -1.5 - Math.max(0, Math.cos(ph + (x0 < 0 ? 0 : Math.PI))) * 3.2 * run;
      limb(ctx, x0, -13, fx, fy, 4.6, '#2c3f86');
      ell(ctx, fx + 0.8, fy + 0.6, 3.6, 2.5, '#7a4b2a', OUT, 1.3);
      ell(ctx, fx + 0.8, fy - 0.6, 3.6, 1.1, GOLD, null);
    };
    leg(-3.7, s1); leg(3.7, s2);

    // --- off arm (behind torso) ---
    const armSw = Math.sin(ph) * 5 * run;
    limb(ctx, -7.5, -27, -9.5, -19 + armSw * 0.4, 3.8, TUNIC_D);
    ell(ctx, -9.8, -17.4 + armSw * 0.4, 2.2, 2.2, SKIN, OUT, 1.1);

    // --- torso ---
    ctx.beginPath(); ctx.moveTo(-7.4, -29); ctx.lineTo(7.4, -29); ctx.quadraticCurveTo(8.6, -21, 7, -13); ctx.lineTo(-7, -13); ctx.quadraticCurveTo(-8.6, -21, -7.4, -29); ctx.closePath();
    paint(ctx, TUNIC, OUT, 1.6);
    ctx.save(); ctx.clip(); ctx.fillStyle = C(TUNIC_D); ctx.fillRect(1.6, -30, 10, 20); ctx.fillStyle = C(BLUE); ctx.fillRect(-9, -29, 18, 3.4); ctx.restore();
    // sash and belt
    poly(ctx, [[-7.2, -27], [-3.6, -27], [4.6, -15], [1, -15]], BLUE, OUT, 1);
    ctx.fillStyle = C(GOLD); ctx.fillRect(-7.2, -17, 14.4, 3); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1; ctx.strokeRect(-7.2, -17, 14.4, 3);
    ell(ctx, 0, -15.5, 2.2, 2.2, '#8fe8ff', GOLD_D, 1);
    // short skirt flaps
    poly(ctx, [[-7.2, -14], [7.2, -14], [8.2, -10.4], [3, -11.6], [0, -9.6], [-3, -11.6], [-8.2, -10.4]], BLUE, OUT, 1.2);

    if (back) drawCape();

    // --- head ---
    const nod = o.hurt ? 1.2 : 0;
    const hxo = side * 1.2 * (sa < 0.4 ? 1 : 0.6), hcy = -37 + nod;
    // back hair mass + spikes
    ell(ctx, hxo - side * 1.5, hcy - 1, 11.8, 10.6, HAIR_D, OUT, 1.5);
    for (let i = 0; i < SPIKES.length; i++) {
      const s = SPIKES[i], a = s[0], L = s[1] * 0.78;
      const swayX = clamp(-vxl * 0.012, -2.5, 2.5) + Math.sin(t * 3 + i * 1.3) * 0.9 + (a < -1.57 ? -1 : 1) * run * 0.8;
      const bx = hxo + Math.cos(a) * 9.4, by = hcy + Math.sin(a) * 8.6;
      const tx = hxo + Math.cos(a) * (10 + L) + swayX - side * 1.2, ty = hcy + Math.sin(a) * (9.2 + L) * 1.05 + Math.abs(swayX) * 0.2;
      poly(ctx, [[hxo + Math.cos(a - s[2]) * 9.2, hcy + Math.sin(a - s[2]) * 8.4], [tx, ty], [hxo + Math.cos(a + s[2]) * 9.2, hcy + Math.sin(a + s[2]) * 8.4]], i % 2 ? HAIR : HAIR_D, OUT, 1.4);
      // golden tips
      poly(ctx, [[tx, ty], [bx + (tx - bx) * 0.68 - 1.1, by + (ty - by) * 0.68], [bx + (tx - bx) * 0.68 + 1.1, by + (ty - by) * 0.68]], HAIR_TIP, null);
    }
    // ahoge curl
    ctx.strokeStyle = C(OUT); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hxo, hcy - 9); ctx.quadraticCurveTo(hxo + 3 + Math.sin(t * 3) * 1.2, hcy - 17, hxo + 7, hcy - 14); ctx.stroke();
    ctx.strokeStyle = C(HAIR_L); ctx.lineWidth = 1.7; ctx.stroke();

    if (back) {
      // seen from behind: hair covers the whole head
      ell(ctx, hxo, hcy, 10.6, 9.8, HAIR, OUT, 1.5);
      ctx.save(); ctx.beginPath(); ctx.ellipse(hxo, hcy, 10.6, 9.8, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = C(HAIR_D); ctx.beginPath(); ctx.ellipse(hxo + 4, hcy + 5, 9, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C(HAIR_L); ctx.beginPath(); ctx.ellipse(hxo - 3.5, hcy - 5, 4.2, 2, -0.5, 0, TAU); ctx.fill(); ctx.restore();
      poly(ctx, [[hxo - 5, hcy + 8], [hxo - 2, hcy + 14], [hxo, hcy + 8], [hxo + 3, hcy + 15], [hxo + 5, hcy + 8]], HAIR, OUT, 1.2);
    } else {
      // face
      ell(ctx, hxo, hcy + 1, 10, 9, SKIN, OUT, 1.5);
      ctx.save(); ctx.beginPath(); ctx.ellipse(hxo, hcy + 1, 10, 9, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = C(SKIN_D); ctx.beginPath(); ctx.ellipse(hxo + 3.5, hcy + 6, 11, 6, 0, 0, TAU); ctx.fill(); ctx.restore();
      // eyes
      const fx = hxo + side * 3.2, spacing = 4.5 * (1 - 0.35 * side), ey = hcy + 1.6 + sa * 0.8;
      const blink = ((t * 1000) % 3700) < 130;
      const eo = o.eyes == null ? (blink ? 0.08 : 1) : o.eyes;
      const eyeAt = (ex, near) => {
        const rx = 3.0 * (near ? 1 : 1 - 0.28 * side), ry = 4.5 * eo + 0.6;
        if (o.hurt) { // > < eyes
          ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.8; ctx.beginPath();
          const d = ex < fx ? 1 : -1; ctx.moveTo(ex - d * 2.6, ey - 2.4); ctx.lineTo(ex + d * 2, ey); ctx.lineTo(ex - d * 2.6, ey + 2.4); ctx.stroke(); return;
        }
        if (eo < 0.2) { ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(ex, ey - 0.4, rx, 0.15, Math.PI - 0.15); ctx.stroke(); return; }
        ell(ctx, ex, ey, rx + 0.5, ry + 0.4, OUT, null);
        ell(ctx, ex, ey + 0.3, rx, ry, '#ffb23a', null);
        // iris gradient (cel: two flat bands)
        ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey + 0.3, rx, ry, 0, 0, TAU); ctx.clip();
        ctx.fillStyle = C('#ff7a2a'); ctx.fillRect(ex - rx, ey + ry * 0.15, rx * 2, ry * 1.2);
        ctx.fillStyle = C('#3a1a10'); ctx.beginPath(); ctx.ellipse(ex + side * 0.4, ey + 0.8, rx * 0.5, ry * 0.5, 0, 0, TAU); ctx.fill();
        ctx.restore();
        ell(ctx, ex - rx * 0.32, ey - ry * 0.35, 1.25, 1.55, '#ffffff', null);
        ell(ctx, ex + rx * 0.35, ey + ry * 0.45, 0.7, 0.7, '#ffffff', null);
        // upper lash
        ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ex - rx - 0.8, ey - ry * 0.35); ctx.quadraticCurveTo(ex, ey - ry - 1.6, ex + rx + 0.8, ey - ry * 0.5); ctx.stroke();
      };
      eyeAt(fx - spacing, side < 0.5); eyeAt(fx + spacing, true);
      // blush + mouth
      ctx.fillStyle = 'rgba(255,120,130,0.35)';
      ctx.beginPath(); ctx.ellipse(fx - spacing - 0.6, ey + 4.6, 2.2, 1.2, 0, 0, TAU); ctx.ellipse(fx + spacing + 0.6, ey + 4.6, 2.2, 1.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = C('#7a3a30'); ctx.lineWidth = 1.2; ctx.lineCap = 'round'; ctx.beginPath();
      if (o.act === 'attack' || swing || o.act === 'skill' || o.act === 'burst') { ctx.ellipse(fx, ey + 6.4, 1.6, 1.3, 0, 0, TAU); }
      else if (o.hurt) { ctx.moveTo(fx - 1.6, ey + 7); ctx.lineTo(fx + 1.6, ey + 6); }
      else { ctx.moveTo(fx - 1.5, ey + 6.2); ctx.quadraticCurveTo(fx, ey + 7.6, fx + 1.5, ey + 6.2); }
      ctx.stroke();
      // fringe: zig-zag bangs over forehead
      const fy = hcy - 1;
      ctx.beginPath(); ctx.moveTo(hxo - 10.8, fy + 1.5); ctx.bezierCurveTo(hxo - 11, fy - 12, hxo + 11, fy - 12, hxo + 10.8, fy + 1.5);
      ctx.lineTo(hxo + 8.2, fy + 4.6); ctx.lineTo(hxo + 6, fy - 1.2); ctx.lineTo(hxo + 2.2, fy + 6); ctx.lineTo(hxo - 1.2, fy - 1);
      ctx.lineTo(hxo - 4.6, fy + 5.6); ctx.lineTo(hxo - 6.4, fy - 0.8); ctx.lineTo(hxo - 9, fy + 4); ctx.closePath();
      paint(ctx, HAIR, OUT, 1.5);
      ctx.save(); ctx.clip();
      ctx.fillStyle = C(HAIR_D); ctx.beginPath(); ctx.ellipse(hxo + 7, fy + 2, 7, 9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = C(HAIR_L); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hxo - 2.5, fy - 2.2, 7.4, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
      ctx.restore();
      // forehead gem circlet
      ell(ctx, hxo + side * 1.2, fy - 6.4, 1.7, 1.7, '#8fe8ff', GOLD_D, 1);
    }

    // --- sword arm and sword (front) ---
    let armAng = bAng;
    const hxy = [hx + Math.cos(armAng) * 2.2, hy + Math.sin(armAng) * 1.6];
    if (!swordFirst) {
      limb(ctx, 7, -27, hx, hy + 1, 3.9, TUNIC);
      tip = drawBlade(ctx, bAng, bladeOpt);
    } else {
      limb(ctx, 7, -27, hx, hy + 1, 3.9, TUNIC);
    }
    ell(ctx, hx, hy + 1, 2.4, 2.4, SKIN, OUT, 1.1); // hand over the grip
    ctx.restore();
    setMix(0, 0, 0, 0);
    return tip;
  }

  const Sprites = {
    ELEM, elem, drawElementGlyph, mixHex,

    /** Free-form hero pose (used by the cinematic). */
    drawHeroPose(ctx, x, y, o) { o = o || {}; o.x = x; o.y = y; return drawHero(ctx, o); },

    drawPlayer(ctx, p, t, opts) {
      if (!p) return;
      opts = opts || {};
      const C0 = AT.CFG || {};
      const dur = (C0.SWORD && C0.SWORD.duration) || 0.2;
      const anim = p.anim || 'idle';
      const o = { x: p.x, y: p.y, face: p.facing || 0, vx: p.vx || 0, vy: p.vy || 0, t: t || 0, ghost: !!opts.ghost, alpha: opts.alpha == null ? 1 : opts.alpha, act: anim };
      const moving = p.moving || (Math.abs(p.vx || 0) + Math.abs(p.vy || 0) > 20);
      o.run = anim === 'run' || (moving && anim === 'idle') ? 1 : 0;
      o.phase = (p.animT || t || 0) * 13;
      o.bob = anim === 'idle' ? (Math.sin(t * 2.6) * 0.5 + 0.5) * 1.5 : (o.run ? Math.abs(Math.sin(o.phase)) * 2 : 0);
      o.flash = p.hitFlash > 0 ? Math.min(0.85, p.hitFlash * 6) : 0;
      o.hurt = anim === 'hurt';
      if (anim === 'attack' || p.swinging > 0) {
        const pr = clamp(1 - (p.swinging || 0) / dur, 0, 1);
        const arc = (C0.SWORD && C0.SWORD.arc) || 2.6;
        const dir = (p.combo % 2) ? -1 : 1;
        const e = pr * pr * (3 - 2 * pr);
        o.swingAng = (p.swingAngle != null ? p.swingAngle : p.facing) + dir * arc * (e - 0.5);
        o.face = p.swingAngle != null ? p.swingAngle : o.face;
        o.lean = 0.14 * (e < 0.5 ? e * 2 : (1 - e) * 2);
        o.act = 'attack';
      } else if (anim === 'dash') {
        o.dashing = true; o.lean = 0.5; o.squash = 0.12; o.run = 1; o.phase = (t || 0) * 30; o.bob = 0;
      } else if (anim === 'skill') { o.lean = 0.12; o.glow = 0.9; }
      else if (anim === 'burst') { o.glow = 1; o.bob = 2 + Math.sin(t * 8); }
      if (p.dead || anim === 'dead') {
        const tt = clamp((p.animT || 0) / 0.55, 0, 1);
        o.lie = tt * tt * (3 - 2 * tt); o.lieDir = (p.facing != null && Math.cos(p.facing) < 0) ? -1 : 1;
        o.run = 0; o.bob = 0; o.eyes = 0.05; o.glow = 0.1; o.act = 'dead'; o.hurt = false; o.swingAng = null; o.lean = 0;
        o.alpha *= 1 - 0.35 * clamp(((p.animT || 0) - 0.5) / 1.0, 0, 1);
      } else if (!opts.ghost && p.invuln > 0 && anim !== 'dash' && anim !== 'hurt') {
        o.alpha *= 0.62 + 0.38 * Math.abs(Math.sin(t * 28));
      }
      const tip = drawHero(ctx, o);
      if (!opts.ghost && (anim === 'burst')) glowBlob(ctx, p.x, p.y - 22, 70, '#ff9a4a', 0.5 + 0.2 * Math.sin(t * 14));
      return tip;
    },

    // ---------- SLIME ----------
    drawEnemy(ctx, e, t) {
      if (!e) return;
      if (e.kind === 'boss' || e.id === 'mitachurl' || e.id === 'stormdrake') return this.drawBoss(ctx, e, t);
      const E = elem(e.element), k = (e.r || 14) / 14;
      const id = e.id || 0, ph = t * 4.2 + id * 1.37;
      let sx = 1, sy = 1, lift = 0;
      const st = e.state || 'idle';
      const mv = Math.abs(e.vx || 0) + Math.abs(e.vy || 0);
      if (st === 'windup') {
        const p = e.telegraph && e.telegraph.dur ? clamp(e.telegraph.t / e.telegraph.dur, 0, 1) : clamp((e.stateT || 0) / (e.windup || 0.5), 0, 1);
        sy = 1 - 0.34 * p; sx = 1 + 0.26 * p; lift = 0;
        sx += Math.sin(t * 40) * 0.025 * p;
      } else if (st === 'attack') { sy = 1.22; sx = 0.86; lift = 7; }
      else if (st === 'recover') { const p = clamp((e.stateT || 0) / (e.recover || 0.7), 0, 1); sy = 0.78 + 0.22 * p; sx = 1.18 - 0.18 * p; }
      else if (mv > 6 || st === 'chase' || st === 'wander') { const b = Math.abs(Math.sin(ph)); lift = b * 5; sy = 1.0 + (0.1 * (1 - b)) - 0.06 * b; sx = 2 - sy * 1.0 - 0.0; sx = 1 + (1 - sy) * 0.9; }
      else { sy = 1 + Math.sin(ph) * 0.06; sx = 1 - Math.sin(ph) * 0.045; }

      let dying = 0;
      if (e.dead) { dying = clamp((e.deathT || 0) / 0.35, 0, 1); if (dying >= 1) return; sy *= 1 - dying * 0.7; sx *= 1 + dying * 0.4; }

      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.globalAlpha *= 1 - dying;
      // shadow
      ctx.fillStyle = 'rgba(10,12,30,0.28)'; ctx.beginPath(); ctx.ellipse(0, 2, 15 * k * (1 - lift * 0.02), 5 * k, 0, 0, TAU); ctx.fill();
      if (e.hitFlash > 0) setMix(255, 255, 255, Math.min(0.85, e.hitFlash * 6)); else setMix(0, 0, 0, 0);
      ctx.translate(0, -lift * k);
      ctx.scale(sx * k, sy * k);

      const hw = 15.5, hh = 21;
      const body = () => {
        ctx.beginPath(); ctx.moveTo(-hw, -1);
        ctx.bezierCurveTo(-hw - 2, -hh * 0.62, -hw * 0.5, -hh - 1, 0, -hh);
        ctx.bezierCurveTo(hw * 0.5, -hh - 1, hw + 2, -hh * 0.62, hw, -1);
        ctx.quadraticCurveTo(0, 5, -hw, -1); ctx.closePath();
      };
      body(); paint(ctx, E.main, OUT, 1.8);
      ctx.save(); body(); ctx.clip();
      // cel shade bottom + rim light
      ctx.fillStyle = C(E.dark); ctx.beginPath(); ctx.ellipse(2, 2, hw * 1.3, hh * 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = C(E.light); ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.ellipse(0, -hh * 0.55, hw * 0.62, hh * 0.36, 0, 0, TAU); ctx.fill(); ctx.globalAlpha /= 0.55;
      ctx.restore();
      // glossy highlights
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(-6.4, -hh * 0.72, 3.8, 2.2, -0.7, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-2.4, -hh * 0.88, 1.5, 1, -0.4, 0, TAU); ctx.fill();
      body(); ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.8; ctx.stroke();

      // element crest
      const fl = Math.sin(t * 9 + id) * 1.4;
      switch (e.element) {
        case 'pyro':
          ctx.beginPath(); ctx.moveTo(-4, -hh + 1); ctx.quadraticCurveTo(-5, -hh - 8, 0, -hh - 12 + fl); ctx.quadraticCurveTo(1, -hh - 6, 4.5, -hh - 8 - fl * 0.5); ctx.quadraticCurveTo(5.5, -hh - 2, 4, -hh + 1); ctx.closePath(); paint(ctx, '#ffb04a', OUT, 1.3); break;
        case 'hydro':
          ctx.beginPath(); ctx.moveTo(0, -hh - 9 + fl * 0.3); ctx.quadraticCurveTo(5, -hh - 2, 3.2, -hh + 0.6); ctx.quadraticCurveTo(0, -hh + 2, -3.2, -hh + 0.6); ctx.quadraticCurveTo(-5, -hh - 2, 0, -hh - 9 + fl * 0.3); ctx.closePath(); paint(ctx, E.light, OUT, 1.2); break;
        case 'electro':
          poly(ctx, [[-1, -hh - 1], [-4, -hh - 8], [-0.5, -hh - 7], [-2, -hh - 14 + fl], [3.5, -hh - 6], [0.4, -hh - 6.4], [2, -hh - 1]], '#ffe66a', OUT, 1.1); break;
        case 'cryo':
          poly(ctx, [[-4, -hh + 1], [-3, -hh - 9], [-0.8, -hh + 0.5]], E.light, OUT, 1.1); poly(ctx, [[-1, -hh + 0.5], [1.5, -hh - 13], [3.5, -hh + 0.5]], E.light, OUT, 1.1); break;
        case 'geo':
          poly(ctx, [[-4.5, -hh + 1.5], [-3, -hh - 5], [0, -hh - 3], [1, -hh + 1.5]], E.light, OUT, 1.1); poly(ctx, [[1, -hh + 1], [3, -hh - 7], [6, -hh - 2], [6, -hh + 2]], E.main, OUT, 1.1); break;
        case 'anemo':
          ctx.strokeStyle = C(E.light); ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, -hh + 0.5); ctx.bezierCurveTo(-4, -hh - 7, 6, -hh - 9, 4, -hh - 3 + fl * 0.3); ctx.stroke(); break;
      }

      // face (looks toward facing)
      const fcx = Math.cos(e.facing || 0) * 2.2, fcy = Math.sin(e.facing || 0) * 1.1 - hh * 0.38;
      const angry = st === 'windup' || st === 'attack' || st === 'chase';
      const blink = ((t * 1000 + id * 377) % 3200) < 110;
      for (let s = -1; s <= 1; s += 2) {
        const ex = fcx + s * 5.1, ey = fcy;
        if (blink) { ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ex - 2.4, ey); ctx.lineTo(ex + 2.4, ey); ctx.stroke(); continue; }
        ell(ctx, ex, ey, 3, 4.1, OUT, null);
        ell(ctx, ex - 0.7, ey - 1.4, 1.2, 1.5, '#ffffff', null);
        ell(ctx, ex + 0.9, ey + 1.3, 0.6, 0.6, '#ffffff', null);
        if (angry) { ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(ex - s * 3.6, ey - 5.2 + 0 * s); ctx.lineTo(ex + s * 3, ey - 3.4 - s * 0); ctx.stroke(); }
      }
      ctx.strokeStyle = C(OUT); ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath();
      if (st === 'windup' || st === 'attack') ctx.ellipse(fcx, fcy + 7, 2.8, st === 'attack' ? 3 : 1.8, 0, 0, TAU);
      else { ctx.moveTo(fcx - 2.3, fcy + 6); ctx.quadraticCurveTo(fcx, fcy + 8.2, fcx + 2.3, fcy + 6); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(fcx - 9.5, fcy + 3.5, 2, 1.1, 0, 0, TAU); ctx.ellipse(fcx + 9.5, fcy + 3.5, 2, 1.1, 0, 0, TAU); ctx.fill();
      ctx.restore();
      setMix(0, 0, 0, 0);

      // aura marker (small element glyph badge above head)
      if (e.aura && !e.dead) {
        const ay = e.y - (hh * sy + 17) * k - lift * k + Math.sin(t * 4 + id) * 1.2;
        const dur = (AT.CFG && AT.CFG.REACTION && AT.CFG.REACTION.auraDuration) || 6;
        const fr = clamp((e.aura.t != null ? e.aura.t : dur) / dur, 0, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(14,18,40,0.78)'; ctx.beginPath(); ctx.arc(e.x, ay, 8.6, 0, TAU); ctx.fill();
        ctx.strokeStyle = C(elem(e.aura.element).main); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(e.x, ay, 8.6, -Math.PI / 2, -Math.PI / 2 + TAU * fr); ctx.stroke();
        drawElementGlyph(ctx, e.aura.element, e.x, ay, 5.4);
        ctx.restore();
      }
    },

    // ---------- BOSSES ----------
    drawBoss(ctx, b, t) {
      if (!b) return;
      if (b.id === 'stormdrake' || b.type === 'stormdrake') return drawDrake(ctx, b, t);
      return drawMitachurl(ctx, b, t);
    },

    // ---------- CHEST ----------
    drawChest(ctx, c, t) {
      if (!c) return;
      const open = !!c.opened;
      ctx.save(); ctx.translate(c.x, c.y);
      ctx.fillStyle = 'rgba(10,12,30,0.3)'; ctx.beginPath(); ctx.ellipse(0, 4, 24, 7, 0, 0, TAU); ctx.fill();
      if (!open) glowBlob(ctx, 0, -12, 40 + Math.sin(t * 3) * 4, '#ffd36a', 0.28 + 0.1 * Math.sin(t * 3));
      const WOOD = '#8a5428', WOOD_D = '#5e3516', WOOD_L = '#b87838';
      // lower box
      ctx.beginPath(); ctx.moveTo(-19, 3); ctx.lineTo(-19, -12); ctx.lineTo(19, -12); ctx.lineTo(19, 3); ctx.quadraticCurveTo(0, 7, -19, 3); ctx.closePath(); paint(ctx, WOOD, OUT, 1.8);
      ctx.save(); ctx.clip();
      ctx.fillStyle = WOOD_D; ctx.fillRect(-20, -2, 40, 12);
      ctx.strokeStyle = WOOD_L; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-19, -7 + i * 0.01); ctx.lineTo(19, -7); ctx.stroke(); break; }
      ctx.restore();
      // gold bands
      for (const bx of [-14, 11]) { ctx.fillStyle = GOLD; ctx.fillRect(bx, -12, 4, 15); ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.strokeRect(bx, -12, 4, 15); }
      if (open) {
        // inner light + treasure + lid tilted back
        const g = ctx.createLinearGradient(0, -12, 0, -52); g.addColorStop(0, 'rgba(255,230,140,0.85)'); g.addColorStop(1, 'rgba(255,230,140,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-17, -12); ctx.lineTo(-26, -48); ctx.lineTo(26, -48); ctx.lineTo(17, -12); ctx.closePath(); ctx.globalAlpha *= 0.5 + 0.2 * Math.sin(t * 4); ctx.fill(); ctx.restore();
        ell(ctx, 0, -12, 18, 4, '#ffde7a', OUT, 1.4);
        for (let i = 0; i < 6; i++) ell(ctx, -12 + i * 4.8, -13 + (i % 2) * -1.5, 2.6, 2, i % 3 === 0 ? '#8ff0ff' : GOLD, OUT, 0.8);
        ctx.beginPath(); ctx.moveTo(-19, -17); ctx.quadraticCurveTo(0, -33, 19, -17); ctx.lineTo(16, -26); ctx.quadraticCurveTo(0, -42, -16, -26); ctx.closePath(); paint(ctx, WOOD_D, OUT, 1.6);
        ctx.strokeStyle = C(GOLD); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-17, -22); ctx.quadraticCurveTo(0, -38, 17, -22); ctx.stroke();
      } else {
        // arched lid
        ctx.beginPath(); ctx.moveTo(-19, -12); ctx.quadraticCurveTo(-19, -29, 0, -29); ctx.quadraticCurveTo(19, -29, 19, -12); ctx.closePath(); paint(ctx, WOOD_L, OUT, 1.8);
        ctx.save(); ctx.clip(); ctx.fillStyle = C(WOOD); ctx.beginPath(); ctx.ellipse(6, -8, 24, 14, 0, 0, TAU); ctx.fill(); ctx.restore();
        for (const bx of [-14, 11]) { ctx.save(); ctx.beginPath(); ctx.moveTo(-19, -12); ctx.quadraticCurveTo(-19, -29, 0, -29); ctx.quadraticCurveTo(19, -29, 19, -12); ctx.closePath(); ctx.clip(); ctx.fillStyle = C(GOLD); ctx.fillRect(bx, -30, 4, 18); ctx.restore(); }
        ctx.strokeStyle = C(GOLD); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-18, -17); ctx.quadraticCurveTo(0, -33, 18, -17); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.ellipse(-8, -22, 5, 1.6, -0.4, 0, TAU); ctx.fill();
        // lock plate with gem
        poly(ctx, [[-5, -17], [5, -17], [5.5, -9], [0, -6], [-5.5, -9]], GOLD, OUT, 1.4);
        ell(ctx, 0, -12, 2.4, 2.8, '#6ae0ff', OUT, 1); ell(ctx, -0.7, -13, 0.8, 0.9, '#ffffff', null);
        // sparkles
        for (let i = 0; i < 3; i++) {
          const a = t * 1.5 + i * 2.1, sp = Math.max(0, Math.sin(t * 3 + i * 2.4));
          const sx = Math.cos(a) * 24, sy = -22 + Math.sin(a * 1.3) * 12;
          ctx.save(); ctx.globalAlpha *= sp; ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sx - 3, sy); ctx.lineTo(sx + 3, sy); ctx.moveTo(sx, sy - 3); ctx.lineTo(sx, sy + 3); ctx.stroke(); ctx.restore();
        }
      }
      ctx.restore();
    },

    // ---------- PICKUPS ----------
    drawPickup(ctx, p, t) {
      if (!p || p.collected) return;
      const id = p.id || (p.x * 7 + p.y * 3), bob = Math.sin(t * 3 + id) * 2.4 - 6;
      if (p.life != null && p.life < 4 && Math.sin(t * 22) < -0.3) return; // blink before despawn
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = 'rgba(10,12,30,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 6 - bob * 0.15, 2.4, 0, 0, TAU); ctx.fill();
      ctx.translate(0, bob);
      if (p.type === 'coin') {
        const w = Math.abs(Math.cos(t * 4.2 + id)), d = Math.sin(t * 4.2 + id);
        glowBlob(ctx, 0, 0, 16, '#ffd860', 0.35);
        ell(ctx, 0, 0, Math.max(0.8, 6.4 * w), 6.4, '#f5c33a', OUT, 1.4);
        if (w > 0.25) { ell(ctx, 0, 0, 4 * w, 4.2, '#ffe488', null); ctx.fillStyle = C('#c88a18'); ctx.fillRect(-0.9 * w, -2.6, 1.8 * w, 5.2); }
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(-2 * w * (d > 0 ? 1 : -1), -3.6, 1.1, 0.8, 0, 0, TAU); ctx.fill();
      } else if (p.type === 'gem') {
        glowBlob(ctx, 0, 0, 18, '#6ae6ff', 0.5);
        const sh = Math.sin(t * 2 + id) * 1.2;
        poly(ctx, [[0, -8], [6.4, -3], [4.2, 6], [-4.2, 6], [-6.4, -3]], '#3cc8f0', OUT, 1.5);
        poly(ctx, [[0, -8], [6.4, -3], [0, -1.5], [-6.4, -3]], '#b4f4ff', null);
        poly(ctx, [[0, -1.5], [6.4, -3], [4.2, 6]], '#1a8ec8', null);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3 + sh, -6); ctx.lineTo(-4 + sh, -3); ctx.stroke();
        if (Math.sin(t * 5 + id) > 0.6) { ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(5, -9); ctx.lineTo(5, -4); ctx.moveTo(2.5, -6.5); ctx.lineTo(7.5, -6.5); ctx.stroke(); }
      } else { // potion
        glowBlob(ctx, 0, 0, 18, '#ff6a8a', 0.4);
        ctx.beginPath(); ctx.moveTo(-2.6, -9); ctx.lineTo(2.6, -9); ctx.lineTo(2.6, -4.5); ctx.bezierCurveTo(8.5, -1.5, 8, 6.4, 0, 6.4); ctx.bezierCurveTo(-8, 6.4, -8.5, -1.5, -2.6, -4.5); ctx.closePath();
        paint(ctx, '#ffe6ee', OUT, 1.5);
        ctx.save(); ctx.clip(); ctx.fillStyle = C('#ff3d6a'); ctx.fillRect(-10, -1.2 + Math.sin(t * 4) * 0.5, 20, 12); ctx.fillStyle = C('#ff8aa6'); ctx.fillRect(-10, -1.2 + Math.sin(t * 4) * 0.5, 20, 2); ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-3.6, 1.6, 1.1, 2.4, 0.2, 0, TAU); ctx.fill();
        ell(ctx, 0, -10.4, 3.2, 2.2, '#b8793c', OUT, 1.2);
        ctx.strokeStyle = C(GOLD); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2.7, -7.2); ctx.lineTo(2.7, -7.2); ctx.stroke();
      }
      ctx.restore();
    }
  };

  // ---------- MITACHURL ----------
  function drawMitachurl(ctx, b, t) {
    const k = (b.r || 30) / 30, fa = b.facing || 0, ca = Math.cos(fa), sx = ca < -0.1 ? -1 : 1;
    const st = b.state || 'idle';
    const mv = Math.abs(b.vx || 0) + Math.abs(b.vy || 0);
    const walk = mv > 8 ? 1 : 0, ph = t * 7 + (b.id || 0);
    let wp = 0, atk = 0;
    if (st === 'windup') wp = b.telegraph && b.telegraph.dur ? clamp(b.telegraph.t / b.telegraph.dur, 0, 1) : clamp((b.stateT || 0) / 0.9, 0, 1);
    if (st === 'attack') atk = clamp((b.stateT || 0) / 0.25, 0, 1);
    const enraged = (b.phase || 1) >= 2;
    let dying = 0;
    if (b.dead) { dying = clamp((b.deathT || 0) / 1.0, 0, 1); if (dying >= 1) return; }
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(k, k);
    ctx.globalAlpha *= 1 - dying;
    if (b.hitFlash > 0) setMix(255, 255, 255, Math.min(0.8, b.hitFlash * 6)); else if (wp > 0) setMix(255, 80, 60, wp * 0.22); else setMix(0, 0, 0, 0);
    ctx.fillStyle = 'rgba(10,12,30,0.32)'; ctx.beginPath(); ctx.ellipse(0, 4, 38, 11, 0, 0, TAU); ctx.fill();
    if (enraged) glowBlob(ctx, 0, -40, 60, '#ff3a2a', 0.22 + 0.08 * Math.sin(t * 6));
    const bob = walk ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2) * 1.2;
    ctx.translate(0, -bob);
    if (dying) { ctx.rotate(dying * 0.6 * sx); ctx.translate(0, dying * 10); }
    ctx.scale(sx, 1 - wp * 0.05);

    const HIDE = '#8a6648', HIDE_D = '#5a3f2b', SKINB = '#7f7466', SKINB_D = '#564d44', WOODC = '#7a4e2a';
    // legs
    const ls = Math.sin(ph) * 5 * walk;
    for (const s of [-1, 1]) {
      const lx = s * 14, ly = -2 + (s > 0 ? ls : -ls) * 0.3;
      limb(ctx, lx, -22, lx + (s > 0 ? ls : -ls) * 0.8, ly, 13, SKINB_D);
      ell(ctx, lx + (s > 0 ? ls : -ls) * 0.8 + 1, ly + 1, 10, 5.5, '#4a3524', OUT, 1.6);
    }
    // club (behind torso when raised)
    const clubAng = st === 'windup' ? -2.0 - wp * 0.5 : st === 'attack' ? -2.5 + atk * 3.0 : -1.25 + Math.sin(t * 2) * 0.05;
    const shx = -20, shy = -52;
    const drawClub = () => {
      const len = 52, cx = Math.cos(clubAng), cy = Math.sin(clubAng) * 0.95;
      const hx = shx + cx * 10, hy = shy + cy * 10 + 6;
      limb(ctx, shx, shy, hx, hy, 11, SKINB);
      const x1 = hx + cx * len, y1 = hy + cy * len;
      line(ctx, hx, hy, x1, y1, OUT, 15); line(ctx, hx, hy, x1, y1, WOODC, 12.5);
      line(ctx, hx + cx * 6, hy + cy * 6 - 3, x1, y1 - 3, '#a06a3a', 3.5);
      // fat head with spikes
      ell(ctx, x1, y1, 11, 12, '#6e4624', OUT, 1.8);
      for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.3; poly(ctx, [[x1 + Math.cos(a - 0.2) * 9, y1 + Math.sin(a - 0.2) * 10], [x1 + Math.cos(a) * 17, y1 + Math.sin(a) * 18], [x1 + Math.cos(a + 0.2) * 9, y1 + Math.sin(a + 0.2) * 10]], '#d8d0b8', OUT, 1.2); }
      ell(ctx, x1 - 3, y1 - 3, 4, 3, '#9a6a3a', null);
      ell(ctx, hx, hy, 6.5, 6.5, SKINB, OUT, 1.5);
    };
    if (Math.sin(clubAng) < -0.2) drawClub();

    // torso
    ctx.beginPath(); ctx.moveTo(-28, -50); ctx.bezierCurveTo(-34, -30, -26, -18, -18, -16); ctx.lineTo(18, -16); ctx.bezierCurveTo(26, -18, 34, -30, 28, -50);
    ctx.bezierCurveTo(22, -66, -22, -66, -28, -50); ctx.closePath(); paint(ctx, SKINB, OUT, 2.2);
    ctx.save(); ctx.clip();
    ctx.fillStyle = C(SKINB_D); ctx.beginPath(); ctx.ellipse(14, -26, 22, 26, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.ellipse(-12, -54, 11, 5, -0.4, 0, TAU); ctx.fill();
    // war paint
    ctx.strokeStyle = C('#c8402c'); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-10, -52); ctx.lineTo(0, -40); ctx.lineTo(10, -52); ctx.moveTo(-9, -40); ctx.lineTo(0, -29); ctx.lineTo(9, -40); ctx.stroke();
    ctx.restore();
    // fur wrap + belt
    poly(ctx, [[-27, -26], [27, -26], [30, -17], [20, -12], [12, -17], [4, -10], [-4, -17], [-12, -11], [-20, -17], [-30, -17]], HIDE, OUT, 1.8);
    ctx.fillStyle = C(HIDE_D); ctx.fillRect(-27, -26, 54, 4);
    ell(ctx, 0, -24, 4.4, 4.4, '#e6dcc0', OUT, 1.3);
    poly(ctx, [[-14, -62], [14, -62], [22, -56], [18, -52], [-18, -52], [-22, -56]], HIDE, OUT, 1.8); // shoulder fur
    for (let i = -2; i <= 2; i++) poly(ctx, [[i * 8 - 3, -53], [i * 8 + 3, -53], [i * 8, -47]], HIDE_D, null);

    // head + mask
    const hy = -70;
    ell(ctx, 0, hy + 2, 15, 13, SKINB_D, OUT, 1.8);
    ctx.beginPath(); ctx.moveTo(-14, hy - 2); ctx.bezierCurveTo(-15, hy - 16, 15, hy - 16, 14, hy - 2); ctx.bezierCurveTo(15, hy + 8, 6, hy + 16, 0, hy + 16); ctx.bezierCurveTo(-6, hy + 16, -15, hy + 8, -14, hy - 2); ctx.closePath();
    paint(ctx, '#ece4cc', OUT, 2);
    ctx.save(); ctx.clip();
    ctx.fillStyle = C('#cfc4a4'); ctx.beginPath(); ctx.ellipse(8, hy + 4, 12, 16, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = C('#c8402c'); ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, hy - 7); ctx.lineTo(-3, hy - 3); ctx.moveTo(13, hy - 7); ctx.lineTo(3, hy - 3); ctx.moveTo(0, hy - 14); ctx.lineTo(0, hy + 14); ctx.stroke();
    ctx.strokeStyle = C('#2a1c18'); ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-6, hy + 9); ctx.lineTo(-6, hy + 15); ctx.moveTo(0, hy + 9); ctx.lineTo(0, hy + 16); ctx.moveTo(6, hy + 9); ctx.lineTo(6, hy + 15); ctx.stroke();
    ctx.restore();
    // eyes (glowing slits)
    const eg = enraged || wp > 0.2 ? '#ff4a2a' : '#ffb04a';
    for (const s of [-1, 1]) { poly(ctx, [[s * 3.2, hy - 1.2], [s * 9.4, hy - 3.6], [s * 9, hy + 0.6], [s * 3.6, hy + 1.8]], '#1c1210', null); poly(ctx, [[s * 4.6, hy - 0.6], [s * 8.2, hy - 1.8], [s * 7.8, hy + 0.2]], eg, null); }
    glowBlob(ctx, -6, hy - 1, 9, eg, 0.4); glowBlob(ctx, 6, hy - 1, 9, eg, 0.4);
    // horns + feathers
    for (const s of [-1, 1]) {
      poly(ctx, [[s * 12, hy - 8], [s * 22, hy - 20], [s * 18, hy - 3]], '#e0d6b8', OUT, 1.6);
      poly(ctx, [[s * 9, hy - 12], [s * 11, hy - 26], [s * 14, hy - 12]], s > 0 ? '#c8402c' : '#3a7ab8', OUT, 1.3);
    }

    // shield arm (front)
    const sxp = 24, syp = -38 + wp * -6;
    limb(ctx, 24, -52, sxp, syp, 11, SKINB);
    ell(ctx, sxp + 8, syp + 2, 17, 22, '#8a5a30', OUT, 2.2);
    ell(ctx, sxp + 8, syp + 2, 13, 18, '#a8743c', null);
    ctx.strokeStyle = C('#6a4020'); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(sxp + 8, syp - 16); ctx.lineTo(sxp + 8, syp + 20); ctx.moveTo(sxp - 4, syp + 2); ctx.lineTo(sxp + 20, syp + 2); ctx.stroke();
    ell(ctx, sxp + 8, syp + 2, 4.6, 4.6, '#d8d0b8', OUT, 1.4);
    ctx.strokeStyle = C('#c8402c'); ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(sxp + 8, syp + 2, 10, 0.6, 2.4); ctx.stroke();
    ell(ctx, sxp + 8, syp + 2, 17, 22, null, '#3a2a1a', 2.2);

    if (Math.sin(clubAng) >= -0.2) drawClub();
    ctx.restore();
    setMix(0, 0, 0, 0);
  }

  // ---------- STORM DRAKE ----------
  function drawDrake(ctx, b, t) {
    const k = (b.r || 34) / 34, fa = b.facing || 0, sx = Math.cos(fa) < -0.1 ? -1 : 1;
    const st = b.state || 'idle', id = b.id || 0;
    let wp = 0;
    if (st === 'windup') wp = b.telegraph && b.telegraph.dur ? clamp(b.telegraph.t / b.telegraph.dur, 0, 1) : clamp((b.stateT || 0) / 1, 0, 1);
    const enraged = (b.phase || 1) >= 2;
    const hover = -36 + Math.sin(t * 2.3 + id) * 5;
    const flapSpd = st === 'attack' ? 9 : 6;
    const flap = Math.sin(t * flapSpd + id) * (0.55 - wp * 0.25) + wp * 0.3;
    let dying = 0;
    if (b.dead) { dying = clamp((b.deathT || 0) / 1.0, 0, 1); if (dying >= 1) return; }
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(k, k);
    ctx.globalAlpha *= 1 - dying * 0.9;
    // ground shadow (shrinks as it rises)
    ctx.fillStyle = 'rgba(10,12,30,0.3)'; ctx.beginPath(); ctx.ellipse(0, 6, 30 - hover * -0.2 + Math.sin(t * 2.3) * 2, 9, 0, 0, TAU); ctx.fill();
    if (b.hitFlash > 0) setMix(255, 255, 255, Math.min(0.8, b.hitFlash * 6)); else setMix(0, 0, 0, 0);
    ctx.translate(0, hover + dying * 30);
    ctx.scale(sx, 1);
    glowBlob(ctx, 0, 0, 78 + wp * 24, enraged ? '#8aa8ff' : '#4aa0ff', 0.28 + wp * 0.3 + 0.06 * Math.sin(t * 9));

    const BODY = '#2e78f0', BODY_D = '#1a3fb0', BELLY = '#bdeaff', WING = '#1b3aa0', BONE = '#8fd8ff';
    // far wing
    const wing = (dir, scaleY, shade) => {
      ctx.save(); ctx.translate(-2, -8); ctx.rotate(-0.25 + flap * dir);
      const pts = [[0, 0], [-8, -34 * scaleY], [-30, -62 * scaleY], [-32, -38 * scaleY], [-52, -50 * scaleY], [-48, -24 * scaleY], [-70, -26 * scaleY], [-50, -6 * scaleY], [-22, 2]];
      poly(ctx, pts, shade ? '#142a78' : WING, OUT, 1.8);
      ctx.save(); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.clip();
      const g = ctx.createLinearGradient(0, 0, -60, -40 * scaleY); g.addColorStop(0, 'rgba(120,200,255,0.6)'); g.addColorStop(1, 'rgba(60,110,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-80, -80, 90, 90); ctx.restore();
      ctx.strokeStyle = C(BONE); ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); for (const i of [2, 4, 6]) { ctx.moveTo(0, 0); ctx.lineTo(pts[i][0], pts[i][1]); } ctx.stroke();
      ctx.restore();
    };
    wing(-1, 0.9, true);

    // tail (segments)
    const tail = [];
    for (let i = 0; i < 8; i++) tail.push([-14 - i * 9, 4 + Math.sin(t * 3 + i * 0.7 + id) * (2 + i * 1.1) + i * 0.6]);
    for (let i = tail.length - 1; i > 0; i--) { const w = 8 - i * 0.8; limb(ctx, tail[i][0], tail[i][1], tail[i - 1][0], tail[i - 1][1], Math.max(2, w), i % 2 ? BODY : BODY_D); }
    const tt = tail[tail.length - 1];
    poly(ctx, [[tt[0], tt[1]], [tt[0] - 10, tt[1] - 6], [tt[0] - 6, tt[1]], [tt[0] - 10, tt[1] + 6]], '#ffe66a', OUT, 1.4);
    // body
    ell(ctx, 0, 0, 24, 15, BODY, OUT, 2);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, 24, 15, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = C(BODY_D); ctx.beginPath(); ctx.ellipse(-4, -9, 28, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = C(BELLY); ctx.beginPath(); ctx.ellipse(3, 10, 22, 8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = C('#6a9ee0'); ctx.lineWidth = 1; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 5, 5); ctx.lineTo(i * 5 + 1, 14); ctx.stroke(); }
    ctx.restore();
    // electric veins on back
    ctx.strokeStyle = C('#fff56a'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-16, -6); ctx.lineTo(-9, -9); ctx.lineTo(-4, -4); ctx.lineTo(3, -9); ctx.lineTo(9, -5); ctx.stroke();
    // dorsal spikes
    for (let i = 0; i < 4; i++) poly(ctx, [[-14 + i * 8, -12 + (i % 2)], [-11 + i * 8, -21 - (i % 2) * 2], [-8 + i * 8, -13]], '#ffe66a', OUT, 1.2);
    // front legs
    limb(ctx, 8, 9, 14, 17 + Math.sin(t * 3) * 1.5, 5, BODY_D); poly(ctx, [[12, 18], [19, 18], [17, 22], [14, 20], [12, 22]], '#ffe66a', OUT, 1);
    // neck + head
    const nx = 22, ny = -4;
    limb(ctx, 14, -2, nx + 4, ny - 6, 10, BODY); limb(ctx, 14, 0, nx + 4, ny - 4, 6, BELLY);
    const hx = nx + 11, hy = ny - 9 + Math.sin(t * 4) * 0.8;
    ell(ctx, hx, hy, 11.5, 8.6, BODY, OUT, 1.9);
    poly(ctx, [[hx + 6, hy - 3], [hx + 20, hy - 1], [hx + 19, hy + 4], [hx + 6, hy + 5]], BODY, OUT, 1.8); // snout
    poly(ctx, [[hx + 7, hy + 3], [hx + 18, hy + 3.5], [hx + 12, hy + 8]], '#8ab6f0', OUT, 1.2); // jaw
    // teeth
    for (let i = 0; i < 3; i++) poly(ctx, [[hx + 10 + i * 3, hy + 4], [hx + 11.2 + i * 3, hy + 7], [hx + 12.4 + i * 3, hy + 4]], '#ffffff', null);
    // horns
    poly(ctx, [[hx - 4, hy - 6], [hx - 18, hy - 15], [hx - 8, hy - 2]], '#ffe66a', OUT, 1.4);
    poly(ctx, [[hx - 1, hy - 8], [hx - 12, hy - 20], [hx + 3, hy - 6]], '#ffe66a', OUT, 1.4);
    // eye
    const eyeC = enraged || wp > 0.3 ? '#ff6a4a' : '#fff56a';
    poly(ctx, [[hx + 1, hy - 3.5], [hx + 9, hy - 5], [hx + 7, hy - 0.5], [hx + 2, hy]], '#10183c', null);
    ell(ctx, hx + 5.2, hy - 2.6, 1.7, 1.7, eyeC, null); glowBlob(ctx, hx + 5, hy - 3, 11, eyeC, 0.7);
    // mouth glow charging
    if (wp > 0) glowBlob(ctx, hx + 18, hy + 2, 12 + wp * 14, '#b0e8ff', 0.5 + wp * 0.5);

    wing(1, 1.0, false);
    // lightning arcs around the body
    const seed = Math.floor(t * 10) + id * 13;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#d8f4ff'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    const nArc = 2 + (wp > 0 ? 2 : 0) + (enraged ? 1 : 0);
    for (let a = 0; a < nArc; a++) {
      const rr = (n) => { const v = Math.sin((seed + a * 7.7) * 12.9898 + n * 78.233) * 43758.5453; return v - Math.floor(v); };
      const ang0 = rr(1) * TAU, r0 = 22 + rr(2) * 10;
      let px = Math.cos(ang0) * r0, py = Math.sin(ang0) * r0 * 0.7;
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(px, py);
      for (let s = 0; s < 4; s++) { px += (rr(3 + s) - 0.4) * 12 * Math.cos(ang0) + (rr(9 + s) - 0.5) * 9; py += (rr(5 + s) - 0.5) * 11 + Math.sin(ang0) * 6; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
    setMix(0, 0, 0, 0);
  }

  AT.Sprites = Sprites;
})();
