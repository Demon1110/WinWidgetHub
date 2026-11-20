const $ = widget.util.$;
const zh = widget.util.zh;
const hans = widget.util.hans;
const t = (cn, tw, en) => (zh ? (hans ? cn : tw) : en);

const PREFIX = "reminder/";
const el = {
  eyebrow: $("floatEyebrow"),
  title: $("floatTitle"),
  list: $("floatList"),
  empty: $("floatEmpty"),
  close: $("floatClose"),
  open: $("floatOpen"),
};

function repeatLabel(v) {
  return {
    none: t("单次", "單次", "Once"),
    daily: t("每天", "每天", "Daily"),
    weekdays: t("工作日", "工作日", "Weekdays"),
    weekly: t("每周", "每週", "Weekly"),
    monthly: t("每月", "每月", "Monthly"),
  }[v] || v;
}

function fmtTime(ms) {
  return new Intl.DateTimeFormat(widget.locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
}

function labels() {
  el.eyebrow.textContent = t("桌面", "桌面", "DESKTOP");
  el.title.textContent = t("接下来", "接下來", "Coming up");
  el.empty.textContent = t(
    "桌面是空的，先喘口气。",
    "桌面是空的，先喘口氣。",
    "Nothing on the desktop. Take a breath."
  );
  el.open.textContent = t("打开完整列表", "開啟完整列表", "Open the full list");
  el.close.title = t("收起", "收起", "Hide");
}

function render(docs) {
  const active = docs
    .map((d) => ({ ...d, dueAt: Number(d.dueAt) || 0 }))
    .filter((d) => d.done !== true && d.enabled !== false)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, 7);

  el.empty.hidden = active.length > 0;
  el.list.replaceChildren();

  for (const d of active) {
    const li = document.createElement("li");
    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "w-check";
    check.addEventListener("change", () => {
      utools.sendToParent("reminder-action", {
        type: "toggle",
        id: d._id,
        done: check.checked,
      });
    });

    const copy = document.createElement("div");
    copy.className = "copy";
    const text = document.createElement("div");
    text.className = "text";
    text.textContent = d.title || t("未命名提醒", "未命名提醒", "Untitled");
    const meta = document.createElement("div");
    meta.className = "meta";
    const due = document.createElement("span");
    due.className = "due";
    due.textContent = fmtTime(d.dueAt);
    if (d.dueAt < Date.now()) due.dataset.overdue = "true";
    const rep = document.createElement("span");
    rep.className = "repeat";
    rep.textContent = repeatLabel(d.repeat);
    meta.append(due, rep);
    copy.append(text, meta);
    li.append(check, copy);
    el.list.appendChild(li);
  }
}

let loading = false;
async function load() {
  if (loading) return;
  loading = true;
  try {
    const docs = await widget.db.allDocs({ idStartsWith: PREFIX });
    render(docs);
  } catch (err) {
    console.error(err);
    el.empty.hidden = false;
    el.empty.textContent = t(
      "暂时读不到提醒，打开主界面看看。",
      "暫時讀不到提醒，開啟主介面看看。",
      "Reminders are unavailable right now. Open the main view."
    );
  } finally {
    loading = false;
  }
}

ipcRenderer.on("reminders-updated", () => load());

el.close.addEventListener("click", () => {
  utools.sendToParent("reminder-action", { type: "hide-float" });
});

el.open.addEventListener("click", () => {
  utools.sendToParent("reminder-action", { type: "open-main" });
});

widget.on("ready", async () => {
  labels();
  await load();
  setInterval(load, 20000);
});
