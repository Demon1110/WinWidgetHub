const t = widget.t;
const boardEl = document.getElementById("board");
const whoEl = document.getElementById("who");
const dotEl = document.getElementById("dot");
const scoreEl = document.getElementById("score");
const tipEl = document.getElementById("tip");
const overEl = document.getElementById("over");
const overText = document.getElementById("overText");
const resetBtn = document.getElementById("reset");
const againBtn = document.getElementById("again");

const COLS = 8;
const ROWS = 5;
const CELLS = COLS * ROWS;

const KINDS = [
  { kind: "司令", rank: 9, n: 1 },
  { kind: "军长", rank: 8, n: 1 },
  { kind: "师长", rank: 7, n: 1 },
  { kind: "旅长", rank: 6, n: 1 },
  { kind: "团长", rank: 5, n: 1 },
  { kind: "营长", rank: 4, n: 2 },
  { kind: "连长", rank: 3, n: 2 },
  { kind: "排长", rank: 2, n: 3 },
  { kind: "工兵", rank: 1, n: 3 },
  { kind: "地雷", rank: -1, n: 2 },
  { kind: "炸弹", rank: -2, n: 2 },
  { kind: "军旗", rank: -3, n: 1 },
];

let opts = { mode: "ai", sides: "red" };
let cells = [];
let turn = "red";
let selected = -1;
let over = false;
let aiPending = false;
let aiTurn = false;

const SIDE_NAME = {
  red: t({ "zh-TW": "紅方", "zh-CN": "红方", en: "Red" }),
  black: t({ "zh-TW": "黑方", "zh-CN": "黑方", en: "Black" }),
};

resetBtn.textContent = t({ "zh-TW": "重開", "zh-CN": "重开", en: "Restart" });
againBtn.textContent = t({ "zh-TW": "再來一局", "zh-CN": "再来一局", en: "Play again" });

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function newGame() {
  const pieces = [];
  for (const side of ["red", "black"]) {
    for (const spec of KINDS) {
      for (let i = 0; i < spec.n; i++) {
        pieces.push({ side, kind: spec.kind, rank: spec.rank, revealed: false });
      }
    }
  }
  while (pieces.length < CELLS) pieces.push(pieces[Math.floor(Math.random() * pieces.length)]);
  shuffle(pieces);
  cells = pieces.slice(0, CELLS);
  turn = opts.sides === "black" ? "black" : "red";
  selected = -1;
  over = false;
  aiPending = false;
  overEl.hidden = true;
  render();
  maybeAI();
}

function neighbours(index) {
  const row = Math.floor(index / COLS);
  const col = index % COLS;
  const out = [];
  if (col > 0) out.push(index - 1);
  if (col < COLS - 1) out.push(index + 1);
  if (row > 0) out.push(index - COLS);
  if (row < ROWS - 1) out.push(index + COLS);
  return out;
}

function movable(piece) {
  return piece.kind !== "地雷" && piece.kind !== "军旗";
}

function resolve(attacker, defender) {
  if (defender.kind === "军旗") return "flag";
  if (attacker.kind === "炸弹" || defender.kind === "炸弹") return "both";
  if (defender.kind === "地雷") return attacker.kind === "工兵" ? "attacker" : "defender";
  if (attacker.rank > defender.rank) return "attacker";
  if (attacker.rank === defender.rank) return "both";
  return "defender";
}

function actionsFor(index) {
  const piece = cells[index];
  if (!piece || !piece.revealed || piece.side !== turn || !movable(piece)) return [];
  const out = [];
  for (const n of neighbours(index)) {
    const target = cells[n];
    if (!target) out.push({ to: n, capture: false });
    else if (target.revealed && target.side !== piece.side) out.push({ to: n, capture: true });
  }
  return out;
}

function render() {
  boardEl.textContent = "";
  const frag = document.createDocumentFragment();
  const marks = new Set(selected >= 0 ? actionsFor(selected).map((a) => a.to) : []);

  for (let i = 0; i < CELLS; i++) {
    const piece = cells[i];
    const cell = document.createElement("button");
    cell.className = "cell";
    cell.dataset.index = String(i);
    if (!piece) {
      cell.setAttribute("aria-label", "empty");
    } else if (!piece.revealed) {
      cell.classList.add("back");
      cell.dataset.rank = "hidden";
    } else {
      cell.classList.add(piece.side);
      cell.dataset.rank = piece.kind === "地雷" ? "mine" : piece.kind === "炸弹" ? "bomb" : "unit";
      const face = document.createElement("span");
      face.className = "face";
      face.textContent = piece.kind;
      cell.append(face);
    }
    if (i === selected) cell.classList.add("sel");
    else if (marks.has(i)) cell.classList.add(cells[i] && cells[i].revealed ? "cap" : "move");
    cell.addEventListener("click", () => onCell(i));
    frag.append(cell);
  }
  boardEl.append(frag);

  const alive = { red: 0, black: 0 };
  for (const p of cells) if (p) alive[p.side] += 1;
  scoreEl.textContent = `${SIDE_NAME.red} ${alive.red} · ${SIDE_NAME.black} ${alive.black}`;
  dotEl.className = "dot" + (turn === "black" ? " black" : "");
  whoEl.textContent = over
    ? t({ "zh-TW": "對局結束", "zh-CN": "对局结束", en: "Game over" })
    : `${SIDE_NAME[turn]}${opts.mode === "ai" && turn === "black" ? t({ "zh-TW": "（電腦）", "zh-CN": "（电脑）", en: " (computer)" }) : ""}`;
  tipEl.textContent = over
    ? ""
    : selected >= 0
      ? t({ "zh-TW": "點相鄰的空格或敵子", "zh-CN": "点相邻的空格或敌子", en: "Pick an adjacent square or enemy piece" })
      : t({ "zh-TW": "點一枚扣著的棋子翻開，或點自己的棋子走位", "zh-CN": "点一枚扣着的棋子翻开，或点自己的棋子走位", en: "Flip a face-down piece, or pick one of yours to move" });
}

function finish(winner, reason) {
  over = true;
  selected = -1;
  overText.textContent = winner
    ? `${SIDE_NAME[winner]}${t({ "zh-TW": "勝 · ", "zh-CN": "胜 · ", en: " wins · " })}${reason}`
    : t({ "zh-TW": "和局", "zh-CN": "和局", en: "Draw" });
  overEl.hidden = false;
  render();
}

function nextTurn() {
  selected = -1;
  turn = turn === "red" ? "black" : "red";
  render();
  maybeAI();
}

function onCell(index) {
  if (over || aiPending) return;
  if (opts.mode === "ai" && turn === "black" && !aiTurn) return;
  const piece = cells[index];

  if (!piece) {
    if (selected < 0) return;
    const legal = actionsFor(selected).find((a) => a.to === index && !a.capture);
    if (!legal) return;
    cells[index] = cells[selected];
    cells[selected] = null;
    nextTurn();
    return;
  }

  if (!piece.revealed) {
    piece.revealed = true;
    nextTurn();
    return;
  }

  if (piece.side === turn) {
    selected = selected === index ? -1 : index;
    render();
    return;
  }

  if (selected < 0) {
    tipEl.textContent = t({ "zh-TW": "這是敵子，先選自己的棋子再吃", "zh-CN": "这是敌子，先选自己的棋子再吃", en: "That is an enemy — pick your own piece first" });
    return;
  }
  const legal = actionsFor(selected).find((a) => a.to === index && a.capture);
  if (!legal) {
    tipEl.textContent = t({ "zh-TW": "只能吃相鄰的敵子", "zh-CN": "只能吃相邻的敌子", en: "Only an adjacent enemy can be taken" });
    return;
  }
  const attacker = cells[selected];
  const verdict = resolve(attacker, piece);
  if (verdict === "flag") {
    cells[index] = attacker;
    cells[selected] = null;
    finish(attacker.side, t({ "zh-TW": "奪得軍旗", "zh-CN": "夺得军旗", en: "captured the flag" }));
    return;
  }
  if (verdict === "both") {
    cells[index] = null;
    cells[selected] = null;
  } else if (verdict === "attacker") {
    cells[index] = attacker;
    cells[selected] = null;
  } else {
    cells[selected] = null;
  }
  checkExhausted();
  if (!over) nextTurn();
}

function checkExhausted() {
  for (const side of ["red", "black"]) {
    const has = cells.some((p) => p && p.side === side);
    if (!has) {
      finish(side === "red" ? "black" : "red", t({ "zh-TW": "對方棋子全滅", "zh-CN": "对方棋子全灭", en: "the other side is wiped out" }));
      return;
    }
  }
}

function maybeAI() {
  if (opts.mode !== "ai" || turn !== "black" || over) return;
  aiPending = true;
  setTimeout(() => {
    aiPending = false;
    if (over || turn !== "black") return;
    aiMove();
  }, 420);
}

function aiMove() {
  const flips = [];
  const steals = [];
  const walks = [];
  for (let i = 0; i < CELLS; i++) {
    const piece = cells[i];
    if (!piece) continue;
    if (!piece.revealed) {
      flips.push({ index: i });
      continue;
    }
    if (piece.side !== "black" || !movable(piece)) continue;
    for (const n of neighbours(i)) {
      const target = cells[n];
      if (!target) {
        walks.push({ from: i, to: n, capture: false });
        continue;
      }
      if (!target.revealed || target.side === "black") continue;
      const verdict = resolve(piece, target);
      let weight = 0;
      if (verdict === "flag") weight = 1000;
      else if (verdict === "attacker") weight = 60 + (target.rank > 0 ? target.rank * 4 : 30);
      else if (verdict === "both") weight = target.rank > 0 ? target.rank * 2 - 10 : -20;
      else weight = -50;
      steals.push({ from: i, to: n, capture: true, weight });
    }
  }
  steals.sort((a, b) => b.weight - a.weight);
  const best = steals[0];
  if (best && best.weight > 0) {
    selected = best.from;
    aiAct(best.to);
    return;
  }
  if (flips.length) {
    const pick = flips[Math.floor(Math.random() * flips.length)];
    aiAct(pick.index);
    return;
  }
  if (walks.length) {
    const pick = walks[Math.floor(Math.random() * walks.length)];
    selected = pick.from;
    aiAct(pick.to);
    return;
  }
  if (steals.length) {
    const pick = steals[0];
    selected = pick.from;
    aiAct(pick.to);
    return;
  }
  finish("red", t({ "zh-TW": "黑方無子可動", "zh-CN": "黑方无子可动", en: "Black has no legal move" }));
}

function aiAct(index) {
  aiTurn = true;
  onCell(index);
  aiTurn = false;
}

function apply(s) {
  const changed = s && ((s.mode && s.mode !== opts.mode) || (s.sides && s.sides !== opts.sides));
  opts = Object.assign(opts, s || {});
  if (changed) newGame();
}

resetBtn.addEventListener("click", newGame);
againBtn.addEventListener("click", newGame);

apply(widget.settings.get());
if (widget.settings.onChange) widget.settings.onChange(apply);
newGame();
