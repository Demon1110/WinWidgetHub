// 掷硬币：点一下抛一次，结果和累计次数存在 widget.storage 里，重开也在。

const $ = (id) => document.getElementById(id);

let opts = widget.settings.get();
let stats = { heads: 0, tails: 0 };
let busy = false;

const text = (key) =>
  widget.t({
    "zh-TW": { heads: "正", tails: "反", flip: "拋一次", idle: "?" }[key],
    "zh-CN": { heads: "正", tails: "反", flip: "抛一次", idle: "?" }[key],
    en: { heads: "H", tails: "T", flip: "Flip", idle: "?" }[key],
  });

function paintStats() {
  const n = stats.heads + stats.tails;
  $("stats").textContent = n
    ? widget.t({
        "zh-TW": `共 ${n} 次 · 正 ${stats.heads} · 反 ${stats.tails}`,
        "zh-CN": `共 ${n} 次 · 正 ${stats.heads} · 反 ${stats.tails}`,
        en: `${n} flips · H ${stats.heads} · T ${stats.tails}`,
      })
    : widget.t({
        "zh-TW": "還沒有拋過",
        "zh-CN": "还没有抛过",
        en: "No flips yet",
      });
}

function show(result) {
  $("face").textContent = text(result);
  $("face").dataset.result = result;
}

function flip() {
  if (busy) return;
  const result = Math.random() < 0.5 ? "heads" : "tails";

  if (opts.animate === false) {
    finish(result);
    return;
  }
  busy = true;
  const face = $("face");
  face.classList.add("spinning");
  setTimeout(() => {
    face.classList.remove("spinning");
    finish(result);
    busy = false;
  }, 620);
}

function finish(result) {
  stats[result] += 1;
  stats.last = result;
  show(result);
  paintStats();
  widget.storage.set("stats", stats);
}

widget.storage.get("stats").then((saved) => {
  if (saved && typeof saved === "object") {
    stats = {
      heads: Number(saved.heads) || 0,
      tails: Number(saved.tails) || 0,
      last: saved.last === "heads" || saved.last === "tails" ? saved.last : null,
    };
  }
  paintStats();
  if (stats.last) show(stats.last);
});

$("flip").textContent = widget.t({ "zh-TW": "拋一次", "zh-CN": "抛一次", en: "Flip" });
$("flip").addEventListener("click", flip);

widget.settings.onChange((s) => {
  opts = s;
});
