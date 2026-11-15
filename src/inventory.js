// Aether's Trial — inventory actions (potions, chests). Pure logic, Node-safe.
(function () {
  const AT = globalThis.AT;
  const I = {};

  I.interactRange = function () {
    const l = AT.CFG.LOOT;
    return (l && l.interactRange) || 64;
  };

  I.usePotion = function (player) {
    const P = AT.Progression;
    if (!player || player.dead || !P || !P.state) return false;
    const maxHp = player.maxHp || P.state.maxHp;
    if (P.state.potions <= 0) return false;
    if (!(player.hp < maxHp)) return false;
    const heal = Math.min(AT.CFG.LOOT.potionHeal, maxHp - player.hp);
    player.hp = Math.min(maxHp, player.hp + AT.CFG.LOOT.potionHeal);
    P.state.potions--;
    P.syncPlayer(player);
    AT.events.emit('hpChanged', {});
    AT.events.emit('potionUsed', { healed: heal });
    return true;
  };

  function fallbackRewards(chest, level) {
    const table = AT.CFG.LOOT.chests;
    const li = level && level.index != null ? level.index : (AT.Progression ? AT.Progression.levelIndex : 0);
    const list = table[li] || [];
    let ci = level && level.chests ? level.chests.indexOf(chest) : -1;
    if (ci < 0) ci = 0;
    return list[ci] || list[0] || { coins: 0, gems: 0, potions: 0 };
  }

  // Returns the rewards actually granted, or null if already opened.
  I.openChest = function (chest, player, level) {
    if (!chest || chest.opened) return null;
    chest.opened = true;
    const P = AT.Progression;
    const r = chest.rewards || fallbackRewards(chest, level || (AT.Game && AT.Game.level));
    const granted = {
      coins: P.addCoins(r.coins || 0),
      gems: P.addGems(r.gems || 0),
      potions: P.addPotions(r.potions || 0)
    };
    P.syncPlayer(player || AT.player);
    AT.events.emit('chestOpened', { chest: chest, x: chest.x, y: chest.y, rewards: granted });
    return granted;
  };

  I.nearestChest = function (player, chests, range) {
    if (!player || !chests) return null;
    range = range != null ? range : I.interactRange();
    let best = null, bd = Infinity;
    for (const c of chests) {
      if (!c || c.opened) continue;
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d <= range && d < bd) { bd = d; best = c; }
    }
    return best;
  };

  AT.Inventory = I;
})();
