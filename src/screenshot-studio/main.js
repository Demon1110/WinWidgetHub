const t = widget.t;
const stage = document.getElementById("stage");
const img = document.getElementById("shot");
const box = document.getElementById("box");
const placeholder = document.getElementById("placeholder");
const sizeEl = document.getElementById("size");
const grabBtn = document.getElementById("grab");
const copyBtn = document.getElementById("copy");
const saveBtn = document.getElementById("save");
const fullBtn = document.getElementById("full");
const ratios = document.getElementById("ratios");
const toast = document.getElementById("toast");

let opts = { ratio: "free", source: "display" };
let loaded = false;
let sel = null; // {x,y,w,h} in stage coordinates
let drag = null;

grabBtn.textContent = t({ "zh-TW": "截一張", "zh-CN": "截一张", en: "Capture" });
copyBtn.textContent = t({ "zh-TW": "複製", "zh-CN": "复制", en: "Copy" });
saveBtn.textContent = t({ "zh-TW": "存成 PNG", "zh-CN": "存成 PNG", en: "Save PNG" });
fullBtn.textContent = t({ "zh-TW": "整張", "zh-CN": "整张", en: "Whole" });
placeholder.textContent = t({ "zh-TW": "點「截一張」開始", "zh-CN": "点「截一张」开始", en: "Tap Capture to start" });

const CHIPS = [
  { value: "free", label: t({ "zh-TW": "自由", "zh-CN": "自由", en: "Free" }) },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "1:1", label: "1:1" },
];

function toastSay(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastSay.timer);
  toastSay.timer = setTimeout(() => toast.classList.remove("show"), 1500);
}

function renderChips() {
  ratios.textContent = "";
  for (const chip of CHIPS) {
    const el = document.createElement("button");
    el.className = "chip" + (opts.ratio === chip.value ? " on" : "");
    el.textContent = chip.label;
    el.addEventListener("click", () => {
      opts.ratio = chip.value;
      renderChips();
      if (sel) setSel(sel.x, sel.y, sel.w, sel.h);
    });
    ratios.append(el);
  }
}

function ratioValue() {
  if (opts.ratio === "16:9") return 16 / 9;
  if (opts.ratio === "4:3") return 4 / 3;
  if (opts.ratio === "1:1") return 1;
  return 0;
}

function stageBox() {
  return stage.getBoundingClientRect();
}

function imageRect() {
  const r = img.getBoundingClientRect();
  const s = stageBox();
  return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height };
}

function setSel(x, y, w, h) {
  const im = imageRect();
  const min = 24;
  w = Math.max(min, w);
  h = Math.max(min, h);
  const ratio = ratioValue();
  if (ratio) h = Math.min(w / ratio, im.h);
  if (ratio && h < min) h = min;
  x = Math.max(im.x, Math.min(im.x + im.w - w, x));
  y = Math.max(im.y, Math.min(im.y + im.h - h, y));
  sel = { x, y, w, h };
  box.hidden = false;
  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  box.style.width = `${w}px`;
  box.style.height = `${h}px`;
  const scale = img.naturalWidth / im.w;
  sizeEl.textContent = `${Math.round(w * scale)} × ${Math.round(h * scale)}`;
}

function fullSelection() {
  if (!loaded) return;
  const im = imageRect();
  setSel(im.x, im.y, im.w, im.h);
}

function cropCanvas() {
  const im = imageRect();
  const scale = img.naturalWidth / im.w;
  const region = sel || { x: im.x, y: im.y, w: im.w, h: im.h };
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(region.w * scale));
  out.height = Math.max(1, Math.round(region.h * scale));
  const ctx = out.getContext("2d");
  ctx.drawImage(
    img,
    (region.x - im.x) * scale,
    (region.y - im.y) * scale,
    region.w * scale,
    region.h * scale,
    0, 0, out.width, out.height,
  );
  return out;
}

async function grab() {
  placeholder.hidden = false;
  placeholder.textContent = t({ "zh-TW": "正在抓…", "zh-CN": "正在抓…", en: "Capturing…" });
  try {
    const dataUrl = opts.source === "interactive"
      ? await widget.screen.captureInteractive({ timeout: 20000 })
      : await widget.screen.capture();
    if (!dataUrl) {
      placeholder.hidden = false;
      placeholder.textContent = t({ "zh-TW": "沒有抓到畫面（可能被取消）", "zh-CN": "没有抓到画面（可能被取消）", en: "Nothing captured (cancelled?)" });
      return;
    }
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    img.classList.add("loaded");
    placeholder.hidden = true;
    loaded = true;
    copyBtn.disabled = false;
    saveBtn.disabled = false;
    fullBtn.disabled = false;
    box.hidden = true;
    sel = null;
    sizeEl.textContent = `${img.naturalWidth} × ${img.naturalHeight}`;
    requestAnimationFrame(fullSelection);
  } catch (e) {
    placeholder.hidden = false;
    placeholder.textContent = String(e.message || e);
  }
}

function pointFromEvent(e) {
  const s = stageBox();
  return { x: e.clientX - s.left, y: e.clientY - s.top };
}

stage.addEventListener("pointerdown", (e) => {
  if (!loaded) return;
  const p = pointFromEvent(e);
  const im = imageRect();
  const onHandle = e.target.classList.contains("corner");
  if (onHandle && sel) {
    const corner = e.target.classList[1];
    drag = { mode: "resize", corner, start: sel, from: p };
  } else if (sel && p.x > sel.x && p.x < sel.x + sel.w && p.y > sel.y && p.y < sel.y + sel.h) {
    drag = { mode: "move", start: sel, from: p };
  } else {
    drag = { mode: "new", from: { x: Math.min(Math.max(p.x, im.x), im.x + im.w), y: Math.min(Math.max(p.y, im.y), im.y + im.h) } };
  }
  stage.setPointerCapture(e.pointerId);
});

stage.addEventListener("pointermove", (e) => {
  if (!drag || !loaded) return;
  const p = pointFromEvent(e);
  const im = imageRect();
  if (drag.mode === "move") {
    setSel(drag.start.x + p.x - drag.from.x, drag.start.y + p.y - drag.from.y, drag.start.w, drag.start.h);
    return;
  }
  if (drag.mode === "resize") {
    const s = drag.start;
    let x = s.x, y = s.y, w = s.w, h = s.h;
    if (drag.corner.includes("r")) w = p.x - s.x;
    if (drag.corner.includes("l")) { w = s.x + s.w - p.x; x = p.x; }
    if (drag.corner.includes("b")) h = p.y - s.y;
    if (drag.corner.includes("t")) { h = s.y + s.h - p.y; y = p.y; }
    setSel(x, y, w, h);
    return;
  }
  const x1 = Math.min(drag.from.x, p.x);
  const y1 = Math.min(drag.from.y, p.y);
  setSel(x1, y1, Math.abs(p.x - drag.from.x), Math.abs(p.y - drag.from.y));
});

function endDrag() {
  drag = null;
}

stage.addEventListener("pointerup", endDrag);
stage.addEventListener("pointercancel", endDrag);

copyBtn.addEventListener("click", async () => {
  if (!loaded) return;
  try {
    await widget.clipboard.writeImage(cropCanvas().toDataURL("image/png"));
    toastSay(t({ "zh-TW": "已複製到剪貼簿", "zh-CN": "已复制到剪贴板", en: "Copied to clipboard" }));
  } catch (e) {
    toastSay(String(e.message || e));
  }
});

saveBtn.addEventListener("click", async () => {
  if (!loaded) return;
  try {
    const stamp = new Date();
    const name = `shot-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}-${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}${String(stamp.getSeconds()).padStart(2, "0")}.png`;
    const path = await widget.shell.save({ title: "保存截图", name, filter: [{ name: "PNG", extensions: ["png"] }] });
    if (!path) return;
    await widget.file.write(path, cropCanvas().toDataURL("image/png"));
    toastSay(t({ "zh-TW": `已存到 ${path}`, "zh-CN": `已存到 ${path}`, en: `Saved to ${path}` }));
  } catch (e) {
    toastSay(String(e.message || e));
  }
});

fullBtn.addEventListener("click", fullSelection);
grabBtn.addEventListener("click", grab);

function apply(s) {
  opts = Object.assign(opts, s || {});
  renderChips();
}

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
renderChips();
