(() => {
  const DEFAULTS = {
    showStorage: true,
    showBattery: true,
    showWeather: true,
    storageValue: 101.2,
    batteryValue: 20,
    storageLabel: "剩余容量",
    batteryLabel: "剩余电量",
    storageColor: "#7E8CE0",
    clockColor: "#FFB02E",
    batteryColor: "#35D6B2",
    weatherCity: "本地天气",
    weatherText: "阴天",
    weatherTemp: 30,
    weatherMeta: "湿度 54% · 空气 优质",
    weatherForecast: "今天 25°/31°\n明天 24°/32°"
  };

  const card = document.getElementById("card");
  const $ = (id) => document.getElementById(id);
  let state = Object.assign({}, DEFAULTS, widget.settings.get());
  let systemDiskGB = null;
  let systemBattery = null;
  let stopSystem = null;
  let timer = null;
  let lastMinute = "";

  function apply() {
    card.style.setProperty("--storage", state.storageColor || DEFAULTS.storageColor);
    card.style.setProperty("--clock", state.clockColor || DEFAULTS.clockColor);
    card.style.setProperty("--battery", state.batteryColor || DEFAULTS.batteryColor);
    card.dataset.storage = String(!!state.showStorage);
    card.dataset.battery = String(!!state.showBattery);
    card.classList.toggle("no-storage", !state.showStorage);
    card.classList.toggle("no-battery", !state.showBattery);
    card.classList.toggle("no-weather", !state.showWeather);

    $("storageLabel").textContent = state.storageLabel || DEFAULTS.storageLabel;
    $("batteryLabel").textContent = state.batteryLabel || DEFAULTS.batteryLabel;
    $("weatherCity").textContent = state.weatherCity || DEFAULTS.weatherCity;
    $("weatherText").textContent = state.weatherText || DEFAULTS.weatherText;
    $("weatherMeta").textContent = state.weatherMeta || DEFAULTS.weatherMeta;
    $("weatherTemp").textContent = `${Number(state.weatherTemp ?? DEFAULTS.weatherTemp)}°`;

    renderStorage();
    renderBattery();
    renderForecast();
  }

  function renderStorage() {
    const value = systemDiskGB == null ? Number(state.storageValue ?? DEFAULTS.storageValue) : systemDiskGB;
    $("storageValue").textContent = `${formatGB(value)}GB`;
  }

  function renderBattery() {
    const value = systemBattery == null ? Number(state.batteryValue ?? DEFAULTS.batteryValue) : systemBattery;
    $("batteryValue").textContent = `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  }

  function formatGB(value) {
    const number = Math.max(0, Number(value) || 0);
    return number >= 1000 ? number.toFixed(0) : number.toFixed(1);
  }

  function renderForecast() {
    const box = $("weatherForecast");
    const lines = String(state.weatherForecast || DEFAULTS.weatherForecast)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3);
    box.replaceChildren();
    for (const line of lines) {
      const split = line.indexOf(" ");
      const item = document.createElement("div");
      item.className = "forecast-item";
      const label = document.createElement("b");
      const value = document.createElement("span");
      label.textContent = split > 0 ? line.slice(0, split) : line;
      value.textContent = split > 0 ? line.slice(split + 1) : "";
      item.append(label, value);
      box.append(item);
    }
    if (!lines.length) box.hidden = true;
    else box.hidden = false;
  }

  function tick() {
    const now = new Date();
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const current = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hour}-${minute}`;
    if (current === lastMinute) return;
    lastMinute = current;
    $("clockValue").textContent = `${hour}:${minute}`;
    const weekday = "日一二三四五六"[now.getDay()];
    $("clockDate").textContent = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} 星期${weekday}`;
  }

  function subscribeSystem() {
    if (!widget.system || !widget.system.subscribe) return;
    if (Array.isArray(widget.permissions) && !widget.permissions.includes("system")) return;
    try {
      stopSystem = widget.system.subscribe(["disk", "battery"], (data) => {
        if (data && typeof data === "object") {
          if (data.disk) {
            const list = Array.isArray(data.disk) ? data.disk : [data.disk];
            const fixed = list.filter((d) => d && d.type !== "removable");
            const disk = fixed.find((d) => String(d.name || "").toUpperCase().startsWith("C:")) || fixed[0] || list[0];
            if (disk && Number.isFinite(Number(disk.free))) systemDiskGB = Number(disk.free) / 1024 ** 3;
          }
          if (data.battery && data.battery.present !== false && Number.isFinite(Number(data.battery.percent))) {
            systemBattery = Number(data.battery.percent);
          }
        }
        renderStorage();
        renderBattery();
      }, { interval: 5000 });
    } catch (error) {
      console.warn("multipanel system:", error);
    }
  }

  if (widget.settings.onChange) {
    widget.settings.onChange((all) => {
      state = Object.assign({}, DEFAULTS, all);
      apply();
    });
  }

  apply();
  tick();
  subscribeSystem();
  timer = setInterval(tick, 1000);

  addEventListener("pagehide", () => {
    if (timer) clearInterval(timer);
    if (typeof stopSystem === "function") stopSystem();
  });
})();
