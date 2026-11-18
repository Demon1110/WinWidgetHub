// 投稿检查：只管读文件，不执行组件里的代码。
// PR 里跑的就是这个；本地提交前也可以先跑一遍。

import path from "node:path";
import { spawnSync } from "node:child_process";
import { discover } from "./lib/widgets.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");

const { items, errors } = discover(ROOT);
const warnings = items.flatMap((item) => item.warnings);

for (const item of items) {
  console.log(`· ${item.id}  v${item.manifest.version}  ${item.category}  ${(item.bytes / 1024).toFixed(1)} KB  ${item.updated}`);
}

if (warnings.length) {
  console.log("\n给审核的人看的提醒：");
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (errors.length) {
  console.error("\n要修好才能合并：");
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// 源码没问题，再看仓库里提交的 .fwz 和 widgets.json 有没有跟着更新
const build = spawnSync(process.execPath, [path.join(ROOT, "scripts", "build.mjs"), "--check"], { stdio: "inherit" });
if (build.status !== 0) process.exit(build.status ?? 1);

console.log(`\n✓ ${items.length} 个组件都通过检查`);
