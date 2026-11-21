const t = widget.t;
const dial = document.getElementById("start");
const settingsBtn = document.getElementById("settings");
const status = document.getElementById("status");
const label = dial.querySelector(".label");
const glyph = dial.querySelector(".glyph");

let opts = { confirm: false };
let holdTimer = 0;
let fired = false;

label.textContent = t({ "zh-TW": "開始屏保", "zh-CN": "开始屏保", en: "Start" });
settingsBtn.textContent = t({ "zh-TW": "屏保設定", "zh-CN": "屏保设置", en: "Settings" });
status.textContent = t({ "zh-TW": "按住不放可取消", "zh-CN": "按住不放可取消", en: "Move the mouse to dismiss" });

async function start() {
  status.textContent = t({ "zh-TW": "啟動中…", "zh-CN": "启动中…", en: "Starting…" });
  try {
    await widget.system.screensaver({ action: "start" });
    status.textContent = t({ "zh-TW": "已送出，動一下滑鼠就回來", "zh-CN": "已送出，动一下鼠标就回来", en: "Sent — move the mouse to come back" });
    glyph.textContent = "☾";
  } catch (e) {
    status.textContent = String(e.message || e);
  }
}

async function openSettings() {
  try {
    await widget.system.screensaver({ action: "settings" });
    status.textContent = t({ "zh-TW": "已打開設定", "zh-CN": "已打开设置", en: "Settings opened" });
  } catch (e) {
    status.textContent = String(e.message || e);
  }
}

dial.addEventListener("pointerdown", (e) => {
  if (!opts.confirm) {
    start();
    return;
  }
  e.preventDefault();
  fired = false;
  dial.classList.add("holding");
  holdTimer = setTimeout(() => {
    fired = true;
    dial.classList.remove("holding");
    start();
  }, 800);
});

function cancelHold() {
  clearTimeout(holdTimer);
  holdTimer = 0;
  dial.classList.remove("holding");
}

dial.addEventListener("pointerup", () => {
  if (holdTimer && !fired) {
    cancelHold();
    status.textContent = t({ "zh-TW": "再按久一點", "zh-CN": "再按久一点", en: "Hold a little longer" });
  }
});
dial.addEventListener("pointerleave", cancelHold);
dial.addEventListener("pointercancel", cancelHold);

settingsBtn.addEventListener("click", openSettings);

function apply(s) {
  opts = Object.assign(opts, s || {});
  status.textContent = opts.confirm
    ? t({ "zh-TW": "按住 0.8 秒啟動", "zh-CN": "按住 0.8 秒启动", en: "Hold for 0.8 s" })
    : t({ "zh-TW": "動一下滑鼠就回來", "zh-CN": "动一下鼠标就回来", en: "Move the mouse to come back" });
}

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
