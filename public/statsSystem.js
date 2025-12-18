// statsSystem.js
// Модуль статистики игрока для Cyberpunk Survival

const statsEl = document.getElementById("stats");

function updateStatsDisplay() {
  if (!window.playerSystem || !window.playerSystem.getMyPlayer) return;
  const me = window.playerSystem.getMyPlayer();
  if (!me) return;
  statsEl.innerHTML = `
    <span class="health">Здоровье: ${me.health}/${
    me.maxStats?.health
  }</span><br>
    <span class="energy">Энергия: ${me.energy}/${me.maxStats?.energy}</span><br>
    <span class="food">Еда: ${me.food}/${me.maxStats?.food}</span><br>
    <span class="water">Вода: ${me.water}/${me.maxStats?.water}</span><br>
    <span class="armor">Броня: ${me.armor}/${me.maxStats?.armor || 0}</span>
  `;
  document.getElementById("coords").innerHTML = `X: ${Math.floor(
    me.x
  )}<br>Y: ${Math.floor(me.y)}`;
  if (window.levelSystem && window.levelSystem.updateUpgradeButtons)
    window.levelSystem.updateUpgradeButtons();
}

function updateResources() {
  // ...реализация updateResources из code.js...
}

window.statsSystem = {
  updateStatsDisplay,
  updateResources,
};
