const $ = widget.util.$;
const t = (o) => widget.t(o);
const L = widget.util.L;

const CASE_MODES = [
  { id: "keep", label: L("保持", "保持", "Keep") },
  { id: "lower", label: L("小写", "小写", "lower") },
  { id: "upper", label: L("大写", "大写", "UPPER") },
  { id: "capitalize", label: L("首字母大写", "首字母大写", "Capitalize") },
  { id: "title", label: L("每词大写", "每词大写", "Title Case") },
];
const EXT_MODES = [
  { id: "keep", label: L("保持", "保持", "Keep") },
  { id: "lower", label: L("小写", "小写", "lower") },
  { id: "upper", label: L("大写", "大写", "UPPER") },
];
const ORDER_MODES = [
  { id: "input", label: L("添加顺序", "添加顺序", "Added") },
  { id: "name", label: L("名称 A→Z", "名称 A→Z", "Name A→Z") },
  { id: "nameDesc", label: L("名称 Z→A", "名称 Z→A", "Name Z→A") },
  { id: "type", label: L("扩展名", "扩展名", "Extension") },
];
const NUM_POS = [
  { id: "suffix", label: L("编号在后", "编号在后", "after") },
  { id: "prefix", label: L("编号在前", "编号在前", "before") },
];
const NUM_PAD = [
  { id: "0", label: L("不补零", "不补零", "no zeroes") },
  { id: "2", label: "01" },
  { id: "3", label: "001" },
  { id: "4", label: "0001" },
  { id: "5", label: "00001" },
];

const DEFAULT_RULES = {
  prefix: "",
  suffix: "",
  find: "",
  replace: "",
  regex: false,
  caseSensitive: false,
  numbering: false,
  numStart: 1,
  numStep: 1,
  numPad: 3,
  numPos: "suffix",
  caseMode: "keep",
  extMode: "keep",
  orderMode: "input",
};

const MAX_FILES = 300;
let files = [];
let rules = { ...DEFAULT_RULES };
let preview = { items: [], valid: [], selectedCount: 0, changedCount: 0, errorCount: 0 };
let lastBatch = null;
let confirmItems = [];
let toastTimer = 0;
let saveTimer = 0;

const esc = (value) =>
  String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const escAttr = esc;

function log(message) {
  try { if (widget.log) widget.log(`batch-rename: ${message}`); } catch {}
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

function splitPath(raw) {
  const text = String(raw || "").trim().replace(/\//g, "\\").replace(/\\+$/, "");
  const cut = text.lastIndexOf("\\");
  return cut >= 0 ? { dir: text.slice(0, cut), name: text.slice(cut + 1) } : { dir: "", name: text };
}

function joinPath(dir, name) {
  if (!dir) return name;
  return dir.endsWith("\\") ? `${dir}${name}` : `${dir}\\${name}`;
}

function splitName(name) {
  const text = String(name || "");
  const dot = text.lastIndexOf(".");
  if (dot <= 0 || dot === text.length - 1) return { stem: text, ext: "" };
  return { stem: text.slice(0, dot), ext: text.slice(dot) };
}

function fileFromPath(path) {
  const { dir, name } = splitPath(path);
  if (!name) return null;
  const { stem, ext } = splitName(name);
  return {
    path: path,
    dir,
    name,
    stem,
    ext,
    selected: true,
    kind: "file",
    icon: null,
    lastError: null,
  };
}

function uniquePaths(paths) {
  const seen = new Set();
  const out = [];
  for (const raw of paths || []) {
    const path = String(raw || "").trim();
    if (!path) continue;
    const key = path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(path);
  }
  return out;
}

function ordered(list) {
  const copy = [...list];
  if (rules.orderMode === "name") return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  if (rules.orderMode === "nameDesc") return copy.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" }));
  if (rules.orderMode === "type") {
    return copy.sort((a, b) => (a.ext || "").localeCompare(b.ext || "", undefined, { sensitivity: "base" }) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  }
  return copy;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function caseTransform(text, mode) {
  if (mode === "lower") return text.toLocaleLowerCase();
  if (mode === "upper") return text.toLocaleUpperCase();
  if (mode === "capitalize") return text ? text.charAt(0).toLocaleUpperCase() + text.slice(1) : text;
  if (mode === "title") {
    return text.replace(/(^|[\s._-])(\p{L})/gu, (_, lead, ch) => lead + ch.toLocaleUpperCase());
  }
  return text;
}

function padNumber(value) {
  const width = Number(rules.numPad) || 0;
  const text = String(value);
  return width > 0 ? text.padStart(width, "0") : text;
}

function expandTokens(text, file, index, numberText) {
  const date = new Date();
  const yyyy = String(date.getFullYear());
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mi = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return String(text || "").replace(/\{(date|time|yyyy|mm|dd|hh|mi|ss|index|name|ext)\}/gi, (_, key) => {
    switch (key.toLowerCase()) {
      case "date": return `${yyyy}${mm}${dd}`;
      case "time": return `${hh}${mi}${ss}`;
      case "yyyy": return yyyy;
      case "mm": return mm;
      case "dd": return dd;
      case "hh": return hh;
      case "mi": return mi;
      case "ss": return ss;
      case "index": return numberText == null ? String(index + 1) : String(numberText);
      case "name": return file.stem;
      case "ext": return file.ext.replace(/^\./, "");
      default: return _;
    }
  });
}

function reservedName(name) {
  const stem = String(name || "").split(".")[0].trim().toUpperCase();
  if (["CON", "PRN", "AUX", "NUL"].includes(stem)) return true;
  if (stem.length === 4 && (stem.startsWith("COM") || stem.startsWith("LPT"))) {
    const n = stem.slice(3);
    return n >= "1" && n <= "9";
  }
  return false;
}

function proposedName(file, index) {
  const numberValue = Number(rules.numStart || 0) + Number(rules.numStep || 1) * index;
  const numberText = rules.numbering ? padNumber(numberValue) : null;
  let stem = file.stem;
  let ext = file.ext;

  if (rules.find) {
    try {
      if (rules.regex) {
        const re = new RegExp(rules.find, rules.caseSensitive ? "g" : "gi");
        stem = stem.replace(re, rules.replace);
      } else if (rules.caseSensitive) {
        stem = stem.split(rules.find).join(rules.replace);
      } else {
        stem = stem.replace(new RegExp(escapeRegExp(rules.find), "gi"), () => rules.replace);
      }
    } catch (e) {
      return { name: "", error: L("正则表达式无效", "正则表达式无效", "Invalid regular expression") };
    }
  }

  stem = caseTransform(stem, rules.caseMode);

  if (rules.numbering) {
    const num = numberText;
    stem = rules.numPos === "prefix" ? `${num}-${stem}` : `${stem}-${num}`;
  }

  const prefix = expandTokens(rules.prefix, file, index, numberText);
  const suffix = expandTokens(rules.suffix, file, index, numberText);
  stem = `${prefix}${stem}${suffix}`;

  if (rules.extMode === "lower") ext = ext.toLocaleLowerCase();
  if (rules.extMode === "upper") ext = ext.toLocaleUpperCase();

  const name = `${stem}${ext}`;
  if (!stem) return { name, error: L("名称为空", "名称为空", "The name is empty") };
  if (name.length > 240) return { name, error: L("名称过长", "名称过长", "The name is too long") };
  if (stem.trim() === "" || /^[. ]+$/.test(stem)) return { name, error: L("名称只有空格或点", "名称只有空格或点", "The name is only spaces or dots") };
  if (name.includes("\\") || name.includes("/")) return { name, error: L("名称不能包含斜杠", "名称不能包含斜杠", "The name cannot contain a slash") };
  if (/[<>:"|?*\u0000-\u001f]/.test(name)) return { name, error: L("名称含 Windows 非法字符", "名称含 Windows 非法字符", "The name contains a character Windows forbids") };
  if (name.endsWith(".") || name.endsWith(" ")) return { name, error: L("名称不能以点或空格结尾", "名称不能以点或空格结尾", "The name cannot end with a dot or a space") };
  if (reservedName(name)) return { name, error: L("这是 Windows 保留名称", "这是 Windows 保留名称", "This is a Windows reserved name") };
  return { name, error: null };
}

function computePreview() {
  const orderedFiles = ordered(files);
  const items = orderedFiles.map((file, index) => {
    const proposed = proposedName(file, index);
    let error = file.lastError || proposed.error || null;
    const changed = !error && proposed.name !== file.name;
    return {
      file,
      index,
      newName: proposed.name,
      error,
      changed,
      selected: file.selected,
    };
  });

  const byTarget = new Map();
  for (const item of items) {
    if (item.error || !item.changed) continue;
    const key = `${item.file.dir.toLowerCase()}\\${item.newName.toLowerCase()}`;
    if (byTarget.has(key)) byTarget.get(key).push(item);
    else byTarget.set(key, [item]);
  }
  for (const group of byTarget.values()) {
    if (group.length < 2) continue;
    for (const item of group) item.error = L("目标名称重复", "目标名称重复", "Two targets share this name");
  }

  const valid = items.filter((item) => item.selected && item.changed && !item.error);
  return {
    items,
    valid,
    selectedCount: files.filter((f) => f.selected).length,
    changedCount: items.filter((item) => item.changed && !item.error).length,
    errorCount: items.filter((item) => !!item.error).length,
  };
}

function fileRow(item) {
  const file = item.file;
  const cls = `${file.selected ? "" : " skip"}${item.error ? " bad" : ""}`;
  const newCls = item.error ? "err" : item.changed ? "" : "same";
  const newText = item.error
    ? item.error
    : item.changed
      ? `→ ${item.newName}`
      : L("未改变", "未改变", "unchanged");
  const pathText = `${file.dir || ""}${item.error && !item.changed ? "" : ""}`;
  return `<div class="file${cls}" data-path="${escAttr(file.path)}">
    <button class="check" type="button" role="checkbox" aria-checked="${file.selected}" data-act="check" aria-label="${escAttr(file.name)}">
      <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 6.8"/></svg>
    </button>
    <div class="fmain">
      <span class="oldname">${esc(file.name)}</span>
      <span class="newname ${newCls}" title="${escAttr(item.error || item.newName)}">${esc(newText)}</span>
      <span class="fpath">${esc(pathText)}</span>
    </div>
    <button class="frowdel" type="button" data-act="del" aria-label="${escAttr(L("移除", "移除", "Remove"))}">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  </div>`;
}

function renderList() {
  $("fileList").innerHTML = preview.items.map(fileRow).join("");
  $("fileList").style.display = files.length ? "" : "none";
  $("empty").hidden = files.length > 0;
  $("count").textContent = files.length
    ? L(`${preview.selectedCount}/${files.length} 已选 · ${preview.changedCount} 个将改变`, `${preview.selectedCount}/${files.length} 已选 · ${preview.changedCount} 个将改变`, `${preview.selectedCount}/${files.length} selected · ${preview.changedCount} to rename`)
    : "";
  const all = files.length > 0 && files.every((f) => f.selected);
  $("checkAll").setAttribute("aria-checked", String(all));
}

function renderRules() {
  $("regexBtn").classList.toggle("on", rules.regex);
  $("regexBtn").setAttribute("aria-pressed", String(rules.regex));
  $("caseBtn").classList.toggle("on", rules.caseSensitive);
  $("caseBtn").setAttribute("aria-pressed", String(rules.caseSensitive));
  $("numBtn").classList.toggle("on", rules.numbering);
  $("numBtn").setAttribute("aria-pressed", String(rules.numbering));
  $("numRow").hidden = !rules.numbering;
}

function renderFooter() {
  const canRename = typeof widget.shell.rename === "function";
  const count = preview.valid.length;
  $("applyBtn").disabled = count === 0;
  $("applyBtn").textContent = canRename
    ? L(`应用 (${count})`, `应用 (${count})`, `Apply (${count})`)
    : L("复制命令", "复制命令", "Copy command");
  $("copyCmd").hidden = !canRename;
  $("copyCmd").textContent = L("复制命令", "复制命令", "Copy command");
  $("undoBtn").hidden = !canRename || !lastBatch;
  $("undoBtn").disabled = !canRename || !lastBatch;

  const status = files.length
    ? preview.errorCount
      ? L(`${preview.selectedCount}/${files.length} 已选 · ${preview.valid.length} 个可执行 · ${preview.errorCount} 个有问题`,
        `${preview.selectedCount}/${files.length} 已选 · ${preview.valid.length} 个可执行 · ${preview.errorCount} 个有问题`,
        `${preview.selectedCount}/${files.length} selected · ${preview.valid.length} ready · ${preview.errorCount} with issues`)
      : L(`${preview.selectedCount}/${files.length} 已选 · ${preview.valid.length} 个可执行`,
        `${preview.selectedCount}/${files.length} 已选 · ${preview.valid.length} 个可执行`,
        `${preview.selectedCount}/${files.length} selected · ${preview.valid.length} ready`)
    : L("拖入文件，或从剪贴板添加", "拖入文件，或从剪贴板添加", "Drop files, or add them from the clipboard");
  $("status").textContent = status;
  $("sub").textContent = files.length
    ? L(`${files.length} 个文件 · 预览后执行`, `${files.length} 个文件 · 预览后执行`, `${files.length} files · preview first`)
    : L("工业级批量重命名 · 预览后执行", "工业级批量重命名 · 预览后执行", "Industrial batch rename · preview first");
  $("hint").textContent = files.length
    ? L("只改同一文件夹内的文件名；同名目标不会被覆盖", "只改同一文件夹内的文件名；同名目标不会被覆盖", "Same-folder renames only; existing names are never overwritten")
    : L("拖入文件，或用上方按钮添加；规则会实时预览", "拖入文件，或用上方按钮添加；规则会实时预览", "Drop files or use the buttons above; rules preview live");
}

function render() {
  preview = computePreview();
  renderList();
  renderRules();
  renderFooter();
}

function clearErrors() {
  for (const file of files) file.lastError = null;
}

function saveRulesSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    widget.storage.set("rules", rules).catch((e) => log(`save rules: ${e.message || e}`));
  }, 450);
}

function updateRule(key, value) {
  rules[key] = value;
  clearErrors();
  saveRulesSoon();
  render();
}

function parseNumber(value, fallback, min) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.floor(n));
}

function applyRulesToInputs() {
  $("prefix").value = rules.prefix;
  $("suffix").value = rules.suffix;
  $("find").value = rules.find;
  $("replace").value = rules.replace;
  $("caseMode").value = rules.caseMode;
  $("extMode").value = rules.extMode;
  $("orderMode").value = rules.orderMode;
  $("numStart").value = String(rules.numStart);
  $("numStep").value = String(rules.numStep);
  $("numPad").value = String(rules.numPad);
  $("numPos").value = rules.numPos;
}

async function loadRules() {
  try {
    const saved = await widget.storage.get("rules");
    if (saved && typeof saved === "object") {
      const merged = { ...DEFAULT_RULES, ...saved };
      merged.regex = !!merged.regex;
      merged.caseSensitive = !!merged.caseSensitive;
      merged.numbering = !!merged.numbering;
      merged.numStart = parseNumber(merged.numStart, 1, 0);
      merged.numStep = parseNumber(merged.numStep, 1, 1);
      merged.numPad = [0, 2, 3, 4, 5].includes(Number(merged.numPad)) ? Number(merged.numPad) : 3;
      merged.numPos = merged.numPos === "prefix" ? "prefix" : "suffix";
      merged.caseMode = CASE_MODES.some((m) => m.id === merged.caseMode) ? merged.caseMode : "keep";
      merged.extMode = EXT_MODES.some((m) => m.id === merged.extMode) ? merged.extMode : "keep";
      merged.orderMode = ORDER_MODES.some((m) => m.id === merged.orderMode) ? merged.orderMode : "input";
      return merged;
    }
  } catch (e) {
    log(`load rules: ${e.message || e}`);
  }
  return { ...DEFAULT_RULES };
}

async function loadLastBatch() {
  try {
    const saved = await widget.storage.get("lastBatch");
    if (!saved || !Array.isArray(saved.items) || !saved.items.length) return null;
    return { items: saved.items.slice(0, MAX_FILES), at: Number(saved.at) || 0 };
  } catch {
    return null;
  }
}

function saveLastBatch() {
  if (lastBatch) widget.storage.set("lastBatch", lastBatch).catch((e) => log(`save undo: ${e.message || e}`));
  else widget.storage.remove("lastBatch").catch(() => {});
}

async function addPaths(paths) {
  const incoming = uniquePaths(paths);
  if (!incoming.length) return;
  const existing = new Set(files.map((f) => f.path.toLowerCase()));
  const fresh = [];
  let duplicate = 0;
  for (const path of incoming) {
    if (existing.has(path.toLowerCase())) { duplicate += 1; continue; }
    existing.add(path.toLowerCase());
    const file = fileFromPath(path);
    if (file) fresh.push(file);
  }
  let overflow = 0;
  const room = Math.max(0, MAX_FILES - files.length);
  if (fresh.length > room) {
    overflow = fresh.length - room;
    fresh.length = room;
  }
  if (!fresh.length) {
    toast(overflow
      ? L(`最多一次处理 ${MAX_FILES} 个文件`, `最多一次处理 ${MAX_FILES} 个文件`, `Up to ${MAX_FILES} files at a time`)
      : duplicate
        ? L("这些文件已经在列表里了", "这些文件已经在列表里了", "Those files are already in the list")
        : L("没有可添加的文件", "没有可添加的文件", "No files to add"));
    return;
  }
  files.push(...fresh);
  render();

  const added = fresh.slice();
  const infos = await Promise.all(
    added.map(async (file) => {
      try { return { file, info: await widget.shell.info(file.path, { size: 24 }) }; }
      catch { return { file, info: null }; }
    })
  );
  let skipped = 0;
  for (const { file, info } of infos) {
    if (!info) continue;
    if (!info.exists || info.kind === "missing" || info.kind === "folder") {
      files = files.filter((f) => f.path !== file.path);
      skipped += 1;
      continue;
    }
    file.name = String(info.name || file.name);
    file.kind = info.kind || "file";
    file.icon = info.icon || null;
    const parts = splitName(file.name);
    file.stem = parts.stem;
    file.ext = parts.ext;
  }
  render();
  if (skipped) toast(L(`已跳过 ${skipped} 个文件夹或失效路径`, `已跳过 ${skipped} 个文件夹或失效路径`, `Skipped ${skipped} folders or missing paths`));
  if (duplicate) toast(L(`已忽略 ${duplicate} 个重复文件`, `已忽略 ${duplicate} 个重复文件`, `Ignored ${duplicate} duplicate files`));
  if (overflow) toast(L(`最多一次处理 ${MAX_FILES} 个文件`, `最多一次处理 ${MAX_FILES} 个文件`, `Up to ${MAX_FILES} files at a time`));
}

async function addFromPicker() {
  try {
    const path = await widget.shell.pick({ type: "file", filter: "all", title: L("选择要重命名的文件", "选择要重命名的文件", "Choose files to rename") });
    if (path) await addPaths([path]);
  } catch (e) {
    toast(String(e.message || e));
  }
}

async function pasteFiles() {
  try {
    const copied = await widget.clipboard.readFiles();
    const paths = (copied || []).filter((f) => f && (f.isFile || !f.isDirectory)).map((f) => f.path);
    if (!paths.length) {
      toast(L("剪贴板里没有文件", "剪贴板里没有文件", "No files on the clipboard"));
      return;
    }
    await addPaths(paths);
  } catch (e) {
    toast(String(e.message || e));
  }
}

function removeFile(path) {
  files = files.filter((f) => f.path !== path);
  render();
}

function clearFiles() {
  if (!files.length) return;
  if (!confirm(L(`清空 ${files.length} 个文件？不会改动磁盘上的文件。`, `清空 ${files.length} 个文件？不会改动磁盘上的文件。`, `Clear ${files.length} files? Nothing on disk is changed.`))) return;
  files = [];
  render();
}

function psQuote(text) {
  return String(text).replace(/'/g, "''");
}

async function copyCommand() {
  if (!preview.valid.length) {
    toast(L("没有可执行的改名项", "没有可执行的改名项", "Nothing to rename"));
    return;
  }
  const lines = ["$ErrorActionPreference = 'Stop'"];
  for (const item of preview.valid) {
    lines.push(`Rename-Item -LiteralPath '${psQuote(item.file.path)}' -NewName '${psQuote(item.newName)}'`);
  }
  const script = lines.join("\n");
  try {
    await widget.clipboard.writeText(script);
    toast(L(`已复制 ${preview.valid.length} 条 PowerShell 命令`, `已复制 ${preview.valid.length} 条 PowerShell 命令`, `Copied ${preview.valid.length} PowerShell commands`));
  } catch (e) {
    toast(String(e.message || e));
  }
}

function openConfirm() {
  if (!preview.valid.length) return;
  confirmItems = preview.valid.slice();
  $("confirmTitle").textContent = L(`确认重命名 ${confirmItems.length} 个文件？`, `确认重命名 ${confirmItems.length} 个文件？`, `Rename ${confirmItems.length} files?`);
  $("confirmText").textContent = L(
    "文件会在原文件夹内改名，不会覆盖已有文件。建议确认预览无误后继续。",
    "文件会在原文件夹内改名，不会覆盖已有文件。建议确认预览无误后继续。",
    "Files are renamed inside their current folder and existing names are never overwritten. Check the preview before continuing."
  );
  $("confirmPanel").hidden = false;
}

async function applyRename() {
  $("confirmPanel").hidden = true;
  if (!confirmItems.length) return;
  const items = confirmItems.map((item) => ({ from: item.file.path, to: joinPath(item.file.dir, item.newName) }));
  try {
    const report = await widget.shell.rename(items);
    const successes = (report && report.items || []).filter((r) => r.ok);
    const failures = (report && report.items || []).filter((r) => !r.ok);
    for (const result of successes) {
      const file = files.find((f) => f.path.toLowerCase() === String(result.from).toLowerCase());
      if (!file) continue;
      const target = result.to || joinPath(file.dir, "");
      const { dir, name } = splitPath(target);
      const parts = splitName(name);
      file.path = target;
      file.dir = dir;
      file.name = name;
      file.stem = parts.stem;
      file.ext = parts.ext;
      file.lastError = null;
    }
    for (const result of failures) {
      const file = files.find((f) => f.path.toLowerCase() === String(result.from).toLowerCase());
      if (file) file.lastError = String(result.error || L("重命名失败", "重命名失败", "Rename failed"));
    }
    if (successes.length) {
      lastBatch = { items: successes.map((r) => ({ from: r.from, to: r.to })), at: Date.now() };
      saveLastBatch();
    }
    if (failures.length) {
      toast(L(`${successes.length} 个成功，${failures.length} 个失败`, `${successes.length} 个成功，${failures.length} 个失败`, `${successes.length} succeeded, ${failures.length} failed`));
    } else {
      toast(L(`已重命名 ${successes.length} 个文件`, `已重命名 ${successes.length} 个文件`, `Renamed ${successes.length} files`));
    }
    render();
  } catch (e) {
    toast(String(e.message || e));
  }
}

async function undoLast() {
  if (!lastBatch || !lastBatch.items.length) return;
  if (!confirm(L(`撤销上次 ${lastBatch.items.length} 个改名？`, `撤销上次 ${lastBatch.items.length} 个改名？`, `Undo the last ${lastBatch.items.length} renames?`))) return;
  const reverse = lastBatch.items.map((item) => ({ from: item.to, to: item.from }));
  try {
    const report = await widget.shell.rename(reverse);
    const successes = (report && report.items || []).filter((r) => r.ok);
    const failures = (report && report.items || []).filter((r) => !r.ok);
    for (const result of successes) {
      const file = files.find((f) => f.path.toLowerCase() === String(result.from).toLowerCase());
      if (!file) continue;
      const { dir, name } = splitPath(result.to || "");
      const parts = splitName(name);
      file.path = result.to;
      file.dir = dir;
      file.name = name;
      file.stem = parts.stem;
      file.ext = parts.ext;
      file.lastError = null;
    }
    if (successes.length === lastBatch.items.length) {
      lastBatch = null;
      saveLastBatch();
    } else {
      lastBatch.items = lastBatch.items.filter((item) => !successes.some((r) => String(r.from).toLowerCase() === String(item.to).toLowerCase()));
      if (lastBatch.items.length) saveLastBatch(); else { lastBatch = null; saveLastBatch(); }
    }
    toast(failures.length
      ? L(`${successes.length} 个已撤销，${failures.length} 个失败`, `${successes.length} 个已撤销，${failures.length} 个失败`, `${successes.length} undone, ${failures.length} failed`)
      : L(`已撤销 ${successes.length} 个改名`, `已撤销 ${successes.length} 个改名`, `Undid ${successes.length} renames`));
    render();
  } catch (e) {
    toast(String(e.message || e));
  }
}

function fillSelect(id, options) {
  $(id).innerHTML = options.map((o) => `<option value="${escAttr(o.id)}">${esc(o.label)}</option>`).join("");
}

function bind() {
  $("title").textContent = L("批量重命名", "批量重命名", "Batch Rename");
  $("lblPrefix").textContent = L("前缀", "前缀", "Prefix");
  $("lblSuffix").textContent = L("后缀", "后缀", "Suffix");
  $("lblFind").textContent = L("查找", "查找", "Find");
  $("lblReplace").textContent = L("替换", "替换", "Replace");
  $("lblCase").textContent = L("大小写", "大小写", "Case");
  $("lblExt").textContent = L("扩展名", "扩展名", "Ext");
  $("lblOrder").textContent = L("排序", "排序", "Order");
  $("lblStart").textContent = L("起始", "起始", "Start");
  $("lblStep").textContent = L("步长", "步长", "Step");
  $("lblPad").textContent = L("位数", "位数", "Digits");
  $("lblPos").textContent = L("位置", "位置", "Place");
  $("prefix").placeholder = L("旅行_", "旅行_", "trip_");
  $("suffix").placeholder = L("_终稿", "_终稿", "_final");
  $("find").placeholder = L("查找文字", "查找文字", "find text");
  $("replace").placeholder = L("替换为", "替换为", "replace with");
  $("fileLabel").textContent = L("文件名（旧 → 新）", "文件名（旧 → 新）", "File (old → new)");
  $("copyCmd").textContent = L("复制命令", "复制命令", "Copy command");
  $("emptyText").textContent = L("把文件拖进来，或从剪贴板添加", "把文件拖进来，或从剪贴板添加", "Drop files here, or add them from the clipboard");
  $("confirmTitle").textContent = "";
  $("confirmText").textContent = "";
  $("cancelApply").textContent = L("再看看", "再看看", "Review");
  $("doApply").textContent = L("确认执行", "确认执行", "Rename");
  $("addBtn").setAttribute("aria-label", L("添加文件", "添加文件", "Add files"));
  $("pasteBtn").setAttribute("aria-label", L("从剪贴板添加", "从剪贴板添加", "Add from clipboard"));
  $("clearBtn").setAttribute("aria-label", L("清空", "清空", "Clear"));

  fillSelect("caseMode", CASE_MODES);
  fillSelect("extMode", EXT_MODES);
  fillSelect("orderMode", ORDER_MODES);
  fillSelect("numPad", NUM_PAD);
  fillSelect("numPos", NUM_POS);

  $("prefix").addEventListener("input", (e) => updateRule("prefix", e.target.value));
  $("suffix").addEventListener("input", (e) => updateRule("suffix", e.target.value));
  $("find").addEventListener("input", (e) => updateRule("find", e.target.value));
  $("replace").addEventListener("input", (e) => updateRule("replace", e.target.value));
  $("regexBtn").onclick = () => updateRule("regex", !rules.regex);
  $("caseBtn").onclick = () => updateRule("caseSensitive", !rules.caseSensitive);
  $("numBtn").onclick = () => updateRule("numbering", !rules.numbering);
  $("caseMode").onchange = (e) => updateRule("caseMode", e.target.value);
  $("extMode").onchange = (e) => updateRule("extMode", e.target.value);
  $("orderMode").onchange = (e) => updateRule("orderMode", e.target.value);
  $("numStart").addEventListener("input", (e) => updateRule("numStart", parseNumber(e.target.value, 1, 0)));
  $("numStep").addEventListener("input", (e) => updateRule("numStep", parseNumber(e.target.value, 1, 1)));
  $("numPad").onchange = (e) => updateRule("numPad", Number(e.target.value) || 0);
  $("numPos").onchange = (e) => updateRule("numPos", e.target.value);

  $("addBtn").onclick = addFromPicker;
  $("pasteBtn").onclick = pasteFiles;
  $("clearBtn").onclick = clearFiles;
  $("undoBtn").onclick = undoLast;
  $("copyCmd").onclick = copyCommand;
  $("applyBtn").onclick = () => {
    if (typeof widget.shell.rename !== "function") {
      copyCommand();
      toast(L("当前客户端不支持直接改名，已复制 PowerShell 命令，请在终端粘贴执行。", "当前客户端不支持直接改名，已复制 PowerShell 命令，请在终端粘贴执行。", "This client cannot rename directly; PowerShell commands were copied for you to run."));
      return;
    }
    openConfirm();
  };
  $("cancelApply").onclick = () => { $("confirmPanel").hidden = true; };
  $("doApply").onclick = applyRename;

  $("checkAll").onclick = () => {
    const all = files.length > 0 && files.every((f) => f.selected);
    for (const file of files) file.selected = !all;
    render();
  };
  $("fileList").addEventListener("click", (e) => {
    const row = e.target.closest(".file");
    if (!row) return;
    const path = row.dataset.path;
    if (e.target.closest("[data-act='check']")) {
      const file = files.find((f) => f.path === path);
      if (file) file.selected = !file.selected;
      render();
      return;
    }
    if (e.target.closest("[data-act='del']")) {
      removeFile(path);
    }
  });

  if (widget.on) {
    widget.on("drop", (data) => {
      const paths = (data && data.paths) || [];
      if (paths.length) addPaths(paths);
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $("confirmPanel").hidden = true;
  });
}

async function boot() {
  rules = await loadRules();
  lastBatch = await loadLastBatch();
  bind();
  applyRulesToInputs();
  render();
  if (location.search.includes("preview")) {
    window.__wwRenamePreview = { addPaths, setRules: (next) => { rules = { ...rules, ...next }; applyRulesToInputs(); render(); } };
  }
}

boot().catch((e) => {
  log(`boot: ${e.message || e}`);
  const status = $("status");
  if (status) status.textContent = String(e.message || e);
});
