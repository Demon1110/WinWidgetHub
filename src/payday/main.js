(() => {
  const DEFAULTS = {
    title: "工资倒计时",
    payLabel: "发薪日",
    payday: 15,
    payTime: "10:00",
    subLabel: "距离下次发薪",
    showProgress: true,
    progressLabel: "本期已过"
  };

  const card = document.getElementById("card");
  const $ = (id) => document.getElementById(id);
  let state = Object.assign({}, DEFAULTS, widget.settings.get());
  let timer = null;

  function apply() {
    $("title").textContent = state.title || DEFAULTS.title;
    $("payLabel").textContent = state.payLabel || DEFAULTS.payLabel;
    $("subLabel").textContent = state.subLabel || DEFAULTS.subLabel;
    $("progressLabel").textContent = state.progressLabel || DEFAULTS.progressLabel;
    card.classList.toggle("no-progress", !state.showProgress);
    update();
  }

  function parseTime(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return { hour: 10, minute: 0 };
    return {
      hour: Math.min(23, Math.max(0, Number(match[1]))),
      minute: Math.min(59, Math.max(0, Number(match[2])))
    };
  }

  function paydayInMonth(year, month, day, time) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(Math.max(1, day), lastDay), time.hour, time.minute, 0, 0);
  }

  function nextPayday(now, day, time) {
    let next = paydayInMonth(now.getFullYear(), now.getMonth(), day, time);
    if (next <= now) next = paydayInMonth(now.getFullYear(), now.getMonth() + 1, day, time);
    return next;
  }

  function previousPayday(now, next, day, time) {
    let previous = paydayInMonth(next.getFullYear(), next.getMonth() - 1, day, time);
    for (let i = 0; i < 3 && previous > now; i += 1) {
      previous = paydayInMonth(previous.getFullYear(), previous.getMonth() - 1, day, time);
    }
    return previous;
  }

  function dateLabel(date) {
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function shortDate(date) {
    return `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function update() {
    const now = new Date();
    const day = Math.max(1, Math.min(31, Number(state.payday ?? DEFAULTS.payday)));
    const time = parseTime(state.payTime);
    const next = nextPayday(now, day, time);
    const previous = previousPayday(now, next, day, time);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(next.getFullYear(), next.getMonth(), next.getDate());
    const days = Math.max(0, Math.round((target - today) / 86400000));

    $("ruleTag").textContent = `每月 ${day} 号`;
    $("days").textContent = days === 0 ? "今天" : String(days);
    $("days").classList.toggle("today", days === 0);
    $("unit").hidden = days === 0;
    $("payDate").textContent = dateLabel(next);
    $("progressFrom").textContent = shortDate(previous);
    $("progressTo").textContent = shortDate(next);

    const total = next - previous;
    const elapsed = now - previous;
    const percent = total > 0 ? Math.max(0, Math.min(100, Math.round(elapsed / total * 100))) : 0;
    $("progressPct").textContent = `${percent}%`;
    $("progressFill").style.width = `${percent}%`;
    const track = card.querySelector(".track");
    if (track) track.setAttribute("aria-valuenow", String(percent));
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
