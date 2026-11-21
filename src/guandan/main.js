// guandan: two decks, four seats, you and the seat opposite on one team. The rules that live here
// are the ones a card game needs — combinations, bombs, the level card outranking the aces — and
// nothing else: no assets, no timers beyond one per turn, no network.

const t = widget.t;
const TEAM = [0, 1, 0, 1]; // seats 0 and 2 are your team
const SEAT = [
  { "zh-TW": "你", "zh-CN": "你", en: "You" },
  { "zh-TW": "下家", "zh-CN": "下家", en: "Right" },
  { "zh-TW": "對家", "zh-CN": "对家", en: "Partner" },
  { "zh-TW": "上家", "zh-CN": "上家", en: "Left" },
];
const RANK_TEXT = { 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A", 15: "小", 16: "大" };
const SUIT = { S: "♠", H: "♥", C: "♣", D: "♦", J: "王" };
const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3, J: 4 };
const COMBO_NAME = {
  single: { "zh-TW": "單張", "zh-CN": "单张", en: "single" },
  pair: { "zh-TW": "對子", "zh-CN": "对子", en: "pair" },
  triple: { "zh-TW": "三張", "zh-CN": "三张", en: "triple" },
  fullhouse: { "zh-TW": "三帶二", "zh-CN": "三带二", en: "full house" },
  straight: { "zh-TW": "順子", "zh-CN": "顺子", en: "straight" },
  trioChain: { "zh-TW": "三連對", "zh-CN": "三连对", en: "three pairs" },
  steel: { "zh-TW": "鋼板", "zh-CN": "钢板", en: "steel plate" },
  bomb: { "zh-TW": "炸彈", "zh-CN": "炸弹", en: "bomb" },
  flush: { "zh-TW": "同花順", "zh-CN": "同花顺", en: "flush straight" },
  kingBomb: { "zh-TW": "四王", "zh-CN": "四王", en: "four kings" },
};

const el = {
  level: document.getElementById("level"),
  left: document.getElementById("seat-left"),
  right: document.getElementById("seat-right"),
  partner: document.getElementById("partner"),
  table: document.getElementById("table"),
  played: document.getElementById("played"),
  say: document.getElementById("say"),
  hand: document.getElementById("hand"),
  hint: document.getElementById("hint"),
  pass: document.getElementById("pass"),
  play: document.getElementById("play"),
  over: document.getElementById("over"),
  overTitle: document.getElementById("overTitle"),
  overBody: document.getElementById("overBody"),
  again: document.getElementById("again"),
};

const S = {
  hands: [[], [], [], []],
  level: 2,
  turn: 0,
  trick: null, // { combo, player }
  passes: 0,
  order: [],
  over: false,
  sel: new Set(),
  say: null, // { player, text }
  easy: false,
  gen: 0, // bumped per deal, so a stale AI timer does nothing
  wins: 0,
};

// ── cards ───────────────────────────────────────────────────────────────────────

function buildDeck() {
  const cards = [];
  let id = 0;
  for (let copy = 0; copy < 2; copy += 1) {
    for (let r = 2; r <= 14; r += 1) {
      for (const s of ["S", "H", "C", "D"]) cards.push({ id: id++, r, s });
    }
    cards.push({ id: id++, r: 15, s: "J" }); // small joker
    cards.push({ id: id++, r: 16, s: "J" }); // big joker
  }
  return cards;
}

/** 2–A by face, then the level card, then the jokers. */
function power(card, level) {
  if (card.r === 16) return 17;
  if (card.r === 15) return 16;
  return card.r === level ? 15 : card.r;
}

function sortHand(hand) {
  hand.sort((a, b) => power(b, S.level) - power(a, S.level) || SUIT_ORDER[b.s] - SUIT_ORDER[a.s]);
  return hand;
}

function rankGroups(cards) {
  const out = new Map();
  for (const card of cards) {
    if (!out.has(card.r)) out.set(card.r, []);
    out.get(card.r).push(card);
  }
  return out;
}

function combo(type, cards, key) {
  return { type, cards, key, len: cards.length };
}

/** Are these ranks consecutive, each appearing once? Used by straights and chains. */
function consecutive(ranks) {
  if (!ranks.length) return false;
  const sorted = [...ranks].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

/** Everything a hand can put on the table, for the AI and the hint button. */
function allCombos(hand, level) {
  const out = [];
  const groups = rankGroups(hand);

  for (const [, cards] of groups) {
    const p = power(cards[0], level);
    out.push(combo("single", cards.slice(0, 1), p));
    if (cards.length >= 2) out.push(combo("pair", cards.slice(0, 2), p));
    if (cards.length >= 3) out.push(combo("triple", cards.slice(0, 3), p));
    for (let n = 4; n <= cards.length; n += 1) out.push(combo("bomb", cards.slice(0, n), p));
  }

  const triples = [...groups].filter(([, cards]) => cards.length >= 3);
  const pairs = [...groups].filter(([, cards]) => cards.length >= 2);
  for (const [tr, tc] of triples) {
    for (const [pr, pc] of pairs) {
      if (tr === pr) continue;
      out.push(combo("fullhouse", [...tc.slice(0, 3), ...pc.slice(0, 2)], power(tc[0], level)));
    }
  }

  for (let lo = 2; lo + 4 <= 14; lo += 1) {
    const ranks = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
    if (ranks.every((r) => groups.has(r))) {
      out.push(combo("straight", ranks.map((r) => groups.get(r)[0]), ranks[4]));
      for (const s of ["S", "H", "C", "D"]) {
        if (ranks.every((r) => groups.get(r).some((c) => c.s === s))) {
          out.push(combo("flush", ranks.map((r) => groups.get(r).find((c) => c.s === s)), ranks[4]));
        }
      }
    }
  }

  for (let lo = 2; lo + 2 <= 14; lo += 1) {
    const ranks = [lo, lo + 1, lo + 2];
    if (ranks.every((r) => groups.has(r) && groups.get(r).length >= 2)) {
      out.push(combo("trioChain", ranks.flatMap((r) => groups.get(r).slice(0, 2)), ranks[2]));
    }
  }

  for (let lo = 2; lo + 1 <= 14; lo += 1) {
    const ranks = [lo, lo + 1];
    if (ranks.every((r) => groups.has(r) && groups.get(r).length >= 3)) {
      out.push(combo("steel", ranks.flatMap((r) => groups.get(r).slice(0, 3)), ranks[1]));
    }
  }

  const small = groups.get(15) || [];
  const big = groups.get(16) || [];
  if (small.length >= 2 && big.length >= 2) {
    out.push(combo("kingBomb", [...small.slice(0, 2), ...big.slice(0, 2)], 0));
  }
  return out;
}

/** What the player actually selected — null when those cards are not a legal combination. */
function identify(cards, level) {
  if (!cards.length) return null;
  const groups = rankGroups(cards);
  const counts = [...groups.values()].map((c) => c.length);
  const ranks = [...groups.keys()];
  const p = power(cards[0], level);

  if (cards.length === 1) return combo("single", cards, p);
  if (counts.length === 1 && cards.length === 2) return combo("pair", cards, p);
  if (counts.length === 1 && cards.length === 3) return combo("triple", cards, p);
  if (counts.length === 1 && cards.length >= 4) return combo("bomb", cards, p);
  if (cards.length === 4 && counts.length === 2) {
    const hasSmall = (groups.get(15) || []).length === 2;
    const hasBig = (groups.get(16) || []).length === 2;
    return hasSmall && hasBig ? combo("kingBomb", cards, 0) : null;
  }
  if (cards.length === 5) {
    const byThree = counts.filter((n) => n === 3).length;
    const byTwo = counts.filter((n) => n === 2).length;
    if (byThree === 1 && byTwo === 1) return combo("fullhouse", cards, p);
    if (counts.every((n) => n === 1) && ranks.every((r) => r <= 14) && consecutive(ranks)) {
      const suit = cards[0].s;
      const top = Math.max(...ranks);
      const sameSuit = cards.every((c) => c.s === suit) && suit !== "J";
      return sameSuit ? combo("flush", cards, top) : combo("straight", cards, top);
    }
    return null;
  }
  if (cards.length === 6) {
    if (counts.every((n) => n === 2) && ranks.every((r) => r <= 14) && consecutive(ranks)) {
      return combo("trioChain", cards, Math.max(...ranks));
    }
    if (counts.every((n) => n === 3) && ranks.every((r) => r <= 14) && consecutive(ranks)) {
      return combo("steel", cards, Math.max(...ranks));
    }
  }
  return null;
}

/** How strong a "heavy" combination is; 0 means it is an ordinary one. */
function heavy(c) {
  if (!c) return 0;
  if (c.type === "kingBomb") return 99;
  if (c.type === "flush") return 52;
  if (c.type === "bomb") return 30 + c.cards.length * 4;
  return 0;
}

function beats(candidate, current) {
  if (!current) return true;
  const ha = heavy(candidate);
  const hb = heavy(current);
  if (ha || hb) {
    if (!ha) return false;
    if (!hb) return true;
    if (ha !== hb) return ha > hb;
    return candidate.key > current.key;
  }
  if (candidate.type !== current.type) return false;
  if (candidate.len !== current.len) return false;
  return candidate.key > current.key;
}

function comboText(c) {
  return t(COMBO_NAME[c.type] || { "zh-TW": "牌", "zh-CN": "牌", en: "play" });
}

// ── the seats ────────────────────────────────────────────────────────────────────

function activeCount() {
  return S.hands.filter((h) => h.length > 0).length;
}

function nextActive(from) {
  for (let k = 1; k <= 4; k += 1) {
    const i = (from + k) % 4;
    if (S.hands[i].length > 0) return i;
  }
  return -1;
}

function passNeeded() {
  if (!S.trick) return 0;
  const active = [0, 1, 2, 3].filter((i) => S.hands[i].length > 0).length;
  const ownerActive = S.hands[S.trick.player].length > 0;
  return ownerActive ? active - 1 : active;
}

function newDeal(leader) {
  S.gen += 1;
  S.hands = [[], [], [], []];
  S.trick = null;
  S.passes = 0;
  S.order = [];
  S.over = false;
  S.sel = new Set();
  S.say = null;
  S.turn = leader;

  const deck = buildDeck();
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  for (let i = 0; i < 108; i += 1) S.hands[i % 4].push(deck[i]);
  S.hands.forEach(sortHand);

  el.over.hidden = true;
  render();
  beginTurn();
}

function beginTurn() {
  if (S.over) return;
  render();
  if (S.turn === 0) return;
  const gen = S.gen;
  const seat = S.turn;
  setTimeout(() => {
    if (gen !== S.gen || S.over || S.turn !== seat) return;
    aiPlay(seat);
  }, 620);
}

function playCards(seat, c) {
  const ids = new Set(c.cards.map((card) => card.id));
  S.hands[seat] = S.hands[seat].filter((card) => !ids.has(card.id));
  S.trick = { combo: c, player: seat };
  S.passes = 0;
  S.say = { player: seat, text: comboText(c) };
  if (!S.hands[seat].length) S.order.push(seat);

  if (S.order.length >= 3) {
    endDeal();
    return;
  }
  S.sel.clear();
  S.turn = nextActive(seat);
  beginTurn();
}

function passTurn(seat) {
  S.say = { player: seat, text: t({ "zh-TW": "不要", "zh-CN": "不要", en: "pass" }) };
  const needed = passNeeded();
  if (S.passes + 1 >= needed) {
    const owner = S.trick.player;
    S.trick = null;
    S.passes = 0;
    S.say = null;
    S.turn = S.hands[owner].length ? owner : nextActive(owner);
    S.sel.clear();
    beginTurn();
    return;
  }
  S.passes += 1;
  S.sel.clear();
  S.turn = nextActive(seat);
  beginTurn();
}

// ── the computer players ────────────────────────────────────────────────────────

function aiChoose(seat) {
  const hand = S.hands[seat];
  const level = S.level;
  const options = allCombos(hand, level);

  if (S.trick) {
    const mine = {
      // A partner who is winning the trick should not be beaten by their own team.
      courtesy:
        S.trick.player !== seat &&
        TEAM[S.trick.player] === TEAM[seat] &&
        S.hands[S.trick.player].length > 0,
    };
    const replies = options.filter((c) => beats(c, S.trick.combo));
    if (!replies.length) return null;
    const finish = replies.find((c) => c.cards.length === hand.length);
    if (finish) return finish;
    if (mine.courtesy && hand.length > 2) return null;

    const ordinary = replies
      .filter((c) => !heavy(c))
      .sort((a, b) => a.key - b.key || a.cards.length - b.cards.length);
    if (ordinary.length) return ordinary[0];
    if (S.easy) return null;

    const bombs = replies.filter(heavy).sort((a, b) => heavy(a) - heavy(b) || a.key - b.key);
    const someoneAlmostOut = [0, 1, 2, 3].some((i) => i !== seat && S.hands[i].length > 0 && S.hands[i].length <= 3);
    return bombs.length && (hand.length <= 9 || someoneAlmostOut) ? bombs[0] : null;
  }

  // Leading: the longest ordinary combination with the lowest key sheds the most cards.
  const leading = options
    .filter((c) => !heavy(c))
    .sort((a, b) => b.cards.length - a.cards.length || a.key - b.key);
  if (leading.length) {
    if (S.easy && leading.length > 1) return leading[Math.floor(Math.random() * Math.min(2, leading.length))];
    return leading[0];
  }
  return options.sort((a, b) => heavy(a) - heavy(b))[0] || null;
}

function aiPlay(seat) {
  const choice = aiChoose(seat);
  if (choice) playCards(seat, choice);
  else passTurn(seat);
}

// ── drawing ─────────────────────────────────────────────────────────────────────

function cardEl(card, mini) {
  const node = document.createElement("div");
  node.className = "card";
  if (mini) node.classList.add("mini");
  if (card.s === "H" || card.s === "D" || card.r === 16) node.classList.add("red");
  if (card.r === 15 || card.r === 16) node.classList.add("king");
  const rank = document.createElement("span");
  rank.className = "rank";
  rank.textContent = RANK_TEXT[card.r] || "?";
  const suit = document.createElement("span");
  suit.className = "suit";
  suit.textContent = SUIT[card.s] || "";
  node.append(rank, suit);
  node.dataset.id = String(card.id);
  return node;
}

function render() {
  el.level.textContent = t({ "zh-TW": `打 ${RANK_TEXT[S.level]}`, "zh-CN": `打 ${RANK_TEXT[S.level]}`, en: `Level ${RANK_TEXT[S.level]}` });

  const seats = { 1: el.right, 2: el.partner, 3: el.left };
  for (const [seat, node] of Object.entries(seats)) {
    const i = Number(seat);
    node.querySelector(".who").textContent = t(SEAT[i]);
    node.querySelector(".count").textContent = String(S.hands[i].length);
    node.classList.toggle("turn", S.turn === i && !S.over);
    node.classList.toggle("out", S.hands[i].length === 0);
  }

  el.played.textContent = "";
  if (S.trick) {
    const tag = document.createElement("span");
    tag.className = "from";
    tag.textContent = t(SEAT[S.trick.player]);
    const row = document.createElement("div");
    row.className = "row";
    for (const card of S.trick.combo.cards) row.append(cardEl(card, true));
    const kind = document.createElement("span");
    kind.className = "kind";
    kind.textContent = comboText(S.trick.combo);
    el.played.append(tag, row, kind);
  } else {
    const idle = document.createElement("div");
    idle.className = "idle";
    idle.textContent =
      S.order.length >= 3
        ? ""
        : t({ "zh-TW": "新一墩，自由出牌", "zh-CN": "新一墩，自由出牌", en: "New trick — lead anything" });
    el.played.append(idle);
  }

  el.say.textContent = "";
  if (S.say && (!S.trick || S.say.player !== S.trick.player)) {
    el.say.textContent = `${t(SEAT[S.say.player])} ${S.say.text}`;
  }

  el.hand.textContent = "";
  const hand = S.hands[0];
  const playable = S.turn === 0 && !S.over;
  for (const card of hand) {
    const node = cardEl(card, false);
    node.classList.toggle("sel", S.sel.has(card.id));
    node.classList.toggle("off", !playable);
    node.addEventListener("click", () => {
      if (!playable) return;
      if (S.sel.has(card.id)) S.sel.delete(card.id);
      else S.sel.add(card.id);
      node.classList.toggle("sel");
      updateControls();
    });
    el.hand.append(node);
  }

  el.pass.disabled = !playable || !S.trick;
  el.hint.disabled = !playable;
  updateControls();
}

function updateControls() {
  el.play.disabled = !(S.turn === 0 && !S.over && S.sel.size);
}

function endDeal() {
  S.over = true;
  S.turn = -1;
  const last = [0, 1, 2, 3].find((i) => !S.order.includes(i));
  const order = [...S.order, last];
  const winner = order[0];
  const winTeam = TEAM[winner];
  const partnerPlace = TEAM[order[1]] === winTeam ? 2 : 3;
  const up = partnerPlace === 2 ? 3 : TEAM[order[2]] === winTeam ? 2 : 1;

  const from = S.level;
  const ours = TEAM[0] === winTeam;
  let to = from + up;
  let passed = false;
  if (to > 14) {
    to = 2;
    passed = true;
    S.wins += 1;
  }
  S.level = to;
  widget.storage.set("level", S.level).catch(() => {});
  widget.storage.set("wins", S.wins).catch(() => {});

  el.overTitle.textContent = ours
    ? t({ "zh-TW": "你方贏了這一局", "zh-CN": "你方赢了这一局", en: "Your team won the deal" })
    : t({ "zh-TW": "對方贏了這一局", "zh-CN": "对方赢了这一局", en: "The other team won the deal" });

  const places = order
    .map((seat, i) => `${i + 1}. ${t(SEAT[seat])}`)
    .join(" · ");
  const upgrade = passed
    ? t({
        "zh-TW": `打過 A，重新從 2 開始（第 ${S.wins} 次通關）`,
        "zh-CN": `打过 A，重新从 2 开始（第 ${S.wins} 次通关）`,
        en: `A was passed — back to 2 (clear #${S.wins})`,
      })
    : t({
        "zh-TW": `升 ${up} 級：${RANK_TEXT[from]} → ${RANK_TEXT[to]}`,
        "zh-CN": `升 ${up} 级：${RANK_TEXT[from]} → ${RANK_TEXT[to]}`,
        en: `Up ${up}: ${RANK_TEXT[from]} → ${RANK_TEXT[to]}`,
      });
  el.overBody.textContent = `${places}\n${upgrade}`;
  el.over.hidden = false;
  render();
  // The winner leads the next deal.
  el.again.dataset.leader = String(winner);
}

// ── wiring ──────────────────────────────────────────────────────────────────────

el.play.addEventListener("click", () => {
  if (S.turn !== 0 || S.over) return;
  const cards = S.hands[0].filter((c) => S.sel.has(c.id));
  const c = identify(cards, S.level);
  if (!c) {
    widget.util.toast(el.hand, t({ "zh-TW": "這幾張湊不成牌型", "zh-CN": "这几张凑不成牌型", en: "Those cards are not a combination" }));
    return;
  }
  if (!beats(c, S.trick && S.trick.combo)) {
    widget.util.toast(el.hand, t({ "zh-TW": "管不上", "zh-CN": "管不上", en: "Too small to beat it" }));
    return;
  }
  playCards(0, c);
});

el.pass.addEventListener("click", () => {
  if (S.turn !== 0 || S.over || !S.trick) return;
  passTurn(0);
});

el.hint.addEventListener("click", () => {
  if (S.turn !== 0 || S.over) return;
  const choice = aiChoose(0);
  if (!choice) {
    widget.util.toast(el.hand, t({ "zh-TW": "沒有能出的牌", "zh-CN": "没有能出的牌", en: "Nothing fits" }));
    return;
  }
  S.sel = new Set(choice.cards.map((c) => c.id));
  render();
});

el.again.addEventListener("click", () => {
  const leader = Number(el.again.dataset.leader || 0);
  newDeal(Number.isNaN(leader) ? 0 : leader);
});

el.overTitle.textContent = "";
el.again.textContent = t({ "zh-TW": "再來一局", "zh-CN": "再来一局", en: "Another deal" });
el.hint.textContent = t({ "zh-TW": "提示", "zh-CN": "提示", en: "Hint" });
el.pass.textContent = t({ "zh-TW": "不要", "zh-CN": "不要", en: "Pass" });
el.play.textContent = t({ "zh-TW": "出牌", "zh-CN": "出牌", en: "Play" });

function applySettings(s) {
  S.easy = (s.ai || "normal") === "easy";
}

applySettings(widget.settings.get());
widget.settings.onChange((s) => {
  applySettings(s);
  if (S.over) return;
  render();
});

/** One read of both stored values, then the first deal: a failed read still deals a fresh game. */
(async () => {
  try {
    const level = await widget.storage.get("level");
    if (!widget.settings.get("restart") && Number.isInteger(level) && level >= 2 && level <= 14) S.level = level;
    const wins = await widget.storage.get("wins");
    S.wins = Number.isInteger(wins) ? wins : 0;
  } catch (e) {
    widget.log(`guandan: storage unavailable: ${e.message}`);
  }
  newDeal(0);
})();
