(function () {
    "use strict";

    /** @type {HTMLCanvasElement} */
    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("score");
    const restartBtn = document.getElementById("restart");

    // Virtual resolution for crisp drawing, canvas is fixed 400x600 in html
    const WIDTH = canvas.width; // 400
    const HEIGHT = canvas.height; // 600

    // Game state
    const GameState = {
        Ready: "ready",
        Playing: "playing",
        GameOver: "gameover",
    };
    let state = GameState.Ready;

    // Timing
    let lastTime = 0;
    const gravity = 1500; // px/s^2
    const flapVelocity = -420; // px/s up
    const maxFallSpeed = 900;

    // Bird
    const bird = {
        x: 100,
        y: HEIGHT / 2,
        radius: 16,
        vy: 0,
        rotation: 0,
    };

    // Pipes
    const pipes = [];
    const pipeWidth = 60;
    const pipeGap = 150; // vertical gap
    const pipeInterval = 1400; // ms
    const pipeSpeed = 180; // px/s to left
    let timeSinceLastPipe = 0;

    // Ground
    const groundHeight = 100;

    // Parallax sky
    const clouds = [
        { x: 50, y: 80, r: 18 },
        { x: 220, y: 60, r: 24 },
        { x: 360, y: 100, r: 20 },
    ];

    // Score
    let score = 0;
    let best = Number(localStorage.getItem("flappy_best") || 0);

    function resetGame() {
        state = GameState.Ready;
        bird.x = 100;
        bird.y = HEIGHT / 2;
        bird.vy = 0;
        bird.rotation = 0;
        pipes.length = 0;
        timeSinceLastPipe = 0;
        score = 0;
        updateScore();
        restartBtn.classList.add("hidden");
    }

    function startGame() {
        if (state !== GameState.Ready) return;
        state = GameState.Playing;
        bird.vy = flapVelocity; // initial flap
    }

    function gameOver() {
        state = GameState.GameOver;
        best = Math.max(best, score);
        localStorage.setItem("flappy_best", String(best));
        restartBtn.classList.remove("hidden");
    }

    function updateScore() {
        scoreEl.textContent = String(score);
        scoreEl.title = `Best: ${best}`;
    }

    function spawnPipe() {
        const marginTop = 40;
        const marginBottom = groundHeight + 40;
        const minCenter = marginTop + pipeGap / 2;
        const maxCenter = HEIGHT - marginBottom - pipeGap / 2;
        const center = randRange(minCenter, maxCenter);
        const topEnd = center - pipeGap / 2;
        const bottomStart = center + pipeGap / 2;
        const pipeX = WIDTH + 20;
        const pipeId = cryptoRandomId();

        pipes.push({ id: pipeId, x: pipeX, top: { y: 0, h: topEnd }, bottom: { y: bottomStart, h: HEIGHT - groundHeight - bottomStart }, passed: false });
    }

    function cryptoRandomId() {
        // Small fast ID; fallback if crypto not available
        try {
            const bytes = new Uint8Array(6);
            crypto.getRandomValues(bytes);
            return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
        } catch {
            return Math.random().toString(36).slice(2, 10);
        }
    }

    function randRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Input
    function onFlap() {
        if (state === GameState.Ready) {
            startGame();
            return;
        }
        if (state !== GameState.Playing) return;
        bird.vy = flapVelocity;
    }

    window.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
            e.preventDefault();
            onFlap();
        }
        if (e.code === "Enter" && state === GameState.GameOver) {
            resetGame();
        }
    });
    canvas.addEventListener("pointerdown", onFlap);
    restartBtn.addEventListener("click", resetGame);

    // Loop
    function update(dt) {
        if (state === GameState.Playing) {
            // Bird physics
            bird.vy += gravity * dt;
            if (bird.vy > maxFallSpeed) bird.vy = maxFallSpeed;
            bird.y += bird.vy * dt;
            bird.rotation = Math.atan2(bird.vy, 400);

            // Pipes
            timeSinceLastPipe += dt * 1000;
            if (timeSinceLastPipe >= pipeInterval) {
                timeSinceLastPipe = 0;
                spawnPipe();
            }
            for (let i = pipes.length - 1; i >= 0; i--) {
                const p = pipes[i];
                p.x -= pipeSpeed * dt;
                if (!p.passed && p.x + pipeWidth < bird.x - bird.radius) {
                    p.passed = true;
                    score += 1;
                    updateScore();
                }
                if (p.x + pipeWidth < -50) {
                    pipes.splice(i, 1);
                }
            }

            // Collisions with ground or ceiling
            if (bird.y - bird.radius < 0) {
                bird.y = bird.radius;
                bird.vy = 0;
            }
            if (bird.y + bird.radius > HEIGHT - groundHeight) {
                bird.y = HEIGHT - groundHeight - bird.radius;
                gameOver();
            }

            // Collisions with pipes
            for (const p of pipes) {
                if (circleRectOverlap(bird.x, bird.y, bird.radius, p.x, 0, pipeWidth, p.top.h)) {
                    gameOver();
                    break;
                }
                if (circleRectOverlap(bird.x, bird.y, bird.radius, p.x, p.bottom.y, pipeWidth, p.bottom.h)) {
                    gameOver();
                    break;
                }
            }
        }
    }

    function circleRectOverlap(cx, cy, cr, rx, ry, rw, rh) {
        const closestX = clamp(cx, rx, rx + rw);
        const closestY = clamp(cy, ry, ry + rh);
        const dx = cx - closestX;
        const dy = cy - closestY;
        return dx * dx + dy * dy <= cr * cr;
    }

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    function draw() {
        // Sky background
        drawSky();

        // Pipes
        for (const p of pipes) {
            drawPipe(p.x, 0, pipeWidth, p.top.h);
            drawPipe(p.x, p.bottom.y, pipeWidth, p.bottom.h);
        }

        // Ground
        drawGround();

        // Bird
        drawBird();

        // Overlay texts
        if (state === GameState.Ready) drawCenterText("Tap to start", HEIGHT * 0.32);
        if (state === GameState.GameOver) {
            drawCenterText("Game Over", HEIGHT * 0.30);
            drawCenterText(`Score ${score}`, HEIGHT * 0.40);
            drawCenterText(`Best ${best}`, HEIGHT * 0.48);
            drawCenterText("Press Enter or Restart", HEIGHT * 0.60, 14);
        }
    }

    function drawSky() {
        const skyTop = "#70c5ce";
        const skyBottom = "#bdeff6";
        const grad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
        grad.addColorStop(0, skyTop);
        grad.addColorStop(1, skyBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Clouds parallax
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        for (const c of clouds) {
            c.x -= 10 / 60; // slow drift
            if (c.x < -40) c.x = WIDTH + 40;
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
            ctx.arc(c.x + c.r * 0.9, c.y + 2, c.r * 1.2, 0, Math.PI * 2);
            ctx.arc(c.x - c.r * 0.8, c.y + 4, c.r * 1.1, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGround() {
        const y = HEIGHT - groundHeight;
        ctx.fillStyle = "#ded895";
        ctx.fillRect(0, y, WIDTH, groundHeight);
        // subtle pattern
        ctx.fillStyle = "#c0bb75";
        for (let x = 0; x < WIDTH; x += 20) {
            ctx.fillRect(x, y + 10, 10, 6);
        }
    }

    function drawPipe(x, y, w, h) {
        ctx.fillStyle = "#3cbc3c";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#2d9c2d";
        ctx.fillRect(x, y, w, 12);
        // Lip
        ctx.fillStyle = "#34a934";
        ctx.fillRect(x - 6, y + h - 12, w + 12, 16);
    }

    function drawBird() {
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(bird.rotation);
        // body
        ctx.fillStyle = "#ffd43b";
        ctx.beginPath();
        ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
        ctx.fill();
        // wing
        ctx.fillStyle = "#f4c430";
        ctx.beginPath();
        ctx.ellipse(-2, 2, 10, 6, -0.5, 0, Math.PI * 2);
        ctx.fill();
        // eye
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(6, -4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(7, -4, 2, 0, Math.PI * 2);
        ctx.fill();
        // beak
        ctx.fillStyle = "#ff9f1a";
        ctx.beginPath();
        ctx.moveTo(bird.radius - 2, 0);
        ctx.lineTo(bird.radius + 10, -4);
        ctx.lineTo(bird.radius + 10, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawCenterText(text, y, size = 16) {
        ctx.save();
        ctx.font = `${size}px 'Press Start 2P', monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 4;
        ctx.strokeText(text, WIDTH / 2, y);
        ctx.fillText(text, WIDTH / 2, y);
        ctx.restore();
    }

    function loop(ts) {
        const dt = Math.min(1 / 30, (ts - lastTime) / 1000 || 0);
        lastTime = ts;
        update(dt);
        draw();
        requestAnimationFrame(loop);
    }

    // Initialize
    resetGame();
    requestAnimationFrame(loop);
})();



