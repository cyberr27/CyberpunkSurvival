const tradeSystem = {
  selectedPlayerId: null,
  tradeState: null, // null, 'pending', 'accepted', 'cancelled'
  tradeSlots: { playerA: null, playerB: null },
  isTradeWindowOpen: false,

  initialize() {
    this.setupTradeButton();
    this.setupTradeDialog();
    this.setupTradeWindow();
  },

  setupTradeButton() {
    const tradeBtn = document.getElementById("tradeBtn");
    tradeBtn.disabled = true;
    tradeBtn.addEventListener("click", () => {
      if (this.selectedPlayerId && tradeBtn.disabled === false) {
        this.initiateTrade(this.selectedPlayerId);
      }
    });
  },

  setupTradeDialog() {
    const dialog = document.createElement("div");
    dialog.id = "tradeDialog";
    dialog.style.display = "none";
    dialog.innerHTML = `
        <div class="trade-dialog-content">
          <p id="tradeDialogText" class="cyber-text"></p>
          <div class="trade-dialog-buttons">
            <button id="tradeAcceptBtn" class="action-btn use-btn">Согласен</button>
            <button id="tradeCancelBtn" class="action-btn drop-btn">Отмена</button>
          </div>
        </div>
      `;
    document.getElementById("gameContainer").appendChild(dialog);

    document
      .getElementById("tradeAcceptBtn")
      .addEventListener("click", () => this.acceptTrade());
    document
      .getElementById("tradeCancelBtn")
      .addEventListener("click", () => this.cancelTrade());
  },

  setupTradeWindow() {
    const tradeWindow = document.createElement("div");
    tradeWindow.id = "tradeWindow";
    tradeWindow.style.display = "none";
    tradeWindow.innerHTML = `
        <div class="trade-slot" id="playerATradeSlot"></div>
        <div class="trade-slot" id="playerBTradeSlot"></div>
      `;
    document.getElementById("gameContainer").appendChild(tradeWindow);
  },

  selectPlayer(playerId, x, y) {
    const me = players.get(myId);
    if (!me || me.health <= 0) return;

    const targetPlayer = players.get(playerId);
    if (!targetPlayer) return;

    const dx = me.x - targetPlayer.x;
    const dy = me.y - targetPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= 1000) {
      this.selectedPlayerId = playerId;
      document.getElementById("tradeBtn").disabled = false;
      document.getElementById("tradeBtn").classList.add("active");
    } else {
      this.clearSelection();
    }
  },

  clearSelection() {
    this.selectedPlayerId = null;
    document.getElementById("tradeBtn").disabled = true;
    document.getElementById("tradeBtn").classList.remove("active");
  },

  initiateTrade(targetId) {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "initiateTrade",
          initiatorId: myId,
          targetId: targetId,
        })
      );
      this.tradeState = "pending";
    }
  },

  showTradeDialog(initiatorId) {
    const dialog = document.getElementById("tradeDialog");
    const dialogText = document.getElementById("tradeDialogText");
    dialogText.textContent = `Пользователь ${initiatorId} хочет торговать с вами.`;
    dialog.style.display = "flex";
  },

  hideTradeDialog() {
    document.getElementById("tradeDialog").style.display = "none";
  },

  acceptTrade() {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "acceptTrade",
          playerId: myId,
        })
      );
      this.tradeState = "accepted";
      this.openTradeWindow();
      this.hideTradeDialog();
    }
  },

  cancelTrade() {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "cancelTrade",
          playerId: myId,
        })
      );
      this.resetTrade();
    }
  },

  openTradeWindow() {
    this.isTradeWindowOpen = true;
    document.getElementById("tradeWindow").style.display = "flex";
    this.updateTradeSlots();
  },

  closeTradeWindow() {
    this.isTradeWindowOpen = false;
    document.getElementById("tradeWindow").style.display = "none";
    this.tradeSlots = { playerA: null, playerB: null };
    this.updateTradeSlots();
  },

  updateTradeSlots() {
    const slotA = document.getElementById("playerATradeSlot");
    const slotB = document.getElementById("playerBTradeSlot");
    slotA.innerHTML = "";
    slotB.innerHTML = "";

    if (this.tradeSlots.playerA) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[this.tradeSlots.playerA.type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slotA.appendChild(img);
    }

    if (this.tradeSlots.playerB) {
      const img = document.createElement("img");
      img.src = ITEM_CONFIG[this.tradeSlots.playerB.type].image.src;
      img.style.width = "100%";
      img.style.height = "100%";
      slotB.appendChild(img);
    }
  },

  placeItemInTradeSlot(slotIndex) {
    if (
      !this.isTradeWindowOpen ||
      selectedSlot === null ||
      !inventory[selectedSlot]
    )
      return;

    const item = inventory[selectedSlot];
    if (item.type === "balyary") return; // Запрещаем торговать балярами

    const mySlot = myId === this.tradeState.initiatorId ? "playerA" : "playerB";
    this.tradeSlots[mySlot] = { type: item.type, itemId: item.itemId };

    sendWhenReady(
      ws,
      JSON.stringify({
        type: "placeTradeItem",
        playerId: myId,
        slotIndex: selectedSlot,
        item: this.tradeSlots[mySlot],
      })
    );

    this.updateTradeSlots();
    this.updateInventoryButtons(true);
  },

  updateInventoryButtons(isTradeMode) {
    const useBtn = document.getElementById("useBtn");
    const dropBtn = document.getElementById("dropBtn");

    if (isTradeMode) {
      useBtn.textContent = "Обмен";
      dropBtn.textContent = "Отмена";
      useBtn.onclick = () => this.confirmTrade();
      dropBtn.onclick = () => this.cancelTradeItem();
    } else {
      useBtn.textContent = "Использовать";
      dropBtn.textContent = "Выкинуть";
      useBtn.onclick = () => useItem(selectedSlot);
      dropBtn.onclick = () => dropItem(selectedSlot);
    }
  },

  confirmTrade() {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "confirmTrade",
          playerId: myId,
        })
      );
    }
  },

  cancelTradeItem() {
    const mySlot = myId === this.tradeState.initiatorId ? "playerA" : "playerB";
    this.tradeSlots[mySlot] = null;

    sendWhenReady(
      ws,
      JSON.stringify({
        type: "cancelTradeItem",
        playerId: myId,
      })
    );

    this.updateTradeSlots();
    this.updateInventoryButtons(false);
  },

  resetTrade() {
    this.tradeState = null;
    this.selectedPlayerId = null;
    this.isTradeWindowOpen = false;
    this.tradeSlots = { playerA: null, playerB: null };
    this.hideTradeDialog();
    this.closeTradeWindow();
    this.updateInventoryButtons(false);
    document.getElementById("tradeBtn").disabled = true;
    document.getElementById("tradeBtn").classList.remove("active");
  },

  handleTradeMessage(data) {
    switch (data.type) {
      case "tradeRequest":
        this.tradeState = { initiatorId: data.initiatorId, targetId: myId };
        this.showTradeDialog(data.initiatorId);
        break;
      case "tradeAccepted":
        if (myId === data.initiatorId) {
          this.tradeState = "accepted";
          this.openTradeWindow();
        }
        break;
      case "tradeCancelled":
        this.resetTrade();
        break;
      case "tradeItemPlaced":
        this.tradeSlots[data.slot] = data.item;
        this.updateTradeSlots();
        if (data.playerId !== myId) {
          this.updateInventoryButtons(true);
        }
        break;
      case "tradeItemCancelled":
        this.tradeSlots[data.slot] = null;
        this.updateTradeSlots();
        if (data.playerId !== myId) {
          this.updateInventoryButtons(false);
        }
        break;
      case "tradeCompleted":
        inventory = data.inventory;
        this.resetTrade();
        updateInventoryDisplay();
        break;
    }
  },
};

window.tradeSystem = tradeSystem;
