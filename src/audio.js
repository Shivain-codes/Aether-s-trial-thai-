// Aether's Trial — procedural Web Audio SFX + soft ambient pad. Owner: visuals.
// Nothing runs at load. init() creates the AudioContext lazily (call from a user gesture).
(function () {
  const AT = globalThis.AT;

  const Audio = {
    ctx: null,
    master: null,
    sfxBus: null,
    padBus: null,
    muted: false,
    volume: 0.55,
    ambientOn: false,
    _pad: null,
    _noiseBuf: null,
    _last: {},
    _bound: false,
    _handlers: [],
    _gestureBound: false,

    /** Create the AudioContext lazily and resume it. Safe to call repeatedly. */
    init() {
      try {
        if (!this.ctx) {
          const AC = typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext);
          if (!AC) return false;
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = this.muted ? 0 : this.volume;
          const comp = this.ctx.createDynamicsCompressor();
          this.master.connect(comp); comp.connect(this.ctx.destination);
          this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 1; this.sfxBus.connect(this.master);
          this.padBus = this.ctx.createGain(); this.padBus.gain.value = 0.5; this.padBus.connect(this.master);
        }
        if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
        return true;
      } catch (e) { return false; }
    },

    setMuted(m) {
      this.muted = !!m;
      try { if (this.master) this.master.gain.value = this.muted ? 0 : this.volume; } catch (e) {}
    },
    toggleMute() { this.setMuted(!this.muted); return this.muted; },

    // ---------- primitives ----------
    _ready() {
      try {
        if (!this.ctx) return false;
        if (this.ctx.state === 'suspended' && this.ctx.resume) this.ctx.resume();
        return true;
      } catch (e) { return false; }
    },

    _noise() {
      const c = this.ctx;
      if (this._noiseBuf) return this._noiseBuf;
      const len = c.sampleRate * 1.5;
      const b = c.createBuffer(1, len, c.sampleRate);
      const d = b.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < len; i++) { s = (s * 1664525 + 1013904223) >>> 0; d[i] = (s / 4294967296) * 2 - 1; }
      this._noiseBuf = b;
      return b;
    },

    /** Oscillator blip with exponential frequency slide and ADSR-ish envelope. */
    tone(freq, dur, o) {
      o = o || {};
      const c = this.ctx; if (!c) return;
      const t0 = c.currentTime + (o.delay || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, freq), t0);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
      if (o.detune) osc.detune.value = o.detune;
      const v = (o.vol == null ? 0.25 : o.vol);
      const a = o.attack == null ? 0.005 : o.attack;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(v, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      let out = g;
      if (o.pan != null && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
      out.connect(o.bus || this.sfxBus);
      osc.start(t0); osc.stop(t0 + dur + 0.05);
    },

    /** Filtered noise burst. */
    noise(dur, o) {
      o = o || {};
      const c = this.ctx; if (!c) return;
      const t0 = c.currentTime + (o.delay || 0);
      const src = c.createBufferSource();
      src.buffer = this._noise();
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 1500, t0);
      if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + dur);
      f.Q.value = o.q == null ? 1 : o.q;
      const g = c.createGain();
      const v = o.vol == null ? 0.25 : o.vol;
      const a = o.attack == null ? 0.004 : o.attack;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(v, t0 + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
      src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
    },

    // ---------- sound definitions ----------
    _defs: {
      swing(A) {
        A.noise(0.16, { freq: 700, to: 3200, q: 0.9, vol: 0.22, attack: 0.02 });
        A.tone(420, 0.12, { type: 'triangle', to: 900, vol: 0.06 });
      },
      hit(A) {
        A.noise(0.09, { filter: 'lowpass', freq: 2400, to: 400, vol: 0.34 });
        A.tone(190, 0.12, { type: 'square', to: 70, vol: 0.2 });
        A.tone(1100, 0.05, { type: 'triangle', to: 600, vol: 0.08 });
      },
      fire(A) {
        A.noise(0.42, { filter: 'bandpass', freq: 500, to: 2200, q: 0.7, vol: 0.28, attack: 0.04 });
        A.tone(130, 0.35, { type: 'sawtooth', to: 260, vol: 0.09 });
        A.tone(520, 0.2, { type: 'triangle', to: 1040, vol: 0.05, delay: 0.04 });
      },
      vaporize(A) {
        A.noise(0.6, { filter: 'highpass', freq: 3500, to: 1600, q: 0.6, vol: 0.3, attack: 0.02 });
        A.noise(0.4, { filter: 'bandpass', freq: 1200, to: 4200, q: 1.5, vol: 0.14 });
        A.tone(900, 0.4, { type: 'sine', to: 220, vol: 0.1 });
      },
      burst(A) {
        A.noise(0.9, { filter: 'lowpass', freq: 3200, to: 160, q: 0.8, vol: 0.4, attack: 0.02 });
        A.tone(70, 0.8, { type: 'sine', to: 35, vol: 0.45 });
        A.tone(220, 0.7, { type: 'sawtooth', to: 880, vol: 0.1 });
        A.tone(660, 0.5, { type: 'triangle', to: 1320, vol: 0.08, delay: 0.1 });
      },
      dash(A) {
        A.noise(0.22, { filter: 'bandpass', freq: 2600, to: 700, q: 0.8, vol: 0.2 });
        A.tone(300, 0.15, { type: 'sine', to: 120, vol: 0.08 });
      },
      chest(A) {
        const n = [523, 659, 784, 1047, 1319];
        for (let i = 0; i < n.length; i++) A.tone(n[i], 0.35, { type: 'triangle', vol: 0.12, delay: i * 0.07 });
        A.tone(130, 0.2, { type: 'square', to: 80, vol: 0.12 });
      },
      coin(A) {
        A.tone(988, 0.07, { type: 'square', vol: 0.09 });
        A.tone(1319, 0.2, { type: 'square', vol: 0.09, delay: 0.06 });
      },
      levelup(A) {
        const n = [392, 494, 587, 784, 988];
        for (let i = 0; i < n.length; i++) {
          A.tone(n[i], 0.45, { type: 'triangle', vol: 0.15, delay: i * 0.09 });
          A.tone(n[i] * 2, 0.3, { type: 'sine', vol: 0.05, delay: i * 0.09 });
        }
      },
      bossdefeat(A) {
        A.tone(110, 1.2, { type: 'sawtooth', to: 40, vol: 0.25 });
        A.noise(1.0, { filter: 'lowpass', freq: 2200, to: 100, vol: 0.35 });
        const n = [392, 523, 659, 784, 1047];
        for (let i = 0; i < n.length; i++) A.tone(n[i], 0.7, { type: 'triangle', vol: 0.13, delay: 0.5 + i * 0.12 });
      },
      gameover(A) {
        const n = [392, 349, 311, 262];
        for (let i = 0; i < n.length; i++) A.tone(n[i], 0.7, { type: 'triangle', vol: 0.18, delay: i * 0.32, to: n[i] * 0.97 });
        A.tone(65, 1.6, { type: 'sine', vol: 0.3, delay: 0.2 });
      },
      victory(A) {
        const n = [523, 659, 784, 1047, 784, 1047, 1319];
        const d = [0, 0.14, 0.28, 0.42, 0.7, 0.84, 1.0];
        for (let i = 0; i < n.length; i++) {
          A.tone(n[i], 0.6, { type: 'triangle', vol: 0.16, delay: d[i] });
          A.tone(n[i] / 2, 0.6, { type: 'sine', vol: 0.1, delay: d[i] });
        }
      },
      hurt(A) {
        A.tone(240, 0.22, { type: 'sawtooth', to: 90, vol: 0.2 });
        A.noise(0.14, { filter: 'lowpass', freq: 1800, to: 300, vol: 0.2 });
      },
      potion(A) {
        for (let i = 0; i < 3; i++) A.tone(500 + i * 120, 0.12, { type: 'sine', to: 900 + i * 150, vol: 0.12, delay: i * 0.08 });
        A.tone(1400, 0.4, { type: 'sine', vol: 0.06, delay: 0.25 });
      },
      telegraph(A) {
        A.tone(180, 0.28, { type: 'sawtooth', to: 360, vol: 0.07, attack: 0.05 });
        A.tone(540, 0.2, { type: 'square', vol: 0.03, delay: 0.1 });
      },
      click(A) {
        A.tone(720, 0.05, { type: 'square', vol: 0.07 });
        A.tone(1080, 0.05, { type: 'triangle', vol: 0.05, delay: 0.03 });
      }
    },

    // per-sound minimum spacing (seconds) to avoid piling up
    _gap: { hit: 0.04, coin: 0.05, swing: 0.08, fire: 0.1, vaporize: 0.12, hurt: 0.15, telegraph: 0.2, dash: 0.1 },

    play(name) {
      try {
        if (this.muted) return false;
        if (!this.ctx) return false; // not unlocked by a gesture yet
        if (!this._ready()) return false;
        const def = this._defs[name];
        if (!def) return false;
        const now = this.ctx.currentTime;
        const gap = this._gap[name] || 0;
        if (gap && this._last[name] != null && now - this._last[name] < gap) return false;
        this._last[name] = now;
        def(this);
        return true;
      } catch (e) { return false; }
    },

    // ---------- ambient pad ----------
    startAmbient() {
      try {
        if (!this.ctx || this._pad) return;
        const c = this.ctx;
        const g = c.createGain(); g.gain.value = 0.0001;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.4;
        g.connect(lp); lp.connect(this.padBus);
        const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
        const lfoG = c.createGain(); lfoG.gain.value = 250;
        lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
        const notes = [110, 164.81, 220, 277.18]; // A2 E3 A3 C#4
        const oscs = [];
        for (let i = 0; i < notes.length; i++) {
          for (let k = 0; k < 2; k++) {
            const o = c.createOscillator();
            o.type = k ? 'triangle' : 'sine';
            o.frequency.value = notes[i];
            o.detune.value = (k ? 6 : -6) + i * 1.5;
            const og = c.createGain(); og.gain.value = 0.05 / (1 + i * 0.4);
            o.connect(og); og.connect(g); o.start();
            oscs.push(o);
          }
        }
        g.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 4);
        this._pad = { g, lp, lfo, oscs };
        this.ambientOn = true;
      } catch (e) {}
    },

    stopAmbient() {
      try {
        const p = this._pad; if (!p) return;
        const c = this.ctx, t = c.currentTime;
        p.g.gain.cancelScheduledValues(t);
        p.g.gain.setValueAtTime(Math.max(0.0001, p.g.gain.value), t);
        p.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        const stop = () => { try { p.oscs.forEach(o => o.stop()); p.lfo.stop(); } catch (e) {} };
        if (typeof setTimeout === 'function') setTimeout(stop, 1400); else stop();
        this._pad = null; this.ambientOn = false;
      } catch (e) {}
    },

    // ---------- event wiring ----------
    bind() {
      if (this._bound) return;
      this._bound = true;
      const ev = AT.events; if (!ev) return;
      const self = this;
      const map = {
        swordSwing: () => self.play('swing'),
        hit: (p) => { if (p && p.reaction) return; self.play(p && p.element === 'pyro' ? 'fire' : 'hit'); if (p && p.element === 'pyro') self.play('hit'); },
        reaction: () => self.play('vaporize'),
        skillCast: () => self.play('fire'),
        burstCast: () => self.play('burst'),
        dash: () => self.play('dash'),
        chestOpened: () => self.play('chest'),
        pickup: (p) => self.play(p && p.kind === 'potion' ? 'potion' : 'coin'),
        levelUp: () => self.play('levelup'),
        bossDefeated: () => self.play('bossdefeat'),
        playerDied: () => self.play('gameover'),
        victory: () => self.play('victory'),
        playerHurt: () => self.play('hurt'),
        potionUsed: () => self.play('potion'),
        telegraph: () => self.play('telegraph')
      };
      for (const k in map) { ev.on(k, map[k]); this._handlers.push([k, map[k]]); }
      // resume audio on first gesture even if the engine did not call init()
      if (!this._gestureBound && typeof window !== 'undefined' && window.addEventListener) {
        this._gestureBound = true;
        const g = () => { self.init(); };
        ['pointerdown', 'keydown', 'touchstart'].forEach(n => window.addEventListener(n, g, { passive: true }));
      }
    },

    unbind() {
      const ev = AT.events; if (ev) this._handlers.forEach(h => ev.off(h[0], h[1]));
      this._handlers = []; this._bound = false;
    }
  };

  AT.Audio = Audio;
})();
