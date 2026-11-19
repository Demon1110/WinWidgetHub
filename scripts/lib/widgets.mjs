// 读取 src/ 下的组件源码并做校验。build.mjs 和 check.mjs 都用这里的规则，
// 保证「本地能打包」和「PR 能通过」是同一套标准。

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/** 客户端认识的非网络权限（对应 src/model/permissions.rs 的 KNOWN）。 */
export const KNOWN_PERMISSIONS = [
  "system",
  "notify",
  "audio",
  "media",
  "clipboard",
  "screen",
  "input",
  "schedule",
  "sharp",
  "ubrowser",
  "shell.open",
  "shell.launch",
  "shell.drop",
];

/** 客户端会把不认识的分类归到 other，这里只允许它认识的六个加上 other。 */
export const KNOWN_CATEGORIES = ["time", "weather", "system", "productivity", "info", "media", "other"];

/** 包里不允许出现的可执行文件或脚本。 */
export const FORBIDDEN_EXT = [
  ".exe", ".dll", ".bat", ".cmd", ".ps1", ".psm1", ".sh", ".msi", ".scr", ".com", ".vbs", ".vbe", ".jar", ".lnk",
];

export const LIMITS = { bytes: 5 * 1024 * 1024, files: 300 };

const ID_RE = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const VERSION_RE = /^\d+\.\d+\.\d+([-+].*)?$/;
const RESERVED_PREFIX = ["winwidget.", "user."];
const LANGS = ["zh-CN", "zh-TW", "en"];

// ── widget.json：允许注释和尾逗号（模板里就写了注释） ─────────────────────
function stripComments(text) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function stripTrailingCommas(text) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const ch = text[i];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        out += text[i + 1] ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < text.length && /\s/.test(text[j])) j += 1;
      if (text[j] === "}" || text[j] === "]") {
        i += 1; // 跳过这个逗号
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

export function parseJsonc(text) {
  const clean = stripTrailingCommas(stripComments(text.replace(/^\uFEFF/, "")));
  return JSON.parse(clean);
}

// ── 文本 ─────────────────────────────────────────────────────────────────
/** widget.json 里的 name/description 可以是字符串，也可以是 { "zh-CN": … }。 */
export function pickText(value, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object") {
    for (const lang of LANGS) {
      const text = value[lang];
      if (typeof text === "string" && text.trim()) return text.trim();
    }
    for (const text of Object.values(value)) {
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return fallback;
}

export function compareVersions(a, b) {
  const part = (v) =>
    String(v)
      .split(/[-+]/)[0]
      .split(".")
      .map((n) => parseInt(n, 10) || 0);
  const x = part(a);
  const y = part(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return Math.sign(d);
  }
  return 0;
}

/** 目录里所有文件的相对路径都用 / 分隔，压缩包里也一样。 */
function walk(dir, prefix = "", state = { count: 0, bytes: 0, files: [], problems: [] }) {
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === ".git" || name === "node_modules" || name === "Thumbs.db" || name === ".DS_Store") continue;
    const abs = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = fs.lstatSync(abs);
    if (stat.isSymbolicLink()) {
      state.problems.push(`「${rel}」是符号链接，压缩包里不能有链接`);
      continue;
    }
    if (stat.isDirectory()) {
      walk(abs, rel, state);
      continue;
    }
    if (!stat.isFile()) {
      state.problems.push(`「${rel}」不是普通文件`);
      continue;
    }
    state.count += 1;
    state.bytes += stat.size;
    state.files.push({ rel, abs, data: fs.readFileSync(abs), size: stat.size });
  }
  return state;
}

function gitDate(root, rel) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cs", "--", rel], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out || null;
  } catch {
    return null;
  }
}

function fileDate(abs) {
  const d = fs.statSync(abs).mtime;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * 扫描 src/ 下每个组件文件夹。
 * @returns {{ items: object[], errors: string[] }}
 */
export function discover(root) {
  const srcDir = path.join(root, "src");
  const items = [];
  const errors = [];

  if (!fs.existsSync(srcDir)) return { items, errors: ["src/ 目录不存在"] };

  for (const name of fs.readdirSync(srcDir).sort()) {
    if (name.startsWith(".") || name.startsWith("_")) continue;
    const dir = path.join(srcDir, name);
    if (!fs.statSync(dir).isDirectory()) {
      errors.push(`src/${name} 不是文件夹：组件必须是 src/<组件 id>/ 下的一个文件夹`);
      continue;
    }

    const problems = [];
    const warnings = [];
    const manifestPath = path.join(dir, "widget.json");
    if (!fs.existsSync(manifestPath)) {
      errors.push(`src/${name} 缺少 widget.json`);
      continue;
    }

    let manifest;
    try {
      manifest = parseJsonc(fs.readFileSync(manifestPath, "utf8"));
    } catch (e) {
      errors.push(`src/${name}/widget.json 解析失败：${e.message}`);
      continue;
    }

    const id = typeof manifest.id === "string" ? manifest.id.trim() : "";
    if (!id) {
      errors.push(`src/${name}/widget.json 没有 id`);
      continue;
    }
    if (id !== name) {
      errors.push(`src/${name} 的文件夹名必须和 id 一致（id 是「${id}」）`);
    }
    if (!ID_RE.test(id)) {
      errors.push(`id「${id}」不合规则：只能用小写字母、数字、点、横线和下划线，2–64 个字符，且以字母或数字开头`);
    }
    for (const prefix of RESERVED_PREFIX) {
      if (id.toLowerCase().startsWith(prefix)) {
        errors.push(`id「${id}」不能用「${prefix}」开头，那是客户端保留的前缀`);
      }
    }
    if (typeof manifest.version !== "string" || !VERSION_RE.test(manifest.version.trim())) {
      errors.push(`「${id}」的 version 要写成 1.0.0 这样的三段数字`);
    }
    const name0 = pickText(manifest.name);
    if (!name0) problems.push(`「${id}」缺少 name`);

    const entry = typeof manifest.entry === "string" && manifest.entry.trim() ? manifest.entry.trim() : "index.html";
    const files = walk(dir, "", { count: 0, bytes: 0, files: [], problems: [] });
    problems.push(...files.problems);

    if (!files.files.some((f) => f.rel === entry.replace(/\\/g, "/"))) {
      problems.push(`「${id}」找不到入口文件 ${entry}`);
    }
    if (manifest.icon && !files.files.some((f) => f.rel === String(manifest.icon).replace(/\\/g, "/"))) {
      problems.push(`「${id}」的 icon「${manifest.icon}」不存在`);
    }

    for (const perm of manifest.permissions ?? []) {
      if (typeof perm !== "string") {
        problems.push(`「${id}」的 permissions 里有不是字符串的项`);
        continue;
      }
      const known = KNOWN_PERMISSIONS.includes(perm) || (perm.startsWith("network:") && perm.length > "network:".length);
      if (!known) problems.push(`「${id}」用了客户端不认识的权限「${perm}」`);
      if (perm === "network:*") warnings.push(`「${id}」要连到任何网站（network:*），审核时要说明用途`);
      if (perm === "shell.launch" || perm === "clipboard" || perm === "screen") {
        warnings.push(`「${id}」要「${perm}」权限，属于敏感权限，审核时要说明用途`);
      }
    }

    for (const file of files.files) {
      const ext = path.extname(file.rel).toLowerCase();
      if (FORBIDDEN_EXT.includes(ext)) problems.push(`「${id}」含有不允许的文件 ${file.rel}`);
      if (/\.(?:js|mjs|jsx|ts|html)$/i.test(file.rel)) {
        const text = file.data.toString("utf8");
        if (/\beval\s*\(/.test(text)) warnings.push(`「${id}」的 ${file.rel} 里用了 eval`);
        if (/https?:\/\/[^"'\s]+\.(?:js|mjs)/.test(text)) warnings.push(`「${id}」的 ${file.rel} 从网上加载代码`);
      }
    }

    if (files.bytes > LIMITS.bytes) problems.push(`「${id}」有 ${(files.bytes / 1048576).toFixed(1)} MB，超过 5 MB`);
    if (files.count > LIMITS.files) problems.push(`「${id}」有 ${files.count} 个文件，超过 300 个`);

    const category = String(manifest.category ?? "other").trim().toLowerCase();
    if (!KNOWN_CATEGORIES.includes(category)) {
      warnings.push(`「${id}」的 category「${category}」客户端不认识，会归到 other`);
    }

    // 日期：widget.json 里写了就用它（构建结果稳定，CI 也不会因为提交时间不同而对不上）；
    // 没写就取组件文件夹最后一次 git 提交的日期，还没提交过就用文件时间。
    const declared = typeof manifest.date === "string" ? manifest.date.trim() : "";
    let updated;
    if (/^\d{4}-\d{2}-\d{2}$/.test(declared)) {
      updated = declared;
    } else {
      if (declared) warnings.push(`「${id}」的 date「${declared}」不是 YYYY-MM-DD，改用 git 日期`);
      updated = gitDate(root, `src/${name}`) || fileDate(manifestPath);
    }

    const preview = findPreview(files.files);
    if (!preview.template && !preview.single) {
      warnings.push(`「${id}」没有预览图：建议在 preview/ 下放一张 preview.webp（一张即可；主题 × 语言版本可选）`);
    }

    items.push({
      id,
      folder: name,
      dir,
      manifest,
      entry,
      category,
      updated,
      preview,
      files: files.files,
      bytes: files.bytes,
      problems,
      warnings,
    });
  }

  const seen = new Map();
  for (const item of items) {
    const key = item.id.toLowerCase();
    if (seen.has(key)) errors.push(`id「${item.id}」在 ${seen.get(key)} 和 ${item.folder} 里重复了`);
    else seen.set(key, item.folder);
  }

  for (const item of items) errors.push(...item.problems);
  return { items, errors };
}

/**
 * 预览图：优先一张 preview.webp；需要按主题/语言各一张时用「主题.语言.webp」生成模板，
 * 清单里跟着全局主题和语言走。只有一张图时就直接用它。
 */
function findPreview(files) {
  const images = files.filter(
    (f) => /^preview\/[^/]+\.(?:webp|png|jpg|jpeg)$/i.test(f.rel) && !f.rel.split("/").pop().startsWith("."),
  );
  if (!images.length) return { template: null, single: null, files: [] };

  const named = images
    .map((f) => ({
      file: f,
      match: path.basename(f.rel).match(/^([a-z0-9-]+)\.(zh-TW|zh-CN|en)\.(webp|png|jpg|jpeg)$/i),
    }))
    .filter((x) => x.match);

  if (named.length === images.length) {
    const ext = path.extname(named[0].file.rel).toLowerCase();
    return {
      template: `preview/{theme}.{lang}${ext}`,
      single: null,
      files: images.map((f) => f.rel),
    };
  }
  return { template: null, single: images[0].rel, files: images.map((f) => f.rel) };
}
