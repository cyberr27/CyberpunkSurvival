// tradeSystem.js (исправленный с hover для tradeScreen)
const tradeSystem = {
  isTradeWindowOpen: false,
  selectedPlayerId: null,
  tradePartnerId: null,
  tradeStatus: null, // 'pending', 'accepted', 'confirmed', 'completed', 'cancelled'
  myOffer: Array(4).fill(null), // Было 3, стало 4
  partnerOffer: Array(4).fill(null), // Было 3, стало 4
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

    // Создаём слоты для myTradeGrid (20 слотов инвентаря)
    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "trade-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myTradeGrid").appendChild(slot);
    }

    // Создаём 4 слота для myOfferGrid
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myOfferGrid").appendChild(slot);
    }

    // Создаём 4 слота для partnerOfferGrid
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("partnerOfferGrid").appendChild(slot);
    }

    // ★★★ НОВЫЕ HOVER LISTENERS ДЛЯ ВСЕХ ГРИДОВ ★★★
    // Hover для myTradeGrid (ваш инвентарь)
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

    // Hover для myOfferGrid (ваше предложение)
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

    // Hover для partnerOfferGrid (предложение партнёра)
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
    // ★★★ КОНЕЦ HOVER LISTENERS ★★★

    // Хранилище для анимации атомов
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

    // Запускаем анимацию для атомов в окне торговли
    this.startAtomAnimation();
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
    // Просто отправляем сообщение об отмене и сбрасываем состояние
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
    this.showItemDescription(null); // Очистить экран при открытии
    this.startAtomAnimation(); // Запускаем анимацию при открытии окна
  },

  closeTradeWindow() {
    this.isTradeWindowOpen = false;
    document.getElementById("tradeWindow").style.display = "none";
    document.getElementById("tradeBtn").classList.remove("active");
    this.showItemDescription(null); // Очистить экран
    // Сбрасываем состояния анимации
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

    // Не добавлять один и тот же слот дважды
    if (
      this.myOffer.some(
        (offerItem) => offerItem && offerItem.originalSlot === slotIndex
      )
    )
      return;

    // Добавляем предмет в предложение (только ссылка на слот)
    this.myOffer[freeSlot] = { ...item, originalSlot: slotIndex };

    // inventory не меняем! В tradeOffer отправляем inventory как есть
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

  removeFromOffer(slotIndex) {
    if (!this.myOffer[slotIndex] || this.myConfirmed || this.partnerConfirmed)
      return;

    // Просто убираем предмет из предложения (в инвентаре он и так есть)
    this.myOffer[slotIndex] = null;

    // inventory не меняем! В tradeOffer отправляем inventory как есть
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
    document.getElementById("tradeBtn").disabled = true; // Отключаем кнопку
  },

  updateTradeWindow() {
    const myTradeGrid = document.getElementById("myTradeGrid").children;
    const myOfferGrid = document.getElementById("myOfferGrid").children;
    const partnerOfferGrid =
      document.getElementById("partnerOfferGrid").children;

    // Слоты, которые участвуют в предложении
    const offeredSlots = this.myOffer
      .filter(Boolean)
      .map((item) => item.originalSlot);

    // Обновляем myTradeGrid (инвентарь)
    for (let i = 0; i < myTradeGrid.length; i++) {
      myTradeGrid[i].innerHTML = "";
      if (inventory[i] && inventory[i].type) {
        const img = document.createElement("img");
        if (inventory[i].type === "atom") {
          // Для атома используем sprite sheet
          img.src = ITEM_CONFIG[inventory[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "none"; // Отключаем масштабирование
          img.style.objectPosition = `-${
            this.atomAnimations.myTradeGrid[i].frame * 50
          }px 0`; // Смещение для текущего кадра
          img.dataset.isAtom = "true"; // Метка для анимации
          img.dataset.slotIndex = i;
          img.dataset.grid = "myTradeGrid";
        } else {
          img.src = ITEM_CONFIG[inventory[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
        }
        if (offeredSlots.includes(i)) {
          img.style.opacity = "0.3"; // Визуально скрываем/делаем неактивным
        }
        myTradeGrid[i].appendChild(img);
      }
    }

    // Обновляем myOfferGrid (ваше предложение)
    for (let i = 0; i < 4; i++) {
      myOfferGrid[i].innerHTML = "";
      if (this.myOffer[i] && this.myOffer[i].type) {
        const img = document.createElement("img");
        if (this.myOffer[i].type === "atom") {
          img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "none";
          img.style.objectPosition = `-{${
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
      }
    }

    // Обновляем partnerOfferGrid (предложение партнёра)
    for (let i = 0; i < 4; i++) {
      partnerOfferGrid[i].innerHTML = "";
      if (this.partnerOffer[i] && this.partnerOffer[i].type) {
        const img = document.createElement("img");
        if (this.partnerOffer[i].type === "atom") {
          img.src = ITEM_CONFIG[this.partnerOffer[i].type].image.src;
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.objectFit = "none";
          img.style.objectPosition = `-{${
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
      }
    }

    document.getElementById("confirmTradeBtn").disabled = this.myConfirmed;
  },

  showItemDescription(item) {
    const tradeScreen = document.getElementById("tradeScreen");
    if (item && item.type && ITEM_CONFIG && ITEM_CONFIG[item.type]) {
      const config = ITEM_CONFIG[item.type];
      let description = config.description || "Нет описания";

      tradeScreen.textContent = description;
    } else {
      tradeScreen.textContent = "Наведите на предмет для просмотра свойств";
    }
  },

  startAtomAnimation() {
    const animate = (timestamp) => {
      if (!this.isTradeWindowOpen) return; // Останавливаем анимацию, если окно закрыто

      const deltaTime = timestamp - (this.lastAnimationTime || timestamp);
      this.lastAnimationTime = timestamp;

      // Обновляем анимацию для myTradeGrid
      for (let i = 0; i < 20; i++) {
        if (inventory[i] && inventory[i].type === "atom") {
          this.atomAnimations.myTradeGrid[i].frameTime += deltaTime;
          const frameDuration = 300; // Скорость анимации, как в code.js
          if (this.atomAnimations.myTradeGrid[i].frameTime >= frameDuration) {
            this.atomAnimations.myTradeGrid[i].frameTime -= frameDuration;
            this.atomAnimations.myTradeGrid[i].frame =
              (this.atomAnimations.myTradeGrid[i].frame + 1) % 40; // 40 кадров
            const img = document.querySelector(
              `#myTradeGrid .trade-slot[data-slot-index="${i}"] img[data-is-atom="true"]`
            );
            if (img) {
              img.style.objectPosition = `-{${
                this.atomAnimations.myTradeGrid[i].frame * 50
              }px 0`;
            }
          }
        } else {
          this.atomAnimations.myTradeGrid[i].frame = 0;
          this.atomAnimations.myTradeGrid[i].frameTime = 0;
        }
      }

      // Обновляем анимацию для myOfferGrid
      for (let i = 0; i < 4; i++) {
        if (this.myOffer[i] && this.myOffer[i].type === "atom") {
          this.atomAnimations.myOfferGrid[i].frameTime += deltaTime;
          const frameDuration = 300;
          if (this.atomAnimations.myOfferGrid[i].frameTime >= frameDuration) {
            this.atomAnimations.myOfferGrid[i].frameTime -= frameDuration;
            this.atomAnimations.myOfferGrid[i].frame =
              (this.atomAnimations.myOfferGrid[i].frame + 1) % 40;
            const img = document.querySelector(
              `#myOfferGrid .offer-slot[data-slot-index="${i}"] img[data-is-atom="true"]`
            );
            if (img) {
              img.style.objectPosition = `-{${
                this.atomAnimations.myOfferGrid[i].frame * 50
              }px 0`;
            }
          }
        } else {
          this.atomAnimations.myOfferGrid[i].frame = 0;
          this.atomAnimations.myOfferGrid[i].frameTime = 0;
        }
      }

      // Обновляем анимацию для partnerOfferGrid
      for (let i = 0; i < 4; i++) {
        if (this.partnerOffer[i] && this.partnerOffer[i].type === "atom") {
          this.atomAnimations.partnerOfferGrid[i].frameTime += deltaTime;
          const frameDuration = 300;
          if (
            this.atomAnimations.partnerOfferGrid[i].frameTime >= frameDuration
          ) {
            this.atomAnimations.partnerOfferGrid[i].frameTime -= frameDuration;
            this.atomAnimations.partnerOfferGrid[i].frame =
              (this.atomAnimations.partnerOfferGrid[i].frame + 1) % 40;
            const img = document.querySelector(
              `#partnerOfferGrid .offer-slot[data-slot-index="${i}"] img[data-is-atom="true"]`
            );
            if (img) {
              img.style.objectPosition = `-{${
                this.atomAnimations.partnerOfferGrid[i].frame * 50
              }px 0`;
            }
          }
        } else {
          this.atomAnimations.partnerOfferGrid[i].frame = 0;
          this.atomAnimations.partnerOfferGrid[i].frameTime = 0;
        }
      }

      if (this.isTradeWindowOpen) {
        requestAnimationFrame(animate);
      }
    };

    // Запускаем анимацию, только если окно торговли открыто
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
        this.tradePartnerId = data.fromId === myId ? data.toId : data.fromId; // Симметрично
        this.tradeStatus = "accepted";
        this.openTradeWindow();
        break;
      case "tradeOffer":
        if (data.fromId === this.tradePartnerId) {
          this.partnerOffer = data.offer;
          this.updateTradeWindow(); // Динамическое обновление
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
