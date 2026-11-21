const $ = widget.util.$;
const zh = widget.util.zh;
const hans = widget.util.hans;
const t = (cn, tw, en) => (zh ? (hans ? cn : tw) : en);

const PREFIX = "reminder/";
const FLOAT_KEY = "floatVisible";
const REPEATS = ["none", "daily", "weekdays", "weekly", "monthly"];

const el = {
  eyebrow: $("eyebrow"),
  title: $("title"),
  listLabel: $("listLabel"),
  count: $("count"),
  list: $("list"),
  empty: $("empty"),
  emptyText: $("emptyText"),
  editorTitle: $("editorTitle"),
  titleInput: $("reminderTitle"),
  noteInput: $("reminderNote"),
  timeInput: $("reminderTime"),
  repeatInput: $("reminderRepeat"),
  addText: $("addText"),
  add: $("add"),
  timeLabel: $("timeLabel"),
  repeatLabel: $("repeatLabel"),
  floatToggle: $("floatToggle"),
  floatText: $("floatText"),
  floatDot: $("floatDot"),
  status: $("status"),
  modal: $("modal"),
  addReminderBtn: $("addReminderBtn"),
  modalClose: $("modalClose"),
  modalCancel: $("modalCancel"),
};

let reminders = [];
let floatVisible = false;
let floatWinId = null;
let busy = false;

const pad = widget.util.pad;
const dayMs = 86400000;

function labels() {
  el.eyebrow.textContent = t("桌面上的下一件事", "桌面上的下一件事", "The next thing on your desktop");
  el.title.textContent = t("桌面提醒", "桌面提醒", "Desktop reminders");
  el.listLabel.textContent = t("待办", "待辦", "Upcoming");
  el.emptyText.textContent = t(
    "还没有提醒。加一件接下来要做的小事。",
    "還沒有提醒。加一件接下來要做的小事。",
    "Nothing yet. Add the next small thing."
  );
  el.editorTitle.textContent = t("新增提醒", "新增提醒", "New reminder");
  el.titleInput.placeholder = t("要提醒什么？", "要提醒什麼？", "What should I remind you about?");
  el.noteInput.placeholder = t("备注（可选）", "備註（可選）", "Note (optional)");
  el.timeLabel.textContent = t("提醒时间", "提醒時間", "When");
  el.repeatLabel.textContent = t("重复", "重複", "Repeat");
  el.addText.textContent = t("加入提醒", "加入提醒", "Add reminder");
  el.floatText.textContent = t("桌面悬浮", "桌面懸浮", "Desktop float");
  const addLabel = t("新增提醒", "新增提醒", "Add reminder");
  el.addReminderBtn.title = addLabel;
  el.addReminderBtn.setAttribute("aria-label", addLabel);
  el.modalClose.title = t("关闭", "關閉", "Close");
  el.modalClose.setAttribute("aria-label", t("关闭", "關閉", "Close"));
  el.modalCancel.textContent = t("取消", "取消", "Cancel");
  el.status.textContent = t(
    "提醒会保存在本组件的数据目录里。",
    "提醒會保存在本元件的資料目錄裡。",
    "Reminders live in this widget's own data folder."
  );

  const opt = {
    none: t("不重复", "不重複", "Once"),
    daily: t("每天", "每天", "Daily"),
    weekdays: t("工作日", "工作日", "Weekdays"),
    weekly: t("每周", "每週", "Weekly"),
    monthly: t("每月", "每月", "Monthly"),
  };
  Array.from(el.repeatInput.options).forEach((o) => {
    o.textContent = opt[o.value] || o.value;
  });
}

function repeatLabel(v) {
  return {
    none: t("不重复", "不重複", "Once"),
    daily: t("每天", "每天", "Daily"),
    weekdays: t("工作日", "工作日", "Weekdays"),
    weekly: t("每周", "每週", "Weekly"),
    monthly: t("每月", "每月", "Monthly"),
  }[v] || v;
}

function fmtTime(ms) {
  const d = new Date(ms);
  return new Intl.DateTimeFormat(widget.locale, {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function localInputValue(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultTime() {
  const now = new Date();
  const d = new Date(now.getTime() + 30 * 60000);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  return localInputValue(d.getTime());
}

function openEditor() {
  el.titleInput.value = "";
  el.noteInput.value = "";
  el.timeInput.value = defaultTime();
  el.repeatInput.value = "none";
  el.modal.hidden = false;
  requestAnimationFrame(() => el.titleInput.focus());
}

function closeEditor() {
  el.modal.hidden = true;
}

function normalize(doc) {
  return {
    ...doc,
    title: String(doc.title || "").trim(),
    note: String(doc.note || ""),
    dueAt: Number(doc.dueAt) || 0,
    repeat: REPEATS.includes(doc.repeat) ? doc.repeat : "none",
    enabled: doc.enabled !== false,
    done: doc.done === true,
  };
}

async function loadReminders() {
  const docs = await widget.db.allDocs({ idStartsWith: PREFIX });
  reminders = docs.map(normalize).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return a.dueAt - b.dueAt;
  });
  render();
}

function scheduleTrigger(r) {
  if (!r.enabled || r.done) return null;
  const d = new Date(r.dueAt);
  if (!Number.isFinite(d.getTime())) return null;
  if (r.repeat === "none") {
    // 单次提醒：到点后仍允许补发一次，避免应用当时没运行而永远错过。
    if (Number(r.lastNotifiedAt) > 0) return null;
    return r.dueAt > Date.now() - 7 * dayMs ? r.dueAt : null;
  }

  const minute = d.getMinutes();
  const hour = d.getHours();
  const dow = d.getDay();
  const dom = d.getDate();
  const cron =
    r.repeat === "daily"
      ? `${minute} ${hour} * * *`
      : r.repeat === "weekdays"
        ? `${minute} ${hour} * * 1-5`
        : r.repeat === "weekly"
          ? `${minute} ${hour} * * ${dow}`
          : `${minute} ${hour} ${dom} * *`;
  return { cron };
}

async function syncSchedules() {
  try {
    const existing = await widget.schedule.list();
    for (const s of existing) {
      if (s.code && s.code.startsWith(PREFIX)) {
        await widget.schedule.remove(s.code).catch(() => {});
      }
    }
    for (const r of reminders) {
      const trigger = scheduleTrigger(r);
      if (!trigger) continue;
      await widget.schedule.request({
        code: PREFIX + r._id,
        label: r.title || t("桌面提醒", "桌面提醒", "Desktop reminder"),
        trigger,
      });
    }
  } catch (err) {
    console.error(err);
    setStatus(t("定时提醒暂不可用", "定時提醒暫不可用", "Scheduled alerts are unavailable"), true);
  }
}

function setStatus(text, warn) {
  el.status.textContent = text;
  el.status.dataset.warn = warn ? "true" : "";
}

function render() {
  const active = reminders.filter((r) => !r.done);
  el.count.textContent = String(active.length);
  el.empty.hidden = active.length > 0 || reminders.some((r) => r.done);

  el.list.replaceChildren();
  for (const r of reminders) {
    const li = document.createElement("li");
    li.className = r.done ? "done" : "";
    li.dataset.id = r._id;

    const check = document.createElement("input");
    check.type = "checkbox";
    check.className = "w-check";
    check.checked = r.done;
    check.setAttribute("aria-label", t("完成", "完成", "Done"));
    check.addEventListener("change", () => toggleDone(r, check.checked));

    const body = document.createElement("div");
    body.className = "item-body";
    const text = document.createElement("div");
    text.className = "text";
    text.textContent = r.title || t("未命名提醒", "未命名提醒", "Untitled reminder");
    const meta = document.createElement("div");
    meta.className = "meta";
    const due = document.createElement("span");
    due.className = "due";
    due.textContent = fmtTime(r.dueAt);
    if (r.dueAt < Date.now() && !r.done) due.dataset.overdue = "true";
    meta.appendChild(due);
    const rep = document.createElement("span");
    rep.className = "repeat";
    rep.textContent = repeatLabel(r.repeat);
    meta.appendChild(rep);
    if (r.note) {
      const note = document.createElement("div");
      note.className = "note-text";
      note.textContent = r.note;
      body.appendChild(note);
    }
    body.insertBefore(text, body.firstChild);
    body.appendChild(meta);

    const del = document.createElement("button");
    del.className = "del";
    del.type = "button";
    del.title = t("删除", "刪除", "Delete");
    del.textContent = "×";
    del.addEventListener("click", () => removeReminder(r));

    li.append(check, body, del);
    el.list.appendChild(li);
  }
}

async function saveDoc(doc) {
  const result = await widget.db.put(doc);
  if (result && result.error) throw new Error(result.message || result.error);
  return result;
}

async function toggleDone(r, done) {
  if (busy) return;
  busy = true;
  try {
    const doc = await widget.db.get(r._id);
    if (!doc) return;
    await saveDoc({
      ...doc,
      done,
      completedAt: done ? Date.now() : undefined,
      updatedAt: Date.now(),
    });
    await loadReminders();
    await syncSchedules();
    sendFloatUpdate();
  } finally {
    busy = false;
  }
}

async function removeReminder(r) {
  if (!confirm(t("删除这条提醒？", "刪除這條提醒？", "Delete this reminder?"))) return;
  await widget.db.remove(r._id).catch(() => {});
  await widget.schedule.remove(PREFIX + r._id).catch(() => {});
  await loadReminders();
  await syncSchedules();
  sendFloatUpdate();
}

async function addReminder(ev) {
  ev.preventDefault();
  if (busy) return;
  const title = el.titleInput.value.trim();
  if (!title) {
    el.titleInput.focus();
    return;
  }
  const dueAt = new Date(el.timeInput.value).getTime();
  if (!Number.isFinite(dueAt)) {
    el.timeInput.focus();
    return;
  }
  busy = true;
  el.add.disabled = true;
  try {
    const now = Date.now();
    await saveDoc({
      _id: PREFIX + now.toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      note: el.noteInput.value.trim(),
      dueAt,
      repeat: el.repeatInput.value,
      enabled: true,
      done: false,
      createdAt: now,
      updatedAt: now,
      lastNotifiedAt: 0,
    });
    el.titleInput.value = "";
    el.noteInput.value = "";
    el.timeInput.value = defaultTime();
    el.repeatInput.value = "none";
    closeEditor();
    await loadReminders();
    await syncSchedules();
    sendFloatUpdate();
    setStatus(t("已加入提醒", "已加入提醒", "Reminder added"));
  } catch (err) {
    setStatus(String(err && err.message ? err.message : err), true);
  } finally {
    busy = false;
    el.add.disabled = false;
  }
}

// ── 到点提醒 ───────────────────────────────────────────────────────
// 弹框交给宿主画：主题变量、圆角、高度跟着内容、Esc 关闭都是 dialog 的事，
// 这里只管文案、落点，以及「完成」之后的状态。
const ALERT_WIDTH = 380;
const ALERT_SLOT = 168; // 弹框高度随内容变，叠放时按固定槽位往下排
const alertWins = new Set();

function alertContent(doc) {
  const note = String(doc.note || "").trim();
  const when = fmtTime(Number(doc.dueAt) || Date.now());
  const repeat = doc.repeat && doc.repeat !== "none" ? ` · ${repeatLabel(doc.repeat)}` : "";
  return (note ? `${note}\n\n` : "") + when + repeat;
}

async function showReminderAlert(doc, code) {
  if (alertWins.has(doc._id)) return;
  const display = await primaryDisplay();
  const area = (display && (display.workArea || display.bounds)) || null;
  const offset = alertWins.size * (ALERT_SLOT + 12);
  const x = area ? Math.round(area.x + area.width - ALERT_WIDTH - 16) : undefined;
  const y = area ? Math.round(area.y + 16 + offset) : undefined;
  const title = String(doc.title || "").trim() || t("未命名提醒", "未命名提醒", "Untitled reminder");
  alertWins.add(doc._id);
  // 不抢焦点：提醒出现时不该打断用户正在打的字。
  widget.dialog
    .confirm({
      title,
      content: alertContent(doc),
      icon: "info",
      okText: t("完成", "完成", "Done"),
      cancelText: t("知道了", "知道了", "Dismiss"),
      width: ALERT_WIDTH,
      x,
      y,
      focusable: false,
      draggable: true,
    })
    .then((res) => {
      alertWins.delete(doc._id);
      if (res && res.confirmed) return completeReminder(doc._id);
      return undefined;
    })
    .catch((err) => {
      alertWins.delete(doc._id);
      console.error(err);
    });
  // 系统通知作为声音/横幅兜底；提醒弹窗才是主提醒。
  await widget
    .notify({
      title: `${t("提醒", "提醒", "Reminder")}：${title}`,
      body: String(doc.note || t("时间到了。", "時間到了。", "It is time.")),
      tag: code,
    })
    .catch(() => {});
}

async function completeReminder(id) {
  const doc = await widget.db.get(id).catch(() => null);
  if (doc) {
    await saveDoc({ ...doc, done: true, completedAt: Date.now(), updatedAt: Date.now() }).catch(() => {});
  }
  await widget.schedule.remove(PREFIX + id).catch(() => {});
  await loadReminders().catch(() => {});
  await syncSchedules().catch(() => {});
  sendFloatUpdate();
}

// ── 桌面悬浮窗 ───────────────────────────────────────────────────────
async function primaryDisplay() {
  try {
    return await widget.screen.primary();
  } catch (err) {
    return null;
  }
}

async function ensureFloatWindow() {
  if (floatWinId !== null) {
    await widget.call("win.showInactive", { win: floatWinId }).catch(() => {});
    return;
  }
  const width = 344;
  const height = 400;
  const display = await primaryDisplay();
  const area = (display && (display.workArea || display.bounds)) || null;
  const x = area ? Math.round(area.x + area.width - width - 16) : undefined;
  const y = area ? Math.round(area.y + (area.height - height) / 2) : undefined;
  const options = {
    // No title on purpose: DWM draws the window title into the caption strip it keeps for the
    // hidden shadow frame, so any title here turns into a stray label above the card once the
    // window loses activation.
    title: "",
    width,
    height,
    x,
    y,
    frame: false,
    transparent: true,
    seeThrough: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: true,
    show: false,
    hasShadow: false,
    roundedCorners: false,
    backgroundColor: "#00000000",
  };
  const reply = await widget.call("win.create", { file: "float.html", options });
  const id = reply && reply.id;
  if (id === undefined || id === null) throw new Error("桌面悬浮窗没有创建成功");
  floatWinId = id;
  await widget.call("win.setAlwaysOnTop", { win: id, flag: true, level: "screen-saver" }).catch(() => {});
  await widget.call("win.showInactive", { win: id });
  setTimeout(sendFloatUpdate, 500);
}

async function setFloatVisible(on, persist = true) {
  floatVisible = !!on;
  if (persist) await widget.storage.set(FLOAT_KEY, floatVisible);
  if (floatVisible) {
    await ensureFloatWindow();
  } else if (floatWinId !== null) {
    await widget.call("win.destroy", { win: floatWinId }).catch(() => {});
    floatWinId = null;
  }
  renderFloatToggle();
}

function renderFloatToggle() {
  el.floatToggle.dataset.on = floatVisible ? "true" : "false";
  el.floatDot.dataset.on = floatVisible ? "true" : "false";
}

function sendFloatUpdate() {
  if (floatWinId === null) return;
  widget.call("win.send", { win: floatWinId, channel: "reminders-updated", args: [] }).catch(() => {});
}

// The floating window sends actions back through utools.sendToParent.
ipcRenderer.on("reminder-action", async (_, action) => {
  const a = action || {};
  if (a.type === "toggle") {
    const r = reminders.find((x) => x._id === a.id);
    if (r) await toggleDone(r, typeof a.done === "boolean" ? a.done : !r.done);
  } else if (a.type === "hide-float") {
    await setFloatVisible(false);
  }
});

widget.schedule.onTrigger(async (action) => {
  const code = String(action && action.code ? action.code : "");
  if (!code.startsWith(PREFIX)) return;
  const id = code.slice(PREFIX.length);
  try {
    const doc = await widget.db.get(id).catch(() => null);
    if (!doc || doc.enabled === false || doc.done === true) return;
    try {
      await showReminderAlert(doc, code);
    } catch (err) {
      console.error(err);
      // 自定义弹窗失败时至少保留系统通知，不让提醒彻底消失。
      await widget
        .notify({
          title: `${t("提醒", "提醒", "Reminder")}：${String(doc.title || t("未命名提醒", "未命名提醒", "Untitled"))}`,
          body: String(doc.note || t("时间到了。", "時間到了。", "It is time.")),
          tag: code,
        })
        .catch(() => {});
    }
    await saveDoc({ ...doc, lastNotifiedAt: Date.now(), updatedAt: Date.now() });
    if (doc.repeat === "none") await widget.schedule.remove(code).catch(() => {});
    await loadReminders();
    sendFloatUpdate();
  } catch (err) {
    console.error(err);
    setStatus(t("提醒触发失败，请查看日志", "提醒觸發失敗，請查看日誌", "Reminder failed to fire"), true);
  }
});

widget.on("ready", async () => {
  labels();
  el.timeInput.value = defaultTime();
  el.repeatInput.value = "none";
  try {
    floatVisible = (await widget.storage.get(FLOAT_KEY)) === true;
  } catch (err) {
    floatVisible = false;
  }
  await loadReminders();
  await syncSchedules();
  renderFloatToggle();
  if (floatVisible) {
    await ensureFloatWindow().catch((err) => {
      console.error(err);
      floatVisible = false;
      widget.storage.set(FLOAT_KEY, false).catch(() => {});
      renderFloatToggle();
    });
  }
});

$("editor").addEventListener("submit", addReminder);
el.addReminderBtn.addEventListener("click", openEditor);
el.modalClose.addEventListener("click", closeEditor);
el.modalCancel.addEventListener("click", closeEditor);
el.modal.addEventListener("click", (event) => {
  if (event.target === el.modal) closeEditor();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.modal.hidden) closeEditor();
});

el.floatToggle.addEventListener("click", () => setFloatVisible(!floatVisible).catch((err) => {
  setStatus(String(err && err.message ? err.message : err), true);
}));

window.addEventListener("beforeunload", () => {
  if (floatWinId !== null) {
    widget.call("win.destroy", { win: floatWinId }).catch(() => {});
    floatWinId = null;
  }
  widget.windows.closeAll({ kind: "confirm" }).catch(() => {});
});
