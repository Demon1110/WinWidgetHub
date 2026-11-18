# WinWidgetHub

WinWidget 的第三方组件仓库。组件源码在 `src/`，打包好的 `.fwz` 在 `widgets/`，根目录的 `widgets.json` 是客户端读取的组件清单。

```
src/                    每个组件一个文件夹，文件夹名就是组件 id
  demon.coin/
    widget.json         组件说明（名称、版本、权限、尺寸……）
    index.html
    main.js
    style.css
    icon.svg            清单里的 logo
    preview/            预览图（可选，建议放）
      instrument.zh-CN.png
widgets/                构建产物：<id>-<version>.fwz，提交进仓库
widgets.json            构建产物：组件清单，提交进仓库
.nojekyll               让 GitHub Pages 原样发文件，不走 Jekyll
scripts/
  build.mjs             源码 → .fwz + widgets.json
  check.mjs             投稿检查（PR 和本地都能跑）
  lib/                  zip 写入、源码扫描与校验
.github/workflows/      每次 PR / 推到 main 自动跑 check.mjs
```

## 加一个组件

1. 在 `src/` 下新建文件夹，**文件夹名必须是新组件的 id**，规则：小写字母、数字、点、横线、下划线，2–64 个字符，以字母或数字开头；不能用 `winwidget.` 和 `user.` 开头（客户端保留）。建议 `<作者名>.<组件名>`，例如 `demon.coin`。
2. 写 `widget.json`。除 `id` 必须和文件夹同名外，其余字段与 WinWidget 组件一致：

   ```json
   {
     "id": "demon.coin",
     "name": { "zh-TW": "擲硬幣", "zh-CN": "掷硬币", "en": "Coin Flip" },
     "description": { "zh-TW": "…", "zh-CN": "…", "en": "…" },
     "version": "1.0.0",
     "author": "Demon1110",
     "date": "2026-11-18",
     "entry": "index.html",
     "icon": "icon.svg",
     "category": "other",
     "size": { "width": 260, "height": 180, "minWidth": 160, "minHeight": 120, "grow": 1 },
     "permissions": [],
     "settings": []
   }
   ```

   `category` 只认 `time`、`weather`、`system`、`productivity`、`info`、`media`，其他值会被归到 `other`。权限只认客户端支持的 13 个（`system`、`notify`、`audio`、`media`、`clipboard`、`screen`、`input`、`schedule`、`sharp`、`ubrowser`、`shell.open`、`shell.launch`、`shell.drop`）和 `network:<域名>`。
3. 预览图放 `preview/`，按 `<主题>.<语言>.<png|webp>` 命名，例如 `instrument.zh-CN.png`、`paper.en.webp`。清单会存成模板，客户端按当前全局主题和语言挑一张；只有一张图时也可以直接命名为 `preview.png`。
4. 本地构建并检查：

   ```bash
   node scripts/build.mjs     # 或 npm run build
   node scripts/check.mjs     # 或 npm run check
   ```

   构建会写入 `widgets/<id>-<version>.fwz` 并更新根目录 `widgets.json`；同一个 id 的旧版本包会被删掉。
5. 把 `src/`、`widgets/`、`widgets.json` 一起提交。只提交源码、不提交产物，CI 会报「构建产物和源码对不上」。

## widgets.json

客户端（控制中心「添加组件 → 线上」）只读这个文件，格式与内置的市场客户端一致：

```json
{
  "schema": 1,
  "repo": "https://github.com/Demon1110/WinWidgetHub",
  "base": "https://raw.githubusercontent.com/Demon1110/WinWidgetHub/main/",
  "updated": "2026-11-18",
  "count": 1,
  "widgets": [
    {
      "id": "demon.coin",
      "name": "掷硬币",
      "description": "抛一次硬币，替你做决定",
      "version": "1.0.0",
      "author": "Demon1110",
      "category": "other",
      "updated": "2026-11-18",
      "icon": "https://…/src/demon.coin/icon.svg",
      "preview": "https://…/src/demon.coin/preview/{theme}.{lang}.png",
      "previews": ["https://…/src/demon.coin/preview/instrument.zh-CN.png", "…"],
      "permissions": [],
      "bytes": 3287,
      "sha256": "a4df30…",
      "download": "https://…/widgets/demon.coin-1.0.0.fwz",
      "page": "https://github.com/Demon1110/WinWidgetHub/tree/main/src/demon.coin"
    }
  ]
}
```

| 你要的字段 | 清单里的键 | 说明 |
|---|---|---|
| 标题 | `name` | `widget.json` 里是多语言对象，清单里取简中（没有就繁中、英文） |
| logo | `icon` | 指向 `src/<id>/` 下图标文件的绝对网址 |
| 预览图 | `preview` / `previews` | `preview` 可含 `{theme}`、`{lang}`，`previews` 是实际存在的所有预览图网址 |
| 介绍 | `description` | 同上，取简中 |
| 日期 | `updated` | `widget.json` 里的 `date`（`YYYY-MM-DD`）；没写就取组件文件夹最后一次 git 提交的日期。市场按它排序 |

`bytes` 是 `.fwz` 的大小，`sha256` 是包内容的哈希，`download` 必须是 http(s) 绝对地址（客户端只接受这种）。这些字段都由 `build.mjs` 生成，不要手改。

## 客户端怎么连

WinWidget 的市场地址来自设置文件的 `market_url`（环境变量 `WINWIDGET_MARKET` 也可以）。地址以 `.json` 结尾时直接当清单用，否则会拼上 `/widgets.json`。

本仓库用 GitHub Pages 发布，站点和清单地址：

```
https://demon1110.github.io/WinWidgetHub/
https://demon1110.github.io/WinWidgetHub/widgets.json
```

`build.mjs` 默认就用这个前缀拼下载、图标和预览图地址（`HUB_BASE_URL` 可以临时改成别的）。根目录的 `.nojekyll` 让 Pages 原样发文件，不走 Jekyll。

客户端那边：`src/market/client.rs` 的 `DEFAULT_LIST` 现在读的是 raw 清单 `https://raw.githubusercontent.com/Demon1110/WinWidgetHub/main/widgets.json`；Pages 生效后可以把它或设置文件的 `market_url` 换成上面的 Pages 清单地址。`DEFAULT_SITE` 是同仓库的 GitHub 主页，控制中心「在网站上看」会用这个。

几点要注意：

- Pages 第一次开启：仓库 → Settings → Pages → Source 选「Deploy from a branch」→ main / 根目录，部署 1–2 分钟。之后每次推 main 都会重新发布。
- 要临时用 raw 地址（比如 Pages 还没生效）时：`HUB_BASE_URL=https://raw.githubusercontent.com/Demon1110/WinWidgetHub/main/ node scripts/build.mjs`，再提交清单。
- 更新只认 `version`：**同一个 id 的版本只能往上加**，`build.mjs` 会拦住倒退。
- 客户端会把清单缓存到本地，十分钟内不重复拉取；改完清单想立刻看到，控制中心点「重新整理」。

## 检查规则

`scripts/check.mjs` 只读文件，不执行组件代码：

- 必须能过：id 合法且与文件夹同名、没用保留前缀；`name` 不为空；`version` 是三段数字；版本没倒退；入口文件和 `icon` 存在；权限都认识；没有 `.exe`/`.dll`/`.bat`/`.ps1` 这类可执行文件、没有符号链接；单组件不超过 5 MB、300 个文件。
- 只提醒、不拦：`network:*`、`shell.launch`、`clipboard`、`screen` 等敏感权限；代码里用了 `eval`、从网上加载 js；没有预览图；分类不认识。

## 示例组件

`src/demon.coin`（掷硬币）是最小示例：一个设置项、一次本地存储、三种语言的文案、三套主题下的样式差异，没有申请任何权限。可以照着它写，写完后删掉也行。
