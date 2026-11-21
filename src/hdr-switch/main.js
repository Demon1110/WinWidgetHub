const t = widget.t;
const list = document.getElementById("list");
const summary = document.getElementById("summary");
const openBtn = document.getElementById("open");
const hint = document.getElementById("hint");

let opts = { showBits: true };

openBtn.textContent = t({ "zh-TW": "系統顯示設定", "zh-CN": "系统显示设置", en: "Display settings" });
hint.textContent = t({
  "zh-TW": "只讀狀態 · 切換 HDR 請到系統設定",
  "zh-CN": "只读状态 · 切换 HDR 请到系统设置",
  en: "Read-only · toggle HDR in Windows settings",
});
openBtn.addEventListener("click", () => {
  widget.shell.open("ms-settings:display-advanced");
});

function pretty(device) {
  const raw = String(device || "");
  const n = raw.match(/DISPLAY(\d+)/i);
  if (n) return `${t({ "zh-TW": "螢幕", "zh-CN": "屏幕", en: "Display" })} ${n[1]}`;
  return raw || "Display";
}

function badge(text, cls) {
  const el = document.createElement("span");
  el.className = "badge" + (cls ? ` ${cls}` : "");
  el.textContent = text;
  return el;
}

function render(items, readable) {
  list.textContent = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t({
      "zh-TW": "讀不到顯示器資訊",
      "zh-CN": "读不到显示器信息",
      en: "Could not read the display information",
    });
    list.append(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const d of items) {
    const screen = document.createElement("div");
    screen.className = "screen";

    const pic = document.createElement("div");
    pic.className = "pic" + (d.hdrEnabled ? " on" : "");
    pic.textContent = d.primary ? "主" : "";

    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = `${pretty(d.device)}${d.width ? ` · ${d.width}×${d.height}` : ""}`;
    const spec = document.createElement("div");
    spec.className = "spec";
    const bits = opts.showBits && d.bitsPerColor ? ` · ${d.bitsPerColor}bit` : "";
    spec.textContent = `${d.refresh ? `${d.refresh} Hz` : t({ "zh-TW": "刷新率未知", "zh-CN": "刷新率未知", en: "refresh unknown" })}${bits}`;

    meta.append(name, spec);

    const tags = document.createElement("div");
    tags.style.display = "flex";
    tags.style.flexDirection = "column";
    tags.style.gap = "0.15rem";
    tags.style.alignItems = "flex-end";
    if (d.hdrEnabled === true) tags.append(badge("HDR 开", "on"));
    else if (d.hdrEnabled === false) tags.append(badge(d.hdrSupported ? "HDR 可开" : "SDR"));
    else tags.append(badge(readable ? "HDR ?" : "HDR 不可读", "unknown"));

    screen.append(pic, meta, tags);
    frag.append(screen);
  }
  list.append(frag);
}

async function load() {
  try {
    const res = await widget.system.displays();
    const items = Array.isArray(res?.items) ? res.items : [];
    const on = items.filter((d) => d.hdrEnabled === true).length;
    const ready = items.filter((d) => d.hdrSupported === true).length;
    summary.textContent = t({
      "zh-TW": `${items.length} 台螢幕 · ${on} 台開著 HDR${!ready ? " · 全部 SDR" : ""}`,
      "zh-CN": `${items.length} 台屏幕 · ${on} 台开着 HDR${!ready ? " · 全部 SDR" : ""}`,
      en: `${items.length} display${items.length === 1 ? "" : "s"} · ${on} on HDR${!ready ? " · all SDR" : ""}`,
    });
    render(items, !!res?.hdrReadable);
  } catch (e) {
    summary.textContent = String(e.message || e);
    render([], false);
  }
}

function apply(s) {
  opts = Object.assign(opts, s || {});
  if (opts.showBits !== undefined) load();
}

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
load();
