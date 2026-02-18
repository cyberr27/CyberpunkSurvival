// playerUpdateQueue.js
(function () {
  // Очередь обновлений только для своего игрока
  const queue = [];
  let isProcessing = false;

  function enqueue(updateData) {
    queue.push(updateData);
    if (!isProcessing) processNext();
  }

  function processNext() {
    if (queue.length === 0) {
      isProcessing = false;
      return;
    }

    isProcessing = true;

    const data = queue.shift();

    const me = players.get(myId);
    if (!me) {
      setTimeout(processNext, 0);
      return;
    }

    // ─── Применяем только статы (позицию, direction, state, frame не трогаем) ───
    if (data.health !== undefined) {
      const oldHealth = Number(me.health) || 0;
      let newHealth = Number(data.health);
      newHealth = Math.max(0, newHealth);

      if (newHealth < oldHealth && window.regenerationSystem) {
        window.regenerationSystem.resetTimerOnDamage();
      }

      me.health = Math.max(0, Math.min(newHealth, me.maxStats?.health || 100));
    }

    if (data.energy !== undefined) {
      me.energy = Math.max(
        0,
        Math.min(Number(data.energy), me.maxStats?.energy || 100),
      );
    }
    if (data.food !== undefined) {
      me.food = Math.max(
        0,
        Math.min(Number(data.food), me.maxStats?.food || 100),
      );
    }
    if (data.water !== undefined) {
      me.water = Math.max(
        0,
        Math.min(Number(data.water), me.maxStats?.water || 100),
      );
    }
    if (data.armor !== undefined) {
      me.armor = Number(data.armor);
    }
    if (data.distanceTraveled !== undefined) {
      me.distanceTraveled = Number(data.distanceTraveled);
    }
    if (data.meleeDamageBonus !== undefined) {
      me.meleeDamageBonus = Number(data.meleeDamageBonus);
    }

    // Инвентарь и экипировка — применяем как раньше
    if (data.inventory) {
      inventory = data.inventory.map((slot) => (slot ? { ...slot } : null));
      me.inventory = inventory.map((slot) => (slot ? { ...slot } : null));
      window.inventorySystem?.updateInventoryDisplay();

      if (window.misterTwister?.isMenuOpen) {
        window.misterTwister.updateLocalBalanceDisplay();
      }
    }

    if (data.equipment) {
      window.equipmentSystem.syncEquipment(data.equipment);
    }

    updateStatsDisplay();

    // Следующий элемент очереди — асинхронно, чтобы не блокировать рендер
    setTimeout(processNext, 0);
  }

  // Экспорт в глобальную область
  window.playerUpdateQueue = {
    enqueue: enqueue,
  };
})();
