/* 色卡：一个基准色，三种配色算法，外加几套公开色板。
 * ColorBrewer 与 viridis 都是可自由使用的公开数据，直接内嵌，不联网。 */

const t = widget.t;
const hexEl = document.getElementById("hex");
const baseEl = document.getElementById("base");
const rowEl = document.getElementById("row");
const booksEl = document.getElementById("books");
const toastEl = document.getElementById("toast");

let base = "#4cc9f0";

const BOOKS = [
  ["Set1", ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"]],
  ["Dark2", ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#a6761d", "#666666"]],
  ["Paired", ["#a6cee3", "#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00"]],
  ["Blues", ["#eff3ff", "#bdd7e7", "#6baed6", "#3182bd", "#08519c"]],
  ["Greens", ["#edf8e9", "#bae4b3", "#74c476", "#31a354", "#006d2c"]],
  ["OrRd", ["#fef0d9", "#fdcc8a", "#fc8d59", "#e34a33", "#b30000"]],
  ["PuBuGn", ["#f6eff7", "#bdc9e1", "#67a9cf", "#1c9099", "#016c59"]],
  ["Viridis", ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"]],
];

const hex2rgb = (hex) => {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
const rgb2hex = (rgb) => "#" + rgb.map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0")).join("");
const mix = (hex, toward, amount) => {
  const a = hex2rgb(hex);
  const b = toward === "w" ? [255, 255, 255] : [0, 0, 0];
  return rgb2hex(a.map((v, i) => v + (b[i] - v) * amount));
};

function toHsl(hex) {
  const [r, g, b] = hex2rgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function fromHsl(h, s, l) {
  const hue = ((h % 1) + 1) % 1;
  if (s === 0) {
    const v = l * 255;
    return rgb2hex([v, v, v]);
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (x) => {
    let r = x < 0 ? x + 1 : x > 1 ? x - 1 : x;
    if (r < 1 / 6) return p + (q - p) * 6 * r;
    if (r < 1 / 2) return q;
    if (r < 2 / 3) return p + (q - p) * (2 / 3 - r) * 6;
    return p;
  };
  return rgb2hex([f(hue + 1 / 3) * 255, f(hue) * 255, f(hue - 1 / 3) * 255]);
}

function derive(hex) {
  const scheme = widget.settings.get("scheme") || "tone";
  const [h, s, l] = toHsl(hex);
  if (scheme === "harmony") {
    return [
      mix(hex, "w", 0.55),
      mix(hex, "w", 0.22),
      hex,
      fromHsl(h + 0.5, s, l),
      mix(hex, "k", 0.3),
    ];
  }
  if (scheme === "triad") {
    return [
      fromHsl(h - 1 / 3, s, l),
      fromHsl(h - 1 / 6, s, l),
      hex,
      fromHsl(h + 1 / 6, s, l),
      fromHsl(h + 1 / 3, s, l),
    ];
  }
  return [
    mix(hex, "w", 0.62),
    mix(hex, "w", 0.3),
    hex,
    mix(hex, "k", 0.28),
    mix(hex, "k", 0.55),
  ];
}

function copy(color) {
  widget.clipboard.writeText(color.toUpperCase())
    .then((ok) => widget.util.toast(toastEl, ok === false
      ? t({ "zh-TW": "剪貼簿被佔用了", "zh-CN": "剪贴板被占用了", en: "Clipboard is busy" })
      : `${color.toUpperCase()}`, 1400))
    .catch((e) => widget.util.toast(toastEl, e.message, 2000));
}

function paint() {
  baseEl.style.background = base;
  hexEl.textContent = base.toUpperCase();
  hexEl.style.color = toHsl(base)[2] > 0.62 ? "#141414" : "#ffffff";

  rowEl.innerHTML = "";
  for (const color of derive(base)) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.style.background = color;
    chip.title = color;
    chip.addEventListener("click", () => copy(color));
    rowEl.appendChild(chip);
  }

  for (const chip of booksEl.querySelectorAll(".mini")) {
    chip.setAttribute("aria-pressed", chip.dataset.hex === base ? "true" : "false");
  }
}

function buildBooks() {
  for (const [name, colors] of BOOKS) {
    const group = document.createElement("button");
    group.type = "button";
    group.className = "book";
    group.title = name;
    for (const color of colors) {
      const mini = document.createElement("i");
      mini.className = "mini";
      mini.dataset.hex = color;
      mini.style.background = color;
      mini.addEventListener("click", (e) => {
        e.stopPropagation();
        base = color;
        paint();
      });
      group.appendChild(mini);
    }
    booksEl.appendChild(group);
  }
}

document.getElementById("pick").textContent = t({ "zh-TW": "取色", "zh-CN": "取色", en: "Pick" });

document.getElementById("pick").onclick = () => {
  widget.screen.colorPick()
    .then((res) => {
      if (!res || !res.hex) return;
      base = res.hex;
      paint();
      copy(base);
    })
    .catch((e) => widget.util.toast(toastEl, e.message, 2400));
};

baseEl.addEventListener("click", () => copy(base));
widget.settings.onChange(paint);

buildBooks();
widget.storage.get("base").then((v) => {
  if (v) base = v;
  paint();
});
baseEl.addEventListener("pointerup", () => widget.storage.set("base", base).catch(() => {}));
