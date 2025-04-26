const tradeSystem = {
  selectedPlayer: null,
  tradeState: null, // null, 'pending', 'accepted'
  tradeWindow: null,
  playerATradeSlot: null,
  playerBTradeSlot: null,
  playerAConfirmed: false,
  playerBConfirmed: false,

  initialize() {
    this.createTradeButton();
    this.addCanvasClickHandler();
  },

  createTradeButton() {
    const tradeBtn = document.createElement("button");
    tradeBtn.id = "tradeBtn";
    tradeBtn.className = "cyber-btn";
    tradeBtn.textContent = "Торг";
    tradeBtn.disabled = true;
    tradeBtn.style.position = "fixed";
    tradeBtn.style.bottom = "20px";
    tradeBtn.style.right = "140px";
    tradeBtn.style.width = "60px";
    tradeBtn.style.height = "60px";
    document.getElementById("gameContainer").appendChild(tradeBtn);

    tradeBtn.addEventListener("click", () => {
      if (this.selectedPlayer && !this.tradeState) {
        this.sendTradeOffer();
      }
    });
  },

  addCanvasClickHandler() {
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        const me = players.get(myId);
        if (!me || me.health <= 0) return;
        if (isInventoryOpen) return;

        const camera = window.movementSystem.getCamera();
        const clickX = e.clientX + camera.x;
        const clickY = e.clientY + camera.y;

        let closestPlayer = null;
        let minDistance = 1000;

        players.forEach((player, id) => {
          if (id === myId) return;
          const dx = player.x - clickX;
          const dy = player.y - clickY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minDistance && distance < 1000) {
            minDistance = distance;
            closestPlayer = id;
          }
        });

        if (closestPlayer) {
          this.selectPlayer(closestPlayer);
        } else {
          this.deselectPlayer();
        }
      }
    });

    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const me = players.get(myId);
      if (!me || me.health <= 0) return;
      if (isInventoryOpen) return;

      const touch = e.touches[0];
      const camera = window.movementSystem.getCamera();
      const clickX = touch.clientX + camera.x;
      const clickY = touch.clientY + camera.y;

      let closestPlayer = null;
      let minDistance = 1000;

      players.forEach((player, id) => {
        if (id === myId) return;
        const dx = player.x - clickX;
        const dy = player.y - clickY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < minDistance && distance < 1000) {
          minDistance = distance;
          closestPlayer = id;
        }
      });

      if (closestPlayer) {
        this.selectPlayer(closestPlayer);
      } else {
        this.deselectPlayer();
      }
    });
  },

  selectPlayer(playerId) {
    this.selectedPlayer = playerId;
    document.getElementById("tradeBtn").disabled = false;
    this.highlightPlayer(playerId);
  },

  deselectPlayer() {
    this.selectedPlayer = null;
    document.getElementById("tradeBtn").disabled = true;
    this.removeHighlight();
  },

  highlightPlayer(playerId) {
    this.removeHighlight();
    const style = document.createElement("style");
    style.id = "playerHighlight";
    style.textContent = `
        #gameCanvas::after {
          content: '';
          position: absolute;
          width: 50px;
          height: 50px;
          border: 2px solid #ff0066;
          border-radius: 50%;
          pointer-events: none;
          left: ${
            players.get(playerId).x - window.movementSystem.getCamera().x - 5
          }px;
          top: ${
            players.get(playerId).y - window.movementSystem.getCamera().y - 5
          }px;
        }
      `;
    document.head.appendChild(style);
  },

  removeHighlight() {
    const existingHighlight = document.getElementById("playerHighlight");
    if (existingHighlight) existingHighlight.remove();
  },

  sendTradeOffer() {
    if (ws.readyState === WebSocket.OPEN) {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeOffer",
          from: myId,
          to: this.selectedPlayer,
        })
      );
      this.tradeState = "pending";
      document.getElementById("tradeBtn").disabled = true;
    }
  },

  handleTradeMessage(data) {
    switch (data.type) {
      case "tradeOffer":
        if (data.to === myId) {
          this.showTradeDialog(data.from);
        }
        break;
      case "tradeAccept":
        if (data.to === myId) {
          this.tradeState = "accepted";
          this.openTradeWindow(data.from);
        }
        break;
      case "tradeCancel":
        if (data.from === this.selectedPlayer || data.to === myId) {
          this.resetTrade();
        }
        break;
      case "tradeItemPlaced":
        if (
          this.tradeState === "accepted" &&
          (data.from === myId || data.from === this.selectedPlayer)
        ) {
          if (data.from === myId) {
            this.playerATradeSlot = data.item;
          } else {
            this.playerBTradeSlot = data.item;
          }
          this.updateTradeWindow();
        }
        break;
      case "tradeConfirm":
        if (
          this.tradeState === "accepted" &&
          (data.from === myId || data.from === this.selectedPlayer)
        ) {
          if (data.from === myId) {
            this.playerAConfirmed = true;
          } else {
            this.playerBConfirmed = true;
          }
          this.updateTradeWindow();
          if (this.playerAConfirmed && this.playerBConfirmed) {
            this.completeTrade();
          }
        }
        break;
      case "tradeItemRemoved":
        if (
          this.tradeState === "accepted" &&
          (data.from === myId || data.from === this.selectedPlayer)
        ) {
          if (data.from === myId) {
            this.playerATradeSlot = null;
            this.playerAConfirmed = false;
          } else {
            this.playerBTradeSlot = null;
            this.playerBConfirmed = false;
          }
          this.updateTradeWindow();
        }
        break;
    }
  },

  showTradeDialog(fromId) {
    const dialog = document.createElement("div");
    dialog.id = "tradeDialog";
    dialog.style.position = "fixed";
    dialog.style.top = "50%";
    dialog.style.left = "50%";
    dialog.style.transform = "translate(-50%, -50%)";
    dialog.style.background = "#1a1a1a";
    dialog.style.border = "2px solid #00ccff";
    dialog.style.padding = "20px";
    dialog.style.color = "#00ccff";
    dialog.style.fontFamily = '"Orbitron", sans-serif';
    dialog.style.zIndex = "1000";
    dialog.innerHTML = `
        <p>Игрок ${fromId} предлагает торг?</p>
        <button id="tradeAcceptBtn" class="action-btn use-btn">Торг</button>
        <button id="tradeCancelBtn" class="action-btn drop-btn">Отмена</button>
      `;
    document.body.appendChild(dialog);

    document.getElementById("tradeAcceptBtn").addEventListener("click", () => {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeAccept",
          from: myId,
          to: fromId,
        })
      );
      this.tradeState = "accepted";
      this.selectedPlayer = fromId;
      this.openTradeWindow(fromId);
      dialog.remove();
    });

    document.getElementById("tradeCancelBtn").addEventListener("click", () => {
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeCancel",
          from: myId,
          to: fromId,
        })
      );
      dialog.remove();
    });
  },

  openTradeWindow(partnerId) {
    this.tradeWindow = document.createElement("div");
    this.tradeWindow.id = "tradeWindow";
    this.tradeWindow.style.position = "fixed";
    this.tradeWindow.style.top = "50%";
    this.tradeWindow.style.left = "50%";
    this.tradeWindow.style.transform = "translate(-50%, -50%)";
    this.tradeWindow.style.width = "600px";
    this.tradeWindow.style.background = "#1a1a1a";
    this.tradeWindow.style.border = "2px solid #00ccff";
    this.tradeWindow.style.padding = "20px";
    this.tradeWindow.style.color = "#00ccff";
    this.tradeWindow.style.fontFamily = '"Orbitron", sans-serif';
    this.tradeWindow.style.zIndex = "1000";
    this.tradeWindow.style.display = "grid";
    this.tradeWindow.style.gridTemplateRows = "auto auto 1fr auto";
    this.tradeWindow.style.gap = "10px";
    document.body.appendChild(this.tradeWindow);

    this.updateTradeWindow();
  },

  updateTradeWindow() {
    if (!this.tradeWindow) return;
    this.tradeWindow.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <div style="width: 48%;">
            <p>${myId}</p>
            <div id="playerASlot" class="inventory-slot" style="width: 100px; height: 100px; margin: 0 auto;">
              ${
                this.playerATradeSlot
                  ? `<img src="${
                      ITEM_CONFIG[this.playerATradeSlot.type].image.src
                    }" style="width: 100%; height: 100%;">`
                  : ""
              }
            </div>
          </div>
          <div style="width: 48%;">
            <p>${this.selectedPlayer}</p>
            <div id="playerBSlot" class="inventory-slot" style="width: 100px; height: 100px; margin: 0 auto;">
              ${
                this.playerBTradeSlot
                  ? `<img src="${
                      ITEM_CONFIG[this.playerBTradeSlot.type].image.src
                    }" style="width: 100%; height: 100%;">`
                  : ""
              }
            </div>
          </div>
        </div>
        <div id="tradeInfo" style="height: 100px; background: #0a0a0a; border: 2px solid #ff0066; color: #00ccff; display: flex; align-items: center; justify-content: center;">
          ${
            this.playerATradeSlot
              ? ITEM_CONFIG[this.playerATradeSlot.type].description
              : ""
          }<br>
          ${
            this.playerBTradeSlot
              ? ITEM_CONFIG[this.playerBTradeSlot.type].description
              : ""
          }
        </div>
        <div id="tradeInventory" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          ${inventory
            .map(
              (item, i) => `
            <div class="inventory-slot" data-slot="${i}" style="width: 50px; height: 50px;">
              ${
                item
                  ? `<img src="${
                      ITEM_CONFIG[item.type].image.src
                    }" style="width: 100%; height: 100%;">`
                  : ""
              }
              ${
                item && item.type === "balyary" && item.quantity > 1
                  ? `<div style="position: absolute; top: 0; right: 0; color: #00ffff; font-size: 14px;">${item.quantity}</div>`
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
        <div style="display: flex; justify-content: space-between;">
          <button id="tradeConfirmBtn" class="action-btn use-btn" ${
            this.playerATradeSlot ? "" : "disabled"
          }>Торг</button>
          <button id="tradeCancelBtn" class="action-btn drop-btn">Отмена</button>
        </div>
      `;

    const slots = this.tradeWindow.querySelectorAll(
      "#tradeInventory .inventory-slot"
    );
    slots.forEach((slot) => {
      slot.addEventListener("click", () => {
        const slotIndex = parseInt(slot.dataset.slot);
        if (inventory[slotIndex] && !this.playerATradeSlot) {
          this.placeItemInTradeSlot(slotIndex);
        }
      });
    });

    document.getElementById("tradeConfirmBtn").addEventListener("click", () => {
      if (this.playerATradeSlot) {
        sendWhenReady(
          ws,
          JSON.stringify({
            type: "tradeConfirm",
            from: myId,
            to: this.selectedPlayer,
          })
        );
      }
    });

    document.getElementById("tradeCancelBtn").addEventListener("click", () => {
      if (this.playerATradeSlot) {
        this.removeItemFromTradeSlot();
      } else {
        this.cancelTrade();
      }
    });
  },

  placeItemInTradeSlot(slotIndex) {
    const item = inventory[slotIndex];
    if (!item) return;
    this.playerATradeSlot = { ...item, slotIndex };
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeItemPlaced",
        from: myId,
        to: this.selectedPlayer,
        item: this.playerATradeSlot,
      })
    );
    this.updateTradeWindow();
  },

  removeItemFromTradeSlot() {
    if (this.playerATradeSlot) {
      this.playerATradeSlot = null;
      this.playerAConfirmed = false;
      sendWhenReady(
        ws,
        JSON.stringify({
          type: "tradeItemRemoved",
          from: myId,
          to: this.selectedPlayer,
        })
      );
      this.updateTradeWindow();
    }
  },

  cancelTrade() {
    sendWhenReady(
      ws,
      JSON.stringify({
        type: "tradeCancel",
        from: myId,
        to: this.selectedPlayer,
      })
    );
    this.resetTrade();
  },

  completeTrade() {
    const itemA = this.playerATradeSlot;
    const itemB = this.playerBTradeSlot;

    const myFreeSlot = inventory.findIndex((slot) => slot === null);
    if (itemB && myFreeSlot === -1) {
      this.cancelTrade();
      return;
    }

    if (itemA) {
      inventory[itemA.slotIndex] = null;
    }
    if (itemB) {
      inventory[myFreeSlot] = { ...itemB };
    }

    sendWhenReady(
      ws,
      JSON.stringify({
        type: "updateInventory",
        inventory,
      })
    );
    this.resetTrade();
    updateInventoryDisplay();
  },

  resetTrade() {
    this.selectedPlayer = null;
    this.tradeState = null;
    this.playerATradeSlot = null;
    this.playerBTradeSlot = null;
    this.playerAConfirmed = false;
    this.playerBConfirmed = false;
    if (this.tradeWindow) {
      this.tradeWindow.remove();
      this.tradeWindow = null;
    }
    document.getElementById("tradeBtn").disabled = true;
    this.removeHighlight();
    const dialog = document.getElementById("tradeDialog");
    if (dialog) dialog.remove();
  },
};

window.tradeSystem = tradeSystem;
