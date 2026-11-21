const t = widget.t;
const preview = document.getElementById("preview");
const mark = document.getElementById("mark");
const empty = document.getElementById("empty");
const count = document.getElementById("count");
const runBtn = document.getElementById("run");
const bar = document.getElementById("bar");
const status = document.getElementById("status");
const toast = document.getElementById("toast");

let opts = { folder: "", text: "WinWidget", pos: "br", opacity: 45, scale: 4, color: "#ffffff" };
let files = [];
let running = false;

const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "bmp", "gif"];
const MAX_PER_RUN = 60;

runBtn.textContent = t({ "zh-TW": "開始加水印", "zh-CN": "开始加水印", en: "Apply watermark" });
empty.textContent = t({ "zh-TW": "選擇文件夾後顯示預覽", "zh-CN": "选择文件夹后显示预览", en: "Pick a folder to see a preview" });

function mimeFor(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "bmp") return "image/bmp";
  return "image/png";
}

function toastSay(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastSay.timer);
  toastSay.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function paintMark() {
  mark.hidden = !opts.text;
  mark.textContent = opts.text;
  mark.className = `mark ${opts.pos}`;
  mark.style.color = opts.color;
  mark.style.opacity = String((opts.opacity || 45) / 100);
  const shortSide = Math.min(preview.clientWidth || 1, preview.clientHeight || 1);
  mark.style.fontSize = `${Math.max(9, Math.round(shortSide * (opts.scale || 4) / 100))}px`;
}

function dataUrl(name, base64) {
  return `data:${mimeFor(name)};base64,${base64}`;
}

async function loadPreview() {
  if (!opts.folder) {
    count.textContent = t({ "zh-TW": "還沒選資料夾", "zh-CN": "还没选文件夹", en: "No folder yet" });
    empty.hidden = false;
    preview.classList.remove("loaded");
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
      empty.hidden = false;
      preview.classList.remove("loaded");
      return;
    }
    const first = files[0];
    const data = await widget.file.read(first.path);
    preview.src = dataUrl(first.name, data.base64);
    preview.classList.add("loaded");
    empty.hidden = true;
    requestAnimationFrame(() => {
      paintMark();
      status.textContent = first.name;
    });
  } catch (e) {
    count.textContent = String(e.message || e);
    runBtn.disabled = true;
  }
}

/** Stamps one image at full resolution and hands back a data URL. */
async function stamp(file) {
  const data = await widget.file.read(file.path);
  const source = dataUrl(file.name, data.base64);
  const image = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error(`cannot decode ${file.name}`));
    el.src = source;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);

  const size = Math.max(12, Math.round(Math.min(canvas.width, canvas.height) * (opts.scale || 4) / 100));
  ctx.font = `600 ${size}px "Segoe UI", system-ui, sans-serif`;
  ctx.globalAlpha = Math.max(0.1, Math.min(1, (opts.opacity || 45) / 100));
  ctx.fillStyle = opts.color || "#ffffff";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = Math.max(1, size / 12);
  ctx.shadowOffsetY = 1;

  const pad = Math.round(size * 0.6);
  const metrics = ctx.measureText(opts.text);
  const w = metrics.width;
  const h = size;
  let x = pad;
  let y = pad + h;
  if (opts.pos.includes("r")) x = canvas.width - pad - w;
  if (opts.pos.includes("b") || opts.pos === "center") y = canvas.height - pad;
  if (opts.pos === "center") {
    x = (canvas.width - w) / 2;
    y = canvas.height / 2 + h / 2;
  }
  ctx.fillText(opts.text, x, y);

  const ext = file.name.split(".").pop().toLowerCase();
  const isJpeg = ext === "jpg" || ext === "jpeg";
  return {
    path: file.path.replace(/\.(\w+)$/, `-watermarked.$1`),
    data: canvas.toDataURL(isJpeg ? "image/jpeg" : "image/png", isJpeg ? 0.92 : undefined),
  };
}

async function run() {
  if (running || !files.length) return;
  running = true;
  runBtn.disabled = true;
  const batch = files.slice(0, MAX_PER_RUN);
  let done = 0;
  let failed = 0;
  for (const file of batch) {
    try {
      const out = await stamp(file);
      await widget.file.write(out.path, out.data);
    } catch (e) {
      failed += 1;
      console.error(e);
    }
    done += 1;
    bar.style.width = `${Math.round((done / batch.length) * 100)}%`;
    status.textContent = `${done}/${batch.length} · ${file.name}`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  running = false;
  runBtn.disabled = files.length === 0;
  const tail = files.length > MAX_PER_RUN
    ? t({ "zh-TW": `（本次只處理前 ${MAX_PER_RUN} 張）`, "zh-CN": `（本次只处理前 ${MAX_PER_RUN} 张）`, en: ` (first ${MAX_PER_RUN} only)` })
    : "";
  toastSay(
    failed
      ? t({ "zh-TW": `完成 ${done - failed} 張，失敗 ${failed} 張${tail}`, "zh-CN": `完成 ${done - failed} 张，失败 ${failed} 张${tail}`, en: `${done - failed} done, ${failed} failed${tail}` })
      : t({ "zh-TW": `完成 ${done} 張${tail}`, "zh-CN": `完成 ${done} 张${tail}`, en: `${done} stamped${tail}` }),
  );
  setTimeout(() => { bar.style.width = "0"; }, 1200);
}

function apply(s) {
  const before = opts.folder;
  opts = Object.assign(opts, s || {});
  paintMark();
  if (opts.folder !== before) loadPreview();
  else if (!files.length) loadPreview();
}

runBtn.addEventListener("click", run);
window.addEventListener("resize", paintMark);
preview.addEventListener("load", paintMark);

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
loadPreview();
