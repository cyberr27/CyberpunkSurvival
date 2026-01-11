// admin.js

let ws = null;
let selectedPlayerId = null;
let allPlayers = new Map(); // все полученные данные игроков
let onlinePlayers = new Set(); // только онлайн

const SERVER_URL = "ws://127.0.0.1:10000";

function connectAdmin() {
  const password = document.getElementById("adminPassword").value.trim();
  if (!password) {
    alert("Enter password!");
    return;
  }

  if (ws) ws.close();

  ws = new WebSocket(SERVER_URL);

  ws.onopen = () => {
    document.getElementById("connectionStatus").textContent = "Connected ✓";
    document.getElementById("connectionStatus").style.color = "#00ff00";

    // Отправляем авторизацию как админ
    ws.send(
      JSON.stringify({
        type: "adminAuth",
        password: password,
      })
    );
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "adminAuthSuccess":
        alert("Admin access granted!");
        loadItemTypes();
        requestPlayersList();
        setInterval(requestPlayersList, 5000); // автообновление каждые 5 сек
        break;

      case "adminAuthFailed":
        alert("Wrong admin password!");
        ws.close();
        break;

      case "playersList":
        updatePlayersList(data.players, data.onlineCount, data.totalCount);
        break;

      case "adminActionResult":
        console.log("Admin action result:", data);
        alert(data.message || "Action completed");
        if (data.success) {
          requestPlayersList(); // обновляем список
        }
        break;

      default:
        console.log("Unknown admin message:", data);
    }
  };

  ws.onclose = () => {
    document.getElementById("connectionStatus").textContent = "Disconnected";
    document.getElementById("connectionStatus").style.color = "#ff4444";
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
    alert("Connection error");
  };
}

function loadItemTypes() {
  const select = document.getElementById("itemTypeSelect");
  select.innerHTML = "";

  // Здесь можно захардкодить или запросить с сервера
  // Пока захардкодим популярные
  const popularItems = [
    "plasma_rifle",
    "cyber_helmet",
    "nano_armor",
    "atom",
    "balyary",
    "energy_drink",
    "blood_pack",
    "medical_certificate",
    "medical_certificate_stamped",
  ];

  popularItems.forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    select.appendChild(opt);
  });
}

function requestPlayersList() {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "adminGetPlayers" }));
  }
}

function updatePlayersList(playersArray, onlineCount, totalCount) {
  document.getElementById(
    "playersCount"
  ).textContent = `${onlineCount} / ${totalCount}`;

  const tbody = document.getElementById("playersTableBody");
  tbody.innerHTML = "";

  allPlayers.clear();
  onlinePlayers.clear();

  playersArray.forEach((p) => {
    allPlayers.set(p.id, p);
    if (p.online) onlinePlayers.add(p.id);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}${
      p.online ? ' <span class="status-online">(online)</span>' : ""
    }</td>
      <td>${p.worldId ?? "-"}</td>
      <td>${Math.round(p.x ?? 0)}, ${Math.round(p.y ?? 0)}</td>
      <td>${Math.round(p.health ?? 0)} / ${p.maxStats?.health ?? "?"}</td>
      <td>
        <button onclick="selectPlayer('${p.id}')">Select</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function selectPlayer(playerId) {
  selectedPlayerId = playerId;
  document.getElementById("selectedPlayer").textContent = playerId;
}

function giveItem() {
  if (!selectedPlayerId) return alert("Select player first!");
  const type = document.getElementById("itemTypeSelect").value;
  const amount = parseInt(document.getElementById("itemAmount").value) || 1;

  ws.send(
    JSON.stringify({
      type: "adminCommand",
      command: "giveItem",
      target: selectedPlayerId,
      itemType: type,
      amount: amount,
    })
  );
}

function teleportPlayer() {
  if (!selectedPlayerId) return alert("Select player first!");
  const x = parseFloat(document.getElementById("tpX").value);
  const y = parseFloat(document.getElementById("tpY").value);

  if (isNaN(x) || isNaN(y)) return alert("Enter correct coordinates!");

  ws.send(
    JSON.stringify({
      type: "adminCommand",
      command: "teleport",
      target: selectedPlayerId,
      x,
      y,
    })
  );
}

function addExperience() {
  if (!selectedPlayerId) return alert("Select player first!");
  const amount = parseInt(document.getElementById("addXpAmount").value) || 0;

  ws.send(
    JSON.stringify({
      type: "adminCommand",
      command: "addXp",
      target: selectedPlayerId,
      amount,
    })
  );
}

function kickPlayer() {
  if (!selectedPlayerId) return alert("Select player first!");
  if (!confirm(`Kick player ${selectedPlayerId}?`)) return;

  ws.send(
    JSON.stringify({
      type: "adminCommand",
      command: "kick",
      target: selectedPlayerId,
    })
  );
}
