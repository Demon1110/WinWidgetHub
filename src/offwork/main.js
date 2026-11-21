/* 下班有数：把「距离下班还有多久」换算成小时分钟秒，顺带给出今天的进度条。
 * 周末直接说休息；超过下班时间就从零往上数加班时长。 */

const t = widget.t;
const labelEl = document.getElementById("label");
const spanEl = document.getElementById("span");
const numEl = document.getElementById("num");
const barEl = document.getElementById("bar");
const barIn = barEl.querySelector("i");
const footEl = document.getElementById("foot");

function clock(hhmm) {
  const [h, m] = String(hhmm || "09:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

function pretty(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function short(ms) {
  const total = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} 分`;
  return m ? `${h} 时 ${m} 分` : `${h} 小时`;
}

function tick() {
  const now = new Date();
  const start = clock(widget.settings.get("start"));
  const end = clock(widget.settings.get("end"));
  const day = now.getDay();
  const weekend = day === 0 || day === 6;

  spanEl.textContent = `${widget.settings.get("start")} – ${widget.settings.get("end")}`;
  footEl.textContent = `${t({ "zh-TW": "今日工時", "zh-CN": "今日工时", en: "Today" })} ${short(end - start)}`;

  if (weekend) {
    labelEl.textContent = t({ "zh-TW": "週末", "zh-CN": "周末", en: "Weekend" });
    numEl.textContent = t({ "zh-TW": "休息", "zh-CN": "休息", en: "Rest" });
    numEl.classList.add("is-rest");
    barIn.style.width = "0%";
    return;
  }
  numEl.classList.remove("is-rest");

  const total = end - start;
  if (now < start) {
    labelEl.textContent = t({ "zh-TW": "距上班", "zh-CN": "距上班", en: "Until start" });
    numEl.textContent = pretty(start - now);
    barIn.style.width = "0%";
  } else if (now < end) {
    labelEl.textContent = t({ "zh-TW": "距下班", "zh-CN": "距下班", en: "Until off" });
    numEl.textContent = pretty(end - now);
    barIn.style.width = `${Math.min(100, ((now - start) / total) * 100).toFixed(1)}%`;
  } else {
    labelEl.textContent = t({ "zh-TW": "已加班", "zh-CN": "已加班", en: "Overtime" });
    numEl.textContent = pretty(now - end);
    barIn.style.width = "100%";
  }
  barEl.classList.toggle("is-warn", now >= end);
}

widget.settings.onChange(tick);
widget.on("show", tick);

tick();
setInterval(tick, 1000);
