(() => {
  const DEFAULTS = {
    title: "打工人倒计时",
    quote: "周日计划：\n假装还是周六",
    workStart: "09:00",
    workEnd: "18:00",
    workWeek: "five",
    restLabel: "",
    showStats: true
  };

  const card = document.getElementById("card");
  const $ = (id) => document.getElementById(id);
  let state = Object.assign({}, DEFAULTS, widget.settings.get());
  let timer = null;

  function parseTime(value, fallback) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return fallback;
    return {
      hour: Math.min(23, Math.max(0, Number(match[1]))),
      minute: Math.min(59, Math.max(0, Number(match[2])))
    };
  }

  function atTime(date, time) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.hour, time.minute, 0, 0);
  }

  function isWorkday(date) {
    const weekday = date.getDay();
    return state.workWeek === "six" ? weekday >= 1 && weekday <= 6 : weekday >= 1 && weekday <= 5;
  }

  function nextStart(now, start) {
    const todayStart = atTime(now, start);
    if (isWorkday(now) && now < todayStart) return todayStart;
    for (let offset = 1; offset <= 8; offset += 1) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      if (isWorkday(day)) return atTime(day, start);
    }
    return todayStart;
  }

  function restText() {
    if (state.restLabel && state.restLabel.trim()) return state.restLabel.trim();
    return state.workWeek === "six" ? "单休" : "双休";
  }

  function apply() {
    const start = parseTime(state.workStart, { hour: 9, minute: 0 });
    const end = parseTime(state.workEnd, { hour: 18, minute: 0 });
    $("title").textContent = state.title || DEFAULTS.title;
    $("quote").textContent = state.quote || DEFAULTS.quote;
    $("startText").textContent = `${String(start.hour).padStart(2, "0")}:${String(start.minute).padStart(2, "0")}`;
    $("endText").textContent = `${String(end.hour).padStart(2, "0")}:${String(end.minute).padStart(2, "0")}`;
    $("restText").textContent = restText();
    $("weekTag").textContent = restText();
    card.classList.toggle("no-stats", !state.showStats);
    update();
  }

  function update() {
    const now = new Date();
    const start = parseTime(state.workStart, { hour: 9, minute: 0 });
    const end = parseTime(state.workEnd, { hour: 18, minute: 0 });
    const startToday = atTime(now, start);
    const endToday = atTime(now, end);

    let target;
    let label;
    if (isWorkday(now) && now >= startToday && now < endToday) {
      target = endToday;
      label = "距离下班剩";
    } else if (isWorkday(now) && now < startToday) {
      target = startToday;
      label = "距离上班剩";
    } else {
      target = nextStart(now, start);
      label = "距离上班剩";
    }

    const totalMinutes = Math.max(0, Math.ceil((target - now) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    $("modeLabel").textContent = label;
    $("hours").textContent = String(hours);
    $("minutes").textContent = String(minutes).padStart(2, "0");
  }

  if (widget.settings.onChange) {
    widget.settings.onChange((all) => {
      state = Object.assign({}, DEFAULTS, all);
      apply();
    });
  }

  apply();
  timer = setInterval(update, 30000);
  addEventListener("pagehide", () => {
    if (timer) clearInterval(timer);
  });
})();
