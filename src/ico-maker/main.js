// ico-maker: pick a picture, redraw it at every icon size, pack the results into a real .ico.
// The host gives us the file bytes (file.read) and takes the finished bytes back (file.write);
// nothing here runs an external converter.

const t = widget.t;
const SIZE_SETS = {
  all: [16, 24, 32, 48, 64, 128, 256],
  web: [16, 32, 48],
  desktop: [32, 48, 64, 128, 256],
  single: [256],
};
const MIME = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", webp: "image/webp", gif: "image/gif", bmp: "image/bmp", avif: "image/avif", ico: "image/x-icon" };

const pickBtn = document.getElementById("pick");
const nameEl = document.getElementById("name");
const stage = document.getElementById("stage");
const source = document.getElementById("source");
const empty = document.getElementById("empty");
const hint = document.getElementById("hint");
const sizesEl = document.getElementById("sizes");
const makeBtn = document.getElementById("make");
const statusEl = document.getElementById("status");

const state = {
  path: "",
  image: null, // <img> with the decoded picture
  url: "", // the blob URL behind state.image
  sizes: [],
  padding: 6,
  busy: false,
};

/** settings → the sizes we will write and the padding around each one. */
function applySettings(s) {
  const set = SIZE_SETS[s.set] || SIZE_SETS.all;
  state.sizes = set;
  state.padding = Number(s.padding ?? 6);
  paintSizes();
}

function setStatus(text, bad) {
  statusEl.textContent = text || "";
  statusEl.classList.toggle("bad", !!bad);
}

function base64Bytes(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function bytesBase64(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** The picture drawn into a square canvas of `size` px, keeping its aspect and the padding. */
function squareCanvas(size, image) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  const pad = Math.round(size * (state.padding / 100));
  const room = Math.max(1, size - pad * 2);
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  const scale = Math.min(room / w, room / h);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  ctx.drawImage(image, Math.round((size - dw) / 2), Math.round((size - dh) / 2), dw, dh);
  return canvas;
}

function paintSizes() {
  sizesEl.textContent = "";
  if (!state.image) return;
  for (const size of state.sizes) {
    const canvas = squareCanvas(size, state.image);
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.title = `${size}×${size}`;
    const label = document.createElement("span");
    label.textContent = String(size);
    cell.append(canvas, label);
    sizesEl.append(cell);
  }
}

// ── the .ico writer ─────────────────────────────────────────────────────────────
// Two payload kinds: 32-bit BGRA bitmaps for 16–128 (what every Windows version reads) and a PNG
// for 256 (the format Windows itself writes for the largest entry).

function writeU16(buf, at, value) {
  buf[at] = value & 0xff;
  buf[at + 1] = (value >> 8) & 0xff;
}

function writeU32(buf, at, value) {
  buf[at] = value & 0xff;
  buf[at + 1] = (value >>> 8) & 0xff;
  buf[at + 2] = (value >>> 16) & 0xff;
  buf[at + 3] = (value >>> 24) & 0xff;
}

function bmpPayload(image, size) {
  const canvas = squareCanvas(size, image);
  const pixels = canvas.getContext("2d").getImageData(0, 0, size, size).data;
  const maskRow = Math.ceil(size / 32) * 4;
  const total = 40 + size * size * 4 + maskRow * size;
  const out = new Uint8Array(total);
  writeU32(out, 0, 40); // header size
  writeU32(out, 4, size); // width
  writeU32(out, 8, size * 2); // height: the XOR bitmap plus the AND mask
  writeU16(out, 12, 1); // planes
  writeU16(out, 14, 32); // bits per pixel
  writeU32(out, 20, size * size * 4 + maskRow * size); // image size
  let at = 40;
  for (let y = size - 1; y >= 0; y -= 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      out[at] = pixels[i + 2]; // blue
      out[at + 1] = pixels[i + 1]; // green
      out[at + 2] = pixels[i]; // red
      out[at + 3] = pixels[i + 3]; // alpha
      at += 4;
    }
  }
  // The AND mask stays all zero: the alpha channel decides the shape, and Windows prefers that.
  return out;
}

function pngPayload(image, size) {
  const url = squareCanvas(size, image).toDataURL("image/png");
  return base64Bytes(url.split(",")[1] || "");
}

/** header (6) + one 16-byte directory entry per image + the payloads, 4-byte aligned. */
function assembleIco(entries) {
  const header = 6;
  const dirSize = entries.length * 16;
  let offset = header + dirSize;
  const offsets = entries.map((entry) => {
    const at = offset;
    offset += entry.data.length;
    if (offset % 4) offset += 4 - (offset % 4);
    return at;
  });
  const out = new Uint8Array(offset);
  writeU16(out, 0, 0); // reserved
  writeU16(out, 2, 1); // 1 = icon
  writeU16(out, 4, entries.length);
  entries.forEach((entry, i) => {
    const at = header + i * 16;
    out[at] = entry.size >= 256 ? 0 : entry.size; // 0 means 256
    out[at + 1] = entry.size >= 256 ? 0 : entry.size;
    out[at + 2] = 0; // palette colours
    out[at + 3] = 0; // reserved
    writeU16(out, at + 4, 1); // planes
    writeU16(out, at + 6, 32); // bits per pixel
    writeU32(out, at + 8, entry.data.length);
    writeU32(out, at + 12, offsets[i]);
    out.set(entry.data, offsets[i]);
  });
  return out;
}

// ── picking a picture ────────────────────────────────────────────────────────────

async function choose() {
  if (state.busy) return;
  const path = await widget.shell.pick({
    type: "file",
    filter: "images",
    title: t({ "zh-TW": "選一張圖", "zh-CN": "选一张图", en: "Pick a picture" }),
  });
  if (!path) return;
  load(path).catch((e) => setStatus(e.message, true));
}

async function load(path) {
  state.busy = true;
  makeBtn.disabled = true;
  setStatus(t({ "zh-TW": "讀取中…", "zh-CN": "读取中…", en: "Reading…" }));
  try {
    const info = await widget.file.info(path);
    const ext = (info.ext || "").toLowerCase();
    if (info.size > 40 * 1024 * 1024) throw new Error(t({ "zh-TW": "圖太大（超過 40 MB）", "zh-CN": "图太大（超过 40 MB）", en: "That picture is over 40 MB" }));
    const { base64 } = await widget.file.read(path);
    const type = MIME[ext] || "application/octet-stream";
    const blob = new Blob([base64Bytes(base64)], { type });
    const url = URL.createObjectURL(blob);
    const image = await decode(url);
    if (state.url) URL.revokeObjectURL(state.url);
    state.path = path;
    state.url = url;
    state.image = image;
    source.src = url;
    source.hidden = false;
    empty.hidden = true;
    nameEl.textContent = `${info.name} · ${info.width ?? image.naturalWidth}×${image.naturalHeight}`;
    nameEl.title = path;
    makeBtn.disabled = false;
    paintSizes();
    setStatus("");
  } finally {
    state.busy = false;
  }
}

/** Decoding can fail for a format the WebView cannot read, so the failure is spelled out. */
function decode(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error(t({ "zh-TW": "這個格式瀏覽器解不開，換張 PNG 或 JPG", "zh-CN": "这个格式浏览器解不开，换张 PNG 或 JPG", en: "The WebView cannot decode that format — try PNG or JPG" })));
    image.src = url;
  });
}

// ── writing the .ico ────────────────────────────────────────────────────────────

async function make() {
  if (state.busy || !state.image) return;
  state.busy = true;
  makeBtn.disabled = true;
  try {
    setStatus(t({ "zh-TW": "打包中…", "zh-CN": "打包中…", en: "Packing…" }));
    const entries = state.sizes.map((size) => ({
      size,
      data: size >= 256 ? pngPayload(state.image, size) : bmpPayload(state.image, size),
    }));
    const bytes = assembleIco(entries);
    const suggested = (state.path.split(/[\\/]/).pop() || "icon").replace(/\.\w+$/, "") + ".ico";
    const target = await widget.shell.save({
      title: t({ "zh-TW": "存成 .ico", "zh-CN": "存成 .ico", en: "Save as .ico" }),
      name: suggested,
      filter: "all",
    });
    if (!target) {
      setStatus("");
      return;
    }    const saved = await widget.file.write(target, { base64: bytesBase64(bytes) });
    setStatus(
      t({
        "zh-TW": `已存 ${entries.length} 個尺寸 · ${(saved.size / 1024).toFixed(1)} KB`,
        "zh-CN": `已存 ${entries.length} 个尺寸 · ${(saved.size / 1024).toFixed(1)} KB`,
        en: `Saved ${entries.length} sizes · ${(saved.size / 1024).toFixed(1)} KB`,
      })
    );
    nameEl.textContent = saved.name;
    nameEl.title = saved.path;
    // A second action on the finished file is the point of the card: show it in its folder.
    statusEl.onclick = () => widget.shell.reveal(saved.path).catch(() => {});
    statusEl.classList.add("link");
    statusEl.title = t({ "zh-TW": "在資料夾裏顯示", "zh-CN": "在文件夹里显示", en: "Show it in its folder" });
  } catch (e) {
    setStatus(e.message, true);
  } finally {
    state.busy = false;
    makeBtn.disabled = !state.image;
  }
}

// ── wiring ──────────────────────────────────────────────────────────────────────

pickBtn.addEventListener("click", () => choose());
makeBtn.addEventListener("click", () => make());
stage.addEventListener("click", (e) => {
  if (!state.path || e.target.closest("#source")) return;
  choose();
});

hint.textContent = t({ "zh-TW": "點上面選一張圖", "zh-CN": "点上面选一张图", en: "Pick a picture above" });
makeBtn.textContent = t({ "zh-TW": "生成 .ico", "zh-CN": "生成 .ico", en: "Make the .ico" });
pickBtn.textContent = t({ "zh-TW": "選圖", "zh-CN": "选图", en: "Pick" });
nameEl.textContent = t({ "zh-TW": "還沒有圖", "zh-CN": "还没有图", en: "No picture yet" });

applySettings(widget.settings.get());
widget.settings.onChange(applySettings);
