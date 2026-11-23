/* 工作日历：日期只读本机时间，外观全部来自 widget.settings；相册用宿主文件夹接口，不联网。 */

const $ = (id) => document.getElementById(id);
const card = $("card");
const bg = $("bg");
const miniBg = $("miniBg");
const settingsPane = $("settings");
const sheet = $("sheet");
const calendar = $("calendar");
const openSettingsBtn = $("openSettings");
const closeSettingsBtn = $("closeSettings");
const doneBtn = $("doneBtn");
const resetBtn = $("resetBtn");
const toastEl = $("toast");
const opacityInput = $("opacity");
const opacityValue = $("opacityValue");
const animateToggle = $("animateToggle");
const borderToggle = $("borderToggle");
const borderGrid = $("borderGrid");
const albumGrid = $("albumGrid");
const albumEmpty = $("albumEmpty");
const albumLoading = $("albumLoading");
const albumCount = $("albumCount");
const albumFolderLabel = $("albumFolder");
const pickFolderBtn = $("pickFolder");
const themeGrid = $("themeGrid");
const modeTabs = $("modeTabs");
const colorSwatches = $("colorSwatches");
const gradientGrid = $("gradientGrid");
const fontList = $("fontList");
const textColors = $("textColors");
const customBgColor = $("customBgColor");
const customTextColor = $("customTextColor");

const DEFAULT_FOLDER = "%USERPROFILE%\\Pictures";
const DEFAULT_FONT = '"Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif';

const THEMES = {
  dough: { name: "团子", accent: "#F4C542", onAccent: "#2B241D", tint: "#F5E4C0", sign: "躺平快乐" },
  student: { name: "学生党", accent: "#FFA9BC", onAccent: "#3F242B", tint: "#FADDE5", sign: "快乐躺平" },
  worker: { name: "打工人", accent: "#91AAE9", onAccent: "#18223A", tint: "#DCE5FA", sign: "我要躺平" },
  cat: { name: "摸鱼猫", accent: "#5CC9A7", onAccent: "#10322A", tint: "#D5F1E6", sign: "摸鱼中" },
};
const THEME_ORDER = ["dough", "student", "worker", "cat"];

const GRADIENTS = {
  sunrise: { name: "日出", css: "linear-gradient(135deg, #FFD8B2 0%, #FFF0C7 46%, #FFB7C7 100%)" },
  candy: { name: "糖果", css: "linear-gradient(135deg, #FFD1DC 0%, #E4C4FF 55%, #C7E9FF 100%)" },
  mint: { name: "薄荷", css: "linear-gradient(135deg, #CFF4E4 0%, #E7F3C1 55%, #FFF1C9 100%)" },
  ocean: { name: "海风", css: "linear-gradient(135deg, #BFE4FF 0%, #D6F4FF 55%, #C8F0E8 100%)" },
  aurora: { name: "极光", css: "linear-gradient(135deg, #C9B6FF 0%, #A9DFFF 45%, #B9F1DB 100%)" },
  peach: { name: "蜜桃", css: "linear-gradient(135deg, #FFCCB6 0%, #FFE2C6 55%, #FFF3C4 100%)" },
};
const GRADIENT_ORDER = ["sunrise", "candy", "mint", "ocean", "aurora", "peach"];

const COLORS = [
  { value: "#FFF8ED", name: "奶白" },
  { value: "#FFFFFF", name: "纯白" },
  { value: "#F7D9E0", name: "浅粉" },
  { value: "#DCE8FF", name: "浅蓝" },
  { value: "#FFF0BF", name: "浅黄" },
  { value: "#DDF3E8", name: "浅绿" },
  { value: "#3A332B", name: "深褐" },
  { value: "#8B1E2B", name: "酒红" },
  { value: "#B5643F", name: "陶土" },
  { value: "#6A4C93", name: "紫罗兰" },
];

const TEXT_COLORS = [
  { value: "#2B241D", name: "墨黑" },
  { value: "#111111", name: "纯黑" },
  { value: "#7E1F2B", name: "深红" },
  { value: "#B4582E", name: "赭橙" },
  { value: "#64721D", name: "橄榄" },
  { value: "#1F6F78", name: "鸭绿" },
  { value: "#355C9A", name: "靛蓝" },
  { value: "#6A4C93", name: "紫藤" },
  { value: "#FFFDF6", name: "米白" },
];

const FONTS = [
  { value: null, name: "默认", sample: "Aa 字" },
  { value: "Microsoft YaHei UI", name: "微软雅黑", sample: "永久 周" },
  { value: "SimHei", name: "黑体", sample: "永久 周" },
  { value: "SimSun", name: "宋体", sample: "永久 周" },
  { value: "KaiTi", name: "楷体", sample: "永久 周" },
  { value: "YouYuan", name: "幼圆", sample: "永久 周" },
  { value: "Georgia", name: "Georgia", sample: "Aa 字" },
  { value: "Consolas", name: "等宽", sample: "Aa 字" },
];

const BORDERS = [
  { value: "hairline", name: "细线" },
  { value: "cream", name: "奶油" },
  { value: "dash", name: "虚线" },
  { value: "double", name: "双线" },
  { value: "sticker", name: "贴纸" },
  { value: "neon", name: "霓虹" },
  { value: "rainbow", name: "彩虹" },
  { value: "dots", name: "圆点" },
];

const DEFAULTS = {
  theme: "dough",
  backgroundMode: "solid",
  backgroundColor: "#FFF8ED",
  gradient: "sunrise",
  animatedBackground: false,
  backgroundFolder: DEFAULT_FOLDER,
  backgroundImage: "",
  backgroundOpacity: 100,
  fontFamily: null,
  textColor: "#2B241D",
  showBorder: true,
  borderStyle: "hairline",
};

const DAY_NAMES = ["一", "二", "三", "四", "五", "六", "日"];
const SLOGANS = [
  { left: "周一", leftPy: "zhou yi", right: "加油", rightPy: "jia you" },
  { left: "周二", leftPy: "zhou er", right: "稳住", rightPy: "wen zhu" },
  { left: "周三", leftPy: "zhou san", right: "过半", rightPy: "guo ban" },
  { left: "周四", leftPy: "zhou si", right: "冲刺", rightPy: "chong ci" },
  { left: "周五", leftPy: "zhou wu", right: "到啦", rightPy: "dao la" },
  { left: "周末", leftPy: "zhou mo", right: "到啦", rightPy: "dao la" },
  { left: "周末", leftPy: "zhou mo", right: "到啦", rightPy: "dao la" },
];

let state = { ...DEFAULTS, imageUrl: "" };
const writes = new Map();
let sheetOpen = false;
let toastTimer = 0;
let clockTimer = 0;
let lastDayKey = "";
let albumToken = 0;
let albumFiles = [];
let albumState = "idle";
let albumMore = false;
let albumPath = "";
let picking = false;
let resetArmed = false;
let resetTimer = 0;

/* ── value hygiene ─────────────────────────────────────────── */

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function colorValue(value, fallback) {
  const text = String(value || "").trim();
  return HEX.test(text) ? text : fallback;
}

function pickerColor(value, fallback) {
  let text = colorValue(value, fallback);
  if (text.length === 4) text = `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
  return text.slice(0, 7).toUpperCase();
}

function fontStack(value) {
  if (!value) return DEFAULT_FONT;
  const clean = String(value).replace(/["'\\;{}]/g, "").replace(/\s+/g, " ").trim().slice(0, 64);
  return clean
    ? `"${clean}", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif`
    : DEFAULT_FONT;
}

function boolValue(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === "true" || value === 1;
}

function numberValue(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

function coerce(key, value) {
  switch (key) {
    case "theme": return THEMES[value] ? value : DEFAULTS.theme;
    case "backgroundMode": return ["solid", "gradient", "album"].includes(value) ? value : DEFAULTS.backgroundMode;
    case "backgroundColor": return colorValue(value, DEFAULTS.backgroundColor);
    case "gradient": return GRADIENTS[value] ? value : DEFAULTS.gradient;
    case "animatedBackground": return boolValue(value, DEFAULTS.animatedBackground);
    case "backgroundFolder": {
      const text = String(value === undefined || value === null ? DEFAULT_FOLDER : value).trim();
      return text || DEFAULT_FOLDER;
    }
    case "backgroundImage": return String(value === undefined || value === null ? "" : value).trim();
    case "backgroundOpacity": return numberValue(value, DEFAULTS.backgroundOpacity);
    case "fontFamily": {
      if (value === undefined) return DEFAULTS.fontFamily;
      if (value === null) return null;
      const text = String(value).trim();
      return text ? text.slice(0, 64) : null;
    }
    case "textColor": return colorValue(value, DEFAULTS.textColor);
    case "showBorder": return boolValue(value, DEFAULTS.showBorder);
    case "borderStyle": return BORDERS.some((item) => item.value === value) ? value : DEFAULTS.borderStyle;
    default: return value;
  }
}

function has(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
}

function stateFrom(raw, base) {
  const out = {};
  for (const key of Object.keys(DEFAULTS)) {
    const source = has(raw, key) ? raw[key] : has(base, key) ? base[key] : DEFAULTS[key];
    out[key] = coerce(key, source);
  }
  out.imageUrl = has(base, "imageUrl") ? base.imageUrl : "";
  return out;
}

/* ── colours ───────────────────────────────────────────────── */

function rgbOf(hex) {
  const text = colorValue(hex, "#2B241D");
  if (text.length === 4) {
    return [1, 2, 3].map((i) => parseInt(text[i] + text[i], 16));
  }
  return [1, 3, 5].map((i) => parseInt(text.slice(i, i + 2), 16));
}

function luminance(hex) {
  const [r, g, b] = rgbOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function sameColor(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

/* ── background ────────────────────────────────────────────── */

function paintLayer(el) {
  const mode = state.backgroundMode;
  const hasImage = mode === "album" && !!state.imageUrl;
  el.classList.toggle("gradient", mode === "gradient");
  el.classList.toggle("image", hasImage);
  el.classList.toggle("animated", mode === "gradient" && state.animatedBackground);
  el.style.backgroundColor = state.backgroundColor;
  if (mode === "gradient") {
    el.style.backgroundImage = GRADIENTS[state.gradient].css;
  } else if (hasImage) {
    el.style.backgroundImage = `url(${JSON.stringify(state.imageUrl)})`;
  } else {
    el.style.backgroundImage = "none";
  }
}

function applyLook() {
  const theme = THEMES[state.theme] || THEMES.dough;
  const light = luminance(state.textColor) > 0.56;

  card.style.setProperty("--fg", state.textColor);
  card.style.setProperty("--font", fontStack(state.fontFamily));
  card.style.setProperty("--accent", theme.accent);
  card.style.setProperty("--on-accent", theme.onAccent);
  card.style.setProperty("--theme-tint", theme.tint);
  card.style.setProperty("--bg-opacity", String(state.backgroundOpacity / 100));
  card.style.setProperty("--scrim-top", light ? "rgba(20, 17, 14, .36)" : "rgba(255, 255, 255, .34)");
  card.style.setProperty("--scrim-bottom", light ? "rgba(20, 17, 14, .12)" : "rgba(255, 255, 255, .10)");
  card.style.setProperty("--halo", light ? "rgba(0, 0, 0, .45)" : "rgba(255, 255, 255, .72)");

  const frame = state.showBorder ? state.borderStyle : "none";
  card.dataset.frame = frame;
  card.dataset.bg = state.backgroundMode;
  card.dataset.tone = light ? "light" : "dark";
  $("mini").dataset.frame = frame;

  paintLayer(bg);
  paintLayer(miniBg);

  $("heroUse").setAttribute("href", `#m-${state.theme}`);
  $("miniUse").setAttribute("href", `#m-${state.theme}`);
  $("sign").textContent = theme.sign;
  $("miniSign").textContent = theme.sign;
  $("miniLeft").textContent = $("leftWord").textContent;
  $("miniRight").textContent = $("rightWord").textContent;
}

/* ── week ──────────────────────────────────────────────────── */

function pad2(n) { return String(n).padStart(2, "0"); }
function dayKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

function startOfWeek(now) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function rangeText(start) {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 12);
  if (start.getMonth() === end.getMonth()) {
    return `${start.getMonth() + 1}月${start.getDate()}日 – ${end.getDate()}日`;
  }
  return `${start.getMonth() + 1}月${start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`;
}

function renderWeek(now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  const start = startOfWeek(today);
  const weekNo = isoWeek(today);
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const weekIndex = isWeekend ? 5 : (today.getDay() + 6) % 7;

  $("weekNo").textContent = `第 ${weekNo} 周`;
  $("weekKind").textContent = isWeekend ? "周末" : "工作日";
  $("rangeLabel").textContent = rangeText(start);
  $("rangeLabel").title = `${start.getFullYear()}年${rangeText(start)}`;

  const slogan = SLOGANS[today.getDay() === 0 ? 5 : weekIndex];
  $("leftWord").textContent = slogan.left;
  $("leftPy").textContent = slogan.leftPy;
  $("rightWord").textContent = slogan.right;
  $("rightPy").textContent = slogan.rightPy;
  $("miniLeft").textContent = slogan.left;
  $("miniRight").textContent = slogan.right;

  const days = $("days");
  days.replaceChildren();
  const todayKey = dayKey(today);
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12);
    const item = document.createElement("li");
    item.className = "day";
    if (i >= 5) item.classList.add("weekend");
    if (dayKey(d) === todayKey) {
      item.classList.add("today");
      item.setAttribute("aria-current", "date");
    }
    item.title = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${DAY_NAMES[i]}`;
    item.setAttribute("aria-label", item.title);

    const wd = document.createElement("span");
    wd.className = "wd";
    wd.textContent = DAY_NAMES[i];
    const num = document.createElement("span");
    num.className = "num";
    num.textContent = String(d.getDate());
    item.append(wd, num);
    days.append(item);
  }

  let elapsed;
  let note;
  if (isWeekend) {
    elapsed = 5;
    note = today.getDay() === 0 ? "明天周一，收收心" : "周末愉快，下周一见";
  } else {
    elapsed = weekIndex + 1;
    note = weekIndex === 4 ? "今天是本周最后一个工作日" : `还剩 ${4 - weekIndex} 个工作日`;
  }
  const pct = elapsed * 20;
  $("progressLabel").textContent = isWeekend
    ? `本周 ${elapsed}/5 个工作日`
    : `本周已过 ${elapsed}/5 个工作日`;
  $("progressPct").textContent = `${pct}%`;
  $("progressFill").style.width = `${pct}%`;
  $("progress").setAttribute("aria-valuenow", String(pct));
  $("progress").setAttribute("aria-valuetext", `${elapsed} / 5 个工作日`);
  $("footNote").textContent = note;
  lastDayKey = dayKey(today);
}

function tick() {
  const now = new Date();
  if (dayKey(now) !== lastDayKey) renderWeek(now);
}

/* ── setting writers ───────────────────────────────────────── */

function toast(message, ms = 2200) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { toastEl.hidden = true; }, ms);
}

function persist(key, value) {
  const seq = (writes.get(key) || 0) + 1;
  writes.set(key, seq);
  const attempt = widget.settings.set(key, value);
  if (!attempt || typeof attempt.catch !== "function") return;
  attempt.catch((error) => {
    if (writes.get(key) !== seq) return;
    if (typeof widget.log === "function") {
      widget.log(`weekcal: setting ${key} failed: ${error && error.message ? error.message : error}`);
    }
    const fallback = coerce(key, has(widget.settings.get(), key) ? widget.settings.get(key) : DEFAULTS[key]);
    state[key] = fallback;
    applyLook();
    syncControls();
    toast("外观没有保存成功，请再试一次");
  });
}

function persistMany(items) {
  for (const [key, value] of items) persist(key, value);
}

function setTheme(key) {
  if (!THEMES[key] || state.theme === key) return;
  state.theme = key;
  applyLook();
  syncControls();
  persist("theme", key);
}

function setMode(mode) {
  if (!["solid", "gradient", "album"].includes(mode)) return;
  if (state.backgroundMode !== mode) {
    state.backgroundMode = mode;
    applyLook();
    syncControls();
    persist("backgroundMode", mode);
  }
  if (mode === "album" && !albumFiles.length && albumState !== "loading") loadAlbum(true);
}

function setBackgroundColor(value) {
  const color = colorValue(value, state.backgroundColor);
  state.backgroundColor = color;
  state.backgroundMode = "solid";
  applyLook();
  syncControls();
  persistMany([["backgroundColor", color], ["backgroundMode", "solid"]]);
}

function setGradient(key) {
  if (!GRADIENTS[key]) return;
  state.gradient = key;
  state.backgroundMode = "gradient";
  applyLook();
  syncControls();
  persistMany([["gradient", key], ["backgroundMode", "gradient"]]);
}

function setTextColor(value) {
  const color = colorValue(value, state.textColor);
  state.textColor = color;
  applyLook();
  syncControls();
  persist("textColor", color);
}

function setFont(value) {
  state.fontFamily = value || null;
  applyLook();
  syncControls();
  persist("fontFamily", state.fontFamily);
}

function setBorder(on) {
  state.showBorder = !!on;
  applyLook();
  syncControls();
  persist("showBorder", state.showBorder);
}

function setBorderStyle(style) {
  if (!BORDERS.some((item) => item.value === style)) return;
  state.borderStyle = style;
  if (!state.showBorder) state.showBorder = true;
  applyLook();
  syncControls();
  persistMany([["borderStyle", style], ["showBorder", state.showBorder]]);
}

/* ── album ─────────────────────────────────────────────────── */

function samePath(a, b) {
  const clean = (v) => String(v || "").replace(/\//g, "\\").replace(/\\+$/g, "").toLowerCase();
  return clean(a) === clean(b);
}

function folderTitle(path) {
  if (!path) return "还没有选择相册";
  const parts = String(path).split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(path);
}

function setAlbumStatus(text) {
  albumEmpty.textContent = text;
  albumEmpty.hidden = !text;
}

function renderAlbum() {
  albumGrid.replaceChildren();
  albumLoading.hidden = true;
  if (!state.backgroundFolder) {
    albumCount.textContent = "还没有选择相册";
    albumFolderLabel.textContent = "从本机挑选一个放照片的文件夹";
    albumFolderLabel.title = "";
    setAlbumStatus("");
    return;
  }

  albumFolderLabel.textContent = albumPath || state.backgroundFolder;
  albumFolderLabel.title = albumPath || state.backgroundFolder;

  if (albumState === "loading") {
    albumCount.textContent = "正在读取相册…";
    albumLoading.hidden = false;
    setAlbumStatus("");
    return;
  }
  if (albumState === "error") {
    albumCount.textContent = "读取失败";
    setAlbumStatus("读取相册失败，请换一个文件夹再试。");
    return;
  }
  if (albumState === "empty") {
    albumCount.textContent = "没有找到图片";
    setAlbumStatus("这个文件夹里还没有图片。换一个文件夹，或放几张照片进去。");
    return;
  }
  if (albumState !== "ready") {
    albumCount.textContent = "等待读取";
    setAlbumStatus("");
    return;
  }

  const all = albumFiles;
  const selected = all.find((file) => samePath(file.path, state.backgroundImage));
  const shown = all.slice(0, 24);
  if (selected && !shown.some((file) => samePath(file.path, selected.path))) shown.unshift(selected);

  albumCount.textContent = all.length ? `${all.length}${albumMore ? "+" : ""} 张图片` : "没有找到图片";
  setAlbumStatus(all.length ? "" : "这个文件夹里还没有图片。换一个文件夹，或放几张照片进去。");

  for (const file of shown) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";
    btn.title = file.name;
    btn.setAttribute("aria-label", `把背景换成 ${file.name}`);
    btn.setAttribute("aria-pressed", String(!!selected && samePath(file.path, selected.path)));
    let url = "";
    try {
      url = widget.files.url(file, { width: 180 });
    } catch (error) {
      continue;
    }
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = url;
    btn.append(img);
    btn.addEventListener("click", () => chooseImage(file));
    albumGrid.append(btn);
  }
}

function chooseImage(file) {
  if (!file) return;
  state.backgroundImage = file.path;
  state.backgroundMode = "album";
  try {
    state.imageUrl = widget.files.url(file, { width: 900 });
  } catch (error) {
    state.imageUrl = "";
    toast("这张图片读不出来，换一张试试");
    return;
  }
  applyLook();
  syncControls();
  renderAlbum();
  persistMany([["backgroundImage", file.path], ["backgroundMode", "album"]]);
  toast(`已换成「${file.name}」`);
}

async function loadAlbum(showFeedback) {
  const token = ++albumToken;
  const folder = state.backgroundFolder;
  if (!folder) {
    albumFiles = [];
    albumPath = "";
    albumState = "empty";
    renderAlbum();
    return;
  }

  albumState = "loading";
  if (showFeedback && sheetOpen) renderAlbum();

  try {
    const result = await widget.files.list("backgroundFolder", { recursive: false });
    if (token !== albumToken) return;
    albumPath = result && result.folder ? result.folder : folder;
    albumFiles = (result && Array.isArray(result.files)) ? result.files : [];
    albumMore = !!(result && result.more);
    albumState = albumFiles.length ? "ready" : "empty";

    const selected = albumFiles.find((file) => samePath(file.path, state.backgroundImage));
    if (selected) {
      state.imageUrl = widget.files.url(selected, { width: 900 });
    } else if (state.backgroundImage) {
      state.imageUrl = "";
      if (state.backgroundMode === "album") {
        applyLook();
        toast("这张背景图不在相册里了，请重新选一张");
      }
    } else {
      state.imageUrl = "";
    }
    applyLook();
    renderAlbum();
    if (showFeedback && !sheetOpen) toast(albumFiles.length ? "相册已更新" : "这个文件夹里没有图片");
  } catch (error) {
    if (token !== albumToken) return;
    if (typeof widget.log === "function") {
      widget.log(`weekcal: album failed: ${error && error.message ? error.message : error}`);
    }
    albumFiles = [];
    albumPath = folder;
    albumState = "error";
    renderAlbum();
    if (showFeedback && sheetOpen) toast("读取相册失败，请换一个文件夹再试");
  }
}

async function pickAlbum() {
  if (picking) return;
  picking = true;
  pickFolderBtn.disabled = true;
  pickFolderBtn.textContent = "正在选择…";
  try {
    const folder = await widget.files.pick("backgroundFolder");
    if (folder) {
      state.backgroundFolder = folder;
      state.backgroundMode = "album";
      state.imageUrl = "";
      albumFiles = [];
      applyLook();
      syncControls();
      persist("backgroundMode", "album");
      await loadAlbum(false);
      toast(albumFiles.length ? `已选择「${folderTitle(folder)}」，点一张当背景` : "这个文件夹里没有图片");
    }
  } catch (error) {
    if (typeof widget.log === "function") {
      widget.log(`weekcal: album pick failed: ${error && error.message ? error.message : error}`);
    }
    toast("没能打开文件夹选择窗口");
  } finally {
    picking = false;
    pickFolderBtn.disabled = false;
    pickFolderBtn.textContent = state.backgroundFolder ? "更换相册" : "选择相册";
  }
}

/* ── controls ──────────────────────────────────────────────── */

function svgUse(themeKey) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 240 150");
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS(ns, "use");
  use.setAttribute("href", `#m-${themeKey}`);
  svg.append(use);
  return svg;
}

function buildThemes() {
  for (const key of THEME_ORDER) {
    const theme = THEMES[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-btn";
    btn.dataset.theme = key;
    btn.style.setProperty("--tint", theme.tint);
    btn.setAttribute("aria-label", theme.name);
    btn.setAttribute("aria-pressed", "false");

    const face = document.createElement("span");
    face.className = "theme-face";
    face.append(svgUse(key));
    const name = document.createElement("span");
    name.className = "theme-name";
    name.textContent = theme.name;
    btn.append(face, name);
    btn.addEventListener("click", () => setTheme(key));
    themeGrid.append(btn);
  }
}

function buildBackgroundChoices() {
  for (const item of COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.style.setProperty("--v", item.value);
    btn.setAttribute("aria-label", item.name);
    btn.setAttribute("aria-pressed", "false");
    btn.title = item.name;
    btn.addEventListener("click", () => setBackgroundColor(item.value));
    colorSwatches.append(btn);
  }

  for (const key of GRADIENT_ORDER) {
    const item = GRADIENTS[key];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grad";
    btn.dataset.gradient = key;
    btn.style.setProperty("--v", item.css);
    btn.setAttribute("aria-label", item.name);
    btn.setAttribute("aria-pressed", "false");
    btn.title = `${item.name}渐变`;
    const label = document.createElement("span");
    label.textContent = item.name;
    btn.append(label);
    btn.addEventListener("click", () => setGradient(key));
    gradientGrid.append(btn);
  }

  for (const item of TEXT_COLORS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "color-dot";
    btn.style.setProperty("--v", item.value);
    btn.setAttribute("aria-label", item.name);
    btn.setAttribute("aria-pressed", "false");
    btn.title = item.name;
    btn.addEventListener("click", () => setTextColor(item.value));
    textColors.append(btn);
  }
}

function buildFonts() {
  for (const item of FONTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "font-btn";
    btn.dataset.font = item.value || "";
    btn.setAttribute("aria-pressed", "false");
    btn.title = item.value || "使用卡片默认字体";
    const sample = document.createElement("span");
    sample.className = "sample";
    sample.style.fontFamily = item.value ? fontStack(item.value) : DEFAULT_FONT;
    sample.textContent = item.sample;
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.name;
    btn.append(sample, name);
    btn.addEventListener("click", () => setFont(item.value));
    fontList.append(btn);
  }
}

function buildBorders() {
  for (const item of BORDERS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "border-btn";
    btn.dataset.style = item.value;
    btn.setAttribute("aria-pressed", "false");
    btn.title = `${item.name}边框`;
    const preview = document.createElement("span");
    preview.className = "bp";
    preview.dataset.frame = item.value;
    const label = document.createElement("span");
    label.className = "bl";
    label.textContent = item.name;
    btn.append(preview, label);
    btn.addEventListener("click", () => setBorderStyle(item.value));
    borderGrid.append(btn);
  }
}

function syncControls() {
  for (const btn of themeGrid.querySelectorAll(".theme-btn")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.theme === state.theme));
  }

  for (const btn of modeTabs.querySelectorAll("button[data-mode]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.mode === state.backgroundMode));
  }
  $("paneSolid").hidden = state.backgroundMode !== "solid";
  $("paneGradient").hidden = state.backgroundMode !== "gradient";
  $("paneAlbum").hidden = state.backgroundMode !== "album";

  for (const btn of colorSwatches.querySelectorAll(".swatch")) {
    btn.setAttribute("aria-pressed", String(sameColor(btn.style.getPropertyValue("--v").trim(), state.backgroundColor)));
  }
  customBgColor.value = pickerColor(state.backgroundColor, DEFAULTS.backgroundColor);

  for (const btn of gradientGrid.querySelectorAll(".grad")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.gradient === state.gradient));
  }
  animateToggle.setAttribute("aria-checked", String(state.animatedBackground));
  animateToggle.disabled = state.backgroundMode !== "gradient";

  opacityInput.value = String(state.backgroundOpacity);
  opacityInput.style.setProperty("--range-pct", `${state.backgroundOpacity}%`);
  opacityValue.textContent = `${state.backgroundOpacity}%`;

  for (const btn of fontList.querySelectorAll(".font-btn")) {
    const value = btn.dataset.font || null;
    btn.setAttribute("aria-pressed", String((state.fontFamily || null) === value));
  }

  for (const btn of textColors.querySelectorAll(".color-dot")) {
    btn.setAttribute("aria-pressed", String(sameColor(btn.style.getPropertyValue("--v").trim(), state.textColor)));
  }
  customTextColor.value = pickerColor(state.textColor, DEFAULTS.textColor);

  borderToggle.setAttribute("aria-checked", String(state.showBorder));
  borderGrid.setAttribute("aria-disabled", String(!state.showBorder));
  for (const btn of borderGrid.querySelectorAll(".border-btn")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.style === state.borderStyle));
    btn.disabled = !state.showBorder;
  }

  if (state.backgroundMode === "album") {
    if (albumState === "idle" && state.backgroundFolder) loadAlbum(false);
    else renderAlbum();
  }
  if (!picking) pickFolderBtn.textContent = state.backgroundFolder ? "更换相册" : "选择相册";
}

/* ── sheet ─────────────────────────────────────────────────── */

function openSheet() {
  if (sheetOpen) return;
  sheetOpen = true;
  settingsPane.hidden = false;
  calendar.inert = true;
  calendar.setAttribute("aria-hidden", "true");
  syncControls();
  if (state.backgroundMode === "album" && albumState !== "loading") loadAlbum(false);
  sheet.focus();
}

function closeSheet() {
  if (!sheetOpen) return;
  sheetOpen = false;
  settingsPane.hidden = true;
  calendar.inert = false;
  calendar.removeAttribute("aria-hidden");
  disarmReset();
  openSettingsBtn.focus();
}

function disarmReset() {
  resetArmed = false;
  clearTimeout(resetTimer);
  resetBtn.textContent = "恢复默认";
  resetBtn.classList.remove("armed");
}

function resetAll() {
  const folder = state.backgroundFolder;
  state = { ...DEFAULTS, imageUrl: "", backgroundFolder: folder };
  applyLook();
  syncControls();
  const values = Object.keys(DEFAULTS)
    .filter((key) => key !== "backgroundFolder")
    .map((key) => [key, DEFAULTS[key]]);
  persistMany(values);
  disarmReset();
  toast("已恢复默认外观");
  renderAlbum();
}

function alarmReset() {
  disarmReset();
  resetArmed = true;
  resetBtn.textContent = "再点一次恢复默认";
  resetBtn.classList.add("armed");
  resetTimer = window.setTimeout(disarmReset, 4200);
}

function onResetClick() {
  if (!resetArmed) {
    alarmReset();
    toast("再点一次，全部外观回到默认");
    return;
  }
  resetAll();
}

function focusables() {
  return [...settingsPane.querySelectorAll("button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex='-1'])")]
    .filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length);
}

function onSheetKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeSheet();
    return;
  }
  if (event.key !== "Tab") return;
  const items = focusables();
  if (!items.length) {
    event.preventDefault();
    sheet.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === sheet)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/* ── events ────────────────────────────────────────────────── */

openSettingsBtn.addEventListener("click", openSheet);
closeSettingsBtn.addEventListener("click", closeSheet);
doneBtn.addEventListener("click", closeSheet);
sheet.addEventListener("keydown", onSheetKeydown);
settingsPane.addEventListener("pointerdown", (event) => {
  if (event.target === settingsPane) closeSheet();
});

for (const btn of modeTabs.querySelectorAll("button[data-mode]")) {
  btn.addEventListener("click", () => setMode(btn.dataset.mode));
}

opacityInput.addEventListener("input", () => {
  state.backgroundOpacity = numberValue(opacityInput.value, state.backgroundOpacity);
  card.style.setProperty("--bg-opacity", String(state.backgroundOpacity / 100));
  opacityInput.style.setProperty("--range-pct", `${state.backgroundOpacity}%`);
  opacityValue.textContent = `${state.backgroundOpacity}%`;
});
opacityInput.addEventListener("change", () => persist("backgroundOpacity", state.backgroundOpacity));

customBgColor.addEventListener("input", () => {
  const color = colorValue(customBgColor.value, state.backgroundColor);
  state.backgroundColor = color;
  state.backgroundMode = "solid";
  applyLook();
  syncControls();
});
customBgColor.addEventListener("change", () => {
  persistMany([["backgroundColor", state.backgroundColor], ["backgroundMode", "solid"]]);
});

customTextColor.addEventListener("input", () => {
  const color = colorValue(customTextColor.value, state.textColor);
  state.textColor = color;
  applyLook();
  syncControls();
});
customTextColor.addEventListener("change", () => persist("textColor", state.textColor));

animateToggle.addEventListener("click", () => {
  state.animatedBackground = !state.animatedBackground;
  applyLook();
  syncControls();
  persist("animatedBackground", state.animatedBackground);
});

borderToggle.addEventListener("click", () => setBorder(!state.showBorder));
pickFolderBtn.addEventListener("click", pickAlbum);
resetBtn.addEventListener("click", onResetClick);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});

window.addEventListener("pagehide", () => {
  clearInterval(clockTimer);
  clearTimeout(toastTimer);
  clearTimeout(resetTimer);
}, { once: true });

/* ── boot ──────────────────────────────────────────────────── */

function boot() {
  state = stateFrom(widget.settings.get() || {}, { ...DEFAULTS, imageUrl: "" });

  buildThemes();
  buildBackgroundChoices();
  buildFonts();
  buildBorders();

  applyLook();
  syncControls();
  renderWeek(new Date());

  if (state.backgroundMode === "album" && state.backgroundFolder) loadAlbum(false);
  clockTimer = window.setInterval(tick, 60000);

  widget.settings.onChange((values) => {
    const before = state;
    const next = stateFrom(values, state);
    if (!samePath(before.backgroundImage, next.backgroundImage) || !samePath(before.backgroundFolder, next.backgroundFolder)) {
      next.imageUrl = "";
      if (next.backgroundMode === "album") loadAlbum(false);
    } else {
      next.imageUrl = before.imageUrl;
    }
    state = next;
    applyLook();
    syncControls();
  });
}

if (window.widget && widget.settings) boot();
