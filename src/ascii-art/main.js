/* 字块艺术：不用任何字体文件，直接拿系统字体渲染一遍再降采样成字符。
 * 先把字画在 64px 的离屏画布上，缩到几十列，按每格的覆盖率挑字符——所以形状是真的字，不是拼出来的点阵。 */

const t = widget.t;
const sayEl = document.getElementById("say");
const artEl = document.getElementById("art");
const outEl = document.getElementById("out");
const dimEl = document.getElementById("dim");
const toastEl = document.getElementById("toast");

const RAMPS = {
  block: " ░▒▓█",
  ascii: " .:-=+*#%@",
};

const work = document.createElement("canvas");
const wctx = work.getContext("2d");
const small = document.createElement("canvas");
const sctx = small.getContext("2d", { willReadFrequently: true });

function convert(text) {
  const cols = Number(widget.settings.get("width")) || 48;
  const ramp = RAMPS[widget.settings.get("ramp")] || RAMPS.block;

  wctx.font = '700 64px "Segoe UI Variable Display", "Segoe UI", "Microsoft YaHei UI", sans-serif';
  const lines = text.split("\n").slice(0, 3);
  const metrics = lines.map((line) => wctx.measureText(line || " "));
  const srcW = Math.max(80, Math.ceil(Math.max(...metrics.map((m) => m.width))) + 8);
  const lineH = 76;
  const srcH = lineH * lines.length + 8;

  work.width = srcW;
  work.height = srcH;
  wctx.font = '700 64px "Segoe UI Variable Display", "Segoe UI", "Microsoft YaHei UI", sans-serif';
  wctx.fillStyle = "#ffffff";
  wctx.textBaseline = "alphabetic";
  lines.forEach((line, i) => wctx.fillText(line, 4, 8 + lineH * i + 62));

  const cellAspect = 0.52; // 终端里字符大致高是宽的两倍
  const rows = Math.max(3, Math.round(cols * (srcH / srcW) * cellAspect));
  small.width = cols;
  small.height = rows;
  sctx.clearRect(0, 0, cols, rows);
  sctx.drawImage(work, 0, 0, srcW, srcH, 0, 0, cols, rows);

  const data = sctx.getImageData(0, 0, cols, rows).data;
  const out = [];
  for (let y = 0; y < rows; y += 1) {
    let row = "";
    for (let x = 0; x < cols; x += 1) {
      const i = (y * cols + x) * 4;
      const a = data[i + 3] / 255;
      const step = a <= 0.06 ? 0 : Math.min(ramp.length - 1, Math.round(a * (ramp.length - 1)));
      row += ramp[step];
    }
    out.push(row.replace(/\s+$/, ""));
  }
  return { text: out.join("\n"), cols, rows };
}

function paint() {
  const raw = sayEl.value.trim();
  const text = raw || t({ "zh-TW": "豆包", "zh-CN": "豆包", en: "Hello" });
  const result = convert(text);
  artEl.textContent = result.text;
  dimEl.textContent = `${result.cols}×${result.rows}`;

  const len = Math.max(1, ...result.text.split("\n").map((line) => line.length));
  artEl.style.fontSize = `${Math.min(0.62, (outEl.clientWidth / (len * 0.56)) / 16)}rem`;
}

document.getElementById("copy").textContent = t({ "zh-TW": "複製", "zh-CN": "复制", en: "Copy" });
document.getElementById("copy").onclick = () => {
  widget.clipboard.writeText(artEl.textContent)
    .then((ok) => widget.util.toast(toastEl, ok === false
      ? t({ "zh-TW": "剪貼簿被佔用了", "zh-CN": "剪贴板被占用了", en: "Clipboard is busy" })
      : t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "Copied" }), 1400))
    .catch((e) => widget.util.toast(toastEl, e.message, 2000));
};

sayEl.placeholder = t({ "zh-TW": "打幾個字，馬上變字符畫", "zh-CN": "打几个字，马上变字符画", en: "Type a word to block it up" });

let debounce = 0;
sayEl.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    paint();
    widget.storage.set("say", sayEl.value).catch(() => {});
  }, 350);
});

widget.settings.onChange(paint);
widget.on("resize", () => requestAnimationFrame(paint));

widget.storage.get("say").then((v) => {
  if (v) sayEl.value = v;
  paint();
});
