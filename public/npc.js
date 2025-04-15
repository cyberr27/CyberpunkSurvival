// npc.js
const NPC_CONFIG = {
  id: "npc_1",
  x: 591, // Позиция NPC в мире
  y: 3100,
  sprite: null, // Будем использовать спрайт
  missions: [
    {
      id: "mission_1",
      title: "Собери 5 орехов",
      description: "Найди и подбери 5 орехов в мире.",
      reward: { balyary: 10 },
      condition: () => {
        const nutSlot = inventory.findIndex(
          (slot) => slot && slot.type === "nut" && (slot.quantity || 1) >= 5
        );
        return nutSlot !== -1;
      },
    },
    {
      id: "mission_2",
      title: "Убей волка",
      description: "Найди и уничтожь одного волка.",
      reward: { balyary: 20 },
      condition: () => false, // Пока заглушка, нужно добавить счётчик убийств
    },
    {
      id: "mission_3",
      title: "Путешественник",
      description: "Пройди 1000 пикселей.",
      reward: { balyary: 15 },
      condition: () => {
        const me = players.get(myId);
        return me && me.distanceTraveled >= 1000;
      },
    },
  ],
};

// Загрузка спрайта NPC
const npcSprite = new Image();
npcSprite.src = "npc_sprite.png"; // Нужно добавить спрайт NPC в папку public
NPC_CONFIG.sprite = npcSprite;

// Хранилище активных миссий игрока
let activeMission = null;

// Функция проверки расстояния до NPC
function isNearNPC(playerX, playerY) {
  const dx = playerX - NPC_CONFIG.x;
  const dy = playerY - NPC_CONFIG.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= 200; // 200 пикселей
}

// Функция проверки, находится ли курсор над NPC
function isCursorOverNPC(cursorX, cursorY) {
  const screenX = NPC_CONFIG.x - camera.x;
  const screenY = NPC_CONFIG.y - camera.y;
  return (
    cursorX >= screenX &&
    cursorX <= screenX + 40 &&
    cursorY >= screenY &&
    cursorY <= screenY + 40
  );
}

// Отображение диалогового окна
function showMissionDialog() {
  const dialog = document.getElementById("missionDialog");
  const missionList = document.getElementById("missionList");
  missionList.innerHTML = "";

  NPC_CONFIG.missions.forEach((mission) => {
    const missionItem = document.createElement("div");
    missionItem.className = "mission-item";
    missionItem.innerHTML = `
        <h3>${mission.title}</h3>
        <p>${mission.description}</p>
        <p>Награда: ${mission.reward.balyary} Баляр</p>
      `;
    if (activeMission && activeMission.id === mission.id) {
      missionItem.classList.add("active");
      missionItem.innerHTML += `<p class="mission-status">Активна</p>`;
    } else {
      const selectBtn = document.createElement("button");
      selectBtn.className = "action-btn select-btn";
      selectBtn.textContent = "Выбрать";
      selectBtn.onclick = () => selectMission(mission.id);
      missionItem.appendChild(selectBtn);
    }
    missionList.appendChild(missionItem);
  });

  dialog.style.display = "flex";
}

// Выбор миссии
function selectMission(missionId) {
  const mission = NPC_CONFIG.missions.find((m) => m.id === missionId);
  if (mission) {
    activeMission = mission;
    console.log(`Миссия выбрана: ${mission.title}`);
    document.getElementById("missionDialog").style.display = "none";
    updateMissionStatus();
    // Отправляем на сервер
    sendWhenReady(ws, JSON.stringify({ type: "selectMission", missionId }));
  }
}

// Проверка выполнения миссии
function checkMissionCompletion() {
  if (!activeMission) return;
  if (activeMission.condition()) {
    console.log(`Миссия ${activeMission.title} выполнена!`);
    completeMission();
  }
}

// Завершение миссии
function completeMission() {
  if (!activeMission) return;
  const reward = activeMission.reward;
  const me = players.get(myId);
  if (!me) return;

  // Добавляем награду (Баляры) в инвентарь
  const balyarySlot = inventory.findIndex(
    (slot) => slot && slot.type === "balyary"
  );
  if (balyarySlot !== -1) {
    inventory[balyarySlot].quantity =
      (inventory[balyarySlot].quantity || 1) + reward.balyary;
  } else {
    const freeSlot = inventory.findIndex((slot) => slot === null);
    if (freeSlot !== -1) {
      inventory[freeSlot] = {
        type: "balyary",
        quantity: reward.balyary,
        itemId: `balyary_${Date.now()}`,
      };
    }
  }

  updateInventoryDisplay();
  sendWhenReady(
    ws,
    JSON.stringify({
      type: "completeMission",
      missionId: activeMission.id,
      inventory,
    })
  );

  activeMission = null;
  updateMissionStatus();
}

// Обновление статуса миссии на экране
function updateMissionStatus() {
  const missionStatus = document.getElementById("missionStatus");
  if (activeMission) {
    missionStatus.textContent = `Миссия: ${activeMission.title}`;
  } else {
    missionStatus.textContent = "Нет активной миссии";
  }
}

// Рендеринг NPC
function drawNPC() {
  const screenX = NPC_CONFIG.x - camera.x;
  const screenY = NPC_CONFIG.y - camera.y;
  if (
    screenX >= -40 &&
    screenX <= canvas.width + 40 &&
    screenY >= -40 &&
    screenY <= canvas.height + 40
  ) {
    if (npcSprite.complete) {
      ctx.drawImage(npcSprite, screenX, screenY, 40, 40);
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(screenX, screenY, 40, 40);
    }
    // Отображаем имя NPC
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NPC", screenX + 20, screenY - 10);
  }
}

// Обработка событий NPC
function handleNPCClick(event) {
  const me = players.get(myId);
  if (!me || me.health <= 0) return;

  let cursorX, cursorY;
  if (event.type === "contextmenu") {
    cursorX = event.clientX;
    cursorY = event.clientY;
  } else if (event.type === "touchstart") {
    const touch = event.touches[0];
    cursorX = touch.clientX;
    cursorY = touch.clientY;
  } else {
    return;
  }

  if (isNearNPC(me.x, me.y) && isCursorOverNPC(cursorX, cursorY)) {
    event.preventDefault();
    showMissionDialog();
  }
}
