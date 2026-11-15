// Aether's Trial — bosses (Mitachurl, Storm Drake). Pure logic, no DOM.
// boss.telegraph: single telegraph (t elapsed, dur). For multi-circle AoE it is the first circle and carries
// `circles:[{x,y,r}]`; boss.telegraphs holds the full list (empty array when none).
// Cone telegraphs: {shape:'cone', x,y, r:range, angle, arc, t, dur}. Line: {shape:'line', x,y, angle, len, w}.
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;
  const MIN_WINDUP = 0.7;

  function playerAlive(p) { return !!p && !p.dead && !(p.hp <= 0) && p.anim !== 'dead'; }
  function angDiff(a, b) { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function hurt(player, amount, b, element) {
    if (AT.Combat && AT.Combat.damagePlayer) {
      AT.Combat.damagePlayer(player, amount, { x: b.x, y: b.y, source: b, element: element || b.element });
    }
  }
  function inCone(p, ox, oy, angle, arc, range) {
    const dx = p.x - ox, dy = p.y - oy, d = Math.hypot(dx, dy);
    if (d > range + p.r * 0.5) return false;
    if (d < p.r + 4) return true;
    const pad = Math.asin(Math.min(1, p.r * 0.5 / d));
    return Math.abs(angDiff(Math.atan2(dy, dx), angle)) <= arc / 2 + pad;
  }

  const Bosses = {
    create(id, x, y) {
      const c = AT.CFG.BOSS[id];
      if (!c) throw new Error('Unknown boss ' + id);
      const b = {
        id, kind: 'boss', bossId: id, type: id, name: c.name,
        element: id === 'stormdrake' ? 'electro' : 'geo',
        x, y, vx: 0, vy: 0, r: c.r, hp: c.hp, maxHp: c.hp, dead: false, facing: Math.PI / 2,
        hitFlash: 0, kb: { x: 0, y: 0 }, aura: null,
        state: 'idle', stateT: 0, telegraph: null, telegraphs: [],
        dmg: 0, speed: c.speed, xp: c.xp, coins: c.coins, rewardGiven: false, hitIds: {},
        deathT: 0, phase: 1, enraged: false, attackName: '', active: false,
        arena: { x, y, r: 420 }, home: { x, y },
        cd: 1.2, atk: null, atkDur: 0, recDur: 0, hitDone: false, lastAtk: '',
        strafe: 1, strafeT: 2, dashDir: 0, rng: AT.rng(id.length * 104729 + 7)
      };
      return b;
    },

    update(b, dt, ctx) {
      if (!b) return;
      if (b.dead) {
        b.state = 'dead'; b.telegraph = null; b.telegraphs = []; b.attackName = ''; b.vx = 0; b.vy = 0;
        b.deathT += dt;
        return;
      }
      if (AT.Elements && AT.Elements.tick) AT.Elements.tick(b, dt);
      const c = AT.CFG.BOSS[b.id];
      const player = ctx && ctx.player;
      const alive = playerAlive(player);
      b.hitFlash = Math.max(0, b.hitFlash - dt);
      b.stateT += dt;
      b.cd = Math.max(0, b.cd - dt);
      if (b.kb && (b.kb.x || b.kb.y)) {
        b.x += b.kb.x * dt; b.y += b.kb.y * dt;
        const k = Math.exp(-10 * dt);
        b.kb.x *= k; b.kb.y *= k;
        if (Math.abs(b.kb.x) < 2 && Math.abs(b.kb.y) < 2) { b.kb.x = 0; b.kb.y = 0; }
      }
      b.vx = 0; b.vy = 0;

      const dx = alive ? player.x - b.x : 0, dy = alive ? player.y - b.y : 0;
      const d = alive ? Math.hypot(dx, dy) : Infinity;
      const toP = alive ? Math.atan2(dy, dx) : b.facing;

      if (!b.active) {
        if (alive && (d < c.aggro || b.hp < b.maxHp)) { b.active = true; b.state = 'chase'; b.stateT = 0; b.cd = 1.0; }
        else return;
      }

      if (!b.enraged && b.hp <= b.maxHp * 0.5) {
        b.enraged = true; b.phase = 2;
        b.speed *= 1.2;
        b.telegraph = null; b.telegraphs = []; b.attackName = '';
        b.state = 'recover'; b.stateT = 0; b.recDur = 0.9; b.atk = null; b.cd = 0.6;
        if (AT.events) AT.events.emit('bossPhase', { id: b.id, name: b.name });
      }

      if (!alive && b.state !== 'chase' && b.state !== 'idle') { // player died mid-attack: stand down
        b.telegraph = null; b.telegraphs = []; b.attackName = ''; b.atk = null; b.state = 'chase'; b.stateT = 0;
      }

      if (b.id === 'mitachurl') this._mitachurl(b, dt, c, player, alive, d, toP);
      else this._drake(b, dt, c, player, alive, d, toP);

      b.x += b.vx * dt; b.y += b.vy * dt;
    },

    _go(b, name, windup, recover) {
      b.state = 'windup'; b.stateT = 0; b.atk = name; b.attackName = name;
      b.atkDur = Math.max(MIN_WINDUP, windup * (b.enraged ? 0.92 : 1));
      b.recDur = recover * (b.enraged ? 0.85 : 1);
      b.hitDone = false; b.lastAtk = name;
      if (AT.events) AT.events.emit('telegraph', { kind: name, x: b.x, y: b.y });
    },
    _finish(b, c) {
      b.state = 'recover'; b.stateT = 0; b.telegraph = null; b.telegraphs = [];
      b.cd = c.cd * (b.enraged ? 0.7 : 1);
    },
    _setTele(b, t) { b.telegraph = t; b.telegraphs = t ? (t.circles ? t.circles.map(ci => Object.assign({ shape: 'circle', t: t.t, dur: t.dur }, ci)) : [t]) : []; },

    _mitachurl(b, dt, c, player, alive, d, toP) {
      const rng = b.rng;
      switch (b.state) {
        case 'chase': {
          if (!alive) { b.facing = b.facing; break; }
          b.facing = toP;
          const stop = c.melee.range * 0.7;
          if (d > stop) { b.vx = Math.cos(toP) * b.speed; b.vy = Math.sin(toP) * b.speed; }
          if (b.cd <= 0) {
            const chargeLen = c.charge.speed * c.charge.dur;
            if (d <= c.melee.range + 15) {
              if (rng() < 0.6) this._go(b, 'melee', c.melee.windup, c.melee.recover);
              else this._go(b, 'slam', c.slam.windup, c.slam.recover);
            } else if (d <= c.slam.radius + 50 && rng() < 0.4) this._go(b, 'slam', c.slam.windup, c.slam.recover);
            else if (d > 170 && d <= chargeLen + 40) this._go(b, 'charge', c.charge.windup, c.charge.recover);
            else if (d > chargeLen + 40) b.cd = 0.2; // too far, keep walking
          }
          if (b.state === 'windup') b.dashDir = b.facing;
          break;
        }
        case 'windup': {
          const dur = b.atkDur, t = Math.min(b.stateT, dur);
          if (alive && b.stateT < dur * 0.55) { b.facing = toP; }
          if (b.atk === 'melee') {
            this._setTele(b, { shape: 'cone', x: b.x, y: b.y, r: c.melee.range, angle: b.facing, arc: c.melee.arc, t, dur });
          } else if (b.atk === 'charge') {
            b.dashDir = b.facing;
            this._setTele(b, { shape: 'line', x: b.x, y: b.y, angle: b.dashDir, len: c.charge.speed * c.charge.dur, w: c.charge.width, r: 0, t, dur });
          } else {
            this._setTele(b, { shape: 'circle', x: b.x, y: b.y, r: c.slam.radius, angle: 0, t, dur });
          }
          if (b.stateT >= dur) { b.state = 'attack'; b.stateT = 0; b.telegraph = null; b.telegraphs = []; }
          break;
        }
        case 'attack': {
          if (b.atk === 'melee') {
            if (!b.hitDone) {
              b.hitDone = true;
              if (alive && inCone(player, b.x, b.y, b.facing, c.melee.arc, c.melee.range)) hurt(player, c.melee.dmg, b);
            }
            if (b.stateT >= 0.2) this._finish(b, c);
          } else if (b.atk === 'charge') {
            b.vx = Math.cos(b.dashDir) * c.charge.speed; b.vy = Math.sin(b.dashDir) * c.charge.speed;
            if (alive && !b.hitDone && d < b.r + player.r + c.charge.width * 0.25) {
              b.hitDone = true; hurt(player, c.charge.dmg, b);
            }
            if (b.stateT >= c.charge.dur) this._finish(b, c);
          } else {
            if (!b.hitDone) {
              b.hitDone = true;
              if (alive && d < c.slam.radius) hurt(player, c.slam.dmg, b);
              if (AT.events) AT.events.emit('hit', { x: b.x, y: b.y, element: 'geo', reaction: null, heavy: true });
            }
            if (b.stateT >= 0.25) this._finish(b, c);
          }
          break;
        }
        case 'recover': {
          b.attackName = '';
          if (b.stateT >= (b.recDur || 0.8)) { b.state = 'chase'; b.stateT = 0; b.atk = null; }
          break;
        }
        default: b.state = 'chase'; b.stateT = 0;
      }
    },

    _drake(b, dt, c, player, alive, d, toP) {
      const rng = b.rng;
      switch (b.state) {
        case 'chase': {
          if (!alive) break;
          b.facing = toP;
          // hover: hold a mid distance and slowly orbit
          b.strafeT -= dt;
          if (b.strafeT <= 0) { b.strafeT = 1.5 + rng() * 2; b.strafe = rng() < 0.5 ? -1 : 1; }
          if (d > 300) { b.vx = Math.cos(toP) * b.speed; b.vy = Math.sin(toP) * b.speed; }
          else if (d < 170) { b.vx = -Math.cos(toP) * b.speed * 0.8; b.vy = -Math.sin(toP) * b.speed * 0.8; }
          else { b.vx = Math.cos(toP + Math.PI / 2 * b.strafe) * b.speed * 0.5; b.vy = Math.sin(toP + Math.PI / 2 * b.strafe) * b.speed * 0.5; }
          if (b.cd <= 0 && d < c.aggro * 1.3) {
            const opts = ['volley', 'aoe'];
            if (d < c.sweep.range + 60) opts.push('sweep', 'sweep');
            const pool = opts.filter(o => o !== b.lastAtk);
            const pick = pool[Math.floor(rng() * pool.length)];
            if (pick === 'volley') this._go(b, 'Storm Volley', c.projectile.windup, c.projectile.recover);
            else if (pick === 'sweep') this._go(b, 'Sweeping Storm', c.sweep.windup, c.sweep.recover);
            else this._go(b, 'Thunder Rain', c.aoe.windup, c.aoe.recover);
            b.atk = pick; b.lastAtk = pick;
            if (pick === 'aoe') {
              // lock circle centres now (around the player's current position); player can walk out
              const n = c.aoe.count + (b.enraged ? 1 : 0), circles = [];
              const W = ctx_world(b);
              for (let i = 0; i < n; i++) {
                const a = rng() * TAU, off = i === 0 ? 0 : 70 + rng() * 110;
                let x = player.x + Math.cos(a) * off, y = player.y + Math.sin(a) * off;
                if (W) { x = Math.max(60, Math.min(W.w - 60, x)); y = Math.max(60, Math.min(W.h - 60, y)); }
                circles.push({ x, y, r: c.aoe.radius });
              }
              b.circles = circles;
            }
            b.dashDir = b.facing; b.sweepStart = 0;
          }
          break;
        }
        case 'windup': {
          const dur = b.atkDur, t = Math.min(b.stateT, dur);
          if (alive && b.stateT < dur * 0.6 && b.atk !== 'aoe') { b.facing = toP; }
          if (b.atk === 'volley') {
            const spread = c.projectile.spread * (b.enraged ? 1.2 : 1);
            this._setTele(b, { shape: 'cone', x: b.x, y: b.y, r: 380, angle: b.facing, arc: spread, t, dur });
          } else if (b.atk === 'sweep') {
            // preview the entire swept sector
            this._setTele(b, { shape: 'cone', x: b.x, y: b.y, r: c.sweep.range, angle: b.facing, arc: c.sweep.arc + 0.5, t, dur });
          } else {
            this._setTele(b, { shape: 'circle', x: b.circles[0].x, y: b.circles[0].y, r: c.aoe.radius, angle: 0, t, dur, circles: b.circles });
          }
          if (b.stateT >= dur) {
            b.state = 'attack'; b.stateT = 0; b.telegraph = null; b.telegraphs = [];
            b.dashDir = b.facing; // locked aim
            if (b.atk === 'volley') this._fire(b, c);
          }
          break;
        }
        case 'attack': {
          if (b.atk === 'volley') {
            if (b.stateT >= 0.15) this._finish(b, c);
          } else if (b.atk === 'sweep') {
            const total = c.sweep.sweepTime * (b.enraged ? 0.85 : 1), p = Math.min(1, b.stateT / total);
            const beam = 0.5, ang = b.dashDir - c.sweep.arc / 2 + c.sweep.arc * p;
            b.facing = ang;
            this._setTele(b, { shape: 'cone', x: b.x, y: b.y, r: c.sweep.range, angle: ang, arc: beam, t: b.stateT, dur: total });
            if (alive && !b.hitDone && inCone(player, b.x, b.y, ang, beam, c.sweep.range)) { b.hitDone = true; hurt(player, c.sweep.dmg, b); }
            if (p >= 1) this._finish(b, c);
          } else {
            if (!b.hitDone) {
              b.hitDone = true;
              if (alive) for (const ci of b.circles) {
                if (Math.hypot(player.x - ci.x, player.y - ci.y) < ci.r) { hurt(player, c.aoe.dmg, b); break; }
              }
              if (AT.events) for (const ci of b.circles) AT.events.emit('hit', { x: ci.x, y: ci.y, element: 'electro', reaction: null, heavy: true });
            }
            if (b.stateT >= 0.3) this._finish(b, c);
          }
          break;
        }
        case 'recover': {
          b.attackName = '';
          if (b.stateT >= (b.recDur || 0.8)) { b.state = 'chase'; b.stateT = 0; b.atk = null; }
          break;
        }
        default: b.state = 'chase'; b.stateT = 0;
      }
    },

    _fire(b, c) {
      const p = c.projectile;
      const n = p.count + (b.enraged ? 2 : 0);
      const spread = p.spread * (b.enraged ? 1.2 : 1);
      const hitBase = AT.nextId();
      for (let i = 0; i < n; i++) {
        const a = b.dashDir + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
        if (AT.Projectiles && AT.Projectiles.spawn) {
          AT.Projectiles.spawn({
            owner: 'enemy', element: 'electro',
            x: b.x + Math.cos(a) * (b.r + 6), y: b.y + Math.sin(a) * (b.r + 6),
            vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed, r: p.r, dmg: p.dmg, life: p.life,
            pierce: false, hitIds: {}, dead: false, hitId: hitBase + i / 100, color: '#b58cff'
          });
        }
      }
    }
  };

  // Boss gets its world via ctx; stash it for helpers that need bounds.
  let _ctxWorld = null;
  function ctx_world() { return _ctxWorld; }
  const origUpdate = Bosses.update;
  Bosses.update = function (b, dt, ctx) { _ctxWorld = ctx && ctx.world || null; return origUpdate.call(Bosses, b, dt, ctx); };

  AT.Bosses = Bosses;
})();
