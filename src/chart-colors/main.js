const $ = (id) => document.getElementById(id);
const t = widget.t;

// ── colour maths ─────────────────────────────────────────────────────────────
// OKLab keeps the steps of a sequential ramp perceptually even, which is the whole point of a
// chart palette: a reader should see "one step brighter" as one step, not as a jump.
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const unlin = (c) => (c <= 0.00304 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklab([r, g, b]) {
  const R = lin(r / 255), G = lin(g / 255), B = lin(b / 255);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    255 * unlin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    255 * unlin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    255 * unlin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function toHex(rgb) {
  return "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function lch(l, c, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  // A chroma that falls outside sRGB is dialled back instead of being clipped, which keeps the
  // hue intact and stops one swatch from reading as a flat primary.
  let cc = c;
  for (let i = 0; i < 14; i++) {
    const rgb = oklabToRgb([l, cc * Math.cos(h), cc * Math.sin(h)]);
    if (rgb.every((v) => v >= -0.5 && v <= 255.5)) return toHex(rgb);
    cc *= 0.92;
  }
  return toHex(oklabToRgb([l, 0, 0]));
}

function format(hex, mode) {
  if (mode === "hex") return hex;
  const m = /^#(\w\w)(\w\w)(\w\w)$/.exec(hex);
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  if (mode === "rgb") return `rgb(${r}, ${g}, ${b})`;
  const [L, A, B] = rgbToOklab([r, g, b]);
  const C = Math.hypot(A, B);
  const H = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  // hsl() is what design tools speak, so convert through sRGB rather than handing out oklch().
  const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255;
  const l2 = (max + min) / 2;
  const d = max - min;
  const s2 = d === 0 ? 0 : d / (1 - Math.abs(2 * l2 - 1));
  let h2 = 0;
  if (d !== 0) {
    if (max === r / 255) h2 = ((g - b) / 255 / d + 6) % 6;
    else if (max === g / 255) h2 = (b - r) / 255 / d + 2;
    else h2 = (r - g) / 255 / d + 4;
    h2 *= 60;
  }
  void L; void C; void H;
  return `hsl(${Math.round(h2)}, ${Math.round(s2 * 100)}%, ${Math.round(l2 * 100)}%)`;
}

function isDark(hex) {
  const m = /^#(\w\w)(\w\w)(\w\w)$/.exec(hex);
  const r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

// ── palettes ─────────────────────────────────────────────────────────────────
const TYPES = [
  { key: "seq", label: { "zh-TW": "順色", "zh-CN": "顺色", en: "Sequential" } },
  { key: "div", label: { "zh-TW": "對照", "zh-CN": "对照", en: "Diverging" } },
  { key: "qual", label: { "zh-TW": "分類", "zh-CN": "分类", en: "Categorical" } },
];

const SEQ = [
  { name: "深海", hue: 255, c: 0.11 },
  { name: "青碧", hue: 205, c: 0.1 },
  { name: "苔绿", hue: 145, c: 0.1 },
  { name: "橄欖", hue: 115, c: 0.09 },
  { name: "琥珀", hue: 70, c: 0.12 },
  { name: "陶土", hue: 35, c: 0.11 },
  { name: "紫藤", hue: 310, c: 0.1 },
  { name: "玫瑰", hue: 350, c: 0.09 },
];

const DIV = [
  { name: "赤—藍", a: 25, b: 255 },
  { name: "橙—青", a: 55, b: 210 },
  { name: "紫—綠", a: 310, b: 150 },
  { name: "洋紅—青檸", a: 350, b: 105 },
];

const QUAL = [
  { name: "明快", colors: ["#4361EE", "#4CC9F0", "#7209B7", "#F72585", "#FF9505", "#F9C74F"] },
  { name: "沉穩", colors: ["#264653", "#2A9D8F", "#8AB17D", "#E9C46A", "#F4A261", "#E76F51"] },
  { name: "柔彩", colors: ["#FFADAD", "#FFD6A5", "#FDFFB6", "#CAFFBF", "#9BF6FF", "#BDB2FF"] },
  { name: "灰階", colors: ["#1B1B1E", "#3A3A40", "#6C6C74", "#A0A0A8", "#CFCFD4", "#F2F2F4"] },
];

let state = { type: "seq", family: 0, steps: 5, format: "hex" };

function palette() {
  if (state.type === "qual") {
    const q = QUAL[state.family];
    return q.colors.slice(0, Math.max(3, Math.min(q.colors.length, state.steps + 1)));
  }
  if (state.type === "div") {
    const d = DIV[state.family];
    const n = state.steps;
    const out = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const edge = Math.abs(2 * k - 1);
      const L = 0.44 + 0.5 * (1 - edge);
      const C = 0.012 + 0.135 * edge ** 0.85;
      out.push(lch(L, C, k < 0.5 ? d.a : d.b));
    }
    return out;
  }
  const s = SEQ[state.family];
  const n = state.steps;
  const out = [];
  for (let i = 0; i < n; i++) {
    const k = n === 1 ? 0 : i / (n - 1);
    const L = 0.955 - 0.51 * k;              // light to dark, never to black
    const C = s.c * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, k * 0.85 + 0.08)));
    out.push(lch(L, C, s.hue - 8 * k));
  }
  return out;
}

function families() {
  return state.type === "qual" ? QUAL : state.type === "div" ? DIV : SEQ;
}

function currentName() {
  return families()[state.family].name;
}

// ── rendering ────────────────────────────────────────────────────────────────
const swatches = $("swatches");
const tabs = $("tabs");
const fam = $("families");
const steps = $("steps");
const toast = $("toast");

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("on");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("on"), 1600);
}

function renderTabs() {
  tabs.innerHTML = "";
  for (const ty of TYPES) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t(ty.label);
    b.setAttribute("aria-selected", state.type === ty.key ? "true" : "false");
    b.addEventListener("click", () => {
      state.type = ty.key;
      state.family = 0;
      state.steps = ty.key === "qual" ? 5 : 5;
      render();
    });
    tabs.appendChild(b);
  }
}

function renderFamilies() {
  fam.innerHTML = "";
  families().forEach((f, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = f.name;
    b.setAttribute("aria-selected", i === state.family ? "true" : "false");
    b.addEventListener("click", () => {
      state.family = i;
      render();
    });
    fam.appendChild(b);
  });
}

function renderSteps() {
  steps.innerHTML = "";
  $("stepLabel").textContent = t({ "zh-TW": "階數", "zh-CN": "阶数", en: "Steps" });
  const max = state.type === "qual" ? 5 : 9;
  for (let n = 3; n <= max; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(n);
    b.setAttribute("aria-pressed", state.steps === n ? "true" : "false");
    b.addEventListener("click", () => {
      state.steps = n;
      render();
    });
    steps.appendChild(b);
  }
}

function renderSwatches() {
  const colors = palette();
  swatches.innerHTML = "";
  colors.forEach((hex, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip " + (isDark(hex) ? "is-dark" : "is-light");
    b.style.background = hex;
    b.innerHTML = `<span>${format(hex, state.format)}</span><span class="n">${i + 1}</span>`;
    b.title = t({ "zh-TW": "點一下就複製", "zh-CN": "点一下就复制", en: "Click to copy" });
    b.addEventListener("click", () => {
      widget.clipboard.writeText(hex).then((ok) => {
        showToast(ok ? `${hex} · ${t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "copied" })}` : t({ "zh-TW": "複製失敗", "zh-CN": "复制失败", en: "copy failed" }));
      });
    });
    swatches.appendChild(b);
  });
}

function render() {
  renderTabs();
  renderFamilies();
  renderSteps();
  renderSwatches();
}

function cssText() {
  const colors = palette();
  const lines = colors.map((hex, i) => `  --c${i + 1}: ${hex};`).join("\n");
  return `/* ${currentName()} · ${colors.length} */\n:root {\n${lines}\n}\n`;
}

function jsonText() {
  const colors = palette();
  return JSON.stringify({ name: currentName(), type: state.type, steps: colors.length, colors }, null, 2) + "\n";
}

$("copyCss").textContent = t({ "zh-TW": "複製 CSS", "zh-CN": "复制 CSS", en: "Copy CSS" });
$("copyJson").textContent = t({ "zh-TW": "複製 JSON", "zh-CN": "复制 JSON", en: "Copy JSON" });
$("save").textContent = t({ "zh-TW": "存成檔案", "zh-CN": "存成文件", en: "Save file" });

$("copyCss").addEventListener("click", () => {
  widget.clipboard.writeText(cssText()).then((ok) => showToast(ok ? t({ "zh-TW": "CSS 已複製", "zh-CN": "CSS 已复制", en: "CSS copied" }) : t({ "zh-TW": "複製失敗", "zh-CN": "复制失败", en: "copy failed" })));
});
$("copyJson").addEventListener("click", () => {
  widget.clipboard.writeText(jsonText()).then((ok) => showToast(ok ? t({ "zh-TW": "JSON 已複製", "zh-CN": "JSON 已复制", en: "JSON copied" }) : t({ "zh-TW": "複製失敗", "zh-CN": "复制失败", en: "copy failed" })));
});
$("save").addEventListener("click", async () => {
  try {
    const path = await widget.shell.save({
      title: t({ "zh-TW": "存下色板", "zh-CN": "保存色板", en: "Save palette" }),
      name: `${currentName()}-${palette().length}.json`,
      filter: "json",
    });
    if (!path) return;
    await widget.file.write(path, jsonText());
    showToast(t({ "zh-TW": "已存下", "zh-CN": "已保存", en: "Saved" }) + " · " + path);
  } catch (e) {
    showToast(String(e.message || e));
  }
});

function applySettings(s) {
  if (s && s.format) state.format = s.format;
  renderSwatches();
}

applySettings(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(applySettings);
render();
