/* 游戏厅：三款小游戏共用一块舞台。
 * 贪吃蛇按固定步长走，打砖块用 rAF 做弹道，扫雷走 DOM 网格——各用最合适的节奏，不硬凑成一个循环。 */

const t = widget.t;
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const stageEl = document.getElementById("stage");
const minesEl = document.getElementById("mines");
const overEl = document.getElementById("over");
const overText = document.getElementById("over-text");
const scoreEl = document.getElementById("score");
const hintEl = document.getElementById("hint");

let game = "snake";
let side = 300;
let timer = 0;
let rafId = 0;
let lastTs = 0;

/** 画布不认 CSS 变量，颜色先解析成实际值；半透明统一走 globalAlpha。 */
let P = { bg: "#161822", fg: "#ffffff", accent: "#4cc9f0" };

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const read = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
  P = {
    bg: read("--w-bg-solid", "#161822"),
    fg: read("--w-fg", "#ffffff"),
    accent: read("--w-accent", "#4cc9f0"),
  };
}

/** 画布跟卡片走：正方形，取短边。 */
function fit() {
  readPalette();
  const w = stageEl.clientWidth;
  const h = stageEl.clientHeight;
  side = Math.max(120, Math.floor(Math.min(w, h)));
  cv.width = side;
  cv.height = side;
  cv.style.width = `${side}px`;
  cv.style.height = `${side}px`;
  redraw();
}

function redraw() {
  if (game === "snake") snakeDraw();
  else if (game === "breakout") breakoutDraw();
}

function over(text, again) {
  overText.textContent = text;
  overEl.hidden = false;
}

function hideOver() {
  overEl.hidden = true;
}

// ── 贪吃蛇 ────────────────────────────────────────────────────────────
const SN = 16;
let snake;
let dir;
let want;
let food;
let snakeDead;
let snakeLoop = 130;
// A card is opened to look at, not always to play: the snake waits for the first arrow key,
// otherwise it runs straight into the wall while nobody is watching.
let snakeWaiting = true;

const SNAKE_HINT = t({ "zh-TW": "方向鍵或 WASD，吃一個加十分", "zh-CN": "方向键或 WASD，吃一个加十分", en: "Arrow keys or WASD; each bite is ten points" });
const SNAKE_START_HINT = t({ "zh-TW": "按方向鍵開始", "zh-CN": "按方向键开始", en: "Press an arrow key to start" });

function placeFood() {
  const free = [];
  for (let y = 0; y < SN; y += 1) for (let x = 0; x < SN; x += 1) {
    if (!snake.some(([sx, sy]) => sx === x && sy === y)) free.push([x, y]);
  }
  return free[Math.floor(Math.random() * free.length)];
}

function snakeStart() {
  clearInterval(timer);
  snake = [[8, 8], [7, 8], [6, 8], [5, 8]];
  dir = { x: 1, y: 0 };
  want = [];
  snakeDead = false;
  snakeLoop = 130;
  snake = snake.slice();
  food = placeFood();
  scoreEl.textContent = "0";
  hideOver();
  snakeDraw();
  snakeWaiting = true;
  hintEl.textContent = SNAKE_START_HINT;
}

function snakeTick() {
  if (snakeDead) return;
  if (want.length) {
    const next = want.shift();
    if (next.x !== -dir.x || next.y !== -dir.y) dir = next;
  }
  const head = [snake[0][0] + dir.x, snake[0][1] + dir.y];
  if (head[0] < 0 || head[1] < 0 || head[0] >= SN || head[1] >= SN || snake.some(([x, y]) => x === head[0] && y === head[1])) {
    snakeDead = true;
    clearInterval(timer);
    settle("snake", Number(scoreEl.textContent));
    over(t({ "zh-TW": "撞上了", "zh-CN": "撞上了", en: "Crash" }));
    return;
  }
  snake.unshift(head);
  if (head[0] === food[0] && head[1] === food[1]) {
    scoreEl.textContent = String(Number(scoreEl.textContent) + 10);
    food = placeFood();
    if (snakeLoop > 60 && snake.length % 5 === 0) {
      clearInterval(timer);
      snakeLoop -= 8;
      timer = setInterval(snakeTick, snakeLoop);
    }
  } else {
    snake.pop();
  }
  snakeDraw();
}

function snakeDraw() {
  if (!snake) return;
  const cell = side / SN;
  readPalette();
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, side, side);
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = P.fg;
  ctx.lineWidth = 1;
  for (let i = 1; i < SN; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * cell, 0);
    ctx.lineTo(i * cell, side);
    ctx.moveTo(0, i * cell);
    ctx.lineTo(side, i * cell);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.accent;
  ctx.beginPath();
  ctx.arc((food[0] + 0.5) * cell, (food[1] + 0.5) * cell, cell * 0.4, 0, Math.PI * 2);
  ctx.fill();
  snake.forEach(([x, y], i) => {
    ctx.globalAlpha = i === 0 ? 1 : 0.62;
    ctx.fillStyle = P.accent;
    const pad = i === 0 ? cell * 0.1 : cell * 0.15;
    ctx.beginPath();
    ctx.roundRect(x * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2, cell * 0.22);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ── 打砖块 ────────────────────────────────────────────────────────────
const BR = { cols: 7, rows: 4, padW: 0.24, ballR: 0.028 };
const BREAKOUT_HINT = t({ "zh-TW": "左右拖動或方向鍵接球", "zh-CN": "左右拖动或方向键接球", en: "Drag or use arrow keys to catch" });
const BREAKOUT_START_HINT = t({ "zh-TW": "動一下滑鼠開始", "zh-CN": "动一下鼠标开始", en: "Move the mouse to start" });
let br;

function breakoutStart() {
  const W = side;
  br = {
    paddle: 0.5,
    ball: { x: 0.5, y: 0.72, vx: 0.28, vy: -0.42 },
    left: 0,
    bricks: [],
    paused: false,
    // Still until the pointer moves, so the card shows the board instead of losing the ball.
    waiting: true,
  };
  for (let r = 0; r < BR.rows; r += 1) {
    for (let c = 0; c < BR.cols; c += 1) br.bricks.push({ c, r, alive: true, hp: r === 0 ? 2 : 1 });
  }
  scoreEl.textContent = "0";
  hideOver();
  lastTs = 0;
  cancelAnimationFrame(rafId);
  breakoutDraw();
  hintEl.textContent = BREAKOUT_START_HINT;
}

function breakoutFrame(ts) {
  if (game !== "breakout") return;
  if (br.waiting) return;
  const dt = lastTs ? Math.min(32, ts - lastTs) : 16;
  lastTs = ts;
  const W = side;
  const b = br.ball;
  b.x += br.ball.vx * dt / 16 * (W / 300);
  b.y += br.ball.vy * dt / 16 * (W / 300);

  const r = W * BR.ballR;
  if (b.x < r || b.x > W - r) {
    b.vx *= -1;
    b.x = Math.min(W - r, Math.max(r, b.x));
  }
  if (b.y < r) {
    b.vy *= -1;
    b.y = r;
  }
  if (b.y > W - r) {
    br.paused = true;
    settle("breakout", Number(scoreEl.textContent));
    over(t({ "zh-TW": "球掉了", "zh-CN": "球掉了", en: "Ball lost" }));
  }

  const padW = W * BR.padW;
  const padY = W * 0.9;
  const padX = br.paddle * (W - padW);
  if (b.y + r > padY && b.y - r < padY + W * 0.03 && b.x > padX && b.x < padX + padW && b.vy > 0) {
    b.vy = -Math.abs(b.vy);
    br.ball.vx = ((b.x - (padX + padW / 2)) / (padW / 2)) * 0.42;
  }

  const bw = (W - 8) / BR.cols;
  const bh = Math.max(8, W * 0.035);
  for (const brick of br.bricks) {
    if (!brick.alive) continue;
    const bx = 4 + brick.c * bw;
    const by = 8 + brick.r * (bh + 4);
    if (b.x > bx && b.x < bx + bw - 4 && b.y - r > by && b.y + r < by + bh) {
      b.vy *= -1;
      brick.hp -= 1;
      if (brick.hp <= 0) brick.alive = false;
      scoreEl.textContent = String(Number(scoreEl.textContent) + 10);
      break;
    }
  }
  if (br.bricks.every((brick) => !brick.alive)) {
    settle("breakout", Number(scoreEl.textContent));
    over(t({ "zh-TW": "清完了", "zh-CN": "清完了", en: "Cleared" }));
    return;
  }
  breakoutDraw();
  if (!br.paused) rafId = requestAnimationFrame(breakoutFrame);
}

function breakoutDraw() {
  const W = side;
  readPalette();
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, W);

  const bw = (W - 8) / BR.cols;
  const bh = Math.max(8, W * 0.035);
  for (const brick of br.bricks) {
    if (!brick.alive) continue;
    ctx.globalAlpha = brick.hp > 1 ? 1 : 0.55;
    ctx.fillStyle = P.accent;
    ctx.beginPath();
    ctx.roundRect(4 + brick.c * bw, 8 + brick.r * (bh + 4), bw - 6, bh, 4);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const padW = W * BR.padW;
  const padX = br.paddle * (W - padW);
  ctx.fillStyle = P.fg;
  ctx.beginPath();
  ctx.roundRect(padX, W * 0.9, padW, W * 0.028, W * 0.014);
  ctx.fill();

  ctx.fillStyle = P.accent;
  ctx.beginPath();
  ctx.arc(br.ball.x, br.ball.y, W * BR.ballR, 0, Math.PI * 2);
  ctx.fill();
}

// ── 扫雷 ──────────────────────────────────────────────────────────────
const MS = 9;
const MINES = 10;
let mineCells;
let mineStart;

function minesStart() {
  mineCells = Array.from({ length: MS * MS }, () => ({ mine: false, open: false, flag: false, near: 0 }));
  mineStart = true;
  scoreEl.textContent = "0";
  hideOver();
  minesDraw();
}

function idx(x, y) {
  return y * MS + x;
}

function layMines(safe) {
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * MS * MS);
    const x = i % MS;
    const y = Math.floor(i / MS);
    if (mineCells[i].mine) continue;
    if (Math.abs(x - safe[0]) <= 1 && Math.abs(y - safe[1]) <= 1) continue;
    mineCells[i].mine = true;
    placed += 1;
  }
  for (let y = 0; y < MS; y += 1) for (let x = 0; x < MS; x += 1) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < MS && ny < MS && mineCells[idx(nx, ny)].mine) n += 1;
    }
    mineCells[idx(x, y)].near = n;
  }
}

function open(x, y) {
  const cell = mineCells[idx(x, y)];
  if (cell.open || cell.flag) return;
  cell.open = true;
  if (cell.near === 0 && !cell.mine) {
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < MS && ny < MS) open(nx, ny);
    }
  }
}

function minesClick(x, y) {
  if (mineStart) {
    layMines([x, y]);
    mineStart = false;
  }
  const cell = mineCells[idx(x, y)];
  if (cell.flag) return;
  if (cell.mine) {
    cell.open = true;
    minesDraw();
    settle("mines", Number(scoreEl.textContent));
    over(t({ "zh-TW": "踩到雷了", "zh-CN": "踩到雷了", en: "Boom" }));
    return;
  }
  open(x, y);
  minesDraw();
  const opened = mineCells.filter((c) => c.open).length;
  scoreEl.textContent = String(opened);
  if (mineCells.filter((c) => !c.open && !c.mine).length === 0) {
    settle("mines", opened);
    over(t({ "zh-TW": "掃乾淨了", "zh-CN": "扫干净了", en: "Cleared" }));
  }
}

function minesDraw() {
  minesEl.innerHTML = "";
  for (let y = 0; y < MS; y += 1) {
    for (let x = 0; x < MS; x += 1) {
      const cell = mineCells[idx(x, y)];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cell";
      if (cell.open) btn.classList.add("open");
      if (cell.flag) btn.classList.add("flag");
      if (cell.open && cell.mine) btn.classList.add("mine");
      btn.textContent = cell.open ? (cell.mine ? "✳" : cell.near || "") : cell.flag ? "⚑" : "";
      if (cell.open && cell.near) btn.dataset.n = String(cell.near);
      btn.addEventListener("click", () => minesClick(x, y));
      btn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (cell.open) return;
        cell.flag = !cell.flag;
        minesDraw();
      });
      minesEl.appendChild(btn);
    }
  }
}

// ── 成绩 ──────────────────────────────────────────────────────────────
async function settle(kind, value) {
  const key = `best-${kind}`;
  const old = Number(await widget.storage.get(key)) || 0;
  if (value > old) await widget.storage.set(key, value).catch(() => {});
}

// ── 切换 ──────────────────────────────────────────────────────────────
function setGame(next) {
  game = next;
  clearInterval(timer);
  cancelAnimationFrame(rafId);
  hideOver();
  for (const tab of document.querySelectorAll(".tab")) {
    tab.setAttribute("aria-pressed", tab.dataset.game === next ? "true" : "false");
  }
  const mines = next === "mines";
  cv.hidden = mines;
  minesEl.hidden = !mines;
  hintEl.textContent = mines
    ? t({ "zh-TW": "左鍵挖，右鍵插旗", "zh-CN": "左键挖，右键插旗", en: "Click to dig, right-click to flag" })
    : next === "snake"
      ? t({ "zh-TW": "方向鍵或 WASD，吃一個加十分", "zh-CN": "方向键或 WASD，吃一个加十分", en: "Arrow keys or WASD; each bite is ten points" })
      : t({ "zh-TW": "左右拖動或方向鍵接球", "zh-CN": "左右拖动或方向键接球", en: "Drag or use arrow keys to catch" });
  if (mines) minesStart();
  else {
    fit();
    if (next === "snake") snakeStart();
    else breakoutStart();
  }
}

document.addEventListener("keydown", (e) => {
  const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 } };
  const vec = map[e.key] || map[e.key.toLowerCase()];
  if (!vec) return;
  e.preventDefault();
  if (game === "snake") {
    if (snakeWaiting) {
      snakeWaiting = false;
      hintEl.textContent = SNAKE_HINT;
      clearInterval(timer);
      timer = setInterval(snakeTick, snakeLoop);
    }
    if (want.length < 3) want.push(vec);
  } else if (game === "breakout") {
    breakoutWake();
    br.paddle = Math.min(1, Math.max(0, br.paddle + (vec.x ? vec.x * 0.09 : 0)));
  }
});

stageEl.addEventListener("pointermove", (e) => {
  if (game !== "breakout" || !br) return;
  breakoutWake();
  const rect = stageEl.getBoundingClientRect();
  br.paddle = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
});

/** Starts the ball once someone touches the card; before that it hangs still under the bricks. */
function breakoutWake() {
  if (!br || !br.waiting) return;
  br.waiting = false;
  lastTs = 0;
  hintEl.textContent = BREAKOUT_HINT;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(breakoutFrame);
}

document.getElementById("over-again").onclick = () => setGame(game);
for (const tab of document.querySelectorAll(".tab")) {
  tab.textContent = t(tab.dataset.game === "snake"
    ? { "zh-TW": "貪吃蛇", "zh-CN": "贪吃蛇", en: "Snake" }
    : tab.dataset.game === "breakout"
      ? { "zh-TW": "打磚塊", "zh-CN": "打砖块", en: "Breakout" }
      : { "zh-TW": "掃雷", "zh-CN": "扫雷", en: "Mines" });
  tab.addEventListener("click", () => setGame(tab.dataset.game));
}

widget.on("resize", () => requestAnimationFrame(fit));
setGame("snake");
