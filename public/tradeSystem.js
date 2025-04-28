// tradeSystem.js
const tradeSystem = {
  isTradeWindowOpen: false,
  selectedPlayerId: null,
  tradePartnerId: null,
  tradeStatus: null, // 'pending', 'accepted', 'confirmed', 'completed', 'cancelled'
  myOffer: Array(3).fill(null), // Было 4, стало 3
  partnerOffer: Array(3).fill(null), // Было 4, стало 3
  myConfirmed: false,
  partnerConfirmed: false,

  initialize(ws) {
    this.ws = ws;
    this.setupTradeButton();
    this.setupTradeDialog();
    this.setupTradeWindow();
  },

  setupTradeButton() {
    const tradeBtn = document.createElement("button");
    tradeBtn.id = "tradeBtn";
    tradeBtn.className = "cyber-btn";
    tradeBtn.textContent = "ТОРГ";
    tradeBtn.disabled = true; // Кнопка неактивна по умолчанию
    document.getElementById("gameContainer").appendChild(tradeBtn);

    tradeBtn.addEventListener("click", () => {
      if (this.selectedPlayerId && this.canInitiateTrade()) {
        this.sendTradeRequest(this.selectedPlayerId);
      }
    });
  },

  selectPlayer(playerId) {
    this.selectedPlayerId = playerId;
    const tradeBtn = document.getElementById("tradeBtn");
    tradeBtn.disabled = !(playerId && this.canInitiateTrade()); // Активируем только если выбран игрок и условия соблюдены
  },

  setupTradeDialog() {
    const dialog = document.createElement("div");
    dialog.id = "tradeDialog";
    dialog.className = "trade-dialog";
    dialog.style.display = "none";
    dialog.innerHTML = `
        <div class="trade-dialog-content">
          <p id="tradeDialogText" class="cyber-text"></p>
          <button id="acceptTradeBtn" class="action-btn use-btn">ТОРГ</button>
          <button id="cancelTradeBtn" class="action-btn drop-btn">ОТМЕНА</button>
        </div>
      `;
    document.getElementById("gameContainer").appendChild(dialog);

    document.getElementById("acceptTradeBtn").addEventListener("click", () => {
      this.acceptTradeRequest();
      dialog.style.display = "none";
    });

    document.getElementById("cancelTradeBtn").addEventListener("click", () => {
      this.cancelTradeRequest();
      dialog.style.display = "none";
    });
  },

  setupTradeWindow() {
    const tradeWindow = document.createElement("div");
    tradeWindow.id = "tradeWindow";
    tradeWindow.className = "trade-window";
    tradeWindow.style.display = "none";
    tradeWindow.innerHTML = `
        <div class="trade-panel">
          <h3 class="cyber-text">Ваш инвентарь</h3>
          <div id="myTradeGrid" class="trade-grid"></div>
          <h3 class="cyber-text">Ваше предложение</h3>
          <div id="myOfferGrid" class="trade-offer-grid"></div>
          <h3 class="cyber-text">Предложение партнёра</h3>
          <div id="partnerOfferGrid" class="trade-offer-grid"></div>
          <div class="trade-buttons">
            <button id="confirmTradeBtn" class="action-btn use-btn" disabled>Подтвердить</button>
            <button id="cancelTradeWindowBtn" class="action-btn drop-btn">Отмена</button>
          </div>
        </div>
      `;
    document.getElementById("gameContainer").appendChild(tradeWindow);

    // Создаём слоты для myTradeGrid (20 слотов инвентаря)
    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "trade-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myTradeGrid").appendChild(slot);
    }

    // Создаём 3 слота для myOfferGrid
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myOfferGrid").appendChild(slot);
    }

    // Создаём 3 слота для partnerOfferGrid
    for (let i = 0; i < 3; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("partnerOfferGrid").appendChild(slot);
    }

    document.getElementById("myTradeGrid").addEventListener("click", (e) => {
      const slot = e.target.closest(".trade-slot");
      if (slot && slot.dataset.slotIndex) {
        this.addToOffer(parseInt(slot.dataset.slotIndex));
      }
    });

    document.getElementById("myOfferGrid").addEventListener("click", (e) => {
      const slot = e.target.closest(".offer-slot");
      if (slot && slot.dataset.slotIndex) {
        this.removeFromOffer(parseInt(slot.dataset.slotIndex));
      }
    });

    document.getElementById("confirmTradeBtn").addEventListener("click", () => {
      this.confirmTrade();
    });

    document
      .getElementById("cancelTradeWindowBtn")
      .addEventListener("click", () => {
        this.handleCancelTrade();
      });
  },

  canInitiateTrade() {
    const me = players.get(myId);
    const target = players.get(this.selectedPlayerId);
    if (!me || !target) return false;

    const dx = me.x - target.x;
    const dy = me.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 1000 && me.health > 0 && target.health > 0; // Было 100, стало 1000
  },

  sendTradeRequest(targetId) {
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeRequest",
        fromId: myId,
        toId: targetId,
      })
    );
    this.tradeStatus = "pending";
  },

  handleTradeMessage(data) {
    switch (data.type) {
      case "tradeRequest":
        if (data.toId === myId && !this.isTradeWindowOpen) {
          this.tradePartnerId = data.fromId;
          this.tradeStatus = "pending";
          this.showTradeDialog(`Игрок ${data.fromId} предлагает торговлю`);
        }
        break;
      case "tradeAccepted":
        if (data.fromId === this.tradePartnerId || data.toId === myId) {
          this.tradeStatus = "accepted";
          this.openTradeWindow();
        }
        break;
      case "tradeCancelled":
        if (data.fromId === this.tradePartnerId || data.toId === myId) {
          // Возвращаем свои предметы в инвентарь
          this.myOffer.forEach((item, index) => {
            if (item && item.originalSlot !== undefined) {
              if (inventory[item.originalSlot] === null) {
                inventory[item.originalSlot] = {
                  ...item,
                  itemId: `${item.type}_${Date.now()}`,
                };
              } else {
                const freeSlot = inventory.findIndex((slot) => slot === null);
                if (freeSlot !== -1) {
                  inventory[freeSlot] = {
                    ...item,
                    itemId: `${item.type}_${Date.now()}`,
                  };
                }
              }
              this.myOffer[index] = null;
            }
          });
          this.closeTradeWindow();
          this.resetTrade();
          updateInventoryDisplay();
        }
        break;
      case "tradeOffer":
        if (data.fromId === this.tradePartnerId) {
          this.partnerOffer = data.offer;
          this.updateTradeWindow();
        }
        break;
      case "tradeConfirmed":
        if (data.fromId === this.tradePartnerId) {
          this.partnerConfirmed = true;
          this.updateTradeWindow();
          if (this.myConfirmed) {
            this.completeTrade();
          }
        }
        break;
      case "tradeCompleted":
        if (data.toId === myId || data.fromId === myId) {
          inventory = data.newInventory;
          this.closeTradeWindow();
          this.resetTrade();
          updateInventoryDisplay();
        }
        break;
    }
  },

  showTradeDialog(message) {
    const dialog = document.getElementById("tradeDialog");
    document.getElementById("tradeDialogText").textContent = message;
    dialog.style.display = "flex";
  },

  acceptTradeRequest() {
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeAccepted",
        fromId: myId,
        toId: this.tradePartnerId,
      })
    );
    this.tradeStatus = "accepted";
    this.openTradeWindow();
  },

  cancelTradeRequest() {
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeCancelled",
        fromId: myId,
        toId: this.tradePartnerId,
      })
    );
    this.resetTrade();
  },

  handleCancelTrade() {
    // Возвращаем свои предметы в инвентарь
    this.myOffer.forEach((item, index) => {
      if (item && item.originalSlot !== undefined) {
        if (inventory[item.originalSlot] === null) {
          inventory[item.originalSlot] = {
            ...item,
            itemId: `${item.type}_${Date.now()}`,
          };
        } else {
          const freeSlot = inventory.findIndex((slot) => slot === null);
          if (freeSlot !== -1) {
            inventory[freeSlot] = {
              ...item,
              itemId: `${item.type}_${Date.now()}`,
            };
          }
        }
        this.myOffer[index] = null;
      }
    });

    // Отправляем обновление предложения (очищаем своё предложение)
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
      })
    );

    // Отправляем сообщение об отмене
    this.cancelTrade();

    // Обновляем интерфейс
    this.updateTradeWindow();
    updateInventoryDisplay();
  },

  openTradeWindow() {
    this.isTradeWindowOpen = true;
    document.getElementById("tradeWindow").style.display = "flex";
    this.updateTradeWindow();
  },

  closeTradeWindow() {
    this.isTradeWindowOpen = false;
    document.getElementById("tradeWindow").style.display = "none";
  },

  addToOffer(slotIndex) {
    // Проверяем, что торговое окно открыто и предмет существует
    if (!this.isTradeWindowOpen || !inventory[slotIndex]) return;

    // Проверяем, есть ли свободный слот в предложении
    const freeSlot = this.myOffer.findIndex((slot) => slot === null);
    if (freeSlot === -1) return; // Нет свободных слотов

    // Проверяем, что игрок может продолжать торговлю
    const me = players.get(myId);
    const partner = players.get(this.tradePartnerId);
    if (!me || !partner || me.health <= 0 || partner.health <= 0) {
      this.cancelTrade();
      return;
    }

    // Проверяем расстояние между игроками
    const dx = me.x - partner.x;
    const dy = me.y - partner.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1000) {
      this.cancelTrade();
      return;
    }

    // Сохраняем предмет и удаляем из инвентаря
    const item = { ...inventory[slotIndex], originalSlot: slotIndex };
    this.myOffer[freeSlot] = item;
    inventory[slotIndex] = null;

    // Отправляем обновление предложения
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
      })
    );

    // Обновляем отображение
    this.updateTradeWindow();
    updateInventoryDisplay();
  },

  removeFromOffer(slotIndex) {
    if (!this.isTradeWindowOpen || !this.myOffer[slotIndex]) return;

    // Проверяем, что игрок может продолжать торговлю
    const me = players.get(myId);
    const partner = players.get(this.tradePartnerId);
    if (!me || !partner || me.health <= 0 || partner.health <= 0) {
      this.cancelTrade();
      return;
    }

    // Проверяем расстояние
    const dx = me.x - partner.x;
    const dy = me.y - partner.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1000) {
      this.cancelTrade();
      return;
    }

    // Возвращаем предмет в инвентарь
    const item = this.myOffer[slotIndex];
    if (item.originalSlot !== undefined) {
      // Проверяем, свободен ли оригинальный слот
      if (inventory[item.originalSlot] === null) {
        inventory[item.originalSlot] = {
          ...item,
          itemId: `${item.type}_${Date.now()}`,
        };
      } else {
        // Если оригинальный слот занят, ищем свободный
        const freeSlot = inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          inventory[freeSlot] = {
            ...item,
            itemId: `${item.type}_${Date.now()}`,
          };
        } else {
          // Если нет свободных слотов, отменяем действие
          return;
        }
      }
    }

    // Очищаем слот предложения
    this.myOffer[slotIndex] = null;

    // Отправляем обновление
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
      })
    );

    // Обновляем интерфейс
    this.updateTradeWindow();
    updateInventoryDisplay();
  },

  confirmTrade() {
    this.myConfirmed = true;
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeConfirmed",
        fromId: myId,
        toId: this.tradePartnerId,
      })
    );
    document.getElementById("confirmTradeBtn").disabled = true;
    this.updateTradeWindow();
  },

  cancelTrade() {
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeCancelled",
        fromId: myId,
        toId: this.tradePartnerId,
      })
    );
    this.closeTradeWindow();
    this.resetTrade();
  },

  completeTrade() {
    // Проверяем, что оба игрока подтвердили
    if (!this.myConfirmed || !this.partnerConfirmed) return;

    // Проверяем здоровье и расстояние
    const me = players.get(myId);
    const partner = players.get(this.tradePartnerId);
    if (!me || !partner || me.health <= 0 || partner.health <= 0) {
      this.cancelTrade();
      return;
    }
    const dx = me.x - partner.x;
    const dy = me.y - partner.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 1000) {
      this.cancelTrade();
      return;
    }

    // Отправляем сообщение о завершении торга
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeCompleted",
        fromId: myId,
        toId: this.tradePartnerId,
        myOffer: this.myOffer,
        partnerOffer: this.partnerOffer,
      })
    );
  },

  resetTrade() {
    this.selectedPlayerId = null;
    this.tradePartnerId = null;
    this.tradeStatus = null;
    this.myOffer = Array(3).fill(null);
    this.partnerOffer = Array(3).fill(null);
    this.myConfirmed = false;
    this.partnerConfirmed = false;
    document.getElementById("tradeBtn").disabled = true; // Отключаем кнопку
  },

  updateTradeWindow() {
    const myTradeGrid = document.getElementById("myTradeGrid").children;
    const myOfferGrid = document.getElementById("myOfferGrid").children;
    const partnerOfferGrid =
      document.getElementById("partnerOfferGrid").children;

    // Обновляем слоты инвентаря
    for (let i = 0; i < myTradeGrid.length; i++) {
      myTradeGrid[i].innerHTML = "";
      if (inventory[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[inventory[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        myTradeGrid[i].appendChild(img);
      }
    }

    // Обновляем слоты своего предложения
    for (let i = 0; i < 3; i++) {
      myOfferGrid[i].innerHTML = "";
      if (this.myOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        myOfferGrid[i].appendChild(img);
        // Отображаем количество для stackable предметов
        if (
          this.myOffer[i].quantity &&
          ITEM_CONFIG[this.myOffer[i].type].stackable
        ) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = this.myOffer[i].quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          myOfferGrid[i].appendChild(quantityEl);
        }
      }
    }

    // Обновляем слоты предложения партнёра
    for (let i = 0; i < 3; i++) {
      partnerOfferGrid[i].innerHTML = "";
      if (this.partnerOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.partnerOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        partnerOfferGrid[i].appendChild(img);
        // Отображаем количество для stackable предметов
        if (
          this.partnerOffer[i].quantity &&
          ITEM_CONFIG[this.partnerOffer[i].type].stackable
        ) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = this.partnerOffer[i].quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          partnerOfferGrid[i].appendChild(quantityEl);
        }
      }
    }

    // Отключаем кнопку подтверждения, если уже подтверждено
    document.getElementById("confirmTradeBtn").disabled = this.myConfirmed;
  },
};

window.tradeSystem = tradeSystem;
