const t = widget.t;
const board = document.getElementById("board");
const timeEl = document.getElementById("time");
const secEl = document.getElementById("sec");
const dayEl = document.getElementById("day");
const detailEl = document.getElementById("detail");
const countLabel = document.getElementById("countLabel");
const countNum = document.getElementById("countNum");
const countSub = document.getElementById("countSub");
const noteText = document.getElementById("noteText");
const saved = document.getElementById("saved");

let opts = { panels: "all", hour12: false, target: "", label: "" };
let noteTimer = 0;
let clockTimer = 0;

const WEEK = {
  "zh-TW": ["週日", "週一", "週二", "週三", "週四", "週五", "週六"],
  "zh-CN": ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};
const MONTH = {
  "zh-TW": ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"],
  "zh-CN": ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
const lang = () => document.documentElement.lang || "zh-CN";
const pick = (table) => table[lang()] || table["zh-CN"] || table.en;

function two(n) {
  return String(n).padStart(2, "0");
}

function tick() {
  const now = new Date();
  let h = now.getHours();
  let suffix = "";
  if (opts.hour12) {
    suffix = h < 12 ? "AM" : "PM";
    h = h % 12 || 12;
  }
  timeEl.textContent = `${opts.hour12 ? h : two(h)}:${two(now.getMinutes())}`;
  secEl.textContent = `${two(now.getSeconds())}${suffix ? ` ${suffix}` : ""}`;

  dayEl.textContent = String(now.getDate());
  detailEl.textContent = `${pick(MONTH).length ? pick(MONTH)[now.getMonth()] : now.getMonth() + 1} · ${pick(WEEK)[now.getDay()]}`;

  renderCount(now);
}

function parseTarget() {
  const raw = String(opts.target || "").trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function renderCount(now) {
  if (!opts.target) {
    countLabel.textContent = t({ "zh-TW": "倒數", "zh-CN": "倒数", en: "Countdown" });
    countNum.textContent = "—";
    countSub.textContent = t({ "zh-TW": "在设置里填目标日期", "zh-CN": "在设置里填目标日期", en: "Set a date in settings" });
    return;
  }
  const target = parseTarget();
  if (!target) {
    countNum.textContent = "?";
    countSub.textContent = t({ "zh-TW": "日期格式应为 YYYY-MM-DD", "zh-CN": "日期格式应为 YYYY-MM-DD", en: "Use YYYY-MM-DD" });
    return;
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const days = Math.round((startOfTarget - startOfToday) / 86400000);
  countLabel.textContent = opts.label || t({ "zh-TW": "倒數", "zh-CN": "倒数", en: "Countdown" });
  if (days === 0) {
    countNum.textContent = t({ "zh-TW": "就是今天", "zh-CN": "就是今天", en: "Today" });
  } else {
    countNum.textContent = `${Math.abs(days)} ${t({ "zh-TW": "天", "zh-CN": "天", en: "days" })}`;
  }
  const dateText = `${target.getFullYear()}-${two(target.getMonth() + 1)}-${two(target.getDate())}`;
  countSub.textContent = days > 0
    ? t({ "zh-TW": `還有 · ${dateText}`, "zh-CN": `还有 · ${dateText}`, en: `left · ${dateText}` })
    : days < 0
      ? t({ "zh-TW": `已過 · ${dateText}`, "zh-CN": `已过 · ${dateText}`, en: `past · ${dateText}` })
      : dateText;
}

function layout() {
  for (const panel of board.querySelectorAll(".panel")) {
    const kind = panel.dataset.panel;
    const show = opts.panels === "all" || (opts.panels === "time" ? kind === "clock" || kind === "date" : kind === "count" || kind === "note");
    panel.hidden = !show;
  }
  const onlyTime = opts.panels === "time";
  board.style.gridTemplateColumns = onlyTime ? "1fr" : "1.15fr 1fr";
  board.style.gridTemplateRows = onlyTime ? "1fr 1fr" : "1.15fr 1fr";
}

function apply(s) {
  opts = Object.assign(opts, s || {});
  layout();
  tick();
}

async function loadNote() {
  try {
    const value = await widget.storage.get("note");
    noteText.value = typeof value === "string" ? value : "";
  } catch (e) {
    noteText.value = "";
  }
}

noteText.addEventListener("input", () => {
  clearTimeout(noteTimer);
  noteTimer = setTimeout(async () => {
    await widget.storage.set("note", noteText.value);
    saved.textContent = t({ "zh-TW": "已存", "zh-CN": "已存", en: "Saved" });
    saved.classList.add("show");
    setTimeout(() => saved.classList.remove("show"), 1200);
  }, 700);
});

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
loadNote();
tick();
clockTimer = setInterval(tick, 1000);

document.addEventListener("visibilitychange", () => {
  clearInterval(clockTimer);
  clockTimer = 0;
  if (!document.hidden) {
    tick();
    clockTimer = setInterval(tick, 1000);
  }
});
