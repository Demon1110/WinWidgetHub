/* 工时日历：节假日与调休来自 holiday-cn（MIT，国务院公告整理），按年拉一次并缓存到本机。
 * 拿不到就退回只看周末，不假装数据齐全。 */

const t = widget.t;
const monthEl = document.getElementById("month");
const weekEl = document.getElementById("week");
const gridEl = document.getElementById("grid");
const footEl = document.getElementById("foot");
const toastEl = document.getElementById("toast");

const SOURCE = (year) => `https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/${year}.json`;

let view = new Date();
view.setDate(1);
const holidays = new Map(); // "2026-01-01" → { off: bool, name }
let holidayState = "idle"; // idle | loading | ok | fail

const pad = (n) => String(n).padStart(2, "0");
const key = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function loadHolidays(year) {
  if (holidayState === "loading") return;
  if ([...holidays.keys()].some((k) => k.startsWith(`${year}-`))) return;
  holidayState = "loading";
  const cached = await widget.storage.get(`holidays-${year}`).catch(() => null);
  if (cached && cached.days) {
    apply(cached.days);
    holidayState = "ok";
    draw();
    return;
  }
  try {
    const raw = await widget.fetch(SOURCE(year));
    const text = typeof raw === "string" ? raw : await raw.text();
    const data = JSON.parse(text);
    apply(data.days || []);
    holidayState = "ok";
    widget.storage.set(`holidays-${year}`, { days: data.days || [] }).catch(() => {});
  } catch (e) {
    holidayState = "fail";
    widget.log(`worktime: holidays ${e.message}`);
  }
  draw();
}

function apply(days) {
  for (const day of days) {
    if (!day || !day.date) continue;
    holidays.set(day.date, { off: !!day.isOffDay, name: day.name || "" });
  }
}

/** 这天算不算上班：先看公告，再退到周末 + 大小周。 */
function isWork(date) {
  const hit = holidays.get(key(date));
  if (hit) return !hit.off;
  const wd = date.getDay();
  if (wd === 0) return false;
  if (wd === 6) {
    const mode = widget.settings.get("weekend") || "two";
    if (mode === "six") return true;
    if (mode === "big") {
      const nth = Math.ceil(date.getDate() / 7);
      return nth % 2 === 1;
    }
    return false;
  }
  return true;
}

function draw() {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();

  monthEl.textContent = `${year} · ${month + 1}`;

  weekEl.innerHTML = "";
  for (const label of ["日", "一", "二", "三", "四", "五", "六"]) {
    const el = document.createElement("span");
    el.textContent = t({ "zh-TW": label, "zh-CN": label, en: ["S", "M", "T", "W", "T", "F", "S"][["日", "一", "二", "三", "四", "五", "六"].indexOf(label)] });
    weekEl.appendChild(el);
  }

  gridEl.innerHTML = "";
  for (let i = 0; i < lead; i += 1) gridEl.appendChild(document.createElement("span")).className = "blank";

  let work = 0;
  let left = 0;
  const today = new Date();
  for (let d = 1; d <= days; d += 1) {
    const date = new Date(year, month, d);
    const cell = document.createElement("span");
    cell.className = "day";
    cell.textContent = String(d);
    const workDay = isWork(date);
    cell.classList.add(workDay ? "work" : "off");
    const hit = holidays.get(key(date));
    if (hit && hit.name) cell.title = hit.name;
    if (hit && hit.off) cell.classList.add("mark");
    if (hit && !hit.off) cell.classList.add("makeup");
    if (key(date) === key(today)) cell.classList.add("now");
    if (workDay) {
      work += 1;
      if (date > today) left += 1;
    }
    gridEl.appendChild(cell);
  }

  const tail = document.createElement("span");
  tail.className = "blank";
  gridEl.appendChild(tail);

  footEl.textContent = [
    `${t({ "zh-TW": "本月上班 ", "zh-CN": "本月上班 ", en: "Work days " })}${work}`,
    `${t({ "zh-TW": "還要 ", "zh-CN": "还要 ", en: "Left " })}${left}`,
    holidayState === "ok" ? "●" : holidayState === "fail" ? t({ "zh-TW": "節假日表沒取到", "zh-CN": "节假日表没取到", en: "No holiday data" }) : "…",
  ].join(" · ");
}

document.getElementById("prev").onclick = () => {
  view = new Date(view.getFullYear(), view.getMonth() - 1, 1);
  loadHolidays(view.getFullYear());
  draw();
};
document.getElementById("next").onclick = () => {
  view = new Date(view.getFullYear(), view.getMonth() + 1, 1);
  loadHolidays(view.getFullYear());
  draw();
};

gridEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".day");
  if (!cell) return;
  const day = Number(cell.textContent);
  const date = new Date(view.getFullYear(), view.getMonth(), day);
  const text = `${key(date)} ${isWork(date) ? t({ "zh-TW": "上班", "zh-CN": "上班", en: "work" }) : t({ "zh-TW": "休息", "zh-CN": "休息", en: "off" })}${holidays.get(key(date))?.name ? " · " + holidays.get(key(date)).name : ""}`;
  widget.clipboard.writeText(text)
    .then(() => widget.util.toast(toastEl, text, 1600))
    .catch((err) => widget.util.toast(toastEl, err.message, 2000));
});

widget.settings.onChange(draw);
loadHolidays(view.getFullYear());
draw();
