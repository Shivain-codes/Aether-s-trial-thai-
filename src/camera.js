// Aether's Trial — camera: smooth follow, world clamp, screen shake. Owner: core.
(function () {
  const AT = globalThis.AT;

  function create(w, h) {
    const cfg = AT.CFG || {};
    const cam = {
      x: 0, y: 0,              // top-left of view in world space (includes shake offset)
      baseX: 0, baseY: 0,      // top-left without shake
      w: w || cfg.VIEW_W || 960,
      h: h || cfg.VIEW_H || 540,
      shakeT: 0, shakeDur: 0, shakeMag: 0, shakeX: 0, shakeY: 0,

      /** Add screen shake. A weaker shake never overrides a stronger running one. */
      shake(mag, dur) {
        mag = mag || 0; dur = dur || 0.2;
        const cur = this.shakeDur > 0 ? this.shakeMag * (this.shakeT / this.shakeDur) : 0;
        if (mag >= cur) { this.shakeMag = mag; this.shakeDur = dur; this.shakeT = dur; }
      },

      _clamp(world) {
        const ww = world && world.w, wh = world && world.h;
        if (ww == null || wh == null) return;
        this.baseX = ww <= this.w ? (ww - this.w) / 2 : AT.clamp(this.baseX, 0, ww - this.w);
        this.baseY = wh <= this.h ? (wh - this.h) / 2 : AT.clamp(this.baseY, 0, wh - this.h);
      },

      /** Jump straight to the target. */
      snap(target, world) {
        if (target) { this.baseX = target.x - this.w / 2; this.baseY = target.y - this.h / 2; }
        this._clamp(world);
        this.shakeT = 0; this.shakeX = 0; this.shakeY = 0;
        this.x = this.baseX; this.y = this.baseY;
      },

      /** Frame-rate independent smooth follow + shake decay. */
      update(dt, target, world) {
        dt = dt || 0;
        if (target) {
          const k = 1 - Math.exp(-((cfg.CAMERA && cfg.CAMERA.follow) || 8) * dt);
          const tx = target.x - this.w / 2, ty = target.y - this.h / 2;
          this.baseX += (tx - this.baseX) * k;
          this.baseY += (ty - this.baseY) * k;
        }
        this._clamp(world);
        if (this.shakeT > 0) {
          this.shakeT = Math.max(0, this.shakeT - dt);
          const f = this.shakeDur > 0 ? this.shakeT / this.shakeDur : 0;
          const m = this.shakeMag * f;
          this.shakeX = (Math.random() * 2 - 1) * m;
          this.shakeY = (Math.random() * 2 - 1) * m;
          if (this.shakeT === 0) { this.shakeMag = 0; this.shakeDur = 0; }
        } else { this.shakeX = 0; this.shakeY = 0; }
        this.x = this.baseX + this.shakeX;
        this.y = this.baseY + this.shakeY;
      },

      worldToScreen(wx, wy) { return { x: wx - this.x, y: wy - this.y }; },
      screenToWorld(sx, sy) { return { x: sx + this.x, y: sy + this.y }; },
      isVisible(wx, wy, margin) {
        margin = margin || 0;
        return wx > this.x - margin && wx < this.x + this.w + margin &&
               wy > this.y - margin && wy < this.y + this.h + margin;
      }
    };
    return cam;
  }

  AT.Camera = { create };
})();
