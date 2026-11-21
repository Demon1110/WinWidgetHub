const t = widget.t;
const board = document.getElementById("board");
const stat = document.getElementById("stat");
const topEl = document.getElementById("top");

// Rows are plain virtual-key tables; widths are expressed as flex-grow units so the whole board
// stretches with the card instead of needing pixel measurements.
const ROWS_TKL = [
  [{ k: "`", v: 192 }, { k: "1", v: 49 }, { k: "2", v: 50 }, { k: "3", v: 51 }, { k: "4", v: 52 }, { k: "5", v: 53 }, { k: "6", v: 54 }, { k: "7", v: 55 }, { k: "8", v: 56 }, { k: "9", v: 57 }, { k: "0", v: 48 }, { k: "-", v: 189 }, { k: "=", v: 187 }, { k: "⌫", v: 8, w: "wide" }],
  [{ k: "⇥", v: 9, w: "wide" }, { k: "Q", v: 81 }, { k: "W", v: 87 }, { k: "E", v: 69 }, { k: "R", v: 82 }, { k: "T", v: 84 }, { k: "Y", v: 89 }, { k: "U", v: 85 }, { k: "I", v: 73 }, { k: "O", v: 79 }, { k: "P", v: 80 }, { k: "[", v: 219 }, { k: "]", v: 221 }, { k: "\\", v: 220 }],
  [{ k: "caps", v: 20, w: "wider" }, { k: "A", v: 65 }, { k: "S", v: 83 }, { k: "D", v: 68 }, { k: "F", v: 70 }, { k: "G", v: 71 }, { k: "H", v: 72 }, { k: "J", v: 74 }, { k: "K", v: 75 }, { k: "L", v: 76 }, { k: ";", v: 186 }, { k: "'", v: 222 }, { k: "⏎", v: 13, w: "wider" }],
  [{ k: "⇧", v: 160, w: "widest" }, { k: "Z", v: 90 }, { k: "X", v: 88 }, { k: "C", v: 67 }, { k: "V", v: 86 }, { k: "B", v: 66 }, { k: "N", v: 78 }, { k: "M", v: 77 }, { k: ",", v: 188 }, { k: ".", v: 190 }, { k: "/", v: 191 }, { k: "⇧", v: 161, w: "wide" }],
  [{ k: "ctrl", v: 162, w: "wide" }, { k: "alt", v: 164, w: "wide" }, { k: "space", v: 32, w: "space" }, { k: "alt", v: 165, w: "wide" }, { k: "ctrl", v: 163, w: "wide" }],
];

const ARROW_KEYS = [{ k: "←", v: 37 }, { k: "↑", v: 38 }, { k: "↓", v: 40 }, { k: "→", v: 39 }];

let opts = { layout: "tkl", streaks: true, dim: "soft" };
let cells = new Map(); // vk → [element]
let counts = new Map();
let pressed = new Set();
let taps = 0;
let unsub = null;
let lastTop = 0;

function build() {
  board.innerHTML = "";
  cells = new Map();
  const rows = ROWS_TKL.slice(0, 5);
  for (const row of rows) {
    const r = document.createElement("div");
    r.className = "row";
    for (const key of row) {
      const el = document.createElement("div");
      el.className = "key" + (key.w ? " " + key.w : "");
      el.textContent = key.k;
      r.appendChild(el);
      if (!cells.has(key.v)) cells.set(key.v, []);
      cells.get(key.v).push(el);
    }
    board.appendChild(r);
  }
  if (opts.layout !== "main") {
    // Arrows ride along the bottom row: a separate band would steal height from the letter keys.
    const r = document.createElement("div");
    r.className = "row";
    const pad = document.createElement("div");
    pad.className = "key widest ghost";
    r.appendChild(pad);
    for (const key of ARROW_KEYS) {
      const el = document.createElement("div");
      el.className = "key";
      el.textContent = key.k;
      r.appendChild(el);
      if (!cells.has(key.v)) cells.set(key.v, []);
      cells.get(key.v).push(el);
    }
    board.appendChild(r);
  }
}

function paint(vk, on) {
  for (const el of cells.get(vk) || []) el.classList.toggle("on", on);
}

function updateFoot() {
  stat.textContent = `${taps} ${t({ "zh-TW": "次按鍵", "zh-CN": "次按键", en: "presses" })}`;
  if (!opts.streaks) {
    topEl.textContent = "";
    return;
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  topEl.textContent = best.length
    ? t({ "zh-TW": "常按：", "zh-CN": "常按：", en: "Busiest: " }) + best.map(([vk, n]) => `${nameOf(vk)}×${n}`).join("  ")
    : "";
}

function nameOf(vk) {
  for (const row of ROWS_TKL) for (const key of row) if (key.v === vk) return key.k;
  for (const key of ARROW_KEYS) if (key.v === vk) return key.k;
  if (vk >= 65 && vk <= 90) return String.fromCharCode(vk);
  if (vk >= 48 && vk <= 57) return String.fromCharCode(vk);
  return "vk" + vk;
}

function connect() {
  if (unsub) unsub();
  try {
    unsub = widget.input.subscribe({ keys: true, mouse: false, throttle: 12 }, (batch) => {
      for (const k of batch.keys || []) {
        if (k.down) {
          taps++;
          counts.set(k.vk, (counts.get(k.vk) || 0) + 1);
          if (!pressed.has(k.vk)) {
            pressed.add(k.vk);
            paint(k.vk, true);
          }
        } else {
          pressed.delete(k.vk);
          paint(k.vk, false);
        }
      }
      const now = performance.now();
      if (now - lastTop > 250) {
        lastTop = now;
        updateFoot();
      }
    });
  } catch (e) {
    stat.textContent = String(e.message || e);
  }
}

function apply(settings) {
  const next = Object.assign({}, opts, settings || {});
  const layoutChanged = next.layout !== opts.layout;
  opts = next;
  document.body.classList.remove("dim-faint", "dim-soft", "dim-clear");
  document.body.classList.add(`dim-${opts.dim}`);
  if (layoutChanged) {
    build();
    connect();
  }
  updateFoot();
}

build();
apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
connect();
