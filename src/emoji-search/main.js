const t = widget.t;
const $ = (id) => document.getElementById(id);
const q = $("q");
const grid = $("grid");
const cats = $("cats");
const count = $("count");
const toast = $("toast");

// [emoji, category, 中文关键词, English keywords]
const DATA = [
  ["😀", "face", "笑脸 开心 高兴 笑", "grin happy smile"],
  ["😃", "face", "大笑 开口笑", "smiley happy"],
  ["😄", "face", "笑 眯眼笑", "smile happy"],
  ["😁", "face", "露齿笑 得意", "grin beam"],
  ["😆", "face", "狂笑 哈哈", "laughing lol"],
  ["😅", "face", "苦笑 汗 尴尬", "sweat smile nervous"],
  ["🤣", "face", "笑翻 打滚 笑死", "rofl rolling laugh"],
  ["😂", "face", "笑哭 笑出泪", "joy tears laugh"],
  ["🙂", "face", "微笑 淡定", "slight smile"],
  ["🙃", "face", "倒脸 无语 反讽", "upside down silly"],
  ["😉", "face", "眨眼 调皮", "wink"],
  ["😊", "face", "害羞 微笑 脸红", "blush smile"],
  ["😇", "face", "天使 光环 无辜", "innocent angel halo"],
  ["🥰", "face", "喜欢 爱心 花痴", "love hearts adore"],
  ["😍", "face", "爱心眼 迷上", "heart eyes love"],
  ["🤩", "face", "星星眼 惊艳", "star struck wow"],
  ["😘", "face", "飞吻", "kiss blow"],
  ["😗", "face", "亲吻 嘟嘴", "kiss"],
  ["😋", "face", "好吃 馋 吐舌", "yum tasty tongue"],
  ["😛", "face", "吐舌 调皮", "tongue playful"],
  ["🤪", "face", "疯 搞怪 滑稽", "zany crazy"],
  ["🤨", "face", "皱眉 怀疑 挑眉", "raised eyebrow skeptical"],
  ["🧐", "face", "单片眼镜 审视 思考", "monocle inspect"],
  ["🤓", "face", "书呆子 眼镜 学霸", "nerd glasses"],
  ["😎", "face", "墨镜 酷 帅", "cool sunglasses"],
  ["🥳", "face", "派对 庆祝 彩带", "party celebrate hat"],
  ["😏", "face", "坏笑 得意", "smirk"],
  ["😒", "face", "不爽 不屑", "unamused meh"],
  ["😞", "face", "失望 沮丧", "disappointed"],
  ["😔", "face", "垂头 难过", "pensive sad"],
  ["😟", "face", "担心 忧虑", "worried"],
  ["😕", "face", "困惑 迷惑", "confused"],
  ["🙁", "face", "微皱眉 不满", "slight frown"],
  ["😣", "face", "煎熬 难受", "persevere struggle"],
  ["😖", "face", "纠结 痛苦", "confounded"],
  ["😫", "face", "累 疲惫 崩溃", "tired exhausted"],
  ["😩", "face", "烦躁 叫苦", "weary"],
  ["🥺", "face", "求你 汪汪眼 委屈", "pleading puppy"],
  ["😢", "face", "哭 流泪 伤心", "cry tear sad"],
  ["😭", "face", "大哭 嚎啕", "sob crying"],
  ["😤", "face", "生气 哼 鼻孔", "triumph huff"],
  ["😠", "face", "愤怒 生气", "angry"],
  ["😡", "face", "暴怒 火大", "rage furious"],
  ["🤬", "face", "骂人 脏话 爆粗", "cursing swearing"],
  ["🤯", "face", "爆炸头 震惊 头炸", "mind blown explode"],
  ["😳", "face", "脸红 尴尬 震惊", "flushed embarrassed"],
  ["🥵", "face", "热 中暑 汗", "hot sweating"],
  ["🥶", "face", "冷 冻 冰", "cold freezing"],
  ["😱", "face", "惊恐 尖叫 害怕", "scream fear shock"],
  ["😨", "face", "害怕 恐惧", "fearful"],
  ["😰", "face", "冷汗 紧张 焦虑", "anxious sweat"],
  ["😥", "face", "松口气 惋惜", "relieved sad"],
  ["🤗", "face", "抱抱 拥抱", "hug"],
  ["🤔", "face", "思考 想 疑惑", "thinking hmm"],
  ["🤫", "face", "嘘 安静 保密", "shush quiet"],
  ["🤭", "face", "偷笑 捂嘴", "giggle hand over mouth"],
  ["🫢", "face", "捂嘴 惊讶", "gasp hand mouth"],
  ["🤥", "face", "说谎 长鼻子", "liar nose"],
  ["😴", "face", "睡觉 困 zzz", "sleep zzz tired"],
  ["🤤", "face", "流口水 想吃", "drool"],
  ["😪", "face", "困 睡意", "sleepy"],
  ["😵", "face", "晕 眼花", "dizzy knocked out"],
  ["🤐", "face", "闭嘴 拉链", "zipper mouth"],
  ["🥴", "face", "醉 微醺", "woozy drunk"],
  ["🤢", "face", "反胃 恶心", "nausea sick"],
  ["🤮", "face", "呕吐 吐", "vomit puke"],
  ["🤧", "face", "打喷嚏 感冒", "sneeze"],
  ["😷", "face", "口罩 生病 防护", "mask sick"],
  ["🤒", "face", "发烧 体温计", "thermometer sick"],
  ["🤕", "face", "受伤 绷带", "bandage hurt"],
  ["🤑", "face", "有钱 发财 钱眼", "money mouth rich"],
  ["🤠", "face", "牛仔 帽子", "cowboy hat"],
  ["😈", "face", "小恶魔 坏笑", "devil smirk"],
  ["👿", "face", "恶魔 生气", "angry devil"],
  ["👻", "face", "鬼 幽灵 万圣节", "ghost boo"],
  ["💀", "face", "骷髅 死亡 笑死", "skull dead"],
  ["🤖", "face", "机器人 自动", "robot bot"],
  ["🎃", "face", "南瓜灯 万圣节", "pumpkin halloween"],
  ["👋", "gesture", "挥手 你好 再见", "wave hello bye"],
  ["🤚", "gesture", "举手 停", "raised hand stop"],
  ["✋", "gesture", "手掌 停 五", "hand stop five"],
  ["👌", "gesture", "好 ok 没问题", "ok perfect"],
  ["🤞", "gesture", "好运 祈祷 交叉指", "fingers crossed luck"],
  ["✌️", "gesture", "胜利 v 耶", "victory peace"],
  ["🤟", "gesture", "爱你 手势", "love you gesture"],
  ["🤘", "gesture", "摇滚 金属", "rock horns"],
  ["👍", "gesture", "赞 好 顶", "thumbs up like"],
  ["👎", "gesture", "差 不行 反对", "thumbs down dislike"],
  ["👏", "gesture", "鼓掌 拍手", "clap applause"],
  ["🙌", "gesture", "举手欢呼 万岁", "raise hands hooray"],
  ["🙏", "gesture", "拜托 感谢 合十", "pray please thanks"],
  ["🤝", "gesture", "握手 合作 成交", "handshake deal"],
  ["💪", "gesture", "肌肉 加油 力量", "muscle strong"],
  ["👊", "gesture", "拳头 出击", "fist punch"],
  ["✊", "gesture", "举拳 决心", "raised fist"],
  ["👉", "gesture", "指向右 看这", "point right"],
  ["👈", "gesture", "指向左", "point left"],
  ["👆", "gesture", "指上 上面", "point up"],
  ["👇", "gesture", "指下 下面", "point down"],
  ["✍️", "gesture", "写字 记录", "writing hand"],
  ["🫡", "gesture", "敬礼", "salute"],
  ["❤️", "heart", "红心 爱 喜欢", "red heart love"],
  ["🧡", "heart", "橙心 温暖", "orange heart"],
  ["💛", "heart", "黄心 友情", "yellow heart"],
  ["💚", "heart", "绿心 环保", "green heart"],
  ["💙", "heart", "蓝心 信任", "blue heart"],
  ["💜", "heart", "紫心", "purple heart"],
  ["🖤", "heart", "黑心 酷", "black heart"],
  ["🤍", "heart", "白心 纯粹", "white heart"],
  ["💔", "heart", "心碎 失恋", "broken heart"],
  ["💕", "heart", "两颗心 甜蜜", "two hearts love"],
  ["💖", "heart", "闪亮的心", "sparkling heart"],
  ["💘", "heart", "丘比特 一箭穿心", "cupid arrow heart"],
  ["💯", "symbol", "满分 一百", "hundred perfect"],
  ["🔥", "symbol", "火 热门 燃", "fire hot lit"],
  ["✨", "symbol", "闪光 亮 干净", "sparkles shine"],
  ["⭐", "symbol", "星星 收藏 评分", "star"],
  ["🌟", "symbol", "亮星 出彩", "glowing star"],
  ["⚡", "symbol", "闪电 快 电", "lightning fast"],
  ["💥", "symbol", "爆炸 撞击", "boom collision"],
  ["💫", "symbol", "晕星 旋转", "dizzy star"],
  ["✅", "symbol", "对勾 完成 正确", "check done yes"],
  ["❌", "symbol", "叉 错误 不行", "cross no wrong"],
  ["⚠️", "symbol", "警告 注意", "warning caution"],
  ["❓", "symbol", "问号 疑问", "question"],
  ["❗", "symbol", "感叹 重要", "exclamation"],
  ["♻️", "symbol", "回收 重复利用", "recycle"],
  ["🔒", "object", "锁 安全 加密", "lock secure"],
  ["🔑", "object", "钥匙 密码", "key password"],
  ["🔔", "object", "铃铛 提醒 通知", "bell notify"],
  ["📌", "object", "图钉 置顶 钉住", "pin"],
  ["📎", "object", "回形针 附件", "paperclip attach"],
  ["📝", "object", "记笔记 备忘 写", "memo note write"],
  ["📅", "object", "日历 日期", "calendar date"],
  ["⏰", "object", "闹钟 时间 提醒", "alarm clock"],
  ["⏳", "object", "沙漏 等待", "hourglass wait"],
  ["💡", "object", "灯泡 点子 灵感", "idea bulb"],
  ["🔍", "object", "放大镜 搜索 查", "search magnifier"],
  ["🖥️", "object", "电脑 显示器", "computer desktop"],
  ["⌨️", "object", "键盘 打字", "keyboard typing"],
  ["🖱️", "object", "鼠标", "mouse"],
  ["💾", "object", "软盘 保存", "floppy save"],
  ["📁", "object", "文件夹 目录", "folder"],
  ["📦", "object", "包裹 打包 发布", "package box"],
  ["📱", "object", "手机", "phone mobile"],
  ["🔋", "object", "电池 电量", "battery"],
  ["🔌", "object", "插头 接电", "plug power"],
  ["🛠️", "object", "工具 修 设置", "tools fix"],
  ["⚙️", "object", "齿轮 设置 配置", "gear settings"],
  ["🧹", "object", "扫帚 清理", "broom clean"],
  ["🗑️", "object", "垃圾桶 删除", "trash delete"],
  ["💻", "object", "笔记本 编程", "laptop code"],
  ["📊", "object", "图表 数据 统计", "chart data"],
  ["📈", "object", "上涨 增长 股票", "up trend growth"],
  ["📉", "object", "下跌 下滑", "down trend"],
  ["🗓️", "object", "计划 排期", "schedule plan"],
  ["🎯", "symbol", "目标 靶心 正中", "target goal"],
  ["🚀", "symbol", "火箭 发射 上线", "rocket launch"],
  ["🐛", "animal", "虫子 程序错误", "bug"],
  ["🐱", "animal", "猫 喵", "cat"],
  ["🐶", "animal", "狗 汪", "dog"],
  ["🐼", "animal", "熊猫", "panda"],
  ["🦊", "animal", "狐狸 聪明", "fox"],
  ["🐯", "animal", "老虎", "tiger"],
  ["🐰", "animal", "兔子 复活节", "rabbit bunny"],
  ["🐻", "animal", "熊", "bear"],
  ["🐨", "animal", "考拉", "koala"],
  ["🐷", "animal", "猪", "pig"],
  ["🐸", "animal", "青蛙", "frog"],
  ["🐟", "animal", "鱼", "fish"],
  ["🦋", "animal", "蝴蝶", "butterfly"],
  ["🐝", "animal", "蜜蜂 忙", "bee busy"],
  ["🌸", "animal", "樱花 花 春天", "cherry blossom flower"],
  ["🌿", "animal", "叶子 草本 自然", "leaf plant"],
  ["🌞", "animal", "太阳 晴天", "sun sunny"],
  ["🌙", "animal", "月亮 夜晚", "moon night"],
  ["⛅", "animal", "多云 天气", "cloud sun weather"],
  ["🌈", "animal", "彩虹 多元", "rainbow"],
  ["☕", "food", "咖啡 提神", "coffee"],
  ["🍵", "food", "茶 绿茶", "tea"],
  ["🥤", "food", "饮料 汽水", "drink cup"],
  ["🍺", "food", "啤酒 干杯", "beer"],
  ["🍚", "food", "米饭 饭", "rice"],
  ["🍜", "food", "面 拉面 早餐", "noodle ramen"],
  ["🍕", "food", "披萨", "pizza"],
  ["🍔", "food", "汉堡", "burger"],
  ["🍰", "food", "蛋糕 甜品 生日", "cake dessert"],
  ["🍎", "food", "苹果 水果", "apple fruit"],
  ["🍉", "food", "西瓜 夏天", "watermelon"],
  ["🥚", "food", "鸡蛋", "egg"],
  ["🍬", "food", "糖果 甜", "candy sweet"],
  ["🎂", "food", "生日 生日蛋糕", "birthday cake"],
  ["🎉", "activity", "庆祝 彩带 完成", "party celebrate tada"],
  ["🎊", "activity", "庆祝 派对", "confetti party"],
  ["🎁", "activity", "礼物 赠品", "gift present"],
  ["🏆", "activity", "奖杯 冠军 第一", "trophy win"],
  ["🥇", "activity", "金牌 第一", "gold medal"],
  ["🎮", "activity", "游戏 手柄", "game controller"],
  ["🎵", "activity", "音乐 音符", "music note"],
  ["🎧", "activity", "耳机 听歌", "headphone"],
  ["📷", "activity", "相机 拍照 截图", "camera photo"],
  ["🎬", "activity", "电影 视频 剪辑", "movie clapper video"],
  ["🎨", "activity", "调色板 设计 配色", "art palette design"],
  ["✏️", "activity", "铅笔 编辑", "pencil edit"],
  ["🖌️", "activity", "画笔 涂", "brush paint"],
  ["📚", "activity", "书 学习 阅读", "books read study"],
  ["🎓", "activity", "毕业 学位", "graduate"],
  ["💤", "symbol", "睡觉 休息", "sleep zzz rest"],
  ["🧩", "activity", "拼图 插件 扩展", "puzzle plugin"],
  ["🕹️", "activity", "街机 摇杆", "joystick arcade"],
  ["♟️", "activity", "棋 国际象棋", "chess"],
  ["🎲", "activity", "骰子 随机", "dice random"],
];

const CATS = [
  { key: "all", label: { "zh-TW": "全部", "zh-CN": "全部", en: "All" } },
  { key: "face", label: { "zh-TW": "臉", "zh-CN": "脸", en: "Faces" } },
  { key: "gesture", label: { "zh-TW": "手勢", "zh-CN": "手势", en: "Hands" } },
  { key: "heart", label: { "zh-TW": "心", "zh-CN": "心", en: "Hearts" } },
  { key: "animal", label: { "zh-TW": "動植物", "zh-CN": "动植物", en: "Nature" } },
  { key: "food", label: { "zh-TW": "吃", "zh-CN": "吃", en: "Food" } },
  { key: "activity", label: { "zh-TW": "玩", "zh-CN": "玩", en: "Play" } },
  { key: "object", label: { "zh-TW": "物", "zh-CN": "物", en: "Things" } },
  { key: "symbol", label: { "zh-TW": "符號", "zh-CN": "符号", en: "Symbols" } },
];

let cat = "all";
let term = "";

q.placeholder = t({ "zh-TW": "搜尋：咖啡、搜索、bug…", "zh-CN": "搜索：咖啡、搜索、bug…", en: "Search: coffee, search, bug…" });

function score(row, needle) {
  const [emoji, , zh, en] = row;
  if (!needle) return 1;
  if (emoji === needle) return 100;
  const z = zh.split(" ");
  const e = en.split(" ");
  let best = 0;
  for (const word of z) {
    if (word === needle) best = Math.max(best, 60);
    else if (word.startsWith(needle)) best = Math.max(best, 45);
    else if (word.includes(needle)) best = Math.max(best, 30);
  }
  for (const word of e) {
    if (word === needle) best = Math.max(best, 55);
    else if (word.startsWith(needle)) best = Math.max(best, 40);
    else if (word.includes(needle)) best = Math.max(best, 25);
  }
  return best;
}

function render() {
  const needle = term.trim().toLowerCase();
  const rows = DATA.filter((r) => (cat === "all" || r[1] === cat))
    .map((r) => ({ r, s: score(r, needle) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.r);

  grid.innerHTML = "";
  if (!rows.length) {
    const d = document.createElement("div");
    d.className = "empty";
    d.textContent = t({ "zh-TW": "沒找到，換個詞試試", "zh-CN": "没找到，换个词试试", en: "Nothing found — try another word" });
    grid.appendChild(d);
  }
  for (const [emoji, , zh, en] of rows) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = emoji;
    b.title = `${zh.split(" ")[0]} · ${en.split(" ")[0]}`;
    b.addEventListener("click", () => copy(emoji, b.title));
    grid.appendChild(b);
  }
  count.textContent = String(rows.length);
}

let toastTimer = 0;
function copy(emoji, label) {
  widget.clipboard
    .writeText(emoji)
    .then((ok) => {
      toast.textContent = ok ? `${emoji} ${label}` : t({ "zh-TW": "複製失敗", "zh-CN": "复制失败", en: "copy failed" });
      toast.classList.add("on");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("on"), 1500);
    })
    .catch((e) => {
      toast.textContent = String(e.message || e);
      toast.classList.add("on");
    });
}

function renderCats() {
  cats.innerHTML = "";
  for (const c of CATS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t(c.label);
    b.setAttribute("aria-selected", cat === c.key ? "true" : "false");
    b.addEventListener("click", () => {
      cat = c.key;
      renderCats();
      render();
    });
    cats.appendChild(b);
  }
}

q.addEventListener("input", () => {
  term = q.value;
  render();
});
q.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    q.value = "";
    term = "";
    render();
    q.blur();
  }
  if (e.key === "Enter" && grid.firstElementChild && grid.firstElementChild.tagName === "BUTTON") {
    grid.firstElementChild.click();
  }
});

function applySettings(s) {
  document.body.classList.remove("size-s", "size-m", "size-l");
  document.body.classList.add(`size-${(s && s.size) || "m"}`);
}

applySettings(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(applySettings);

renderCats();
render();
widget.on("summon", () => {
  q.focus();
  q.select();
});
