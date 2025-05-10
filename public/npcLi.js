const NPC_LI_CONFIG = {
  x: 641,
  y: 3217,
  worldId: 0, // Неоновый Город
  interactionRadius: 50,
  name: "Li",
  quests: [
    {
      id: 1,
      description: "Пройди 1000 пикселей",
      condition: (player) => player.distanceTraveled >= 1000,
      reward: { xp: 5, balyary: 2 },
    },
    {
      id: 2,
      description: "Пройди 10000 пикселей",
      condition: (player) => player.distanceTraveled >= 10000,
      reward: { xp: 15, balyary: 5 },
    },
    {
      id: 3,
      description: "Пройди 100000 пикселей",
      condition: (player) => player.distanceTraveled >= 100000,
      reward: { xp: 30, balyary: 10 },
    },
    {
      id: 4,
      description: "Собери 10 предметов",
      condition: (player) => player.itemsCollected >= 10,
      reward: { xp: 5, balyary: 3 },
    },
    {
      id: 5,
      description: "Собери 50 предметов",
      condition: (player) => player.itemsCollected >= 50,
      reward: { xp: 15, balyary: 10 },
    },
    {
      id: 6,
      description: "Собери 100 предметов",
      condition: (player) => player.itemsCollected >= 100,
      reward: { xp: 50, balyary: 15 },
    },
    {
      id: 7,
      description: "Заработай 10 баляр",
      condition: (player) => player.balyaryEarned >= 10,
      reward: { xp: 15, balyary: 5 },
    },
    {
      id: 8,
      description: "Используй предмет",
      condition: (player) => player.itemsUsed >= 1,
      reward: { xp: 5, balyary: 2 },
    },
    {
      id: 9,
      description: "Заработай 100 баляр",
      condition: (player) => player.balyaryEarned >= 100,
      reward: { xp: 25, balyary: 15 },
    },
    {
      id: 10,
      description: "Возьми 1 уровень",
      condition: (player) => player.level >= 1,
      reward: { balyary: 10 },
    },
  ],
};

let npcLiMet = false;
let npcLiDialogOpen = false;
let availableQuests = NPC_LI_CONFIG.quests.map((q) => q.id);

const npcLiSystem = {
  initialize(spriteImage) {
    this.spriteImage = spriteImage;
    this.setupEventListeners();
    console.log("npcLiSystem инициализирован");
  },

  setupEventListeners() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && npcLiDialogOpen) {
        const me = players.get(myId);
        if (!npcLiMet) {
          npcLiMet = true;
          sendWhenReady(
            ws,
            JSON.stringify({ type: "meetNPCLi", npcMet: true, availableQuests })
          );
          this.showQuestMenu();
        } else {
          this.showQuestMenu();
        }
        e.preventDefault();
      }
    });
  },

  checkInteraction() {
    const me = players.get(myId);
    if (
      !me ||
      me.health <= 0 ||
      window.worldSystem.currentWorldId !== NPC_LI_CONFIG.worldId
    )
      return;

    const dx = me.x - NPC_LI_CONFIG.x;
    const dy = me.y - NPC_LI_CONFIG.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (
      distance < NPC_LI_CONFIG.interactionRadius &&
      !npcLiDialogOpen &&
      chatContainer.style.display !== "flex"
    ) {
      this.showDialogPrompt();
    } else if (distance >= NPC_LI_CONFIG.interactionRadius && npcLiDialogOpen) {
      this.hideDialogPrompt();
    }
  },

  showDialogPrompt() {
    npcLiDialogOpen = true;
    const dialogPrompt =
      document.getElementById("npcLiDialogPrompt") ||
      document.createElement("div");
    dialogPrompt.id = "npcLiDialogPrompt";
    dialogPrompt.className = "npc-dialog-prompt cyber-text";
    dialogPrompt.textContent = "Нажми Enter для разговора с Li";
    dialogPrompt.style.position = "absolute";
    dialogPrompt.style.top = "50%";
    dialogPrompt.style.left = "50%";
    dialogPrompt.style.transform = "translate(-50%, -50%)";
    dialogPrompt.style.zIndex = "1000";
    document.body.appendChild(dialogPrompt);
  },

  hideDialogPrompt() {
    npcLiDialogOpen = false;
    const dialogPrompt = document.getElementById("npcLiDialogPrompt");
    if (dialogPrompt) dialogPrompt.remove();
  },

  showQuestMenu() {
    this.hideDialogPrompt();
    const questMenu = document.createElement("div");
    questMenu.id = "npcLiQuestMenu";
    questMenu.className = "quest-menu cyber-container";
    questMenu.style.position = "absolute";
    questMenu.style.top = "50%";
    questMenu.style.left = "50%";
    questMenu.style.transform = "translate(-50%, -50%)";
    questMenu.style.zIndex = "1000";
    questMenu.style.maxHeight = "80vh";
    questMenu.style.overflowY = "auto";

    let content = "<h2 class='cyber-text'>Задания от Li</h2><ul>";
    const me = players.get(myId);
    NPC_LI_CONFIG.quests.forEach((quest) => {
      const isCompleted = quest.condition(me);
      content += `
        <li class='cyber-text'>
          ${quest.description}
          ${
            isCompleted
              ? `<button class='cyber-button' onclick='npcLiSystem.claimReward(${quest.id})'>Забрать награду</button>`
              : ""
          }
        </li>
      `;
    });
    content += "</ul>";
    content +=
      "<button class='cyber-button' onclick='npcLiSystem.closeQuestMenu()'>Закрыть</button>";

    questMenu.innerHTML = content;
    document.body.appendChild(questMenu);
  },

  closeQuestMenu() {
    const questMenu = document.getElementById("npcLiQuestMenu");
    if (questMenu) questMenu.remove();
  },

  claimReward(questId) {
    const quest = NPC_LI_CONFIG.quests.find((q) => q.id === questId);
    const me = players.get(myId);
    if (quest && quest.condition(me) && availableQuests.includes(questId)) {
      sendWhenReady(ws, JSON.stringify({ type: "claimLiReward", questId }));
      availableQuests = availableQuests.filter((id) => id !== questId);
    }
  },

  drawNPC() {
    if (window.worldSystem.currentWorldId !== NPC_LI_CONFIG.worldId) return;
    const screenX = NPC_LI_CONFIG.x - window.movementSystem.getCamera().x;
    const screenY = NPC_LI_CONFIG.y - window.movementSystem.getCamera().y;

    if (this.spriteImage && this.spriteImage.complete) {
      ctx.drawImage(this.spriteImage, screenX, screenY, 40, 40);
    } else {
      ctx.fillStyle = "purple";
      ctx.fillRect(screenX, screenY, 40, 40);
    }

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      npcLiMet ? NPC_LI_CONFIG.name : "?",
      screenX + 20,
      screenY - 10
    );
  },

  setNPCMet(met) {
    npcLiMet = met;
  },

  setAvailableQuests(quests) {
    availableQuests = quests;
  },
};

// Инициализация выполняется в code.js в startGame
window.npcLiSystem = npcLiSystem;
