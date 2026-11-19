# WinWidgetHub

WinWidget 的第三方组件仓库。组件源码在 `src/`，打包好的 `.fwz` 在 `widgets/`，根目录的 `widgets.json` 是客户端读取的组件清单。

```
src/                    每个组件一个文件夹，文件夹名就是组件 id
  coin/
    widget.json         组件说明（名称、版本、权限、尺寸……）
    index.html
    main.js
    style.css
    icon.svg            清单里的 logo
    preview/             预览图（可选）
      preview.webp       推荐：一张透明背景 WebP，宽 300–700
      instrument.zh-CN.webp  可选：需要按主题/语言各一张时才这样命名
widgets/                构建产物：<id>-<version>.fwz，提交进仓库
widgets.json            构建产物：组件清单，提交进仓库
index.html              Pages 首页：网页版组件市场，直接读 widgets.json
.nojekyll               让 GitHub Pages 原样发文件，不走 Jekyll
scripts/
  build.mjs             源码 → .fwz + widgets.json
  check.mjs             投稿检查（PR 和本地都能跑）
  lib/                  zip 写入、源码扫描与校验
.github/workflows/      提交检查（check.yml）和 Pages 发布（deploy.yml）
```

## 内置组件镜像

`src/` 里有 57 个组件是从 WinWidget 自带的 `assets/widgets/` 复制过来的，打包、校验、发布流程和第三方组件完全一样。为了过客户端的规则，有两处改动：

- **id 去掉前缀，统一用唯一短名**：`winwidget.agenda` → `agenda`，`fullwidget.perpetual` → `perpetual`，`demon.batch-rename` → `batch-rename`，`demon.web-open` → `web-open`，`demon.coin` → `coin`。客户端安装时会拒绝 `winwidget.` / `user.` 开头的 id（`src/market/packages.rs` 的 `reject_reserved`）；本仓库也不再给组件加作者或项目前缀。
- **补 `date` 字段**：取原仓库里该组件最后一次提交的日期（`git log -1 --format=%cs -- assets/widgets/<名>`）。不写死日期的话，`build.mjs` 会退回到 git 提交日期，CI 重建清单时就和本地产物对不上。

这些组件在客户端里同时是内置组件（内置 id 是 `winwidget.*`），从市场装到桌面后会以市场 id 再出现一份，内置那份不受影响。

## 加一个组件

1. 在 `src/` 下新建文件夹，**文件夹名必须是新组件的 id**，规则：小写字母、数字、横线、下划线，2–64 个字符，以字母或数字开头；不要带 `demon.`、`fullwidget.` 这类作者/项目前缀，也不要用点号，直接取一个唯一短名，例如 `coin`、`batch-rename`。不能用 `winwidget.` 和 `user.` 开头（客户端保留）。
2. 写 `widget.json`。除 `id` 必须和文件夹同名外，其余字段与 WinWidget 组件一致：

   ```json
   {
     "id": "coin",
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
3. 预览图放 `preview/`，**优先一张透明背景的 `preview.webp`**（宽 300–700 像素即可）。只有确实需要按主题/语言分别展示时，才按 `<主题>.<语言>.webp` 命名，例如 `instrument.zh-CN.webp`、`paper.en.webp`；这时清单会存成模板，客户端按当前全局主题和语言挑一张。没有 WebP 时客户端会回退到同名 `.png` / `.jpg` / `.jpeg`；也可以直接把 `preview` 指向 PNG。批量把 PNG 转成 WebP：
   ```powershell
   pwsh -File scripts/preview-to-webp.ps1 -Path src/<id>/preview
   ```
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
      "id": "coin",
      "name": "掷硬币",
      "description": "抛一次硬币，替你做决定",
      "version": "1.0.0",
      "author": "Demon1110",
      "category": "other",
      "updated": "2026-11-18",
      "icon": "https://…/src/coin/icon.svg",
      "preview": "https://…/src/coin/preview/preview.webp",
      "previews": ["https://…/src/coin/preview/preview.webp"],
      "permissions": [],
      "bytes": 3287,
      "sha256": "a4df30…",
      "download": "https://…/widgets/coin-1.0.0.fwz",
      "page": "https://github.com/Demon1110/WinWidgetHub/tree/main/src/coin"
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

## 网页版市场（index.html）

打开 `https://demon1110.github.io/WinWidgetHub/` 就是网页版市场，布局和控制中心「添加组件 → 线上」一致：卡片带预览图、名称、作者与版本、介绍、权限、体积、更新日期，底部是「下载 .fwz」和「源码」。

- 数据：页面读同目录的 `widgets.json`，字段和客户端完全同一份，没有额外接口；读取失败会回退到 Pages 绝对地址，并提供「重试」。
- 检索：搜索框同时匹配 `id`、`name`、`description`、`author`，多个空格分隔的词按「全部包含」处理。
- 排序：「最近更新」（默认，`updated` 倒序）、「名称 A→Z」、「体积从大到小」、「版本从新到旧」。
- 筛选：分类胶囊（时间/天气/系统/效率/资讯/媒体/其他）带计数，不认识的分类归到「其他」。
- 主题：跟随系统，右上角可切换深浅色，选择记在 `localStorage`。
- 纯静态单文件，无外部依赖、无构建步骤；改样式直接改 `index.html`。

几点要注意：

- Pages 用 Actions 发布（`.github/workflows/deploy.yml`）：仓库 → Settings → Pages → Source 选「GitHub Actions」，之后每次推 main 都会先跑 `check.mjs`，再把 `index.html`、`widgets.json`、`widgets/`、`src/` 复制到 `_site` 上传发布。第一次配置完可以在 Actions 里手动 Run workflow。
- 要临时用 raw 地址（比如 Pages 还没生效）时：`HUB_BASE_URL=https://raw.githubusercontent.com/Demon1110/WinWidgetHub/main/ node scripts/build.mjs`，再提交清单。
- 更新只认 `version`：**同一个 id 的版本只能往上加**，`build.mjs` 会拦住倒退。
- 客户端会把清单缓存到本地，十分钟内不重复拉取；改完清单想立刻看到，控制中心点「重新整理」。

## 检查规则

`scripts/check.mjs` 只读文件，不执行组件代码：

- 必须能过：id 合法且与文件夹同名、没用保留前缀；`name` 不为空；`version` 是三段数字；版本没倒退；入口文件和 `icon` 存在；权限都认识；没有 `.exe`/`.dll`/`.bat`/`.ps1` 这类可执行文件、没有符号链接；单组件不超过 5 MB、300 个文件。
- 只提醒、不拦：`network:*`、`shell.launch`、`clipboard`、`screen` 等敏感权限；代码里用了 `eval`、从网上加载 js；没有预览图；分类不认识。

## 示例组件

`src/coin`（掷硬币）是最小示例：一个设置项、一次本地存储、三种语言的文案、三套主题下的样式差异，没有申请任何权限。可以照着它写，写完后删掉也行。
