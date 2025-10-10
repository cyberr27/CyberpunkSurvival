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
    const tradeBtn = document.createElement("img");
    tradeBtn.id = "tradeBtn";
    tradeBtn.className = "cyber-btn-img";
    tradeBtn.src = "images/trade.png";
    tradeBtn.alt = "Trade";
    tradeBtn.style.pointerEvents =
      this.selectedPlayerId && this.canInitiateTrade() ? "auto" : "none"; // Управляем кликабельностью
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
    tradeBtn.style.pointerEvents =
      playerId && this.canInitiateTrade() ? "auto" : "none";
    tradeBtn.style.opacity = playerId && this.canInitiateTrade() ? "1" : "0.5";
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
    if (!me || !target || this.isTradeWindowOpen || this.tradeStatus)
      return false;

    const dx = me.x - target.x;
    const dy = me.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 1000 && me.health > 0 && target.health > 0;
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
            if (item) {
              const freeSlot = inventory.findIndex((slot) => slot === null);
              if (freeSlot !== -1) {
                inventory[freeSlot] = {
                  ...item,
                  itemId: `${item.type}_${Date.now()}`,
                };
                this.myOffer[index] = null;
              }
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
          // Если партнёр отправил инвентарь, обновляем его локально
          if (data.inventory && data.toId === myId) {
            const partner = players.get(this.tradePartnerId);
            if (partner) {
              partner.inventory = data.inventory;
              players.set(this.tradePartnerId, partner);
            }
          }
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
        if (data.toId === myId) {
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
      if (item) {
        const freeSlot = inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          inventory[freeSlot] = {
            ...item,
            itemId: `${item.type}_${Date.now()}`,
          };
          this.myOffer[index] = null;
        } else {
          console.warn("Нет свободных слотов для возврата предмета при отмене");
        }
      }
    });

    // Отправляем сообщение об отмене
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeCancelled",
        fromId: myId,
        toId: this.tradePartnerId,
      })
    );

    // Закрываем окно и сбрасываем состояние
    this.closeTradeWindow();
    this.resetTrade();
    updateInventoryDisplay();
  },

  openTradeWindow() {
    this.isTradeWindowOpen = true;
    document.getElementById("tradeWindow").style.display = "flex";
    document.getElementById("tradeBtn").classList.add("active");
    this.updateTradeWindow();
  },

  closeTradeWindow() {
    this.isTradeWindowOpen = false;
    document.getElementById("tradeWindow").style.display = "none";
    document.getElementById("tradeBtn").classList.remove("active");
  },

  addToOffer(slotIndex) {
    const item = inventory[slotIndex];
    if (!item || this.myConfirmed || this.partnerConfirmed) return; // Нельзя менять предложение после подтверждения

    const freeSlot = this.myOffer.findIndex((slot) => slot === null);
    if (freeSlot === -1) return; // Нет свободных слотов в предложении

    // Сохраняем предмет в предложение с информацией о слоте
    this.myOffer[freeSlot] = { ...item, originalSlot: slotIndex };
    // Удаляем предмет из инвентаря
    inventory[slotIndex] = null;

    // Отправляем обновление серверу
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
        inventory: inventory, // Отправляем обновлённый инвентарь
      })
    );

    // Обновляем отображение
    this.updateTradeWindow();
    updateInventoryDisplay();
  },

  removeFromOffer(slotIndex) {
    if (!this.myOffer[slotIndex] || this.myConfirmed || this.partnerConfirmed)
      return;

    const item = this.myOffer[slotIndex];
    // Ищем свободный слот в инвентаре
    const freeInventorySlot = inventory.findIndex((slot) => slot === null);
    if (freeInventorySlot === -1) {
      console.warn("Нет свободных слотов в инвентаре для возврата предмета");
      return;
    }

    // Возвращаем предмет в инвентарь
    inventory[freeInventorySlot] = {
      ...item,
      itemId: `${item.type}_${Date.now()}`, // Новый ID для предмета
    };
    this.myOffer[slotIndex] = null;

    // Отправляем обновление серверу
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
        inventory: inventory,
      })
    );

    // Обновляем отображение
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

    for (let i = 0; i < 3; i++) {
      // Было myOfferGrid.length, теперь явно 3
      myOfferGrid[i].innerHTML = "";
      if (this.myOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        myOfferGrid[i].appendChild(img);
      }
    }

    for (let i = 0; i < 3; i++) {
      // Было partnerOfferGrid.length, теперь явно 3
      partnerOfferGrid[i].innerHTML = "";
      if (this.partnerOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.partnerOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        partnerOfferGrid[i].appendChild(img);
      }
    }

    document.getElementById("confirmTradeBtn").disabled = this.myConfirmed;
  },
};

window.tradeSystem = tradeSystem;
