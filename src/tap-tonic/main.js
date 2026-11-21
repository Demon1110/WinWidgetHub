const t = widget.t;
const $ = (id) => document.getElementById(id);

const VOICES = {
  mech: { "zh-TW": "機械鍵盤", "zh-CN": "机械键盘", en: "Mechanical" },
  type: { "zh-TW": "打字機", "zh-CN": "打字机", en: "Typewriter" },
  wood: { "zh-TW": "木魚", "zh-CN": "木鱼", en: "Wooden block" },
  bubble: { "zh-TW": "氣泡", "zh-CN": "气泡", en: "Bubble" },
};
const LEVEL = { low: 0.35, mid: 0.62, high: 1 };

let opts = { voice: "mech", volume: "mid", muteOnMouse: true };
let ctx = null;
let master = null;
let taps = 0;
let pressed = new Set();
let unsub = null;
let enabled = true;

const hint = $("hint");
const keyEl = $("key");
const pulse = $("pulse");

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = (LEVEL[opts.volume] || 0.62) * 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function noise(c, seconds) {
  const n = Math.round(c.sampleRate * seconds);
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  return src;
}

// Every voice is built from two or three short one-shot nodes; nothing is kept alive between
// keypresses, so an idle card costs no CPU at all.
function play(kind, key) {
  const c = audio();
  const now = c.currentTime;
  const strength = key === 13 || key === 32 ? 1 : 0.82;

  if (kind === "mech") {
    const n = noise(c, 0.045);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400 + Math.random() * 900;
    bp.Q.value = 1.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.9 * strength, now);
    g.gain.exponentialRampToValueAtTime(0.02, now + 0.05);
    n.connect(bp).connect(g).connect(master);
    n.start(now);
    const thump = c.createOscillator();
    thump.type = "triangle";
    thump.frequency.setValueAtTime(190, now);
    thump.frequency.exponentialRampToValueAtTime(90, now + 0.05);
    const tg = c.createGain();
    tg.gain.setValueAtTime(0.28 * strength, now);
    tg.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
    thump.connect(tg).connect(master);
    thump.start(now);
    thump.stop(now + 0.07);
  } else if (kind === "type") {
    const n = noise(c, 0.09);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1600;
    const g = c.createGain();
    g.gain.setValueAtTime(0.75 * strength, now);
    g.gain.exponentialRampToValueAtTime(0.015, now + 0.085);
    n.connect(hp).connect(g).connect(master);
    n.start(now);
    const ping = c.createOscillator();
    ping.type = "square";
    ping.frequency.value = 2100 + Math.random() * 400;
    const pg = c.createGain();
    pg.gain.setValueAtTime(0.16 * strength, now);
    pg.gain.exponentialRampToValueAtTime(0.01, now + 0.03);
    ping.connect(pg).connect(master);
    ping.start(now);
    ping.stop(now + 0.04);
    if (key === 13) {
      const bell = c.createOscillator();
      bell.type = "sine";
      bell.frequency.value = 1180;
      const bg = c.createGain();
      bg.gain.setValueAtTime(0.35, now + 0.05);
      bg.gain.exponentialRampToValueAtTime(0.02, now + 0.42);
      bell.connect(bg).connect(master);
      bell.start(now + 0.05);
      bell.stop(now + 0.45);
    }
  } else if (kind === "wood") {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(420, now);
    o.frequency.exponentialRampToValueAtTime(240, now + 0.12);
    const g = c.createGain();
    g.gain.setValueAtTime(0.5 * strength, now);
    g.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + 0.18);
    const n = noise(c, 0.02);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.4 * strength, now);
    ng.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
    n.connect(lp).connect(ng).connect(master);
    n.start(now);
  } else {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(600 + Math.random() * 200, now);
    o.frequency.exponentialRampToValueAtTime(1300, now + 0.1);
    const g = c.createGain();
    g.gain.setValueAtTime(0.35 * strength, now);
    g.gain.exponentialRampToValueAtTime(0.02, now + 0.12);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + 0.13);
  }
}

const LABELS = { 8: "⌫", 9: "⇥", 13: "⏎", 27: "esc", 32: "space", 160: "⇧", 161: "⇧", 162: "ctrl", 164: "alt", 165: "alt", 37: "←", 38: "↑", 39: "→", 40: "↓", 20: "caps" };

function label(vk, scan) {
  if (LABELS[vk]) return LABELS[vk];
  if (vk >= 65 && vk <= 90) return String.fromCharCode(vk);
  if (vk >= 48 && vk <= 57) return String.fromCharCode(vk);
  if (vk >= 96 && vk <= 105) return String(vk - 96);
  if (vk >= 112 && vk <= 123) return "F" + (vk - 111);
  if (scan || vk) return "vk" + vk;
  return "·";
}

function hit(vk, scan, repeat) {
  taps++;
  $("taps").textContent = `${taps} ${t({ "zh-TW": "下", "zh-CN": "下", en: "taps" })}`;
  keyEl.textContent = label(vk, scan);
  keyEl.classList.add("hit");
  pulse.classList.add("on");
  setTimeout(() => keyEl.classList.remove("hit"), 90);
  setTimeout(() => pulse.classList.remove("on"), 120);
  play(repeat ? "mech" : opts.voice, vk);
}

function subscribe() {
  if (unsub) unsub();
  try {
    unsub = widget.input.subscribe({ keys: true, mouse: !opts.muteOnMouse, throttle: 8 }, (batch) => {
      if (!enabled) return;
      for (const k of batch.keys || []) {
        if (!k.down) {
          pressed.delete(k.vk);
          continue;
        }
        const repeat = pressed.has(k.vk);
        pressed.add(k.vk);
        hit(k.vk, k.scan, repeat);
      }
      if (!opts.muteOnMouse) {
        for (const m of batch.mouse || []) if (m.kind === "down") hit(-1, 0, false);
      }
    });
  } catch (e) {
    hint.textContent = String(e.message || e);
  }
}

function apply(settings) {
  opts = Object.assign(opts, settings || {});
  if (master) master.gain.value = (LEVEL[opts.volume] || 0.62) * 0.9;
  $("voice").textContent = t(VOICES[opts.voice] || VOICES.mech);
  subscribe();
}

$("test").textContent = t({ "zh-TW": "試一下", "zh-CN": "试一下", en: "Try it" });
$("toggle").textContent = t({ "zh-TW": "暫停", "zh-CN": "暂停", en: "Mute" });
$("test").addEventListener("click", () => {
  audio();
  hit(65, 0, false);
});
$("toggle").addEventListener("click", () => {
  enabled = !enabled;
  $("toggle").textContent = enabled
    ? t({ "zh-TW": "暫停", "zh-CN": "暂停", en: "Mute" })
    : t({ "zh-TW": "繼續", "zh-CN": "继续", en: "Resume" });
  $("toggle").classList.toggle("is-off", !enabled);
});

// Chromium keeps audio locked until the page has seen a gesture; one click unlocks it for good.
document.addEventListener("pointerdown", () => audio(), { once: true });
document.addEventListener("keydown", () => audio(), { once: true });

hint.textContent = t({ "zh-TW": "第一次先點一下卡片，聲音才會出來", "zh-CN": "第一次先点一下卡片，声音才会出来", en: "Tap the card once to unlock sound" });

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
