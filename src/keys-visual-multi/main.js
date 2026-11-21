const t = widget.t;
const board = document.getElementById("board");
const stat = document.getElementById("stat");
const note = document.getElementById("note");

const FROW = Array.from({ length: 12 }, (_, i) => ({ k: "F" + (i + 1), v: 112 + i }));
const ROWS = [
  [{ k: "`", v: 192 }, { k: "1", v: 49 }, { k: "2", v: 50 }, { k: "3", v: 51 }, { k: "4", v: 52 }, { k: "5", v: 53 }, { k: "6", v: 54 }, { k: "7", v: 55 }, { k: "8", v: 56 }, { k: "9", v: 57 }, { k: "0", v: 48 }, { k: "-", v: 189 }, { k: "=", v: 187 }, { k: "⌫", v: 8, w: "wide" }],
  [{ k: "⇥", v: 9, w: "wide" }, { k: "Q", v: 81 }, { k: "W", v: 87 }, { k: "E", v: 69 }, { k: "R", v: 82 }, { k: "T", v: 84 }, { k: "Y", v: 89 }, { k: "U", v: 85 }, { k: "I", v: 73 }, { k: "O", v: 79 }, { k: "P", v: 80 }, { k: "[", v: 219 }, { k: "]", v: 221 }, { k: "\\", v: 220 }],
  [{ k: "caps", v: 20, w: "wider" }, { k: "A", v: 65 }, { k: "S", v: 83 }, { k: "D", v: 68 }, { k: "F", v: 70 }, { k: "G", v: 71 }, { k: "H", v: 72 }, { k: "J", v: 74 }, { k: "K", v: 75 }, { k: "L", v: 76 }, { k: ";", v: 186 }, { k: "'", v: 222 }, { k: "⏎", v: 13, w: "wider" }],
  [{ k: "⇧", v: 160, w: "widest" }, { k: "Z", v: 90 }, { k: "X", v: 88 }, { k: "C", v: 67 }, { k: "V", v: 86 }, { k: "B", v: 66 }, { k: "N", v: 78 }, { k: "M", v: 77 }, { k: ",", v: 188 }, { k: ".", v: 190 }, { k: "/", v: 191 }, { k: "⇧", v: 161, w: "wide" }],
  [{ k: "ctrl", v: 162, w: "wide" }, { k: "alt", v: 164, w: "wide" }, { k: "space", v: 32, w: "space" }, { k: "alt", v: 165, w: "wide" }, { k: "ctrl", v: 163, w: "wide" }, { k: "←", v: 37 }, { k: "↑", v: 38 }, { k: "↓", v: 40 }, { k: "→", v: 39 }],
];

const PAD = [
  { k: "num", v: 144 }, { k: "/", v: 111 }, { k: "*", v: 106 }, { k: "-", v: 109 },
  { k: "7", v: 103 }, { k: "8", v: 104 }, { k: "9", v: 105 }, { k: "+", v: 107 },
  { k: "4", v: 100 }, { k: "5", v: 101 }, { k: "6", v: 102 }, { k: "⏎", v: 13 },
  { k: "1", v: 97 }, { k: "2", v: 98 }, { k: "3", v: 99 }, { k: "0", v: 96 },
  { k: ".", v: 110 },
];

let opts = { numpad: true, frow: true, trail: "short" };
let cells = new Map();
let held = new Set();
let taps = 0;
let unsub = null;

function addKey(parent, key, cls) {
  const el = document.createElement("div");
  el.className = "key" + (cls ? " " + cls : "");
  if (key.w) el.classList.add(key.w);
  if (key.t) el.style.gridRow = `span ${key.t}`;
  el.textContent = key.k;
  parent.appendChild(el);
  if (!cells.has(key.v)) cells.set(key.v, []);
  cells.get(key.v).push(el);
  return el;
}

function build() {
  board.innerHTML = "";
  cells = new Map();
  board.classList.toggle("no-pad", !opts.numpad);

  const keys = document.createElement("div");
  keys.className = "zone keys";
  if (opts.frow) {
    const r = document.createElement("div");
    r.className = "row";
    for (const k of FROW) addKey(r, k, "");
    keys.appendChild(r);
  }
  for (const row of ROWS) {
    const r = document.createElement("div");
    r.className = "row";
    for (const k of row) addKey(r, k, "");
    keys.appendChild(r);
  }
  board.appendChild(keys);

  if (opts.numpad) {
    const pad = document.createElement("div");
    pad.className = "pad";
    for (const k of PAD) addKey(pad, k, k.w || "");
    board.appendChild(pad);
  }
}

const TRAIL_MS = { none: 0, short: 260, long: 850 };
const timers = new Map();

function press(vk) {
  for (const el of cells.get(vk) || []) {
    el.classList.add("on");
    el.classList.remove("hold");
  }
}

function release(vk) {
  const ms = TRAIL_MS[opts.trail] || 0;
  const list = cells.get(vk) || [];
  for (const el of list) {
    if (ms <= 0) {
      el.classList.remove("on", "hold");
    } else {
      el.classList.add("hold");
      el.classList.remove("on");
      clearTimeout(timers.get(el));
      timers.set(
        el,
        setTimeout(() => el.classList.remove("hold"), ms),
      );
    }
  }
}

function connect() {
  if (unsub) unsub();
  try {
    unsub = widget.input.subscribe({ keys: true, mouse: false, throttle: 10 }, (batch) => {
      for (const k of batch.keys || []) {
        if (k.down) {
          taps++;
          held.add(k.vk);
          press(k.vk);
        } else {
          held.delete(k.vk);
          release(k.vk);
        }
      }
      stat.textContent = `${taps} ${t({ "zh-TW": "次按鍵", "zh-CN": "次按键", en: "presses" })} · ${held.size} ${t({ "zh-TW": "按住", "zh-CN": "按住", en: "held" })}`;
    });
  } catch (e) {
    note.textContent = String(e.message || e);
  }
}

function apply(settings) {
  const next = Object.assign({}, opts, settings || {});
  const changed = next.numpad !== opts.numpad || next.frow !== opts.frow;
  opts = next;
  if (changed) {
    build();
    connect();
  }
}

note.textContent = t({ "zh-TW": "把卡片拉大，鍵盤會跟著長", "zh-CN": "把卡片拉大，键盘会跟着长", en: "Drag the card bigger and the board grows with it" });
stat.textContent = `0 ${t({ "zh-TW": "次按鍵", "zh-CN": "次按键", en: "presses" })}`;

build();
apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
connect();
