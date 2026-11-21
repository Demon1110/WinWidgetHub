const t = widget.t;
const list = document.getElementById("list");
const meta = document.getElementById("meta");
const q = document.getElementById("q");
const refreshBtn = document.getElementById("refresh");
const toast = document.getElementById("toast");

let opts = { listening: true, protocol: "all", auto: true };
let rows = [];
let timer = 0;
let busy = false;

function filterText(r) {
  return `${r.proto} ${r.local}:${r.localPort} ${r.remote}:${r.remotePort} ${r.state} ${r.pid}`.toLowerCase();
}

function render() {
  const needle = q.value.trim().toLowerCase();
  const shown = needle ? rows.filter((r) => filterText(r).includes(needle)) : rows;
  list.textContent = "";
  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = t({ "zh-TW": "沒有符合的連線", "zh-CN": "没有符合的连接", en: "Nothing matches" });
    list.append(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const r of shown.slice(0, 600)) {
    const row = document.createElement("div");
    row.className = "row";
    const proto = document.createElement("span");
    proto.className = "proto";
    proto.textContent = r.proto;

    const local = document.createElement("span");
    local.className = "muted";
    local.textContent = r.local || "-";

    const port = document.createElement("span");
    port.className = "num" + (r.state === "listen" ? " listen" : "");
    port.textContent = String(r.localPort);

    const state = document.createElement("span");
    state.className = "muted";
    state.textContent = r.remote && r.remote !== "0.0.0.0" && r.remote !== "::" ? r.remote : r.state;

    const pid = document.createElement("span");
    pid.className = "num muted";
    pid.textContent = String(r.pid);

    row.append(proto, local, port, state, pid);
    row.title = t({
      "zh-TW": `點一下複製 ${r.local}:${r.localPort}`,
      "zh-CN": `点一下复制 ${r.local}:${r.localPort}`,
      en: `Tap to copy ${r.local}:${r.localPort}`,
    });
    row.addEventListener("click", async () => {
      try {
        await widget.clipboard.writeText(`${r.local}:${r.localPort}`);
        say(t({ "zh-TW": "已複製埠口", "zh-CN": "已复制端口", en: "Port copied" }));
      } catch (e) {
        say(String(e.message || e));
      }
    });
    frag.append(row);
  }
  list.append(frag);
}

let toastTimer = 0;
function say(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1400);
}

async function load() {
  if (busy) return;
  busy = true;
  try {
    const res = await widget.system.ports({ listening: opts.listening, protocol: opts.protocol });
    rows = Array.isArray(res?.items) ? res.items : [];
    rows.sort((a, b) => a.localPort - b.localPort);
    meta.textContent = t({
      "zh-TW": `${rows.length} 條連線${opts.listening ? "（僅監聽）" : ""}`,
      "zh-CN": `${rows.length} 条连接${opts.listening ? "（仅监听）" : ""}`,
      en: `${rows.length} connections${opts.listening ? " (listening only)" : ""}`,
    });
    render();
  } catch (e) {
    meta.textContent = String(e.message || e);
    rows = [];
    render();
  } finally {
    busy = false;
  }
}

function schedule() {
  clearInterval(timer);
  timer = 0;
  if (opts.auto) timer = setInterval(load, 3000);
}

q.addEventListener("input", render);
refreshBtn.addEventListener("click", load);

function apply(s) {
  opts = Object.assign(opts, s || {});
  schedule();
  load();
}

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
document.addEventListener("visibilitychange", () => {
  clearInterval(timer);
  timer = 0;
  if (!document.hidden) {
    load();
    schedule();
  }
});
