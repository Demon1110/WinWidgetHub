/* JSON 整理：解析 → 重排。错了就把 V8 报的位置换算成行列，不猜。
 * 只用页面自己的能力，粘贴即用，不读文件也不上网。 */

const t = widget.t;
const srcEl = document.getElementById("src");
const noteEl = document.getElementById("note");
const toastEl = document.getElementById("toast");

function indentUnit() {
  const v = widget.settings.get("indent");
  return v === "tab" ? "\t" : " ".repeat(Number(v) || 2);
}

/** 有 sort 时递归重建对象，数组保持原顺序。 */
function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
    return out;
  }
  return value;
}

function lineCol(text, pos) {
  const before = text.slice(0, Math.max(0, pos));
  const lines = before.split("\n");
  return { line: lines.length, col: (lines[lines.length - 1] || "").length + 1 };
}

/** V8 的语法错误只给字符位置，这里把它变成人能看的行列。 */
function explain(text, err) {
  const raw = String(err && err.message);
  const pos = /position\s+(\d+)/i.exec(raw);
  if (!pos) return raw;
  const { line, col } = lineCol(text, Number(pos[1]));
  const why = raw.replace(/[^\s]*position\s+\d+[^\s]*/i, "").replace(/\(\s*\)/, "").trim();
  return `${t({ "zh-TW": "第", "zh-CN": "第", en: "line " })}${line}${t({ "zh-TW": " 行第 ", "zh-CN": " 行第 ", en: ", column " })}${col}${t({ "zh-TW": " 列", "zh-CN": " 列", en: "" })}：${why}`;
}

function stats(value) {
  let keys = 0;
  let depth = 0;
  const walk = (node, level) => {
    depth = Math.max(depth, level);
    if (Array.isArray(node)) node.forEach((item) => walk(item, level + 1));
    else if (node && typeof node === "object") {
      for (const key of Object.keys(node)) {
        keys += 1;
        walk(node[key], level + 1);
      }
    }
  };
  walk(value, 1);
  return { keys, depth };
}

function parse() {
  const text = srcEl.value.trim();
  if (!text) {
    noteEl.textContent = t({ "zh-TW": "貼一段 JSON 進來", "zh-CN": "粘一段 JSON 进来", en: "Paste some JSON" });
    noteEl.classList.remove("bad");
    return null;
  }
  try {
    const value = JSON.parse(text);
    const s = stats(value);
    noteEl.textContent = `${t({ "zh-TW": "有效", "zh-CN": "有效", en: "Valid" })} · ${s.keys}${t({ "zh-TW": " 個鍵 · 深度 ", "zh-CN": " 个键 · 深度 ", en: " keys · depth " })}${s.depth}`;
    noteEl.classList.remove("bad");
    return value;
  } catch (err) {
    noteEl.textContent = explain(text, err);
    noteEl.classList.add("bad");
    return null;
  }
}

function rewrite(space) {
  const value = parse();
  if (value === null) return;
  const body = widget.settings.get("sort") ? sortDeep(value) : value;
  srcEl.value = JSON.stringify(body, null, space);
  parse();
  srcEl.scrollTop = 0;
}

document.getElementById("pretty").textContent = t({ "zh-TW": "排版", "zh-CN": "排版", en: "Pretty" });
document.getElementById("minify").textContent = t({ "zh-TW": "壓行", "zh-CN": "压行", en: "Minify" });
document.getElementById("copy").textContent = t({ "zh-TW": "複製", "zh-CN": "复制", en: "Copy" });

document.getElementById("pretty").onclick = () => rewrite(indentUnit());
document.getElementById("minify").onclick = () => rewrite("");
document.getElementById("copy").onclick = () => {
  widget.clipboard.writeText(srcEl.value)
    .then((ok) => widget.util.toast(toastEl, ok === false
      ? t({ "zh-TW": "剪貼簿被佔用了", "zh-CN": "剪贴板被占用了", en: "Clipboard is busy" })
      : t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "Copied" }), 1400))
    .catch((e) => widget.util.toast(toastEl, e.message, 2000));
};

srcEl.addEventListener("input", parse);
srcEl.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const at = srcEl.selectionStart;
    srcEl.setRangeText(indentUnit(), at, at, "end");
    parse();
  }
});

widget.storage.get("src").then((v) => {
  if (v) srcEl.value = v;
  parse();
});
srcEl.addEventListener("blur", () => widget.storage.set("src", srcEl.value).catch(() => {}));
