const $ = widget.util.$;
const zh = widget.util.zh;
const hans = widget.util.hans;
const t = (cn, tw, en) => (zh ? (hans ? cn : tw) : en);

const SETTINGS_KEY = "offwork/settings";
const HOST_MIGRATION_KEY = "offwork/host-settings-migrated";
const SCHEDULE_CODE = "offwork-daily";
const DAY_MS = 86400000;
const DEFAULT_OVERLAY_SECONDS = 6;
const DEFAULT_OVERLAY_POSITION = "bottom-right";
const OVERLAY_POSITIONS = [
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right",
  "bottom-center",
  "top-center",
  "right-center",
  "left-center",
];
const DEFAULT_CITY = {
  name: "北京",
  admin1: "北京市",
  country: "中国",
  latitude: 39.9075,
  longitude: 116.39723,
};
const IP_LOOKUPS = [
  {
    url: "https://get.geojs.io/v1/ip/geo.json",
    city: "city",
    admin1: "region",
    country: "country",
    latitude: "latitude",
    longitude: "longitude",
    failed: (data) => !data || !data.city,
  },
  {
    url: "https://ipapi.co/json/",
    city: "city",
    admin1: "region",
    country: "country_name",
    latitude: "latitude",
    longitude: "longitude",
    failed: (data) => data && data.error === true,
  },
  {
    url: "https://ipwho.is/",
    city: "city",
    admin1: "region",
    country: "country",
    latitude: "latitude",
    longitude: "longitude",
    failed: (data) => data && data.success === false,
  },
];

const el = {
  eyebrow: $("eyebrow"),
  title: $("title"),
  reminderToggle: $("reminderToggle"),
  reminderDot: $("reminderDot"),
  reminderText: $("reminderText"),
  cityName: $("cityName"),
  weatherText: $("weatherText"),
  temperature: $("temperature"),
  weatherMeta: $("weatherMeta"),
  greeting: $("greeting"),
  warm: $("warm"),
  settingsTitle: $("settingsTitle"),
  settingsHint: $("settingsHint"),
  settingsSummary: $("settingsSummary"),
  effectToggle: $("effectToggle"),
  effectLabel: $("effectLabel"),
  almanacTitle: $("almanacTitle"),
  almanacDate: $("almanacDate"),
  almanacBadge: $("almanacBadge"),
  almanacGz: $("almanacGz"),
  almanacChong: $("almanacChong"),
  almanacYi: $("almanacYi"),
  almanacJi: $("almanacJi"),
  tips: $("tips"),
  preview: $("preview"),
  hide: $("hide"),
  refresh: $("refresh"),
  status: $("status"),
};

let settings = {
  offWorkTime: "18:00",
  city: { ...DEFAULT_CITY },
  cityAuto: true,
  reminderEnabled: true,
  rainEffectEnabled: true,
  overlaySeconds: DEFAULT_OVERLAY_SECONDS,
  overlayPosition: DEFAULT_OVERLAY_POSITION,
};
let weather = null;
let overlayWinId = null;
let busy = false;

function clampOverlaySeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_OVERLAY_SECONDS;
  return Math.min(60, Math.max(3, Math.round(n)));
}

function normalizeOverlayPosition(value) {
  return OVERLAY_POSITIONS.includes(value) ? value : DEFAULT_OVERLAY_POSITION;
}

function overlayPositionText(value) {
  const names = {
    "bottom-left": t("左下", "左下", "Bottom left"),
    "bottom-right": t("右下", "右下", "Bottom right"),
    "top-left": t("左上", "左上", "Top left"),
    "top-right": t("右上", "右上", "Top right"),
    "bottom-center": t("正下", "正下", "Bottom center"),
    "top-center": t("正上", "正上", "Top center"),
    "right-center": t("正右", "正右", "Right center"),
    "left-center": t("正左", "正左", "Left center"),
  };
  return names[normalizeOverlayPosition(value)];
}

// ── 黄历：节气、干支、建除、宜忌 ─────────────────────────────────────
const RAD = Math.PI / 180;
function sunLon(ms) {
  const tcy = (ms / DAY_MS + 2440587.5 - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * tcy + 0.0003032 * tcy * tcy;
  const M = (357.52911 + 35999.05029 * tcy - 0.0001537 * tcy * tcy) * RAD;
  const C =
    (1.914602 - 0.004817 * tcy - 0.000014 * tcy * tcy) * Math.sin(M) +
    (0.019993 - 0.000101 * tcy) * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  const omega = (125.04 - 1934.136 * tcy) * RAD;
  return (((L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) % 360) + 360) % 360;
}

function termTime(year, angle) {
  let guess = Date.UTC(year, 0, 1);
  guess += (((angle - sunLon(guess)) + 360) % 360) / 0.98564736 * DAY_MS;
  for (let i = 0; i < 6; i++) {
    const diff = ((angle - sunLon(guess) + 540) % 360) - 180;
    guess += diff / 0.98564736 * DAY_MS;
  }
  return guess;
}

const termsByYear = new Map();
function terms(year) {
  let hit = termsByYear.get(year);
  if (hit) return hit;
  hit = [];
  for (let i = 0; i < 24; i++) {
    const bj = new Date(termTime(year, i * 15) + 8 * 3600000);
    hit.push({
      i,
      key: `${bj.getUTCFullYear()}-${String(bj.getUTCMonth() + 1).padStart(2, "0")}-${String(bj.getUTCDate()).padStart(2, "0")}`,
    });
  }
  termsByYear.set(year, hit);
  return hit;
}

const keyOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const GAN = "甲乙丙丁戊己庚辛壬癸";
const ZHI = "子丑寅卯辰巳午未申酉戌亥";
const JIANCHU = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];
const HUANG_DAO = new Set([1, 4, 5, 7, 8, 10]);
const YJ = [
  { yi: "出行 上任 祈福 求嗣 动土", ji: "破土 安葬 开仓" },
  { yi: "扫舍 治病 解除 沐浴 整容", ji: "出行 嫁娶 开市" },
  { yi: "祭祀 祈福 开市 交易 立券", ji: "安葬 动土 服药" },
  { yi: "修饰 交易 平治道涂 出行", ji: "开渠 动土 安葬" },
  { yi: "嫁娶 开市 交易 入学 签约", ji: "诉讼 出行 搬迁" },
  { yi: "修造 捕捉 纳财 收账", ji: "开市 出行 安葬" },
  { yi: "求医 破屋 坏垣 拆卸", ji: "嫁娶 开市 动土 出行" },
  { yi: "安床 祭祀 祈福 修造", ji: "登高 出行 动土" },
  { yi: "嫁娶 开市 入学 动土 安葬", ji: "诉讼 争执 破土" },
  { yi: "纳财 收账 买田 修屋", ji: "开市 出行 安葬" },
  { yi: "开市 嫁娶 入学 动土 出行", ji: "安葬 破土 诉讼" },
  { yi: "安葬 修坟 筑堤 补垣", ji: "开市 出行 嫁娶 求医" },
];
const ZODIAC = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
const SHA = ["南", "东", "北", "西"];

function lastJie(d) {
  const key = keyOf(d);
  let best = null;
  for (const year of [d.getFullYear() - 1, d.getFullYear()]) {
    for (const x of terms(year)) {
      if (x.i % 2 === 0) continue;
      if (x.key <= key && (!best || x.key >= best.key)) best = x;
    }
  }
  return best;
}

function solarYear(d) {
  const y = d.getFullYear();
  return keyOf(d) < terms(y)[21].key ? y - 1 : y;
}

function gzYearName(y) {
  const i = (((y - 4) % 60) + 60) % 60;
  return GAN[i % 10] + ZHI[i % 12];
}

function gzMonth(d) {
  const jie = lastJie(d);
  const branch = ((((jie.i + 1) / 2 + 3) % 12) + 12) % 12;
  const yearGan = GAN.indexOf(gzYearName(solarYear(d))[0]);
  const start = (yearGan * 2 + 2) % 10;
  const gan = (start + ((branch - 2 + 12) % 12)) % 10;
  return { gan, branch, text: GAN[gan] + ZHI[branch] };
}

function gzDay(d) {
  const jdn = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS) + 2440588;
  const i = (((jdn + 49) % 60) + 60) % 60;
  return { i, text: GAN[i % 10] + ZHI[i % 12] };
}

function almanac(d) {
  const monthBranch = gzMonth(d).branch;
  const day = gzDay(d);
  const dayBranch = day.i % 12;
  const jc = ((dayBranch - monthBranch) % 12 + 12) % 12;
  const chongBranch = (dayBranch + 6) % 12;
  return {
    day,
    name: JIANCHU[jc] + "日",
    huang: HUANG_DAO.has(jc),
    yi: YJ[jc].yi.split(" "),
    ji: YJ[jc].ji.split(" "),
    chong: ZODIAC[chongBranch],
    sha: SHA[dayBranch % 4],
  };
}

// ── 天气 ─────────────────────────────────────────────────────────────
const WMO = {
  0: ["晴", "晴", "Clear"],
  1: ["大部晴朗", "大部晴朗", "Mostly clear"],
  2: ["多云", "多雲", "Partly cloudy"],
  3: ["阴", "陰", "Overcast"],
  45: ["雾", "霧", "Fog"],
  48: ["雾凇", "霧淞", "Rime fog"],
  51: ["毛毛雨", "毛毛雨", "Light drizzle"],
  53: ["毛毛雨", "毛毛雨", "Drizzle"],
  55: ["毛毛雨", "毛毛雨", "Heavy drizzle"],
  56: ["冻毛毛雨", "凍毛毛雨", "Freezing drizzle"],
  57: ["冻毛毛雨", "凍毛毛雨", "Freezing drizzle"],
  61: ["小雨", "小雨", "Light rain"],
  63: ["中雨", "中雨", "Rain"],
  65: ["大雨", "大雨", "Heavy rain"],
  66: ["冻雨", "凍雨", "Freezing rain"],
  67: ["冻雨", "凍雨", "Freezing rain"],
  71: ["小雪", "小雪", "Light snow"],
  73: ["中雪", "中雪", "Snow"],
  75: ["大雪", "大雪", "Heavy snow"],
  77: ["米雪", "米雪", "Snow grains"],
  80: ["阵雨", "陣雨", "Rain showers"],
  81: ["阵雨", "陣雨", "Rain showers"],
  82: ["强阵雨", "強陣雨", "Violent showers"],
  85: ["阵雪", "陣雪", "Snow showers"],
  86: ["阵雪", "陣雪", "Heavy snow showers"],
  95: ["雷雨", "雷雨", "Thunderstorm"],
  96: ["雷雨冰雹", "雷雨冰雹", "Thunderstorm with hail"],
  99: ["雷雨冰雹", "雷雨冰雹", "Thunderstorm with hail"],
};

function weatherKind(code) {
  if ([0, 1].includes(code)) return { effect: "sunny", kind: "sunny" };
  if ([2, 3].includes(code)) return { effect: "cloudy", kind: "cloudy" };
  if ([45, 48].includes(code)) return { effect: "mist", kind: "fog" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { effect: "rain", kind: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { effect: "snow", kind: "snow" };
  if (code >= 95) return { effect: "thunder", kind: "thunder" };
  return { effect: "glow", kind: "ok" };
}

function weatherText(code) {
  const row = WMO[code];
  if (!row) return t("天气", "天氣", "Weather");
  return t(row[0], row[1], row[2]);
}

function currentDayPart(hour) {
  if (hour < 5) return t("夜深了", "夜深了", "Late night");
  if (hour < 11) return t("早上好", "早安", "Good morning");
  if (hour < 14) return t("中午好", "午安", "Good noon");
  if (hour < 18) return t("下午好", "午安", "Good afternoon");
  return t("晚上好", "晚安", "Good evening");
}

function dayOfYear(d) {
  const start = Date.UTC(d.getFullYear(), 0, 1);
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / DAY_MS) + 1;
}

function encouragement(d) {
  const lines = [
    t("把今天收好，明天再打开。", "把今天收好，明天再打開。", "Wrap up today; open tomorrow fresh."),
    t("认真生活的人，值得一顿好饭。", "認真生活的人，值得一頓好飯。", "A day well lived deserves a good meal."),
    t("下班不是结束，是把时间还给自己。", "下班不是結束，是把時間還給自己。", "Leaving work is giving time back to yourself."),
    t("今天的努力，已经算数了。", "今天的努力，已經算數了。", "Today's effort already counts."),
    t("路灯亮起的时候，慢慢走回家。", "路燈亮起的時候，慢慢走回家。", "When the streetlights come on, take the slow way home."),
    t("不必把每一分钟都填满。", "不必把每一分鐘都填滿。", "Not every minute has to be filled."),
    t("先吃饭，再想别的。", "先吃飯，再想別的。", "Eat first. Think later."),
    t("你已经在路上了。", "你已經在路上了。", "You are already on your way."),
  ];
  return lines[(dayOfYear(d) + 3) % lines.length];
}

function buildTips(w) {
  const tips = [];
  const add = (kind, text) => {
    if (tips.length < 2 && !tips.some((x) => x.kind === kind)) tips.push({ kind, text });
  };
  if (w.kind === "thunder") {
    add("umbrella", t("雷雨天气，带好伞，路上慢一点。", "雷雨天氣，帶好傘，路上慢一點。", "Thunderstorms: take an umbrella and go slow."));
    add("safety", t("打雷时避开大树和空旷高处。", "打雷時避開大樹和空曠高處。", "Stay away from tall trees and open high ground."));
  } else if (w.kind === "snow") {
    add("snow", t("有雪，路面可能打滑，注意脚下。", "有雪，路面可能打滑，注意腳下。", "Snow may make the pavement slippery. Watch your step."));
    add("cold", t("气温偏低，围巾和手套别忘了。", "氣溫偏低，圍巾和手套別忘了。", "It is cold; do not forget a scarf and gloves."));
  } else if (w.kind === "rain") {
    add("umbrella", t("有雨，伞放在顺手的地方。", "有雨，傘放在順手的地方。", "Rain is around; keep an umbrella within reach."));
  } else if (w.kind === "fog") {
    add("fog", t("有雾，过马路和骑车都慢一点。", "有霧，過馬路和騎車都慢一點。", "Fog: slow down crossing roads and riding."));
  }
  if (Number.isFinite(w.temp) && w.temp >= 30) {
    add("heat", t("天气偏热，记得补水。", "天氣偏熱，記得補水。", "It is hot; remember to drink water."));
  }
  if (Number.isFinite(w.temp) && w.temp <= 10) {
    add("cold", t("有点冷，回家路上注意保暖。", "有點冷，回家路上注意保暖。", "It is chilly; keep warm on the way home."));
  }
  if (Number.isFinite(w.wind) && w.wind >= 25) {
    add("wind", t("风有点大，外套穿好。", "風有點大，外套穿好。", "It is windy; keep your coat on."));
  }
  if (Number.isFinite(w.precip) && w.precip >= 50) {
    add("umbrella", t("降水概率较高，带伞更稳妥。", "降水機率較高，帶傘更穩妥。", "A high chance of rain; pack an umbrella."));
  }
  if (Number.isFinite(w.uv) && w.uv >= 6) {
    add("safety", t("紫外线较强，回家路上注意防晒。", "紫外線較強，回家路上注意防曬。", "UV is strong; protect yourself on the way home."));
  }
  if (!tips.length) {
    add("ok", t("天气平稳，适合慢慢走回家。", "天氣平穩，適合慢慢走回家。", "Calm weather; a good evening for a slow walk home."));
  }
  return tips;
}

function weatherFrom(data) {
  const c = data.current || {};
  const d = data.daily || {};
  const daily = (key) => (Array.isArray(d[key]) ? d[key][0] : null);
  const code = Number(c.weather_code);
  const kind = weatherKind(code);
  const temp = Number(c.temperature_2m);
  return {
    code,
    text: weatherText(code),
    effect: kind.effect,
    kind: kind.kind,
    temp: Number.isFinite(temp) ? Math.round(temp) : null,
    apparent: Number.isFinite(Number(c.apparent_temperature)) ? Math.round(Number(c.apparent_temperature)) : null,
    humidity: Number.isFinite(Number(c.relative_humidity_2m)) ? Math.round(Number(c.relative_humidity_2m)) : null,
    wind: Number.isFinite(Number(c.wind_speed_10m)) ? Math.round(Number(c.wind_speed_10m)) : null,
    high: Number.isFinite(Number(daily("temperature_2m_max"))) ? Math.round(Number(daily("temperature_2m_max"))) : null,
    low: Number.isFinite(Number(daily("temperature_2m_min"))) ? Math.round(Number(daily("temperature_2m_min"))) : null,
    precip: Number.isFinite(Number(daily("precipitation_probability_max"))) ? Math.round(Number(daily("precipitation_probability_max"))) : null,
    uv: Number.isFinite(Number(daily("uv_index_max"))) ? Math.round(Number(daily("uv_index_max"))) : null,
    sunrise: daily("sunrise"),
    sunset: daily("sunset"),
    isDay: c.is_day === 1,
  };
}

async function fetchWeather() {
  const city = settings.city;
  const url =
    "https://api.open-meteo.com/v1/forecast?latitude=" +
    encodeURIComponent(city.latitude) +
    "&longitude=" +
    encodeURIComponent(city.longitude) +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max" +
    "&timezone=auto&forecast_days=1";
  setStatus(t("正在读取天气…", "正在讀取天氣…", "Reading the weather…"));
  const res = await widget.fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const data = await res.json();
  weather = weatherFrom(data);
  renderWeather();
  setStatus(t("天气已更新", "天氣已更新", "Weather updated"));
  return weather;
}

function renderWeather() {
  el.cityName.textContent = settings.city.name || "";
  if (!weather) {
    el.weatherText.textContent = t("天气暂不可用", "天氣暫不可用", "Weather unavailable");
    el.temperature.textContent = "--";
    el.weatherMeta.textContent = "";
    el.tips.replaceChildren();
    return;
  }
  el.weatherText.textContent = weather.text;
  el.temperature.replaceChildren(document.createTextNode(String(weather.temp ?? "--")), Object.assign(document.createElement("span"), { textContent: "°" }));
  const meta = [];
  if (weather.high !== null && weather.low !== null) meta.push(`${weather.low}° ~ ${weather.high}°`);
  if (weather.humidity !== null) meta.push(t(`湿度 ${weather.humidity}%`, `濕度 ${weather.humidity}%`, `${weather.humidity}% humidity`));
  if (weather.wind !== null) meta.push(t(`风速 ${weather.wind} km/h`, `風速 ${weather.wind} km/h`, `wind ${weather.wind} km/h`));
  if (weather.precip !== null) meta.push(t(`降水 ${weather.precip}%`, `降水 ${weather.precip}%`, `rain ${weather.precip}%`));
  el.weatherMeta.textContent = meta.join(" · ");

  const now = new Date();
  el.greeting.textContent = currentDayPart(now.getHours());
  el.warm.textContent = t("今天辛苦了", "今天辛苦了", "You did a lot today");

  const tips = buildTips(weather);
  el.tips.replaceChildren();
  for (const tip of tips) {
    const row = document.createElement("div");
    row.className = "tip";
    const dot = document.createElement("span");
    dot.className = "tip-dot";
    const text = document.createElement("span");
    text.textContent = tip.text;
    row.append(dot, text);
    el.tips.appendChild(row);
  }
}

function renderAlmanac() {
  const a = almanac(new Date());
  el.almanacDate.textContent = t(
    `${new Date().getMonth() + 1}月${new Date().getDate()}日`,
    `${new Date().getMonth() + 1}月${new Date().getDate()}日`,
    new Intl.DateTimeFormat(widget.locale, { month: "short", day: "numeric" }).format(new Date())
  );
  el.almanacBadge.textContent = a.name;
  el.almanacBadge.dataset.good = a.huang ? "true" : "false";
  el.almanacGz.textContent = `${gzYearName(solarYear(new Date()))}年 · ${gzMonth(new Date()).text}月 · ${a.day.text}日`;
  el.almanacChong.textContent = t(`冲${a.chong} · 煞${a.sha}`, `沖${a.chong} · 煞${a.sha}`, `clash ${a.chong} · avoid ${a.sha}`);
  el.almanacYi.textContent = a.yi.join(" · ");
  el.almanacJi.textContent = a.ji.join(" · ");
}

// ── 问候与桌面 overlay ───────────────────────────────────────────────
function buildPayload() {
  const now = new Date();
  const [hh, mm] = (settings.offWorkTime || "18:00").split(":").map(Number);
  const offMinutes = hh * 60 + mm;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const arrived = nowMinutes >= offMinutes;
  const w = weather || {
    text: t("天气暂不可用", "天氣暫不可用", "Weather unavailable"),
    effect: "glow",
    kind: "ok",
    temp: null,
    precip: null,
    wind: null,
    uv: null,
  };
  return {
    greeting: currentDayPart(now.getHours()),
    title: arrived
      ? t("该下班啦", "該下班啦", "Time to leave")
      : t("快要下班了", "快要下班了", "Almost time to leave"),
    warm: t("今天辛苦了", "今天辛苦了", "You did a lot today"),
    weatherText: w.text,
    temperature: w.temp,
    cityName: settings.city.name,
    tips: buildTips(w),
    encouragement: encouragement(now),
    effect: settings.rainEffectEnabled ? w.effect : "none",
    timeText: settings.offWorkTime || "18:00",
    durationMs: clampOverlaySeconds(settings.overlaySeconds) * 1000,
  };
}

async function displayArea() {
  try {
    const d = await widget.screen.primary();
    return d && (d.workArea || d.bounds);
  } catch (err) {
    return null;
  }
}

async function showOverlay() {
  if (busy) return;
  busy = true;
  try {
    if (!weather) {
      await fetchWeather().catch(() => {});
    }
    const data = buildPayload();
    if (overlayWinId !== null) {
      await widget.call("win.destroy", { win: overlayWinId }).catch(() => {});
      overlayWinId = null;
    }
    const width = 384;
    const height = 332;
    const area = await displayArea();
    const gap = 20;
    const left = area ? Math.round(area.x + gap) : undefined;
    const right = area ? Math.round(area.x + area.width - width - gap) : undefined;
    const top = area ? Math.round(area.y + gap) : undefined;
    const bottom = area ? Math.round(area.y + area.height - height - gap) : undefined;
    const centerX = area ? Math.round(area.x + (area.width - width) / 2) : undefined;
    const centerY = area ? Math.round(area.y + (area.height - height) / 2) : undefined;
    let x = right;
    let y = bottom;
    switch (settings.overlayPosition) {
      case "bottom-left":
        x = left;
        y = bottom;
        break;
      case "top-left":
        x = left;
        y = top;
        break;
      case "top-right":
        x = right;
        y = top;
        break;
      case "bottom-center":
        x = centerX;
        y = bottom;
        break;
      case "top-center":
        x = centerX;
        y = top;
        break;
      case "right-center":
        x = right;
        y = centerY;
        break;
      case "left-center":
        x = left;
        y = centerY;
        break;
      default:
        x = right;
        y = bottom;
    }
    const options = {
      width,
      height,
      x,
      y,
      center: !area,
      frame: false,
      transparent: true,
      seeThrough: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      closable: true,
      focusable: false,
      show: false,
      hasShadow: false,
      roundedCorners: false,
      backgroundColor: "#00000000",
    };
    const reply = await widget.call("win.create", {
      file: "overlay.html?data=" + encodeURIComponent(JSON.stringify(data)),
      options,
    });
    const id = reply && reply.id;
    if (id === undefined || id === null) throw new Error("问候窗口没有创建成功");
    overlayWinId = id;
    await widget.call("win.setAlwaysOnTop", { win: id, flag: true, level: "screen-saver" }).catch(() => {});
    await widget.call("win.setIgnoreMouseEvents", { win: id, ignore: true }).catch(() => {});
    await widget.call("win.showInactive", { win: id });
    setTimeout(() => {
      overlayWinId = null;
    }, data.durationMs + 1800);
  } catch (err) {
    setStatus(String(err && err.message ? err.message : err), true);
  } finally {
    busy = false;
  }
}

async function syncSchedule() {
  await widget.schedule.remove(SCHEDULE_CODE).catch(() => {});
  if (!settings.reminderEnabled) return;
  const [h, m] = (settings.offWorkTime || "18:00").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return;
  await widget.schedule.request({
    code: SCHEDULE_CODE,
    label: t("下班关怀提醒", "下班關懷提醒", "Off-work reminder"),
    trigger: { cron: `${m} ${h} * * 1-5` },
  });
}

// ── 设置、城市与事件 ────────────────────────────────────────────────
function parseSettings(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  const city =
    s.city && Number.isFinite(Number(s.city.latitude)) && Number.isFinite(Number(s.city.longitude))
      ? {
          name: String(s.city.name || DEFAULT_CITY.name),
          admin1: String(s.city.admin1 || ""),
          country: String(s.city.country || ""),
          latitude: Number(s.city.latitude),
          longitude: Number(s.city.longitude),
        }
      : { ...DEFAULT_CITY };
  const isDefaultCity =
    city.name === DEFAULT_CITY.name &&
    Math.abs(city.latitude - DEFAULT_CITY.latitude) < 0.01 &&
    Math.abs(city.longitude - DEFAULT_CITY.longitude) < 0.01;
  return {
    offWorkTime: /^\d{2}:\d{2}$/.test(s.offWorkTime) ? s.offWorkTime : "18:00",
    city,
    // Keep a manually chosen city; fresh installs and untouched defaults locate automatically.
    cityAuto: typeof s.cityAuto === "boolean" ? s.cityAuto : isDefaultCity,
    reminderEnabled: s.reminderEnabled !== false,
    rainEffectEnabled: s.rainEffectEnabled !== false,
    overlaySeconds: clampOverlaySeconds(s.overlaySeconds),
    overlayPosition: normalizeOverlayPosition(s.overlayPosition),
  };
}

async function loadSettings() {
  let stored = null;
  try {
    stored = await widget.storage.get(SETTINGS_KEY);
  } catch (err) {
    console.warn("settings load failed", err);
  }
  settings = parseSettings(stored);
  const legacyApplied = await migrateLegacySettings(stored);
  if (legacyApplied) {
    if (settings.cityAuto) await autoLocateCity();
    renderSettingsSummary();
    await saveSettings();
  } else {
    await applyHostSettings(readHostSettings());
  }
  el.effectToggle.checked = settings.rainEffectEnabled;
  renderReminderToggle();
}

function readHostSettings(raw) {
  const s = raw && typeof raw === "object" ? raw : widget.settings.get() || {};
  return {
    offWorkTime: /^\d{2}:\d{2}$/.test(String(s.offWorkTime || "")) ? String(s.offWorkTime) : "18:00",
    city: String(s.city || "").trim(),
    overlaySeconds: clampOverlaySeconds(s.overlaySeconds),
    overlayPosition: normalizeOverlayPosition(s.overlayPosition),
  };
}

async function migrateLegacySettings(stored) {
  if (!stored) return false;
  try {
    if (await widget.storage.get(HOST_MIGRATION_KEY)) return false;
    const host = readHostSettings();
    const untouched =
      host.offWorkTime === "18:00" &&
      !host.city &&
      host.overlaySeconds === DEFAULT_OVERLAY_SECONDS &&
      host.overlayPosition === DEFAULT_OVERLAY_POSITION;
    if (!untouched) {
      await widget.storage.set(HOST_MIGRATION_KEY, true);
      return false;
    }
    const legacy = parseSettings(stored);
    if (
      legacy.offWorkTime === "18:00" &&
      legacy.cityAuto &&
      legacy.overlaySeconds === DEFAULT_OVERLAY_SECONDS &&
      legacy.overlayPosition === DEFAULT_OVERLAY_POSITION
    ) {
      await widget.storage.set(HOST_MIGRATION_KEY, true);
      return false;
    }
    if (legacy.offWorkTime !== "18:00") await widget.settings.set("offWorkTime", legacy.offWorkTime);
    if (!legacy.cityAuto && legacy.city && legacy.city.name) await widget.settings.set("city", legacy.city.name);
    if (legacy.overlaySeconds !== DEFAULT_OVERLAY_SECONDS) await widget.settings.set("overlaySeconds", legacy.overlaySeconds);
    if (legacy.overlayPosition !== DEFAULT_OVERLAY_POSITION) await widget.settings.set("overlayPosition", legacy.overlayPosition);
    await widget.storage.set(HOST_MIGRATION_KEY, true);
    return true;
  } catch (err) {
    console.warn("settings migration failed", err);
    return false;
  }
}

async function applyHostSettings(host) {
  settings.offWorkTime = host.offWorkTime;
  settings.overlaySeconds = host.overlaySeconds;
  settings.overlayPosition = host.overlayPosition;
  if (host.city) {
    settings.cityAuto = false;
    if (settings.city.name !== host.city) {
      const city = await findCityByName(host.city);
      if (city) {
        settings.city = city;
      } else {
        setStatus(t(`找不到城市“${host.city}”`, `找不到城市「${host.city}」`, `City "${host.city}" not found`), true);
      }
    }
  } else {
    settings.cityAuto = true;
    await autoLocateCity();
  }
  renderSettingsSummary();
  await saveSettings();
}

async function saveSettings() {
  await widget.storage.set(SETTINGS_KEY, settings);
}

function renderSettingsSummary() {
  if (!el.settingsSummary) return;
  const city = settings.cityAuto ? t("自动定位", "自動定位", "Auto location") : settings.city.name;
  const seconds = t(`${settings.overlaySeconds} 秒`, `${settings.overlaySeconds} 秒`, `${settings.overlaySeconds}s`);
  el.settingsSummary.textContent = `${settings.offWorkTime} · ${city} · ${seconds} · ${overlayPositionText(settings.overlayPosition)}`;
}

function renderReminderToggle() {
  el.reminderToggle.dataset.on = settings.reminderEnabled ? "true" : "false";
  el.reminderDot.dataset.on = settings.reminderEnabled ? "true" : "false";
  el.reminderText.textContent = settings.reminderEnabled
    ? t("下班提醒", "下班提醒", "Reminder on")
    : t("提醒已关", "提醒已關", "Reminder off");
}

async function findCityByName(name) {
  try {
    const url =
      "https://geocoding-api.open-meteo.com/v1/search?name=" +
      encodeURIComponent(name) +
      "&count=1&language=zh&format=json";
    const res = await widget.fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const c = (data.results || [])[0];
    if (!c || !Number.isFinite(Number(c.latitude)) || !Number.isFinite(Number(c.longitude))) return null;
    return {
      name: String(c.name || name),
      admin1: String(c.admin1 || ""),
      country: String(c.country || ""),
      latitude: Number(c.latitude),
      longitude: Number(c.longitude),
    };
  } catch (err) {
    console.warn("city lookup failed", err);
    return null;
  }
}

async function locateCityByIp() {
  for (const source of IP_LOOKUPS) {
    try {
      const res = await widget.fetch(source.url);
      if (!res.ok) continue;
      const data = await res.json();
      if (source.failed(data)) continue;
      const city = String(data[source.city] || "").trim();
      if (!city) continue;

      const localized = await findCityByName(city);
      if (localized) return localized;

      const latitude = Number(data[source.latitude]);
      const longitude = Number(data[source.longitude]);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
      return {
        name: city,
        admin1: String(data[source.admin1] || ""),
        country: String(data[source.country] || ""),
        latitude,
        longitude,
      };
    } catch (err) {
      console.warn("ip location failed", source.url, err);
    }
  }
  return null;
}

async function autoLocateCity() {
  if (!settings.cityAuto) return;
  const city = await locateCityByIp();
  if (!city) {
    renderSettingsSummary();
    return;
  }
  settings.city = city;
  await saveSettings();
  renderSettingsSummary();
  setStatus(
    t(`已根据网络位置定位到 ${city.name}`, `已依網路位置定位到 ${city.name}`, `Located ${city.name} from your network`)
  );
}

function setStatus(text, warn) {
  el.status.textContent = text;
  el.status.dataset.warn = warn ? "true" : "";
}

function labels() {
  el.eyebrow.textContent = t("今天也辛苦了", "今天也辛苦了", "You made it through today");
  el.title.textContent = t("下班关怀", "下班關懷", "Off-work care");
  el.settingsTitle.textContent = t("显示设置", "顯示設定", "Display");
  el.settingsHint.textContent = t(
    "下班时间、城市、问候停留和问候位置已移到组件设置",
    "下班時間、城市、問候停留和問候位置已移到組件設定",
    "Off-work time, city, greeting dwell and position are in the widget settings"
  );
  el.almanacTitle.textContent = t("今日黄历", "今日黃曆", "Today's almanac");
  el.effectLabel.textContent = t("天气特效", "天氣特效", "Weather effect");
  el.preview.textContent = t("预览下班问候", "預覽下班問候", "Preview the greeting");
  el.hide.textContent = t("收起", "收起", "Hide");
  el.refresh.textContent = t("刷新", "重新整理", "Refresh");
  renderSettingsSummary();
  renderReminderToggle();
}

el.reminderToggle.addEventListener("click", async () => {
  settings.reminderEnabled = !settings.reminderEnabled;
  await saveSettings();
  renderReminderToggle();
  await syncSchedule().catch((err) => setStatus(String(err && err.message ? err.message : err), true));
  setStatus(settings.reminderEnabled ? t("已开启工作日下班提醒", "已開啟工作日下班提醒", "Weekday reminder on") : t("已关闭下班提醒", "已關閉下班提醒", "Reminder off"));
});

el.effectToggle.addEventListener("change", async () => {
  settings.rainEffectEnabled = el.effectToggle.checked;
  await saveSettings();
  setStatus(settings.rainEffectEnabled ? t("天气特效已开启", "天氣特效已開啟", "Weather effect on") : t("天气特效已关闭", "天氣特效已關閉", "Weather effect off"));
});

let hostSettingsBound = false;
function bindHostSettings() {
  if (hostSettingsBound) return;
  hostSettingsBound = true;
  widget.settings.onChange(async (next) => {
    await applyHostSettings(readHostSettings(next));
    el.effectToggle.checked = settings.rainEffectEnabled;
    renderReminderToggle();
    await fetchWeather().catch((err) => setStatus(String(err && err.message ? err.message : err), true));
    await syncSchedule().catch((err) => setStatus(String(err && err.message ? err.message : err), true));
  });
}

el.refresh.addEventListener("click", async () => {
  await fetchWeather().catch((err) => setStatus(String(err && err.message ? err.message : err), true));
  renderAlmanac();
});

el.preview.addEventListener("click", showOverlay);
el.hide.addEventListener("click", () => widget.window.hide().catch(() => {}));

widget.schedule.onTrigger(async (action) => {
  if (!action || action.code !== SCHEDULE_CODE) return;
  await showOverlay();
});

widget.on("ready", async () => {
  labels();
  await loadSettings();
  bindHostSettings();
  renderAlmanac();
  await fetchWeather().catch((err) => {
    setStatus(String(err && err.message ? err.message : err), true);
    renderWeather();
  });
  await syncSchedule().catch((err) => setStatus(String(err && err.message ? err.message : err), true));
});
