// Aether's Trial — elemental aura + reaction logic (pure logic, no DOM). Owner: combat subagent.
(function () {
  const AT = globalThis.AT;
  const AURAS = { hydro: true, pyro: true };

  function vaporizeMul() {
    const r = AT.CFG && AT.CFG.REACTION;
    return (r && r.vaporize) || 1.5;
  }
  function auraDur() {
    const r = AT.CFG && AT.CFG.REACTION;
    return (r && r.auraDuration) || 6;
  }

  // Physical (and non pyro/hydro) elements never apply an aura.
  function applyElement(enemy, element, gaugeUnits) {
    if (!enemy || !AURAS[element]) return;
    enemy.aura = { element: element, t: gaugeUnits > 0 ? gaugeUnits : auraDur() };
  }

  function tick(enemy, dt) {
    if (!enemy || !enemy.aura) return;
    enemy.aura.t -= dt;
    if (enemy.aura.t <= 0) enemy.aura = null;
  }

  function isHydroAffected(enemy) {
    return !!enemy && (enemy.element === 'hydro' || (!!enemy.aura && enemy.aura.element === 'hydro'));
  }

  // Resolves one hit: may consume/apply auras. Returns {damage, reaction, multiplier, consumedAura}.
  function resolve(enemy, element, baseDamage) {
    const res = { damage: baseDamage, reaction: null, multiplier: 1, consumedAura: false };
    if (!enemy || element === 'physical' || element === 'none' || !element) return res;
    if (element === 'pyro' && isHydroAffected(enemy)) {
      res.reaction = 'vaporize';
      res.multiplier = vaporizeMul();
      res.damage = baseDamage * res.multiplier;
      if (enemy.aura && enemy.aura.element === 'hydro') { enemy.aura = null; res.consumedAura = true; }
      return res;
    }
    applyElement(enemy, element);
    return res;
  }

  AT.Elements = { applyElement, tick, resolve, isHydroAffected };
})();
