import { inventory, players, myId, camera, ctx, ws } from "./code.js";

export const NPC_CONFIG = {
  id: "npc_1",
  x: 591,
  y: 3100,
  sprite: null, // Устанавливаем позже
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
      condition: () => false,
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

export let activeMission = null;

export function isNearNPC(playerX, playerY) {
  const dx = playerX - NPC_CONFIG.x;
  const dy = playerY - NPC_CONFIG.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= 200;
}

export function isCursorOverNPC(cursorX, cursorY) {
  const screenX = NPC_CONFIG.x - camera.x;
  const screenY = NPC_CONFIG.y - camera.y;
  return (
    cursorX >= screenX &&
    cursorX <= screenX + 40 &&
    cursorY >= screenY &&
    cursorY <= screenY + 40
  );
}

export function showMissionDialog() {
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

export function selectMission(missionId) {
  const mission = NPC_CONFIG.missions.find((m) => m.id === missionId);
  if (mission) {
    activeMission = mission;
    console.log(`Миссия выбрана: ${mission.title}`);
    document.getElementById("missionDialog").style.display = "none";
    updateMissionStatus();
    sendWhenReady(ws, JSON.stringify({ type: "selectMission", missionId }));
  }
}

export function checkMissionCompletion() {
  if (!activeMission) return;
  if (activeMission.condition()) {
    console.log(`Миссия ${activeMission.title} выполнена!`);
    completeMission();
  }
}

export function completeMission() {
  if (!activeMission) return;
  const reward = activeMission.reward;
  const me = players.get(myId);
  if (!me) return;

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

export function updateMissionStatus() {
  const missionStatus = document.getElementById("missionStatus");
  if (activeMission) {
    missionStatus.textContent = `Миссия: ${activeMission.title}`;
  } else {
    missionStatus.textContent = "Нет активной миссии";
  }
}

export function drawNPC() {
  const screenX = NPC_CONFIG.x - camera.x;
  const screenY = NPC_CONFIG.y - camera.y;
  if (
    screenX >= -40 &&
    screenX <= canvas.width + 40 &&
    screenY >= -40 &&
    screenY <= canvas.height + 40
  ) {
    if (NPC_CONFIG.sprite && NPC_CONFIG.sprite.complete) {
      ctx.drawImage(NPC_CONFIG.sprite, screenX, screenY, 40, 40);
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(screenX, screenY, 40, 40);
    }
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("NPC", screenX + 20, screenY - 10);
  }
}

export function handleNPCClick(event) {
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
