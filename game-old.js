const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScoreDisplay");
const timerEl = document.getElementById("timer");
const overlay = document.getElementById("overlay");
const statusText = document.getElementById("statusText");
const startButton = document.getElementById("startButton");
const rewardSection = document.getElementById("rewardSection");
const colorButtons = document.querySelectorAll(".color-btn");

const GAME_DURATION = 120; // seconds
const FIRE_RATE = 0.25; 

// --- CHANGED: INCREASED SPEED BY 10% ---
const BIRD_TYPES = [
  { name: "small", w: 34, h: 34, speed: 154, color: "#D90429", points: 2 }, // 140 -> 154
  { name: "medium", w: 52, h: 52, speed: 121, color: "#F4D03F", points: 5 }, // 110 -> 121
  { name: "large", w: 74, h: 74, speed: 88, color: "#2E2E2E", points: 10 }   // 80 -> 88
];

const keys = { left: false, right: false, space: false };

let bullets = [];
let birds = [];
let score = 0;
let highScore = 0; 
let bulletColor = "#FFFBEB"; 
let timeRemaining = GAME_DURATION;
let running = false;
let fireCooldown = 0;
let spawnTimer = 0;
let nextSpawn = 1.0;
let lastTime = performance.now();

const player = {
  x: 0,
  y: 0,
  radius: 30,
  speed: 320
};

// --- COLOR PICKER LOGIC ---
colorButtons.forEach(btn => {
  btn.addEventListener("click", (e) => {
    colorButtons.forEach(b => b.classList.remove("selected"));
    e.target.classList.add("selected");
    bulletColor = e.target.getAttribute("data-color");
  });
});

function resizeCanvas() {
  canvas.width = Math.min(window.innerWidth, 1200);
  canvas.height = Math.min(window.innerHeight, 720);
  player.y = canvas.height - 60;
  player.x = Math.min(Math.max(player.x, player.radius + 10), canvas.width - player.radius - 10);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function resetGame() {
  bullets = [];
  birds = [];
  score = 0;
  timeRemaining = GAME_DURATION;
  running = true;
  fireCooldown = 0;
  spawnTimer = 0;
  nextSpawn = 0.7;
  player.x = canvas.width / 2;
  updateHud();
  overlay.classList.remove("show");
  rewardSection.classList.add("hidden");
}

function endGame() {
  running = false;
  overlay.classList.add("show");
  
  if (score > highScore && score > 0) {
    highScore = score;
    statusText.textContent = `INCREDIBLE! New High Score: ${score}`;
    rewardSection.classList.remove("hidden");
    startButton.textContent = "Play Again With New Color";
  } else {
    statusText.textContent = `Time's up! Score: ${score}. Best: ${highScore}`;
    rewardSection.classList.add("hidden");
    startButton.textContent = "Try Again";
  }
  updateHud();
}

function handleInput(delta) {
  let dir = 0;
  if (keys.left) dir -= 1;
  if (keys.right) dir += 1;
  player.x += dir * player.speed * delta;
  player.x = Math.min(Math.max(player.x, player.radius + 10), canvas.width - player.radius - 10);
}

function shoot() {
  const bullet = {
    x: player.x,
    y: player.y - player.radius,
    vy: -572, // --- CHANGED: INCREASED BULLET SPEED (was -520) ---
    r: 8,
    color: bulletColor
  };
  bullets.push(bullet);
}

function spawnBird() {
  const type = BIRD_TYPES[Math.floor(Math.random() * BIRD_TYPES.length)];
  const fromLeft = Math.random() < 0.5;
  const margin = 50;
  const x = fromLeft ? -type.w - margin : canvas.width + margin;
  const y = 40 + Math.random() * canvas.height * 0.35;
  const vx = (fromLeft ? 1 : -1) * (type.speed + Math.random() * 25);
  birds.push({ x, y, r: type.w / 2, vx, color: type.color, points: type.points });
}

function updateEntities(delta) {
  bullets.forEach(b => {
    b.y += b.vy * delta;
  });
  bullets = bullets.filter(b => b.y + b.r > 0);

  birds.forEach(b => {
    b.x += b.vx * delta;
  });
  birds = birds.filter(b => b.x + b.r > -100 && b.x - b.r < canvas.width + 100);
}

function checkCollisions() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    for (let j = birds.length - 1; j >= 0; j--) {
      const bird = birds[j];
      const dx = bullet.x - bird.x;
      const dy = bullet.y - bird.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < bullet.r + bird.r) {
        bullets.splice(i, 1);
        birds.splice(j, 1);
        score += bird.points;
        updateHud();
        break;
      }
    }
  }
}

function updateHud() {
  scoreEl.textContent = score;
  highScoreEl.textContent = highScore;
  const t = Math.max(0, Math.floor(timeRemaining));
  const min = String(Math.floor(t / 60)).padStart(2, "0");
  const sec = String(t % 60).padStart(2, "0");
  timerEl.textContent = `${min}:${sec}`;
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(1, "#E0F7FA");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#4ADE80";
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
  ctx.strokeStyle = "#22c55e";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 40);
  ctx.lineTo(canvas.width, canvas.height - 40);
  ctx.stroke();
}

function drawPig() {
  const x = player.x;
  const y = player.y;
  const r = player.radius;

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = "#74C365"; 
  ctx.fill();
  ctx.strokeStyle = "#407A38";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y + r/5, r/2.2, r/3, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#5DA850";
  ctx.fill();
  
  ctx.fillStyle = "#2F5C28";
  ctx.beginPath(); ctx.arc(x - r/5, y + r/5, r/8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r/5, y + r/5, r/8, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath(); ctx.arc(x - r/2.5, y - r/3, r/3.5, 0, Math.PI * 2); ctx.fill(); 
  ctx.beginPath(); ctx.arc(x + r/2.5, y - r/3, r/3.5, 0, Math.PI * 2); ctx.fill(); 
  
  ctx.fillStyle = "black";
  ctx.beginPath(); ctx.arc(x - r/2.5, y - r/3, r/8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r/2.5, y - r/3, r/8, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = "#74C365";
  ctx.beginPath(); ctx.arc(x - r*0.8, y - r*0.5, r/4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r*0.8, y - r*0.5, r/4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBullets() {
  ctx.strokeStyle = "#9ca3af"; 
  ctx.lineWidth = 1;

  bullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r, b.r * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function drawBirds() {
  birds.forEach(bird => {
    const x = bird.x;
    const y = bird.y;
    const r = bird.r;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(0, r/2, r/2, 0, Math.PI * 2);
    ctx.fill();

    const eyeOffset = r / 3;
    const eyeSize = r / 3.5;
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(-eyeOffset/2, -eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffset/2, -eyeOffset, eyeSize, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(-eyeOffset/2, -eyeOffset, eyeSize/3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(eyeOffset/2, -eyeOffset, eyeSize/3, 0, Math.PI * 2); ctx.fill();

    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(-r/1.2, -r/1.8);
    ctx.lineTo(0, -r/3);
    ctx.lineTo(r/1.2, -r/1.8);
    ctx.stroke();

    ctx.fillStyle = "#F59E0B"; 
    ctx.beginPath();
    ctx.moveTo(0, -r/10);
    ctx.lineTo(r/2, r/4);
    ctx.lineTo(0, r/2);
    ctx.fill();
    ctx.restore();
  });
}

function update(delta) {
  if (!running) return;

  timeRemaining -= delta;
  if (timeRemaining <= 0) {
    timeRemaining = 0;
    updateHud();
    endGame();
    return;
  }

  handleInput(delta);

  fireCooldown -= delta;
  if (keys.space && fireCooldown <= 0) {
    shoot();
    fireCooldown = FIRE_RATE;
  }

  spawnTimer += delta;
  if (spawnTimer >= nextSpawn) {
    spawnBird();
    spawnTimer = 0;
    nextSpawn = 0.5 + Math.random() * 0.9;
  }

  updateEntities(delta);
  checkCollisions();
  updateHud();
}

function draw() {
  drawBackground();
  drawBullets();
  drawBirds();
  drawPig();
}

function gameLoop(now) {
  const delta = (now - lastTime) / 1000;
  lastTime = now;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", () => {
  statusText.textContent = "Defend against the invasion!";
  resetGame();
});

window.addEventListener("keydown", e => {
  if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
  if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  if (e.code === "Space") {
    keys.space = true;
    e.preventDefault();
  }
  if (e.key === "r" || e.key === "R") {
    resetGame();
  }
});

window.addEventListener("keyup", e => {
  if (e.code === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
  if (e.code === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  if (e.code === "Space") keys.space = false;
});

requestAnimationFrame(gameLoop);
updateHud();
statusText.textContent = "Defend against the invasion!";