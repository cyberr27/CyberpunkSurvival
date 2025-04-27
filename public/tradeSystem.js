// tradeSystem.js
const tradeSystem = {
  isTradeWindowOpen: false,
  selectedPlayerId: null,
  tradePartnerId: null,
  tradeStatus: null, // 'pending', 'accepted', 'confirmed', 'completed', 'cancelled'
  myOffer: Array(4).fill(null), // Слоты для предметов игрока (4 слота для торговли)
  partnerOffer: Array(4).fill(null), // Слоты для предметов партнёра
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
    tradeBtn.style.display = "none";
    tradeBtn.style.bottom = "20px";
    tradeBtn.style.right = "150px";
    tradeBtn.style.width = "60px";
    tradeBtn.style.height = "60px";
    document.getElementById("gameContainer").appendChild(tradeBtn);

    tradeBtn.addEventListener("click", () => {
      if (this.selectedPlayerId && this.canInitiateTrade()) {
        this.sendTradeRequest(this.selectedPlayerId);
        tradeBtn.style.display = "none";
      }
    });
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
          <button id="confirmTradeBtn" class="action-btn use-btn" disabled>Подтвердить</button>
          <button id="cancelTradeWindowBtn" class="action-btn drop-btn">Отмена</button>
        </div>
        <div class="trade-panel">
          <h3 class="cyber-text">Инвентарь партнёра</h3>
          <div id="partnerTradeGrid" class="trade-grid"></div>
          <h3 class="cyber-text">Предложение партнёра</h3>
          <div id="partnerOfferGrid" class="trade-offer-grid"></div>
        </div>
      `;
    document.getElementById("gameContainer").appendChild(tradeWindow);

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
    }

    for (let i = 0; i < 20; i++) {
      const slot = document.createElement("div");
      slot.className = "trade-slot";
      slot.dataset.slotIndex = i;
      document.getElementById("partnerTradeGrid").appendChild(slot);
    }

    for (let i = 0; i < 4; i++) {
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
        this.cancelTrade();
      });
  },

  canInitiateTrade() {
    const me = players.get(myId);
    const target = players.get(this.selectedPlayerId);
    if (!me || !target) return false;

    const dx = me.x - target.x;
    const dy = me.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < 100 && me.health > 0 && target.health > 0;
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
        if (data.fromId === this.tradePartnerId && data.toId === myId) {
          this.tradeStatus = "accepted";
          this.openTradeWindow();
        }
        break;
      case "tradeCancelled":
        if (data.fromId === this.tradePartnerId || data.toId === myId) {
          this.closeTradeWindow();
          this.resetTrade();
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

    const freeSlot = this.myOffer.findIndex((slot) => slot === null);
    if (freeSlot === -1) return;

    this.myOffer[freeSlot] = { ...item, originalSlot: slotIndex };
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
      })
    );
    this.updateTradeWindow();
  },

  removeFromOffer(slotIndex) {
    if (!this.myOffer[slotIndex]) return;

    this.myOffer[slotIndex] = null;
    sendWhenReady(
      this.ws,
      JSON.stringify({
        type: "tradeOffer",
        fromId: myId,
        toId: this.tradePartnerId,
        offer: this.myOffer,
      })
    );
    this.updateTradeWindow();
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
    document.getElementById("tradeBtn").style.display = "none";
  },

  updateTradeWindow() {
    const myTradeGrid = document.getElementById("myTradeGrid").children;
    const myOfferGrid = document.getElementById("myOfferGrid").children;
    const partnerTradeGrid =
      document.getElementById("partnerTradeGrid").children;
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

    for (let i = 0; i < myOfferGrid.length; i++) {
      myOfferGrid[i].innerHTML = "";
      if (this.myOffer[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[this.myOffer[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        myOfferGrid[i].appendChild(img);
      }
    }

    for (let i = 0; i < partnerTradeGrid.length; i++) {
      partnerTradeGrid[i].innerHTML = "";
      const partner = players.get(this.tradePartnerId);
      if (partner && partner.inventory && partner.inventory[i]) {
        const img = document.createElement("img");
        img.src = ITEM_CONFIG[partner.inventory[i].type].image.src;
        img.style.width = "100%";
        img.style.height = "100%";
        partnerTradeGrid[i].appendChild(img);
      }
    }

    for (let i = 0; i < partnerOfferGrid.length; i++) {
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

  selectPlayer(playerId, showButton) {
    this.selectedPlayerId = playerId;
    document.getElementById("tradeBtn").style.display =
      showButton && this.canInitiateTrade() ? "block" : "none";
  },
};

window.tradeSystem = tradeSystem;
