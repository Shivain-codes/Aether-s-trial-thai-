// Aether's Trial — keyboard input. Owner: core.
(function () {
  const AT = globalThis.AT;

  const ARROWS = { ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1 };
  const GAMEPLAY = {
    KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, Space: 1, ShiftLeft: 1, ShiftRight: 1,
    KeyE: 1, KeyQ: 1, KeyF: 1, KeyH: 1, KeyP: 1, Escape: 1, Tab: 1
  };

  const Input = {
    down: {},          // code -> true while held
    _pressed: {},      // code -> true for the frame the key went down
    _released: {},
    mouse: { x: 0, y: 0, down: false },
    _target: null,
    _handlers: null,

    bind(target) {
      if (this._target === target) return this;      // idempotent
      if (this._target) this.unbind();
      if (!target || !target.addEventListener) return this;
      const self = this;
      const h = {
        keydown(e) {
          const code = e.code;
          if (!code) return;
          if (self._isTextTarget(e)) return;
          if (self.shouldPreventDefault(code, e)) e.preventDefault();
          if (e.repeat) return;
          if (!self.down[code]) self._pressed[code] = true;
          self.down[code] = true;
        },
        keyup(e) {
          const code = e.code;
          if (!code) return;
          if (self._isTextTarget(e)) return;
          if (self.shouldPreventDefault(code, e)) e.preventDefault();
          if (self.down[code]) self._released[code] = true;
          delete self.down[code];
        },
        blur() { self.clear(); },
        visibility() { if (typeof document !== 'undefined' && document.hidden) self.clear(); }
      };
      this._handlers = h;
      this._target = target;
      target.addEventListener('keydown', h.keydown);
      target.addEventListener('keyup', h.keyup);
      target.addEventListener('blur', h.blur);
      if (typeof window !== 'undefined' && target !== window) window.addEventListener('blur', h.blur);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', h.visibility);
      return this;
    },

    unbind() {
      const t = this._target, h = this._handlers;
      if (!t || !h) return;
      t.removeEventListener('keydown', h.keydown);
      t.removeEventListener('keyup', h.keyup);
      t.removeEventListener('blur', h.blur);
      if (typeof window !== 'undefined' && t !== window) window.removeEventListener('blur', h.blur);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', h.visibility);
      this._target = null; this._handlers = null;
    },

    _isTextTarget(e) {
      const t = e && e.target;
      const n = t && t.tagName;
      return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT' || !!(t && t.isContentEditable);
    },

    shouldPreventDefault(code, e) {
      if (e && (e.ctrlKey || e.metaKey || e.altKey)) return false;
      if (code === 'Space' || ARROWS[code]) return true;           // never let the page scroll
      const st = AT.Game && AT.Game.state;
      if (st === 'playing' || st === 'paused') return !!GAMEPLAY[code];
      return false;
    },

    isDown(code) { return !!this.down[code]; },
    /** Edge-triggered: true during the frame the key went down (until endFrame()). */
    pressed(code) { return !!this._pressed[code]; },
    released(code) { return !!this._released[code]; },
    anyDown(codes) { for (let i = 0; i < codes.length; i++) if (this.down[codes[i]]) return true; return false; },
    anyPressed(codes) { for (let i = 0; i < codes.length; i++) if (this._pressed[codes[i]]) return true; return false; },

    /** Movement axis from WASD / arrows, not normalized. */
    axis() {
      const d = this.down;
      let x = 0, y = 0;
      if (d.KeyA || d.ArrowLeft) x -= 1;
      if (d.KeyD || d.ArrowRight) x += 1;
      if (d.KeyW || d.ArrowUp) y -= 1;
      if (d.KeyS || d.ArrowDown) y += 1;
      return { x, y };
    },

    /** Call once at the end of every frame. */
    endFrame() {
      for (const k in this._pressed) delete this._pressed[k];
      for (const k in this._released) delete this._released[k];
    },

    clear() {
      for (const k in this.down) delete this.down[k];
      for (const k in this._pressed) delete this._pressed[k];
      for (const k in this._released) delete this._released[k];
      this.mouse.down = false;
    },

    // Programmatic helpers (tests / touch).
    press(code) { if (!this.down[code]) this._pressed[code] = true; this.down[code] = true; },
    release(code) { if (this.down[code]) this._released[code] = true; delete this.down[code]; }
  };

  AT.Input = Input;
})();
