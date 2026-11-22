// 构建：src/<id>/ → widgets/<id>-<version>.fwz + 根目录 widgets.json
//
// 用法：
//   node scripts/build.mjs           写入 .fwz 和 widgets.json
//   node scripts/build.mjs --check   只检查仓库里已提交的产物是否和源码一致（CI 用）

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { discover, pickText, compareVersions } from "./lib/widgets.mjs";
import { makeZip } from "./lib/zip.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "widgets");
const LIST = path.join(ROOT, "widgets.json");

// 清单和下载地址都按这个前缀拼绝对网址：客户端只接受 http(s) 的下载地址。
// 默认走 GitHub Pages；本地测试别的站点时用 HUB_BASE_URL 覆盖。
const BASE = (process.env.HUB_BASE_URL || "https://demon1110.github.io/WinWidgetHub/").replace(/\/?$/, "/");
const REPO = (process.env.HUB_REPO_URL || "https://github.com/Demon1110/WinWidgetHub").replace(/\/$/, "");
const CHECK_ONLY = process.argv.includes("--check");

function url(rel) {
  return (
    BASE +
    rel
      .split("/")
      .map((seg) =>
        encodeURIComponent(seg)
          // 预览图模板里的 {theme}、{lang} 要原样留着，客户端自己替换
          .replace(/%7B/g, "{")
          .replace(/%7D/g, "}"),
      )
      .join("/")
  );
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function previousList() {
  try {
    return JSON.parse(fs.readFileSync(LIST, "utf8"));
  } catch {
    return { widgets: [] };
  }
}

function buildOne(item, previousVersion) {
  const version = String(item.manifest.version).trim();
  const file = `${item.folder}-${version}.fwz`;
  const entries = item.files.map((f) => ({ name: `${item.folder}/${f.rel}`, data: f.data }));
  const archive = makeZip(entries);

  const preview = item.preview;
  const entry = {
    id: item.id,
    name: pickText(item.manifest.name, item.id),
    description: pickText(item.manifest.description),
    version,
    author: typeof item.manifest.author === "string" ? item.manifest.author.trim() : "",
    category: item.category,
    updated: item.updated,
    icon: item.manifest.icon ? url(`src/${item.folder}/${String(item.manifest.icon).replace(/\\/g, "/")}`) : null,
    preview: preview.template
      ? url(`src/${item.folder}/${preview.template}`)
      : preview.single
        ? url(`src/${item.folder}/${preview.single}`)
        : null,
    previews: preview.files.map((rel) => url(`src/${item.folder}/${rel}`)),
    permissions: item.manifest.permissions ?? [],
    bytes: archive.length,
    sha256: sha256(archive),
    download: url(`widgets/${file}`),
    page: `${REPO}/tree/main/src/${item.folder}`,
  };
  // 只有声明了非默认承载面才写这两个字段：桌面包保持旧清单形状，市场清单的 diff 只落在试点上。
  if (Array.isArray(item.manifest.surfaces) && item.manifest.surfaces.length) {
    entry.surfaces = item.manifest.surfaces;
    entry.defaultSurface =
      typeof item.manifest.defaultSurface === "string"
        ? item.manifest.defaultSurface
        : item.manifest.surfaces[0];
  }

  if (previousVersion && compareVersions(version, previousVersion) < 0) {
    throw new Error(`「${item.id}」的版本从 ${previousVersion} 退回到 ${version}：市场里的版本只能往上加`);
  }

  return { item, file, archive, entry };
}

function main() {
  const { items, errors } = discover(ROOT);
  if (errors.length) {
    console.error("构建停止，先修好这些问题：");
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  const previous = previousList();
  const previousVersions = new Map(
    (previous.widgets ?? []).map((w) => [String(w.id).toLowerCase(), { version: w.version, sha256: w.sha256 }]),
  );

  const built = items.map((item) =>
    buildOne(item, previousVersions.get(item.id.toLowerCase())?.version ?? null),
  );

  for (const { item } of built) {
    if (CHECK_ONLY) continue;
    for (const w of item.warnings) console.warn(`  ! ${w}`);
  }

  const widgets = built.map((b) => b.entry).sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.id.localeCompare(b.id));
  const newest = widgets.reduce((max, w) => (String(w.updated) > max ? String(w.updated) : max), "1970-01-01");
  const document = {
    schema: 1,
    repo: REPO,
    base: BASE,
    updated: widgets.length ? newest : "",
    count: widgets.length,
    widgets,
  };
  const text = `${JSON.stringify(document, null, 2)}\n`;

  if (CHECK_ONLY) {
    const stale = [];
    try {
      if (fs.readFileSync(LIST, "utf8") !== text) stale.push("widgets.json 和源码不一致，需要重新构建");
    } catch {
      stale.push("widgets.json 不存在");
    }
    for (const b of built) {
      const target = path.join(OUT, b.file);
      let onDisk = null;
      try {
        onDisk = fs.readFileSync(target);
      } catch {
        /* 还没打包 */
      }
      if (!onDisk) stale.push(`缺少 widgets/${b.file}`);
      else if (sha256(onDisk) !== b.entry.sha256) stale.push(`widgets/${b.file} 和源码不一致`);
    }
    if (stale.length) {
      console.error("构建产物和源码对不上，先在本地跑 node scripts/build.mjs 再提交：");
      for (const s of stale) console.error(`  ✗ ${s}`);
      process.exit(1);
    }
    console.log(`✓ 构建产物是最新的（${widgets.length} 个组件）`);
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  for (const b of built) {
    fs.writeFileSync(path.join(OUT, b.file), b.archive);
    // 同一个组件留着旧版本没有意义，客户端只认清单里的那一个
    for (const old of fs.readdirSync(OUT)) {
      if (!old.endsWith(".fwz")) continue;
      const prefix = `${b.item.folder}-`;
      if (old.startsWith(prefix) && old !== b.file) {
        fs.unlinkSync(path.join(OUT, old));
        console.log(`  - 删除旧包 widgets/${old}`);
      }
    }
    console.log(`  ✓ widgets/${b.file}  ${(b.archive.length / 1024).toFixed(1)} KB`);
  }

  fs.writeFileSync(LIST, text);
  console.log(`✓ widgets.json：${widgets.length} 个组件，更新日期 ${document.updated || "（还没有组件）"}`);
}

main();
