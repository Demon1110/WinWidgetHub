const $ = (id) => document.getElementById(id);
const zh = widget.locale.toLowerCase().startsWith("zh");
const hans = /^zh-(cn|sg|hans|mo)/i.test(widget.locale);
const t = (cn, tw, en) => (zh ? (hans ? cn : tw) : en);

const params = new URLSearchParams(location.search);
let data = {};
try {
  data = JSON.parse(params.get("data") || "{}");
} catch (err) {
  console.error(err);
}

const repeatLabel = (v) =>
  ({
    none: t("单次", "單次", "Once"),
    daily: t("每天", "每天", "Daily"),
    weekdays: t("工作日", "工作日", "Weekdays"),
    weekly: t("每周", "每週", "Weekly"),
    monthly: t("每月", "每月", "Monthly"),
  }[v] || t("单次", "單次", "Once"));

function fmtTime(ms) {
  if (!ms) return "";
  return new Intl.DateTimeFormat(widget.locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function send(type) {
  if (data.id) utools.sendToParent("reminder-action", { type, id: data.id });
}

$("alertEyebrow").textContent = t("提醒时间到了", "提醒時間到了", "REMINDER");
$("alertClose").title = t("关闭", "關閉", "Close");
$("alertDismiss").textContent = t("知道了", "知道了", "Dismiss");
$("alertDone").textContent = t("完成", "完成", "Done");
$("alertTitle").textContent = data.title || t("未命名提醒", "未命名提醒", "Untitled reminder");
$("alertNote").textContent = data.note || "";
$("alertNote").hidden = !data.note;
$("alertTime").textContent = fmtTime(Number(data.dueAt));
$("alertRepeat").textContent = repeatLabel(data.repeat);
$("alertRepeat").hidden = data.repeat === "none";

$("alertClose").addEventListener("click", () => send("alert-dismiss"));
$("alertDismiss").addEventListener("click", () => send("alert-dismiss"));
$("alertDone").addEventListener("click", () => send("alert-done"));

// 提醒窗口获得焦点后按 Esc 等同“知道了”。
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") send("alert-dismiss");
});
