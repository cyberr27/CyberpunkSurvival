const tradeSystem = {
  selectedPlayerId: null,
  tradeRequestTimeout: null,
  isTradeActive: false,
  tradeSlots: {
    playerA: null,
    playerB: null,
  },
  tradeInventory: Array(20).fill(null),
  tradeState: null, // "request", "accepted", "cancelled"

  initialize() {
    // Кнопка торговли
    const tradeBtn = document.createElement("button");
    tradeBtn.id = "tradeBtn";
    tradeBtn.className = "cyber-btn";
    tradeBtn.textContent = "Торг";
    tradeBtn.style.bottom = "20px";
    tradeBtn.style.right = "150px";
    tradeBtn.style.width = "60px";
    tradeBtn.style.height = "60px";
    tradeBtn.disabled = true;
    document.getElementById("gameContainer").appendChild(tradeBtn);

    // Обработчик клика по кнопке торговли
    tradeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.selectedPlayerId && !this.isTradeActive) {
        this.sendTradeRequest(this.selectedPlayerId);
        tradeBtn.disabled = true;
      }
    });

    // Обработчик клика по игроку
    canvas.addEventListener("mousedown", (e) => {
      if (
        e.button === 0 &&
        !this.isTradeActive &&
        !isInventoryOpen &&
        chatContainer.style.display !== "flex"
      ) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;

        const camera = window.movementSystem.getCamera();
        const worldX = e.clientX + camera.x;
        const worldY = e.clientY + camera.y;

        let closestPlayer = null;
        let minDistance = Infinity;

        players.forEach((player) => {
          if (player.id !== myId) {
            const dx = player.x + 20 - worldX;
            const dy = player.y + 20 - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance && distance <= 1000) {
              minDistance = distance;
              closestPlayer = player;
            }
          }
        });

        if (closestPlayer && minDistance < 50) {
          this.selectedPlayerId = closestPlayer.id;
          tradeBtn.disabled = false;
          tradeBtn.classList.add("active");
        } else {
          this.selectedPlayerId = null;
          tradeBtn.disabled = true;
          tradeBtn.classList.remove("active");
        }
      }
    });

    // Обработчик тач-событий для выбора игрока
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (
        !this.isTradeActive &&
        !isInventoryOpen &&
        chatContainer.style.display !== "flex"
      ) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;

        const touch = e.touches[0];
        const camera = window.movementSystem.getCamera();
        const worldX = touch.clientX + camera.x;
        const worldY = touch.clientY + camera.y;

        let closestPlayer = null;
        let minDistance = Infinity;

        players.forEach((player) => {
          if (player.id !== myId) {
            const dx = player.x + 20 - worldX;
            const dy = player.y + 20 - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance && distance <= 1000) {
              minDistance = distance;
              closestPlayer = player;
            }
          }
        });

        if (closestPlayer && minDistance < 50) {
          this.selectedPlayerId = closestPlayer.id;
          tradeBtn.disabled = false;
          tradeBtn.classList.add("active");
        } else {
          this.selectedPlayerId = null;
          tradeBtn.disabled = true;
          tradeBtn.classList.remove("active");
        }
      }
    });
  },

  sendTradeRequest(targetId) {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeRequest",
          fromId: myId,
          toId: targetId,
        })
      );
      this.tradeState = "request";
      this.tradeRequestTimeout = setTimeout(() => {
        this.cancelTrade();
      }, 30000);
    }
  },

  handleTradeRequest(data) {
    if (data.toId === myId && !this.isTradeActive) {
      this.showTradeDialog(data.fromId);
    }
  },

  showTradeDialog(fromId) {
    const dialog = document.createElement("div");
    dialog.id = "tradeDialog";
    dialog.style.position = "absolute";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
    dialog.style.width = "300px";
    dialog.style.padding = "20px";
    dialog.style.background = "linear-gradient(180deg, #1a1a1a, #0f0f0f)";
    dialog.style.border = "2px solid #ff0066";
    dialog.style.boxShadow = "0 0 15px rgba(255, 0, 102, 0.5)";
    dialog.style.fontFamily = "'Orbitron', sans-serif";
    dialog.style.color = "#00ccff";
    dialog.style.textAlign = "center";
    dialog.style.zIndex = "200";

    dialog.innerHTML = `
        <p class="cyber-text">Пользователь ${fromId} хочет торговать с вами.</p>
        <div style="display: flex; justify-content: space-around; margin-top: 20px;">
          <button id="acceptTradeBtn" class="action-btn use-btn">Согласен</button>
          <button id="cancelTradeBtn" class="action-btn drop-btn">Отмена</button>
        </div>
      `;

    document.getElementById("gameContainer").appendChild(dialog);

    document.getElementById("acceptTradeBtn").addEventListener("click", () => {
      this.acceptTrade(fromId);
      dialog.remove();
    });

    document.getElementById("cancelTradeBtn").addEventListener("click", () => {
      this.rejectTrade(fromId);
      dialog.remove();
    });
  },

  acceptTrade(fromId) {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeAccept",
          fromId: myId,
          toId: fromId,
        })
      );
      this.isTradeActive = true;
      this.tradeState = "accepted";
      this.showTradeInterface(fromId);
    }
  },

  rejectTrade(fromId) {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeReject",
          fromId: myId,
          toId: fromId,
        })
      );
      this.cancelTrade();
    }
  },

  handleTradeAccept(data) {
    if (data.toId === myId && this.tradeState === "request") {
      clearTimeout(this.tradeRequestTimeout);
      this.isTradeActive = true;
      this.tradeState = "accepted";
      this.showTradeInterface(data.fromId);
    }
  },

  handleTradeReject(data) {
    if (data.toId === myId) {
      this.cancelTrade();
    }
  },

  cancelTrade() {
    this.selectedPlayerId = null;
    this.isTradeActive = false;
    this.tradeState = null;
    this.tradeSlots.playerA = null;
    this.tradeSlots.playerB = null;
    this.tradeInventory = Array(20).fill(null);
    clearTimeout(this.tradeRequestTimeout);
    const tradeInterface = document.getElementById("tradeInterface");
    if (tradeInterface) tradeInterface.remove();
    const tradeBtn = document.getElementById("tradeBtn");
    if (tradeBtn) {
      tradeBtn.disabled = true;
      tradeBtn.classList.remove("active");
    }
  },

  showTradeInterface(otherPlayerId) {
    const me = players.get(myId);
    this.tradeInventory = JSON.parse(
      JSON.stringify(me.inventory || Array(20).fill(null))
    );

    const tradeInterface = document.createElement("div");
    tradeInterface.id = "tradeInterface";
    tradeInterface.style.position = "absolute";
    tradeInterface.style.top = "50%";
    tradeInterface.style.left = "50%";
    tradeInterface.style.transform = "translate(-50%, -50%)";
    tradeInterface.style.width = "600px";
    tradeInterface.style.height = "400px";
    tradeInterface.style.background =
      "linear-gradient(180deg, #1a1a1a, #0f0f0f)";
    tradeInterface.style.border = "2px solid #00ccff";
    tradeInterface.style.boxShadow = "0 0 15px rgba(0, 204, 255, 0.5)";
    tradeInterface.style.display = "grid";
    tradeInterface.style.gridTemplateColumns = "1fr 150px 1fr";
    tradeInterface.style.gap = "20px";
    tradeInterface.style.padding = "20px";
    tradeInterface.style.zIndex = "150";
    tradeInterface.style.fontFamily = "'Orbitron', sans-serif";

    const tradeInventoryDiv = document.createElement("div");
    tradeInventoryDiv.id = "tradeInventory";
    tradeInventoryDiv.style.display = "grid";
    tradeInventoryDiv.style.gridTemplateColumns = "repeat(4, 1fr)";
    tradeInventoryDiv.style.gap = "8px";

    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "inventory-slot";
      slot.style.width = "50px";
      slot.style.height = "50px";
      if (this.tradeInventory[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.tradeInventory[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        slot.appendChild(img);
        if (
          this.tradeInventory[i].type === "balyary" &&
          this.tradeInventory[i].quantity > 1
        ) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = this.tradeInventory[i].quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          slot.appendChild(quantityEl);
        }
        slot.onclick = () => this.selectTradeSlot(i, slot);
      }
      tradeInventoryDiv.appendChild(slot);
    }

    const tradeSlotsDiv = document.createElement("div");
    tradeSlotsDiv.id = "tradeSlots";
    tradeSlotsDiv.style.display = "flex";
    tradeSlotsDiv.style.flexDirection = "column";
    tradeSlotsDiv.style.alignItems = "center";
    tradeSlotsDiv.style.justifyContent = "center";

    const slotA = document.createElement("div");
    slotA.id = "tradeSlotA";
    slotA.className = "trade-slot";
    slotA.style.width = "70px";
    slotA.style.height = "70px";
    slotA.style.background = "#1c1c1c";
    slotA.style.border = "2px solid #00ccff";
    slotA.style.marginBottom = "20px";
    if (this.tradeSlots.playerA) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[this.tradeSlots.playerA.type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slotA.appendChild(img);
    }

    const slotB = document.createElement("div");
    slotB.id = "tradeSlotB";
    slotB.className = "trade-slot";
    slotB.style.width = "70px";
    slotB.style.height = "70px";
    slotB.style.background = "#1c1c1c";
    slotB.style.border = "2px solid #ff0066";

    tradeSlotsDiv.appendChild(slotA);
    tradeSlotsDiv.appendChild(slotB);

    const tradeActionsDiv = document.createElement("div");
    tradeActionsDiv.id = "tradeActions";
    tradeActionsDiv.style.display = "flex";
    tradeActionsDiv.style.flexDirection = "column";
    tradeActionsDiv.style.gap = "10px";

    const placeBtn = document.createElement("button");
    placeBtn.id = "placeBtn";
    placeBtn.className = "action-btn use-btn";
    placeBtn.textContent = "Положить";
    placeBtn.disabled = true;
    placeBtn.onclick = () => this.placeItem();

    const confirmBtn = document.createElement("button");
    confirmBtn.id = "confirmTradeBtn";
    confirmBtn.className = "action-btn confirm-btn";
    confirmBtn.textContent = "Обмен";
    confirmBtn.disabled = true;
    confirmBtn.onclick = () => this.confirmTrade(otherPlayerId);

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancelTradeBtn";
    cancelBtn.className = "action-btn drop-btn";
    cancelBtn.textContent = "Отмена";
    cancelBtn.onclick = () => this.cancelTrade();

    tradeActionsDiv.appendChild(placeBtn);
    tradeActionsDiv.appendChild(confirmBtn);
    tradeActionsDiv.appendChild(cancelBtn);

    tradeInterface.appendChild(tradeInventoryDiv);
    tradeInterface.appendChild(tradeSlotsDiv);
    tradeInterface.appendChild(tradeActionsDiv);

    document.getElementById("gameContainer").appendChild(tradeInterface);
  },

  selectTradeSlot(slotIndex, slotElement) {
    if (!this.tradeInventory[slotIndex]) return;
    const placeBtn = document.getElementById("placeBtn");
    if (this.tradeSlots.playerA) return; // Только один предмет в слоте

    if (this.tradeInventory[slotIndex].type === "balyary") {
      const screen = document.getElementById("tradeInterface");
      screen.innerHTML += `
          <div id="balyaryTradeForm" class="balyary-drop-form">
            <p class="cyber-text">Сколько положить?</p>
            <input type="number" id="balyaryTradeAmount" class="cyber-input" min="1" max="${
              this.tradeInventory[slotIndex].quantity || 1
            }" placeholder="0" value="" autofocus />
            <p id="balyaryTradeError" class="error-text"></p>
          </div>
        `;
      const input = document.getElementById("balyaryTradeAmount");
      input.focus();
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9]/g, "");
        if (input.value === "") input.value = "";
      });
      placeBtn.disabled = false;
      placeBtn.onclick = () => {
        const amount = parseInt(input.value) || 0;
        const currentQuantity = this.tradeInventory[slotIndex].quantity || 1;
        const errorEl = document.getElementById("balyaryTradeError");
        if (amount <= 0) {
          errorEl.textContent = "Введи нормальное число, братишка!";
          return;
        }
        if (amount > currentQuantity) {
          errorEl.textContent = "Не хватает Баляр!";
          return;
        }
        this.tradeSlots.playerA = {
          type: "balyary",
          quantity: amount,
          itemId: this.tradeInventory[slotIndex].itemId,
        };
        if (amount === currentQuantity) {
          this.tradeInventory[slotIndex] = null;
        } else {
          this.tradeInventory[slotIndex].quantity -= amount;
        }
        document.getElementById("balyaryTradeForm").remove();
        this.updateTradeInterface();
        placeBtn.disabled = true;
      };
    } else {
      this.tradeSlots.playerA = { ...this.tradeInventory[slotIndex] };
      this.tradeInventory[slotIndex] = null;
      this.updateTradeInterface();
      placeBtn.disabled = true;
    }
  },

  placeItem() {
    // Логика уже в selectTradeSlot для Баляр
  },

  updateTradeInterface() {
    const slotA = document.getElementById("tradeSlotA");
    slotA.innerHTML = "";
    if (this.tradeSlots.playerA) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[this.tradeSlots.playerA.type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slotA.appendChild(img);
      if (
        this.tradeSlots.playerA.type === "balyary" &&
        this.tradeSlots.playerA.quantity > 1
      ) {
        const quantityEl = document.createElement("div");
        quantityEl.textContent = this.tradeSlots.playerA.quantity;
        quantityEl.style.position = "absolute";
        quantityEl.style.top = "0";
        quantityEl.style.right = "0";
        quantityEl.style.color = "#00ffff";
        quantityEl.style.fontSize = "14px";
        quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
        slotA.appendChild(quantityEl);
      }
    }

    const tradeInventoryDiv = document.getElementById("tradeInventory");
    tradeInventoryDiv.innerHTML = "";
    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "inventory-slot";
      slot.style.width = "50px";
      slot.style.height = "50px";
      if (this.tradeInventory[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.tradeInventory[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        slot.appendChild(img);
        if (
          this.tradeInventory[i].type === "balyary" &&
          this.tradeInventory[i].quantity > 1
        ) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = this.tradeInventory[i].quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          slot.appendChild(quantityEl);
        }
        slot.onclick = () => this.selectTradeSlot(i, slot);
      }
      tradeInventoryDiv.appendChild(slot);
    }

    const confirmBtn = document.getElementById("confirmTradeBtn");
    confirmBtn.disabled = !this.tradeSlots.playerA;
  },

  confirmTrade(otherPlayerId) {
    if (ws.readyState === WebSocket.OPEN && this.tradeSlots.playerA) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeConfirm",
          fromId: myId,
          toId: otherPlayerId,
          item: this.tradeSlots.playerA,
        })
      );
    }
  },

  handleTradeConfirm(data) {
    if (data.toId === myId && this.isTradeActive) {
      const me = players.get(myId);
      const freeSlot = me.inventory.findIndex((slot) => slot === null);
      if (freeSlot !== -1) {
        if (data.item.type === "balyary") {
          const balyarySlot = me.inventory.findIndex(
            (slot) => slot && slot.type === "balyary"
          );
          if (balyarySlot !== -1) {
            me.inventory[balyarySlot].quantity =
              (me.inventory[balyarySlot].quantity || 1) +
              (data.item.quantity || 1);
          } else {
            me.inventory[freeSlot] = {
              type: "balyary",
              quantity: data.item.quantity || 1,
              itemId: data.item.itemId,
            };
          }
        } else {
          me.inventory[freeSlot] = {
            type: data.item.type,
            itemId: data.item.itemId,
          };
        }
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "updateInventory",
            inventory: me.inventory,
          })
        );
        this.cancelTrade();
      } else {
        console.log("Инвентарь полон, предмет не добавлен");
      }
    }
  },
};

window.tradeSystem = tradeSystem;
