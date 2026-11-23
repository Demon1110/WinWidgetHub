/* 共用外观抽屉：皮肤、背景不透明度、主色、圆角、字体，全部走 widget.settings。 */

(() => {
  const SKINS = [
    { value: "clear", name: "透明", tone: "dark", surface: "transparent" },
    { value: "clearLight", name: "透明浅字", tone: "light", surface: "transparent" },
    { value: "paper", name: "纸感", tone: "dark", surface: "#FFF8ED" },
    { value: "glass", name: "玻璃", tone: "dark", surface: "rgba(255,255,255,.30)" },
    { value: "ink", name: "墨黑", tone: "light", surface: "#171A20" },
    { value: "tint", name: "主色", tone: "dark", surface: "tint" }
  ];
  const ACCENTS = ["#F4C542", "#FF8A65", "#F06292", "#7E8CE0", "#5CC9A7", "#66C7E8", "#B58BE8", "#2B241D"];
  const FONTS = [
    { value: "", name: "默认字体" },
    { value: "Microsoft YaHei UI", name: "微软雅黑" },
    { value: "SimHei", name: "黑体" },
    { value: "SimSun", name: "宋体" },
    { value: "KaiTi", name: "楷体" },
    { value: "YouYuan", name: "幼圆" },
    { value: "Georgia", name: "Georgia" },
    { value: "Consolas", name: "Consolas" }
  ];
  const defaults = Object.assign({
    skin: "paper",
    backgroundOpacity: 100,
    accent: "#F4C542",
    radius: 22,
    fontFamily: null
  }, window.SKIN_DEFAULTS || {});

  const card = document.querySelector(".card");
  if (!card) return;

  const read = () => Object.assign({}, defaults, widget.settings.get());
  let state = read();

  const surface = document.createElement("div");
  surface.className = "skin-surface";
  surface.setAttribute("aria-hidden", "true");
  card.insertBefore(surface, card.firstChild);

  const fab = document.createElement("button");
  fab.className = "skin-fab";
  fab.type = "button";
  fab.title = "换肤与外观";
  fab.setAttribute("aria-label", "换肤与外观");
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3c5 0 9 4 9 9M12 3C7 3 3 7 3 12m0 0c0 5 4 9 9 9m0 0c5 0 9-4 9-9M7.5 10.5h.01M12 8.5h.01M16.5 10.5h.01M8 16c2.4 1.4 5.6 1.4 8 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  card.append(fab);

  const sheet = document.createElement("div");
  sheet.className = "skin-sheet";
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="skin-backdrop" data-close></div>
    <section class="skin-panel" role="dialog" aria-modal="true" aria-label="外观设置">
      <header class="skin-head">
        <h3>外观</h3>
        <button class="skin-close" type="button" data-close aria-label="关闭外观设置">×</button>
      </header>
      <div class="skin-body">
        <section class="skin-sec">
          <div class="skin-label">皮肤 <span>透明皮肤直接叠在桌面上</span></div>
          <div class="skin-chips" role="group" aria-label="皮肤"></div>
        </section>
        <section class="skin-sec">
          <div class="skin-label">背景不透明度 <span id="skinOpacityOut">100%</span></div>
          <input class="skin-range" id="skinOpacity" type="range" min="0" max="100" step="1" aria-label="背景不透明度">
          <div class="skin-values"><span>0% 只剩内容</span><span>100% 完全显示</span></div>
        </section>
        <section class="skin-sec">
          <div class="skin-label">主色 <span>按钮、重点数字和高亮</span></div>
          <div class="skin-swatches" id="skinAccents" role="group" aria-label="主色"></div>
        </section>
        <section class="skin-sec">
          <div class="skin-label">圆角 <span id="skinRadiusOut">22px</span></div>
          <input class="skin-range" id="skinRadius" type="range" min="0" max="32" step="1" aria-label="圆角">
        </section>
        <section class="skin-sec">
          <div class="skin-label">字体 <span>只改这张卡</span></div>
          <select class="skin-select" id="skinFont" aria-label="字体"></select>
        </section>
      </div>
      <footer class="skin-foot">
        <button class="skin-reset" id="skinReset" type="button">恢复默认外观</button>
        <span class="skin-hint">内容项在控制中心</span>
      </footer>
    </section>`;
  card.append(sheet);

  const $ = (id) => sheet.querySelector(`#${id}`);
  const chips = sheet.querySelector(".skin-chips");
  const accentBox = $("skinAccents");
  const opacity = $("skinOpacity");
  const opacityOut = $("skinOpacityOut");
  const radius = $("skinRadius");
  const radiusOut = $("skinRadiusOut");
  const font = $("skinFont");
  let lastFocus = null;

  for (const item of SKINS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skin-chip";
    btn.dataset.skin = item.value;
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML = `<b style="--chip:${item.surface === "transparent" ? "linear-gradient(135deg,#fff 48%,#d8d0c4 49%)" : item.surface === "tint" ? defaults.accent : item.surface}"></b><u>${item.name}</u>`;
    btn.addEventListener("click", () => setSetting("skin", item.value));
    chips.append(btn);
  }

  for (const color of ACCENTS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skin-swatch";
    btn.style.setProperty("--swatch", color);
    btn.title = color;
    btn.setAttribute("aria-label", `主色 ${color}`);
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => setSetting("accent", color));
    accentBox.append(btn);
  }
  const custom = document.createElement("label");
  custom.className = "skin-custom";
  custom.title = "自定义主色";
  custom.innerHTML = '<span aria-hidden="true">+</span><input type="color" aria-label="自定义主色">';
  accentBox.append(custom);
  const customInput = custom.querySelector("input");
  customInput.addEventListener("input", () => setTransient("accent", customInput.value));
  customInput.addEventListener("change", () => persist("accent", customInput.value));

  for (const item of FONTS) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.name;
    font.append(option);
  }

  opacity.addEventListener("input", () => {
    const value = Number(opacity.value);
    opacityOut.textContent = `${value}%`;
    setTransient("backgroundOpacity", value);
  });
  opacity.addEventListener("change", () => persist("backgroundOpacity", Number(opacity.value)));
  radius.addEventListener("input", () => {
    const value = Number(radius.value);
    radiusOut.textContent = `${value}px`;
    setTransient("radius", value);
  });
  radius.addEventListener("change", () => persist("radius", Number(radius.value)));
  font.addEventListener("change", () => persist("fontFamily", font.value || null));

  $("skinReset").addEventListener("click", async () => {
    state = Object.assign({}, defaults);
    apply();
    sync();
    try {
      await Promise.all(["skin", "backgroundOpacity", "accent", "radius", "fontFamily"].map((key) => widget.settings.set(key, defaults[key])));
    } catch (error) {
      console.warn("week skin reset:", error);
    }
  });

  function setTransient(key, value) {
    state[key] = value;
    apply();
    sync();
  }

  async function setSetting(key, value) {
    setTransient(key, value);
    persist(key, value);
  }

  async function persist(key, value) {
    try { await widget.settings.set(key, value); }
    catch (error) { console.warn(`week skin ${key}:`, error); }
  }

  function toneColor(tone) {
    return tone === "light"
      ? { fg: "#F7F2E7", muted: "rgba(247,242,231,.62)", line: "rgba(247,242,231,.16)", panel: "rgba(18,15,12,.38)" }
      : { fg: "#1F1B16", muted: "rgba(31,27,22,.58)", line: "rgba(31,27,22,.14)", panel: "rgba(255,255,255,.56)" };
  }

  function luminance(hex) {
    const value = String(hex).replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(value)) return 0;
    const parts = [0, 2, 4].map((i) => {
      const c = parseInt(value.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
  }

  function apply() {
    const skin = SKINS.find((item) => item.value === state.skin) || SKINS[2];
    const tone = toneColor(skin.tone);
    const opacityValue = Math.max(0, Math.min(100, Number(state.backgroundOpacity) || 0)) / 100;

    document.body.style.setProperty("--skin-fg", tone.fg);
    document.body.style.setProperty("--skin-muted", tone.muted);
    document.body.style.setProperty("--skin-line", tone.line);
    document.body.style.setProperty("--skin-panel", tone.panel);
    document.body.style.setProperty("--skin-accent", state.accent || defaults.accent);
    document.body.style.setProperty("--skin-radius", `${Math.max(0, Math.min(32, Number(state.radius) || 0))}px`);
    document.body.style.setProperty("--skin-font", state.fontFamily ? `"${state.fontFamily}", "Microsoft YaHei UI", sans-serif` : '"Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", sans-serif');
    document.body.style.setProperty("--skin-halo", skin.value === "clear"
      ? "0 1px 2px rgba(255,255,255,.64)"
      : skin.value === "clearLight" ? "0 1px 2px rgba(0,0,0,.60)" : "0 0 transparent");
    document.body.dataset.skin = skin.value;
    document.body.dataset.skinTone = skin.tone;

    if (skin.surface === "transparent") {
      surface.style.background = "transparent";
      surface.style.opacity = "0";
    } else if (skin.surface === "tint") {
      surface.style.background = `color-mix(in srgb, ${state.accent || defaults.accent} 16%, #FFF8ED)`;
      surface.style.opacity = String(opacityValue);
    } else {
      surface.style.background = skin.surface;
      surface.style.opacity = String(opacityValue);
    }

    const onAccent = luminance(state.accent || defaults.accent) > 0.55 ? "#201A12" : "#FFFDF8";
    document.body.style.setProperty("--skin-on-accent", onAccent);
  }

  function sync() {
    const opacityValue = Math.round(Number(state.backgroundOpacity ?? defaults.backgroundOpacity));
    opacity.value = String(Math.max(0, Math.min(100, opacityValue)));
    opacityOut.textContent = `${opacity.value}%`;
    radius.value = String(Math.max(0, Math.min(32, Math.round(Number(state.radius ?? defaults.radius)))));
    radiusOut.textContent = `${radius.value}px`;
    font.value = state.fontFamily || "";

    for (const btn of chips.querySelectorAll(".skin-chip")) {
      btn.setAttribute("aria-pressed", String(btn.dataset.skin === state.skin));
    }
    for (const btn of accentBox.querySelectorAll(".skin-swatch")) {
      btn.setAttribute("aria-pressed", String(btn.style.getPropertyValue("--swatch").trim().toLowerCase() === String(state.accent).toLowerCase()));
    }
    customInput.value = /^#[0-9a-f]{6}$/i.test(String(state.accent)) ? state.accent : defaults.accent;
    const chip = chips.querySelector(`[data-skin="${state.skin}"]`);
    const tintDot = chip?.querySelector("b");
    if (state.skin === "tint" && tintDot) tintDot.style.setProperty("--chip", state.accent || defaults.accent);
  }

  function openSheet() {
    lastFocus = document.activeElement;
    sheet.hidden = false;
    sheet.querySelector(".skin-close").focus();
  }

  function closeSheet() {
    sheet.hidden = true;
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  fab.addEventListener("click", openSheet);
  for (const button of sheet.querySelectorAll("[data-close]")) {
    button.addEventListener("click", closeSheet);
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sheet.hidden) {
      event.preventDefault();
      closeSheet();
    }
  });

  if (widget.settings.onChange) {
    widget.settings.onChange((all) => {
      state = Object.assign({}, defaults, all);
      apply();
      sync();
    });
  }

  apply();
  sync();
})();
