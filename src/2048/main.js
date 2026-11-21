/* 2048：4×4（可切 3×3 / 5×5）方块的合并游戏。
 *
 * 每次移动先在内存里算出「谁走到哪、谁被谁吃掉」，再把新坐标写进 CSS 变量让元素平移，
 * 等过渡结束才落新数字、消失被吃掉的方块、补一个新块——所以看起来是滑过去再合上，
 * 而不是整盘重画。方向键、WASD、滑动都能操作。 */

const t = widget.t;
const STEP = 120; // 与 style.css 里 .tile 的过渡时长保持一致

const boardEl = document.getElementById("board");
const headerEl = document.querySelector("header");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overEl = document.getElementById("over");
const overText = document.getElementById("over-text");
const hintEl = document.getElementById("hint");

let size = Number(widget.settings.get("size")) || 4;
let grid = [];
let score = 0;
let best = 0;
let over = false;
let busy = false;
let timer = 0;
let swiped = null;

const bestKey = () => `best-${size}`;

/** 盘面必须是正方形，格子大小才不歪：按卡片可用区算一次，写死像素。 */
function fit() {
  const cs = getComputedStyle(document.body);
  const boxW = document.body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const boxH = document.body.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const rest = headerEl.offsetHeight + hintEl.offsetHeight + 16;
  const side = Math.max(72, Math.floor(Math.min(boxW, boxH - rest)));
  boardEl.style.width = `${side}px`;
  boardEl.style.height = `${side}px`;
  boardEl.style.setProperty("--n", size);
  boardEl.style.setProperty("--tile-font", `${Math.round((side / size) * 0.4)}px`);
}

function paint(tile) {
  const step = Math.max(0, Math.min(10, Math.round(Math.log2(tile.value)) - 1));
  tile.el.style.background = `color-mix(in srgb, var(--w-accent) ${12 + step * 8}%, var(--w-bg-solid))`;
  tile.el.style.color = step >= 7 ? "var(--w-on-accent)" : "var(--w-fg)";
  tile.el.classList.toggle("big", tile.value >= 1024);
}

function makeTile(value, r, c) {
  const tile = { value, r, c };
  const el = document.createElement("div");
  el.className = "tile";
  el.textContent = value;
  el.style.setProperty("--r", r);
  el.style.setProperty("--c", c);
  tile.el = el;
  paint(tile);
  boardEl.appendChild(el);
  return tile;
}

function newGame() {
  boardEl.querySelectorAll(".tile").forEach((el) => el.remove());
  overEl.hidden = true;
  over = false;
  busy = false;
  score = 0;
  scoreEl.textContent = "0";
  grid = Array.from({ length: size }, () => Array(size).fill(null));
  boardEl.style.setProperty("--n", size);
  fit();
  spawn();
  spawn();
  widget.storage.get(bestKey()).then((v) => {
    best = Number(v) || 0;
    bestEl.textContent = best.toLocaleString(widget.locale);
  });
}

function spawn(forced) {
  const cells = [];
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) if (!grid[r][c]) cells.push([r, c]);
  }
  if (!cells.length) return null;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const tile = makeTile(forced || (Math.random() < 0.9 ? 2 : 4), r, c);
  grid[r][c] = tile;
  requestAnimationFrame(() => tile.el.classList.add("born"));
  return tile;
}

/** 一条线上「离移动方向最近」的格子顺序。 */
function lineCoords(dir, k) {
  const line = [];
  for (let i = 0; i < size; i += 1) {
    const r = dir === "up" || dir === "down" ? i : k;
    const c = dir === "left" || dir === "right" ? i : k;
    line.push([r, c]);
  }
  return dir === "up" || dir === "left" ? line : line.reverse();
}

function move(dir) {
  if (over || busy) return;
  const next = Array.from({ length: size }, () => Array(size).fill(null));
  const moves = [];
  let moved = false;

  for (let k = 0; k < size; k += 1) {
    const coords = lineCoords(dir, k);
    const tiles = coords.map(([r, c]) => grid[r][c]).filter(Boolean);
    let at = 0;
    let prev = null;
    let prevPos = null;
    for (const tile of tiles) {
      if (prev && prev.value === tile.value) {
        // 合成：后一个滑到前一个的位置，值翻倍，之后自己消失
        prev.value *= 2;
        prev.changed = true;
        score += prev.value;
        moves.push({ tile, r: prevPos[0], c: prevPos[1], gone: true });
        moved = true;
        prev = null; // 一格里只能合一次
        continue;
      }
      const pos = coords[at];
      at += 1;
      if (tile.r !== pos[0] || tile.c !== pos[1]) moved = true;
      tile.r = pos[0];
      tile.c = pos[1];
      next[pos[0]][pos[1]] = tile;
      moves.push({ tile, r: pos[0], c: pos[1] });
      prev = tile;
      prevPos = pos;
    }
  }

  if (!moved) return;
  grid = next;
  busy = true;

  for (const m of moves) {
    m.tile.el.style.setProperty("--r", m.r);
    m.tile.el.style.setProperty("--c", m.c);
    if (m.gone) m.tile.el.classList.add("gone");
  }
  scoreEl.textContent = score.toLocaleString(widget.locale);

  clearTimeout(timer);
  timer = setTimeout(() => {
    for (const m of moves) {
      if (m.gone) {
        m.tile.el.remove();
        continue;
      }
      m.tile.el.textContent = m.tile.value;
      paint(m.tile);
      if (m.tile.changed) {
        m.tile.changed = false;
        m.tile.el.classList.remove("pop");
        void m.tile.el.offsetWidth;
        m.tile.el.classList.add("pop");
      }
    }
    busy = false;
    bestScore();
    if (spawn()) check();
  }, STEP);
}

function bestScore() {
  if (score <= best) return;
  best = score;
  bestEl.textContent = best.toLocaleString(widget.locale);
  if (widget.settings.get("keepBest") !== false) {
    widget.storage.set(bestKey(), best).catch((e) => widget.log(`2048: best: ${e.message}`));
  }
}

function check() {
  const target = 2048;
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
    const tile = grid[r][c];
    if (tile && tile.value === target && overEl.hidden) {
      show(t({ "zh-TW": `拼到 ${target} 了`, "zh-CN": `拼到 ${target} 了`, en: `You reached ${target}` }), false);
    }
  }
  if (canMove()) return;
  over = true;
  show(t({ "zh-TW": "沒有可合併的了", "zh-CN": "没有可合并的了", en: "Nothing left to merge" }), true);
}

function canMove() {
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) {
    const tile = grid[r][c];
    if (!tile) return true;
    const right = c + 1 < size ? grid[r][c + 1] : null;
    const down = r + 1 < size ? grid[r + 1][c] : null;
    if (right && right.value === tile.value) return true;
    if (down && down.value === tile.value) return true;
  }
  return false;
}

function show(text, lock) {
  overText.textContent = text;
  overEl.hidden = false;
  if (!lock) {
    // 拼到目标只是提醒一句，点一下继续
    setTimeout(() => { if (!over) overEl.hidden = true; }, 1600);
  }
}

const DIRS = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

document.addEventListener("keydown", (e) => {
  const dir = DIRS[e.key] || DIRS[e.key.toLowerCase()];
  if (!dir) return;
  e.preventDefault();
  move(dir);
});

boardEl.addEventListener("pointerdown", (e) => {
  swiped = { x: e.clientX, y: e.clientY };
  boardEl.setPointerCapture?.(e.pointerId);
});
boardEl.addEventListener("pointerup", (e) => {
  if (!swiped) return;
  const dx = e.clientX - swiped.x;
  const dy = e.clientY - swiped.y;
  swiped = null;
  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) return;
  move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});
boardEl.addEventListener("pointercancel", () => { swiped = null; });

document.getElementById("label-score").textContent = t({ "zh-TW": "分", "zh-CN": "分", en: "Score" });
document.getElementById("label-best").textContent = t({ "zh-TW": "最高", "zh-CN": "最高", en: "Best" });
document.getElementById("again").textContent = t({ "zh-TW": "新局", "zh-CN": "新局", en: "New" });
document.getElementById("over-again").textContent = t({ "zh-TW": "再來一局", "zh-CN": "再来一局", en: "Play again" });
hintEl.textContent = t({ "zh-TW": "方向鍵或滑動", "zh-CN": "方向键或滑动", en: "Arrow keys or swipe" });

document.getElementById("again").onclick = newGame;
document.getElementById("over-again").onclick = newGame;

widget.settings.onChange(() => {
  const next = Number(widget.settings.get("size")) || 4;
  if (next !== size) {
    size = next;
    newGame();
    return;
  }
  if (widget.settings.get("keepBest") === false) widget.storage.remove(bestKey()).catch(() => {});
});

widget.on("resize", () => requestAnimationFrame(fit));

newGame();
