// Aether's Trial — regular enemies (slimes). Pure logic, no DOM.
// Telegraph convention (enemies and bosses): t = seconds ELAPSED since telegraph start, dur = total; progress = t/dur.
// enemy.deathT = seconds elapsed since death (removed by Levels once >= CFG.ENEMY.deathDur || 0.8).
(function () {
  const AT = globalThis.AT;
  const TAU = Math.PI * 2;

  function playerAlive(p) { return !!p && !p.dead && !(p.hp <= 0) && p.anim !== 'dead'; }
  function hurt(player, amount, e, element) {
    if (AT.Combat && AT.Combat.damagePlayer) {
      AT.Combat.damagePlayer(player, amount, { x: e.x, y: e.y, source: e, element: element || e.element });
    }
  }
  function sethome(e) { e.home = { x: e.x, y: e.y }; }

  const Enemies = {
    // opts: {behavior:'normal'|'lunger'|'shooter', rng}
    create(type, element, x, y, levelIndex, opts) {
      type = type || 'slime';
      opts = opts || {};
      const c = AT.CFG.ENEMY[type] || AT.CFG.ENEMY.slime;
      const L = (AT.CFG.LEVELS && AT.CFG.LEVELS[levelIndex || 0]) || {};
      const sm = L.enemySpeedMul || 1, dm = L.enemyDmgMul || 1, hm = L.enemyHpMul || 1;
      const behavior = opts.behavior || 'normal';
      const lunger = behavior === 'lunger', shooter = behavior === 'shooter';
      const id = AT.nextId();
      const e = {
        id, kind: 'enemy', type, element: element || 'hydro', behavior, levelIndex: levelIndex || 0,
        x, y, vx: 0, vy: 0, r: c.r,
        hp: Math.round(c.hp * hm * (shooter ? 0.8 : 1)), maxHp: 0,
        dead: false, facing: 0, hitFlash: 0, kb: { x: 0, y: 0 },
        aura: null, state: 'idle', stateT: 0, telegraph: null,
        dmg: c.dmg * dm * (lunger ? 1.1 : 1), speed: c.speed * sm * (lunger ? 1.15 : shooter ? 0.85 : 1),
        xp: c.xp * (1 + 0.4 * (levelIndex || 0)), coins: 0, rewardGiven: false, hitIds: {},
        deathT: 0, atkCd: 0.6 + (id % 5) * 0.2,
        aggro: shooter ? c.aggro * 1.4 : c.aggro,
        // slime attack tuning
        windup: lunger ? 0.48 : Math.max(0.5, c.windup), // always >= 0.45s visible
        recover: lunger ? c.recover * 0.6 : shooter ? c.recover * 1.6 : c.recover,
        leapSpeed: c.leapSpeed * sm * (lunger ? 1.3 : 1), leapTime: c.leapTime,
        attackRange: c.attackRange * (lunger ? 1.2 : 1),
        shootRange: 330, keepDist: 220,
        wanderT: 0, wanderA: 0, wanderMove: false,
        dirX: 1, dirY: 0, leapHit: false, fired: false,
        rng: opts.rng || AT.rng(id * 7919 + 13)
      };
      e.maxHp = e.hp;
      e.facing = e.rng() * TAU;
      sethome(e);
      return e;
    },

    update(e, dt, ctx) {
      if (!e) return;
      if (e.dead) { // dead enemies do nothing but run the death clock
        e.state = 'dead'; e.telegraph = null; e.vx = 0; e.vy = 0;
        e.deathT += dt;
        return;
      }
      if (AT.Elements && AT.Elements.tick) AT.Elements.tick(e, dt);
      const c = AT.CFG.ENEMY[e.type] || AT.CFG.ENEMY.slime;
      const player = ctx && ctx.player;
      const alive = playerAlive(player);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.atkCd = Math.max(0, e.atkCd - dt);
      e.stateT += dt;

      // knockback
      if (e.kb && (e.kb.x || e.kb.y)) {
        e.x += e.kb.x * dt; e.y += e.kb.y * dt;
        const k = Math.exp(-9 * dt);
        e.kb.x *= k; e.kb.y *= k;
        if (Math.abs(e.kb.x) < 2 && Math.abs(e.kb.y) < 2) { e.kb.x = 0; e.kb.y = 0; }
      }

      const dx = alive ? player.x - e.x : 0, dy = alive ? player.y - e.y : 0;
      const d = alive ? Math.sqrt(dx * dx + dy * dy) : Infinity;
      const toP = alive ? Math.atan2(dy, dx) : e.facing;
      e.vx = 0; e.vy = 0;
      const shooter = e.behavior === 'shooter';
      const leapDist = e.leapSpeed * e.leapTime;

      // contact damage (cooldown-gated); never during windup so telegraphs stay honest
      if (alive && e.state !== 'windup' && e.atkCd <= 0 && d < e.r + player.r) {
        hurt(player, e.dmg * (c.contactDmgMul || 0.6), e);
        e.atkCd = c.attackCd || 1.2;
      }

      const setState = (s) => { e.state = s; e.stateT = 0; };

      if (!alive && (e.state === 'windup' || e.state === 'attack' || e.state === 'chase')) {
        e.telegraph = null; setState('wander');
      }

      switch (e.state) {
        case 'idle':
        case 'wander': {
          if (alive && d < e.aggro) { setState('chase'); break; }
          e.wanderT -= dt;
          if (e.wanderT <= 0) {
            e.wanderT = 1 + e.rng() * 1.8;
            e.wanderMove = e.rng() < 0.6;
            // drift back toward home if strayed far
            const hx = e.home.x - e.x, hy = e.home.y - e.y;
            e.wanderA = Math.hypot(hx, hy) > 220 ? Math.atan2(hy, hx) : e.rng() * TAU;
          }
          if (e.wanderMove) {
            e.vx = Math.cos(e.wanderA) * e.speed * 0.45; e.vy = Math.sin(e.wanderA) * e.speed * 0.45;
            e.facing = e.wanderA;
          }
          e.state = e.wanderMove ? 'wander' : 'idle';
          break;
        }
        case 'chase': {
          if (!alive || d > e.aggro * 1.6) { setState('wander'); break; }
          e.facing = toP;
          if (shooter) {
            if (d > e.keepDist + 30) { e.vx = Math.cos(toP) * e.speed; e.vy = Math.sin(toP) * e.speed; }
            else if (d < e.keepDist - 50) { e.vx = -Math.cos(toP) * e.speed; e.vy = -Math.sin(toP) * e.speed; }
            if (e.atkCd <= 0 && d < e.shootRange && e.stateT > 0.3) { setState('windup'); e.fired = false; e.dirX = Math.cos(toP); e.dirY = Math.sin(toP); }
          } else {
            e.vx = Math.cos(toP) * e.speed; e.vy = Math.sin(toP) * e.speed;
            if (e.atkCd <= 0 && d < e.attackRange) { setState('windup'); e.leapHit = false; e.dirX = Math.cos(toP); e.dirY = Math.sin(toP); }
          }
          if (e.state === 'windup' && AT.events) AT.events.emit('telegraph', { kind: shooter ? 'shot' : 'leap', x: e.x, y: e.y });
          break;
        }
        case 'windup': {
          const dur = e.windup;
          // aim tracks the player for the first half, then locks (so it can be dodged)
          if (alive && e.stateT < dur * 0.5) {
            e.dirX = Math.cos(toP); e.dirY = Math.sin(toP);
          }
          e.facing = Math.atan2(e.dirY, e.dirX);
          const t = Math.min(e.stateT, dur);
          if (shooter) e.telegraph = { shape: 'line', x: e.x, y: e.y, angle: e.facing, len: e.shootRange, w: 16, r: 0, t, dur };
          else e.telegraph = { shape: 'circle', x: e.x, y: e.y, r: leapDist + e.r + 4, angle: e.facing, t, dur };
          if (e.stateT >= dur) {
            e.telegraph = null; setState('attack');
            if (shooter) {
              if (AT.Projectiles && AT.Projectiles.spawn) {
                AT.Projectiles.spawn({
                  owner: 'enemy', element: e.element, x: e.x + e.dirX * (e.r + 4), y: e.y + e.dirY * (e.r + 4),
                  vx: e.dirX * 260, vy: e.dirY * 260, r: 7, dmg: e.dmg * 0.85, life: 2.4,
                  pierce: false, hitIds: {}, dead: false, hitId: AT.nextId(), color: e.element === 'anemo' ? '#8ff5d0' : '#c78cff'
                });
              }
              e.fired = true; e.atkCd = (c.attackCd || 1.2) * 1.5;
            }
          }
          break;
        }
        case 'attack': {
          if (shooter) { setState('recover'); break; }
          // leap
          e.vx = e.dirX * e.leapSpeed; e.vy = e.dirY * e.leapSpeed;
          if (alive && !e.leapHit && d < e.r + player.r + 2) {
            e.leapHit = true;
            hurt(player, e.dmg, e);
            e.atkCd = c.attackCd || 1.2;
          }
          if (e.stateT >= e.leapTime) { if (e.atkCd < 0.8) e.atkCd = 0.8; setState('recover'); }
          break;
        }
        case 'recover': {
          if (e.stateT >= e.recover) { setState(alive && d < e.aggro * 1.6 ? 'chase' : 'wander'); }
          break;
        }
        default: setState('idle');
      }

      e.x += e.vx * dt; e.y += e.vy * dt;
    }
  };

  AT.Enemies = Enemies;
})();
