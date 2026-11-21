/* 人类基准：两项小测。
 * 反应 —— 等一个随机延时后变绿，点击计时，五轮取平均，抢跑那轮作废。
 * 记忆 —— 从 3 位数字起，看两秒后背出来，答对加一位，答错结算。 */

const t = widget.t;
const stage = document.getElementById("stage");
const bigEl = document.getElementById("big");
const hintEl = document.getElementById("hint");
const ansEl = document.getElementById("ans");
const bestEl = document.getElementById("best");
const tabReact = document.getElementById("tab-react");
const tabMem = document.getElementById("tab-mem");

let mode = "react";

// ── 反应 ──────────────────────────────────────────────────────────────
const REACT_ROUNDS = 5;
let rounds = [];
let armed = false;
let greenAt = 0;
let waitTimer = 0;
let tooSoon = false;

function reactIntro() {
  armed = false;
  tooSoon = false;
  rounds = [];
  stage.classList.remove("go");
  bigEl.textContent = t({ "zh-TW": "點一下開始", "zh-CN": "点一下开始", en: "Tap to start" });
  hintEl.textContent = t({ "zh-TW": "變綠後再點，搶跑不算", "zh-CN": "变绿后再点，抢跑不算", en: "Tap once it turns green; early taps are void" });
  showBest();
}

function arm() {
  clearTimeout(waitTimer);
  armed = false;
  tooSoon = false;
  stage.classList.remove("go");
  bigEl.textContent = t({ "zh-TW": "等…", "zh-CN": "等…", en: "Wait…" });
  hintEl.textContent = t({ "zh-TW": "別急，綠了才點", "zh-CN": "别急，绿了才点", en: "Not yet — wait for green" });
  waitTimer = setTimeout(() => {
    armed = true;
    greenAt = performance.now();
    stage.classList.add("go");
    bigEl.textContent = t({ "zh-TW": "點！", "zh-CN": "点！", en: "GO" });
    hintEl.textContent = t({ "zh-TW": "越快越好", "zh-CN": "越快越好", en: "As fast as you can" });
  }, 900 + Math.random() * 2600);
}

function onReactTap() {
  if (stage.classList.contains("go") && armed) {
    armed = false;
    const ms = Math.round(performance.now() - greenAt);
    rounds.push(ms);
    stage.classList.remove("go");
    if (rounds.length < REACT_ROUNDS) {
      bigEl.textContent = `${ms} ms`;
      hintEl.textContent = `${t({ "zh-TW": "第", "zh-CN": "第", en: "Round " })}${rounds.length}/${REACT_ROUNDS}${t({ "zh-TW": " 輪", "zh-CN": " 轮", en: "" })}`;
      setTimeout(arm, 700);
    } else {
      const avg = Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length);
      bigEl.textContent = `${avg} ms`;
      hintEl.textContent = `${t({ "zh-TW": "五輪平均 · 最快 ", "zh-CN": "五轮平均 · 最快 ", en: "Average · best " })}${Math.min(...rounds)} ms`;
      settle("react", avg);
      setTimeout(reactIntro, 2600);
    }
    return;
  }
  if (!armed) tooSoon = true;
  bigEl.textContent = t({ "zh-TW": "搶跑了", "zh-CN": "抢跑了", en: "Too soon" });
  hintEl.textContent = t({ "zh-TW": "這輪不算，重來", "zh-CN": "这轮不算，重来", en: "This round is void" });
  clearTimeout(waitTimer);
  setTimeout(arm, 900);
}

// ── 记忆 ──────────────────────────────────────────────────────────────
let digits = 3;
let target = "";
let accepting = false;

function memIntro() {
  digits = 3;
  accepting = false;
  ansEl.hidden = true;
  stage.classList.remove("go");
  bigEl.textContent = t({ "zh-TW": "點一下開始", "zh-CN": "点一下开始", en: "Tap to start" });
  hintEl.textContent = t({ "zh-TW": "記住出現的數字，背完再輸入", "zh-CN": "记住出现的数字，背完再输入", en: "Memorise the digits, then type them" });
  showBest();
}

function nextRound() {
  accepting = false;
  ansEl.hidden = true;
  ansEl.value = "";
  target = "";
  for (let i = 0; i < digits; i += 1) target += String(Math.floor(Math.random() * 10));
  bigEl.textContent = target;
  hintEl.textContent = `${digits} ${t({ "zh-TW": "位，看清楚", "zh-CN": "位，看清楚", en: "digits — look closely" })}`;
  setTimeout(() => {
    bigEl.textContent = "?";
    hintEl.textContent = t({ "zh-TW": "背出來，按 Enter 確認", "zh-CN": "背出来，按 Enter 确认", en: "Type them and press Enter" });
    ansEl.hidden = false;
    ansEl.focus();
    accepting = true;
  }, 800 + digits * 550);
}

function onSubmit() {
  if (!accepting) return;
  accepting = false;
  if (ansEl.value.trim() === target) {
    digits += 1;
    bigEl.textContent = `✓ ${digits - 1}`;
    hintEl.textContent = t({ "zh-TW": "對了，再加一位", "zh-CN": "对了，再加一位", en: "Correct — one more digit" });
    setTimeout(nextRound, 900);
  } else {
    bigEl.textContent = `${digits - 1}`;
    hintEl.textContent = `${t({ "zh-TW": "到此為止，答對 ", "zh-CN": "到此为止，答对 ", en: "Done — best " })}${digits - 1}${t({ "zh-TW": " 位", "zh-CN": " 位", en: " digits" })}`;
    ansEl.hidden = true;
    settle("mem", digits - 2);
    setTimeout(memIntro, 2600);
  }
}

ansEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") onSubmit();
});

// ── 成绩与切换 ────────────────────────────────────────────────────────
async function settle(kind, value) {
  const key = `best-${kind}`;
  const old = Number(await widget.storage.get(key)) || 0;
  const better = kind === "react" ? (!old || value < old) : value > old;
  if (better) await widget.storage.set(key, value).catch(() => {});
  showBest();
}

async function showBest() {
  const [r, m] = await Promise.all([
    widget.storage.get("best-react").catch(() => 0),
    widget.storage.get("best-mem").catch(() => 0),
  ]);
  const parts = [];
  if (r) parts.push(`${t({ "zh-TW": "反應", "zh-CN": "反应", en: "Reaction" })} ${r} ms`);
  if (m) parts.push(`${t({ "zh-TW": "記憶", "zh-CN": "记忆", en: "Digits" })} ${m}`);
  bestEl.textContent = parts.length
    ? `${t({ "zh-TW": "最佳：", "zh-CN": "最佳：", en: "Best: " })}${parts.join(" · ")}`
    : t({ "zh-TW": "還沒有成績", "zh-CN": "还没有成绩", en: "No scores yet" });
}

function setMode(next) {
  mode = next;
  tabReact.setAttribute("aria-pressed", next === "react" ? "true" : "false");
  tabMem.setAttribute("aria-pressed", next === "mem" ? "true" : "false");
  clearTimeout(waitTimer);
  if (next === "react") reactIntro();
  else memIntro();
}

stage.addEventListener("click", () => {
  if (mode === "react") onReactTap();
  else if (!accepting) nextRound();
});

tabReact.onclick = () => setMode("react");
tabMem.onclick = () => setMode("mem");

tabReact.textContent = t({ "zh-TW": "反應", "zh-CN": "反应", en: "Reaction" });
tabMem.textContent = t({ "zh-TW": "記憶", "zh-CN": "记忆", en: "Digits" });

setMode("react");
