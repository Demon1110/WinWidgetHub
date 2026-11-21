/* 假数据：姓名、身份证号、手机号、银行卡号，全部本地生成，点一行复制一行。
 *
 * 号码都按真实规则算：身份证按 GB 11643-1999 的加权模 11 校验位，第 17 位奇偶决定性别；
 * 银行卡按 Luhn 算法补校验位。数据用随机拼装，与任何真实公民信息无关。 */

const t = widget.t;

const SURNAMES = "王李张刘陈杨赵黄周吴徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程魏苏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤";
const MALE = "伟强军磊涛鹏杰峰明刚勇毅超辉斌亮成浩宇轩晨博文武龙飞鑫凯健宁康然铭泽航睿嘉诚昊霖振国志建源";
const FEMALE = "芳娜敏静丽艳娟霞秀英玲燕红梅兰萍慧琳婷雪倩颖洁琼薇萌悦欣怡涵萱妍琪瑶柔淑珍蓉佳宁媛蕊曦雅菲";

/** 真实存在的行政区划码各取一个，省得生成出无法解析的号段。 */
const AREAS = ["110101", "310104", "440305", "330106", "510107", "420106", "370202", "610113", "350203", "230103"];
const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
const ID_CODES = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];
const PHONE_HEADS = ["130", "131", "132", "133", "135", "136", "137", "138", "139", "150", "151", "152", "155", "156", "157", "158", "159", "176", "177", "178", "180", "181", "182", "183", "185", "186", "187", "188", "189"];

const rand = (n) => Math.floor(Math.random() * n);
const pick = (list) => list[rand(list.length)];
const digits = (n) => Array.from({ length: n }, () => String(rand(10))).join("");
const pad = (n) => (n < 10 ? "0" + n : String(n));

function gender() {
  const set = widget.settings.get("gender");
  if (set === "male" || set === "female") return set;
  return rand(2) ? "male" : "female";
}

function makeName(who) {
  const given = who === "male" ? MALE : FEMALE;
  const chars = [...given];
  const length = rand(3) ? 2 : 1;
  let name = pick([...SURNAMES]);
  for (let i = 0; i < length; i += 1) name += chars[rand(chars.length)];
  return name;
}

/** 身份证前 17 位 + 校验位；第 17 位按性别调奇偶。 */
function makeId(who) {
  const year = 1960 + rand(46);
  const month = 1 + rand(12);
  const day = 1 + rand(28);
  const body = pick(AREAS) + year + pad(month) + pad(day) + digits(2);
  let seq = rand(10);
  if ((who === "male") !== (seq % 2 === 1)) seq = (seq + 1) % 10; // 奇数男、偶数女
  const first17 = body + seq;
  let sum = 0;
  for (let i = 0; i < 17; i += 1) sum += Number(first17[i]) * ID_WEIGHTS[i];
  return first17 + ID_CODES[sum % 11];
}

function makePhone() {
  return pick(PHONE_HEADS) + digits(8);
}

/** 622202 是中国工商银行的借记卡 BIN；补 Luhn 校验位正好 19 位。 */
function makeCard() {
  let body = "622202" + digits(12);
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    let d = Number(body[body.length - 1 - i]);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return body + String((10 - (sum % 10)) % 10);
}

const labels = {
  name: t({ "zh-TW": "姓名", "zh-CN": "姓名", en: "Name" }),
  id: t({ "zh-TW": "身分證號", "zh-CN": "身份证号", en: "ID number" }),
  phone: t({ "zh-TW": "手機號", "zh-CN": "手机号", en: "Phone" }),
  card: t({ "zh-TW": "銀行卡號", "zh-CN": "银行卡号", en: "Bank card" }),
};

const copied = t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "Copied" });
const againText = t({ "zh-TW": "換一組", "zh-CN": "换一组", en: "Regenerate" });

let current = null;

function groupCard(text) {
  return text.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function render() {
  const who = gender();
  current = { name: makeName(who), id: makeId(who), phone: makePhone(), card: makeCard() };
  document.getElementById("value-name").textContent = current.name;
  document.getElementById("value-id").textContent = current.id;
  document.getElementById("value-phone").textContent = current.phone;
  document.getElementById("value-card").textContent = groupCard(current.card);
}

for (const key of Object.keys(labels)) {
  document.getElementById("label-" + key).textContent = labels[key];
}
document.getElementById("again").textContent = againText;

document.querySelectorAll(".row").forEach((row) => {
  row.addEventListener("click", async () => {
    const key = row.dataset.key;
    if (!current) return;
    try {
      await widget.clipboard.writeText(current[key]);
      widget.util.toast(document.getElementById("toast"), `${copied} · ${labels[key]}`, 1100);
    } catch (e) {
      widget.log(`fake-data: copy failed: ${e.message}`);
    }
  });
});

document.getElementById("again").addEventListener("click", render);

/* 换性别就等于换一组：姓名用字和身份证第 17 位都得重来。 */
widget.settings.onChange(() => render());

render();
