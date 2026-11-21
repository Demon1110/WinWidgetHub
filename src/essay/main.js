const t = widget.t;
const $ = (id) => document.getElementById(id);
const title = $("title");
const body = $("body");
const stat = $("stat");
const saved = $("saved");
const btn = $("export");

let opts = { fontSize: "medium", leading: "normal", paper: true, exportTitle: "h1" };
let timer = 0;
let savedTimer = 0;

title.placeholder = t({ "zh-TW": "標題", "zh-CN": "标题", en: "Title" });
body.placeholder = t({ "zh-TW": "從這裡開始寫…", "zh-CN": "从这里开始写…", en: "Start writing…" });
btn.textContent = t({ "zh-TW": "存成 Markdown", "zh-CN": "存成 Markdown", en: "Save Markdown" });

function stats() {
  const text = body.value;
  const cjk = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  const latin = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length;
  const chars = [...text.replace(/\s/g, "")].length;
  const minutes = Math.max(1, Math.round((cjk / 300 + latin / 200) || 0));
  return { cjk, latin, chars, minutes };
}

function renderStats() {
  const s = stats();
  const words = s.cjk + s.latin;
  stat.textContent = `${s.chars} ${t({ "zh-TW": "字", "zh-CN": "字", en: "chars" })} · ${words} ${t({ "zh-TW": "詞", "zh-CN": "词", en: "words" })} · ${t({ "zh-TW": "約", "zh-CN": "约", en: "~" })}${s.minutes} ${t({ "zh-TW": "分鐘", "zh-CN": "分钟", en: "min read" })}`;
}

function flashSaved() {
  saved.textContent = t({ "zh-TW": "已保存", "zh-CN": "已保存", en: "Saved" });
  saved.classList.add("on");
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => saved.classList.remove("on"), 1400);
}

function store() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    widget.storage
      .set("doc", { title: title.value, body: body.value, at: Date.now() })
      .then(flashSaved)
      .catch((e) => widget.log(`essay: save failed: ${e.message}`));
  }, 450);
}

function markdown() {
  const head = opts.exportTitle === "h1" && title.value.trim() ? `# ${title.value.trim()}\n\n` : "";
  return head + body.value.replace(/\r\n/g, "\n").trimEnd() + "\n";
}

function slug() {
  const t0 = title.value.trim() || body.value.trim().split("\n")[0] || "essay";
  return (
    t0
      .replace(/[\\/:*?"<>|]/g, "")
      .slice(0, 40)
      .trim() || "essay"
  );
}

body.addEventListener("input", () => {
  renderStats();
  store();
});
title.addEventListener("input", store);

btn.addEventListener("click", async () => {
  try {
    const path = await widget.shell.save({
      title: t({ "zh-TW": "存下這篇", "zh-CN": "保存这篇", en: "Save this piece" }),
      name: slug() + ".md",
      filter: "text",
    });
    if (!path) return;
    await widget.file.write(path, markdown());
    flashSaved();
    widget.log(`essay: wrote ${path}`);
  } catch (e) {
    stat.textContent = String(e.message || e);
  }
});

function applySettings(s) {
  opts = Object.assign(opts, s || {});
  document.body.classList.remove("size-small", "size-medium", "size-large");
  document.body.classList.add(`size-${opts.fontSize}`);
  document.body.classList.remove("leading-tight", "leading-normal", "leading-loose");
  document.body.classList.add(`leading-${opts.leading}`);
  document.body.classList.toggle("paper", !!opts.paper);
}

applySettings(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(applySettings);

widget.storage.get("doc").then((doc) => {
  if (doc && typeof doc === "object") {
    title.value = doc.title || "";
    body.value = doc.body || "";
  }
  renderStats();
});

widget.on("summon", () => {
  body.focus();
  body.setSelectionRange(body.value.length, body.value.length);
});
