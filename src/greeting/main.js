/* 暖心问候：按对象、场景、语气从手写好的句库里挑一句，{who} 换成称呼。
 * 句库是人工写的，不让模型现编，所以不会出现「祝你生日快乐，愿你工作顺利」式的套话撞车。 */

const t = widget.t;
const textEl = document.getElementById("text");
const whoEl = document.getElementById("who");
const toastEl = document.getElementById("toast");

const DEFAULT_WHO = {
  family: { "zh-TW": "老爸", "zh-CN": "老爸", en: "Dad" },
  friend: { "zh-TW": "老同學", "zh-CN": "老同学", en: "friend" },
  colleague: { "zh-TW": "張工", "zh-CN": "张工", en: "colleague" },
  lover: { "zh-TW": "親愛的", "zh-CN": "亲爱的", en: "darling" },
};

const RE = {
  birthday: {
    sincere: [
      "{who}，生日快乐。愿你今年每个小愿望都有着落，忙起来的时候身边也有人搭把手。",
      "{who}，又长一岁啦。谢谢你这一年的照顾，想做的事别一直往后拖，我陪你一起。"
    ],
    light: [
      "{who}，生日快乐！蛋糕先许愿，蜡烛我替你吹——反正你也不差这一口。",
      "祝你生日快乐，{who}。今年吹蜡烛时的肺活量，别再跟汇报工作一个水平。"
    ],
    formal: [
      "{who}，谨祝生日快乐。愿身体康健、事业顺遂，新年所求皆如愿。",
      "值此生辰，向{who}致以诚挚祝福：岁岁平安，事事顺意。"
    ]
  },
  holiday: {
    sincere: [
      "{who}，节日快乐。这一年辛苦的地方我都记得，好好歇两天，别把假期也排满。",
      "过节了，{who}。愿你和家人吃顿热乎的，剩下的日子慢慢来，不着急。"
    ],
    light: [
      "{who}，节日快乐！别光顾着抢红包，桌上的菜凉了可比红包贵。",
      "节日快乐，{who}。愿你今晚的月亮比加班的电脑屏亮一点。"
    ],
    formal: [
      "{who}，敬祝佳节安康。愿阖家团圆、诸事顺遂。",
      "值此佳节，谨向{who}致以问候：愿岁岁安康，事事顺意。"
    ]
  },
  encourage: {
    sincere: [
      "{who}，这段确实不容易。你已经把能做的都做了，剩下的交给时间，我信你。",
      "{who}，别急着一次把事情做完美。先把今天这一小步走稳，后面会跟着顺起来。"
    ],
    light: [
      "{who}，别把自己逼成表情包。先喝口水，你这水平不至于翻车。",
      "撑住，{who}。天塌不下来，最多是你的待办列表塌一下。"
    ],
    formal: [
      "{who}，此事艰难，你的努力有目共睹。请稳步推进，不必急于一时。",
      "{who}，当前进展已属不易。望稳中求进，需要支持随时沟通。"
    ]
  },
  apology: {
    sincere: [
      "{who}，上次的事是我没想周全，给你添了麻烦。这句抱歉我欠了好久，认真补上。",
      "{who}，对不起。不是找理由，是我确实做得不够好，下次我会提前想到。"
    ],
    light: [
      "{who}，我错了，罚我下次请你吃饭——地点你挑，我不还价。",
      "{who}，道歉套餐一份：认错、改正、请客，按顺序送达。"
    ],
    formal: [
      "{who}，关于此前事宜，系我考虑不周，特此致歉。后续将及时改正并跟进。",
      "{who}，此事由我疏忽所致，谨致歉意。已着手补救，望予谅解。"
    ]
  },
  thanks: {
    sincere: [
      "{who}，那天要不是你搭手，我真不知道要弄到几点。这份情我记着。",
      "{who}，谢谢你把话说到点子上，也谢谢你没嫌我麻烦。"
    ],
    light: [
      "{who}，欠你一个人情，利息按奶茶算，随时兑付。",
      "{who}，谢谢！这份恩情我记在备忘录里了，跑不掉。"
    ],
    formal: [
      "{who}，此事多承协助，得以顺利推进，谨表谢意。",
      "{who}，感谢你在关键环节的支持，后续如有需要，我随时配合。"
    ]
  }
};

const EN = {
  birthday: ["Happy birthday, {who}. May the small wishes land this year, and the heavy days be shared."],
  holiday: ["Wishing you a calm holiday, {who} — a warm meal, and no laptop on the table."],
  encourage: ["Hang in there, {who}. You have done the part that was yours; let the rest take its time."],
  apology: ["{who}, I am sorry — that one was on me. I have thought it through and will do better next time."],
  thanks: ["Thank you, {who}. I still remember the hand you lent me when it mattered."]
};

let last = -1;

function pick() {
  const who = whoEl.value.trim() || t(DEFAULT_WHO[widget.settings.get("who")] || DEFAULT_WHO.friend);
  const scene = widget.settings.get("scene") || "birthday";
  const tone = widget.settings.get("tone") || "sincere";
  const en = (widget.locale || "").toLowerCase().startsWith("en");
  const list = en ? (EN[scene] || EN.birthday) : ((RE[scene] || RE.birthday)[tone] || RE.birthday.sincere);
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && i === last) i = (i + 1) % list.length;
  last = i;
  return list[i].split("{who}").join(who);
}

function roll() {
  const text = pick();
  textEl.textContent = text;
  fit();
}

/** 长句子按字数收字号，别让它溢出去。 */
function fit() {
  const len = textEl.textContent.length;
  const size = len > 62 ? 1.0 : len > 42 ? 1.15 : 1.32;
  textEl.style.fontSize = `${size}rem`;
}

document.getElementById("label-who").textContent = t({ "zh-TW": "稱呼", "zh-CN": "称呼", en: "Call them" });
document.getElementById("again").textContent = t({ "zh-TW": "換一句", "zh-CN": "换一句", en: "Another" });
document.getElementById("copy").textContent = t({ "zh-TW": "複製", "zh-CN": "复制", en: "Copy" });

document.getElementById("again").onclick = roll;
document.getElementById("copy").onclick = () => {
  widget.clipboard.writeText(textEl.textContent)
    .then((ok) => widget.util.toast(toastEl, ok === false
      ? t({ "zh-TW": "剪貼簿被佔用了", "zh-CN": "剪贴板被占用了", en: "Clipboard is busy" })
      : t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "Copied" }), 1400))
    .catch((e) => widget.util.toast(toastEl, e.message, 2000));
};

whoEl.addEventListener("input", () => {
  widget.storage.set("who", whoEl.value.trim()).catch(() => {});
});
widget.settings.onChange(() => roll());

widget.storage.get("who").then((v) => {
  const fallback = t(DEFAULT_WHO[widget.settings.get("who")] || DEFAULT_WHO.friend);
  whoEl.value = v || fallback;
  whoEl.placeholder = fallback;
  roll();
});
