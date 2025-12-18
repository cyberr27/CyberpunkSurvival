// playerSystem.js
// Модуль игроков для Cyberpunk Survival

let players = new Map();
let myId = null;
let items = new Map();

function getMyPlayer() {
  return players.get(myId);
}

function setMyId(id) {
  myId = id;
}

function setPlayers(newPlayers) {
  players = newPlayers;
}

function drawPlayers(ctx, atomFrame) {
  // ...реализация drawPlayers из code.js...
}

window.playerSystem = {
  players,
  myId,
  items,
  getMyPlayer,
  setMyId,
  setPlayers,
  drawPlayers,
};
