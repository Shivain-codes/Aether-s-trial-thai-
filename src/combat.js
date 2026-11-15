// Aether's Trial — combat: sword, Pyro skill, elemental burst, damage paths (pure logic, no DOM). Owner: combat subagent.
(function () {
  const AT = globalThis.AT;
  const CFG = () => AT.CFG;
  const emit = (n, p) => AT.events.emit(n, p);

  const state = { swings: [], effects: [], clock: 0, swordReadyAt: 0, skillReadyAt: 0, comboUntil: -1 };
  const activeHitboxes = [];

  function addEnergy(player, n) {
    if (!player || !(n > 0) || player.dead) return;
    const max = player.maxEnergy || CFG().PLAYER.maxEnergy;
    const before = player.energy || 0;
    player.energy = Math.min(max, before + n);
    if (player.energy !== before) emit('energyChanged', {});
  }

  function resistOf(enemy) {
    const c = CFG();
    if (enemy.kind === 'boss') {
      const b = c.BOSS && c.BOSS[enemy.id];
      return (b && b.kbResist) || 0;
    }
    const e = c.ENEMY && c.ENEMY[enemy.type];
    return (e && e.kbResist) || 0;
  }

  // The ONE path through which enemies take damage.
  // opts: {amount, element, source, hitId, knockback:{x,y} | {dir,force}, dir, force, heavy, kind:'sword'|'skill'|'burst'|'projectile', energy}
  function dealDamageToEnemy(enemy, opts) {
    if (!enemy || !opts) return null;
    if (enemy.dead || enemy.state === 'dead' || !(enemy.hp > 0)) return null;
    if (!(opts.amount > 0)) return null;
    if (opts.hitId !== undefined && opts.hitId !== null) {
      enemy.hitIds = enemy.hitIds || {};
      if (enemy.hitIds[opts.hitId]) return null;
      enemy.hitIds[opts.hitId] = true;
    }
    const element = opts.element || 'physical';
    const source = opts.source || 'player';
    const res = AT.Elements.resolve(enemy, element, opts.amount);
    const dmg = res.damage;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    enemy.hitFlash = 0.12;

    // knockback
    let kx = 0, ky = 0;
    const kb = opts.knockback;
    if (kb && kb.x !== undefined) { kx = kb.x; ky = kb.y; }
    else {
      const dir = kb && kb.dir !== undefined ? kb.dir : opts.dir;
      const force = kb && kb.force !== undefined ? kb.force : opts.force;
      if (dir !== undefined && force) { kx = Math.cos(dir) * force; ky = Math.sin(dir) * force; }
    }
    if (kx || ky) {
      const k = 1 - Math.min(1, Math.max(0, resistOf(enemy)));
      enemy.kb = enemy.kb || { x: 0, y: 0 };
      enemy.kb.x += kx * k; enemy.kb.y += ky * k;
    }

    const killed = enemy.hp <= 0;
    if (killed) { enemy.dead = true; enemy.state = 'dead'; enemy.vx = 0; enemy.vy = 0; }

    emit('damage', { target: enemy, source: source, amount: dmg, element: element, reaction: res.reaction,
      crit: false, x: enemy.x, y: enemy.y, killed: killed });
    if (res.reaction) emit('reaction', { name: res.reaction, x: enemy.x, y: enemy.y, multiplier: res.multiplier });
    emit('hit', { x: enemy.x, y: enemy.y, element: element, reaction: res.reaction, heavy: !!opts.heavy });

    if (source === 'player') {
      const player = opts.player || AT.player;
      const e = CFG().ENERGY || {};
      let gain = opts.energy;
      if (gain === undefined) gain = opts.kind === 'sword' ? e.perSwordHit : opts.kind === 'skill' ? e.perSkillHit : 0;
      if (killed) gain = (gain || 0) + (e.perKill || 0);
      addEnergy(player, gain);
    }
    if (killed) {
      if (!enemy._killEmitted) {
        enemy._killEmitted = true;
        emit('enemyKilled', { enemy: enemy, x: enemy.x, y: enemy.y, byPlayer: true });
      }
      if (enemy.kind === 'boss' && !enemy._bossEmitted) {
        enemy._bossEmitted = true;
        emit('bossDefeated', { boss: enemy, id: enemy.id });
      }
    }
    return { damage: dmg, reaction: res.reaction, multiplier: res.multiplier, killed: killed };
  }

  // src: {x, y, element, source, knockback}
  function damagePlayer(player, amount, src) {
    if (!player || player.dead || player.hp <= 0) return false;
    if (player.invuln > 0) return false;
    if (!(amount > 0)) return false;
    src = src || {};
    const c = CFG();
    const dmg = Math.max(1, Math.round(amount));
    player.hp = Math.max(0, player.hp - dmg);
    player.invuln = c.PLAYER.invulnAfterHit;
    player.hitFlash = 0.15;
    if (src.x !== undefined && src.y !== undefined) {
      const a = Math.atan2(player.y - src.y, player.x - src.x);
      const f = src.knockback !== undefined ? src.knockback : c.PLAYER.hurtKnock;
      player.kb = player.kb || { x: 0, y: 0 };
      player.kb.x = Math.cos(a) * f; player.kb.y = Math.sin(a) * f;
    }
    if (c.ENERGY.perDamageTaken) addEnergy(player, dmg * c.ENERGY.perDamageTaken);
    const died = player.hp <= 0;
    emit('damage', { target: player, source: src.source || 'enemy', amount: dmg, element: src.element || 'physical',
      reaction: null, crit: false, x: player.x, y: player.y, killed: died });
    emit('playerHurt', { amount: dmg, x: player.x, y: player.y });
    emit('hpChanged', {});
    if (died) {
      player.dead = true;
      player.anim = 'dead';
      if (!player._deathEmitted) { player._deathEmitted = true; emit('playerDied', {}); }
    } else {
      player.anim = 'hurt';
    }
    return true;
  }

  function ready(player) { return player && !player.dead && !(player.hp <= 0); }

  function playerSword(player, ctx) {
    if (!ready(player)) return false;
    const c = CFG().SWORD;
    if (state.clock < state.swordReadyAt) return false;
    const combo = state.clock <= state.comboUntil ? ((player.combo || 0) + 1) % c.comboMul.length : 0;
    const hitId = AT.nextId();
    const angle = player.facing || 0;
    state.swordReadyAt = state.clock + c.cooldown;
    state.comboUntil = state.clock + c.comboWindow;
    player.atkCd = c.cooldown;
    player.combo = combo;
    player.swinging = c.duration;
    player.swingAngle = angle;
    player.swingId = hitId;
    state.swings.push({ type: 'sword', hitId: hitId, t: 0, dur: c.duration, hitDelay: c.hitDelay, angle: angle,
      range: c.range, arc: c.arc, mul: c.damageMul * (c.comboMul[combo] || 1), combo: combo,
      heavy: combo === c.comboMul.length - 1, element: 'physical', kb: c.knockback });
    emit('swordSwing', { x: player.x, y: player.y, angle: angle });
    return true;
  }

  function playerSkill(player, ctx) {
    if (!ready(player)) return false;
    const c = CFG().SKILL;
    if (state.clock < state.skillReadyAt) return false;
    const hitId = AT.nextId();
    const angle = player.facing || 0;
    state.skillReadyAt = state.clock + c.cooldown;
    player.skillCd = c.cooldown;
    state.swings.push({ type: 'skill', hitId: hitId, t: 0, dur: c.duration, hitDelay: c.hitDelay, angle: angle,
      range: c.range, arc: c.arc, mul: c.damageMul, heavy: true, element: 'pyro', kb: c.knockback });
    // fireball particle descriptors for fx (renderer/particles may read these)
    for (let i = 0; i < 7; i++) {
      const a = angle + (i / 6 - 0.5) * c.arc;
      state.effects.push({ type: 'fireball', x: player.x, y: player.y, angle: a, speed: c.range / c.duration * (0.6 + 0.4 * (i % 3) / 2),
        t: 0, dur: c.duration, element: 'pyro' });
    }
    addEnergy(player, c.energyGain);
    emit('skillCast', { x: player.x, y: player.y, angle: angle });
    return true;
  }

  function playerBurst(player, ctx) {
    if (!ready(player)) return false;
    const c = CFG().BURST;
    if ((player.energy || 0) < c.cost) return false;
    const hitBase = AT.nextId();
    player.energy = 0;
    emit('energyChanged', {});
    player.invuln = Math.max(player.invuln || 0, c.invuln);
    state.swings.push({ type: 'burst', t: 0, dur: c.ticks * c.tickInterval, ticks: c.ticks, tickIndex: 0,
      interval: c.tickInterval, radius: c.radius, mulPerTick: c.damageMul / c.ticks, hitBase: hitBase,
      element: 'pyro', kb: c.knockback });
    state.effects.push({ type: 'burst', x: player.x, y: player.y, r: c.radius, t: 0, dur: c.ticks * c.tickInterval + 0.35, element: 'pyro' });
    emit('burstCast', { x: player.x, y: player.y });
    return true;
  }

  function hitCone(s, player, enemies) {
    const C = AT.Collision;
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e || e.dead) continue;
      if (!C.pointInCone(e.x, e.y, e.r || 0, player.x, player.y, s.angle, s.arc, s.range)) continue;
      const a = Math.atan2(e.y - player.y, e.x - player.x);
      dealDamageToEnemy(e, { amount: player.atk * s.mul, element: s.element, source: 'player', hitId: s.hitId,
        knockback: { dir: a, force: s.kb }, heavy: s.heavy, kind: s.type, player: player });
    }
  }

  function update(dt, ctx) {
    ctx = ctx || {};
    const enemies = ctx.enemies || [];
    const player = ctx.player || AT.player;
    state.clock += dt;
    activeHitboxes.length = 0;

    if (player) {
      player.atkCd = Math.max(0, state.swordReadyAt - state.clock);
      player.skillCd = Math.max(0, state.skillReadyAt - state.clock);
    }
    for (let i = 0; i < enemies.length; i++) AT.Elements.tick(enemies[i], dt);

    const dead = !player || player.dead;
    for (let i = 0; i < state.swings.length; i++) {
      const s = state.swings[i];
      s.t += dt;
      if (dead) { s.done = true; continue; }
      if (s.type === 'burst') {
        while (s.tickIndex < s.ticks && s.t >= s.tickIndex * s.interval) {
          const id = s.hitBase + ':' + s.tickIndex;
          s.tickIndex++;
          const C = AT.Collision;
          for (let j = 0; j < enemies.length; j++) {
            const e = enemies[j];
            if (!e || e.dead) continue;
            if (!C.circleCircle({ x: player.x, y: player.y, r: s.radius }, e)) continue;
            const a = Math.atan2(e.y - player.y, e.x - player.x);
            dealDamageToEnemy(e, { amount: player.atk * s.mulPerTick, element: 'pyro', source: 'player', hitId: id,
              knockback: { dir: a, force: s.kb }, heavy: true, kind: 'burst', energy: 0, player: player });
          }
        }
        activeHitboxes.push({ shape: 'circle', x: player.x, y: player.y, r: s.radius, range: s.radius, angle: 0, arc: Math.PI * 2,
          t: s.t, dur: s.dur, element: 'pyro' });
      } else {
        if (s.t >= s.hitDelay) hitCone(s, player, enemies); // hitIds prevent repeats across the window
        activeHitboxes.push({ shape: 'cone', x: player.x, y: player.y, r: s.range, angle: s.angle, arc: s.arc, range: s.range,
          t: s.t, dur: s.dur, element: s.element, combo: s.combo, type: s.type });
      }
      if (s.t >= s.dur) s.done = true;
    }
    state.swings = state.swings.filter(s => !s.done);

    for (let i = 0; i < state.effects.length; i++) state.effects[i].t += dt;
    state.effects = state.effects.filter(f => f.t < f.dur);
  }

  function reset() {
    state.swings = []; state.effects = []; state.clock = 0;
    state.swordReadyAt = 0; state.skillReadyAt = 0; state.comboUntil = -1;
    activeHitboxes.length = 0;
  }

  AT.Combat = { state, activeHitboxes, dealDamageToEnemy, damagePlayer, playerSword, playerSkill, playerBurst, update, reset, addEnergy };
})();
