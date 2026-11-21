const t = widget.t;
const $ = (id) => document.getElementById(id);
const canvas = $("c");
const ctx = canvas.getContext("2d");
const stack = $("stack");
const toast = $("toast");

const PICKER = [
  "😀","😅","😂","🥰","😎","🤔","😴","🥳","😱","🤯","😭","😡","😇","🤩","🙃","😋",
  "❤️","💔","✨","🔥","🌈","⭐","💫","🎉","🎁","🎂","☕","🍺","🌸","🐱","🐶","🦋",
  "👍","👏","🙏","✌️","🤝","💪","🎯","🚀","💡","📌","🔔","🛠️","⚙️","🧩","🎮","♟️",
  "👻","💀","🤖","🐼","🦊","🍕","🍜","🍰","🍉","🌙","🌞","⛅","📷","🎬","🎵","✅"
];

const BLENDS = [
  { v: "source-over", zh: "正常", en: "Normal" },
  { v: "multiply", zh: "正片叠底", en: "Multiply" },
  { v: "screen", zh: "滤色", en: "Screen" },
  { v: "overlay", zh: "叠加", en: "Overlay" },
  { v: "lighter", zh: "相加", en: "Add" },
  { v: "difference", zh: "差值", en: "Difference" },
];

let layers = [
  { emoji: "🐱", scale: 0.86, rotate: 0, dx: 0, dy: 0, blend: "source-over" },
  { emoji: "🎩", scale: 0.5, rotate: -8, dx: 0, dy: -96, blend: "source-over" },
];
let opts = { exportSize: 512, background: true };

let toastTimer = 0;
function say(text) {
  toast.textContent = text;
  toast.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("on"), 1800);
}

function draw(size) {
  const k = size / 512;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = size;
  canvas.height = size;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!opts.background) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const layer of layers) {
    ctx.save();
    ctx.globalCompositeOperation = layer.blend || "source-over";
    const px = Math.round(300 * layer.scale * k);
    ctx.font = `${px}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
    ctx.translate((256 + layer.dx) * k, (256 + layer.dy) * k);
    ctx.rotate((layer.rotate * Math.PI) / 180);
    ctx.fillText(layer.emoji, 0, 0);
    ctx.restore();
  }
}

function render() {
  draw(512);
  stack.innerHTML = "";
  layers.forEach((layer, i) => {
    const row = document.createElement("div");
    row.className = "layer";

    const glyph = document.createElement("button");
    glyph.type = "button";
    glyph.className = "glyph";
    glyph.textContent = layer.emoji;
    glyph.title = t({ "zh-TW": "換一個表情", "zh-CN": "换一个表情", en: "Pick another" });
    glyph.addEventListener("click", () => openPicker(i, glyph));

    const sliders = document.createElement("div");
    sliders.className = "sliders";
    for (const spec of [
      { key: "scale", min: 0.25, max: 1.6, step: 0.01, label: t({ "zh-TW": "大小", "zh-CN": "大小", en: "Size" }) },
      { key: "rotate", min: -45, max: 45, step: 1, label: t({ "zh-TW": "角度", "zh-CN": "角度", en: "Angle" }) },
      { key: "dx", min: -140, max: 140, step: 1, label: t({ "zh-TW": "左右", "zh-CN": "左右", en: "X" }) },
      { key: "dy", min: -140, max: 140, step: 1, label: t({ "zh-TW": "上下", "zh-CN": "上下", en: "Y" }) },
    ]) {
      const wrap = document.createElement("label");
      const title = document.createElement("span");
      title.textContent = spec.label;
      const input = document.createElement("input");
      input.type = "range";
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step;
      input.value = layer[spec.key];
      input.addEventListener("input", () => {
        layer[spec.key] = Number(input.value);
        draw(512);
      });
      wrap.append(title, input);
      sliders.appendChild(wrap);
    }

    const blend = document.createElement("select");
    for (const b of BLENDS) {
      const o = document.createElement("option");
      o.value = b.v;
      o.textContent = t({ "zh-TW": b.zh, "zh-CN": b.zh, en: b.en });
      if (layer.blend === b.v) o.selected = true;
      blend.appendChild(o);
    }
    blend.addEventListener("change", () => {
      layer.blend = blend.value;
      draw(512);
    });

    const del = document.createElement("button");
    del.type = "button";
    del.className = "del";
    del.textContent = "✕";
    del.title = t({ "zh-TW": "拿掉這一層", "zh-CN": "拿掉这一层", en: "Remove layer" });
    del.addEventListener("click", () => {
      layers.splice(i, 1);
      if (!layers.length) layers.push({ emoji: "😀", scale: 0.86, rotate: 0, dx: 0, dy: 0, blend: "source-over" });
      render();
    });

    row.append(glyph, sliders, blend, del);
    stack.appendChild(row);
  });
}

let picker = null;
function openPicker(index, anchor) {
  closePicker();
  const panel = document.createElement("div");
  panel.className = "picker";
  panel.style.cssText =
    "position:absolute;z-index:9;padding:6px;border-radius:12px;background:var(--w-bg-solid);box-shadow:0 10px 30px rgba(0,0,0,0.35);display:grid;grid-template-columns:repeat(8,28px);gap:3px;";
  const rect = anchor.getBoundingClientRect();
  panel.style.left = Math.min(Math.max(4, rect.left), window.innerWidth - 250) + "px";
  panel.style.top = Math.min(rect.bottom + 4, window.innerHeight - 160) + "px";
  for (const emoji of PICKER) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = emoji;
    b.style.cssText = "border:0;background:transparent;font-size:18px;line-height:28px;width:28px;height:28px;border-radius:6px;cursor:pointer;";
    b.addEventListener("mouseenter", () => (b.style.background = "var(--w-hover)"));
    b.addEventListener("mouseleave", () => (b.style.background = "transparent"));
    b.addEventListener("click", () => {
      layers[index].emoji = emoji;
      closePicker();
      render();
    });
    panel.appendChild(b);
  }
  document.body.appendChild(panel);
  picker = panel;
  setTimeout(() => document.addEventListener("pointerdown", outside, { once: true }), 0);
}

function outside(e) {
  if (picker && !picker.contains(e.target)) closePicker();
}

function closePicker() {
  if (picker) {
    picker.remove();
    picker = null;
  }
}

function compose() {
  draw(Number(opts.exportSize) || 512);
  return canvas.toDataURL("image/png");
}

$("copy").textContent = t({ "zh-TW": "複製圖片", "zh-CN": "复制图片", en: "Copy image" });
$("save").textContent = t({ "zh-TW": "存成 PNG", "zh-CN": "存成 PNG", en: "Save PNG" });

$("copy").addEventListener("click", () => {
  draw(Number(opts.exportSize) || 512);
  widget.clipboard
    .writeImage(canvas.toDataURL("image/png"))
    .then((ok) => say(ok ? t({ "zh-TW": "圖片已複製", "zh-CN": "图片已复制", en: "Image copied" }) : t({ "zh-TW": "複製失敗", "zh-CN": "复制失败", en: "copy failed" })))
    .catch((e) => say(String(e.message || e)));
});

$("save").addEventListener("click", async () => {
  try {
    const path = await widget.shell.save({
      title: t({ "zh-TW": "存下合成圖", "zh-CN": "保存合成图", en: "Save the fusion" }),
      name: `emoji-fusion-${layers[0].emoji.length ? layers.map((l) => l.emoji).join("") : "fusion"}.png`,
      filter: "images",
    });
    if (!path) return;
    await widget.file.write(path, compose());
    say(t({ "zh-TW": "已存下", "zh-CN": "已保存", en: "Saved" }) + " · " + path);
  } catch (e) {
    say(String(e.message || e));
  }
});

function applySettings(s) {
  opts = Object.assign(opts, s || {});
  draw(512);
}

applySettings(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(applySettings);
render();
