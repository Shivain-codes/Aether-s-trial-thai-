// Aether's Trial — 15 second opening cinematic (procedural Canvas 2D) with narration + always-drawn subtitles. Owner: visuals.
// Storyboard: 0-3 fade-in on glowing field | 3-6 reveal hero lying in flowers | 6-9 hero awakens, motes gather |
//             9-12 pan to far mountains and ancient ruins | 12-15 title, then fade out.
// update()/timing/subtitle logic is pure and Node-testable; draw() only uses ctx calls.
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;
  const VW = 960, VH = 540;
  const SUB_START = 0.5, SUB_END = 12.0, SPEECH_START = 0.5;
  const GROUND_Y = 412, HERO_X = 480;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function hash(a, b) { const s = Math.sin((a || 0) * 127.1 + (b || 0) * 311.7) * 43758.5453; return s - Math.floor(s); }
  function mod(a, n) { return ((a % n) + n) % n; }

  const FLOWER_COLS = ['#ffffff', '#ffe45a', '#ff86b4', '#9fd2ff', '#ffb14a', '#e0b0ff'];

  const Cin = {
    t: 0,
    duration: 15,
    played: false,
    started: false,
    done: false,
    skipped: false,
    speechStarted: false,
    words: [],
    wordStart: [],   // seconds at which each word becomes visible
    chunks: [],      // [{from,to}] word index ranges shown together as one subtitle line
    _utter: null,
    _keyFn: null,

    narration() { return (AT.CFG && AT.CFG.CINEMATIC && AT.CFG.CINEMATIC.narration) || 'Awaken, traveller. Your journey begins now.'; },

    /** Compute word-timed subtitle schedule across t = 0.5 .. 12. Pure. */
    buildSubtitles() {
      const words = String(this.narration()).trim().split(/\s+/).filter(Boolean);
      const wts = words.map(w => {
        let k = w.replace(/[^A-Za-z0-9']/g, '').length + 2;
        if (/[.!?]$/.test(w)) k += 7; else if (/[,;:\u2014-]$/.test(w)) k += 3;
        return k;
      });
      const total = wts.reduce((a, b) => a + b, 0) || 1;
      const span = SUB_END - SUB_START;
      let acc = 0; const start = [];
      for (let i = 0; i < words.length; i++) { start.push(SUB_START + span * (acc / total)); acc += wts[i]; }
      // chunks: break at sentence ends, or after 7 words
      const chunks = []; let from = 0;
      for (let i = 0; i < words.length; i++) {
        const endSentence = /[.!?]$/.test(words[i]);
        if (endSentence || i - from + 1 >= 7 || i === words.length - 1) { chunks.push({ from, to: i }); from = i + 1; }
      }
      this.words = words; this.wordStart = start; this.chunks = chunks;
      return start;
    },

    /** Index of the last word whose start time <= t, or -1. */
    wordIndexAt(t) {
      let idx = -1;
      for (let i = 0; i < this.wordStart.length; i++) { if (t >= this.wordStart[i]) idx = i; else break; }
      return idx;
    },

    start() {
      this.duration = (AT.CFG && AT.CFG.CINEMATIC && AT.CFG.CINEMATIC.duration) || 15;
      this.t = 0; this.done = false; this.skipped = false; this.started = true; this.speechStarted = false; this._utter = null;
      this.buildSubtitles();
      this._stopSpeech();
      try {
        if (typeof window !== 'undefined' && window.addEventListener) {
          if (this._keyFn) window.removeEventListener('keydown', this._keyFn);
          const self = this;
          this._keyFn = function (e) {
            if (!e || e.repeat) return;
            if ((e.key === 'Enter' || e.key === 'Escape' || e.code === 'Enter' || e.code === 'Escape') && self.t > 0.3) self.skip();
          };
          window.addEventListener('keydown', this._keyFn);
        }
      } catch (e) {}
    },

    _speak() {
      this.speechStarted = true;
      try {
        if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(this.narration());
        u.lang = 'en-US'; u.rate = 0.9; u.pitch = 1.0; u.volume = 1;
        let voices = [];
        try { voices = speechSynthesis.getVoices() || []; } catch (e) {}
        const en = voices.filter(v => /^en([-_]|$)/i.test(v.lang || ''));
        const pref = en.find(v => /google uk english|samantha|daniel|karen|serena|moira|google us english|natural/i.test(v.name || '')) || en[0];
        if (pref) { u.voice = pref; u.lang = pref.lang || 'en-US'; }
        this._utter = u;
        speechSynthesis.speak(u);
      } catch (e) {}
    },

    _stopSpeech() {
      try { if (typeof speechSynthesis !== 'undefined' && speechSynthesis.cancel) speechSynthesis.cancel(); } catch (e) {}
      this._utter = null;
    },

    _finish() {
      this.done = true;
      this._stopSpeech();
      try { if (typeof window !== 'undefined' && this._keyFn) { window.removeEventListener('keydown', this._keyFn); this._keyFn = null; } } catch (e) {}
      try { if (typeof document !== 'undefined') { const el = document.getElementById('narrFallback'); if (el) { el.textContent = ''; el.classList.remove('show'); } } } catch (e) {}
    },

    skip() {
      if (this.done) return;
      this.skipped = true;
      this._finish();
    },

    isDone() { return !!this.done; },

    /** Advance by dt seconds. Returns true once the cinematic has finished (or was skipped). */
    update(dt) {
      if (!this.started) this.start();
      if (this.done) return true;
      this.t += dt > 0 ? dt : 0;
      if (!this.speechStarted && this.t >= SPEECH_START) this._speak();
      if (this.t >= this.duration) { this.t = this.duration; this._finish(); }
      return this.done;
    },

    // =============================== DRAWING ===============================
    draw(ctx, w, h) {
      w = w || VW; h = h || VH;
      const t = this.t;
      ctx.save();
      ctx.scale(w / VW, h / VH);
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
      try { this._scene(ctx, t); } catch (e) { /* never let a draw glitch block the game */ }
      this._overlay(ctx, t);
      ctx.restore();
    },

    _camera(t) {
      const tilt = 170 * (1 - ease((t - 3) / 3)) + (t < 3 ? Math.sin(t * 0.8) * 3 : 0);
      const pan = 660 * ease((t - 9) / 3);
      let zoom = 1;
      if (t >= 6 && t < 9) zoom = 1 + 0.32 * ease((t - 6) / 3);
      else if (t >= 9) zoom = 1.32 - 0.32 * ease((t - 9) / 2.6);
      else zoom = 1 + 0.03 * ease(t / 3);
      return { tilt, pan, zoom };
    },

    _scene(ctx, t) {
      const cam = this._camera(t);
      // sky (mostly fixed)
      const sky = ctx.createLinearGradient(0, 0, 0, VH);
      sky.addColorStop(0, '#5d7fe6'); sky.addColorStop(0.38, '#b7a2e8'); sky.addColorStop(0.62, '#ffbfae'); sky.addColorStop(0.78, '#ffe9b0'); sky.addColorStop(1, '#fff3c8');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);

      ctx.save();
      // zoom around the hero while he awakens
      const fx = 480, fy = 330;
      ctx.translate(fx, fy); ctx.scale(cam.zoom, cam.zoom); ctx.translate(-fx, -fy);

      this._sun(ctx, t, cam);
      this._clouds(ctx, t, cam);
      this._mountains(ctx, t, cam);
      this._ruins(ctx, t, cam);
      this._hills(ctx, t, cam);
      // main field layer
      ctx.save(); ctx.translate(-cam.pan, cam.tilt);
      this._field(ctx, t, cam);
      ctx.restore();
      ctx.restore();

      // bloom wash
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const bloom = ctx.createRadialGradient(680, 170 + cam.tilt * 0.3, 10, 680, 170 + cam.tilt * 0.3, 520);
      const ba = 0.2 + 0.05 * Math.sin(t * 1.5);
      bloom.addColorStop(0, 'rgba(255,230,160,' + ba.toFixed(3) + ')'); bloom.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = bloom; ctx.fillRect(0, 0, VW, VH);
      ctx.restore();
    },

    _sun(ctx, t, cam) {
      const sx = 700 - cam.pan * 0.04, sy = 175 + cam.tilt * 0.35;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 260);
      g.addColorStop(0, 'rgba(255,250,215,0.95)'); g.addColorStop(0.15, 'rgba(255,226,150,0.55)'); g.addColorStop(1, 'rgba(255,200,120,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 270, sy - 270, 540, 540);
      ctx.translate(sx, sy); ctx.rotate(t * 0.04);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        const rg = ctx.createLinearGradient(0, 0, 0, -420); rg.addColorStop(0, 'rgba(255,240,190,0.18)'); rg.addColorStop(1, 'rgba(255,240,190,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(34, -420); ctx.lineTo(-34, -420); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    },

    _clouds(ctx, t, cam) {
      ctx.save(); ctx.translate(0, cam.tilt * 0.3);
      for (let i = 0; i < 6; i++) {
        const x = mod(i * 260 + t * (5 + i) - cam.pan * 0.1, VW + 500) - 250, y = 70 + (i % 3) * 52 + hash(i, 4) * 20;
        ctx.fillStyle = 'rgba(255,236,236,' + (0.5 + (i % 2) * 0.15) + ')';
        for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.ellipse(x + k * 34, y + Math.sin(k * 1.7) * 7, 46 - Math.abs(k - 2) * 7, 17, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,190,200,0.35)'; ctx.beginPath(); ctx.ellipse(x + 68, y + 12, 96, 8, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },

    _mountains(ctx, t, cam) {
      const ranges = [
        { par: 0.2, base: 330, amp: 130, col: '#9aa6e8', snow: '#f4f0ff', seed: 1.3, tp: 0.5 },
        { par: 0.34, base: 345, amp: 105, col: '#7e8ede', snow: '#e8e8ff', seed: 4.1, tp: 0.6 }
      ];
      for (const r of ranges) {
        ctx.save(); ctx.translate(0, cam.tilt * r.tp);
        const px = cam.pan * r.par;
        ctx.beginPath(); ctx.moveTo(-10, VH + 200);
        const pts = [];
        for (let x = -60; x <= VW + 100; x += 30) {
          const wx = x + px;
          const y = r.base - r.amp * (0.45 * Math.abs(Math.sin(wx * 0.0049 + r.seed)) + 0.4 * Math.abs(Math.sin(wx * 0.0121 + r.seed * 2)) + 0.15 * Math.sin(wx * 0.03));
          pts.push([x, y]); ctx.lineTo(x, y);
        }
        ctx.lineTo(VW + 100, VH + 200); ctx.closePath();
        const g = ctx.createLinearGradient(0, r.base - r.amp, 0, r.base + 60); g.addColorStop(0, r.col); g.addColorStop(1, '#d8cff0');
        ctx.fillStyle = g; ctx.fill();
        // snow caps
        ctx.fillStyle = r.snow;
        for (const p of pts) { if (p[1] < r.base - r.amp * 0.62) { ctx.beginPath(); ctx.moveTo(p[0] - 14, p[1] + 20); ctx.lineTo(p[0], p[1]); ctx.lineTo(p[0] + 14, p[1] + 20); ctx.lineTo(p[0] + 6, p[1] + 15); ctx.lineTo(p[0], p[1] + 22); ctx.lineTo(p[0] - 6, p[1] + 14); ctx.closePath(); ctx.fill(); } }
        ctx.restore();
      }
      // haze at the base of the mountains
      ctx.save(); ctx.translate(0, cam.tilt * 0.65);
      const hz = ctx.createLinearGradient(0, 300, 0, 400); hz.addColorStop(0, 'rgba(255,236,200,0)'); hz.addColorStop(1, 'rgba(255,236,200,0.65)');
      ctx.fillStyle = hz; ctx.fillRect(0, 300, VW, 120); ctx.restore();
    },

    _ruins(ctx, t, cam) {
      const par = 0.55, px = cam.pan * par;
      ctx.save(); ctx.translate(-px, cam.tilt * 0.7);
      const bx = 1010, by = 372; // ruins base in layer coordinates
      // rocky plateau
      ctx.fillStyle = '#6a78c0'; ctx.beginPath(); ctx.moveTo(bx - 190, by + 30); ctx.lineTo(bx - 140, by - 6); ctx.lineTo(bx + 330, by - 10); ctx.lineTo(bx + 390, by + 30); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7e8ad0'; ctx.fillRect(bx - 140, by - 8, 470, 4);
      const stone = '#5a66a8', stoneD = '#47508a', stoneL = '#8d9ae0';
      const pillar = (x, h, w, broken) => {
        ctx.fillStyle = stone; ctx.beginPath(); ctx.moveTo(x, by - 8); ctx.lineTo(x, by - 8 - h);
        if (broken) { ctx.lineTo(x + w * 0.3, by - 8 - h + 9); ctx.lineTo(x + w * 0.55, by - 8 - h - 5); ctx.lineTo(x + w, by - 8 - h + 6); } else { ctx.lineTo(x + w, by - 8 - h); }
        ctx.lineTo(x + w, by - 8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = stoneD; ctx.fillRect(x + w * 0.62, by - 8 - h + 8, w * 0.38, h);
        ctx.fillStyle = stoneL; ctx.fillRect(x, by - 8 - h + (broken ? 8 : 0), 2.5, h);
      };
      pillar(bx - 100, 78, 15, true); pillar(bx - 60, 112, 17, false); pillar(bx + 20, 56, 15, true);
      pillar(bx + 190, 120, 17, false); pillar(bx + 240, 70, 15, true); pillar(bx + 300, 92, 16, true);
      // great arch between two pillars
      ctx.strokeStyle = stone; ctx.lineWidth = 17; ctx.beginPath(); ctx.arc(bx + 145, by - 104, 56, Math.PI, TAU * 0.92); ctx.stroke();
      ctx.strokeStyle = stoneL; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx + 145, by - 112, 62, Math.PI * 1.05, TAU * 0.9); ctx.stroke();
      // tower
      ctx.fillStyle = stoneD; ctx.fillRect(bx + 90, by - 150, 36, 142); ctx.fillStyle = stone; ctx.fillRect(bx + 90, by - 150, 24, 142);
      ctx.fillRect(bx + 84, by - 160, 48, 12);
      // steps
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? stone : stoneD; ctx.fillRect(bx + 60 - i * 10, by - 8 + i * 4 - 4, 110 + i * 20, 5); }
      // glowing runes (pulse, brighter once the camera arrives)
      const arrive = ease((t - 8.8) / 2.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.2);
      const rune = (x, y, s) => {
        ctx.strokeStyle = 'rgba(100,210,255,' + ((0.45 + 0.4 * arrive) * pulse).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(x - s, y); ctx.lineTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.closePath(); ctx.moveTo(x, y - s * 0.4); ctx.lineTo(x, y + s * 0.4); ctx.stroke();
        const g = ctx.createRadialGradient(x, y, 0, x, y, s * 4); g.addColorStop(0, 'rgba(110,200,255,' + (0.35 * pulse).toFixed(3) + ')'); g.addColorStop(1, 'rgba(110,200,255,0)'); ctx.fillStyle = g; ctx.fillRect(x - s * 4, y - s * 4, s * 8, s * 8);
      };
      rune(bx - 51, by - 60, 6); rune(bx + 108, by - 100, 7); rune(bx + 198, by - 70, 6); rune(bx + 145, by - 150, 9); rune(bx + 25, by - 30, 5);
      // beam of light into the sky from the tower
      const beam = ctx.createLinearGradient(0, by - 160, 0, by - 520); beam.addColorStop(0, 'rgba(150,215,255,' + (0.35 * arrive).toFixed(3) + ')'); beam.addColorStop(1, 'rgba(150,215,255,0)');
      ctx.fillStyle = beam; ctx.beginPath(); ctx.moveTo(bx + 100, by - 160); ctx.lineTo(bx + 116, by - 160); ctx.lineTo(bx + 160, by - 520); ctx.lineTo(bx + 60, by - 520); ctx.closePath(); ctx.fill();
      ctx.restore();
      // mist at the foot
      const m = ctx.createLinearGradient(0, by - 20, 0, by + 40); m.addColorStop(0, 'rgba(220,230,255,0)'); m.addColorStop(1, 'rgba(220,230,255,0.55)'); ctx.fillStyle = m; ctx.fillRect(bx - 220, by - 20, 700, 70);
      ctx.restore();
    },

    _hills(ctx, t, cam) {
      const par = 0.75, px = cam.pan * par;
      ctx.save(); ctx.translate(0, cam.tilt * 0.82);
      ctx.beginPath(); ctx.moveTo(-10, VH + 300);
      for (let x = -20; x <= VW + 60; x += 24) { const wx = x + px; ctx.lineTo(x, 372 - 22 * Math.sin(wx * 0.0072 + 1) - 12 * Math.sin(wx * 0.019)); }
      ctx.lineTo(VW + 60, VH + 300); ctx.closePath();
      const g = ctx.createLinearGradient(0, 330, 0, 480); g.addColorStop(0, '#a6e08a'); g.addColorStop(1, '#6cc468'); ctx.fillStyle = g; ctx.fill();
      // little far trees
      for (let i = 0; i < 16; i++) {
        const wx = i * 130 + 40 - mod(px, 130 * 16) + (px > 0 ? 0 : 0), x = mod(i * 130 + 40 - px, 130 * 16) - 120;
        if (x < -40 || x > VW + 40) continue;
        const y = 376 - 22 * Math.sin((x + px) * 0.0072 + 1) - 12 * Math.sin((x + px) * 0.019);
        ctx.fillStyle = '#3f9a58'; ctx.beginPath(); ctx.ellipse(x, y - 14, 14, 18, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#6fd07a'; ctx.beginPath(); ctx.ellipse(x - 3, y - 18, 8, 10, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#5a3a24'; ctx.fillRect(x - 1.5, y - 2, 3, 6);
      }
      ctx.restore();
    },

    _tree(ctx, x, y, s, t) {
      const sw = Math.sin(t * 1.1 + x * 0.01) * 2;
      ctx.fillStyle = 'rgba(20,60,40,0.3)'; ctx.beginPath(); ctx.ellipse(x + 20, y + 4, 70 * s, 14 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7a4c2a'; ctx.beginPath(); ctx.moveTo(x - 14 * s, y); ctx.lineTo(x - 8 * s, y - 120 * s); ctx.lineTo(x + 8 * s, y - 120 * s); ctx.lineTo(x + 14 * s, y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a3418'; ctx.fillRect(x + 2 * s, y - 120 * s, 7 * s, 120 * s);
      const cs = [[-48, -150, 54], [44, -148, 50], [0, -190, 62], [-20, -126, 48], [28, -124, 46]];
      for (const c of cs) { ctx.fillStyle = '#2b8a4a'; ctx.beginPath(); ctx.arc(x + c[0] * s + sw, y + c[1] * s, c[2] * s, 0, TAU); ctx.fill(); }
      for (const c of cs) { ctx.fillStyle = '#4cc060'; ctx.beginPath(); ctx.arc(x + c[0] * s + sw - 5 * s, y + c[1] * s - 6 * s, c[2] * s * 0.8, 0, TAU); ctx.fill(); }
      for (const c of cs) { ctx.fillStyle = '#92ec84'; ctx.beginPath(); ctx.arc(x + c[0] * s + sw - 14 * s, y + c[1] * s - 16 * s, c[2] * s * 0.4, 0, TAU); ctx.fill(); }
    },

    _flower(ctx, x, y, s, col, t, ph) {
      const sx = Math.sin(t * 1.7 + ph) * 4 * s, h = 26 * s;
      ctx.strokeStyle = '#2f9a48'; ctx.lineWidth = 2 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sx * 0.3, y - h * 0.6, x + sx, y - h); ctx.stroke();
      ctx.fillStyle = '#3cb058'; ctx.beginPath(); ctx.ellipse(x + sx * 0.2 - 4 * s, y - h * 0.35, 5 * s, 2 * s, -0.5, 0, TAU); ctx.fill();
      const hx = x + sx, hy = y - h, pr = 5.2 * s;
      ctx.fillStyle = col; for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.3; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * pr, hy + Math.sin(a) * pr * 0.85, pr * 0.9, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#ffcf3a'; ctx.beginPath(); ctx.arc(hx, hy, pr * 0.6, 0, TAU); ctx.fill();
    },

    _field(ctx, t, cam) {
      // ground (extends beyond screen so panning never shows an edge)
      const g = ctx.createLinearGradient(0, 350, 0, 640); g.addColorStop(0, '#9ae878'); g.addColorStop(0.4, '#6fd05e'); g.addColorStop(1, '#3f9a4c');
      ctx.fillStyle = g; ctx.fillRect(-200, 350, 2400, 520);
      // cel patches
      for (let i = 0; i < 26; i++) {
        const x = hash(i, 1) * 1900 - 100, y = 372 + hash(i, 2) * 220;
        ctx.fillStyle = i % 2 ? 'rgba(190,250,140,0.35)' : 'rgba(60,150,70,0.3)'; ctx.beginPath(); ctx.ellipse(x, y, 90 + hash(i, 3) * 90, 18 + hash(i, 4) * 14, 0, 0, TAU); ctx.fill();
      }
      // back trees
      this._tree(ctx, 140, 392, 1.0, t); this._tree(ctx, 860, 388, 0.9, t); this._tree(ctx, 1420, 392, 1.1, t);
      // flower rows: back rows first
      const fl = [];
      for (let i = 0; i < 190; i++) fl.push({ x: -100 + hash(i, 7) * 1700, y: 372 + hash(i, 8) * 190, c: FLOWER_COLS[Math.floor(hash(i, 9) * FLOWER_COLS.length)], ph: hash(i, 10) * TAU });
      fl.sort((a, b) => a.y - b.y);
      const heroDraw = () => this._hero(ctx, t);
      let heroDone = false;
      for (const f of fl) {
        if (!heroDone && f.y > GROUND_Y) { heroDraw(); heroDone = true; }
        const s = 0.55 + (f.y - 360) / 190 * 0.8;
        this._flower(ctx, f.x, f.y, s, f.c, t, f.ph);
      }
      if (!heroDone) heroDraw();
      this._motes(ctx, t);
      // foreground blades & big flowers (parallax: slightly faster than the field)
      ctx.save(); ctx.translate(-cam.pan * 0.25, 0);
      for (let i = 0; i < 46; i++) {
        const x = -60 + i * 36 + hash(i, 5) * 18, y = 540 + hash(i, 6) * 40, s = 1.7 + hash(i, 12) * 0.9;
        const sw = Math.sin(t * 1.5 + i) * 6;
        ctx.strokeStyle = i % 3 ? '#2f8c44' : '#46b158'; ctx.lineWidth = 4 * s * 0.7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sw * 0.5, y - 50 * s, x + sw + (i % 2 ? 10 : -10), y - 90 * s); ctx.stroke();
        if (i % 5 === 0) this._flower(ctx, x + 12, y + 8, 2.3, FLOWER_COLS[i % FLOWER_COLS.length], t, i);
      }
      ctx.restore();
    },

    _hero(ctx, t) {
      const S = AT.Sprites;
      // pose by time
      const eyes = t < 6 ? 0.04 : clamp(0.04 + (t - 6) / 0.7, 0.04, 1);
      const lie = t < 6.4 ? 1 : 1 - ease((t - 6.4) / 1.5);
      const awake = ease((t - 6) / 2.6);
      const face = Math.PI / 2 * (1 - ease((t - 8.8) / 0.9));
      const breathe = t < 6.4 ? Math.sin(t * 1.7) * 0.5 : 0;
      const glow = 0.25 + awake * 1.0 + (t > 8.4 && t < 9.4 ? 0.8 * Math.sin((t - 8.4) * Math.PI) : 0);
      const x = HERO_X, y = GROUND_Y;
      ctx.save();
      ctx.fillStyle = 'rgba(255,240,170,' + (0.12 + 0.2 * awake).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x, y + 4, 120, 22, 0, 0, TAU); ctx.fill();
      ctx.restore();
      if (S && S.drawHeroPose) {
        S.drawHeroPose(ctx, x, y, { face, t, lie, lieDir: -1, eyes, bob: breathe + (lie < 0.2 ? Math.sin(t * 2.4) * 0.8 : 0), glow, scale: 2.1, act: 'idle', run: 0 });
      } else {
        ctx.fillStyle = '#3b82ff'; ctx.beginPath(); ctx.ellipse(x, y - 20, 30, 12, 0, 0, TAU); ctx.fill();
      }
      // aura bloom around hero as power gathers
      if (awake > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y - 70, 5, x, y - 70, 150 * (0.6 + awake * 0.5));
        g.addColorStop(0, 'rgba(255,240,170,' + (0.4 * awake).toFixed(3) + ')'); g.addColorStop(1, 'rgba(140,210,255,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 180, y - 250, 360, 360);
        // shockwave ring when power peaks
        const rp = (t - 8.6) / 0.9;
        if (rp > 0 && rp < 1) { ctx.strokeStyle = 'rgba(255,245,200,' + (0.9 * (1 - rp)).toFixed(3) + ')'; ctx.lineWidth = 6 * (1 - rp) + 1; ctx.beginPath(); ctx.ellipse(x, y - 60, 20 + rp * 360, 8 + rp * 130, 0, 0, TAU); ctx.stroke(); }
        ctx.restore();
      }
    },

    _motes(ctx, t) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const cx = HERO_X, cy = GROUND_Y - 62;
      // ambient floating pollen / fireflies
      for (let i = 0; i < 46; i++) {
        const x = mod(hash(i, 21) * 1500 + Math.sin(t * 0.5 + i) * 24 + t * 6, 1500) - 150, y = 300 + hash(i, 22) * 240 + Math.sin(t * 0.8 + i * 1.3) * 16;
        const a = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.2 + i * 2));
        ctx.fillStyle = 'rgba(255,240,170,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.6 + hash(i, 23) * 1.6, 0, TAU); ctx.fill();
      }
      // gathering motes (6..9): spiral in toward the hero
      if (t >= 6 && t < 9.6) {
        for (let i = 0; i < 80; i++) {
          const delay = hash(i, 31) * 1.4, p = clamp((t - 6 - delay) / 2.1, 0, 1);
          if (p <= 0) continue;
          const e = ease(p), a0 = hash(i, 32) * TAU + e * 3.4, r0 = 130 + hash(i, 33) * 300;
          const r = r0 * (1 - e) + 6;
          const x = cx + Math.cos(a0) * r, y = cy + Math.sin(a0) * r * 0.62;
          const al = (p < 0.9 ? 1 : (1 - p) * 10) * 0.9, sz = 2 + hash(i, 34) * 3 + e * 1.5;
          const cyan = i % 3 === 0;
          const g = ctx.createRadialGradient(x, y, 0, x, y, sz * 3.4);
          g.addColorStop(0, cyan ? 'rgba(190,240,255,' + al.toFixed(3) + ')' : 'rgba(255,236,160,' + al.toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,220,120,0)');
          ctx.fillStyle = g; ctx.fillRect(x - sz * 3.4, y - sz * 3.4, sz * 6.8, sz * 6.8);
        }
      }
      ctx.restore();
    },

    _overlay(ctx, t) {
      // soft vignette
      const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.45, VW / 2, VH / 2, VH * 1.0);
      vg.addColorStop(0, 'rgba(20,10,40,0)'); vg.addColorStop(1, 'rgba(20,10,40,0.45)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);

      // title dimming + title
      if (t >= 11.6) this._title(ctx, t);

      // letterbox
      const bar = 34 * ease(t / 1.2) * (1 - ease((t - 13.2) / 0.8));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, bar); ctx.fillRect(0, VH - bar, VW, bar);

      this._subtitles(ctx, t);

      // fade from black (0-3) and transition to black (14-15)
      let fa = 0;
      if (t < 3) fa = Math.pow(1 - clamp(t / 2.7, 0, 1), 1.6);
      const out = clamp((t - (this.duration - 1.0)) / 1.0, 0, 1);
      fa = Math.max(fa, out * out * (3 - 2 * out));
      if (this.skipped) fa = 1;
      if (fa > 0.002) { ctx.fillStyle = 'rgba(0,0,0,' + fa.toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }

      // skip hint
      if (t > 0.8 && t < this.duration - 1.2) {
        ctx.save(); ctx.font = '15px Georgia, "Times New Roman", serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        const a = clamp((t - 0.8) / 0.8, 0, 1) * (0.55 + 0.2 * Math.sin(t * 3));
        ctx.fillStyle = 'rgba(0,0,0,' + (a * 0.6).toFixed(3) + ')'; ctx.fillText('Press Enter to skip', VW - 19, VH - 47);
        ctx.fillStyle = 'rgba(255,246,220,' + a.toFixed(3) + ')'; ctx.fillText('Press Enter to skip', VW - 20, VH - 48);
        ctx.restore();
      }
    },

    _subtitles(ctx, t) {
      if (!this.words.length) this.buildSubtitles();
      const idx = this.wordIndexAt(t);
      if (idx < 0) return;
      let ch = this.chunks.find(c => idx >= c.from && idx <= c.to) || this.chunks[this.chunks.length - 1];
      if (!ch) return;
      const lastStart = this.wordStart[this.wordStart.length - 1] || SUB_END;
      let alpha = 1;
      if (t > SUB_END + 0.4) alpha = clamp(1 - (t - SUB_END - 0.4) / 0.6, 0, 1);
      else if (ch.to === this.words.length - 1 && t > lastStart + 2.2) alpha = clamp(1 - (t - lastStart - 2.2) / 0.6, 0, 1);
      if (alpha <= 0) return;
      const cstart = this.wordStart[ch.from];
      alpha *= clamp((t - cstart) / 0.25 + 0.2, 0, 1);
      ctx.save();
      ctx.font = 'italic 25px Georgia, "Times New Roman", serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const parts = []; let total = 0;
      const space = (ctx.measureText ? ctx.measureText(' ').width : 7) || 7;
      for (let i = ch.from; i <= ch.to; i++) { const wd = (ctx.measureText ? ctx.measureText(this.words[i]).width : this.words[i].length * 12) || 40; parts.push(wd); total += wd + (i < ch.to ? space : 0); }
      const x0 = (VW - total) / 2, y = VH - 78;
      ctx.globalAlpha = alpha * 0.55; ctx.fillStyle = '#080a1e';
      const bw = total + 40, bh = 40, bx = (VW - bw) / 2, by = y - bh / 2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 10); else ctx.rect(bx, by, bw, bh); ctx.fill();
      ctx.globalAlpha = alpha;
      let x = x0;
      for (let i = ch.from, k = 0; i <= ch.to; i++, k++) {
        const spoken = i <= idx;
        const fresh = spoken ? clamp(1 - (t - this.wordStart[i]) / 0.35, 0, 1) : 0;
        ctx.globalAlpha = alpha * (spoken ? 1 : 0.28);
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillText(this.words[i], x + 1.5, y + 1.5);
        ctx.fillStyle = fresh > 0 ? 'rgb(255,' + Math.round(246 - 40 * fresh) + ',' + Math.round(220 - 90 * fresh) + ')' : '#fff6dc';
        ctx.fillText(this.words[i], x, y);
        x += parts[k] + space;
      }
      ctx.restore();
    },

    _title(ctx, t) {
      const dim = ease((t - 11.6) / 1.0);
      ctx.fillStyle = 'rgba(14,16,48,' + (0.5 * dim).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const gl = ctx.createRadialGradient(VW / 2, 245, 10, VW / 2, 245, 380); gl.addColorStop(0, 'rgba(255,210,120,' + (0.3 * dim).toFixed(3) + ')'); gl.addColorStop(1, 'rgba(255,210,120,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, VW, VH); ctx.restore();
      const text = "AETHER'S TRIAL";
      ctx.save();
      ctx.font = 'bold 84px Georgia, "Times New Roman", serif'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const adv = []; let total = 0;
      for (let i = 0; i < text.length; i++) { const w = (ctx.measureText ? ctx.measureText(text[i]).width : 50) || 50; adv.push(w + 5); total += w + 5; }
      let x = (VW - total) / 2;
      const y0 = 248;
      for (let i = 0; i < text.length; i++) {
        const a = ease((t - 12.15 - i * 0.075) / 0.55);
        if (a > 0 && text[i] !== ' ') {
          const yy = y0 + (1 - a) * 22;
          ctx.globalAlpha = a;
          ctx.shadowColor = 'rgba(255,190,80,0.95)'; ctx.shadowBlur = 24;
          ctx.strokeStyle = '#3a2108'; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.strokeText(text[i], x, yy);
          ctx.shadowBlur = 0;
          const g = ctx.createLinearGradient(0, yy - 40, 0, yy + 40); g.addColorStop(0, '#fffbe8'); g.addColorStop(0.45, '#ffd96a'); g.addColorStop(1, '#d9892a');
          ctx.fillStyle = g; ctx.fillText(text[i], x, yy);
        }
        x += adv[i];
      }
      ctx.restore();
      // flourish and subtitle
      const fl = ease((t - 13.0) / 0.8);
      if (fl > 0) {
        ctx.save(); ctx.globalAlpha = fl;
        const lw = 300 * fl, cy = 305;
        const lg = ctx.createLinearGradient(VW / 2 - lw, 0, VW / 2 + lw, 0); lg.addColorStop(0, 'rgba(255,220,130,0)'); lg.addColorStop(0.5, 'rgba(255,230,160,1)'); lg.addColorStop(1, 'rgba(255,220,130,0)');
        ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(VW / 2 - lw, cy); ctx.lineTo(VW / 2 + lw, cy); ctx.stroke();
        ctx.fillStyle = '#ffe8a0'; ctx.beginPath(); ctx.moveTo(VW / 2, cy - 7); ctx.lineTo(VW / 2 + 7, cy); ctx.lineTo(VW / 2, cy + 7); ctx.lineTo(VW / 2 - 7, cy); ctx.closePath(); ctx.fill();
        ctx.font = '22px Georgia, "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const sub = 'A  TALE  OF  WIND  AND  FLAME';
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(sub, VW / 2 + 1, 341);
        ctx.fillStyle = '#fff1c8'; ctx.fillText(sub, VW / 2, 340);
        ctx.restore();
      }
      // drifting sparks
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 30; i++) {
        const p = mod(t * 0.2 + hash(i, 41), 1), x = 120 + hash(i, 42) * 720, y = 420 - p * 330, a = Math.sin(p * Math.PI) * 0.8 * dim;
        ctx.fillStyle = 'rgba(255,224,150,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 10, y, 1.6 + hash(i, 43) * 1.8, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  };

  AT.Cinematic = Cin;
})();
