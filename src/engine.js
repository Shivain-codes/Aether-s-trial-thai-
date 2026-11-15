// Aether's Trial — engine: game loop, state machine, canvas fit, click handling. Owner: core. Loaded last.
(function () {
  const AT = globalThis.AT;
  const has = (m, f) => !!(AT[m] && typeof AT[m][f] === 'function');
  const flow = (k, d) => (AT.CFG && AT.CFG.FLOW && AT.CFG.FLOW[k] != null) ? AT.CFG.FLOW[k] : d;
  const WORLD_STATES = { playing: 1, paused: 1, levelComplete: 1, gameOver: 1, victory: 1 };

  const Game = {
    state: 'title',
    levelIndex: 0,
    level: null,
    player: null,
    cam: null,
    time: 0,
    enemies: [],          // living + dead regulars and boss of the current level (rebuilt every step)
    canvas: null, ctx: null,
    viewScale: 1,
    cinematicPlayed: false,
    deathT: 0, completeT: 0,
    _raf: 0, _token: 0, _last: null,
    _wired: false, _eventsBound: false, _audioReady: false, _errLogged: {},

    // ------------------------------------------------------------ state
    setState(s) {
      if (s === this.state) return;
      const from = this.state;
      this.state = s;
      if (from === 'cinematic' && typeof document !== 'undefined') {
        const el = document.getElementById('narrFallback');
        if (el) { el.style.display = 'none'; el.hidden = true; }
      }
      if (AT.events) AT.events.emit('statechange', { from, to: s });
    },

    pause() { if (this.state === 'playing') this.setState('paused'); },
    resume() { if (this.state === 'paused') { if (AT.Input) AT.Input.clear(); this.setState('playing'); } },

    /** New run from the title / victory screen. */
    startGame() {
      if (has('Progression', 'reset')) AT.Progression.reset();
      this.levelIndex = 0;
      const C = AT.Cinematic;
      if (C && !C.played && !this.cinematicPlayed && has('Cinematic', 'start')) {
        this.cinematicPlayed = true;           // never replay, even if the module forgets to set its flag
        C.start();
        this.setState('cinematic');
      } else {
        this.beginLevel(0);
      }
    },

    _finishCinematic() {
      if (AT.Cinematic) AT.Cinematic.played = true;
      this.cinematicPlayed = true;
      this.beginLevel(0);
    },

    beginLevel(i) {
      if (has('Progression', 'beginLevel')) AT.Progression.beginLevel(i);
      this._loadLevel(i);
      this.setState('playing');
    },

    /** Restore the level-entry snapshot and reload the same level. Never plays the cinematic. */
    retry() {
      if (has('Progression', 'retryLevel')) AT.Progression.retryLevel();
      this._loadLevel(this.levelIndex);
      this.setState('playing');
    },

    nextLevel() {
      const next = this.levelIndex + 1;
      const total = (AT.CFG.LEVELS && AT.CFG.LEVELS.length) || 2;
      if (next >= total) { this._victory(); return; }
      this.beginLevel(next);
    },

    toTitle() {
      this.level = null;
      this.setState('title');
    },

    _victory() {
      this.setState('victory');
      if (AT.events) AT.events.emit('victory', {});
    },

    _loadLevel(i) {
      this.levelIndex = i;
      if (has('Projectiles', 'clear')) AT.Projectiles.clear();
      if (has('Particles', 'clear')) AT.Particles.clear();
      if (has('Combat', 'reset')) AT.Combat.reset();
      if (AT.Combat && Array.isArray(AT.Combat.activeHitboxes)) AT.Combat.activeHitboxes.length = 0;
      if (AT.Renderer && Array.isArray(AT.Renderer.floatingText)) AT.Renderer.floatingText.length = 0;

      const seed = ((AT.CFG.SEED != null ? AT.CFG.SEED : 1337) + i * 101) >>> 0;
      this.level = has('Levels', 'load') ? AT.Levels.load(i, AT.rng(seed)) : null;
      const world = this.level && this.level.world;

      const p = AT.Player.create();
      const start = (world && world.playerStart) || { x: (world && world.w / 2) || 0, y: (world && world.h / 2) || 0 };
      p.x = start.x; p.y = start.y;
      this.player = p; AT.player = p;

      if (!this.cam) this.cam = AT.Camera.create(AT.CFG.VIEW_W, AT.CFG.VIEW_H);
      this.cam.snap(p, world);
      this.time = 0; this.deathT = 0; this.completeT = 0;
      this._rebuildEnemies();
      if (AT.Input) AT.Input.clear();
    },

    _rebuildEnemies() {
      const out = this.enemies; out.length = 0;
      const lv = this.level;
      if (!lv) return;
      if (lv.enemies) for (let i = 0; i < lv.enemies.length; i++) out.push(lv.enemies[i]);
      if (lv.boss) out.push(lv.boss);
    },

    _ctx() {
      const lv = this.level;
      return {
        player: this.player, enemies: this.enemies, world: lv && lv.world, level: lv,
        obstacles: lv && lv.world && lv.world.obstacles, game: this, input: AT.Input
      };
    },

    // ------------------------------------------------------------ simulation
    /** Pure simulation step; safe from Node (no DOM). Gameplay only advances while state === 'playing'. */
    step(dt) {
      dt = Math.max(0, Math.min(+dt || 0, AT.CFG.MAX_DT));
      const st = this.state;

      if (st === 'cinematic') {
        const C = AT.Cinematic;
        if (!C || !has('Cinematic', 'update') || C.update(dt) === true) this._finishCinematic();
        return;
      }
      if (st === 'playing' && this.level && this.player) {
        this.time += dt;
        this._rebuildEnemies();
        const ctx = this._ctx();
        const p = this.player, lv = this.level;

        AT.Player.update(p, dt, ctx);
        if (has('Combat', 'update')) AT.Combat.update(dt, ctx);
        if (has('Projectiles', 'update')) AT.Projectiles.update(dt, ctx);
        if (has('Levels', 'update')) AT.Levels.update(dt, lv, p);
        this._rebuildEnemies();
        if (has('Loot', 'update')) AT.Loot.update(dt, lv, p);
        this.cam.update(dt, p, lv.world);
        this._fx(dt);

        if (p.dead || p.hp <= 0) {
          this.deathT += dt;
          if (this.deathT >= flow('deathDelay', 0.8)) { this.setState('gameOver'); return; }
        }
        if (lv.completed && !p.dead) {
          this.completeT += dt;
          if (this.completeT >= flow('completeDelay', 0.5)) {
            const total = (AT.CFG.LEVELS && AT.CFG.LEVELS.length) || 2;
            if (this.levelIndex + 1 >= total) this._victory(); else this.setState('levelComplete');
          }
        }
        return;
      }
      if ((st === 'levelComplete' || st === 'gameOver' || st === 'victory') && this.level) {
        // purely cosmetic: let particles / floating text / camera settle; no gameplay
        this.cam.update(dt, null, this.level.world);
        this._fx(dt);
      }
      // title / paused: nothing advances
    },

    _fx(dt) {
      if (has('Particles', 'update')) AT.Particles.update(dt);
      if (has('Renderer', 'update')) AT.Renderer.update(dt);
      if (has('HUD', 'update')) AT.HUD.update(dt, this);
    },

    // ------------------------------------------------------------ input -> state transitions
    handleInput() {
      const In = AT.Input; if (!In) return;
      const enter = In.pressed('Enter') || In.pressed('NumpadEnter');
      const esc = In.pressed('Escape');
      switch (this.state) {
        case 'title': if (enter || In.pressed('Space')) this.startGame(); break;
        case 'cinematic':
          if (enter || esc) { if (has('Cinematic', 'skip')) AT.Cinematic.skip(); this._finishCinematic(); }
          break;
        case 'playing': if (esc || In.pressed('KeyP')) this.pause(); break;
        case 'paused': if (esc || In.pressed('KeyP') || enter) this.resume(); break;
        case 'levelComplete': if (enter) this.nextLevel(); break;
        case 'gameOver': if (enter || In.pressed('KeyR')) this.retry(); break;
        case 'victory': if (enter) this.toTitle(); break;
      }
    },

    _toLogical(e) {
      const c = this.canvas; if (!c) return null;
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (e.clientX - r.left) * AT.CFG.VIEW_W / r.width, y: (e.clientY - r.top) * AT.CFG.VIEW_H / r.height };
    },

    _hitButton(pt) {
      const bs = AT.HUD && AT.HUD.buttons;
      if (!pt || !bs) return null;
      for (let i = bs.length - 1; i >= 0; i--) {
        const b = bs[i]; if (!b) continue;
        const w = b.w != null ? b.w : b.width, h = b.h != null ? b.h : b.height;
        if (pt.x >= b.x && pt.x <= b.x + w && pt.y >= b.y && pt.y <= b.y + h && b.disabled !== true) return b;
      }
      return null;
    },

    onClick(e) {
      this._initAudio();
      const pt = this._toLogical(e);
      const b = this._hitButton(pt);
      if (b) {
        if (has('Audio', 'play')) { try { AT.Audio.play('click'); } catch (_) {} }
        if (typeof b.onClick === 'function') { b.onClick(); return; }
        this.doAction(b.action || b.id || b.name || b.type || b.label);
        return;
      }
      if (this.state === 'title') this.startGame();
    },

    doAction(name) {
      const a = String(name || '').toLowerCase().replace(/[\s_-]/g, '');
      const st = this.state;
      switch (a) {
        case 'start': case 'play': case 'newgame': case 'begin': case 'startgame':
          if (st === 'title' || st === 'victory') { if (st === 'victory') this.toTitle(); this.startGame(); } break;
        case 'resume': case 'continue': this.resume(); break;
        case 'pause': this.pause(); break;
        case 'retry': case 'tryagain': if (st === 'gameOver') this.retry(); break;
        case 'restart':
          if (st === 'gameOver') this.retry();
          else if (st === 'victory') { this.toTitle(); this.startGame(); }
          else if (st === 'paused') { this.setState('playing'); this.retry(); }
          break;
        case 'next': case 'nextlevel': case 'continuenext': if (st === 'levelComplete') this.nextLevel(); break;
        case 'title': case 'menu': case 'home': case 'quit': case 'mainmenu': this.toTitle(); break;
      }
    },

    _initAudio() {
      if (this._audioReady) return;
      this._audioReady = true;
      if (has('Audio', 'init')) { try { AT.Audio.init(); } catch (e) { /* audio is optional */ } }
    },

    // ------------------------------------------------------------ browser wiring
    _bindEvents() {
      if (this._eventsBound || !AT.events) return;
      this._eventsBound = true;
      const sh = (m, d) => { if (this.cam) this.cam.shake(m, d); };
      AT.events.on('playerHurt', () => sh(5, 0.2));
      AT.events.on('burstCast', () => sh(7, 0.3));
      AT.events.on('bossDefeated', () => sh(9, 0.6));
      AT.events.on('hit', (e) => { if (e && e.heavy) sh(3, 0.12); });
      if (has('Audio', 'bind')) AT.Audio.bind();
      if (has('Particles', 'bind')) AT.Particles.bind();
      if (has('Progression', 'bind')) AT.Progression.bind();
    },

    resize() {
      const c = this.canvas; if (!c || typeof window === 'undefined') return;
      const VW = AT.CFG.VIEW_W, VH = AT.CFG.VIEW_H;
      const aw = Math.max(160, window.innerWidth || VW), ah = Math.max(90, window.innerHeight || VH);
      const s = Math.min(aw / VW, ah / VH);
      const cw = Math.floor(VW * s), ch = Math.floor(VH * s);
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr);
      c.style.width = cw + 'px'; c.style.height = ch + 'px';
      c.style.position = 'absolute';
      c.style.left = Math.floor((aw - cw) / 2) + 'px';
      c.style.top = Math.floor((ah - ch) / 2) + 'px';
      this.viewScale = c.width / VW;
    },

    start(canvas) {
      if (!this.cam && AT.Camera) this.cam = AT.Camera.create(AT.CFG.VIEW_W, AT.CFG.VIEW_H);
      this._bindEvents();
      if (!canvas) return this;                     // headless
      this.canvas = canvas;
      this.ctx = canvas.getContext ? canvas.getContext('2d') : null;
      this.resize();

      if (!this._wired && typeof window !== 'undefined') {
        this._wired = true;
        if (AT.Input) AT.Input.bind(window);
        window.addEventListener('resize', () => this.resize());
        canvas.addEventListener('click', (e) => this.onClick(e));
        canvas.addEventListener('mousemove', (e) => {
          const pt = this._toLogical(e); if (!pt) return;
          if (AT.Input) { AT.Input.mouse.x = pt.x; AT.Input.mouse.y = pt.y; }
          canvas.style.cursor = this._hitButton(pt) ? 'pointer' : 'default';
        });
        const gesture = () => this._initAudio();
        window.addEventListener('keydown', gesture);
        window.addEventListener('pointerdown', gesture);
        window.addEventListener('blur', () => this.pause());           // never lose progress to a background tab
        document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); this._last = null; });
      }

      // single rAF loop: cancel any previous one, invalidate its token
      if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
      const token = ++this._token;
      this._last = null;
      const frame = (ts) => {
        if (token !== this._token) return;          // stale loop
        this._raf = requestAnimationFrame(frame);
        try { this._frame(ts); }
        catch (err) {
          const k = String(err && err.message);
          if (!this._errLogged[k]) { this._errLogged[k] = true; if (typeof console !== 'undefined') console.error('[AT.Game frame]', err); }
        }
      };
      this._raf = requestAnimationFrame(frame);
      return this;
    },

    stop() {
      this._token++;
      if (this._raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._raf);
      this._raf = 0;
    },

    _frame(ts) {
      let dt = this._last == null ? 0 : (ts - this._last) / 1000;
      this._last = ts;
      if (!(dt > 0)) dt = 0;
      dt = Math.min(dt, AT.CFG.MAX_DT);
      this.handleInput();
      this.step(dt);
      if (AT.Input) AT.Input.endFrame();
      this.draw();
    },

    draw() {
      const ctx = this.ctx, c = this.canvas; if (!ctx || !c) return;
      const W = AT.CFG.VIEW_W, H = AT.CFG.VIEW_H, k = c.width / W;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0b1020';
      ctx.fillRect(0, 0, W, H);
      const st = this.state;
      if (st === 'cinematic') {
        if (has('Cinematic', 'draw')) AT.Cinematic.draw(ctx, W, H);
        return;
      }
      const inWorld = !!WORLD_STATES[st] && this.level;
      if (inWorld && has('Renderer', 'drawWorld')) AT.Renderer.drawWorld(ctx, this, this.cam, this.time);
      if (inWorld && has('HUD', 'draw')) AT.HUD.draw(ctx, this);
      if (has('HUD', 'drawScreen')) AT.HUD.drawScreen(ctx, this);
    }
  };

  AT.Game = Game;

  // ---- boot (browser only) ----
  if (typeof document !== 'undefined') {
    const boot = () => {
      const c = document.querySelector('canvas#game');
      if (c) Game.start(c);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
