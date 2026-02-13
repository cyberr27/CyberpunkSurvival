// strongStrikeSystem.js

const strongStrikeSystem = {
  initialize() {
    // Пока что система пассивная — ничего особенного не нужно инициализировать
    console.log("[StrongStrike] Система сильного удара инициализирована");

    // Подписываемся на событие обновления статов (на всякий случай)
    document.addEventListener("statsUpdated", () => {
      const me = players.get(myId);
      if (!me) return;

      // Просто логируем для отладки — UI уже сам берёт meleeDamageBonus
      if (me.meleeDamageBonus !== undefined) {
        // console.debug(`[StrongStrike] Текущий бонус сильного удара: +${me.meleeDamageBonus} к min/max урону`);
      }
    });
  },

  // Метод можно вызвать из других мест, если захочешь показать где-то бонус явно
  getBonusDescription() {
    const me = players.get(myId);
    if (!me || !me.meleeDamageBonus) return "";
    return `+${me.meleeDamageBonus} к минимальному и максимальному урону в ближнем бою`;
  },
};

window.strongStrikeSystem = strongStrikeSystem;
