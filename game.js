const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const screenEl = document.querySelector(".screen");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const lengthEl = document.getElementById("length");
const levelEl = document.getElementById("level");
const comboEl = document.getElementById("combo");
const foodCountEl = document.getElementById("foodCount");
const bonusStateEl = document.getElementById("bonusState");
const speedLabelEl = document.getElementById("speedLabel");
const statusText = document.getElementById("statusText");
const statusDot = document.getElementById("statusDot");
const overlay = document.getElementById("overlay");
const overlayBadge = document.getElementById("overlayBadge");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const overlayButton = document.getElementById("overlayButton");
const countdownEl = document.getElementById("countdown");
const toastEl = document.getElementById("toast");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const obstaclesToggle = document.getElementById("obstaclesToggle");
const wrapToggle = document.getElementById("wrapToggle");
const soundToggle = document.getElementById("soundToggle");
const speedButtons = [...document.querySelectorAll("[data-speed]")];
const touchButtons = [...document.querySelectorAll("[data-dir]")];

const text = {
  idle: "\u5f85\u673a\u4e2d",
  readyTitle: "\u51c6\u5907\u5f00\u59cb",
  readyText: "\u6309\u5f00\u59cb\uff0c\u6216\u7528\u5b57\u6bcd\u952e / \u65b9\u5411\u952e\u76f4\u63a5\u542f\u52a8\u3002",
  start: "\u5f00\u59cb\u6e38\u620f",
  running: "\u6e38\u620f\u8fdb\u884c\u4e2d",
  paused: "\u5df2\u6682\u505c",
  pausedText: "\u8c03\u6574\u89c4\u5219\u540e\u53ef\u7ee7\u7eed\u3002",
  resume: "\u7ee7\u7eed",
  gameover: "\u6e38\u620f\u7ed3\u675f",
  again: "\u518d\u6765\u4e00\u5c40",
  bonusNone: "\u672a\u51fa\u73b0",
  bonusActive: "\u5df2\u51fa\u73b0",
  insertCoin: "\u6295\u5e01\u5f00\u59cb",
  pausedBadge: "\u6682\u505c\u4e2d",
  runEnded: "\u672c\u5c40\u7ed3\u675f",
  go: "\u51fa\u53d1",
  bonus: "\u5956\u52b1",
  cruise: "\u5de1\u822a",
  standard: "\u6807\u51c6",
  storm: "\u72c2\u98d9"
};

const gridSize = 24;
const cellSize = canvas.width / gridSize;
const speedMap = {
  easy: { label: text.cruise, delay: 145, points: 10 },
  normal: { label: text.standard, delay: 105, points: 15 },
  hard: { label: text.storm, delay: 72, points: 25 }
};

let selectedSpeed = "easy";
let snake;
let direction;
let nextDirection;
let food;
let bonusFood;
let obstacles;
let particles;
let score;
let foodCount;
let combo;
let level;
let gameState;
let moveTimer;
let bonusTimer;
let toastTimer;
let bestScore = readBestScore();
let audioContext;

function readBestScore() {
  try {
    return Number(localStorage.getItem("snake-best-score") || 0);
  } catch (error) {
    return 0;
  }
}

function createInitialState() {
  snake = [
    { x: 11, y: 12 },
    { x: 10, y: 12 },
    { x: 9, y: 12 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  foodCount = 0;
  combo = 1;
  level = 1;
  particles = [];
  obstacles = obstaclesToggle.checked ? createObstacles() : [];
  food = createFood();
  bonusFood = null;
  bonusTimer = 0;
  gameState = "ready";
  updateStatus(text.idle, "idle");
  updateStats();
  draw();
}

function createObstacles() {
  const blocks = [];
  const patterns = [
    [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 18, y: 19 }, { x: 19, y: 19 }],
    [{ x: 4, y: 19 }, { x: 5, y: 19 }, { x: 18, y: 4 }, { x: 19, y: 4 }],
    [{ x: 11, y: 7 }, { x: 12, y: 7 }, { x: 11, y: 16 }, { x: 12, y: 16 }],
    [{ x: 7, y: 11 }, { x: 7, y: 12 }, { x: 16, y: 11 }, { x: 16, y: 12 }]
  ];
  patterns.forEach((group) => blocks.push(...group));
  return blocks;
}

function createFood(extraOccupied = []) {
  const occupied = [...snake, ...obstacles, ...extraOccupied];
  if (bonusFood) occupied.push(bonusFood);

  let candidate;
  do {
    candidate = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize)
    };
  } while (occupied.some((cell) => sameCell(cell, candidate)));
  return candidate;
}

function startGame() {
  if (gameState === "running" || gameState === "countdown") return;
  if (gameState === "gameover") createInitialState();
  hideOverlay();
  runCountdown();
}

function runCountdown() {
  gameState = "countdown";
  updateStatus("3", "idle");
  let count = 3;
  countdownEl.textContent = count;
  countdownEl.classList.remove("hidden");

  const tick = () => {
    count -= 1;
    if (count > 0) {
      countdownEl.textContent = count;
      updateStatus(String(count), "idle");
      setTimeout(tick, 520);
      return;
    }
    countdownEl.textContent = text.go;
    setTimeout(() => {
      countdownEl.classList.add("hidden");
      gameState = "running";
      updateStatus(text.running, "running");
      scheduleMove();
    }, 420);
  };
  setTimeout(tick, 520);
}

function pauseGame() {
  if (gameState === "running") {
    clearTimeout(moveTimer);
    gameState = "paused";
    updateStatus(text.paused, "idle");
    showOverlay(text.pausedBadge, text.paused, text.pausedText, text.resume);
    return;
  }
  if (gameState === "paused") startGame();
}

function restartGame() {
  clearTimeout(moveTimer);
  createInitialState();
  showOverlay(text.insertCoin, text.readyTitle, text.readyText, text.start);
}

function scheduleMove() {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    step();
    if (gameState === "running") scheduleMove();
  }, Math.max(48, speedMap[selectedSpeed].delay - (level - 1) * 5));
}

function step() {
  direction = nextDirection;
  let head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  if (wrapToggle.checked) {
    head = {
      x: (head.x + gridSize) % gridSize,
      y: (head.y + gridSize) % gridSize
    };
  }

  const willEat = sameCell(head, food) || (bonusFood && sameCell(head, bonusFood));
  if (isWallHit(head) || isSelfHit(head, willEat) || isObstacleHit(head)) {
    endGame();
    return;
  }

  snake.unshift(head);
  let ate = false;

  if (sameCell(head, food)) {
    ate = true;
    foodCount += 1;
    level = Math.floor(foodCount / 6) + 1;
    const gained = speedMap[selectedSpeed].points * combo;
    score += gained;
    combo = Math.min(combo + 1, 9);
    showToast(`+${gained}`);
    playTone(520 + combo * 36, 0.07);
    burst(head, "#ff4f5e");
    food = createFood();
    if (foodCount % 5 === 0) spawnBonusFood();
  } else {
    combo = Math.max(1, combo - 0.025);
  }

  if (bonusFood && sameCell(head, bonusFood)) {
    ate = true;
    const gained = speedMap[selectedSpeed].points * 5 + level * 10;
    score += gained;
    combo = Math.min(combo + 2, 12);
    bonusFood = null;
    bonusTimer = 0;
    showToast(`${text.bonus} +${gained}`);
    playTone(860, 0.14);
    burst(head, "#ffc247");
  }

  if (!ate) snake.pop();

  if (bonusFood) {
    bonusTimer -= 1;
    if (bonusTimer <= 0) bonusFood = null;
  }

  updateBestScore();
  updateStats();
  draw();
}

function setDirection(newDirection) {
  if (newDirection.x + direction.x === 0 && newDirection.y + direction.y === 0) return;
  nextDirection = newDirection;
  if (gameState === "ready") startGame();
}

function spawnBonusFood() {
  const oldFood = food;
  food = null;
  bonusFood = createFood([oldFood]);
  food = oldFood;
  bonusTimer = 60;
}

function endGame() {
  clearTimeout(moveTimer);
  gameState = "gameover";
  playTone(150, 0.25);
  updateBestScore();
  draw();
  updateStatus(text.gameover, "danger");
  showOverlay(
    text.runEnded,
    text.gameover,
    `\u672c\u5c40\u5f97\u5206 ${score}\uff0c\u5403\u5230 ${foodCount} \u4e2a\u98df\u7269\u3002`,
    text.again
  );
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawObstacles();
  drawFood(food, "#ff4f5e");
  if (bonusFood) drawFood(bonusFood, "#ffc247", Math.max(0.25, bonusTimer / 60), true);
  drawSnake();
  drawParticles();
  drawVignette();
}

function drawBoard() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#07120c");
  gradient.addColorStop(0.55, "#0c170f");
  gradient.addColorStop(1, "#081018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(101,240,139,0.08)";
  ctx.lineWidth = 1;
  for (let i = 1; i < gridSize; i += 1) {
    const pos = i * cellSize;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,194,71,0.2)";
  ctx.lineWidth = 5;
  ctx.strokeRect(2.5, 2.5, canvas.width - 5, canvas.height - 5);
}

function drawSnake() {
  snake.forEach((part, index) => {
    const inset = index === 0 ? 3 : 5;
    const x = part.x * cellSize + inset;
    const y = part.y * cellSize + inset;
    const size = cellSize - inset * 2;
    const hue = index === 0 ? "#9cffb2" : index % 2 ? "#48df7f" : "#2bbf68";
    ctx.shadowColor = index === 0 ? "rgba(101,240,139,0.85)" : "rgba(101,240,139,0.24)";
    ctx.shadowBlur = index === 0 ? 18 : 7;
    ctx.fillStyle = hue;
    roundRect(x, y, size, size, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(5,18,10,0.42)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (index === 0) drawEyes(part);
  });
}

function drawEyes(part) {
  ctx.fillStyle = "#06120a";
  const left = part.x * cellSize;
  const top = part.y * cellSize;
  const eyeA = {
    x: left + (direction.x < 0 ? 9 : direction.x > 0 ? 21 : 10),
    y: top + (direction.y < 0 ? 9 : direction.y > 0 ? 21 : 10)
  };
  const eyeB = {
    x: left + (direction.x === 0 ? 20 : eyeA.x - left),
    y: top + (direction.y === 0 ? 20 : eyeA.y - top)
  };
  ctx.beginPath();
  ctx.arc(eyeA.x, eyeA.y, 3.2, 0, Math.PI * 2);
  ctx.arc(eyeB.x, eyeB.y, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood(item, color, alpha = 1, bonus = false) {
  if (!item) return;
  const centerX = item.x * cellSize + cellSize / 2;
  const centerY = item.y * cellSize + cellSize / 2;
  const radius = bonus ? cellSize * 0.38 : cellSize * 0.31;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = bonus ? 24 : 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.beginPath();
  ctx.arc(centerX - 5, centerY - 6, radius * 0.34, 0, Math.PI * 2);
  ctx.fill();
  if (bonus) {
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 7, 0, Math.PI * 2 * alpha);
    ctx.stroke();
  }
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach((block) => {
    const x = block.x * cellSize + 4;
    const y = block.y * cellSize + 4;
    const size = cellSize - 8;
    ctx.fillStyle = "#465047";
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    roundRect(x, y, size, size, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,79,94,0.24)";
    ctx.beginPath();
    ctx.moveTo(x + 5, y + size - 5);
    ctx.lineTo(x + size - 5, y + 5);
    ctx.stroke();
  });
}

function burst(cell, color) {
  for (let i = 0; i < 18; i += 1) {
    particles.push({
      x: cell.x * cellSize + cellSize / 2,
      y: cell.y * cellSize + cellSize / 2,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      life: 18,
      color
    });
  }
}

function drawParticles() {
  particles = particles.filter((particle) => particle.life > 0);
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
    ctx.globalAlpha = particle.life / 18;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawVignette() {
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.2,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.72
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.34)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function sameCell(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

function isWallHit(cell) {
  return cell.x < 0 || cell.x >= gridSize || cell.y < 0 || cell.y >= gridSize;
}

function isSelfHit(cell, willEat) {
  const body = willEat ? snake : snake.slice(0, -1);
  return body.some((part) => sameCell(part, cell));
}

function isObstacleHit(cell) {
  return obstacles.some((block) => sameCell(block, cell));
}

function updateBestScore() {
  if (score > bestScore) {
    bestScore = score;
    try {
      localStorage.setItem("snake-best-score", String(bestScore));
    } catch (error) {
      // Storage can be blocked in some local-file or privacy modes.
    }
  }
}

function updateStats() {
  scoreEl.textContent = score;
  bestScoreEl.textContent = bestScore;
  lengthEl.textContent = snake.length;
  levelEl.textContent = level;
  comboEl.textContent = `${Math.max(1, Math.floor(combo))}\u500d`;
  foodCountEl.textContent = foodCount;
  bonusStateEl.textContent = bonusFood ? text.bonusActive : text.bonusNone;
  speedLabelEl.textContent = speedMap[selectedSpeed].label;
  screenEl.classList.toggle("danger", gameState === "gameover");
}

function updateStatus(label, mode) {
  statusText.textContent = label;
  statusDot.className = "dot";
  if (mode === "running") statusDot.classList.add("running");
  if (mode === "danger") statusDot.classList.add("danger");
}

function showOverlay(badge, title, message, buttonText) {
  overlayBadge.textContent = badge;
  overlayTitle.textContent = title;
  overlayText.textContent = message;
  overlayButton.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 880);
}

function playTone(frequency, duration) {
  if (!soundToggle.checked) return;
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  audioContext = audioContext || new AudioCtor();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  oscillator.type = "square";
  gain.gain.setValueAtTime(0.035, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    W: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    S: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    A: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
    D: { x: 1, y: 0 }
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    setDirection(keyMap[event.key]);
  } else if (event.key === " ") {
    event.preventDefault();
    pauseGame();
  } else if (event.key === "Enter") {
    event.preventDefault();
    if (gameState !== "running") startGame();
  }
});

startBtn.addEventListener("click", startGame);
pauseBtn.addEventListener("click", pauseGame);
restartBtn.addEventListener("click", restartGame);
overlayButton.addEventListener("click", startGame);

speedButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedSpeed = button.dataset.speed;
    speedButtons.forEach((item) => item.classList.toggle("active", item === button));
    updateStats();
    if (gameState === "running") scheduleMove();
  });
});

[obstaclesToggle, wrapToggle].forEach((toggle) => {
  toggle.addEventListener("change", () => {
    if (gameState === "ready" || gameState === "gameover") {
      createInitialState();
      showOverlay(text.insertCoin, text.readyTitle, text.readyText, text.start);
    }
  });
});

touchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const directions = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    setDirection(directions[button.dataset.dir]);
  });
});

let startTouch = null;
canvas.addEventListener("touchstart", (event) => {
  startTouch = event.touches[0];
}, { passive: true });

canvas.addEventListener("touchend", (event) => {
  if (!startTouch || !event.changedTouches[0]) return;
  const endTouch = event.changedTouches[0];
  const dx = endTouch.clientX - startTouch.clientX;
  const dy = endTouch.clientY - startTouch.clientY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 });
  } else {
    setDirection(dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 });
  }
  startTouch = null;
}, { passive: true });

createInitialState();
showOverlay(text.insertCoin, text.readyTitle, text.readyText, text.start);
