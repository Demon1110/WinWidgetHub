/* 无限重载：最简的竖版射击。
 * 敌机从顶上落，子弹往上打，撞到底线或撞到座机就掉一格命。难度按时间缓慢加档。 */

const t = widget.t;
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
const stageEl = document.getElementById("stage");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const overEl = document.getElementById("over");
const overText = document.getElementById("over-text");
const hintEl = document.getElementById("hint");

let P = { bg: "#161822", fg: "#ffffff", accent: "#4cc9f0" };
let side = 260;
let rafId = 0;
let last = 0;
let state = null;

function readPalette() {
  const cs = getComputedStyle(document.documentElement);
  const read = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  P = { bg: read("--w-bg-solid", "#161822"), fg: read("--w-fg", "#fff"), accent: read("--w-accent", "#4cc9f0") };
}

function fit() {
  readPalette();
  side = Math.max(140, Math.floor(Math.min(stageEl.clientWidth, stageEl.clientHeight)));
  cv.width = side;
  cv.height = side;
  cv.style.width = `${side}px`;
  cv.style.height = `${side}px`;
}

function start(wait = true) {
  fit();
  state = {
    ship: { x: 0.5, w: 0.14 },
    bullets: [],
    foes: [],
    lives: 3,
    score: 0,
    t: 0,
    gap: 0.34,
    dead: false,
    // A desktop card is looked at before it is played: hold the first enemy back until the
    // player does something, or the ship is shot to pieces while nobody is watching.
    waiting: wait,
    keys: { left: false, right: false },
  };
  scoreEl.textContent = "0";
  livesEl.textContent = "❤❤❤";
  overEl.hidden = true;
  last = 0;
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(frame);
  hintEl.textContent = wait
    ? t({ "zh-TW": "按空白鍵或點一下開始", "zh-CN": "按空格或点一下开始", en: "Press space or tap to start" })
    : playHint;
}

function wake() {
  if (!state || !state.waiting) return;
  state.waiting = false;
  last = 0;
  hintEl.textContent = playHint;
}

function frame(ts) {
  if (!state || state.dead) return;
  if (state.waiting) {
    draw();
    last = 0;
    rafId = requestAnimationFrame(frame);
    return;
  }
  const dt = last ? Math.min(34, ts - last) : 16;
  last = ts;
  const s = state;
  s.t += dt;

  if (s.keys.left) s.ship.x = Math.max(s.ship.w / 2, s.ship.x - dt * 0.0009);
  if (s.keys.right) s.ship.x = Math.min(1 - s.ship.w / 2, s.ship.x + dt * 0.0009);

  s.gap -= dt;
  if (s.gap <= 0) {
    s.gap = Math.max(320, 900 - s.t * 0.2);
    s.foes.push({ x: 0.1 + Math.random() * 0.8, y: -0.06, r: 0.045, v: 0.00022 + Math.random() * 0.00016 + s.t * 0.0000004 });
  }

  for (const b of s.bullets) b.y -= dt * 0.0011;
  s.bullets = s.bullets.filter((b) => b.y > -0.05);

  // Speed is per millisecond, so one crossing takes about three seconds — the earlier ×8 made
  // an enemy fall the whole field in 0.4 s, which nobody can answer.
  for (const f of s.foes) f.y += f.v * dt;
  s.foes = s.foes.filter((f) => {
    for (const b of s.bullets) {
      if (Math.abs(b.x - f.x) < f.r && Math.abs(b.y - f.y) < f.r) {
        b.y = -1;
        s.score += 10;
        scoreEl.textContent = String(s.score);
        return false;
      }
    }
    if (f.y > 0.94) {
      hit();
      return false;
    }
    const shipY = 0.9;
    if (f.y > shipY - 0.04 && Math.abs(f.x - s.ship.x) < f.r + s.ship.w / 2) {
      hit();
      return false;
    }
    return true;
  });

  draw();
  rafId = requestAnimationFrame(frame);
}

function hit() {
  const s = state;
  s.lives -= 1;
  livesEl.textContent = "❤".repeat(Math.max(0, s.lives)) + "♡".repeat(Math.max(0, 3 - s.lives));
  if (s.lives <= 0) {
    s.dead = true;
    cancelAnimationFrame(rafId);
    settle(s.score);
    overText.textContent = t({ "zh-TW": "重載完畢", "zh-CN": "重载完毕", en: "Out of lives" });
    overEl.hidden = false;
  }
}

async function settle(value) {
  const old = Number(await widget.storage.get("best")) || 0;
  if (value > old) await widget.storage.set("best", value).catch(() => {});
}

function draw() {
  const s = state;
  ctx.globalAlpha = 1;
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, side, side);

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = P.fg;
  ctx.fillRect(0, side * 0.94, side, 1);
  ctx.globalAlpha = 1;

  ctx.fillStyle = P.accent;
  for (const b of s.bullets) {
    ctx.fillRect(side * b.x - 1, side * b.y, 2, side * 0.035);
  }

  ctx.fillStyle = P.fg;
  for (const f of s.foes) {
    const r = side * f.r;
    ctx.beginPath();
    ctx.roundRect(side * f.x - r, side * f.y - r, r * 2, r * 2, r * 0.5);
    ctx.fill();
  }

  ctx.fillStyle = P.accent;
    ctx.beginPath();
  ctx.moveTo(side * s.ship.x, side * 0.86);
  ctx.lineTo(side * (s.ship.x - s.ship.w / 2), side * 0.94);
  ctx.lineTo(side * (s.ship.x + s.ship.w / 2), side * 0.94);
  ctx.closePath();
  ctx.fill();
}

function shoot() {
  if (!state || state.dead) return;
  if (state.bullets.length > 6) return;
  state.bullets.push({ x: state.ship.x, y: 0.85 });
}

document.addEventListener("keydown", (e) => {
  if (!state) return;
  wake();
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.keys.left = true;
  else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.keys.right = true;
  else if (e.key === " " || e.key === "ArrowUp") {
    e.preventDefault();
    shoot();
  }
});
document.addEventListener("keyup", (e) => {
  if (!state) return;
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") state.keys.left = false;
  else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") state.keys.right = false;
});

stageEl.addEventListener("pointerdown", (e) => {
  if (!state || state.dead) return;
  wake();
  const rect = cv.getBoundingClientRect();
  state.ship.x = Math.min(1 - state.ship.w / 2, Math.max(state.ship.w / 2, (e.clientX - rect.left) / rect.width));
  shoot();
});
stageEl.addEventListener("pointermove", (e) => {
  if (!state || state.dead || e.buttons !== 1) return;
  const rect = cv.getBoundingClientRect();
  state.ship.x = Math.min(1 - state.ship.w / 2, Math.max(state.ship.w / 2, (e.clientX - rect.left) / rect.width));
});

const playHint = t({ "zh-TW": "← → 移動，空格或點擊開火", "zh-CN": "← → 移动，空格或点击开火", en: "Move with arrows, fire with space or a tap" });
document.getElementById("again").onclick = () => start(false);
document.getElementById("again").textContent = t({ "zh-TW": "再來一次", "zh-CN": "再来一次", en: "Again" });

widget.on("resize", () => requestAnimationFrame(() => {
  fit();
  if (state) draw();
}));

start();
