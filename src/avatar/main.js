/* 丑丑头像：每次用当前种子画一张歪歪扭扭的脸。
 *
 * 全部程序化绘制，不用任何外部素材：头是一个带正弦扰动的椭圆，五官各自从几套画法里随机挑，
 * 歪斜程度由设置里的「歪斜程度」控制。复制时按「存图尺寸」重画一遍，不是把小球放大。 */

const t = widget.t;
const canvas = document.getElementById("face");
const stage = document.getElementById("stage");
const toastEl = document.getElementById("toast");

const SKIN = ["#f4cba8", "#eab790", "#f8dcbd", "#dca078", "#f1c4a2", "#c98f68", "#a9714f"];
const HAIR = ["#2c2a2b", "#3b2b20", "#6b4a2c", "#1f2028", "#5a4030", "#8a6242"];
const BACK = ["#f8e3d0", "#e4f1e9", "#e9e2f6", "#fce1e1", "#e0ebf7", "#f5e8ca", "#dfe7e2"];
const INK = "rgba(43, 36, 33, 0.62)";

let seed = Math.floor(Math.random() * 2147483647);

/** mulberry32：同一个种子必定画出同一张脸。 */
function mulberry32(a) {
  let s = a | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let tt = Math.imul(s ^ (s >>> 15), 1 | s);
    tt = (tt + Math.imul(tt ^ (tt >>> 7), 61 | tt)) ^ tt;
    return ((tt ^ (tt >>> 14)) >>> 0) / 4294967296;
  };
}

function render(ctx, S, seedVal) {
  const r = mulberry32(seedVal);
  const rnd = (a, b) => a + r() * (b - a);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const chance = (p) => r() < p;
  const jitter = (amount) => rnd(-amount, amount);

  const chaos = Math.max(0, Math.min(1, Number(widget.settings.get("chaos")) / 100));
  const backdrop = widget.settings.get("backdrop") !== false;

  const ink = INK;
  const line = (w) => {
    ctx.lineWidth = Math.max(1, w * (S / 512));
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  ctx.clearRect(0, 0, S, S);

  if (backdrop) {
    ctx.fillStyle = pick(BACK);
    ctx.fillRect(0, 0, S, S);
  }

  // ── 头 ───────────────────────────────────────────────────────────────
  const cx = S * 0.5 + jitter(S * 0.02 * chaos);
  const cy = S * 0.53 + jitter(S * 0.015 * chaos);
  const rx = S * 0.285 * (1 + jitter(0.05 * chaos));
  const ry = S * 0.305 * (1 + jitter(0.06 * chaos));
  const skin = pick(SKIN);
  const hair = pick(HAIR);
  const wob = 0.015 + chaos * 0.07;

  function headPath() {
    const p1 = rnd(0, 6.3);
    const p2 = rnd(0, 6.3);
    const p3 = rnd(0, 6.3);
    ctx.beginPath();
    for (let i = 0; i <= 72; i += 1) {
      const a = (i / 72) * Math.PI * 2;
      const k = 1 + wob * (Math.sin(a * 2 + p1) * 0.55 + Math.sin(a * 3 + p2) * 0.3 + Math.sin(a * 5 + p3) * 0.2);
      const x = cx + Math.cos(a) * rx * k;
      const y = cy + Math.sin(a) * ry * k;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  // 耳朵先画，压在头下面
  const earGap = rx * 0.94;
  const earR = S * rnd(0.042, 0.062);
  const earR2 = earR * (1 + jitter(0.35 * chaos));
  for (const [sx, er] of [[-1, earR], [1, earR2]]) {
    ctx.beginPath();
    ctx.ellipse(cx + sx * earGap, cy + jitter(S * 0.02), er * 0.62, er, 0, 0, Math.PI * 2);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + sx * earGap, cy + jitter(S * 0.02), er * 0.62, er, 0, 0, Math.PI * 2);
    line(2.5);
  }

  headPath();
  ctx.fillStyle = skin;
  ctx.fill();
  headPath();
  line(3.2);

  // ── 头发 ─────────────────────────────────────────────────────────────
  const hairStyle = Math.floor(r() * 5);
  ctx.fillStyle = hair;
  if (hairStyle === 0) {
    // 三根呆毛
    for (let i = 0; i < 3; i += 1) {
      const x0 = cx + rnd(-0.5, 0.5) * rx;
      const y0 = cy - ry * 0.95;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + jitter(S * 0.02), y0 - S * 0.06, x0 + jitter(S * 0.05), y0 - S * 0.1);
      line(3);
      ctx.beginPath();
      ctx.arc(x0 + jitter(S * 0.05), y0 - S * 0.1, S * 0.012, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hairStyle === 1) {
    // 锅盖
    ctx.beginPath();
    ctx.ellipse(cx, cy - ry * 0.1, rx * 1.02, ry * 0.92, 0, Math.PI * 1.02, Math.PI * 1.98);
    ctx.fill();
  } else if (hairStyle === 2) {
    // 大背头
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.95, cy - ry * 0.25);
    ctx.bezierCurveTo(cx - rx * 0.6, cy - ry * 1.35, cx + rx * 0.7, cy - ry * 1.3, cx + rx * 0.98, cy - ry * 0.2);
    ctx.lineTo(cx + rx * 0.98, cy - ry * 0.05);
    ctx.bezierCurveTo(cx + rx * 0.2, cy - ry * 0.8, cx - rx * 0.5, cy - ry * 0.8, cx - rx * 0.95, cy - ry * 0.05);
    ctx.closePath();
    ctx.fill();
  } else if (hairStyle === 3) {
    // 卷毛
    for (let i = 0; i < 7; i += 1) {
      const a = Math.PI * (1.02 + i * 0.13);
      if (a > Math.PI * 1.98) break;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rx * 0.92, cy + Math.sin(a) * ry * 0.95, S * rnd(0.035, 0.06), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (hairStyle === 4 && chance(0.75)) {
    // 刘海一角
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.98, cy - ry * 0.15);
    ctx.quadraticCurveTo(cx - rx * 0.5, cy - ry * 1.5, cx + rx * 0.2, cy - ry * 0.95);
    ctx.quadraticCurveTo(cx - rx * 0.1, cy - ry * 0.6, cx + rx * 0.1, cy - ry * 0.3);
    ctx.closePath();
    ctx.fill();
  }

  // ── 眼睛 ─────────────────────────────────────────────────────────────
  const eyeY = cy - ry * 0.12 + jitter(S * 0.02 * chaos);
  const eyeDx = rx * 0.42;
  const eyeR = S * rnd(0.052, 0.072);
  const eyeStyle = Math.floor(r() * 5);

  for (const sx of [-1, 1]) {
    const ex = cx + sx * eyeDx + jitter(S * 0.02 * chaos);
    const ey = eyeY + jitter(S * 0.035 * chaos) * (sx > 0 ? 1 : -1);
    const er = eyeR * (1 + (sx > 0 ? 1 : -1) * jitter(0.45 * chaos));

    if (eyeStyle === 0 || eyeStyle === 1) {
      // 眼白 + 瞳孔
      ctx.beginPath();
      ctx.ellipse(ex, ey, er * 1.05, er * 0.92, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 252, 246, 0.96)";
      ctx.fill();
      line(2.2);
      const pr = er * rnd(0.42, 0.62);
      const px = ex + jitter(er * 0.5);
      const py = ey + jitter(er * 0.35);
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = "#241d1a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + pr * 0.35, py - pr * 0.4, pr * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
    } else if (eyeStyle === 2) {
      // 两个点
      ctx.beginPath();
      ctx.arc(ex, ey, er * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = "#241d1a";
      ctx.fill();
    } else if (eyeStyle === 3) {
      // 眯成一条缝
      ctx.beginPath();
      ctx.moveTo(ex - er, ey);
      ctx.quadraticCurveTo(ex, ey - er * 0.6, ex + er, ey);
      line(3);
    } else {
      // 闭眼 + 睫毛
      ctx.beginPath();
      ctx.arc(ex, ey - er * 0.2, er * 0.9, Math.PI * 0.12, Math.PI * 0.88);
      line(3);
    }
  }

  // ── 眉毛 ─────────────────────────────────────────────────────────────
  if (chance(0.82)) {
    ctx.strokeStyle = hair;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, S * rnd(0.012, 0.022));
    for (const sx of [-1, 1]) {
      const bx = cx + sx * eyeDx + jitter(S * 0.015);
      const by = eyeY - S * 0.105 + jitter(S * 0.03 * chaos);
      const bl = S * rnd(0.06, 0.1);
      ctx.beginPath();
      ctx.moveTo(bx - bl, by + jitter(S * 0.02 * chaos));
      ctx.quadraticCurveTo(bx, by - S * rnd(0.01, 0.035), bx + bl, by + jitter(S * 0.02 * chaos));
      ctx.stroke();
    }
  }

  // ── 鼻子 ─────────────────────────────────────────────────────────────
  const noseY = eyeY + ry * 0.3;
  const noseStyle = Math.floor(r() * 3);
  if (noseStyle === 0) {
    ctx.beginPath();
    ctx.arc(cx + jitter(S * 0.01), noseY, S * 0.014, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(70, 50, 40, 0.55)";
    ctx.fill();
  } else if (noseStyle === 1) {
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.012, noseY - S * 0.03);
    ctx.quadraticCurveTo(cx + S * 0.03, noseY, cx - S * 0.005, noseY + S * 0.012);
    line(2.4);
  } else {
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.02, noseY);
    ctx.lineTo(cx + S * 0.02, noseY - S * 0.005);
    ctx.lineTo(cx, noseY + S * 0.028);
    ctx.closePath();
    ctx.fillStyle = "rgba(120, 80, 62, 0.5)";
    ctx.fill();
  }

  // ── 嘴 ───────────────────────────────────────────────────────────────
  const mouthY = cy + ry * 0.42 + jitter(S * 0.02 * chaos);
  const mouthW = rx * rnd(0.34, 0.55) * (1 + jitter(0.15 * chaos));
  const mouthStyle = Math.floor(r() * 6);

  if (mouthStyle === 0) {
    // 抿嘴一笑
    ctx.beginPath();
    ctx.moveTo(cx - mouthW, mouthY - S * 0.005);
    ctx.quadraticCurveTo(cx, mouthY + S * 0.045, cx + mouthW, mouthY - S * 0.012 + jitter(S * 0.01));
    line(3);
  } else if (mouthStyle === 1) {
    // 咧嘴大笑
    ctx.beginPath();
    ctx.moveTo(cx - mouthW, mouthY);
    ctx.quadraticCurveTo(cx, mouthY + mouthW * 0.9, cx + mouthW, mouthY);
    ctx.closePath();
    ctx.fillStyle = "rgba(120, 40, 44, 0.9)";
    ctx.fill();
    line(2.4);
    ctx.beginPath();
    ctx.moveTo(cx - mouthW * 0.92, mouthY + S * 0.012);
    ctx.lineTo(cx + mouthW * 0.92, mouthY + S * 0.012);
    ctx.fillStyle = "rgba(255, 250, 240, 0.92)";
    ctx.fillRect(cx - mouthW * 0.9, mouthY + S * 0.006, mouthW * 1.8, S * 0.016);
  } else if (mouthStyle === 2) {
    // 波浪嘴
    ctx.beginPath();
    const segs = 5;
    for (let i = 0; i <= segs; i += 1) {
      const x = cx - mouthW + (mouthW * 2 * i) / segs;
      const y = mouthY + (i % 2 ? -1 : 1) * S * 0.016;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    line(3);
  } else if (mouthStyle === 3) {
    // 小圆嘴：惊到了
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + S * 0.01, mouthW * 0.28, mouthW * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(120, 40, 44, 0.85)";
    ctx.fill();
    line(2.2);
  } else if (mouthStyle === 4) {
    // 吐舌头
    ctx.beginPath();
    ctx.moveTo(cx - mouthW * 0.7, mouthY);
    ctx.quadraticCurveTo(cx, mouthY + S * 0.05, cx + mouthW * 0.7, mouthY);
    ctx.closePath();
    ctx.fillStyle = "rgba(120, 40, 44, 0.85)";
    ctx.fill();
    line(2.2);
    ctx.beginPath();
    ctx.ellipse(cx + jitter(S * 0.02), mouthY + S * 0.045, mouthW * 0.3, mouthW * 0.4, 0, 0, Math.PI);
    ctx.fillStyle = "rgba(230, 130, 140, 0.95)";
    ctx.fill();
  } else {
    // 歪嘴
    ctx.beginPath();
    ctx.moveTo(cx - mouthW, mouthY + S * 0.01);
    ctx.quadraticCurveTo(cx, mouthY - S * 0.02, cx + mouthW, mouthY + S * 0.03 + jitter(S * 0.03));
    line(3);
  }

  // ── 腮红、痣、眼镜之类 ───────────────────────────────────────────
  if (chance(0.62)) {
    ctx.fillStyle = "rgba(232, 122, 122, 0.22)";
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sx * rx * 0.62, noseY + ry * 0.12, S * rnd(0.03, 0.045), S * rnd(0.02, 0.03), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (chance(0.3)) {
    ctx.beginPath();
    ctx.arc(cx + rx * rnd(0.35, 0.6) * (chance(0.5) ? 1 : -1), noseY + ry * rnd(0.15, 0.3), S * 0.008, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(50, 38, 32, 0.85)";
    ctx.fill();
  }

  if (chance(0.16)) {
    // 眼镜
    ctx.strokeStyle = "rgba(40, 34, 30, 0.85)";
    ctx.lineWidth = Math.max(2, S * 0.009);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + sx * eyeDx, eyeY, S * 0.078, S * 0.062, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - eyeDx + S * 0.078, eyeY - S * 0.006);
    ctx.lineTo(cx + eyeDx - S * 0.078, eyeY - S * 0.006);
    ctx.stroke();
  }

  if (chance(0.14)) {
    // 一颗痘
    ctx.beginPath();
    ctx.arc(cx + rx * rnd(-0.4, 0.4), cy + ry * rnd(-0.35, 0.2), S * 0.013, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(214, 78, 78, 0.8)";
    ctx.fill();
  }

  if (chance(0.1)) {
    // 创可贴
    const bx = cx + rx * 0.55;
    const by = noseY + ry * 0.1;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(jitter(0.5));
    ctx.fillStyle = "rgba(246, 222, 196, 0.95)";
    ctx.fillRect(-S * 0.055, -S * 0.016, S * 0.11, S * 0.032);
    ctx.strokeStyle = "rgba(180, 150, 120, 0.7)";
    ctx.lineWidth = Math.max(1, S * 0.004);
    ctx.strokeRect(-S * 0.055, -S * 0.016, S * 0.11, S * 0.032);
    ctx.restore();
  }

  if (chance(0.12)) {
    // 八字胡
    ctx.strokeStyle = hair;
    ctx.lineWidth = Math.max(2, S * 0.012);
    const my = mouthY - S * 0.035;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx, my);
      ctx.quadraticCurveTo(cx + sx * S * 0.035, my - S * 0.008, cx + sx * S * 0.06, my + S * 0.018);
      ctx.stroke();
    }
  }
}

function roll() {
  seed = Math.floor(Math.random() * 2147483647);
  const ctx = canvas.getContext("2d");
  render(ctx, 512, seed);
}

function exportImage() {
  const side = Number(widget.settings.get("sharp")) || 512;
  const off = document.createElement("canvas");
  off.width = side;
  off.height = side;
  render(off.getContext("2d"), side, seed);
  return off.toDataURL("image/png");
}

document.getElementById("roll").textContent = t({ "zh-TW": "換一張", "zh-CN": "换一张", en: "Another" });
document.getElementById("copy").textContent = t({ "zh-TW": "存圖", "zh-CN": "存图", en: "Copy" });

document.getElementById("roll").onclick = roll;
document.getElementById("copy").onclick = () => {
  widget.clipboard.writeImage(exportImage()).then((ok) => {
    widget.util.toast(toastEl, ok === false
      ? t({ "zh-TW": "剪貼簿被佔用了", "zh-CN": "剪贴板被占用了", en: "Clipboard is busy" })
      : t({ "zh-TW": "已複製", "zh-CN": "已复制", en: "Copied" }), 1400);
  }).catch((e) => widget.util.toast(toastEl, e.message, 2000));
};

widget.on("summon", roll);
widget.settings.onChange(() => roll());

roll();
