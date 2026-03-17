/* ================================================
   ARKANOID — GEM SYSTEMS
   Arquivo separado: arkanoid.js
   ================================================ */

// Declarado globalmente apenas aqui (remova do HTML se houver duplicata)
if (typeof arkanoidLoop === 'undefined') {
    var arkanoidLoop = null;
}

function initArkanoid() {
    const canvas = document.getElementById('arkanoid-canvas');
    const ctx    = canvas.getContext('2d');

    // Ajusta o canvas para a largura real da sidebar
    const sidebarW = canvas.parentElement ? canvas.parentElement.offsetWidth - 20 : 210;
    canvas.width  = Math.max(210, sidebarW);
    canvas.height = 280;

    const W = canvas.width, H = canvas.height;

    /* ---------- ESTADO ---------- */
    let paddleX = W / 2 - 30;
    let paddleW = 60;
    const paddleH = 7;
    const ballR   = 5;
    let score = 0, lives = 3, level = 1, running = false;

    let balls    = [];
    let powerups = [];
    let bricks   = [];
    let wideTimer = 0, slowTimer = 0;
    const keys   = {};

    /* ---------- TIJOLOS ---------- */
    const cols    = 6, rows = 4;
    const brickPad = 3;
    const brickH  = 11;
    const brickOffY = 24;

    // Calcula brickW dinamicamente para preencher a largura
    const totalPad = (cols - 1) * brickPad;
    const brickOffX = 5;
    const brickW = Math.floor((W - brickOffX * 2 - totalPad) / cols);

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
            x: W / 2, y: H - 50,
            dx: 2.2 * (Math.random() > 0.5 ? 1 : -1),
            dy: -2.8,
        }];
    }

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
            paddleW = 90; wideTimer = 300;
            msg.textContent = '▬ Barra Maior!';
        } else if (type === 'multiball') {
            const b = balls[0] || { x: W / 2, y: H - 50 };
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

    /* ---------- TECLADO ---------- */
    function onKeyDown(e) {
        keys[e.key] = true;
        if (e.key === 'Enter') { running = true; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
    }
    function onKeyUp(e) { keys[e.key] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);

    canvas.addEventListener('mousemove', function (e) {
        const rect = canvas.getBoundingClientRect();
        paddleX = Math.min(W - paddleW, Math.max(0, e.clientX - rect.left - paddleW / 2));
    });

    // Suporte a toque (mobile)
    canvas.addEventListener('touchmove', function (e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        paddleX = Math.min(W - paddleW, Math.max(0, e.touches[0].clientX - rect.left - paddleW / 2));
    }, { passive: false });

    canvas.addEventListener('touchstart', function () {
        running = true;
    });

    /* ---------- DESENHO ---------- */
    function draw() {
        // Fundo gradiente
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0d1a2b');
        grad.addColorStop(1, '#1a2744');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        /* Tijolos */
        bricks.forEach((b, i) => {
            if (!b.alive) return;
            const col = brickColors[Math.floor(i / cols) % brickColors.length];
            ctx.fillStyle = b.hits === 2 ? '#ffffff' : col;
            ctx.beginPath();
            ctx.roundRect(b.x, b.y, brickW, brickH, 2);
            ctx.fill();
            if (b.hits === 2) {
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.roundRect(b.x + 2, b.y + 2, brickW - 4, brickH - 4, 1);
                ctx.fill();
            }
            // Brilho no topo do tijolo
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(b.x + 2, b.y + 1, brickW - 4, 2);
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
        const paddleGrad = ctx.createLinearGradient(paddleX, 0, paddleX + paddleW, 0);
        paddleGrad.addColorStop(0, wideTimer > 0 ? '#0080ff' : '#2255cc');
        paddleGrad.addColorStop(0.5, wideTimer > 0 ? '#00dfff' : '#5599ff');
        paddleGrad.addColorStop(1, wideTimer > 0 ? '#0080ff' : '#2255cc');
        ctx.fillStyle = paddleGrad;
        ctx.beginPath();
        ctx.roundRect(paddleX, H - paddleH - 6, paddleW, paddleH, 4);
        ctx.fill();
        // Brilho paddle
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(paddleX + 4, H - paddleH - 5, paddleW - 8, 2);

        /* Bolas */
        balls.forEach(b => {
            const ballGrad = ctx.createRadialGradient(b.x - 1, b.y - 1, 1, b.x, b.y, ballR);
            ballGrad.addColorStop(0, '#ffffff');
            ballGrad.addColorStop(1, slowTimer > 0 ? '#a3e635' : '#aaccff');
            ctx.fillStyle = ballGrad;
            ctx.beginPath(); ctx.arc(b.x, b.y, ballR, 0, Math.PI * 2); ctx.fill();
        });

        /* HUD no topo */
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, 20);

        const best = parseInt(localStorage.getItem('arkanoid_best') || '0');
        if (score > best) localStorage.setItem('arkanoid_best', score);

        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#facc15';
        ctx.fillText(`${score} pts`, 6, 13);

        ctx.fillStyle = '#888';
        ctx.fillText(`rec: ${Math.max(score, best)}`, 72, 13);

        ctx.fillStyle = '#00bfff';
        ctx.textAlign = 'center';
        ctx.fillText(`Nv ${level}`, W / 2, 13);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('♥'.repeat(lives), W - 6, 13);
        ctx.textAlign = 'left';

        /* Barras de efeito */
        if (wideTimer > 0) {
            ctx.fillStyle = 'rgba(0,191,255,0.3)';
            ctx.fillRect(4, H - 4, (wideTimer / 300) * 70, 3);
        }
        if (slowTimer > 0) {
            ctx.fillStyle = 'rgba(163,230,53,0.3)';
            ctx.fillRect(80, H - 4, (slowTimer / 300) * 70, 3);
        }

        /* Overlay pausa */
        if (!running) {
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(0, H / 2 - 20, W, 36);
            ctx.fillStyle = '#a3e635';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ENTER para iniciar', W / 2, H / 2 + 5);
            ctx.textAlign = 'left';
        }
    }

    /* ---------- LÓGICA ---------- */
    function update() {
        if (!running) return;

        if (keys['ArrowLeft'])  paddleX = Math.max(0, paddleX - 5);
        if (keys['ArrowRight']) paddleX = Math.min(W - paddleW, paddleX + 5);

        if (wideTimer > 0) { wideTimer--; if (wideTimer === 0) paddleW = 60; }
        if (slowTimer > 0)   slowTimer--;
        const speed = slowTimer > 0 ? 0.6 : 1;

        /* Power-ups */
        for (let pi = powerups.length - 1; pi >= 0; pi--) {
            const p = powerups[pi];
            p.y += 1.5;
            if (p.y + 8 >= H - paddleH - 6 && p.y - 8 <= H - 6 &&
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

            if (ball.x - ballR < 0) { ball.dx = Math.abs(ball.dx); }
            if (ball.x + ballR > W) { ball.dx = -Math.abs(ball.dx); }
            if (ball.y - ballR < 20) { ball.dy = Math.abs(ball.dy); } // respeita HUD

            /* Paddle */
            if (ball.y + ballR >= H - paddleH - 6 &&
                ball.y + ballR <= H - 2 &&
                ball.x >= paddleX && ball.x <= paddleX + paddleW) {
                ball.dy = -Math.abs(ball.dy);
                const relHit = (ball.x - (paddleX + paddleW / 2)) / (paddleW / 2);
                ball.dx += relHit * 1.5;
                ball.dx = Math.max(-4.5, Math.min(4.5, ball.dx));
            }

            /* Bola perdida */
            if (ball.y + ballR > H) {
                balls.splice(bi, 1);
                if (balls.length === 0) {
                    lives--;
                    const msg = document.getElementById('arkanoid-msg');
                    if (lives <= 0) {
                        running = false; lives = 3; score = 0; level = 1;
                        resetBricks(); resetBalls(); powerups = []; paddleW = 60;
                        msg.textContent = 'Game Over! ENTER reiniciar';
                    } else {
                        resetBalls(); running = false;
                        msg.textContent = `♥ ${lives} vidas — ENTER continuar`;
                    }
                }
                continue;
            }

            /* Colisão com tijolos */
            for (const b of bricks) {
                if (!b.alive) continue;
                if (ball.x + ballR > b.x && ball.x - ballR < b.x + brickW &&
                    ball.y + ballR > b.y && ball.y - ballR < b.y + brickH) {
                    b.hits--;
                    score += b.hits <= 0 ? 10 : 5;
                    if (b.hits <= 0) {
                        b.alive = false;
                        if (Math.random() < 0.30) {
                            const pu = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
                            powerups.push({ x: b.x + brickW / 2, y: b.y + brickH, ...pu });
                        }
                    }
                    // Detecta lado da colisão
                    const overlapL = ball.x + ballR - b.x;
                    const overlapR = b.x + brickW - (ball.x - ballR);
                    const overlapT = ball.y + ballR - b.y;
                    const overlapB = b.y + brickH - (ball.y - ballR);
                    const minH = Math.min(overlapL, overlapR);
                    const minV = Math.min(overlapT, overlapB);
                    if (minH < minV) ball.dx *= -1;
                    else             ball.dy *= -1;
                    break;
                }
            }
        }

        /* Fase vencida */
        if (bricks.length > 0 && bricks.every(b => !b.alive)) {
            level++;
            resetBricks(); resetBalls(); powerups = []; running = false;
            document.getElementById('arkanoid-msg').textContent = `🏆 Fase ${level}! ENTER continuar`;
        }
    }

    /* ---------- LOOP ---------- */
    resetBricks();
    resetBalls();

    if (arkanoidLoop) cancelAnimationFrame(arkanoidLoop);

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
