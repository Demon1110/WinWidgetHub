/* 代码截图：把文本排成一张图。
 * 着色器是自己写的极简 tokenizer——认注释、字符串、数字、关键字就够了，
 * 不引高亮库，省体积也不吃版权。画完的图留在内存里，点「存图」直接进剪贴板。 */

const t = widget.t;
const srcEl = document.getElementById("src");
const shot = document.getElementById("shot");
const ctx = shot.getContext("2d");
const toastEl = document.getElementById("toast");
const previewEl = document.getElementById("preview");

const KEYWORDS = {
  js: "const let var function return if else for while class new await async import export from default try catch throw typeof of in this null true false undefined",
  py: "def class return if elif else for while import from as with try except raise lambda None True False and or not in is pass yield",
  rust: "fn let mut impl struct enum match if else for while loop return pub use mod crate self Self some none ok err where trait dyn async await move ref",
  json: "true false null",
};

const THEMES = {
  dark: { bg: "#14161f", rail: "#1b1e29", fg: "#e7ebf5", dim: "#5b6172", str: "#a8e6a1", num: "#f0b46b", key: "#7ad0ff", com: "#6d7688" },
  light: { bg: "#f6f4ef", rail: "#ece9e0", fg: "#22242b", dim: "#9a978f", str: "#2f7d4f", num: "#a85a12", key: "#165fa8", com: "#938f86" },
};

function palette() {
  return widget.settings.get("dark") !== false ? THEMES.dark : THEMES.light;
}

/** 一行切成交替的 [文本, 类别] 片段；类别只用来选颜色。 */
function tokenize(line, lang) {
  const words = (KEYWORDS[lang] || KEYWORDS.js).split(" ");
  const out = [];
  let rest = line;
  const push = (text, kind) => {
    if (text) out.push([text, kind]);
  };
  while (rest.length) {
    const comment = /^(\/\/|#|\/\*)/.exec(rest);
    if (comment && (lang !== "json" || rest.startsWith("//"))) {
      push(rest, "com");
      break;
    }
    const str = /^("(\\.|[^"\\])*"|'(\\.|[^'\\])*'|`(\\.|[^`\\])*`)/.exec(rest);
    if (str) {
      push(str[0], "str");
      rest = rest.slice(str[0].length);
      continue;
    }
    const num = /^-?\d+(\.\d+)?/.exec(rest);
    if (num) {
      push(num[0], "num");
      rest = rest.slice(num[0].length);
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word) {
      push(word[0], words.includes(word[0].toLowerCase()) ? "key" : "fg");
      rest = rest.slice(word[0].length);
      continue;
    }
    const other = /^[^A-Za-z_$\d"'`#\/]+/.exec(rest);
    const chunk = other ? other[0] : rest[0];
    push(chunk, "fg");
    rest = rest.slice(chunk.length);
  }
  return out;
}

function render() {
  const code = srcEl.value.replace(/\r/g, "").replace(/\t/g, "  ");
  const lines = code.split("\n");
  const lang = widget.settings.get("lang") || "js";
  const P = palette();

  const fontSize = 13;
  const lineHeight = Math.round(fontSize * 1.62);
  const padX = 22;
  const padY = 20;
  const railW = 34;
  const headH = 30;

  const font = `${fontSize}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
  ctx.font = font;
  const widest = Math.max(120, ...lines.map((line) => ctx.measureText(line.replace(/\t/g, "  ")).width));
  const width = Math.min(1800, Math.ceil(railW + padX * 2 + widest));
  const height = headH + padY * 2 + lines.length * lineHeight;

  shot.width = width;
  shot.height = height;

  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = P.rail;
  ctx.fillRect(0, 0, width, headH);
  ctx.fillStyle = P.dim;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(16 + i * 14, headH / 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.font = font;
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    const y = headH + padY + index * lineHeight + lineHeight / 2;
    ctx.fillStyle = P.dim;
    ctx.textAlign = "right";
    ctx.fillText(String(index + 1), railW + 6, y);
    ctx.textAlign = "left";
    let x = railW + padX;
    for (const [text, kind] of tokenize(line, lang)) {
      ctx.fillStyle = kind === "fg" ? P.fg : P[kind];
      ctx.fillText(text, x, y);
      x += ctx.measureText(text).width;
      if (x > width) break;
    }
  });

  const scale = Math.min(previewEl.clientWidth / width, previewEl.clientHeight / height);
  shot.style.width = `${Math.max(1, Math.floor(width * scale))}px`;
  shot.style.height = `${Math.max(1, Math.floor(height * scale))}px`;
}

document.getElementById("render").textContent = t({ "zh-TW": "重畫", "zh-CN": "重画", en: "Render" });
document.getElementById("copy").textContent = t({ "zh-TW": "存圖", "zh-CN": "存图", en: "Copy" });

document.getElementById("render").onclick = render;
document.getElementById("copy").onclick = () => {
  if (!shot.width) render();
  widget.clipboard.writeImage(shot.toDataURL("image/png"))
    .then((ok) => widget.util.toast(toastEl, ok === false
      ? t({ "zh-TW": "剪貼簿被佔用了", "zh-CN": "剪贴板被占用了", en: "Clipboard is busy" })
      : t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "Copied" }), 1400))
    .catch((e) => widget.util.toast(toastEl, e.message, 2000));
};

let debounce = 0;
srcEl.addEventListener("input", () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    render();
    widget.storage.set("src", srcEl.value).catch(() => {});
  }, 500);
});

widget.settings.onChange(render);
widget.on("resize", () => requestAnimationFrame(render));

widget.storage.get("src").then((v) => {
  if (v) srcEl.value = v;
  render();
});
