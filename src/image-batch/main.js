const t = widget.t;
const count = document.getElementById("count");
const srcSize = document.getElementById("srcSize");
const outSize = document.getElementById("outSize");
const estimate = document.getElementById("estimate");
const before = document.getElementById("before");
const after = document.getElementById("after");
const bar = document.getElementById("bar");
const status = document.getElementById("status");
const runBtn = document.getElementById("run");
const toast = document.getElementById("toast");

let opts = { folder: "", width: 1600, format: "keep", quality: 82, sharpen: true };
let files = [];
let first = null;
let running = false;

runBtn.textContent = t({ "zh-TW": "開始處理", "zh-CN": "开始处理", en: "Process" });

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "bmp"];

function toastSay(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastSay.timer);
  toastSay.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function mimeFor(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "bmp") return "image/bmp";
  return "image/png";
}

function outputExt(name) {
  if (opts.format === "keep") return name.split(".").pop().toLowerCase();
  return opts.format === "jpeg" ? "jpg" : opts.format;
}

function encodable(ext) {
  // WebView2 can always encode PNG and JPEG; WebP encoding is also supported, but BMP is not.
  return ["png", "jpg", "jpeg", "webp"].includes(ext);
}

function pickOutputMime(ext) {
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

function sharpen(ctx, w, h) {
  if (!opts.sharpen || w * h > 6_000_000) return;
  const data = ctx.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(data.data);
  const out = data.data;
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            sum += src[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        out[i + c] = sum;
      }
    }
  }
  ctx.putImageData(data, 0, 0);
}

async function loadImage(name, base64) {
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`cannot decode ${name}`));
    el.src = `data:${mimeFor(name)};base64,${base64}`;
  });
}

function render(image, width) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((image.naturalHeight / image.naturalWidth) * width);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function inspect() {
  count.textContent = opts.folder
    ? t({ "zh-TW": "讀取中…", "zh-CN": "读取中…", en: "Reading…" })
    : t({ "zh-TW": "還沒選資料夾", "zh-CN": "还没选文件夹", en: "No folder yet" });
  if (!opts.folder) {
    runBtn.disabled = true;
    return;
  }
  try {
    const listing = await widget.files.list("folder", { recursive: false });
    files = (listing?.files || []).filter(
      (f) => !f.isDir && IMAGE_EXT.includes((f.ext || f.name.split(".").pop() || "").toLowerCase().replace(".", "")),
    );
    count.textContent = t({
      "zh-TW": `${files.length} 張圖片`,
      "zh-CN": `${files.length} 张图片`,
      en: `${files.length} image${files.length === 1 ? "" : "s"}`,
    });
    runBtn.disabled = !files.length;
    if (!files.length) {
      status.textContent = t({ "zh-TW": "這個資料夾沒有可處理的圖片", "zh-CN": "这个文件夹没有可处理的图片", en: "No images in this folder" });
      return;
    }
    first = files[0];
    const data = await widget.file.read(first.path);
    const image = await loadImage(first.name, data.base64);
    before.src = `data:${mimeFor(first.name)};base64,${data.base64}`;
    before.classList.add("loaded");
    const outCanvas = render(image, Math.min(opts.width, image.naturalWidth || opts.width));
    after.src = outCanvas.toDataURL("image/png");
    after.classList.add("loaded");

    srcSize.textContent = `${image.naturalWidth}×${image.naturalHeight}`;
    outSize.textContent = `${outCanvas.width}×${outCanvas.height} ${outputExt(first.name).toUpperCase()}`;
    const ratio = (outCanvas.width / image.naturalWidth) ** 2;
    const factor = opts.format === "png" ? 0.85 : 0.45;
    let bytes = 0;
    for (const f of files) bytes += (f.size || 0) * ratio * factor;
    estimate.textContent = `${(bytes / 1048576).toFixed(1)} MB`;
    status.textContent = first.name;
  } catch (e) {
    count.textContent = String(e.message || e);
    runBtn.disabled = true;
  }
}

async function convert(file) {
  const data = await widget.file.read(file.path);
  const image = await loadImage(file.name, data.base64);
  const width = Math.min(opts.width, image.naturalWidth || opts.width);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.max(1, Math.round((image.naturalHeight / image.naturalWidth) * width));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  sharpen(ctx, canvas.width, canvas.height);
  let ext = outputExt(file.name);
  if (!encodable(ext)) ext = "png";
  const mime = pickOutputMime(ext);
  return {
    name: `${file.name.replace(/\.\w+$/, "")}-${width}.${ext}`,
    path: file.path.replace(/[^\\/]+$/, `${file.name.replace(/\.\w+$/, "")}-${width}.${ext}`),
    data: canvas.toDataURL(mime, (opts.quality || 82) / 100),
  };
}

async function run() {
  if (running || !files.length) return;
  running = true;
  runBtn.disabled = true;
  let done = 0;
  let failed = 0;
  for (const file of files) {
    try {
      const out = await convert(file);
      await widget.file.write(out.path, out.data);
    } catch (e) {
      failed += 1;
      console.error(e);
    }
    done += 1;
    bar.style.width = `${Math.round((done / files.length) * 100)}%`;
    status.textContent = `${done}/${files.length} · ${file.name}`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  running = false;
  runBtn.disabled = false;
  toastSay(
    failed
      ? t({ "zh-TW": `完成 ${done - failed} 張，失敗 ${failed} 張`, "zh-CN": `完成 ${done - failed} 张，失败 ${failed} 张`, en: `${done - failed} done, ${failed} failed` })
      : t({ "zh-TW": `完成 ${done} 張`, "zh-CN": `完成 ${done} 张`, en: `${done} converted` }),
  );
  setTimeout(() => { bar.style.width = "0"; }, 1200);
}

function apply(s) {
  const folderChanged = s && s.folder !== undefined && s.folder !== opts.folder;
  opts = Object.assign(opts, s || {});
  if (folderChanged) inspect();
  else if (files.length) inspect();
}

runBtn.addEventListener("click", run);
apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
inspect();
