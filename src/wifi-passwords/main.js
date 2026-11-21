const t = widget.t;
const list = document.getElementById("list");
const count = document.getElementById("count");
const copyAll = document.getElementById("copyAll");
const toast = document.getElementById("toast");

let opts = { revealAll: false, sort: "name" };
let items = [];
const open = new Set();
let revealed = false;

function mask(key) {
  if (!key) return "";
  return "•".repeat(Math.min(24, Math.max(8, key.length)));
}

function toastSay(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastSay.timer);
  toastSay.timer = setTimeout(() => toast.classList.remove("show"), 1500);
}

function render() {
  list.textContent = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t({
      "zh-TW": "沒有讀到已儲存的無線網路。先連過一次，密碼才會被系統記住。",
      "zh-CN": "没有读到已保存的无线网络。先连过一次，密码才会被系统记住。",
      en: "No saved wireless networks. Windows keeps a key only after you have connected once.",
    });
    list.append(empty);
    return;
  }
  const sorted = items.slice().sort((a, b) =>
    opts.sort === "auth" ? `${a.auth}`.localeCompare(`${b.auth}`) || a.ssid.localeCompare(b.ssid) : a.ssid.localeCompare(b.ssid));
  const frag = document.createDocumentFragment();
  for (const it of sorted) {
    const row = document.createElement("div");
    row.className = "item";

    const ssid = document.createElement("div");
    ssid.className = "ssid";
    ssid.textContent = it.ssid || t({ "zh-TW": "（隱藏網路）", "zh-CN": "（隐藏网络）", en: "(hidden network)" });
    ssid.title = ssid.textContent;

    const eye = document.createElement("button");
    eye.className = "eye";
    const shown = opts.revealAll || open.has(it.ssid);
    eye.textContent = shown ? "隐藏" : "显示";
    eye.addEventListener("click", async () => {
      if (open.has(it.ssid)) open.delete(it.ssid);
      else {
        open.add(it.ssid);
        if (!it.key) await load();
      }
      render();
    });

    const key = document.createElement("div");
    key.className = "key" + (shown ? " revealed" : "");
    if (!it.hasKey) {
      key.textContent = t({ "zh-TW": "開放網路，沒有密碼", "zh-CN": "开放网络，没有密码", en: "Open network, no key" });
    } else if (shown) {
      key.textContent = revealed && it.key ? it.key : t({ "zh-TW": "這台電腦沒有給出明文（需要 system.write 授權）", "zh-CN": "这台电脑没有给出明文（需要 system.write 授权）", en: "Plaintext withheld (needs the system.write grant)" });
      key.addEventListener("click", async () => {
        if (!it.key) return;
        await widget.clipboard.writeText(it.key);
        toastSay(t({ "zh-TW": "已複製密碼", "zh-CN": "已复制密码", en: "Key copied" }));
      });
    } else {
      key.textContent = mask(it.key || "00000000");
    }

    const tags = document.createElement("div");
    tags.className = "tags";
    for (const text of [it.auth, it.cipher].filter(Boolean)) {
      const tag = document.createElement("span");
      tag.className = "tag" + (/open|none/i.test(text) ? " warn" : "");
      tag.textContent = text;
      tags.append(tag);
    }
    tags.style.gridColumn = "1 / -1";

    row.append(ssid, eye, key, tags);
    frag.append(row);
  }
  list.append(frag);
}

async function load() {
  try {
    const res = await widget.wifi.profiles();
    items = Array.isArray(res?.items) ? res.items : [];
    revealed = !!res?.revealed || items.some((it) => it.revealed || it.key);
    if (res && res.supported === false) {
      count.textContent = t({ "zh-TW": "這台電腦沒有可用的無線網卡", "zh-CN": "这台电脑没有可用的无线网卡", en: "No wireless adapter available" });
    } else {
      count.textContent = t({
        "zh-TW": `${items.length} 個已儲存網路`,
        "zh-CN": `${items.length} 个已保存网络`,
        en: `${items.length} saved networks`,
      });
    }
  } catch (e) {
    count.textContent = String(e.message || e);
    items = [];
  }
  render();
}

copyAll.addEventListener("click", async () => {
  const lines = items
    .filter((it) => it.hasKey && it.key)
    .map((it) => `${it.ssid}\t${it.key}`);
  if (!lines.length) {
    toastSay(t({ "zh-TW": "沒有可複製的密碼", "zh-CN": "没有可复制的密码", en: "No keys to copy" }));
    return;
  }
  await widget.clipboard.writeText(lines.join("\n"));
  toastSay(t({ "zh-TW": `已複製 ${lines.length} 組`, "zh-CN": `已复制 ${lines.length} 组`, en: `Copied ${lines.length} keys` }));
});

function apply(s) {
  opts = Object.assign(opts, s || {});
  render();
}

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
load();
