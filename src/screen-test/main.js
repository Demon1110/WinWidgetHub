/* 屏幕检测：五种图样轮流铺满卡片。
 * 纯色模式点一下就换下一个；灰阶和色带按等分画，坏点用 1px 白线网格——点位误差肉眼一眼能看出来。 */

const t = widget.t;
const panel = document.getElementById("panel");
const modesEl = document.getElementById("modes");
const tipEl = document.getElementById("tip");

const SOLIDS = ["#ffffff", "#000000", "#ff0000", "#00ff00", "#0000ff", "#808080", "#00ffff", "#ff00ff"];
let solidIndex = 0;
let modeNow = "solid";

const LABELS = {
  solid: { "zh-TW": "純色", "zh-CN": "纯色", en: "Solid" },
  gray: { "zh-TW": "灰階", "zh-CN": "灰阶", en: "Grey" },
  grid: { "zh-TW": "壞點", "zh-CN": "坏点", en: "Pixels" },
  bars: { "zh-TW": "色帶", "zh-CN": "色带", en: "Bars" },
  text: { "zh-TW": "字級", "zh-CN": "字级", en: "Text" },
};

const TIPS = {
  solid: { "zh-TW": "點畫面換下一個顏色，找亮點、暗點與漏光", "zh-CN": "点画面换下一个颜色，找亮点、暗点与漏光", en: "Tap the panel for the next colour — find bright or dark spots" },
  gray: { "zh-TW": "16 級灰看過渡，有沒有偏色或帶狀斷層", "zh-CN": "16 级灰看过渡，有没有偏色或带状断层", en: "16 steps: look for tinting or banding" },
  grid: { "zh-TW": "白線網格，任何一格缺線就是壞點", "zh-CN": "白线网格，任何一格缺线就是坏点", en: "A white grid: a missing line is a dead pixel" },
  bars: { "zh-TW": "彩條看還原度，黑白交界看有沒有鬼影", "zh-CN": "彩条看还原度，黑白交界看有没有鬼影", en: "Colour bars for accuracy, black-to-white edges for ghosting" },
  text: { "zh-TW": "同句話五種大小，小字還清楚就是對的", "zh-CN": "同句话五种大小，小字还清楚就是对的", en: "The same sentence at five sizes — small text should still be crisp" },
};

function render(mode) {
  modeNow = mode;
  panel.className = `panel is-${mode}`;
  panel.style.background = "";
  panel.innerHTML = "";

  if (mode === "solid") {
    panel.style.background = SOLIDS[solidIndex % SOLIDS.length];
  } else if (mode === "gray") {
    panel.style.background = `linear-gradient(90deg,${Array.from({ length: 16 }, (_, i) => {
      const v = Math.round((i / 15) * 255);
      return `rgb(${v},${v},${v}) ${(i / 16) * 100}% ${((i + 1) / 16) * 100}%`;
    }).join(",")})`;
  } else if (mode === "grid") {
    panel.style.background = "#000";
    const grid = document.createElement("div");
    grid.className = "gridlines";
    panel.appendChild(grid);
  } else if (mode === "bars") {
    panel.style.background =
      "linear-gradient(90deg,#fff 0 14.28%,#ffe600 14.28% 28.56%,#00e5ff 28.56% 42.84%,#00e05a 42.84% 57.12%,#ff2d2d 57.12% 71.4%,#0057ff 71.4% 85.68%,#000 85.68% 100%)";
  } else {
    const wrap = document.createElement("div");
    wrap.className = "texts";
    for (const size of [1.4, 1.05, 0.82, 0.62, 0.48]) {
      const line = document.createElement("div");
      line.style.fontSize = `${size}rem`;
      line.textContent = t({
        "zh-TW": "字級測試 0123456789 平板電腦",
        "zh-CN": "字级测试 0123456789 平板电脑",
        en: "Text size 0123456789 quick brown fox",
      });
      wrap.appendChild(line);
    }
    panel.appendChild(wrap);
  }

  tipEl.textContent = t(TIPS[mode]);
  for (const chip of modesEl.querySelectorAll(".chip")) {
    chip.setAttribute("aria-pressed", chip.dataset.mode === mode ? "true" : "false");
  }
}

panel.addEventListener("click", () => {
  if (modeNow !== "solid") return;
  solidIndex = (solidIndex + 1) % SOLIDS.length;
  render("solid");
});

for (const chip of modesEl.querySelectorAll(".chip")) {
  chip.textContent = t(LABELS[chip.dataset.mode]);
  chip.addEventListener("click", () => render(chip.dataset.mode));
}

widget.settings.onChange(() => render(widget.settings.get("mode") || "solid"));
render(widget.settings.get("mode") || "solid");
