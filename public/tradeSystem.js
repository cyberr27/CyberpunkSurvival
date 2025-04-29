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
          // Возвращаем предметы в инвентарь при отмене
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
          tradePartnerId.isTradeWindowOpen = false;
          this.closeTradeWindow();
          this.resetTrade();
          updateInventoryDisplay();
        }
        break;
      case "tradeOffer":
        if (data.fromId === this.tradePartnerId) {
          this.partnerOffer = data.offer;
          if (data.inventory) {
            inventory = data.inventory; // Обновляем инвентарь партнёра
          }
          this.updateTradeWindow();
          updateInventoryDisplay();
        }
        break;
      case "tradeConfirmed":
        if (data.fromId === this.tradePartnerId) {
          this.partnerConfirmed = true;
          this.partnerOffer = data.partnerOffer; // Обновляем предложение партнёра
          this.updateTradeWindow();
          if (this.myConfirmed) {
            this.completeTrade();
          }
        }
        break;
      case "tradeCompleted":
        if (data.toId === myId) {
          // Проверяем уникальность itemId в новом инвентаре
          const existingItemIds = new Set(
            inventory.map((item) => (item ? item.itemId : null))
          );
          if (data.partnerOffer) {
            data.partnerOffer.forEach((item) => {
              if (item) {
                // Проверяем, что itemId уникален
                if (existingItemIds.has(item.itemId)) {
                  console.warn(
                    `Дубликат itemId ${item.itemId} при завершении торга, генерируем новый`
                  );
                  item.itemId = `${item.type}_${Date.now()}`;
                }
                const freeSlot = inventory.findIndex((slot) => slot === null);
                if (freeSlot !== -1) {
                  inventory[freeSlot] = {
                    type: item.type,
                    quantity: item.quantity,
                    itemId: item.itemId,
                  };
                  existingItemIds.add(item.itemId);
                } else {
                  console.log("Нет свободных слотов для предмета партнёра");
                }
              }
            });
          }
          // Обновляем инвентарь из данных сервера, если он передан
          if (data.newInventory) {
            inventory = data.newInventory;
          }
          this.closeTradeWindow();
          this.resetTrade();
          updateInventoryDisplay();
          // Отправляем обновление инвентаря на сервер
          sendWhenReady(
            this.ws,
            JSON.stringify({
              type: "updateInventory",
              inventory: inventory,
            })
          );
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
          } else {
            console.log(
              "Нет свободных слотов для возврата предмета при отмене"
            );
          }
        }
        this.myOffer[index] = null;
      }
    });

    // Отправляем обновление предложения и инвентаря
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
    // Отправляем сообщение об отмене торга
    this.cancelTrade();
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
    const item = inventory[slotIndex];
    if (!item) return;

    // Проверка на дублирование itemId в myOffer
    if (
      this.myOffer.some(
        (offerItem) => offerItem && offerItem.itemId === item.itemId
      )
    ) {
      console.log(`Предмет ${item.itemId} уже добавлен в предложение`);
      return;
    }

    const freeSlot = this.myOffer.findIndex((slot) => slot === null);
    if (freeSlot === -1) return;

    // Сохраняем предмет в предложение и удаляем из инвентаря
    this.myOffer[freeSlot] = { ...item, originalSlot: slotIndex };
    inventory[slotIndex] = null; // Удаляем из инвентаря

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
    this.updateTradeWindow();
    updateInventoryDisplay(); // Обновляем отображение инвентаря
  },

  removeFromOffer(slotIndex) {
    if (!this.myOffer[slotIndex]) return;

    const item = this.myOffer[slotIndex];
    if (item.originalSlot !== undefined) {
      // Проверяем, свободен ли оригинальный слот
      if (inventory[item.originalSlot] === null) {
        inventory[item.originalSlot] = {
          ...item,
          itemId: `${item.type}_${Date.now()}`, // Новый itemId для избежания дублирования
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
          console.log("Нет свободных слотов для возврата предмета");
          return; // Не удаляем из предложения, если нет места
        }
      }
    }
    this.myOffer[slotIndex] = null;
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
    this.updateTradeWindow();
    updateInventoryDisplay(); // Обновляем отображение инвентаря
  },

  confirmTrade() {
    this.myConfirmed = true;
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeConfirmed",
        fromId: myId,
        toId: this.tradePartnerId,
        myOffer: this.myOffer,
        partnerOffer: this.partnerOffer,
      })
    );
    // Не блокируем кнопку сразу, ждём завершения торга
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

    // Очищаем предложения локально
    this.myOffer = Array(3).fill(null);
    this.partnerOffer = Array(3).fill(null);
    this.myConfirmed = false;
    this.partnerConfirmed = false;

    // Закрываем окно торговли
    this.closeTradeWindow();
    this.resetTrade();
    this.updateTradeWindow();
    updateInventoryDisplay();
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
    const confirmBtn = document.getElementById("confirmTradeBtn");

    // Обновляем отображение инвентаря
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

    // Обновляем отображение своего предложения
    for (let i = 0; i < 3; i++) {
      myOfferGrid[i].innerHTML = "";
      myOfferGrid[i].style.borderColor = this.myConfirmed
        ? "#00ff00"
        : "#00ccff"; // Зелёная рамка при подтверждении
      if (this.myOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        myOfferGrid[i].appendChild(img);
      }
    }

    // Обновляем отображение предложения партнёра
    for (let i = 0; i < 3; i++) {
      partnerOfferGrid[i].innerHTML = "";
      partnerOfferGrid[i].style.borderColor = this.partnerConfirmed
        ? "#00ff00"
        : "#00ccff"; // Зелёная рамка при подтверждении
      if (this.partnerOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.partnerOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        partnerOfferGrid[i].appendChild(img);
      }
    }

    // Проверяем, есть ли предметы в своём предложении
    const hasItemsInOffer = this.myOffer.some((item) => item !== null);

    // Кнопка активна, если игрок ещё не подтвердил и есть предметы в предложении
    confirmBtn.disabled = this.myConfirmed || !hasItemsInOffer;
    confirmBtn.textContent = this.myConfirmed ? "Ожидание..." : "Подтвердить";
  },
};

window.tradeSystem = tradeSystem;
