const bird = document.getElementById("bird");
const pipesContainer = document.getElementById("pipes");
const scoreDisplay = document.getElementById("score");
const bestDisplay = document.getElementById("best");
const restartBtn = document.getElementById("restartBtn");
const gameContainer = document.getElementById("gameContainer");
const ground = document.getElementById("ground");

let birdTop = 250;
let birdVelocity = 0;
const gravity = 0.22; // slower fall
const jumpStrength = -5; // reduce jump height per flap
const maxFallSpeed = 4; // cap descent speed further

let pipes = [];
const pipeSpeed = 2;
const pipeGap = 150;
const pipeInterval = 2000;
let lastPipeTime = 0;

let score = 0;
let bestScore = localStorage.getItem("bestScore") || 0;
bestDisplay.textContent = "Best: " + bestScore;

let gameOver = false;
let gameLoopId;

function flap() {
  if (!gameOver) birdVelocity = jumpStrength;
}

function spawnPipe() {
  const containerHeight = gameContainer.clientHeight;
  const minPipeHeight = 50;
  const gapStart = Math.floor(
    Math.random() * (containerHeight - pipeGap - minPipeHeight * 2)
  ) + minPipeHeight;

  const topPipe = document.createElement("div");
  topPipe.classList.add("pipe", "top");
  topPipe.style.height = gapStart + "px";
  topPipe.style.left = "400px";

  const bottomPipe = document.createElement("div");
  bottomPipe.classList.add("pipe", "bottom");
  bottomPipe.style.height = containerHeight - gapStart - pipeGap + "px";
  bottomPipe.style.left = "400px";

  pipesContainer.appendChild(topPipe);
  pipesContainer.appendChild(bottomPipe);

  pipes.push({ top: topPipe, bottom: bottomPipe, passed: false });
}

function updatePipes() {
  pipes.forEach((pipeObj) => {
    let left = parseInt(pipeObj.top.style.left);
    left -= pipeSpeed;
    pipeObj.top.style.left = left + "px";
    pipeObj.bottom.style.left = left + "px";

    if (left + 60 < 0) {
      pipeObj.top.remove();
      pipeObj.bottom.remove();
    }
  });
  pipes = pipes.filter((p) => p.top.isConnected);
}

function checkCollision() {
  const birdRect = bird.getBoundingClientRect();
  const containerRect = gameContainer.getBoundingClientRect();
  const groundHeight = ground.offsetHeight;

  if (birdTop <= 0 || birdTop + bird.offsetHeight >= containerRect.height - groundHeight) {
    endGame();
  }

  pipes.forEach((pipeObj) => {
    const topRect = pipeObj.top.getBoundingClientRect();
    const bottomRect = pipeObj.bottom.getBoundingClientRect();

    if (
      (birdRect.left < topRect.right &&
        birdRect.right > topRect.left &&
        birdRect.top < topRect.bottom) ||
      (birdRect.left < bottomRect.right &&
        birdRect.right > bottomRect.left &&
        birdRect.bottom > bottomRect.top)
    ) {
      endGame();
    }

    if (!pipeObj.passed && birdRect.left > topRect.right) {
      score++;
      scoreDisplay.textContent = score;
      pipeObj.passed = true;
      if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
        bestDisplay.textContent = "Best: " + bestScore;
      }
    }
  });
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(gameLoopId);
  restartBtn.style.display = "block";
}

function resetGame() {
  pipes.forEach((pipeObj) => {
    pipeObj.top.remove();
    pipeObj.bottom.remove();
  });
  pipes = [];

  birdTop = 250;
  birdVelocity = 0;
  bird.style.top = birdTop + "px";
  score = 0;
  scoreDisplay.textContent = score;

  gameOver = false;
  restartBtn.style.display = "none";
  lastPipeTime = 0;

  gameLoopId = requestAnimationFrame(gameLoop);
}

function gameLoop(timestamp) {
  birdVelocity += gravity;
  birdVelocity = Math.min(birdVelocity, maxFallSpeed);
  birdTop += birdVelocity;
  bird.style.top = birdTop + "px";

  // Tilt bird based on velocity
  const maxDownAngle = 70;
  const maxUpAngle = -30;
  const rotation = Math.max(Math.min(birdVelocity * 4, maxDownAngle), maxUpAngle);
  bird.style.transform = "rotate(" + rotation + "deg)";

  if (timestamp - lastPipeTime > pipeInterval) {
    spawnPipe();
    lastPipeTime = timestamp;
  }

  updatePipes();
  checkCollision();

  if (!gameOver) gameLoopId = requestAnimationFrame(gameLoop);
}

restartBtn.addEventListener("click", resetGame);
document.addEventListener("keydown", flap);
document.addEventListener("mousedown", flap);

resetGame();
