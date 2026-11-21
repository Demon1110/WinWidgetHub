// copybook: one character per cell, drawn from the real stroke outlines (hanzi-writer-data, fetched
// per character and kept in memory). When the data cannot be had — offline, a rare character — the
// cell falls back to the system Kai font, so the sheet is never blank.

const t = widget.t;
const NS = "http://www.w3.org/2000/svg";
const DATA_BASE = "https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/";
// The data is drawn in a 1024 square with y pointing up and the baseline at 900, so the whole
// sheet is one flipped group rather than a per-path transform.
const FLIP = "translate(0 900) scale(1 -1)";
const PRESETS = ["永字八法", "学而时习之", "日月山川", "春眠不觉晓", "一二三四五六"];
const DEFAULT_TEXT = "永";

const textEl = document.getElementById("text");
const sheetEl = document.getElementById("sheet");
const footEl = document.getElementById("foot");
const printBtn = document.getElementById("print");

const cache = new Map(); // character → promise of { strokes, medians } or null
let cfg = { grid: "mi", cols: "2", first: true };
let chars = [];
let missing = 0;
let timer = 0;

/** Strip what cannot be drawn: spaces, punctuation and emoji do not belong on a copybook sheet. */
function normalize(raw) {
  const cleaned = [...String(raw || "")]
    .filter((ch) => !/\s/.test(ch) && !/[，。、；：？！“”‘’《》（）()<>[\]{}.,;:!?—…·]/.test(ch))
    .slice(0, 12);
  return cleaned.length ? cleaned : [...DEFAULT_TEXT];
}

function glyph(ch) {
  if (cache.has(ch)) return cache.get(ch);
  const job = widget
    .fetch(DATA_BASE + encodeURIComponent(ch) + ".json")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  cache.set(ch, job);
  job.then((data) => {
    // A miss is not cached, so a character that failed offline gets another chance.
    if (!data || !Array.isArray(data.strokes)) cache.delete(ch);
  });
  return job;
}

function makeCell(ch) {
  const cell = document.createElement("div");
  cell.className = `cell grid-${cfg.grid}`;
  cell.title = ch;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1024 1024");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  cell.append(svg);
  paintFont(svg, ch);
  glyph(ch).then((data) => {
    if (!cell.isConnected) return;
    if (data && Array.isArray(data.strokes) && data.strokes.length) {
      paintStrokes(svg, data);
    } else {
      missing += 1;
      showFoot();
    }
  });
  return cell;
}

function paintFont(svg, ch) {
  svg.textContent = "";
  // The font fallback stays outside the flipped group: a scaled <text> would be drawn upside down.
  const text = document.createElementNS(NS, "text");
  text.setAttribute("x", "512");
  text.setAttribute("y", "512");
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "central");
  text.setAttribute("font-size", "790");
  text.setAttribute("class", "glyph-font");
  text.textContent = ch;
  svg.append(text);
}

function paintStrokes(svg, data) {
  svg.textContent = "";
  const g = document.createElementNS(NS, "g");
  g.setAttribute("transform", FLIP);
  data.strokes.forEach((d, i) => {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    const isFirst = i === 0;
    path.setAttribute("class", isFirst && cfg.first ? "stroke first" : "stroke");
    g.append(path);
  });
  svg.append(g);
}

function showFoot() {
  const parts = [t({ "zh-TW": `${chars.length} 個字`, "zh-CN": `${chars.length} 个字`, en: `${chars.length} characters` })];
  if (missing) {
    parts.push(
      t({
        "zh-TW": `${missing} 字用字體`,
        "zh-CN": `${missing} 字用字体`,
        en: `${missing} drawn with the font`,
      })
    );
  }
  footEl.textContent = parts.join(" · ");
  footEl.classList.toggle("warn", missing > 0);
}

function layout() {
  chars = normalize(textEl.value);
  missing = 0;
  sheetEl.textContent = "";
  sheetEl.style.setProperty("--cols", String(Number(cfg.cols) || 2));
  for (const ch of chars) sheetEl.append(makeCell(ch));
  showFoot();
}

function applySettings(s) {
  cfg = { grid: s.grid || "mi", cols: s.cols || "2", first: s.first !== false };
  document.body.dataset.grid = cfg.grid;
  layout();
}

/** Repaint the colours only, without re-fetching: the settings change what "first" means. */
function repaint() {
  layout();
}

textEl.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    layout();
    widget.storage.set("text", textEl.value).catch(() => {});
  }, 260);
});
textEl.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  textEl.blur();
});

printBtn.addEventListener("click", () => {
  const next = PRESETS[(PRESETS.indexOf(textEl.value) + 1) % PRESETS.length];
  const pick = PRESETS.includes(textEl.value) ? next : PRESETS[Math.floor(Math.random() * PRESETS.length)];
  textEl.value = pick;
  layout();
  widget.storage.set("text", pick).catch(() => {});
});

textEl.placeholder = t({ "zh-TW": "打幾個字，最多 12 個", "zh-CN": "打几个字，最多 12 个", en: "Type up to 12 characters" });
printBtn.textContent = t({ "zh-TW": "換一頁", "zh-CN": "换一页", en: "Another sheet" });

widget.storage
  .get("text")
  .then((v) => {
    textEl.value = typeof v === "string" && v.trim() ? v : DEFAULT_TEXT;
    applySettings(widget.settings.get());
  })
  .catch(() => {
    textEl.value = DEFAULT_TEXT;
    applySettings(widget.settings.get());
  });

widget.settings.onChange(applySettings);
widget.on("show", repaint);
