const t = widget.t;
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const hint = document.getElementById("hint");

hint.textContent = t({ "zh-TW": "點他一下，他會掉下去", "zh-CN": "点他一下，他会掉下去", en: "Tap him and he drops" });

let opts = { size: "m", follow: true, web: true };
const RADIUS = { s: 15, m: 21, l: 30 };
const G = 1500;
const THREAD = 70;

let w = 0, h = 0, dpr = 1;
let me = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, va: 0, hang: 0, dropping: false, phase: 0 };
let target = null;
let raf = 0;let unsub = null;

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = Math.max(1, Math.round(rect.width));
  h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!me.x) {
    me.x = w * 0.5;
    me.hang = h * 0.32;
  }
}

function reset() {
  me.dropping = false;
  me.vy = 0;
  me.vx = 0;
  me.va = 0;
  me.hang = Math.min(me.hang, h * 0.32);
  target = null;
}

function step(dt) {
  me.phase += dt * 3;

  if (target && opts.follow) {
    // The thread is a pendulum: the pivot stays put, so pulling the anchor sideways adds a
    // little angular velocity instead of teleporting him.
    const dx = target.x - me.x;
    me.va += dx * 0.9 * dt;
  }

  if (me.dropping) {
    me.vy += G * dt;
    me.hang += me.vy * dt;
    const floor = h - RADIUS[opts.size] - 6;
    if (me.hang > floor) {
      me.hang = floor;
      me.vy = 0;
      setTimeout(() => {
        me.hang = h * 0.32;
        me.dropping = false;
        me.vy = 0;
      }, 700);
      me.dropping = false;
    }
  } else {
    me.va *= 0.94;
    me.angle += me.va * dt;
    me.angle = Math.max(-0.7, Math.min(0.7, me.angle));
    me.va -= me.angle * 3.2 * dt; // spring back to vertical
    me.x = Math.max(RADIUS[opts.size] + 6, Math.min(w - RADIUS[opts.size] - 6, me.x + me.vx * dt));
    me.vx += Math.sin(me.angle) * -220 * dt * 0.16;
  }
}

function body() {
  return { x: me.x + Math.sin(me.angle) * me.hang, y: me.hang * Math.cos(me.angle) };
}

function webLine(b) {
  if (!opts.web) return;
  const R = RADIUS[opts.size];
  const th = me.angle * 0.55;
  // the grip sits at the local top of the figure, so it has to be rotated with him
  const gx = b.x + Math.sin(th) * R * 1.24;
  const gy = b.y - Math.cos(th) * R * 1.24;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.30)";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(me.x, 0);
  ctx.lineTo(gx, gy);
  ctx.stroke();
}

function figure(b) {
  const R = RADIUS[opts.size];
  const red = "#c1121f";
  const navy = "#1d3557";
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(me.angle * 0.55);

  // legs: two bent limbs, swinging with the phase
  ctx.strokeStyle = navy;
  ctx.lineCap = "round";
  ctx.lineWidth = R * 0.24;
  ctx.beginPath();
  ctx.moveTo(-R * 0.18, R * 0.62);
  ctx.lineTo(-R * 0.5 - Math.sin(me.phase) * R * 0.12, R * 1.1);
  ctx.moveTo(R * 0.18, R * 0.62);
  ctx.lineTo(R * 0.5 + Math.sin(me.phase) * R * 0.12, R * 1.06);
  ctx.stroke();

  // arms: shoulder, elbow held wide, both hands gripping the thread above the head
  ctx.strokeStyle = red;
  ctx.lineWidth = R * 0.2;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(s * R * 0.36, -R * 0.02);
    ctx.quadraticCurveTo(s * R * 0.8, -R * 0.58, s * R * 0.14, -R * 1.24);
  }
  ctx.stroke();

  // torso: red suit tapering to the hips
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.moveTo(-R * 0.34, -R * 0.1);
  ctx.quadraticCurveTo(-R * 0.44, R * 0.4, -R * 0.24, R * 0.72);
  ctx.quadraticCurveTo(0, R * 0.82, R * 0.24, R * 0.72);
  ctx.quadraticCurveTo(R * 0.44, R * 0.4, R * 0.34, -R * 0.1);
  ctx.fill();

  // head: a round mask sitting on the shoulders
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.34, R * 0.36, R * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // suit seams: faint web lines on the torso only
  ctx.strokeStyle = "rgba(10, 12, 18, 0.4)";
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(0, R * 0.62);
    ctx.lineTo(i * R * 0.26, R * 0.02);
    ctx.stroke();
  }

  // eyes: two big white teardrops, the readable part at small sizes
  ctx.fillStyle = "#f7f8fb";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * R * 0.16, -R * 0.36, R * 0.16, R * 0.13, s * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, w, h);
  const b = body();
  webLine(b);
  figure(b);
}

let lastFrame = performance.now();
function tick(now) {
  const dt = Math.min(0.04, (now - lastFrame) / 1000);
  lastFrame = now;
  step(dt);
  draw();
  raf = requestAnimationFrame(tick);
}

function localFromScreen(x, y) {
  return { x: x / dpr - (window.screenX || 0), y: y / dpr - (window.screenY || 0) };
}

function connect() {
  if (unsub) unsub();
  try {
    unsub = widget.input.subscribe({ keys: false, mouse: true, throttle: 20 }, (batch) => {
      for (const m of batch.mouse || []) {
        if (m.kind !== "move") continue;
        const p = localFromScreen(m.x, m.y);
        if (p.x < -60 || p.y < -60 || p.x > w + 60 || p.y > h + 60) continue;
        target = p;
      }
    });
  } catch (e) {
    hint.textContent = String(e.message || e);
  }
}

canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  target = { x: e.clientX - r.left, y: e.clientY - r.top };
});
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  const R = RADIUS[opts.size];
  const b = body();
  if (Math.hypot(x - b.x, y - b.y) < R * 1.9 && !me.dropping) {
    me.dropping = true;
    me.vy = 60;
  }
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

widget.on("resize", () => reset());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    cancelAnimationFrame(raf);
    raf = 0;
  } else if (!raf) {
    lastFrame = performance.now();
    raf = requestAnimationFrame(tick);
  }
});
