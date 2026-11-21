const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");
const t = widget.t;

hint.textContent = t({
  "zh-TW": "點一下，牠們會飛散",
  "zh-CN": "点一下，它们会飞散",
  en: "Tap and they scatter",
});

const PACE = { slow: 0.45, gentle: 1, busy: 2.1 };
const COLORS = ["#f7b267", "#f79d65", "#f4845f", "#f27059", "#8ecae6", "#9ad1d4", "#b8b8ff", "#ffd166"];

let opts = { count: 6, pace: "gentle", glow: true };
let bugs = [];
let w = 0, h = 0, dpr = 1;
let raf = 0;
let last = performance.now();

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = Math.max(1, Math.round(rect.width));
  h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!bugs.length) seed();
}

function seed() {
  const n = Number(opts.count) || 6;
  bugs = [];
  for (let i = 0; i < n; i++) bugs.push(makeBug(i));
}

function makeBug(i) {
  const s = 7 + Math.random() * 6;
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    a: Math.random() * Math.PI * 2,
    v: 9 + Math.random() * 7,
    size: s,
    color: COLORS[i % COLORS.length],
    phase: Math.random() * Math.PI * 2,
    flap: 7 + Math.random() * 5,
    seed: Math.random() * 100,
    kick: 0,
    kx: 0,
    ky: 0,
  };
}

function step(dt) {
  const pace = PACE[opts.pace] || 1;
  for (const b of bugs) {
    b.phase += dt * b.flap;
    // Slow drift: two sine waves at different rates read as "wandering" without any noise table.
    const wobble = Math.sin(performance.now() / 900 + b.seed) * 0.9 + Math.sin(performance.now() / 320 + b.seed * 2) * 0.45;
    b.a += wobble * dt * pace;
    const kick = b.kick;
    b.x += (Math.cos(b.a) * b.v * pace + b.kx) * dt + kick * Math.cos(b.a) * 18 * dt;
    b.y += (Math.sin(b.a) * b.v * pace + b.ky) * dt + kick * Math.sin(b.a) * 18 * dt;
    b.kx *= 0.94;
    b.ky *= 0.94;
    b.kick = Math.max(0, b.kick - dt * 1.6);

    // Bounce off the walls by turning inward; clamping alone would park them in the corners.
    const pad = b.size * 2.2;
    if (b.x < pad) { b.x = pad; b.a = Math.atan2(Math.sin(b.a), Math.abs(Math.cos(b.a))); }
    if (b.x > w - pad) { b.x = w - pad; b.a = Math.atan2(Math.sin(b.a), -Math.abs(Math.cos(b.a))); }
    if (b.y < pad) { b.y = pad; b.a = Math.atan2(Math.abs(Math.sin(b.a)), Math.cos(b.a)); }
    if (b.y > h - pad) { b.y = h - pad; b.a = Math.atan2(-Math.abs(Math.sin(b.a)), Math.cos(b.a)); }
  }
}

function wing(ctx2, b, side, flap) {
  const s = b.size;
  ctx2.beginPath();
  ctx2.moveTo(0, 0);
  ctx2.bezierCurveTo(side * s * 0.9 * flap, -s * 1.5, side * s * 2.2 * flap, -s * 0.9, side * s * 1.7 * flap, s * 0.1);
  ctx2.bezierCurveTo(side * s * 1.5 * flap, s * 0.9, side * s * 0.7 * flap, s * 0.8, 0, s * 0.15);
  ctx2.closePath();
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  for (const b of bugs) {
    const flap = 0.28 + Math.abs(Math.sin(b.phase)) * 0.72;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a + Math.PI / 2);
    if (opts.glow) {
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.72;

    wing(ctx, b, -1, flap);
    ctx.fill();
    wing(ctx, b, 1, flap);
    ctx.fill();

    // A lighter front wing each side keeps the silhouette from reading as one blob.
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#ffffff";
    ctx.save();
    ctx.scale(0.62, 0.62);
    wing(ctx, b, -1, flap);
    ctx.fill();
    wing(ctx, b, 1, flap);
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 0.9;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(24, 22, 30, 0.85)";
    ctx.beginPath();
    ctx.ellipse(0, 0, b.size * 0.16, b.size * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(dt);
  draw();
  raf = requestAnimationFrame(tick);
}

function scatter(x, y) {
  document.body.classList.add("is-touched");
  for (const b of bugs) {
    const dx = b.x - x, dy = b.y - y;
    const d = Math.hypot(dx, dy) || 1;
    const push = Math.max(0, 1 - d / 220);
    b.kx += (dx / d) * push * 190;
    b.ky += (dy / d) * push * 190;
    b.kick = Math.min(1, b.kick + push * 1.4);
  }
}

function apply(settings) {
  opts = Object.assign(opts, settings || {});
  if (bugs.length !== Number(opts.count)) seed();
}

canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  scatter(e.clientX - r.left, e.clientY - r.top);
});
canvas.addEventListener("pointermove", (e) => {
  if (e.buttons) {
    const r = canvas.getBoundingClientRect();
    scatter(e.clientX - r.left, e.clientY - r.top);
  }
});

if (widget.settings && widget.settings.onChange) widget.settings.onChange(apply);
apply(widget.settings ? widget.settings.get() : {});
new ResizeObserver(resize).observe(canvas);
resize();
raf = requestAnimationFrame(tick);

// Cards are hidden while the wallpaper layer is busy; pause instead of spinning on a hidden canvas.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
});
