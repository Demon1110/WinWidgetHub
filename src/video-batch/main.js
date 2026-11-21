const t = widget.t;
const count = document.getElementById("count");
const runBtn = document.getElementById("run");
const stage = document.getElementById("stage");
const sheet = document.getElementById("sheet");
const video = document.getElementById("video");
const empty = document.getElementById("empty");
const bar = document.getElementById("bar");
const statusEl = document.getElementById("status");
const toast = document.getElementById("toast");

let opts = { folder: "", cols: "6", width: 480 };
let files = [];
let running = false;

const VIDEO_EXT = ["mp4", "mov", "m4v", "webm", "mkv"];
const MAX_BYTES = 64 * 1024 * 1024;

runBtn.textContent = t({ "zh-TW": "生成分鏡圖", "zh-CN": "生成分镜图", en: "Build storyboards" });

function toastSay(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastSay.timer);
  toastSay.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function mimeFor(name) {
  const ext = name.split(".").pop().toLowerCase();
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "mkv") return "video/x-matroska";
  return "video/mp4";
}

function seekTo(seconds) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = Math.max(0.01, seconds);
    setTimeout(() => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      // A clip may refuse a seek position (near the very end); the caller still gets one frame.
      reject(new Error("seek timeout"));
    }, 4000);
  });
}

async function buildSheet(file) {
  const data = await widget.file.read(file.path);
  const src = `data:${mimeFor(file.name)};base64,${data.base64}`;
  video.src = src;
  await new Promise((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error(`cannot decode ${file.name}`));
    video.load();
  });
  const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  const cells = Number(opts.cols) || 6;
  const cols = cells === 4 ? 2 : 3;
  const rows = Math.ceil(cells / cols);
  const cellW = Math.max(160, Math.min(Number(opts.width) || 480, 1280));
  const cellH = Math.round((cellW * (video.videoHeight || 9)) / (video.videoWidth || 16));
  const gap = 6;
  const canvas = document.createElement("canvas");
  canvas.width = cols * cellW + (cols - 1) * gap;
  canvas.height = rows * cellH + (rows - 1) * gap;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b0e14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < cells; i++) {
    const at = duration ? (duration * (i + 0.6)) / (cells + 0.2) : 0;
    try {
      await seekTo(at);
    } catch {
      // keep the previous frame rather than dropping the cell
    }
    if (!video.videoWidth) continue;
    const x = (i % cols) * (cellW + gap);
    const y = Math.floor(i / cols) * (cellH + gap);
    ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, y, cellW, cellH);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(x, y + cellH - 16, 46, 16);
    ctx.fillStyle = "#e8ecf2";
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
    const stamp = duration ? at : 0;
    ctx.fillText(formatTime(stamp), x + 5, y + cellH - 5);
  }

  return {
    path: file.path.replace(/\.\w+$/, "-storyboard.png"),
    data: canvas.toDataURL("image/png"),
    canvas,
  };
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

async function inspect() {
  if (!opts.folder) {
    count.textContent = t({ "zh-TW": "還沒選資料夾", "zh-CN": "还没选文件夹", en: "No folder yet" });
    runBtn.disabled = true;
    return;
  }
  try {
    const listing = await widget.file.list(opts.folder, { recursive: false });
    files = (listing?.files || []).filter(
      (f) => !f.isDir && VIDEO_EXT.includes((f.ext || f.name.split(".").pop() || "").toLowerCase().replace(".", "")),
    );
    const ok = files.filter((f) => (f.size || 0) <= MAX_BYTES);
    count.textContent = t({
      "zh-TW": `${files.length} 段影片，${ok.length} 段可處理`,
      "zh-CN": `${files.length} 段视频，${ok.length} 段可处理`,
      en: `${files.length} clips, ${ok.length} within the size cap`,
    });
    runBtn.disabled = ok.length === 0;
    if (!ok.length) {
      empty.textContent = t({
        "zh-TW": "這個資料夾沒有 64 MB 內、能解碼的短片",
        "zh-CN": "这个文件夹没有 64 MB 内、能解码的短片",
        en: "No clip here is under the 64 MB cap",
      });
    }
  } catch (e) {
    count.textContent = String(e.message || e);
    runBtn.disabled = true;
  }
}

async function run() {
  if (running || !files.length) return;
  running = true;
  runBtn.disabled = true;
  const batch = files.filter((f) => (f.size || 0) <= MAX_BYTES);
  let done = 0;
  let failed = 0;
  for (const file of batch) {
    try {
      const out = await buildSheet(file);
      await widget.file.write(out.path, out.data);
      sheet.src = out.data;
      sheet.classList.add("loaded");
      empty.hidden = true;
    } catch (e) {
      failed += 1;
      console.error(e);
    }
    done += 1;
    bar.style.width = `${Math.round((done / batch.length) * 100)}%`;
    statusEl.textContent = `${done}/${batch.length} · ${file.name}`;
  }
  running = false;
  runBtn.disabled = false;
  toastSay(
    failed
      ? t({ "zh-TW": `完成 ${done - failed} 段，失敗 ${failed} 段`, "zh-CN": `完成 ${done - failed} 段，失败 ${failed} 段`, en: `${done - failed} done, ${failed} failed` })
      : t({ "zh-TW": `完成 ${done} 段`, "zh-CN": `完成 ${done} 段`, en: `${done} sheets` }),
  );
  setTimeout(() => { bar.style.width = "0"; }, 1200);
}

function apply(s) {
  const folderChanged = s && s.folder !== undefined && s.folder !== opts.folder;
  opts = Object.assign(opts, s || {});
  if (folderChanged) inspect();
}

runBtn.addEventListener("click", run);
apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
inspect();
