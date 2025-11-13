// tradeSystem.js (обновлён: добавлена форма ввода количества для стекируемых предметов в addToOffer)
const tradeSystem = {
  isTradeWindowOpen: false,
  selectedPlayerId: null,
  tradePartnerId: null,
  tradeStatus: null, // 'pending', 'accepted', 'confirmed', 'completed', 'cancelled'
  myOffer: Array(4).fill(null),
  partnerOffer: Array(4).fill(null),
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
    tradeBtn.style.pointerEvents = this.selectedPlayerId ? "auto" : "none";
    document.getElementById("gameContainer").appendChild(tradeBtn);

    tradeBtn.addEventListener("click", () => {
      if (this.selectedPlayerId) {
        this.sendTradeRequest(this.selectedPlayerId);
      }
    });
  },

  selectPlayer(playerId) {
    this.selectedPlayerId = playerId;
    const tradeBtn = document.getElementById("tradeBtn");
    tradeBtn.style.pointerEvents = playerId ? "auto" : "none";
    tradeBtn.style.opacity = playerId ? "1" : "0.5";
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
      <div id="tradeScreen" class="trade-screen">Наведите на предмет для просмотра свойств</div>
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

    // 20 слотов инвентаря
    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "trade-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myTradeGrid").appendChild(slot);
    }

    // 4 слота для предложений
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myOfferGrid").appendChild(slot);
    }

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("partnerOfferGrid").appendChild(slot);
    }

    // HOVER LISTENERS (все гриды)
    document
      .getElementById("myTradeGrid")
      .addEventListener("mouseover", (e) => {
        const slot = e.target.closest(".trade-slot");
        if (slot && slot.dataset.slotIndex !== undefined) {
          const slotIndex = parseInt(slot.dataset.slotIndex);
          const item = inventory[slotIndex];
          tradeSystem.showItemDescription(item);
        }
      });
    document.getElementById("myTradeGrid").addEventListener("mouseout", () => {
      tradeSystem.showItemDescription(null);
    });

    document
      .getElementById("myOfferGrid")
      .addEventListener("mouseover", (e) => {
        const slot = e.target.closest(".offer-slot");
        if (slot && slot.dataset.slotIndex !== undefined) {
          const slotIndex = parseInt(slot.dataset.slotIndex);
          const item = tradeSystem.myOffer[slotIndex];
          tradeSystem.showItemDescription(item);
        }
      });
    document.getElementById("myOfferGrid").addEventListener("mouseout", () => {
      tradeSystem.showItemDescription(null);
    });

    document
      .getElementById("partnerOfferGrid")
      .addEventListener("mouseover", (e) => {
        const slot = e.target.closest(".offer-slot");
        if (slot && slot.dataset.slotIndex !== undefined) {
          const slotIndex = parseInt(slot.dataset.slotIndex);
          const item = tradeSystem.partnerOffer[slotIndex];
          tradeSystem.showItemDescription(item);
        }
      });
    document
      .getElementById("partnerOfferGrid")
      .addEventListener("mouseout", () => {
        tradeSystem.showItemDescription(null);
      });

    // Анимация атомов
    this.atomAnimations = {
      myTradeGrid: Array(20)
        .fill(null)
        .map(() => ({ frame: 0, frameTime: 0 })),
      myOfferGrid: Array(4)
        .fill(null)
        .map(() => ({ frame: 0, frameTime: 0 })),
      partnerOfferGrid: Array(4)
        .fill(null)
        .map(() => ({ frame: 0, frameTime: 0 })),
    };

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

    this.startAtomAnimation();
  },

  // УБРАНЫ ПРОВЕРКИ НА РАССТОЯНИЕ И ЗДОРОВЬЕ
  canInitiateTrade() {
    const me = players.get(myId);
    const target = players.get(this.selectedPlayerId);
    if (!me || !target || this.isTradeWindowOpen || this.tradeStatus)
      return false;
    return true; // Любое расстояние, любой health
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
    updateInventoryDisplay();
  },

  openTradeWindow() {
    this.isTradeWindowOpen = true;
    document.getElementById("tradeWindow").style.display = "flex";
    document.getElementById("tradeBtn").classList.add("active");
    this.updateTradeWindow();
    this.showItemDescription(null);
    this.startAtomAnimation();
  },

  closeTradeWindow() {
    this.isTradeWindowOpen = false;
    document.getElementById("tradeWindow").style.display = "none";
    document.getElementById("tradeBtn").classList.remove("active");
    this.showItemDescription(null);
    this.atomAnimations.myTradeGrid.forEach((anim) => {
      anim.frame = 0;
      anim.frameTime = 0;
    });
    this.atomAnimations.myOfferGrid.forEach((anim) => {
      anim.frame = 0;
      anim.frameTime = 0;
    });
    this.atomAnimations.partnerOfferGrid.forEach((anim) => {
      anim.frame = 0;
      anim.frameTime = 0;
    });
  },

  addToOffer(slotIndex) {
    const item = inventory[slotIndex];
    if (!item || this.myConfirmed || this.partnerConfirmed) return;

    const freeSlot = this.myOffer.findIndex((slot) => slot === null);
    if (freeSlot === -1) return;

    if (
      this.myOffer.some(
        (offerItem) => offerItem && offerItem.originalSlot === slotIndex
      )
    )
      return;

    // НОВАЯ ЛОГИКА: если stackable и quantity > 1, показать форму ввода
    if (ITEM_CONFIG[item.type]?.stackable && (item.quantity || 1) > 1) {
      this.showQuantityInput(slotIndex, freeSlot);
    } else {
      // Обычное добавление
      this.myOffer[freeSlot] = { ...item, originalSlot: slotIndex };

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

      this.updateTradeWindow();
      updateInventoryDisplay();
    }
  },

  // НОВАЯ ФУНКЦИЯ: Показать форму ввода количества в tradeScreen
  showQuantityInput(slotIndex, freeOfferSlot) {
    const item = inventory[slotIndex];
    const maxQuantity = item.quantity || 1;
    const tradeScreen = document.getElementById("tradeScreen");
    tradeScreen.innerHTML = ""; // Очистить

    const input = document.createElement("input");
    input.type = "number";
    input.className = "cyber-input";
    input.min = 1;
    input.max = maxQuantity;
    input.value = 1;
    input.style.margin = "10px";

    const confirmBtn = document.createElement("button");
    confirmBtn.className = "action-btn use-btn";
    confirmBtn.textContent = "Подтвердить";
    confirmBtn.style.marginRight = "10px";
    confirmBtn.addEventListener("click", () => {
      this.confirmQuantity(slotIndex, freeOfferSlot, parseInt(input.value));
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "action-btn drop-btn";
    cancelBtn.textContent = "Отмена";
    cancelBtn.addEventListener("click", () => {
      this.cancelQuantity();
    });

    tradeScreen.appendChild(input);
    tradeScreen.appendChild(confirmBtn);
    tradeScreen.appendChild(cancelBtn);
  },

  // НОВАЯ ФУНКЦИЯ: Подтвердить количество и добавить в предложение
  confirmQuantity(slotIndex, freeOfferSlot, quantity) {
    if (quantity < 1 || isNaN(quantity)) return;
    const item = inventory[slotIndex];
    const maxQuantity = item.quantity || 1;
    if (quantity > maxQuantity) quantity = maxQuantity;

    // Split: создать новый item для предложения
    const offerItem = { ...item, quantity, originalSlot: slotIndex };

    // Уменьшить в инвентаре
    if (quantity === maxQuantity) {
      inventory[slotIndex] = null;
    } else {
      inventory[slotIndex].quantity -= quantity;
      if (inventory[slotIndex].quantity <= 0) {
        inventory[slotIndex] = null;
      }
    }

    this.myOffer[freeOfferSlot] = offerItem;

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

    this.updateTradeWindow();
    updateInventoryDisplay();
    this.showItemDescription(null); // Восстановить tradeScreen
  },

  // НОВАЯ ФУНКЦИЯ: Отмена ввода количества
  cancelQuantity() {
    this.showItemDescription(null); // Восстановить tradeScreen
  },

  removeFromOffer(slotIndex) {
    if (!this.myOffer[slotIndex] || this.myConfirmed || this.partnerConfirmed)
      return;

    this.myOffer[slotIndex] = null;

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
    this.myOffer = Array(4).fill(null);
    this.partnerOffer = Array(4).fill(null);
    this.myConfirmed = false;
    this.partnerConfirmed = false;
    const tradeBtn = document.getElementById("tradeBtn");
    if (tradeBtn) tradeBtn.disabled = true;
  },

  updateTradeWindow() {
    const myTradeGrid = document.getElementById("myTradeGrid").children;
    const myOfferGrid = document.getElementById("myOfferGrid").children;
    const partnerOfferGrid =
      document.getElementById("partnerOfferGrid").children;

    const offeredSlots = this.myOffer
      .filter(Boolean)
      .map((item) => item.originalSlot);

    for (let i = 0; i < myTradeGrid.length; i++) {
      myTradeGrid[i].innerHTML = "";
      if (inventory[i] && inventory[i].type) {
        const img = document.createElement("img");
        if (inventory[i].type === "atom") {
          img.src = ITEM_CONFIG[inventory[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "none";
          img.style.objectPosition = `-${
            this.atomAnimations.myTradeGrid[i].frame * 50
          }px 0`;
          img.dataset.isAtom = "true";
          img.dataset.slotIndex = i;
          img.dataset.grid = "myTradeGrid";
        } else {
          img.src = ITEM_CONFIG[inventory[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
        }
        if (offeredSlots.includes(i)) {
          img.style.opacity = "0.3";
        }
        myTradeGrid[i].appendChild(img);

        // Добавление отображения quantity для stackable предметов (atom и balyary)
        if (
          ITEM_CONFIG[inventory[i].type]?.stackable &&
          inventory[i].quantity > 1
        ) {
          const quantityEl = document.createElement("div");
          quantityEl.textContent = inventory[i].quantity;
          quantityEl.style.position = "absolute";
          quantityEl.style.top = "0";
          quantityEl.style.right = "0";
          quantityEl.style.color = "#00ffff";
          quantityEl.style.fontSize = "14px";
          quantityEl.style.textShadow = "0 0 5px rgba(0, 255, 255, 0.7)";
          myTradeGrid[i].appendChild(quantityEl);
        }
      }
    }

    for (let i = 0; i < 4; i++) {
      myOfferGrid[i].innerHTML = "";
      if (this.myOffer[i] && this.myOffer[i].type) {
        const img = document.createElement("img");
        if (this.myOffer[i].type === "atom") {
          img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "none";
          img.style.objectPosition = `-${
            this.atomAnimations.myOfferGrid[i].frame * 50
          }px 0`;
          img.dataset.isAtom = "true";
          img.dataset.slotIndex = i;
          img.dataset.grid = "myOfferGrid";
        } else {
          img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
        }
        myOfferGrid[i].appendChild(img);

        // Добавление отображения quantity для stackable предметов (atom и balyary)
        if (
          ITEM_CONFIG[this.myOffer[i].type]?.stackable &&
          this.myOffer[i].quantity > 1
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

    for (let i = 0; i < 4; i++) {
      partnerOfferGrid[i].innerHTML = "";
      if (this.partnerOffer[i] && this.partnerOffer[i].type) {
        const img = document.createElement("img");
        if (this.partnerOffer[i].type === "atom") {
          img.src = ITEM_CONFIG[this.partnerOffer[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "none";
          img.style.objectPosition = `-${
            this.atomAnimations.partnerOfferGrid[i].frame * 50
          }px 0`;
          img.dataset.isAtom = "true";
          img.dataset.slotIndex = i;
          img.dataset.grid = "partnerOfferGrid";
        } else {
          img.src = ITEM_CONFIG[this.partnerOffer[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
        }
        partnerOfferGrid[i].appendChild(img);

        // Добавление отображения quantity для stackable предметов (atom и balyary)
        if (
          ITEM_CONFIG[this.partnerOffer[i].type]?.stackable &&
          this.partnerOffer[i].quantity > 1
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

    document.getElementById("confirmTradeBtn").disabled = this.myConfirmed;
  },

  showItemDescription(item) {
    const tradeScreen = document.getElementById("tradeScreen");
    if (item && item.type && ITEM_CONFIG && ITEM_CONFIG[item.type]) {
      const config = ITEM_CONFIG[item.type];
      tradeScreen.textContent = config.description || "Нет описания";
    } else {
      tradeScreen.textContent = "Наведите на предмет для просмотра свойств";
    }
  },

  startAtomAnimation() {
    const animate = (timestamp) => {
      if (!this.isTradeWindowOpen) return;

      const deltaTime = timestamp - (this.lastAnimationTime || timestamp);
      this.lastAnimationTime = timestamp;

      const updateGrid = (gridName, items, animArray, gridSelector) => {
        for (let i = 0; i < items.length; i++) {
          if (items[i] && items[i].type === "atom") {
            animArray[i].frameTime += deltaTime;
            if (animArray[i].frameTime >= 300) {
              animArray[i].frameTime -= 300;
              animArray[i].frame = (animArray[i].frame + 1) % 40;
              const img = document.querySelector(
                `${gridSelector} [data-slot-index="${i}"] img[data-is-atom="true"]`
              );
              if (img) {
                img.style.objectPosition = `-${animArray[i].frame * 50}px 0`;
              }
            }
          } else {
            animArray[i].frame = 0;
            animArray[i].frameTime = 0;
          }
        }
      };

      updateGrid(
        "myTradeGrid",
        inventory,
        this.atomAnimations.myTradeGrid,
        "#myTradeGrid .trade-slot"
      );
      updateGrid(
        "myOfferGrid",
        this.myOffer,
        this.atomAnimations.myOfferGrid,
        "#myOfferGrid .offer-slot"
      );
      updateGrid(
        "partnerOfferGrid",
        this.partnerOffer,
        this.atomAnimations.partnerOfferGrid,
        "#partnerOfferGrid .offer-slot"
      );

      if (this.isTradeWindowOpen) {
        requestAnimationFrame(animate);
      }
    };

    if (this.isTradeWindowOpen) {
      this.lastAnimationTime = 0;
      requestAnimationFrame(animate);
    }
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
        this.tradePartnerId = data.fromId === myId ? data.toId : data.fromId;
        this.tradeStatus = "accepted";
        this.openTradeWindow();
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
        inventory = data.newInventory;
        this.closeTradeWindow();
        this.resetTrade();
        updateInventoryDisplay();
        break;
      case "tradeCancelled":
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
        break;
      case "tradeError":
        break;
    }
  },
};

window.tradeSystem = tradeSystem;
