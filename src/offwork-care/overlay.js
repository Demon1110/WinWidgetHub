const ICONS = {
  umbrella: '<path d="M3 12a9 9 0 0 1 18 0z"/><path d="M12 12v6.2a2.6 2.6 0 0 0 5.2 0"/>',
  snow: '<path d="M12 3v18M5.2 7.5l13.6 9M18.8 7.5l-13.6 9"/>',
  safety: '<path d="M12 3.2 19 6v5.4c0 4.3-2.8 7.3-7 8.8-4.2-1.5-7-4.5-7-8.8V6z"/><path d="m9.2 12.1 2 2 3.6-4"/>',
  heat: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  cold: '<path d="M12 3v18M5.2 7.5l13.6 9M18.8 7.5l-13.6 9"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h8"/>',
  fog: '<path d="M3 9h13M3 13h18M6 17h12"/>',
  ok: '<path d="M12 20s-7-4.3-7-9a4.2 4.2 0 0 1 7-3.1A4.2 4.2 0 0 1 19 11c0 4.7-7 9-7 9z"/>',
};

function parseData() {
  try {
    return JSON.parse(new URLSearchParams(location.search).get("data") || "{}");
  } catch (err) {
    return {};
  }
}

function buildIcon(kind) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "icon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = ICONS[kind] || ICONS.safety;
  return svg;
}

function render(data) {
  const card = document.getElementById("card");
  const effect = window.WeatherEffect || {
    types: [],
    darkTones: {},
    create: () => ({ stop() {} }),
  };
  const type = data.effect === "none" ? "none" : effect.types.indexOf(data.effect) >= 0 ? data.effect : "glow";
  card.classList.add("fx-" + (type === "none" ? "none" : type));

  document.getElementById("meta").textContent = data.greeting || "";
  document.getElementById("title").textContent = data.title || "该下班啦";
  document.getElementById("warm").textContent = data.warm || "";

  const weather = document.getElementById("weather");
  if (data.weatherText) {
    const temp = typeof data.temperature === "number" ? ` ${data.temperature}°C` : "";
    weather.textContent = (data.cityName ? data.cityName + " · " : "") + data.weatherText + temp;
  } else {
    weather.textContent = "天气暂不可用";
    weather.classList.add("muted");
  }

  const tips = document.getElementById("tips");
  (Array.isArray(data.tips) ? data.tips.slice(0, 2) : []).forEach((tip, i) => {
    const row = document.createElement("div");
    row.className = "tip rv";
    row.style.setProperty("--d", 420 + i * 110 + "ms");
    row.appendChild(buildIcon(tip.kind));
    const text = document.createElement("span");
    text.textContent = tip.text;
    row.appendChild(text);
    tips.appendChild(row);
  });

  document.getElementById("wishText").textContent = data.encouragement || "";
  document.getElementById("footNote").textContent = (data.timeText || "18:00") + " 下班";

  const fill = document.getElementById("barFill");
  const fx =
    type === "none"
      ? { stop() {} }
      : effect.create(document.getElementById("scene"), type, {
          tone: effect.darkTones,
          flash: document.getElementById("flash"),
        });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.classList.add("ready");
      fill.style.transition = "width 13000ms linear";
      setTimeout(() => {
        fill.style.width = "0%";
      }, 40);
    });
  });

  setTimeout(() => {
    fx.stop();
    card.classList.add("leaving");
    setTimeout(() => window.close(), 680);
  }, 13000);
}

const data = parseData();
if (data && Object.keys(data).length) {
  render(data);
} else {
  setTimeout(() => window.close(), 400);
}
