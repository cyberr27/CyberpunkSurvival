// regenerationSystem.js

const regenerationSystem = {
  isInitialized: false,

  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.startRegeneration();

    console.log("[Regeneration] Система инициализирована (без pendingRegen)");
  },

  startRegeneration() {
    setInterval(() => {
      const me = players.get(myId);
      if (!me || me.health <= 0) return;

      const skill = me.skills?.find((s) => s.id === 2);
      if (!skill || skill.level < 1) return;

      const percent = 5 + (skill.level - 1);
      const maxHp = me.maxStats?.health || 100;
      let healAmount = Math.floor((maxHp * percent) / 100);

      if (healAmount <= 0) return;

      const oldHealth = me.health;

      // Не превышаем максимум
      const canHeal = maxHp - me.health;
      healAmount = Math.min(healAmount, canHeal);

      if (healAmount <= 0) return;

      me.health += healAmount;

      showNotification(`Регенерация: +${healAmount} HP`, "#ff0000");

      console.log(
        `[Реген] +${healAmount} → ${me.health}/${maxHp}   (навык ур. ${skill.level})`,
      );

      if (ws?.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "update",
            player: {
              id: myId,
              health: me.health,
            },
          }),
        );
      }

      updateStatsDisplay();
    }, 30000); // каждые 30 секунд
  },
};

window.regenerationSystem = regenerationSystem;
