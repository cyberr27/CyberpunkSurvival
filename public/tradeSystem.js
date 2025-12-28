// tradeSystem.js (обновлён: убраны проверки расстояния и здоровья)
const tradeSystem = {
  isTradeWindowOpen: false,
  selectedPlayerId: null,
  tradePartnerId: null,
  tradeStatus: null,
  myOffer: Array(4).fill(null),
  partnerOffer: Array(4).fill(null),
  myConfirmed: false,
  partnerConfirmed: false,
  currentOfferSlot: null,

  // Ссылки на DOM-элементы чата
  tradeChatMessages: null,
  tradeChatInput: null,
  tradeChatSend: null,
  tradePartnerNameEl: null,

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
    tradeBtn.style.pointerEvents = "none";
    tradeBtn.style.opacity = "0.5";
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
    if (tradeBtn) {
      tradeBtn.style.pointerEvents = playerId ? "auto" : "none";
      tradeBtn.style.opacity = playerId ? "1" : "0.5";
    }
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
        <h3 class="cyber-text">ТОРГОВЛЯ С ИГРОКОМ: <span id="tradePartnerName">...</span></h3>
        
        <h3 class="cyber-text">Ваш инвентарь</h3>
        <div id="myTradeGrid" class="trade-grid"></div>
        
        <!-- ЧАТ ТОРГОВЛИ -->
        <div class="trade-chat">
          <div id="tradeChatMessages" class="trade-chat-messages"></div>
          <div class="trade-chat-input-container">
            <input type="text" id="tradeChatInput" class="trade-chat-input" placeholder="Напишите сообщение..." maxlength="100">
            <button id="tradeChatSend" class="trade-chat-send">➤</button>
          </div>
        </div>
        
        <h3 class="cyber-text">Ваше предложение</h3>
        <div id="myOfferGrid" class="trade-offer-grid"></div>
        
        <h3 class="cyber-text">Предложение партнёра</h3>
        <div id="partnerOfferGrid" class="trade-offer-grid"></div>
        
        <div class="offer-amount-container">
          <input type="number" id="offerAmount" min="1" value="1" class="cyber-input" disabled>
          <button id="confirmOfferBtn" class="action-btn use-btn" style="display: none;">Подтвердить</button>
          <button id="cancelOfferBtn" class="action-btn drop-btn" style="display: none;">Отмена</button>
        </div>
        
        <div class="trade-buttons">
          <button id="confirmTradeBtn" class="action-btn use-btn" disabled>ПОДТВЕРДИТЬ ТОРГ</button>
          <button id="cancelTradeWindowBtn" class="action-btn drop-btn">ОТМЕНА</button>
        </div>
      </div>
    `;
    document.getElementById("gameContainer").appendChild(tradeWindow);

    // Создаём слоты
    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "trade-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myTradeGrid").appendChild(slot);
    }

    for (let i = 0; i < 4; i++) {
      const slot = document.createElement("div");
      slot.className = "offer-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("myOfferGrid").appendChild(slot);
      document
        .getElementById("partnerOfferGrid")
        .appendChild(slot.cloneNode(true));
    }

    // === КРИТИЧНО: сохраняем ссылки на элементы чата ===
    this.tradeChatMessages = document.getElementById("tradeChatMessages");
    this.tradeChatInput = document.getElementById("tradeChatInput");
    this.tradeChatSend = document.getElementById("tradeChatSend");
    this.tradePartnerNameEl = document.getElementById("tradePartnerName");

    // Обработчики ввода
    this.tradeChatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && this.tradeChatInput.value.trim()) {
        this.sendTradeChatMessage(this.tradeChatInput.value.trim());
        this.tradeChatInput.value = "";
      }
    });

    this.tradeChatSend.addEventListener("click", () => {
      if (this.tradeChatInput.value.trim()) {
        this.sendTradeChatMessage(this.tradeChatInput.value.trim());
        this.tradeChatInput.value = "";
      }
    });

    // Остальные кнопки (подтверждение, отмена и т.д.) — оставь как у тебя было
    document
      .getElementById("confirmTradeBtn")
      .addEventListener("click", () => this.confirmTrade());
    document
      .getElementById("cancelTradeWindowBtn")
      .addEventListener("click", () => this.cancelTrade());

    // Анимации атомов
    this.atomAnimations = {
      myTradeGrid: Array(20)
        .fill()
        .map(() => ({ frame: 0, frameTime: 0 })),
      myOfferGrid: Array(4)
        .fill()
        .map(() => ({ frame: 0, frameTime: 0 })),
      partnerOfferGrid: Array(4)
        .fill()
        .map(() => ({ frame: 0, frameTime: 0 })),
    };
  },

  sendAndDisplayLocalMessage(message) {
    if (!this.tradePartnerId || !message) return;

    // Сразу показываем своё сообщение
    this.addMessageToChat(myId, message, true); // true = своё сообщение

    // Отправляем на сервер
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeChat",
        toId: this.tradePartnerId,
        message: message,
      })
    );
  },

  addMessageToChat(senderId, message) {
    if (!this.tradeChatMessages) return;

    const msgEl = document.createElement("div");

    if (senderId === myId) {
      msgEl.classList.add("mine");
      msgEl.textContent = `Вы: ${message}`;
    } else {
      msgEl.classList.add("theirs");
      msgEl.textContent = `${senderId}: ${message}`;
    }

    this.tradeChatMessages.appendChild(msgEl);
    this.tradeChatMessages.scrollTop = this.tradeChatMessages.scrollHeight;
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
    document.getElementById("tradeWindow").style.display = "flex";
    this.isTradeWindowOpen = true;
    this.updateTradeWindow();
    this.updateTradePartnerName();
    this.clearTradeChat();
    this.tradeChatInput?.focus();
  },

  closeTradeWindow() {
    document.getElementById("tradeWindow").style.display = "none";
    this.isTradeWindowOpen = false;
    this.clearTradeChat();
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

    // НОВАЯ ЛОГИКА: Если input активен (не disabled) и это другой слот - сбросить input как при cancel
    const offerAmount = document.getElementById("offerAmount");
    const confirmBtn = document.getElementById("confirmOfferBtn");
    const cancelBtn = document.getElementById("cancelOfferBtn");
    if (!offerAmount.disabled && slotIndex !== this.currentOfferSlot) {
      offerAmount.disabled = true;
      offerAmount.value = 1;
      confirmBtn.style.display = "none";
      cancelBtn.style.display = "none";
      this.currentOfferSlot = null;
      // Удаляем listeners, если они висят (хотя они one-time, но на всякий)
      // Нет нужды, т.к. они добавляются заново при новой активации
    }

    // ВСТАВКА НАЧАЛО: Проверка на stackable (баляр или атом) с quantity >1 - активируем input
    if (ITEM_CONFIG[item.type]?.stackable && (item.quantity || 1) > 1) {
      this.currentOfferSlot = slotIndex; // Запоминаем слот
      offerAmount.max = item.quantity;
      offerAmount.value = 1;
      offerAmount.disabled = false;
      offerAmount.focus(); // Фокус на input

      // Показываем кнопки
      confirmBtn.style.display = "inline-block";
      cancelBtn.style.display = "inline-block";

      // Обработчики (одноразовые, чтобы не дублировать)
      const confirmHandler = () => {
        const amount = parseInt(offerAmount.value);
        if (amount >= 1 && amount <= item.quantity) {
          // Создаем item для offer с выбранным quantity
          this.myOffer[freeSlot] = {
            ...item,
            quantity: amount,
            originalSlot: slotIndex,
          };

          // Уменьшаем в инвентаре
          inventory[slotIndex].quantity -= amount;
          if (inventory[slotIndex].quantity <= 0) {
            inventory[slotIndex] = null;
          }

          // Отправляем обновление
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
        // Деактивируем
        offerAmount.disabled = true;
        confirmBtn.style.display = "none";
        cancelBtn.style.display = "none";
        this.currentOfferSlot = null; // Сброс
        confirmBtn.removeEventListener("click", confirmHandler);
        cancelBtn.removeEventListener("click", cancelHandler);
      };

      const cancelHandler = () => {
        // Деактивируем без изменений
        offerAmount.disabled = true;
        confirmBtn.style.display = "none";
        cancelBtn.style.display = "none";
        this.currentOfferSlot = null; // Сброс
        confirmBtn.removeEventListener("click", confirmHandler);
        cancelBtn.removeEventListener("click", cancelHandler);
      };

      confirmBtn.addEventListener("click", confirmHandler);
      cancelBtn.addEventListener("click", cancelHandler);

      return; // Прерываем, пока input активен
    }
    // ВСТАВКА КОНЕЦ

    // Старая логика для не-stackable или quantity=1
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
  },

  removeFromOffer(slotIndex) {
    if (!this.myOffer[slotIndex] || this.myConfirmed || this.partnerConfirmed)
      return;

    const item = this.myOffer[slotIndex];

    // ВСТАВКА НАЧАЛО: Для stackable - возвращаем quantity в инвентарь (ищем существующий стек или свободный слот)
    if (ITEM_CONFIG[item.type]?.stackable) {
      const existingSlot = inventory.findIndex(
        (invItem) => invItem && invItem.type === item.type
      );
      if (existingSlot !== -1) {
        inventory[existingSlot].quantity =
          (inventory[existingSlot].quantity || 1) + (item.quantity || 1);
      } else {
        const freeSlot = inventory.findIndex((slot) => slot === null);
        if (freeSlot !== -1) {
          inventory[freeSlot] = {
            ...item,
            itemId: `${item.type}_${Date.now()}`,
          }; // Новый itemId
        }
      }
    } else {
      // Для не-stackable - возвращаем в оригинальный слот или свободный
      if (item.originalSlot !== undefined && !inventory[item.originalSlot]) {
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
    }
    // ВСТАВКА КОНЕЦ

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
    this.myOffer.fill(null);
    this.partnerOffer.fill(null);
    this.myConfirmed = false;
    this.partnerConfirmed = false;
    this.tradeStatus = null;
    this.tradePartnerId = null;
    this.selectedPlayerId = null;
    this.selectPlayer(null);
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
      myTradeGrid[i].setAttribute("data-title", ""); // Сбрасываем tooltip
      if (inventory[i] && inventory[i].type) {
        const img = document.createElement("img");
        const config = ITEM_CONFIG[inventory[i].type];
        let tooltipText = config
          ? config.description || "Нет описания"
          : "Нет описания";
        if (
          ITEM_CONFIG[inventory[i].type]?.stackable &&
          inventory[i].quantity > 1
        ) {
          tooltipText += `\nКоличество: ${inventory[i].quantity}`;
        }
        myTradeGrid[i].setAttribute("data-title", tooltipText);

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

        // ВСТАВКА НАЧАЛО: Добавляем отображение количества для stackable в инвентаре (myTradeGrid), если quantity > 1
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
        // ВСТАВКА КОНЕЦ
      }
    }

    for (let i = 0; i < 4; i++) {
      myOfferGrid[i].innerHTML = "";
      myOfferGrid[i].setAttribute("data-title", ""); // Сбрасываем tooltip
      if (this.myOffer[i] && this.myOffer[i].type) {
        const img = document.createElement("img");
        const config = ITEM_CONFIG[this.myOffer[i].type];
        let tooltipText = config
          ? config.description || "Нет описания"
          : "Нет описания";
        if (
          ITEM_CONFIG[this.myOffer[i].type]?.stackable &&
          this.myOffer[i].quantity > 1
        ) {
          tooltipText += `\nКоличество: ${this.myOffer[i].quantity}`;
        }
        myOfferGrid[i].setAttribute("data-title", tooltipText);

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

        // ВСТАВКА НАЧАЛО: Добавляем отображение количества для stackable в myOfferGrid, если quantity > 1
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
        // ВСТАВКА КОНЕЦ
      }
    }

    for (let i = 0; i < 4; i++) {
      partnerOfferGrid[i].innerHTML = "";
      partnerOfferGrid[i].setAttribute("data-title", ""); // Сбрасываем tooltip
      if (this.partnerOffer[i] && this.partnerOffer[i].type) {
        const img = document.createElement("img");
        const config = ITEM_CONFIG[this.partnerOffer[i].type];
        let tooltipText = config
          ? config.description || "Нет описания"
          : "Нет описания";
        if (
          ITEM_CONFIG[this.partnerOffer[i].type]?.stackable &&
          this.partnerOffer[i].quantity > 1
        ) {
          tooltipText += `\nКоличество: ${this.partnerOffer[i].quantity}`;
        }
        partnerOfferGrid[i].setAttribute("data-title", tooltipText);

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

        // ВСТАВКА НАЧАЛО: Добавляем отображение количества для stackable в partnerOfferGrid, если quantity > 1
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
        // ВСТАВКА КОНЕЦ
      }
    }

    document.getElementById("confirmTradeBtn").disabled = this.myConfirmed;
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
          if (this.myConfirmed) this.completeTrade();
        }
        break;
      case "tradeCompleted":
        inventory = data.newInventory;
        this.closeTradeWindow();
        this.resetTrade();
        updateInventoryDisplay();
        break;
      case "tradeCancelled":
        this.returnOfferItems();
        this.closeTradeWindow();
        this.resetTrade();
        updateInventoryDisplay();
        break;
      case "tradeChat":
        this.handleTradeChatMessage(data);
        break;
    }
  },

  updateTradePartnerName() {
    if (this.tradePartnerId && this.tradePartnerNameEl) {
      this.tradePartnerNameEl.textContent = this.tradePartnerId;
    }
  },

  sendTradeChatMessage(message) {
    if (!this.tradePartnerId || !message) return;

    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeChat",
        toId: this.tradePartnerId,
        message: message,
      })
    );
  },

  handleTradeChatMessage(data) {
    // Принимаем сообщение, если оно от партнёра или от нас самих (эхо)
    if (data.fromId === this.tradePartnerId || data.fromId === myId) {
      this.addMessageToChat(data.fromId, data.message);
    }
  },

  clearTradeChat() {
    if (this.tradeChatMessages) {
      this.tradeChatMessages.innerHTML = "";
    }
  },
};

window.tradeSystem = tradeSystem;
