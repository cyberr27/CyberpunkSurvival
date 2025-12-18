// renderSystem.js
// Модуль отрисовки для Cyberpunk Survival

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let lastTime = 0;
let lastRender = 0;
const FPS = 10;
let atomFrame = 0;
let atomFrameTime = 0;
const ATOM_FRAMES = 40;
const ATOM_FRAME_DURATION = 180;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (window.playerSystem && window.playerSystem.getMyPlayer) {
    const me = window.playerSystem.getMyPlayer();
    if (me && window.movementSystem) {
      window.movementSystem.update(0);
    }
  }
}

function update(deltaTime) {
  atomFrameTime += deltaTime;
  while (atomFrameTime >= ATOM_FRAME_DURATION) {
    atomFrameTime -= ATOM_FRAME_DURATION;
    atomFrame = (atomFrame + 1) % ATOM_FRAMES;
  }
  if (window.movementSystem) window.movementSystem.update(deltaTime);
  if (window.combatSystem) window.combatSystem.update(deltaTime);
  if (window.enemySystem) window.enemySystem.update(deltaTime);
  if (window.neonNpcSystem) window.neonNpcSystem.update(deltaTime);
  if (window.vacuumRobotSystem) window.vacuumRobotSystem.update(deltaTime);
  if (window.cockroachSystem) window.cockroachSystem.update(deltaTime);
  if (window.droneSystem) window.droneSystem.update(deltaTime);
  if (window.bonfireSystem) window.bonfireSystem.update(deltaTime);
  if (window.clockSystem) window.clockSystem.update(deltaTime);
  if (window.corporateRobotSystem)
    window.corporateRobotSystem.update(deltaTime);
  if (window.robotDoctorSystem) window.robotDoctorSystem.update(deltaTime);
  if (window.outpostCaptainSystem)
    window.outpostCaptainSystem.update(deltaTime);
  if (
    window.worldSystem &&
    window.playerSystem &&
    window.playerSystem.getMyPlayer
  ) {
    const me = window.playerSystem.getMyPlayer();
    if (me) window.worldSystem.checkTransitionZones(me.x, me.y);
  }
  // Анимация предметов (атом)
  if (window.playerSystem && window.playerSystem.items) {
    const items = window.playerSystem.items;
    const currentWorldId = window.worldSystem?.currentWorldId;
    items.forEach((item) => {
      if (item.worldId !== currentWorldId) return;
      if (item.type === "atom") {
        if (item.frameTime === undefined) item.frameTime = 0;
        if (item.frame === undefined) item.frame = 0;
        item.frameTime += deltaTime;
        const frameDuration = 300;
        if (item.frameTime >= frameDuration) {
          item.frameTime -= frameDuration;
          item.frame = (item.frame + 1) % 40;
        }
      }
    });
  }
}

function draw(deltaTime) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 20, 40, 0.8)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ... Здесь должна быть вся логика draw из code.js ...
  // Для краткости, предполагаем, что drawPlayers, drawItems и т.д. вызываются из других систем
  // Например:
  if (window.playerSystem && window.playerSystem.drawPlayers) {
    window.playerSystem.drawPlayers(ctx, atomFrame);
  }
  // Аналогично для других draw-функций
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  if (timestamp - lastRender < 1000 / FPS) {
    requestAnimationFrame(gameLoop);
    return;
  }
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  lastRender = timestamp;
  update(deltaTime);
  draw(deltaTime);
  requestAnimationFrame(gameLoop);
}

window.renderSystem = {
  resizeCanvas,
  update,
  draw,
  gameLoop,
  getCanvas: () => canvas,
  getCtx: () => ctx,
};
