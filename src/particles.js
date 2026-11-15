// Aether's Trial — capped particle pool, event-driven effects. Owner: visuals.
// Logic (spawn/update/cap/expiry) is pure and Node-testable. draw(ctx, cam) expects the WORLD transform to be
// applied already (cam is only used for culling) and uses only ctx calls.
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;

  const ELCOL = {
    pyro: ['#ffd27a', '#ff7a2a', '#c8301a'], hydro: ['#e6f8ff', '#5ac8ff', '#2a7fe0'],
    electro: ['#f2e0ff', '#b98cff', '#7a44d8'], anemo: ['#eafff6', '#7dffd0', '#2fbf98'],
    cryo: ['#ffffff', '#bfeeff', '#6fc4ea'], geo: ['#fff0b8', '#f0b840', '#a8741a'],
    physical: ['#ffffff', '#dfe9ff', '#9db4e8'], none: ['#ffffff', '#dfe9ff', '#9db4e8']
  };

  function cap() { return (AT.CFG && AT.CFG.LIMITS && AT.CFG.LIMITS.particles) || 600; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  const P = {
    list: [],
    _pool: [],
    _bound: false,
    _handlers: [],
    _ambT: 0,
    _ambPetals: 0,
    _ambWind: 0,
    _selfUpdated: false,
    _lastClock: 0,
    ELCOL,

    count() { return this.list.length; },
    clear() { for (let i = 0; i < this.list.length; i++) this._pool.push(this.list[i]); this.list.length = 0; this._ambPetals = 0; this._ambWind = 0; },

    /**
     * def: {kind, x, y, vx, vy, life, size, size1, color, color2, alpha, g, drag, rot, vr, add, grow, text, amb}
     * Returns the particle, or null when the hard cap is reached.
     */
    spawn(def) {
      if (this.list.length >= cap()) return null;
      const p = this._pool.pop() || {};
      p.kind = def.kind || 'glow';
      p.x = def.x || 0; p.y = def.y || 0;
      p.vx = def.vx || 0; p.vy = def.vy || 0;
      p.life = p.max = def.life > 0 ? def.life : 0.5;
      p.size = def.size == null ? 4 : def.size;
      p.size1 = def.size1 == null ? p.size : def.size1;
      p.color = def.color || '#ffffff';
      p.color2 = def.color2 || null;
      p.alpha = def.alpha == null ? 1 : def.alpha;
      p.g = def.g || 0;
      p.drag = def.drag || 0;
      p.rot = def.rot || 0;
      p.vr = def.vr || 0;
      p.add = !!def.add;
      p.amb = def.amb || 0; // 1 = ambient petal, 2 = ambient wind (counted for ambient caps)
      p.sway = def.sway || 0;
      p.seed = Math.random() * 100;
      p.len = def.len || 0;
      this.list.push(p);
      return p;
    },

    /** High level bursts. kind: fire|steam|spark|glow|petal|wind|ring|puff|gold */
    burst(kind, x, y, o) {
      o = o || {};
      const n = o.count == null ? 8 : o.count;
      const el = ELCOL[o.element] || ELCOL.physical;
      const dirA = o.angle == null ? 0 : o.angle, spread = o.spread == null ? TAU : o.spread;
      const speed = o.speed == null ? 100 : o.speed;
      for (let i = 0; i < n; i++) {
        const a = dirA + (Math.random() - 0.5) * spread;
        const s = speed * rnd(0.4, 1.1);
        const ca = Math.cos(a), sa = Math.sin(a);
        let ok = true;
        switch (kind) {
          case 'fire':
            ok = this.spawn({ kind: 'fire', x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: ca * s, vy: sa * s - 20, life: rnd(0.35, 0.7),
              size: rnd(5, 9), size1: 1, color: '#ffd27a', color2: '#e0391a', add: true, drag: 2.2, g: -40 });
            break;
          case 'steam':
            ok = this.spawn({ kind: 'steam', x: x + rnd(-10, 10), y: y + rnd(-8, 8), vx: ca * s * 0.45, vy: sa * s * 0.35 - 30, life: rnd(0.8, 1.4),
              size: rnd(10, 16), size1: rnd(34, 52), color: i % 3 ? '#ffffff' : '#bfe6ff', alpha: 0.7, drag: 1.2, g: -22, rot: rnd(0, TAU), vr: rnd(-1, 1) });
            break;
          case 'puff':
            ok = this.spawn({ kind: 'steam', x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: ca * s, vy: sa * s, life: rnd(0.35, 0.65),
              size: rnd(6, 10), size1: rnd(16, 26), color: o.color || el[0], alpha: 0.6, drag: 3 });
            break;
          case 'spark':
            ok = this.spawn({ kind: 'spark', x, y, vx: ca * s * 1.6, vy: sa * s * 1.6, life: rnd(0.15, 0.4), size: rnd(1.4, 2.4), size1: 0.4,
              color: o.color || el[0], color2: el[1], add: true, drag: 2.5, g: o.g == null ? 120 : o.g, len: rnd(5, 11) });
            break;
          case 'glow':
            ok = this.spawn({ kind: 'glow', x: x + rnd(-6, 6), y: y + rnd(-6, 6), vx: ca * s * 0.5, vy: sa * s * 0.5 - 18, life: rnd(0.5, 1.1),
              size: rnd(5, 10), size1: 1, color: o.color || el[1], add: true, drag: 1.4 });
            break;
          case 'gold':
            ok = this.spawn({ kind: 'spark', x, y, vx: ca * s, vy: sa * s - 50, life: rnd(0.5, 0.9), size: rnd(2, 3.4), size1: 0.6,
              color: '#fff2b0', color2: '#f0b840', add: true, g: 160, drag: 1.2, len: 5 });
            break;
          case 'ring':
            ok = this.spawn({ kind: 'ring', x, y, life: o.life || 0.5, size: o.size || 8, size1: o.size1 || 90, color: o.color || el[1], add: true, alpha: 0.9 });
            i = n; // one ring per call
            break;
          case 'petal':
            ok = this.spawn({ kind: 'petal', x, y, vx: rnd(10, 40), vy: rnd(10, 30), life: rnd(6, 11), size: rnd(2.5, 4), color: i % 2 ? '#ffd1e6' : '#fff4f8',
              rot: rnd(0, TAU), vr: rnd(-2, 2), sway: rnd(8, 22), amb: o.amb || 0 });
            break;
          case 'wind':
            ok = this.spawn({ kind: 'wind', x, y, vx: rnd(380, 620), vy: rnd(-30, 30), life: rnd(0.5, 1.0), size: rnd(1, 1.8), len: rnd(40, 110),
              color: '#dfefff', alpha: 0.5, amb: o.amb || 0 });
            break;
          default:
            ok = this.spawn({ kind: 'glow', x, y, vx: ca * s, vy: sa * s, life: 0.5, size: 5, size1: 1, color: o.color || '#fff', add: true });
        }
        if (!ok) break; // cap reached
      }
    },

    /** Ambient petals (fields) / wind streaks (ruins) around the camera view. Soft-capped well below the hard cap. */
    ambient(dt, cam, theme) {
      if (!cam) return;
      const W = cam.w || 960, H = cam.h || 540;
      if (this.list.length > cap() * 0.8) return;
      this._ambT += dt;
      if (theme === 'ruins') {
        if (this._ambWind < 22 && this._ambT > 0.08) {
          this._ambT = 0;
          this.spawn({ kind: 'wind', x: cam.x - 120, y: cam.y + Math.random() * H, vx: rnd(420, 700), vy: rnd(-20, 40), life: rnd(1.4, 2.2),
            size: rnd(1, 1.8), len: rnd(50, 130), color: '#cfe6ff', alpha: 0.45, amb: 2 });
        }
      } else if (this._ambPetals < 26 && this._ambT > 0.25) {
        this._ambT = 0;
        this.spawn({ kind: 'petal', x: cam.x - 40 + Math.random() * (W + 80), y: cam.y - 20, vx: rnd(14, 42), vy: rnd(14, 34), life: rnd(7, 12),
          size: rnd(2.4, 3.8), color: Math.random() < 0.5 ? '#ffd1e6' : '#fff6fa', rot: rnd(0, TAU), vr: rnd(-2.5, 2.5), sway: rnd(8, 22), amb: 1 });
      }
    },

    update(dt) {
      this._selfUpdated = true;
      const L = this.list;
      let w = 0, pet = 0, wind = 0;
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        p.life -= dt;
        if (p.life <= 0) { this._pool.push(p); continue; }
        if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.sway) p.x += Math.sin(p.seed + (p.max - p.life) * 2.2) * p.sway * dt;
        p.rot += p.vr * dt;
        if (p.amb === 1) pet++; else if (p.amb === 2) wind++;
        L[w++] = p;
      }
      L.length = w;
      this._ambPetals = pet; this._ambWind = wind;
    },

    // ---------- drawing ----------
    _glowSprite(color) {
      this._gs = this._gs || {};
      let c = this._gs[color];
      if (c) return c;
      if (typeof document === 'undefined') return null;
      c = document.createElement('canvas'); c.width = c.height = 48;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 48, 48);
      this._gs[color] = c;
      return c;
    },

    draw(ctx, cam) {
      const L = this.list;
      const cx0 = cam ? cam.x - 160 : -1e9, cy0 = cam ? cam.y - 160 : -1e9;
      const cx1 = cam ? cam.x + (cam.w || 960) + 160 : 1e9, cy1 = cam ? cam.y + (cam.h || 540) + 160 : 1e9;
      const prevOp = ctx.globalCompositeOperation;
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        if (p.x < cx0 || p.x > cx1 || p.y < cy0 || p.y > cy1) continue;
        const f = 1 - p.life / p.max; // 0 -> 1 over life
        const s = p.size + (p.size1 - p.size) * f;
        let a = p.alpha * (f < 0.1 && p.kind !== 'fire' ? f / 0.1 : 1) * Math.min(1, p.life / (p.max * 0.45));
        if (p.kind === 'petal' || p.kind === 'wind') a = p.alpha * Math.min(1, f * 6, p.life * 1.2);
        if (a <= 0.005) continue;
        ctx.globalAlpha = Math.min(1, a);
        ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
        switch (p.kind) {
          case 'fire': {
            const spr = this._glowSprite(f < 0.45 ? p.color : p.color2 || p.color);
            if (spr) ctx.drawImage(spr, p.x - s * 1.6, p.y - s * 1.6, s * 3.2, s * 3.2);
            else { ctx.fillStyle = f < 0.45 ? p.color : p.color2; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
            break;
          }
          case 'glow': {
            const spr = this._glowSprite(p.color);
            if (spr) ctx.drawImage(spr, p.x - s * 2, p.y - s * 2, s * 4, s * 4);
            else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
            break;
          }
          case 'steam': {
            const spr = this._glowSprite(p.color);
            if (spr) { ctx.drawImage(spr, p.x - s, p.y - s, s * 2, s * 2); }
            else { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
            break;
          }
          case 'spark': {
            const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
            const l = Math.max(2, p.len * (sp / 140));
            ctx.strokeStyle = f < 0.5 ? p.color : (p.color2 || p.color);
            ctx.lineWidth = Math.max(0.6, s); ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx / sp * l, p.y - p.vy / sp * l); ctx.stroke();
            break;
          }
          case 'ring': {
            ctx.strokeStyle = p.color; ctx.lineWidth = 3 * (1 - f) + 0.8;
            ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.stroke();
            break;
          }
          case 'petal': {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.scale(1, 0.55 + 0.45 * Math.sin(p.seed + p.rot * 1.3));
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.ellipse(0, 0, s * 1.4, s * 0.8, 0, 0, TAU); ctx.fill();
            ctx.restore();
            break;
          }
          case 'wind': {
            const g = ctx.createLinearGradient(p.x - p.len, p.y, p.x, p.y);
            g.addColorStop(0, 'rgba(220,240,255,0)'); g.addColorStop(1, p.color);
            ctx.strokeStyle = g; ctx.lineWidth = s; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(p.x - p.len, p.y - p.vy * 0.05); ctx.lineTo(p.x, p.y); ctx.stroke();
            break;
          }
          default: {
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill();
          }
        }
      }
      ctx.globalCompositeOperation = prevOp || 'source-over';
      ctx.globalAlpha = 1;
    },

    // ---------- events ----------
    bind() {
      if (this._bound) return;
      this._bound = true;
      const ev = AT.events; if (!ev) return;
      const self = this;
      const on = (n, f) => { ev.on(n, f); self._handlers.push([n, f]); };
      on('hit', (p) => {
        if (!p) return;
        const el = p.element || 'physical';
        self.burst('spark', p.x, p.y, { count: p.heavy ? 14 : 8, speed: p.heavy ? 150 : 110, element: el });
        if (el === 'pyro') self.burst('fire', p.x, p.y, { count: p.heavy ? 8 : 4, speed: 60 });
        else self.burst('glow', p.x, p.y, { count: 2, speed: 40, element: el });
      });
      on('reaction', (p) => {
        if (!p) return;
        self.burst('steam', p.x, p.y - 8, { count: 8, speed: 80 });
        self.burst('ring', p.x, p.y, { color: '#ffffff', size: 10, size1: 70, life: 0.45 });
        self.burst('spark', p.x, p.y, { count: 8, speed: 120, color: '#fff3d0', element: 'pyro' });
      });
      on('skillCast', (p) => {
        if (!p) return;
        const a = p.angle || 0, x = p.x + Math.cos(a) * 24, y = p.y + Math.sin(a) * 24;
        self.burst('fire', x, y, { count: 18, speed: 210, angle: a, spread: 0.9 });
        self.burst('spark', x, y, { count: 8, speed: 180, angle: a, spread: 1.0, element: 'pyro' });
      });
      on('burstCast', (p) => {
        if (!p) return;
        self.burst('ring', p.x, p.y, { color: '#ffb060', size: 10, size1: (AT.CFG.BURST && AT.CFG.BURST.radius) || 175, life: 0.55 });
        self.burst('fire', p.x, p.y, { count: 46, speed: 300 });
        self.burst('spark', p.x, p.y, { count: 22, speed: 280, element: 'pyro' });
        self.burst('glow', p.x, p.y, { count: 8, speed: 140, element: 'pyro' });
      });
      on('dash', (p) => {
        if (!p) return;
        const a = p.angle || 0;
        self.burst('wind', p.x - Math.cos(a) * 30, p.y - Math.sin(a) * 10, { count: 3 });
        self.burst('puff', p.x, p.y + 8, { count: 5, speed: 60, color: '#e8f2ff', angle: a + Math.PI, spread: 1.2 });
        self.burst('glow', p.x, p.y, { count: 3, speed: 50, color: '#8fd8ff' });
      });
      on('enemyKilled', (p) => {
        if (!p) return;
        const el = (p.enemy && p.enemy.element) || 'physical';
        self.burst('puff', p.x, p.y, { count: 8, speed: 110, element: el });
        self.burst('glow', p.x, p.y, { count: 6, speed: 90, element: el });
        self.burst('spark', p.x, p.y, { count: 6, speed: 120, element: el });
      });
      on('bossDefeated', (p) => {
        const b = p && p.boss; if (!b) return;
        for (let k = 0; k < 4; k++) self.burst('ring', b.x, b.y, { color: k % 2 ? '#fff0b0' : '#9fd8ff', size: 10 + k * 6, size1: 140 + k * 40, life: 0.6 + k * 0.2 });
        self.burst('glow', b.x, b.y, { count: 30, speed: 220, color: '#fff2b0' });
        self.burst('gold', b.x, b.y, { count: 30, speed: 220 });
      });
      on('chestOpened', (p) => {
        if (!p) return;
        self.burst('gold', p.x, p.y - 8, { count: 22, speed: 170 });
        self.burst('glow', p.x, p.y - 8, { count: 8, speed: 70, color: '#ffe38a' });
        self.burst('ring', p.x, p.y, { color: '#ffe38a', size: 6, size1: 60, life: 0.5 });
      });
      on('pickup', (p) => {
        if (!p) return;
        const c = p.kind === 'gem' ? '#8ff0ff' : p.kind === 'potion' ? '#ff8aa0' : '#ffe38a';
        self.burst('glow', p.x, p.y, { count: 5, speed: 60, color: c });
      });
      on('levelUp', () => {
        const pl = AT.player; if (!pl) return;
        self.burst('ring', pl.x, pl.y, { color: '#fff0a0', size: 8, size1: 100, life: 0.7 });
        self.burst('glow', pl.x, pl.y, { count: 20, speed: 110, color: '#fff0a0' });
      });
      on('playerHurt', (p) => {
        if (!p) return;
        self.burst('spark', p.x, p.y, { count: 8, speed: 130, color: '#ff8a8a' });
      });
    },

    unbind() {
      const ev = AT.events; if (ev) this._handlers.forEach(h => ev.off(h[0], h[1]));
      this._handlers = []; this._bound = false;
    }
  };

  AT.Particles = P;
})();
