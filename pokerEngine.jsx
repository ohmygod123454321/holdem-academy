/* global window */
// ============================================================
// poker engine — deck / shuffle / 7-card evaluator / game state
// ============================================================

const RANK_VAL = { "2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"T":10,"J":11,"Q":12,"K":13,"A":14 };
const VAL_RANK = { 2:"2",3:"3",4:"4",5:"5",6:"6",7:"7",8:"8",9:"9",10:"T",11:"J",12:"Q",13:"K",14:"A" };
const SUITS_E = ["s","h","d","c"];

function makeDeck() {
  const d = [];
  for (const r of Object.keys(RANK_VAL)) for (const s of SUITS_E) d.push(r + s);
  return d;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function parseCard(c) { return { r: RANK_VAL[c[0]], s: c[1] }; }

// ----- 5-card evaluator -----
function eval5(cards) {
  const ranks = cards.map(c => c.r).sort((a, b) => b - a);
  const suits = cards.map(c => c.s);
  const flush = suits.every(s => s === suits[0]);
  const uniq = [...new Set(ranks)];
  let straight = false, top = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) { straight = true; top = uniq[0]; }
    else if (uniq[0] === 14 && uniq[1] === 5) { straight = true; top = 5; }
  }
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => [+r, c])
    .sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (straight && flush) return [9, top];
  if (groups[0][1] === 4) return [8, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [7, groups[0][0], groups[1][0]];
  if (flush) return [6, ...ranks];
  if (straight) return [5, top];
  if (groups[0][1] === 3) return [4, groups[0][0], groups[1][0], groups[2][0]];
  if (groups[0][1] === 2 && groups[1][1] === 2) return [3, groups[0][0], groups[1][0], groups[2][0]];
  if (groups[0][1] === 2) return [2, groups[0][0], groups[1][0], groups[2][0], groups[3][0]];
  return [1, ...ranks];
}
function compareRanks(a, b) {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}
function bestOf7(cards) {
  // cards: 5-7 parsed cards
  if (cards.length <= 5) return eval5(cards);
  let best = null;
  const n = cards.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const five = [];
    for (let k = 0; k < n; k++) if (k !== i && k !== j) five.push(cards[k]);
    const r = eval5(five);
    if (!best || compareRanks(r, best) > 0) best = r;
  }
  return best;
}
function rankName(r) {
  const cat = r[0];
  const names = ["", "高牌", "一對", "兩對", "三條", "順子", "同花", "葫蘆", "四條", "同花順"];
  if (cat === 9 && r[1] === 14) return "皇家同花順";
  return names[cat] || "—";
}

// ----- equity (Monte Carlo) -----
function equity(heroStrs, boardStrs, deadStrs, vsCount, iters = 120) {
  if (heroStrs.length !== 2) return 0.5;
  const all = makeDeck().filter(c =>
    !heroStrs.includes(c) && !boardStrs.includes(c) && !(deadStrs || []).includes(c));
  const heroParsed = heroStrs.map(parseCard);
  const boardParsed = boardStrs.map(parseCard);
  let win = 0, tie = 0;
  for (let i = 0; i < iters; i++) {
    const deck = shuffle(all);
    let p = 0;
    const villains = [];
    for (let v = 0; v < vsCount; v++) {
      villains.push([deck[p++], deck[p++]].map(parseCard));
    }
    const board = boardParsed.slice();
    while (board.length < 5) board.push(parseCard(deck[p++]));
    const heroRank = bestOf7([...heroParsed, ...board]);
    let bestRank = null;
    for (const v of villains) {
      const r = bestOf7([...v, ...board]);
      if (!bestRank || compareRanks(r, bestRank) > 0) bestRank = r;
    }
    const c = compareRanks(heroRank, bestRank);
    if (c > 0) win++;
    else if (c === 0) tie++;
  }
  return (win + tie / 2) / iters;
}

// ----- preflop hand strength (0-100) -----
// Quick lookup by hand code (e.g. "AKs", "TT")
function handCode(c1, c2) {
  const r1 = c1[0], r2 = c2[0], s1 = c1[1], s2 = c2[1];
  const i1 = RANK_VAL[r1], i2 = RANK_VAL[r2];
  if (i1 === i2) return r1 + r2;
  const hi = i1 > i2 ? r1 : r2;
  const lo = i1 > i2 ? r2 : r1;
  return hi + lo + (s1 === s2 ? "s" : "o");
}
// approximate preflop strength (Chen-ish, normalized 0-100)
function preflopStrength(c1, c2) {
  const code = handCode(c1, c2);
  if (code in HS_TABLE) return HS_TABLE[code];
  // generate
  const r1 = RANK_VAL[c1[0]], r2 = RANK_VAL[c2[0]];
  if (r1 === r2) return Math.min(100, 30 + r1 * 4);
  const suited = c1[1] === c2[1];
  const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
  const gap = hi - lo;
  let s = (hi - 2) * 2.2 + (lo - 2) * 1.0;
  if (suited) s += 8;
  if (gap === 1) s += 6; else if (gap === 2) s += 3; else s -= gap;
  if (hi === 14) s += 4;
  return Math.max(5, Math.min(95, s));
}

// hand-coded for top hands so AI behaves recognisably
const HS_TABLE = {
  AA: 100, KK: 95, QQ: 90, JJ: 85, TT: 80, "99": 74, "88": 68, "77": 62, "66": 56, "55": 50, "44": 44, "33": 40, "22": 36,
  AKs: 88, AKo: 82, AQs: 78, AQo: 72, AJs: 74, AJo: 65, ATs: 70, ATo: 60, A9s: 64, A9o: 50, A8s: 60, A8o: 46,
  KQs: 70, KQo: 62, KJs: 66, KJo: 56, KTs: 62, KTo: 52,
  QJs: 62, QJo: 52, QTs: 58, JTs: 56, T9s: 52, "98s": 48, "87s": 44, "76s": 40, "65s": 36, "54s": 32,
};

// ----- game state -----
function newGame({ playerCount, sb, bb, startingStack, players }) {
  // players: [{id, name, ai, stack?}]
  const seats = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    isHuman: !!p.isHuman,
    ai: p.ai || null,
    stack: p.stack ?? startingStack,
    seat: i,
    hole: null,
    inHand: false,
    folded: false,
    allin: false,
    committed: 0,    // total chips committed in current hand
    streetBet: 0,    // chips put in this street
    actedThisStreet: false,
    lastAction: null,
  }));
  return {
    seats,
    sb, bb,
    handNo: 0,
    dealerIdx: -1, // increments before first hand
    deck: [],
    board: [],
    pot: 0,
    pots: [], // side pots
    street: "idle",
    toAct: -1,
    currentBet: 0,
    minRaise: bb,
    lastRaiser: -1,
    log: [],
    handHistory: [], // per-hand actions
    finished: false,
    winners: null,
    inputRequired: null, // for human action
  };
}

function startHand(state) {
  const s = state;
  // rotate dealer
  const n = s.seats.length;
  let next = (s.dealerIdx + 1) % n;
  // skip players without chips
  let safety = 0;
  while (s.seats[next].stack <= 0 && safety < n) { next = (next + 1) % n; safety++; }
  s.dealerIdx = next;
  s.handNo += 1;
  s.deck = shuffle(makeDeck());
  s.board = [];
  s.pot = 0;
  s.pots = [];
  s.street = "preflop";
  s.currentBet = 0;
  s.minRaise = s.bb;
  s.lastRaiser = -1;
  s.log = [];
  s.handHistory = [];
  s.finished = false;
  s.winners = null;
  s.inputRequired = null;

  // reset seats
  for (const seat of s.seats) {
    seat.hole = null;
    seat.inHand = seat.stack > 0;
    seat.folded = false;
    seat.allin = false;
    seat.committed = 0;
    seat.streetBet = 0;
    seat.actedThisStreet = false;
    seat.lastAction = null;
  }
  const active = s.seats.filter(p => p.inHand);
  if (active.length < 2) { s.finished = true; return s; }

  // deal hole cards (2 each, dealing order from SB)
  let dealStart;
  if (active.length === 2) {
    // heads-up: dealer is SB; deal to non-dealer first
    dealStart = nextActiveIdx(s, s.dealerIdx);
  } else {
    dealStart = nextActiveIdx(s, s.dealerIdx);
  }
  for (let pass = 0; pass < 2; pass++) {
    let idx = dealStart;
    for (let count = 0; count < active.length; count++) {
      const seat = s.seats[idx];
      if (!seat.hole) seat.hole = [];
      seat.hole.push(s.deck.pop());
      idx = nextActiveIdx(s, idx);
    }
  }

  // post blinds
  let sbIdx, bbIdx;
  if (active.length === 2) {
    sbIdx = s.dealerIdx;
    bbIdx = nextActiveIdx(s, s.dealerIdx);
  } else {
    sbIdx = nextActiveIdx(s, s.dealerIdx);
    bbIdx = nextActiveIdx(s, sbIdx);
  }
  postBet(s, sbIdx, s.sb, "blind SB");
  postBet(s, bbIdx, s.bb, "blind BB");
  s.currentBet = s.bb;
  s.lastRaiser = bbIdx;

  // set first to act
  s.toAct = nextActiveIdx(s, bbIdx);
  s.inputRequired = needsInput(s);
  return s;
}

function nextActiveIdx(state, from) {
  const n = state.seats.length;
  let i = (from + 1) % n;
  let safety = 0;
  while (safety < n) {
    const seat = state.seats[i];
    if (seat.inHand && !seat.folded && !seat.allin) return i;
    i = (i + 1) % n;
    safety++;
  }
  return -1;
}
function nextEligibleAny(state, from) {
  // returns next still in hand (folded excluded, allin allowed for showdown order)
  const n = state.seats.length;
  let i = (from + 1) % n;
  let safety = 0;
  while (safety < n) {
    const seat = state.seats[i];
    if (seat.inHand && !seat.folded) return i;
    i = (i + 1) % n;
    safety++;
  }
  return -1;
}

function postBet(state, idx, amount, why) {
  const seat = state.seats[idx];
  const chips = Math.min(amount, seat.stack);
  seat.stack -= chips;
  seat.streetBet += chips;
  seat.committed += chips;
  state.pot += chips;
  if (seat.stack === 0) seat.allin = true;
  state.log.push({ idx, action: why, amount: chips });
}

function needsInput(state) {
  if (state.toAct < 0) return null;
  const seat = state.seats[state.toAct];
  if (!seat || !seat.isHuman) return null;
  return availableActions(state, state.toAct);
}

function availableActions(state, idx) {
  const seat = state.seats[idx];
  const toCall = state.currentBet - seat.streetBet;
  const acts = ["fold"];
  if (toCall <= 0) acts.push("check");
  else acts.push("call");
  // raise/bet
  const stillToActOthers = state.seats.some((s2, i2) =>
    i2 !== idx && s2.inHand && !s2.folded && !s2.allin && s2.stack > 0);
  if (seat.stack > toCall && stillToActOthers) {
    acts.push("raise");
  }
  return {
    options: acts,
    toCall: Math.max(0, toCall),
    minRaise: Math.max(state.minRaise + state.currentBet, state.currentBet * 2 || state.bb * 2),
    maxRaise: seat.stack + seat.streetBet,
    pot: state.pot,
    stack: seat.stack,
  };
}

function applyAction(state, idx, action) {
  // action: { type: 'fold'|'check'|'call'|'raise', amount? } amount = total streetBet target
  const seat = state.seats[idx];
  const toCall = state.currentBet - seat.streetBet;
  // capture pre-action context for replay/review
  const _labelsForCtx = positionLabels(state);
  const ctxBefore = {
    street: state.street,
    pos: _labelsForCtx[idx],
    pot: state.pot,
    toCall: Math.max(0, toCall),
    currentBet: state.currentBet,
    streetBet: seat.streetBet,
    hole: seat.hole ? seat.hole.slice() : null,
    board: state.board.slice(),
    aiStyle: seat.ai,
    stack: seat.stack,
  };
  if (action.type === "fold") {
    seat.folded = true;
    seat.lastAction = "Fold";
  } else if (action.type === "check") {
    seat.lastAction = "Check";
  } else if (action.type === "call") {
    const c = Math.min(toCall, seat.stack);
    postBet(state, idx, c, "call");
    seat.lastAction = c === 0 ? "Check" : ("Call " + c);
  } else if (action.type === "raise") {
    // amount = total target (streetBet desired). Could also be 'bet' first action.
    let target = action.amount;
    target = Math.max(target, state.currentBet + state.minRaise);
    // can't exceed stack+streetBet (allin)
    target = Math.min(target, seat.streetBet + seat.stack);
    const add = target - seat.streetBet;
    postBet(state, idx, add, "raise");
    state.minRaise = target - state.currentBet;
    state.currentBet = target;
    state.lastRaiser = idx;
    seat.lastAction = (state.currentBet === target && toCall === 0 ? "Bet " : "Raise ") + target;
    // reset actedThisStreet for others (they need to respond)
    for (let i = 0; i < state.seats.length; i++) {
      if (i !== idx) state.seats[i].actedThisStreet = false;
    }
  }
  seat.actedThisStreet = true;
  state.handHistory.push({ street: state.street, idx, action: action.type, amount: action.amount, ctx: ctxBefore });
  return advance(state);
}

function advance(state) {
  // check if hand should end (everyone folded but one)
  const live = state.seats.filter(p => p.inHand && !p.folded);
  if (live.length === 1) {
    return endHand(state, [{ idx: state.seats.indexOf(live[0]), share: state.pot, reason: "uncontested" }]);
  }

  // check if street complete
  const nonAllin = live.filter(p => !p.allin);
  const allActed = nonAllin.every(p => p.actedThisStreet && p.streetBet === state.currentBet);
  const onlyOneActable = nonAllin.length <= 1;

  if (allActed || onlyOneActable) {
    // street done — go to next or showdown
    return nextStreet(state);
  }

  // pass action
  state.toAct = nextActiveIdx(state, state.toAct);
  state.inputRequired = needsInput(state);
  return state;
}

function nextStreet(state) {
  // reset street bets
  for (const s2 of state.seats) {
    s2.streetBet = 0;
    s2.actedThisStreet = false;
  }
  state.currentBet = 0;
  state.minRaise = state.bb;
  state.lastRaiser = -1;

  if (state.street === "preflop") {
    state.street = "flop";
    state.board = [state.deck.pop(), state.deck.pop(), state.deck.pop()];
  } else if (state.street === "flop") {
    state.street = "turn";
    state.board.push(state.deck.pop());
  } else if (state.street === "turn") {
    state.street = "river";
    state.board.push(state.deck.pop());
  } else if (state.street === "river") {
    return showdown(state);
  }

  // set first to act = first live player after dealer (postflop)
  state.toAct = nextActiveIdx(state, state.dealerIdx);
  // if no one can act (everyone allin), skip to next
  if (state.toAct < 0) return nextStreet(state);
  state.inputRequired = needsInput(state);
  return state;
}

function showdown(state) {
  const live = state.seats
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.inHand && !x.p.folded);

  // compute side pots
  const sortedBy = live.slice().sort((a, b) => a.p.committed - b.p.committed);
  const allCommitted = state.seats.filter(p => p.committed > 0)
    .map(p => ({ p, committed: p.committed, idx: state.seats.indexOf(p) }));
  // build pots
  const pots = [];
  let prev = 0;
  const eligibleSet = sortedBy.map(x => x.i);
  const remainingByIdx = {};
  for (const c of allCommitted) remainingByIdx[c.idx] = c.committed;
  const handLevels = [...new Set(sortedBy.map(x => x.p.committed))].sort((a, b) => a - b);
  for (const lvl of handLevels) {
    let amount = 0;
    const eligibleHere = sortedBy.filter(x => x.p.committed >= lvl).map(x => x.i);
    for (const idx in remainingByIdx) {
      const take = Math.min(lvl - prev, remainingByIdx[idx]);
      if (take > 0) {
        amount += take;
        remainingByIdx[idx] -= take;
      }
    }
    if (amount > 0) pots.push({ amount, eligible: eligibleHere });
    prev = lvl;
  }
  // any remaining (folded above max live) — give to highest pot
  let extra = 0;
  for (const idx in remainingByIdx) extra += remainingByIdx[idx];
  if (extra > 0 && pots.length) pots[pots.length - 1].amount += extra;

  // evaluate each live player's best 7-card hand
  const ranked = live.map(x => ({
    idx: x.i,
    seat: x.p,
    rank: bestOf7([...x.p.hole.map(parseCard), ...state.board.map(parseCard)]),
  }));

  const winnersOut = [];
  for (const pot of pots) {
    const candidates = ranked.filter(r => pot.eligible.includes(r.idx));
    if (!candidates.length) continue;
    let best = candidates[0].rank;
    for (const c of candidates) if (compareRanks(c.rank, best) > 0) best = c.rank;
    const tied = candidates.filter(c => compareRanks(c.rank, best) === 0);
    const share = Math.floor(pot.amount / tied.length);
    const remainder = pot.amount - share * tied.length;
    tied.forEach((t, i) => {
      const give = share + (i < remainder ? 1 : 0);
      winnersOut.push({ idx: t.idx, share: give, rank: t.rank, reason: rankName(t.rank) });
    });
  }
  return endHand(state, winnersOut);
}

function endHand(state, winners) {
  // distribute
  for (const w of winners) {
    state.seats[w.idx].stack += w.share;
  }
  state.winners = winners;
  state.street = "showdown";
  state.finished = true;
  state.toAct = -1;
  state.inputRequired = null;
  return state;
}

// ----- helpers -----
function positionLabels(state) {
  // Return position name for each seat depending on player count and dealer
  const n = state.seats.filter(s => s.inHand).length;
  const order = []; // around table starting from SB
  if (n < 2) return state.seats.map(() => "");
  // build list of in-hand indices in seat order starting from dealer+1
  let idx = state.dealerIdx;
  let count = 0;
  const seq = [];
  const total = state.seats.length;
  for (let k = 0; k < total; k++) {
    const i = (idx + 1 + k) % total;
    if (state.seats[i].inHand) seq.push(i);
  }
  // seq[0] = SB (or BTN/SB in heads-up)
  let names;
  if (n === 2) names = ["SB/BTN", "BB"];
  else if (n === 3) names = ["SB", "BB", "BTN"];
  else if (n === 4) names = ["SB", "BB", "CO", "BTN"];
  else if (n === 5) names = ["SB", "BB", "UTG", "CO", "BTN"];
  else if (n === 6) names = ["SB", "BB", "UTG", "MP", "CO", "BTN"];
  else if (n === 7) names = ["SB", "BB", "UTG", "MP", "HJ", "CO", "BTN"];
  else if (n === 8) names = ["SB", "BB", "UTG", "UTG+1", "MP", "HJ", "CO", "BTN"];
  else names = ["SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN"];
  const labels = state.seats.map(() => "");
  seq.forEach((i, k) => { labels[i] = names[k] || ""; });
  return labels;
}

window.PokerEngine = {
  RANK_VAL, makeDeck, shuffle, parseCard,
  eval5, bestOf7, compareRanks, rankName,
  equity, handCode, preflopStrength,
  newGame, startHand, applyAction, availableActions,
  positionLabels, nextActiveIdx,
};
