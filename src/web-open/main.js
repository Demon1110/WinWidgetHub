const $ = (id) => document.getElementById(id);
const t = (o) => widget.t(o);
const L = (tw, cn, en) => t({ "zh-TW": tw, "zh-CN": cn, en });
const log = (msg) => {
  try { if (widget.log) widget.log(`web-open: ${msg}`); } catch {}
};

const GROUPS = [
  { id: "frequent", label: L("常用", "常用", "Frequent") },
  { id: "ai", label: L("AI", "AI", "AI") },
  { id: "work", label: L("工作", "工作", "Work") },
  { id: "life", label: L("生活", "生活", "Life") },
];

const groupLabel = (id) => (GROUPS.find((g) => g.id === id) || GROUPS[0]).label;

const DEFAULT_SITES = [
  { id: "site-doubao", name: "豆包", url: "https://www.doubao.com/chat/", group: "ai", browser: "default" },
  { id: "site-kimi", name: "Kimi", url: "https://www.kimi.com/", group: "ai", browser: "default" },
  { id: "site-deepseek", name: "DeepSeek", url: "https://chat.deepseek.com/", group: "ai", browser: "default" },
  { id: "site-qwen", name: "通义千问", url: "https://tongyi.aliyun.com/qianwen/", group: "ai", browser: "default" },
  { id: "site-yuanbao", name: "腾讯元宝", url: "https://yuanbao.tencent.com/chat/", group: "ai", browser: "default" },
  { id: "site-gemini", name: "Gemini", url: "https://gemini.google.com/app", group: "ai", browser: "default" },
  { id: "site-github", name: "GitHub", url: "https://github.com/", group: "work", browser: "default" },
  { id: "site-bilibili", name: "哔哩哔哩", url: "https://www.bilibili.com/", group: "life", browser: "default" },
  { id: "site-zhihu", name: "知乎", url: "https://www.zhihu.com/", group: "life", browser: "default" },
];

const BROWSER_CANDIDATES = [
  {
    id: "chrome",
    name: "Google Chrome",
    paths: [
      "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe",
      "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe",
      "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe",
    ],
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    paths: [
      "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe",
      "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
  },
  {
    id: "firefox",
    name: "Mozilla Firefox",
    paths: [
      "%ProgramFiles%\\Mozilla Firefox\\firefox.exe",
      "%ProgramFiles(x86)%\\Mozilla Firefox\\firefox.exe",
    ],
  },
  {
    id: "brave",
    name: "Brave",
    paths: [
      "%ProgramFiles%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
      "%LocalAppData%\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
    ],
  },
];

const esc = (value) =>
  String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const escAttr = esc;

let sites = [];
let browsers = [];
let selected = new Set();
let search = "";
let editing = false;
let tab = "web";
let clip = { files: [], image: null };
let toastTimer = 0;

function defaultBrowser() {
  return { id: "default", name: L("系統預設", "系统默认", "System default"), path: "" };
}

function storedId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function hueFor(text) {
  let h = 0;
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

function normalizeUrl(raw) {
  let text = String(raw || "").trim();
  if (!text) return null;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return String(url || "").replace(/^https?:\/\//, "").split("/")[0];
  }
}

function letterOf(site) {
  const chars = Array.from(String(site.name || hostOf(site.url) || "?"));
  return (chars[0] || "?").toUpperCase();
}

function siteStyle(site) {
  const hue = Number.isFinite(site.hue) ? site.hue : hueFor(site.url || site.name);
  return `background:linear-gradient(145deg,hsl(${hue} 58% 48%),hsl(${hue} 64% 31%))`;
}

function browserOf(id) {
  return browsers.find((b) => b.id === id) || browsers[0];
}

function uniquePaths(paths) {
  const seen = new Set();
  const out = [];
  for (const p of paths || []) {
    const text = String(p || "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeSite(raw) {
  if (!raw || typeof raw !== "object") return null;
  const url = normalizeUrl(raw.url);
  if (!url) return null;
  const name = String(raw.name || "").trim().slice(0, 60) || hostOf(url);
  const group = GROUPS.some((g) => g.id === raw.group) ? raw.group : "frequent";
  return {
    id: String(raw.id || storedId("site")),
    name,
    url,
    group,
    browser: String(raw.browser || "default"),
    hue: Number.isFinite(Number(raw.hue)) ? Number(raw.hue) : hueFor(url),
  };
}

async function loadSites() {
  try {
    const saved = await widget.storage.get("sites");
    if (Array.isArray(saved)) return saved.map(normalizeSite).filter(Boolean);
  } catch (e) {
    log(`load sites: ${e.message || e}`);
  }
  return DEFAULT_SITES.map((s) => normalizeSite({ ...s, hue: hueFor(s.url) })).filter(Boolean);
}

async function loadBrowsers() {
  const list = [defaultBrowser()];
  try {
    const saved = await widget.storage.get("browsers");
    if (Array.isArray(saved)) {
      for (const raw of saved) {
        const path = String(raw && raw.path || "").trim();
        if (!path) continue;
        if (list.some((b) => b.path.toLowerCase() === path.toLowerCase())) continue;
        list.push({
          id: String(raw.id || storedId("browser")),
          name: String(raw.name || "").trim().slice(0, 40) || "Browser",
          path,
        });
      }
    }
  } catch (e) {
    log(`load browsers: ${e.message || e}`);
  }
  return list;
}

function saveSites() {
  widget.storage.set("sites", sites).catch((e) => log(`save sites: ${e.message || e}`));
}

function saveBrowsers() {
  widget.storage
    .set("browsers", browsers.filter((b) => b.id !== "default"))
    .catch((e) => log(`save browsers: ${e.message || e}`));
}

function browserOptions(current) {
  return browsers
    .map((b) => `<option value="${escAttr(b.id)}"${b.id === current ? " selected" : ""}>${esc(b.name)}</option>`)
    .join("");
}

function groupOptions(current) {
  return GROUPS.map((g) => `<option value="${escAttr(g.id)}"${g.id === current ? " selected" : ""}>${esc(g.label)}</option>`).join("");
}

function rowHtml(site) {
  const browser = browserOf(site.browser);
  const checked = selected.has(site.id);
  const custom = !!browser.path;
  return `<div class="site${checked ? " selected" : ""}" data-id="${escAttr(site.id)}">
    <button class="check" type="button" role="checkbox" aria-checked="${checked}" data-act="check" aria-label="${escAttr(site.name)}">
      <svg viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 6.8"/></svg>
    </button>
    <span class="siteicon" style="${escAttr(siteStyle(site))}">${esc(letterOf(site))}</span>
    <div class="sitebody">
      <span class="sitename">${esc(site.name)}</span>
      <span class="sitehost">${esc(hostOf(site.url))} · ${esc(groupLabel(site.group))}</span>
    </div>
    <div class="site-end">
      <span class="browserpill${custom ? " custom" : ""}" title="${escAttr(browser.name)}">${esc(browser.name)}</span>
      <div class="rowtools">
        <select data-act="browser" aria-label="${escAttr(browser.name)}">${browserOptions(site.browser)}</select>
        <button class="del" type="button" data-act="del" aria-label="删除">
          <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
    </div>
  </div>`;
}

function filteredSites() {
  const q = search.trim().toLowerCase();
  if (!q) return sites;
  return sites.filter((s) => `${s.name} ${s.url} ${hostOf(s.url)} ${groupLabel(s.group)}`.toLowerCase().includes(q));
}

function renderWeb() {
  const list = filteredSites();  $("siteList").innerHTML = list.map(rowHtml).join("");
  $("siteList").style.display = list.length ? "" : "none";
  $("emptyWeb").hidden = list.length > 0;
  $("emptyWeb").textContent = sites.length
    ? L("没有匹配的网站", "没有匹配的网站", "No matching sites")
    : L("还没有网站，點右上角 + 添加", "还没有网站，点右上角 + 添加", "No sites yet — use + to add one");
  $("sub").textContent = L(
    `${sites.length} 个站点 · 可分别指定浏览器`,
    `${sites.length} 个站点 · 可分别指定浏览器`,
    `${sites.length} sites · a browser for each`
  );
  $("openSelected").disabled = selected.size === 0;
  $("openSelected").textContent = selected.size
    ? L(`打开选中 (${selected.size})`, `打开选中 (${selected.size})`, `Open ${selected.size}`)
    : L("打开选中", "打开选中", "Open selected");
  renderStatus();
}

function renderAI() {
  const list = sites.filter((s) => s.group === "ai");
  $("aiList").innerHTML = list.length
    ? list
        .map(
          (s) => `<button class="ai" type="button" data-id="${escAttr(s.id)}">
            <span class="siteicon" style="${escAttr(siteStyle(s))}">${esc(letterOf(s))}</span>
            <span class="ainame">${esc(s.name)}<span class="aihost">${esc(hostOf(s.url))}</span></span>
          </button>`
        )
        .join("")
    : `<div class="empty">${esc(L("把网站分组设为 AI，就会出现在这里", "把网站分组设为 AI，就会出现在这里", "Set a site's group to AI and it appears here"))}</div>`;
  $("aiHint").textContent = clip.files.length
    ? L(`${clip.files.length} 个文件已准备好`, `${clip.files.length} 个文件已准备好`, `${clip.files.length} files ready`)
    : clip.image
      ? L("剪贴板图片已就绪", "剪贴板图片已就绪", "Clipboard image ready")
      : L("把文字或文件拖进来，点助手直接粘贴", "把文字或文件拖进来，点助手直接粘贴", "Drop text or files, then click an assistant");
  renderClip();
  renderStatus();
}

function render() {
  renderWeb();
  if (tab === "ai") renderAI();
}

function renderStatus() {
  if (tab === "web") {    $("status").textContent = L(
      `已选 ${selected.size} / ${sites.length}`,
      `已选 ${selected.size} / ${sites.length}`,
      `${selected.size} of ${sites.length} selected`
    );
  } else {
    const files = clip.files.length;
    $("status").textContent = files
      ? L(`已准备 ${files} 个文件`, `已准备 ${files} 个文件`, `${files} files ready`)
      : clip.image
        ? L("已准备剪贴板图片", "已准备剪贴板图片", "Clipboard image ready")
        : L("输入文字，或拖入文件", "输入文字，或拖入文件", "Type, or drop files");
  }
}

let clipIconHtml = "";
function renderClip() {
  const bar = $("clipBar");
  const icon = bar.querySelector(".clipicon");
  if (!clipIconHtml) clipIconHtml = icon.innerHTML;
  const has = clip.files.length > 0 || !!clip.image;
  bar.hidden = !has;
  if (!has) {
    icon.innerHTML = clipIconHtml;
    return;
  }
  if (clip.image && !clip.files.length) {
    icon.innerHTML = `<img alt="" src="${escAttr(clip.image)}">`;
  } else {
    icon.innerHTML = clipIconHtml;
  }
  $("clipText").textContent = clip.files.length
    ? L(`${clip.files.length} 个文件：${clip.files.map((p) => p.split(/[\\/]/).pop()).slice(0, 2).join("、")}${clip.files.length > 2 ? "…" : ""}`,
       `${clip.files.length} 个文件：${clip.files.map((p) => p.split(/[\\/]/).pop()).slice(0, 2).join("、")}${clip.files.length > 2 ? "…" : ""}`,
       `${clip.files.length} files: ${clip.files.map((p) => p.split(/[\\/]/).pop()).slice(0, 2).join(", ")}${clip.files.length > 2 ? "…" : ""}`)
    : L("剪贴板图片", "剪贴板图片", "Clipboard image");
  $("clearClip").hidden = false;
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2300);
}

async function openSite(site, quiet) {
  const browser = browserOf(site.browser);
  let fallback = false;
  try {
    if (browser.path) {
      if (typeof widget.shell.openWith === "function") {
        await widget.shell.openWith(site.url, browser.path);
      } else {
        await widget.shell.open(site.url);
        fallback = true;
      }
    } else {
      await widget.shell.open(site.url);
    }
    if (!quiet) toast(L(`已打开 ${site.name}`, `已打开 ${site.name}`, `Opened ${site.name}`));
    if (fallback) {
      toast(L("当前客户端还不支持指定浏览器，已用默认浏览器打开", "当前客户端还不支持指定浏览器，已用默认浏览器打开", "This client cannot choose a browser yet; opened in the default one"));
    }
    return true;
  } catch (e) {
    toast(`${site.name}: ${e.message || e}`);
    return false;
  }
}

async function openSelected() {
  const list = sites.filter((s) => selected.has(s.id));
  if (!list.length) return;
  $("openSelected").disabled = true;
  let ok = 0;
  for (const site of list) {
    if (await openSite(site, true)) ok += 1;
  }
  toast(L(`已打开 ${ok}/${list.length} 个网页`, `已打开 ${ok}/${list.length} 个网页`, `Opened ${ok}/${list.length} pages`));
  selected.clear();
  renderWeb();
}

function setTab(next) {
  tab = next === "ai" ? "ai" : "web";
  $("tabWeb").setAttribute("aria-selected", String(tab === "web"));
  $("tabAi").setAttribute("aria-selected", String(tab === "ai"));
  $("webPane").hidden = tab !== "web";
  $("aiPane").hidden = tab !== "ai";
  $("openSelected").hidden = tab !== "web";
  if (tab === "ai") {
    renderAI();
    setTimeout(() => $("aiText").focus(), 0);
  } else {
    renderWeb();
  }
}

async function sendToAI(site) {
  const autoCopy = widget.settings.get("autoCopy") !== false;
  let prepared = "";
  try {
    if (clip.files.length) {
      if (autoCopy) {
        await widget.clipboard.writeFiles(clip.files);
        prepared = L(`${clip.files.length} 个文件`, `${clip.files.length} 个文件`, `${clip.files.length} files`);
      }
    } else if (clip.image) {
      prepared = L("图片", "图片", "image");
    } else if (aiText().trim()) {
      if (autoCopy) {
        await widget.clipboard.writeText(aiText().trim());
        prepared = L("文字", "文字", "text");
      }
    }
  } catch (e) {
    toast(L("复制到剪贴板失败，仍会打开助手", "复制到剪贴板失败，仍会打开助手", "Could not copy; opening the assistant anyway"));
  }
  const ok = await openSite(site, true);
  if (!ok) return;
  if (prepared && autoCopy) {
    toast(L(`已复制${prepared}，打开后 Ctrl+V 发送`, `已复制${prepared}，打开后 Ctrl+V 发送`, `Copied ${prepared}; paste with Ctrl+V`));
  } else {
    toast(L(`已打开 ${site.name}`, `已打开 ${site.name}`, `Opened ${site.name}`));
  }
}

function aiText() {
  return String($("aiText").value || "");
}

function clearClip() {
  clip = { files: [], image: null };
  renderClip();
  renderStatus();
}

function formatBrowserName(info, fallback) {
  const name = String(info && info.name || "").trim();
  return name || fallback || "Browser";
}

async function addBrowserFromPicker() {
  const path = await widget.shell.pick({
    type: "file",
    filter: "programs",
    title: L("选择一个浏览器程序", "选择一个浏览器程序", "Choose a browser"),
  });
  if (!path) return;
  if (browsers.some((b) => b.path.toLowerCase() === path.toLowerCase())) {
    toast(L("这个浏览器已经添加过了", "这个浏览器已经添加过了", "That browser is already in the list"));
    return;
  }
  let info = null;
  try { info = await widget.shell.info(path, { size: 20 }); } catch {}
  const name = formatBrowserName(info, path.split(/[\\/]/).pop().replace(/\.exe$/i, ""));
  browsers.push({ id: storedId("browser"), name, path });
  saveBrowsers();
  renderBrowserSheet();
  render();
  toast(L(`已添加 ${name}`, `已添加 ${name}`, `Added ${name}`));
}

function removeBrowser(id) {
  const browser = browsers.find((b) => b.id === id);
  if (!browser || id === "default") return;
  if (!confirm(L(`移除浏览器“${browser.name}”？相关网站会恢复为系统默认。`, `移除浏览器“${browser.name}”？相关网站会恢复为系统默认。`, `Remove ${browser.name}? Sites using it will fall back to the system default.`))) return;
  browsers = browsers.filter((b) => b.id !== id);
  for (const site of sites) if (site.browser === id) site.browser = "default";
  saveBrowsers();
  saveSites();
  renderBrowserSheet();
  render();
}

async function detectBrowsers() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (browsers.some((b) => b.path && b.path.toLowerCase().includes(candidate.paths[0].split(/[\\/]/).slice(-1)[0].toLowerCase()) && b.name === candidate.name)) {
      continue;
    }
    for (const raw of candidate.paths) {
      try {
        const info = await widget.shell.info(raw, { size: 20 });
        if (!info || !info.exists) continue;
        if (browsers.some((b) => b.path.toLowerCase() === String(raw).toLowerCase())) break;
        const resolved = String(info.path || raw);
        if (browsers.some((b) => b.path.toLowerCase() === resolved.toLowerCase())) break;
        browsers.push({ id: candidate.id, name: candidate.name, path: resolved });
        saveBrowsers();
        render();
        break;
      } catch {}
    }
  }
}

function renderBrowserSheet() {
  $("browserList").innerHTML = browsers
    .map(
      (b) => `<div class="browserrow" data-id="${escAttr(b.id)}">
        <span class="bicon">${esc(Array.from(b.name)[0] || "B")}</span>
        <span class="bmain">
          <span class="bname">${esc(b.name)}</span>
          <span class="bpath" title="${escAttr(b.path || L("系统默认浏览器", "系统默认浏览器", "System default browser"))}">${esc(b.path || L("系统默认浏览器", "系统默认浏览器", "System default browser"))}</span>
        </span>
        ${b.id === "default" ? "" : `<button class="del" type="button" data-act="remove" aria-label="移除"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`}
      </div>`
    )
    .join("");
  $("browserMsg").textContent = "";
}

function openSiteSheet() {
  $("siteMsg").textContent = "";
  $("siteName").value = "";
  $("siteUrl").value = "";
  $("siteGroup").innerHTML = groupOptions(tab === "ai" ? "ai" : "frequent");
  $("siteBrowser").innerHTML = browserOptions("default");
  $("siteSheetTitle").textContent = L("添加网站", "添加网站", "Add a site");
  $("siteSheet").hidden = false;
  setTimeout(() => $("siteName").focus(), 0);
}

function closeSiteSheet() {
  $("siteSheet").hidden = true;
}

function saveSite() {
  const name = $("siteName").value.trim();
  const url = normalizeUrl($("siteUrl").value);
  if (!url) {
    $("siteMsg").textContent = L("请填写有效的 http/https 网址", "请填写有效的 http/https 网址", "Enter a valid http/https URL");
    return;
  }
  const finalName = (name || hostOf(url)).slice(0, 60);
  sites.unshift({
    id: storedId("site"),
    name: finalName,
    url,
    group: $("siteGroup").value || "frequent",
    browser: $("siteBrowser").value || "default",
    hue: hueFor(url),
  });
  saveSites();
  closeSiteSheet();
  render();
  toast(L(`已添加 ${finalName}`, `已添加 ${finalName}`, `Added ${finalName}`));
}

function setEditing(next) {
  editing = next;
  $("editBtn").classList.toggle("on", editing);
  $("editBtn").setAttribute("aria-pressed", String(editing));
  document.querySelector(".wo").classList.toggle("editing", editing);
  renderWeb();
}

function bind() {
  $("title").textContent = L("网页快开", "网页快开", "Web Quick Open");
  $("tabWeb").textContent = L("网页", "网页", "Web");
  $("tabAi").textContent = L("AI 快开", "AI 快开", "AI");
  $("browsersBtn").title = L("浏览器设置", "浏览器设置", "Browsers");
  $("search").placeholder = L("搜索网站…", "搜索网站…", "Search sites…");
  $("editBtn").title = L("编辑站点", "编辑站点", "Edit sites");
  $("addBtn").title = L("添加网站", "添加网站", "Add site");
  $("addBtn").setAttribute("aria-label", L("添加网站", "添加网站", "Add site"));
  $("emptyWeb").hidden = true;
  $("aiText").placeholder = L("要发给 AI 的文字…", "要发给 AI 的文字…", "Text to send to the AI…");
  $("clipImageBtn").title = L("读取剪贴板图片", "读取剪贴板图片", "Read clipboard image");
  $("clearClip").textContent = L("清除", "清除", "Clear");

  const browserTitle = L("浏览器", "浏览器", "Browsers");
  $("browserSheetTitle").textContent = browserTitle;
  $("browserNote").textContent = L(
    "每个网站可以选不同浏览器；检测到的浏览器会自动加入列表。",
    "每个网站可以选不同浏览器；检测到的浏览器会自动加入列表。",
    "Each site can use a different browser. Detected browsers are added automatically."
  );
  $("browserAdd").textContent = L("添加程序", "添加程序", "Add app");
  $("browserMsg").textContent = "";
  $("browserSheet").hidden = true;

  $("lblName").textContent = L("名称", "名称", "Name");
  $("lblUrl").textContent = L("网址", "网址", "URL");
  $("lblGroup").textContent = L("分组", "分组", "Group");
  $("lblBrowser").textContent = L("浏览器", "浏览器", "Browser");
  $("siteCancel").textContent = L("取消", "取消", "Cancel");
  $("siteSave").textContent = L("添加", "添加", "Add");

  $("tabWeb").onclick = () => setTab("web");
  $("tabAi").onclick = () => setTab("ai");
  $("search").addEventListener("input", (e) => {
    search = e.target.value || "";
    renderWeb();
  });
  $("openSelected").onclick = openSelected;
  $("addBtn").onclick = openSiteSheet;
  $("editBtn").onclick = () => setEditing(!editing);
  $("browsersBtn").onclick = () => {
    renderBrowserSheet();
    $("browserSheet").hidden = false;
  };
  $("browserClose").onclick = () => { $("browserSheet").hidden = true; };
  $("browserAdd").onclick = () => addBrowserFromPicker();
  $("browserList").addEventListener("click", (e) => {
    if (e.target.closest("[data-act='remove']")) {
      const row = e.target.closest(".browserrow");
      if (row) removeBrowser(row.dataset.id);
    }
  });
  $("siteClose").onclick = closeSiteSheet;
  $("siteCancel").onclick = closeSiteSheet;
  $("siteSave").onclick = saveSite;
  $("siteUrl").addEventListener("keydown", (e) => { if (e.key === "Enter") saveSite(); });
  $("siteName").addEventListener("keydown", (e) => { if (e.key === "Enter") $("siteUrl").focus(); });

  $("siteList").addEventListener("click", (e) => {
    const row = e.target.closest(".site");
    if (!row) return;
    const id = row.dataset.id;
    const site = sites.find((s) => s.id === id);
    if (!site) return;
    if (e.target.closest("[data-act='check']")) {
      if (selected.has(id)) selected.delete(id); else selected.add(id);
      renderWeb();
      return;
    }
    if (e.target.closest("[data-act='del']")) {
      if (!confirm(L(`删除“${site.name}”？`, `删除“${site.name}”？`, `Delete ${site.name}?`))) return;
      sites = sites.filter((s) => s.id !== id);
      selected.delete(id);
      saveSites();
      render();
      return;
    }
    if (e.target.closest(".rowtools")) return;
    openSite(site);
  });
  $("siteList").addEventListener("change", (e) => {
    if (!e.target.matches("select[data-act='browser']")) return;
    const row = e.target.closest(".site");
    const site = sites.find((s) => s.id === row.dataset.id);
    if (!site) return;
    site.browser = e.target.value;
    saveSites();
    renderWeb();
  });

  $("aiList").addEventListener("click", (e) => {
    const card = e.target.closest(".ai");
    if (!card) return;
    const site = sites.find((s) => s.id === card.dataset.id);
    if (site) sendToAI(site);
  });
  $("aiText").addEventListener("input", () => {
    renderStatus();
  });
  $("clipImageBtn").onclick = async () => {
    try {
      const image = await widget.clipboard.readImage();
      if (!image) {
        toast(L("剪贴板里没有图片", "剪贴板里没有图片", "No image on the clipboard"));
        return;
      }
      clip = { files: [], image };
      renderAI();
      toast(L("已读取剪贴板图片", "已读取剪贴板图片", "Clipboard image ready"));
    } catch (e) {
      toast(String(e.message || e));
    }
  };
  $("clearClip").onclick = clearClip;

  if (widget.on) {
    widget.on("drop", (data) => {
      const paths = uniquePaths((data && data.paths) || []);
      if (!paths.length) return;
      clip = { files: paths, image: null };
      setTab("ai");
      renderClip();
      renderStatus();
      toast(L(`已接收 ${paths.length} 个文件，点助手即可粘贴`, `已接收 ${paths.length} 个文件，点助手即可粘贴`, `${paths.length} files ready — click an assistant to paste`));
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("siteSheet").hidden) closeSiteSheet();
    else if (!$("browserSheet").hidden) $("browserSheet").hidden = true;
    else if (editing) setEditing(false);
  });
}

async function boot() {
  sites = await loadSites();
  browsers = await loadBrowsers();
  bind();
  render();
  setTab("web");
  detectBrowsers();
  if (location.search.includes("preview")) {
    window.__wwWebPreview = {
      setTab,
      openSite,
      render,
      sites,
      browsers,
      select: (ids) => {
        selected = new Set(ids || []);
        renderWeb();
      },
    };
  }
}

boot().catch((e) => {
  log(`boot: ${e.message || e}`);
  const el = $("status");
  if (el) el.textContent = String(e.message || e);
});
