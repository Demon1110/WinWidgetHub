(() => {
  const DEFAULTS = {
    title: "人生进度",
    mode: "ring",
    birthDate: "2000-06-06",
    lifeExpectancy: 100,
    quote: "人活一天就不要白活",
    showFooter: true
  };

  const card = document.getElementById("card");
  const $ = (id) => document.getElementById(id);
  let state = Object.assign({}, DEFAULTS, widget.settings.get());
  let timer = null;
  let dots = [];

  function parseBirth(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return new Date(2000, 5, 6, 0, 0, 0);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0);
  }

  function birthLabel(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function buildDots() {
    const grid = $("dotsGrid");
    if (dots.length) return;
    for (let i = 0; i < 100; i += 1) {
      const dot = document.createElement("i");
      dot.className = "dot";
      grid.append(dot);
      dots.push(dot);
    }
  }

  function apply() {
    const birth = parseBirth(state.birthDate);
    const expectancy = Math.max(50, Math.min(120, Number(state.lifeExpectancy) || 100));
    const now = new Date();
    const ageYears = Math.max(0, (now - birth) / (365.2425 * 86400000));
    const percent = Math.max(0, Math.min(100, ageYears / expectancy * 100));
    const filled = Math.min(100, Math.max(0, Math.floor(ageYears)));
    const mode = state.mode === "dots" ? "dots" : "ring";

    $("title").textContent = state.title || DEFAULTS.title;
    $("expectTag").textContent = `${expectancy} 年`;
    $("percent").textContent = `${percent.toFixed(2)}%`;
    $("ageText").textContent = `${Math.floor(ageYears)} 岁`;
    $("ringFill").setAttribute("stroke-dashoffset", String(Math.max(0, 100 - percent)));
    $("birthFooter").textContent = birthLabel(birth);
    $("yearsFooter").textContent = String(Math.floor(ageYears));
    $("quote").textContent = state.quote || DEFAULTS.quote;
    $("dotCount").textContent = `${filled} / 100`;
    $("dotDate").textContent = `${String(now.getMonth() + 1).padStart(2, "0")} / ${String(now.getDate()).padStart(2, "0")}`;
    $("dotWeek").textContent = `周${"日一二三四五六"[now.getDay()]}`;

    buildDots();
    dots.forEach((dot, index) => {
      dot.classList.toggle("filled", index < filled);
      dot.classList.toggle("current", index === filled && filled < 100);
    });

    card.classList.toggle("mode-dots", mode === "dots");
    card.classList.toggle("no-footer", !state.showFooter);
    $("ringView").hidden = mode !== "ring";
    $("dotsView").hidden = mode !== "dots";
  }

  if (widget.settings.onChange) {
    widget.settings.onChange((all) => {
      state = Object.assign({}, DEFAULTS, all);
      apply();
    });
  }

  apply();
  timer = setInterval(apply, 6 * 60 * 60 * 1000);
  addEventListener("pagehide", () => {
    if (timer) clearInterval(timer);
  });
})();
