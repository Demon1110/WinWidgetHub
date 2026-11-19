const $ = (id) => document.getElementById(id);
const zh = widget.locale.toLowerCase().startsWith("zh");
const hans = /^zh-(cn|sg|hans|mo)/i.test(widget.locale);
const t = (cn, tw, en) => (zh ? (hans ? cn : tw) : en);

const el = {
  eyebrow: $("eyebrow"),
  title: $("title"),
  desc: $("desc"),
  status: $("status"),
  action: $("action"),
  actionIcon: $("actionIcon"),
  actionText: $("actionText"),
  hint: $("hint"),
  emptyHint: $("emptyHint"),
};

let visible = null;
let supported = true;
let busy = false;

function labels() {
  el.eyebrow.textContent = t("桌面整理", "桌面整理", "Desktop tidy");
  el.title.textContent = t("隐屏", "隱屏", "Hide desktop icons");
  el.desc.textContent = t(
    "隐藏桌面上的所有图标，把桌面还给壁纸。再次点击即可恢复。",
    "隱藏桌面上的所有圖示，把桌面還給桌布。再按一次即可恢復。",
    "Hide every desktop icon and give the wallpaper some room. Click again to bring them back."
  );
}

function setStatus(text, tone) {
  el.status.textContent = text;
  el.status.dataset.tone = tone || "";
}

function render() {
  const hidden = visible === false;
  document.documentElement.dataset.hidden = hidden ? "true" : "false";

  if (!supported) {
    setStatus(t("不支持", "不支援", "Unsupported"), "warn");
    el.action.disabled = true;
    el.actionText.textContent = t("当前系统不支持", "目前系統不支援", "Not supported here");
    el.hint.textContent = t(
      "没有找到 Windows 桌面图标窗口。请确认资源管理器正在运行，然后重试。",
      "沒有找到 Windows 桌面圖示視窗。請確認檔案總管正在執行，然後重試。",
      "The Windows desktop icon window was not found. Check that Explorer is running, then try again."
    );
    return;
  }

  if (visible === null) {
    setStatus(t("状态未知", "狀態未知", "Unknown"), "warn");
    el.actionText.textContent = t("重试", "重試", "Try again");
    el.hint.textContent = t(
      "暂时读不到桌面图标状态。回到桌面后点一下重试。",
      "暫時讀不到桌面圖示狀態。回到桌面後點一下重試。",
      "The desktop icon state is unavailable. Return to the desktop and try again."
    );
    return;
  }

  setStatus(
    hidden ? t("图标已隐藏", "圖示已隱藏", "Icons hidden") : t("图标已显示", "圖示已顯示", "Icons visible"),
    hidden ? "hidden" : "visible"
  );
  el.actionText.textContent = hidden
    ? t("恢复桌面图标", "恢復桌面圖示", "Show desktop icons")
    : t("隐藏桌面图标", "隱藏桌面圖示", "Hide desktop icons");
  el.actionIcon.textContent = hidden ? "◉" : "◍";
  el.hint.textContent = t(
    "状态会同步 Windows 的桌面图标设置，重启资源管理器后仍然有效。",
    "狀態會同步 Windows 的桌面圖示設定，重新啟動檔案總管後仍然有效。",
    "The state is written to Windows' desktop-icon preference, so it survives an Explorer restart."
  );
}

async function refresh() {
  try {
    const r = await widget.shell.desktopIcons("query");
    supported = r.supported;
    visible = r.visible;
  } catch (err) {
    supported = false;
    visible = null;
    console.error(err);
  }
  render();
}

async function toggle() {
  if (busy) return;
  busy = true;
  el.action.disabled = true;
  setStatus(t("正在切换…", "正在切換…", "Switching…"), "busy");
  try {
    const r = await widget.shell.desktopIcons("toggle");
    supported = r.supported;
    visible = r.visible;
    if (visible === null) {
      visible = document.documentElement.dataset.hidden === "true" ? false : true;
    }
  } catch (err) {
    supported = false;
    visible = null;
    el.hint.textContent = String(err && err.message ? err.message : err);
    setStatus(t("切换失败", "切換失敗", "Failed"), "warn");
  } finally {
    busy = false;
    el.action.disabled = !supported;
    render();
  }
}

widget.on("ready", async () => {
  labels();
  await refresh();
});

// The host reports why a card became visible; a hotkey summon toggles the icons,
// while startup, tray and control-center shows only refresh the status.
widget.on("show", (payload) => {
  if (payload && payload.from === "hotkey" && supported && visible !== null && !busy) {
    toggle();
  }
});

el.action.addEventListener("click", () => {
  if (visible === null) {
    refresh();
    return;
  }
  toggle();
});
