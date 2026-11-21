const t = widget.t;
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");

hint.textContent = t({ "zh-TW": "在卡片上滑動試試", "zh-CN": "在卡片上滑动试试", en: "Swipe across the card" });

let opts = { style: "ribbon", fade: "medium", burst: true };
let w = 0, h = 0, dpr = 1;
let pointer = null;
let trail = [];
let bursts = [];
let unsub = null;
let raf = 0;

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = Math.max(1, Math.round(rect.width));
  h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

const LIFE = { slow: 1.5, medium: 0.8, fast: 0.4 };

function push(x, y) {
  trail.push({ x, y, t: 0 });
  if (trail.length > 180) trail.shift();
}

function burst(x, y) {
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (Math.PI * 2 * i) / n + Math.random() * 0.3;
    const v = 40 + Math.random() * 90;
    bursts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.6 + Math.random() * 0.4 });
  }
}

function accent() {
  return getComputedStyle(document.documentElement).getPropertyValue("--w-accent").trim() || "#4cc9f0";
}

function step(dt) {
  const life = LIFE[opts.fade] || 0.8;
  for (const p of trail) p.t += dt;
  trail = trail.filter((p) => p.t < life);
  for (const b of bursts) {
    b.t += dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vx *= 0.92;
    b.vy *= 0.92;
  }
  bursts = bursts.filter((b) => b.t < b.life);
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  const col = accent();

  if (opts.style === "dust") {
    for (const p of trail) {
      const k = 1 - p.t / (LIFE[opts.fade] || 0.8);
      ctx.globalAlpha = Math.max(0, k) * 0.9;
      ctx.fillStyle = col;
      const r = 1.2 + k * 2.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (opts.style === "water") {
    for (const p of trail) {
      const k = 1 - p.t / (LIFE[opts.fade] || 0.8);
      if (k <= 0) continue;
      ctx.globalAlpha = k * 0.55;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 9 * k + 2);
      g.addColorStop(0, col);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9 * k + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Ribbon: the recent points are linked with a tapered stroke, so the shape reads as one
    // flowing line rather than a string of dots.
    if (trail.length > 1) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        const k = 1 - b.t / (LIFE[opts.fade] || 0.8);
        if (k <= 0) continue;
        ctx.globalAlpha = k * 0.75;
        ctx.strokeStyle = col;
        ctx.lineWidth = 1 + k * 6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const b of bursts) {
    const k = 1 - b.t / b.life;
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 1.5 + k * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  draw();
  raf = requestAnimationFrame(tick);
}

// ── where the cursor is ──────────────────────────────────────────────────────
// The hook reports physical pixels on the whole desktop; window.screenX/Y is the card's DIP
// origin, so dividing by devicePixelRatio puts both in the same frame of reference.
function localFromScreen(x, y) {
  return { x: x / dpr - (window.screenX || 0), y: y / dpr - (window.screenY || 0) };
}

function connect() {
  if (unsub) unsub();
  try {
    unsub = widget.input.subscribe({ keys: false, mouse: true, throttle: 12 }, (batch) => {
      for (const m of batch.mouse || []) {
        const p = localFromScreen(m.x, m.y);
        if (p.x < -40 || p.y < -40 || p.x > w + 40 || p.y > h + 40) continue;
        if (m.kind === "move") {
          push(p.x, p.y);
          hint.style.opacity = 0;
        } else if (m.kind === "down" && opts.burst) {
          burst(p.x, p.y);
        }
      }
    });
  } catch (e) {
    hint.textContent = String(e.message || e);
  }
}

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  push(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener("pointerdown", (e) => {
  if (!opts.burst) return;
  const r = canvas.getBoundingClientRect();
  burst(e.clientX - r.left, e.clientY - r.top);
});

function apply(s) {
  opts = Object.assign(opts, s || {});
}

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);

new ResizeObserver(resize).observe(canvas);
resize();
connect();
raf = requestAnimationFrame(tick);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
});
