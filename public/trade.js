const tradeSystem = {
  selectedPlayerId: null,
  tradeRequestTimeout: null,
  isTradeActive: false,
  tradeSlots: {
    playerA: null,
    playerB: null,
  },
  tradeConfirmations: {
    playerA: false,
    playerB: false,
  },
  balyaryCount: 0,
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
      <p id="tradeTimer" class="cyber-text">Осталось: 30 сек</p>
      <div style="display: flex; justify-content: space-around; margin-top: 20px;">
        <button id="acceptTradeBtn" class="action-btn use-btn">Согласен</button>
        <button id="cancelTradeBtn" class="action-btn drop-btn">Отмена</button>
      </div>
    `;

    document.getElementById("gameContainer").appendChild(dialog);

    // Таймер на 30 секунд
    let timeLeft = 30;
    const timerElement = document.getElementById("tradeTimer");
    const timerInterval = setInterval(() => {
      timeLeft--;
      timerElement.textContent = `Осталось: ${timeLeft} сек`;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        this.rejectTrade(fromId);
        dialog.remove();
      }
    }, 1000);

    document.getElementById("acceptTradeBtn").addEventListener("click", () => {
      clearInterval(timerInterval); // Останавливаем таймер при согласии
      this.acceptTrade(fromId);
      dialog.remove();
    });

    document.getElementById("cancelTradeBtn").addEventListener("click", () => {
      clearInterval(timerInterval); // Останавливаем таймер при отмене
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

  cancelTrade(otherPlayerId, isComplete = false) {
    this.selectedPlayerId = null;
    this.isTradeActive = false;
    this.tradeState = null;

    // Возвращаем предметы в инвентарь, если торговля не завершена
    if (!isComplete) {
      this.returnItemToInventory();
    }

    // Очищаем состояния
    this.tradeSlots.playerA = null;
    this.tradeSlots.playerB = null;
    this.tradeConfirmations.playerA = false;
    this.tradeConfirmations.playerB = false;
    this.tradeInventory = Array(20).fill(null);
    this.balyaryCount = 0;
    clearTimeout(this.tradeRequestTimeout);

    // Закрываем интерфейсы
    const tradeInterface = document.getElementById("tradeInterface");
    const inventoryContainer = document.getElementById("inventoryContainer");
    if (tradeInterface) tradeInterface.remove();
    if (inventoryContainer && isInventoryOpen) {
      isInventoryOpen = false;
      inventoryContainer.style.display = "none";
      document.getElementById("inventoryBtn").classList.remove("active");
    }

    const tradeBtn = document.getElementById("tradeBtn");
    if (tradeBtn) {
      tradeBtn.disabled = true;
      tradeBtn.classList.remove("active");
    }

    // Отправляем сообщение о сбросе торговли другому игроку
    if (otherPlayerId && ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeCancel",
          fromId: myId,
          toId: otherPlayerId,
          closeInventory: !this.tradeSlots.playerA,
        })
      );
    }

    // Синхронизируем инвентарь с сервером
    const me = players.get(myId);
    if (me && ws.readyState === WebSocket.OPEN) {
      this.tradeInventory = JSON.parse(
        JSON.stringify(me.inventory || Array(20).fill(null))
      );
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "updateInventory",
          inventory: me.inventory,
        })
      );
    }

    // Обновляем отображение инвентаря
    updateInventoryDisplay();
  },

  returnItemToInventory() {
    if (this.tradeSlots.playerA) {
      const item = this.tradeSlots.playerA;
      const freeSlot = this.tradeInventory.findIndex((slot) => slot === null);
      if (freeSlot !== -1) {
        if (item.type === "balyary") {
          const balyarySlot = this.tradeInventory.findIndex(
            (slot) => slot && slot.type === "balyary"
          );
          if (balyarySlot !== -1) {
            this.tradeInventory[balyarySlot].quantity =
              (this.tradeInventory[balyarySlot].quantity || 1) +
              (item.quantity || 1);
          } else {
            this.tradeInventory[freeSlot] = {
              type: "balyary",
              quantity: item.quantity || 1,
              itemId: item.itemId,
            };
          }
        } else {
          this.tradeInventory[freeSlot] = { ...item };
        }
        this.tradeSlots.playerA = null;
        this.balyaryCount = this.getBalyaryCount(this.tradeInventory);
        this.updateTradeInterface();
        // Синхронизируем инвентарь игрока
        const me = players.get(myId);
        me.inventory = this.tradeInventory;
        // Отправляем обновление на сервер
        if (ws.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "updateInventory",
              inventory: this.tradeInventory,
            })
          );
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "updateTradeSlot",
              fromId: myId,
              item: null,
              inventory: this.tradeInventory,
              balyaryCount: this.balyaryCount,
            })
          );
        }
      } else {
        console.log("Инвентарь полон, предмет не возвращён");
      }
    }
  },

  showTradeInterface(otherPlayerId) {
    const me = players.get(myId);
    this.tradeInventory = JSON.parse(
      JSON.stringify(me.inventory || Array(20).fill(null))
    );
    this.balyaryCount = this.getBalyaryCount(me.inventory);

    const tradeInterface = document.createElement("div");
    tradeInterface.id = "tradeInterface";
    tradeInterface.style.position = "absolute";
    tradeInterface.style.top = "50%";
    tradeInterface.style.left = "50%";
    tradeInterface.style.transform = "translate(-50%, -50%)";
    tradeInterface.style.width = "600px";
    tradeInterface.style.background =
      "linear-gradient(180deg, #1a1a1a, #0f0f0f)";
    tradeInterface.style.border = "2px solid #00ccff";
    tradeInterface.style.boxShadow = "0 0 15px rgba(0, 204, 255, 0.5)";
    tradeInterface.style.padding = "20px";
    tradeInterface.style.zIndex = "150";
    tradeInterface.style.fontFamily = "'Orbitron', sans-serif";
    tradeInterface.style.display = "flex";
    tradeInterface.style.flexDirection = "column";
    tradeInterface.style.gap = "10px";

    // Баляры
    const balyaryDiv = document.createElement("div");
    balyaryDiv.style.color = "#00ccff";
    balyaryDiv.style.textAlign = "center";
    balyaryDiv.textContent = `Баляры: ${this.balyaryCount}`;
    tradeInterface.appendChild(balyaryDiv);

    // Ячейки торговли
    const tradeSlotsDiv = document.createElement("div");
    tradeSlotsDiv.id = "tradeSlots";
    tradeSlotsDiv.style.display = "flex";
    tradeSlotsDiv.style.justifyContent = "space-between";
    tradeSlotsDiv.style.marginBottom = "10px";

    const slotADiv = document.createElement("div");
    slotADiv.style.display = "flex";
    slotADiv.style.flexDirection = "column";
    slotADiv.style.alignItems = "center";
    const slotALabel = document.createElement("div");
    slotALabel.textContent = myId;
    slotALabel.style.color = "#00ccff";
    slotALabel.style.marginBottom = "5px";
    const slotA = document.createElement("div");
    slotA.id = "tradeSlotA";
    slotA.className = "trade-slot";
    slotA.style.width = "70px";
    slotA.style.height = "70px";
    slotA.style.background = "#1c1c1c";
    slotA.style.border = "2px solid #00ccff";
    slotADiv.appendChild(slotALabel);
    slotADiv.appendChild(slotA);

    const slotBDiv = document.createElement("div");
    slotBDiv.style.display = "flex";
    slotBDiv.style.flexDirection = "column";
    slotBDiv.style.alignItems = "center";
    const slotBLabel = document.createElement("div");
    slotBLabel.textContent = otherPlayerId;
    slotBLabel.style.color = "#ff0066";
    slotBLabel.style.marginBottom = "5px";
    const slotB = document.createElement("div");
    slotB.id = "tradeSlotB";
    slotB.className = "trade-slot";
    slotB.style.width = "70px";
    slotB.style.height = "70px";
    slotB.style.background = "#1c1c1c";
    slotB.style.border = "2px solid #ff0066";
    slotBDiv.appendChild(slotBLabel);
    slotBDiv.appendChild(slotB);

    tradeSlotsDiv.appendChild(slotADiv);
    tradeSlotsDiv.appendChild(slotBDiv);
    tradeInterface.appendChild(tradeSlotsDiv);

    // Инвентарь
    const tradeInventoryDiv = document.createElement("div");
    tradeInventoryDiv.id = "tradeInventory";
    tradeInventoryDiv.style.display = "grid";
    tradeInventoryDiv.style.gridTemplateColumns = "repeat(4, 1fr)";
    tradeInventoryDiv.style.gap = "8px";
    tradeInventoryDiv.style.marginBottom = "10px";

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
        // Добавляем отображение описания при наведении
        slot.onmouseover = () => {
          const tradeScreen = document.getElementById("tradeScreen");
          tradeScreen.textContent =
            ITEM_CONFIG[this.tradeInventory[i].type].description;
        };
        slot.onmouseout = () => {
          const tradeScreen = document.getElementById("tradeScreen");
          tradeScreen.textContent = "";
        };
      }
      tradeInventoryDiv.appendChild(slot);
    }
    tradeInterface.appendChild(tradeInventoryDiv);

    // Экран информации
    const tradeScreen = document.createElement("div");
    tradeScreen.id = "tradeScreen";
    tradeScreen.style.width = "100%";
    tradeScreen.style.height = "60px";
    tradeScreen.style.background = "#0a0a0a";
    tradeScreen.style.border = "1px solid #00ccff";
    tradeScreen.style.color = "#00ccff";
    tradeScreen.style.display = "flex";
    tradeScreen.style.alignItems = "center";
    tradeScreen.style.justifyContent = "center";
    tradeScreen.style.fontSize = "14px";
    tradeScreen.style.textAlign = "center";
    tradeInterface.appendChild(tradeScreen);

    // Наведение на ячейку другого игрока
    slotB.onmouseover = () => {
      if (this.tradeSlots.playerB) {
        tradeScreen.textContent =
          ITEM_CONFIG[this.tradeSlots.playerB.type].description;
      }
    };
    slotB.onmouseout = () => {
      tradeScreen.textContent = "";
    };

    // Кнопки действий
    const tradeActionsDiv = document.createElement("div");
    tradeActionsDiv.id = "tradeActions";
    tradeActionsDiv.style.display = "flex";
    tradeActionsDiv.style.justifyContent = "center";
    tradeActionsDiv.style.gap = "20px";

    const confirmBtn = document.createElement("button");
    confirmBtn.id = "confirmTradeBtn";
    confirmBtn.className = "action-btn confirm-btn";
    confirmBtn.textContent = "Обмен";
    confirmBtn.disabled = true; // Изначально отключена
    confirmBtn.onclick = () => this.confirmTrade(otherPlayerId);

    const cancelBtn = document.createElement("button");
    cancelBtn.id = "cancelTradeBtn";
    cancelBtn.className = "action-btn drop-btn";
    cancelBtn.textContent = this.tradeSlots.playerA
      ? "Вернуть предмет"
      : "Отмена";
    cancelBtn.onclick = () => {
      if (this.tradeSlots.playerA) {
        this.returnItemToInventory();
      } else {
        this.cancelTrade(otherPlayerId);
      }
    };

    tradeActionsDiv.appendChild(confirmBtn);
    tradeActionsDiv.appendChild(cancelBtn);
    tradeInterface.appendChild(tradeActionsDiv);

    document.getElementById("gameContainer").appendChild(tradeInterface);
  },

  selectTradeSlot(slotIndex, slotElement) {
    if (!this.tradeInventory[slotIndex]) return;
    if (this.tradeSlots.playerA) return; // Только один предмет в слоте

    if (this.tradeInventory[slotIndex].type === "balyary") {
      const tradeInterface = document.getElementById("tradeInterface");
      const form = document.createElement("div");
      form.id = "balyaryTradeForm";
      form.className = "balyary-drop-form";
      form.innerHTML = `
        <p class="cyber-text">Сколько положить?</p>
        <input type="number" id="balyaryTradeAmount" class="cyber-input" min="1" max="${
          this.tradeInventory[slotIndex].quantity || 1
        }" placeholder="0" value="" autofocus />
        <button id="confirmBalyaryBtn" class="action-btn use-btn">Подтвердить</button>
        <p id="balyaryTradeError" class="error-text"></p>
      `;
      tradeInterface.appendChild(form);

      const input = document.getElementById("balyaryTradeAmount");
      input.focus();
      input.addEventListener("input", () => {
        input.value = input.value.replace(/[^0-9]/g, "");
        if (input.value === "") input.value = "";
      });

      const confirmBtn = document.getElementById("confirmBalyaryBtn");
      confirmBtn.onclick = () => {
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
        this.balyaryCount = this.getBalyaryCount(this.tradeInventory);
        document.getElementById("balyaryTradeForm").remove();
        this.updateTradeInterface();
        // Отправляем обновление слота на сервер
        if (ws.readyState === WebSocket.OPEN) {
          sendWhenReady(
            ws,
            JSON.stringify({
              type: "updateTradeSlot",
              fromId: myId,
              item: this.tradeSlots.playerA,
              inventory: this.tradeInventory,
              balyaryCount: this.balyaryCount,
            })
          );
        }
      };
    } else {
      this.tradeSlots.playerA = { ...this.tradeInventory[slotIndex] };
      this.tradeInventory[slotIndex] = null; // Удаляем предмет из инвентаря
      this.balyaryCount = this.getBalyaryCount(this.tradeInventory);
      this.updateTradeInterface();
      // Отправляем обновление слота на сервер
      if (ws.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "updateTradeSlot",
            fromId: myId,
            item: this.tradeSlots.playerA,
            inventory: this.tradeInventory,
            balyaryCount: this.balyaryCount,
          })
        );
      }
    }
  },
  getBalyaryCount(inventory) {
    return inventory.reduce((total, item) => {
      if (item && item.type === "balyary") {
        return total + (item.quantity || 1);
      }
      return total;
    }, 0);
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

    const slotB = document.getElementById("tradeSlotB");
    slotB.innerHTML = "";
    if (this.tradeSlots.playerB) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[this.tradeSlots.playerB.type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slotB.appendChild(img);
      if (
        this.tradeSlots.playerB.type === "balyary" &&
        this.tradeSlots.playerB.quantity > 1
      ) {
        const quantityEl = document.createElement("div");
        quantityEl.textContent = this.tradeSlots.playerB.quantity;
        quantityEl.style.position = "absolute";
        quantityEl.style.top = "0";
        quantityEl.style.right = "0";
        quantityEl.style.color = "#ff0066";
        quantityEl.style.fontSize = "14px";
        quantityEl.style.textShadow = "0 0 5px rgba(255, 0, 102, 0.7)";
        slotB.appendChild(quantityEl);
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
        slot.onmouseover = () => {
          const tradeScreen = document.getElementById("tradeScreen");
          tradeScreen.textContent =
            ITEM_CONFIG[this.tradeInventory[i].type].description;
        };
        slot.onmouseout = () => {
          const tradeScreen = document.getElementById("tradeScreen");
          tradeScreen.textContent = "";
        };
      }
      tradeInventoryDiv.appendChild(slot);
    }

    const balyaryDiv = document.querySelector(
      "#tradeInterface > div:first-child"
    );
    balyaryDiv.textContent = `Баляры: ${this.balyaryCount}`;

    const confirmBtn = document.getElementById("confirmTradeBtn");
    confirmBtn.disabled = !this.tradeSlots.playerA; // Кнопка активна, только если игрок А добавил предмет
    if (this.tradeConfirmations.playerA) {
      confirmBtn.textContent = "Ожидание..."; // Если игрок А подтвердил, показываем, что ждём игрока В
      confirmBtn.disabled = true; // Блокируем, чтобы нельзя было нажать повторно
    } else {
      confirmBtn.textContent = "Обмен"; // Обычный текст кнопки
    }
  },

  // Добавляем новый метод для обработки обновлений слота от сервера
  handleTradeSlotUpdate(data) {
    if (data.toId !== myId || !this.isTradeActive) {
      console.log("Некорректный получатель или торговля не активна");
      return;
    }

    if (data.fromId !== myId) {
      this.tradeSlots.playerB = data.item;
      this.updateTradeInterface();
    }

    // Синхронизируем инвентарь
    const me = players.get(myId);
    if (me) {
      me.inventory = data.inventory || me.inventory;
      this.tradeInventory = JSON.parse(JSON.stringify(me.inventory));
      this.balyaryCount = this.getBalyaryCount(me.inventory);
      updateInventoryDisplay();
    }
  },

  confirmTrade(otherPlayerId) {
    if (!this.isTradeActive) {
      console.log("Торговля не активна, подтверждение невозможно");
      return;
    }
    if (!this.tradeSlots.playerA) {
      console.log("Игрок А не добавил предмет для обмена");
      return;
    }
    if (ws.readyState !== WebSocket.OPEN) {
      console.log("WebSocket не подключён, невозможно подтвердить торговлю");
      this.cancelTrade(otherPlayerId);
      return;
    }

    this.tradeConfirmations.playerA = true;
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeConfirm",
        fromId: myId,
        toId: otherPlayerId,
        item: this.tradeSlots.playerA,
        confirm: true,
      })
    );

    const confirmBtn = document.getElementById("confirmTradeBtn");
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Ожидание...";
    this.updateTradeInterface();

    // Отправляем обновление инвентаря на сервер
    const me = players.get(myId);
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateInventory",
        inventory: me.inventory,
      })
    );
  },

  handleTradeConfirm(data) {
    if (data.toId !== myId || !this.isTradeActive) {
      console.log("Некорректный получатель или торговля не активна");
      return;
    }

    this.tradeSlots.playerB = data.item;
    this.tradeConfirmations.playerB = data.confirm || false;
    this.updateTradeInterface();

    // Активируем кнопку "Обмен" для игрока В, если игрок А подтвердил и есть предмет
    const confirmBtn = document.getElementById("confirmTradeBtn");
    confirmBtn.disabled =
      !this.tradeSlots.playerA || this.tradeConfirmations.playerA;

    // Если оба игрока подтвердили, выполняем обмен
    if (this.tradeConfirmations.playerA && this.tradeConfirmations.playerB) {
      const me = players.get(myId);
      const otherPlayerId = data.fromId;

      // Проверяем наличие свободного слота у игрока В
      let myFreeSlot = -1;
      if (this.tradeSlots.playerB) {
        myFreeSlot = me.inventory.findIndex((slot) => slot === null);
        if (myFreeSlot === -1) {
          console.log("Инвентарь полон у игрока В, торговля отменяется");
          this.cancelTrade(otherPlayerId);
          return;
        }
      }

      // Добавляем предмет от игрока А в инвентарь игрока В
      if (this.tradeSlots.playerB) {
        if (this.tradeSlots.playerB.type === "balyary") {
          const balyarySlot = me.inventory.findIndex(
            (slot) => slot && slot.type === "balyary"
          );
          if (balyarySlot !== -1) {
            me.inventory[balyarySlot].quantity =
              (me.inventory[balyarySlot].quantity || 1) +
              (this.tradeSlots.playerB.quantity || 1);
          } else {
            me.inventory[myFreeSlot] = {
              type: "balyary",
              quantity: this.tradeSlots.playerB.quantity || 1,
              itemId: this.tradeSlots.playerB.itemId,
            };
          }
        } else {
          me.inventory[myFreeSlot] = {
            type: this.tradeSlots.playerB.type,
            itemId: this.tradeSlots.playerB.itemId,
          };
        }
      }

      // Отправляем обновление инвентаря игрока В на сервер
      if (ws.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "updateInventory",
            inventory: me.inventory,
          })
        );
      } else {
        console.log("WebSocket не подключён, торговля отменяется");
        this.cancelTrade(otherPlayerId);
        return;
      }

      // Отправляем предмет игрока В (если есть) игроку А
      if (this.tradeSlots.playerA) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "completeTrade",
            fromId: myId,
            toId: otherPlayerId,
            item: this.tradeSlots.playerA,
          })
        );
      }

      // Закрываем торговлю с флагом завершения
      this.cancelTrade(otherPlayerId, true);
    }
  },

  completeTrade(data) {
    if (data.toId !== myId || !this.isTradeActive) {
      console.log("Некорректный получатель или торговля не активна");
      return;
    }

    const me = players.get(myId);
    if (data.item) {
      // Проверяем наличие свободного слота у игрока А
      const freeSlot = me.inventory.findIndex((slot) => slot === null);
      if (freeSlot === -1) {
        console.log("Инвентарь полон у игрока А, торговля отменяется");
        this.cancelTrade(data.fromId);
        return;
      }

      // Добавляем предмет от игрока В в инвентарь игрока А
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

      // Обновляем инвентарь на сервере
      if (ws.readyState === WebSocket.OPEN) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "updateInventory",
            inventory: me.inventory,
          })
        );
      } else {
        console.log("WebSocket не подключён, торговля отменяется");
        this.cancelTrade(data.fromId);
        return;
      }
    }

    // Закрываем интерфейс торговли
    this.cancelTrade(data.fromId, true);
  },

  handleTradeCancel(data) {
    if (data.toId === myId) {
      this.cancelTrade(data.fromId, false);
    }
  },
  handleTradeUpdate(data) {
    if (data.toId === myId && this.isTradeActive) {
      this.tradeInventory = data.inventory || this.tradeInventory;
      this.tradeSlots = data.tradeSlots || this.tradeSlots;
      this.balyaryCount = data.balyaryCount || this.balyaryCount;
      this.updateTradeInterface();
    }
  },
};

window.tradeSystem = tradeSystem;
