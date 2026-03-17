/* ================================================
   ARKANOID — GEM SYSTEMS
   Arquivo separado: arkanoid.js
   Inclua no HTML com:
   <script src="arkanoid.js"></script>
   ================================================ */

let arkanoidLoop = null;

function initArkanoid() {
    const canvas = document.getElementById('arkanoid-canvas');
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    /* ---------- ESTADO ---------- */
    let paddleX = W / 2 - 25;
    let paddleW = 50;
    const paddleH = 6;
    const ballR   = 5;
    let score = 0, lives = 3, level = 1, running = false;

    let balls    = [];
    let powerups = [];
    let bricks   = [];
    let wideTimer = 0, slowTimer = 0;
    const keys   = {};

    /* ---------- POWER-UPS ---------- */
    const PU_TYPES = [
        { type: 'wide',      color: '#00bfff', label: '▬'  },
        { type: 'multiball', color: '#f97316', label: '●●' },
        { type: 'slow',      color: '#a3e635', label: '↓'  },
        { type: 'life',      color: '#f43f5e', label: '♥'  },
    ];

    function applyPowerup(type) {
        const msg = document.getElementById('arkanoid-msg');
        if (type === 'wide') {
            paddleW = 80; wideTimer = 300;
            msg.textContent = '▬ Barra Maior!';
        } else if (type === 'multiball') {
            const b = balls[0] || { x: W / 2, y: H - 40 };
            balls.push({ x: b.x, y: b.y, dx: -2.5, dy: -2.5 });
            balls.push({ x: b.x, y: b.y, dx:  2.5, dy: -2.0 });
            msg.textContent = '●● Multi-bola!';
        } else if (type === 'slow') {
            slowTimer = 300;
            msg.textContent = '↓ Bola Lenta!';
        } else if (type === 'life') {
            lives = Math.min(lives + 1, 5);
            msg.textContent = '♥ +1 Vida!';
        }
        setTimeout(() => { msg.textContent = '← → mover  |  ENTER iniciar'; }, 2000);
    }

    /* ---------- TIJOLOS ---------- */
    const cols     = 6, rows = 4;
    const brickW   = 28, brickH = 10, brickPad = 3;
    const brickOffX = 4, brickOffY = 22;
    const brickColors = ['#ef4444', '#f97316', '#facc15', '#4ade80'];

    function resetBricks() {
        bricks = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                bricks.push({
                    x:    brickOffX + c * (brickW + brickPad),
                    y:    brickOffY + r * (brickH + brickPad),
                    alive: true,
                    hits:  (level > 2 && r < 2) ? 2 : 1,
                });
            }
        }
    }

    function resetBalls() {
        balls = [{
            x: W / 2, y: H - 40,
            dx: 2 * (Math.random() > 0.5 ? 1 : -1),
            dy: -2.5,
        }];
    }

    /* ---------- TECLADO ---------- */
    function onKeyDown(e) {
        keys[e.key] = true;
        if (e.key === 'Enter') running = true;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
    }
    function onKeyUp(e) { keys[e.key] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);

    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        paddleX = Math.min(W - paddleW, Math.max(0, e.clientX - rect.left - paddleW / 2));
    });

    /* ---------- DESENHO ---------- */
    function draw() {
        ctx.clearRect(0, 0, W, H);

        /* Tijolos */
        bricks.forEach((b, i) => {
            if (!b.alive) return;
            const col = brickColors[Math.floor(i / cols) % brickColors.length];
            ctx.fillStyle = b.hits === 2 ? '#ffffff' : col;
            ctx.beginPath(); ctx.roundRect(b.x, b.y, brickW, brickH, 2); ctx.fill();
            if (b.hits === 2) {
                ctx.fillStyle = col;
                ctx.beginPath(); ctx.roundRect(b.x + 2, b.y + 2, brickW - 4, brickH - 4, 1); ctx.fill();
            }
        });

        /* Power-ups */
        powerups.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.roundRect(p.x - 12, p.y - 8, 24, 14, 4); ctx.fill();
            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(p.label, p.x, p.y + 2);
            ctx.textAlign = 'left';
        });

        /* Paddle */
        ctx.fillStyle = wideTimer > 0 ? '#00bfff' : '#4488ff';
        ctx.beginPath(); ctx.roundRect(paddleX, H - paddleH - 5, paddleW, paddleH, 3); ctx.fill();

        /* Bolas */
        balls.forEach(b => {
            ctx.fillStyle = slowTimer > 0 ? '#a3e635' : '#ffffff';
            ctx.beginPath(); ctx.arc(b.x, b.y, ballR, 0, Math.PI * 2); ctx.fill();
        });

        /* HUD fixo no topo */
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, W, 16);

        const best = parseInt(localStorage.getItem('arkanoid_best') || '0');
        if (score > best) localStorage.setItem('arkanoid_best', score);

        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#facc15';
        ctx.fillText(`PTS: ${score}`, 4, 11);

        ctx.fillStyle = '#aaa';
        ctx.fillText(`REC: ${Math.max(score, best)}`, 65, 11);

        ctx.fillStyle = '#00bfff';
        ctx.textAlign = 'center';
        ctx.fillText(`Nv${level}`, W / 2, 11);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('♥'.repeat(lives), W - 4, 11);
        ctx.textAlign = 'left';

        /* Barras de efeito ativo */
        if (wideTimer > 0) {
            ctx.fillStyle = '#00bfff';
            ctx.fillRect(4, H - 3, (wideTimer / 300) * 60, 2);
        }
        if (slowTimer > 0) {
            ctx.fillStyle = '#a3e635';
            ctx.fillRect(70, H - 3, (slowTimer / 300) * 60, 2);
        }

        /* Tela de pausa / game over */
        if (!running) {
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(0, H / 2 - 18, W, 32);
            ctx.fillStyle = '#a3e635';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ENTER para iniciar', W / 2, H / 2 + 4);
            ctx.textAlign = 'left';
        }
    }

    /* ---------- LÓGICA ---------- */
    function update() {
        if (!running) return;

        /* Movimento suave da paddle pelo teclado */
        if (keys['ArrowLeft'])  paddleX = Math.max(0, paddleX - 5);
        if (keys['ArrowRight']) paddleX = Math.min(W - paddleW, paddleX + 5);

        /* Timers de efeito */
        if (wideTimer > 0) { wideTimer--; if (wideTimer === 0) paddleW = 50; }
        if (slowTimer > 0)   slowTimer--;
        const speed = slowTimer > 0 ? 0.6 : 1;

        /* Power-ups caindo */
        for (let pi = powerups.length - 1; pi >= 0; pi--) {
            const p = powerups[pi];
            p.y += 1.5;
            if (p.y + 8 >= H - paddleH - 5 && p.y - 8 <= H - 5 &&
                p.x >= paddleX && p.x <= paddleX + paddleW) {
                applyPowerup(p.type);
                powerups.splice(pi, 1);
                score += 25;
            } else if (p.y > H + 10) {
                powerups.splice(pi, 1);
            }
        }

        /* Bolas */
        for (let bi = balls.length - 1; bi >= 0; bi--) {
            const ball = balls[bi];
            ball.x += ball.dx * speed;
            ball.y += ball.dy * speed;

            /* Paredes */
            if (ball.x - ballR < 0 || ball.x + ballR > W) ball.dx *= -1;
            if (ball.y - ballR < 0) ball.dy *= -1;

            /* Paddle */
            if (ball.y + ballR >= H - paddleH - 5 && ball.y + ballR <= H &&
                ball.x >= paddleX && ball.x <= paddleX + paddleW) {
                ball.dy = -Math.abs(ball.dy);
                ball.dx += ((ball.x - (paddleX + paddleW / 2)) / (paddleW / 2)) * 1.2;
                ball.dx = Math.max(-4, Math.min(4, ball.dx));
            }

            /* Bola perdida */
            if (ball.y + ballR > H) {
                balls.splice(bi, 1);
                if (balls.length === 0) {
                    lives--;
                    const msg = document.getElementById('arkanoid-msg');
                    if (lives <= 0) {
                        running = false; lives = 3; score = 0; level = 1;
                        resetBricks(); resetBalls(); powerups = []; paddleW = 50;
                        msg.textContent = 'Game Over! ENTER reiniciar';
                    } else {
                        resetBalls(); running = false;
                        msg.textContent = `♥ ${lives} vidas restantes — ENTER`;
                    }
                }
                continue;
            }

            /* Colisão com tijolos */
            for (const b of bricks) {
                if (!b.alive) continue;
                if (ball.x > b.x && ball.x < b.x + brickW &&
                    ball.y - ballR < b.y + brickH && ball.y + ballR > b.y) {
                    b.hits--;
                    score += b.hits <= 0 ? 10 : 5;
                    if (b.hits <= 0) {
                        b.alive = false;
                        if (Math.random() < 0.30) {
                            const pu = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
                            powerups.push({ x: b.x + brickW / 2, y: b.y + brickH, ...pu });
                        }
                    }
                    ball.dy *= -1;
                    break;
                }
            }
        }

        /* Venceu fase */
        if (bricks.every(b => !b.alive)) {
            level++;
            resetBricks(); resetBalls(); powerups = []; running = false;
            document.getElementById('arkanoid-msg').textContent = `🏆 Fase ${level}! ENTER continuar`;
        }
    }

    /* ---------- LOOP ---------- */
    resetBricks();
    resetBalls();

    if (arkanoidLoop) cancelAnimationFrame(arkanoidLoop);

    /* Guarda referência para limpeza ao fechar */
    canvas._cleanup = function () {
        document.removeEventListener('keydown', onKeyDown);
        document.removeEventListener('keyup',   onKeyUp);
    };

    function gameLoop() {
        update();
        draw();
        arkanoidLoop = requestAnimationFrame(gameLoop);
    }
    gameLoop();
}

function stopArkanoid() {
    if (arkanoidLoop) {
        cancelAnimationFrame(arkanoidLoop);
        arkanoidLoop = null;
    }
    const canvas = document.getElementById('arkanoid-canvas');
    if (canvas && canvas._cleanup) canvas._cleanup();
}
