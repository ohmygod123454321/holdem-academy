/* global window */
// =============================================================
// pokerExplain — hand/position/board classifiers, live GTO coach,
//                end-of-hand per-player narrative review.
// Built on top of window.PokerEngine. No state of its own.
// =============================================================
const PE = window.PokerEngine;

// ---------- Hand tiers (preflop) ----------
const HAND_TIERS = {
  premium:     { label: "Premium",       short: "頂級牌", color: "var(--gold)"  },
  strong:      { label: "Strong",        short: "強牌",   color: "var(--good)"  },
  broadway:    { label: "Broadway",      short: "高張組合", color: "var(--info)"},
  midpair:     { label: "Mid Pair",      short: "中對",   color: "var(--info)"  },
  smallpair:   { label: "Small Pair",    short: "小對",   color: "var(--warn)"  },
  suitedconn:  { label: "Suited Conn.",  short: "同花連",  color: "var(--info)" },
  suitedace:   { label: "Suited Ace",    short: "同花 A",  color: "var(--warn)" },
  speculative: { label: "Speculative",   short: "投機牌",  color: "var(--warn)" },
  trash:       { label: "Marginal",      short: "邊緣牌",  color: "var(--fg-dim)" },
};

function classifyHole(hole) {
  if (!hole || hole.length !== 2) return null;
  const code = PE.handCode(hole[0], hole[1]);
  const r1 = hole[0][0], r2 = hole[1][0];
  const suited = hole[0][1] === hole[1][1];
  const v1 = PE.RANK_VAL[r1], v2 = PE.RANK_VAL[r2];
  const hi = Math.max(v1, v2), lo = Math.min(v1, v2);
  const pair = v1 === v2;
  const gap = hi - lo;

  let tier;
  if (pair && hi >= 12) tier = "premium";
  else if (pair && hi >= 10) tier = "strong";
  else if (pair && hi >= 7) tier = "midpair";
  else if (pair) tier = "smallpair";
  else if (hi === 14 && lo === 13) tier = "premium"; // AK
  else if (hi === 14 && lo >= 11 && suited) tier = "strong";       // AQs AJs
  else if (hi === 14 && lo >= 11) tier = "broadway";               // AQo AJo
  else if (hi === 13 && lo === 12) tier = suited ? "strong" : "broadway"; // KQ
  else if (hi >= 13 && lo >= 10 && suited) tier = "broadway";
  else if (hi >= 13 && lo >= 10) tier = "broadway";
  else if (hi === 12 && lo === 11) tier = "broadway"; // QJ
  else if (suited && gap === 1 && hi <= 11 && lo >= 5) tier = "suitedconn";
  else if (suited && hi === 14) tier = "suitedace";
  else if (suited && gap <= 2 && lo >= 4) tier = "speculative";
  else if (suited) tier = "speculative";
  else tier = "trash";

  const strength = PE.preflopStrength(hole[0], hole[1]);
  return { code, tier, strength, ...HAND_TIERS[tier] };
}

// ---------- Position info ----------
const POSITIONS = {
  "BTN":    { role: "按鈕位",   rangeHint: "RFI ~45-50%",  edge: "最有利",     short: "BTN",
              advice: "位置最佳，可寬鬆開池與偷盲" },
  "CO":     { role: "倒二位",   rangeHint: "RFI ~25-30%",  edge: "後位",       short: "CO",
              advice: "次佳位置，廣開但避免邊際低牌" },
  "HJ":     { role: "副切位",   rangeHint: "RFI ~18-22%",  edge: "中後位",     short: "HJ",
              advice: "後面只剩 CO/BTN，可拉一點寬度" },
  "LJ":     { role: "前副切",   rangeHint: "RFI ~16-18%",  edge: "中位",       short: "LJ",
              advice: "後面還有三個位置，要謹慎" },
  "MP":     { role: "中位",     rangeHint: "RFI ~15-18%",  edge: "中位",       short: "MP",
              advice: "中等位置，避免邊際牌" },
  "UTG+1":  { role: "槍口後",   rangeHint: "RFI ~13-15%",  edge: "前位",       short: "UTG+1",
              advice: "範圍緊，幾乎只玩強牌" },
  "UTG":    { role: "槍口位",   rangeHint: "RFI ~11-13%",  edge: "最不利",     short: "UTG",
              advice: "後面所有人都有位置優勢，僅玩頂級" },
  "SB":     { role: "小盲",     rangeHint: "已投 0.5bb",   edge: "翻後 OOP",  short: "SB",
              advice: "位置最差，但已投入有低成本進池" },
  "BB":     { role: "大盲",     rangeHint: "已投 1bb",     edge: "翻後 OOP",  short: "BB",
              advice: "賠率最好，可極寬鬆防守" },
  "SB/BTN": { role: "按鈕小盲", rangeHint: "HU ~80%+",     edge: "HU 按鈕",   short: "BTN",
              advice: "單挑時範圍最寬，幾乎任牌可玩" },
};

function positionInfo(label) {
  return POSITIONS[label] || { role: label, rangeHint: "", edge: "", advice: "", short: label };
}

// Recommended RFI strength threshold by position (matches preflopStrength scale)
function openThreshFor(pos) {
  return { UTG: 62, "UTG+1": 58, MP: 55, LJ: 52, HJ: 48, CO: 44, BTN: 38, SB: 42, BB: 36, "SB/BTN": 32 }[pos] || 50;
}

// ---------- Made hand & draws on board ----------
function countDraws(hole, board) {
  const all = [...hole, ...board];
  const suitCount = {};
  for (const c of all) suitCount[c[1]] = (suitCount[c[1]] || 0) + 1;
  const flushMade = Object.values(suitCount).some(c => c >= 5);
  const flushDraw = !flushMade && Object.values(suitCount).some(c => c === 4);

  // straight: collect unique ranks (A as 14 and 1)
  const vals = [...new Set(all.map(c => PE.RANK_VAL[c[0]]))].sort((a, b) => a - b);
  if (vals.includes(14)) vals.unshift(1);
  let straightMade = false, straightDraw = false, gutshot = false;
  for (let i = 0; i + 4 < vals.length; i++) {
    if (vals[i + 4] - vals[i] === 4) { straightMade = true; break; }
  }
  if (!straightMade) {
    for (let lo = 1; lo <= 10; lo++) {
      const need = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
      const have = need.filter(v => vals.includes(v));
      if (have.length === 4) {
        // open-ended if missing end; gutshot if missing middle
        if (!vals.includes(lo) || !vals.includes(lo + 4)) straightDraw = true;
        else gutshot = true;
      }
    }
  }

  const boardMax = Math.max(...board.map(c => PE.RANK_VAL[c[0]]));
  const overcards = hole.every(c => PE.RANK_VAL[c[0]] > boardMax);
  return {
    flushMade, flushDraw, straightMade,
    straightDraw: straightDraw && !straightMade,
    gutshot: gutshot && !straightDraw && !straightMade,
    overcards,
  };
}

function classifyMadeHand(hole, board) {
  if (!hole || !board || board.length === 0) return null;
  const cards = [...hole, ...board].map(PE.parseCard);
  const rank = PE.bestOf7(cards);
  const cat = rank[0];
  const boardVals = board.map(c => PE.RANK_VAL[c[0]]).sort((a, b) => b - a);
  const holeVals = hole.map(c => PE.RANK_VAL[c[0]]);
  const draws = countDraws(hole, board);

  let label, strength;
  if (cat === 9) { label = rank[1] === 14 ? "皇家同花順" : "同花順"; strength = "nuts"; }
  else if (cat === 8) { label = "四條 Quads";                       strength = "monster"; }
  else if (cat === 7) { label = "葫蘆 Full House";                  strength = "monster"; }
  else if (cat === 6) { label = "同花 Flush";                       strength = "very_strong"; }
  else if (cat === 5) { label = "順子 Straight";                    strength = "very_strong"; }
  else if (cat === 4) {
    const tripsRank = rank[1];
    const inHole = holeVals.includes(tripsRank);
    label = inHole && holeVals[0] === holeVals[1] ? "暗三 Set" : "明三 Trips";
    strength = "very_strong";
  }
  else if (cat === 3) { label = "兩對 Two Pair";                    strength = "strong"; }
  else if (cat === 2) {
    const pairRank = rank[1];
    const topBoard = boardVals[0];
    const bothInHole = holeVals[0] === holeVals[1] && holeVals[0] === pairRank;
    const oneInHole = !bothInHole && holeVals.includes(pairRank);
    if (bothInHole) {
      if (pairRank > topBoard) { label = "超對 Overpair";   strength = "strong"; }
      else                     { label = "口袋對 (公牌過頭)"; strength = "medium"; }
    } else if (oneInHole) {
      const kicker = Math.max(...holeVals.filter(v => v !== pairRank));
      const kickerNote = kicker >= 13 ? "好踢腳" : kicker >= 10 ? "中等踢腳" : "弱踢腳";
      if (pairRank === topBoard)        { label = `頂對 (${kickerNote})`;     strength = "medium"; }
      else if (pairRank === boardVals[1]) { label = "中對 Middle Pair";        strength = "weak_made"; }
      else                                { label = "底對 Bottom Pair";        strength = "weak_made"; }
    } else {
      label = "公牌成對 (僅靠踢腳)"; strength = "weak_made";
    }
  } else {
    // high card with possible draws
    if (draws.flushDraw && draws.straightDraw) { label = "同花順聽牌 (~15 outs)"; strength = "draw_strong"; }
    else if (draws.flushDraw)                  { label = "同花聽牌 (~9 outs)";    strength = "draw_strong"; }
    else if (draws.straightDraw)               { label = "雙頭順聽 (~8 outs)";    strength = "draw_strong"; }
    else if (draws.gutshot && draws.overcards) { label = "卡張順 + 超牌";          strength = "draw_weak"; }
    else if (draws.gutshot)                    { label = "卡張順聽 (~4 outs)";    strength = "draw_weak"; }
    else if (draws.overcards)                  { label = "兩張超牌 (Air)";        strength = "air"; }
    else                                        { label = "空氣 (Air)";            strength = "air"; }
  }
  return { rank, cat, label, strength, draws };
}

// ---------- Board texture ----------
function boardTexture(board) {
  if (!board || board.length === 0) return null;
  const suits = {};
  for (const c of board) suits[c[1]] = (suits[c[1]] || 0) + 1;
  const flushMade = Object.values(suits).some(c => c >= 4);
  const flushDraw = !flushMade && Object.values(suits).some(c => c === 3);
  const monotone  = Object.values(suits).some(c => c === board.length);
  const vals = board.map(c => PE.RANK_VAL[c[0]]).sort((a, b) => b - a);
  const span = vals[0] - vals[vals.length - 1];
  const connected = span <= 4;
  const broadway = vals.filter(v => v >= 10).length >= 2;
  const paired = new Set(vals).size < vals.length;

  let label;
  if (monotone) label = "三同花 (Monotone)";
  else if (flushMade) label = "同花已成";
  else if (flushDraw && connected) label = "極濕 (同花+順聽)";
  else if (flushDraw) label = "兩同花";
  else if (paired && broadway) label = "高對牌面";
  else if (paired) label = "成對乾燥";
  else if (connected && broadway) label = "高連張 (動態)";
  else if (broadway) label = "高張 rainbow";
  else if (connected) label = "中連張";
  else if (span > 8) label = "乾燥散張";
  else label = "中等紋理";

  // who has range advantage on flop (very rough)
  let advantage;
  if (broadway || vals[0] >= 13) advantage = "進攻方 (Preflop raiser) 範圍優勢";
  else if (connected && vals[0] <= 9) advantage = "防守方 (Caller) 範圍優勢";
  else advantage = "範圍接近";

  return { label, advantage, flushDraw, flushMade, connected, broadway, paired, monotone };
}

// ============================================================
// LIVE GTO COACH — gtoAdvise(state, idx, precomputedEq?)
// Returns rich advice for the seat currently to act.
// ============================================================
function gtoAdvise(state, idx, precomputedEq) {
  const seat = state.seats[idx];
  if (!seat || !seat.hole) return null;
  const acts = PE.availableActions(state, idx);
  const labels = PE.positionLabels(state);
  const pos = labels[idx];
  const posInfo = positionInfo(pos);
  const hand = classifyHole(seat.hole);
  const isPreflop = state.street === "preflop";
  // Preflop everyone except the BB owes the blind, so acts.toCall > 0 is NOT a
  // reliable "facing a raise" signal. A pot is only truly raised once someone
  // puts in more than the big blind. Treat a limped/unopened pot as an RFI spot.
  const preflopUnopened = isPreflop && state.currentBet <= state.bb;
  const facing = acts.toCall > 0 && !preflopUnopened;

  let mix = [];
  const reasoning = [];

  if (isPreflop) {
    const s = hand.strength;
    const threshold = openThreshFor(pos);

    if (!facing) {
      // RFI from this seat
      if (s >= threshold + 18) {
        mix = [{ act: "raise", freq: 1.0, size: "2.5bb" }];
        reasoning.push(`${hand.code} 是 ${hand.short}，在 ${pos} 必開池。`);
        reasoning.push(`標準 RFI 大小 2.5bb — ${posInfo.advice}。`);
      } else if (s >= threshold) {
        mix = [{ act: "raise", freq: 0.8, size: "2.5bb" }, { act: "fold", freq: 0.2 }];
        reasoning.push(`${hand.code} 在 ${pos} 範圍中段，多數開池、少量 fold 平衡。`);
        reasoning.push(`${posInfo.rangeHint}。`);
      } else if (s >= threshold - 10 && (pos === "BTN" || pos === "CO" || pos === "SB")) {
        mix = [{ act: "raise", freq: 0.35, size: "2.5bb" }, { act: "fold", freq: 0.65 }];
        reasoning.push(`${hand.code} 屬頻率牌 (frequency hand)，主要 fold，少量偷盲混合。`);
      } else if (pos === "BB" && acts.options.includes("check")) {
        mix = [{ act: "check", freq: 1.0 }];
        reasoning.push(`沒人加注，BB 直接 check 看免費翻牌。`);
      } else {
        mix = [{ act: "fold", freq: 1.0 }];
        reasoning.push(`${hand.code} (${hand.short}) 在 ${pos} 不在開池範圍。`);
        reasoning.push(`${posInfo.advice}。`);
      }
    } else {
      // facing a raise — call / 3bet / fold
      if (s >= 88) {
        mix = [{ act: "raise", freq: 1.0, size: "3x" }];
        reasoning.push(`${hand.code} 屬 3-bet for value 範圍，建池為王。`);
      } else if (s >= 74) {
        mix = [{ act: "raise", freq: 0.55, size: "3x" }, { act: "call", freq: 0.45 }];
        reasoning.push(`${hand.code} 可 3-bet 也可 call，混合策略平衡 range。`);
        if (pos === "BTN" || pos === "CO") reasoning.push(`有位置時偏向 call、進入翻牌玩牌。`);
      } else if (s >= 58 && (pos === "BTN" || pos === "BB" || pos === "CO")) {
        mix = [{ act: "call", freq: 0.7 }, { act: "fold", freq: 0.3 }];
        reasoning.push(`${hand.code} 有位置/賠率，跟注看翻牌實現價值。`);
      } else if (pos === "BB" && acts.toCall <= state.bb * 3) {
        mix = [{ act: "call", freq: 0.5 }, { act: "fold", freq: 0.5 }];
        reasoning.push(`BB 賠率好 (~${Math.round(acts.toCall / (state.pot + acts.toCall) * 100)}%)，邊際牌可防守。`);
      } else {
        mix = [{ act: "fold", freq: 1.0 }];
        reasoning.push(`${hand.code} 面對 raise，EV 為負，棄牌。`);
      }
    }

    return {
      isPreflop: true, hand, pos, posInfo,
      madeHand: null, eq: null, texture: null,
      mix, primary: mix.reduce((a, b) => a.freq >= b.freq ? a : b),
      reasoning,
    };
  }

  // ----- POSTFLOP -----
  const live = state.seats.filter(p => p.inHand && !p.folded);
  const opps = Math.max(1, live.length - 1);
  const eq = precomputedEq != null ? precomputedEq : PE.equity(seat.hole, state.board, [], opps, 100);
  const made = classifyMadeHand(seat.hole, state.board);
  const tex = boardTexture(state.board);
  const potOdds = facing ? acts.toCall / (state.pot + acts.toCall) : 0;

  if (!facing) {
    if (eq >= 0.80) {
      mix = [{ act: "raise", freq: 0.85, size: "66-75% 池" }, { act: "check", freq: 0.15 }];
      reasoning.push(`持 ${made.label} (eq ~${Math.round(eq * 100)}%)，價值下注壓榨中對與聽牌。`);
      reasoning.push(`留小量 check 平衡，讓對手有空間反詐唬。`);
    } else if (eq >= 0.60) {
      mix = [{ act: "raise", freq: 0.70, size: "50% 池" }, { act: "check", freq: 0.30 }];
      reasoning.push(`${made.label}，eq ~${Math.round(eq * 100)}% 領先但脆弱，中尺度下注定義範圍。`);
    } else if (eq >= 0.42) {
      mix = [{ act: "check", freq: 0.65 }, { act: "raise", freq: 0.35, size: "33% 池" }];
      reasoning.push(`${made.label}，eq 中段，主 check 控池，少量 stab 維持 range。`);
    } else if (made.draws && (made.draws.flushDraw || made.draws.straightDraw)) {
      mix = [{ act: "raise", freq: 0.55, size: "50% 池" }, { act: "check", freq: 0.45 }];
      reasoning.push(`${made.label} 是半詐唬 (semi-bluff) 首選 — 即使被跟也有補牌權。`);
    } else {
      mix = [{ act: "check", freq: 1.0 }];
      reasoning.push(`${made.label}，eq 不足，check 看免費牌。`);
    }
  } else {
    if (eq >= 0.78) {
      mix = [{ act: "raise", freq: 0.7, size: "2.5-3x" }, { act: "call", freq: 0.3 }];
      reasoning.push(`${made.label}，eq ${Math.round(eq * 100)}% ≫ 需要勝率 ${Math.round(potOdds * 100)}%，加注為主榨價值。`);
    } else if (eq >= potOdds + 0.10) {
      mix = [{ act: "call", freq: 0.9 }, { act: "fold", freq: 0.1 }];
      reasoning.push(`${made.label}，eq ${Math.round(eq * 100)}% > 需要 ${Math.round(potOdds * 100)}%，跟注 +EV。`);
    } else if (eq >= potOdds) {
      mix = [{ act: "call", freq: 0.5 }, { act: "fold", freq: 0.5 }];
      reasoning.push(`邊際 — eq ${Math.round(eq * 100)}% 約等於賠率 ${Math.round(potOdds * 100)}%，GTO 中部分頻率防守。`);
    } else if (made.draws && (made.draws.flushDraw || made.draws.straightDraw)) {
      mix = [{ act: "call", freq: 0.65 }, { act: "fold", freq: 0.35 }];
      reasoning.push(`聽牌含 implied odds — 補上時可贏取對手繼續下注的籌碼。`);
    } else if (made.draws && made.draws.gutshot && acts.toCall < state.pot * 0.3) {
      mix = [{ act: "call", freq: 0.35 }, { act: "fold", freq: 0.65 }];
      reasoning.push(`卡張順小注可跟，多數情況棄。`);
    } else {
      mix = [{ act: "fold", freq: 1.0 }];
      reasoning.push(`${made.label}，eq ${Math.round(eq * 100)}% < 需要 ${Math.round(potOdds * 100)}%，棄牌。`);
    }
  }
  if (tex) reasoning.push(`紋理：${tex.label} — ${tex.advantage}。`);

  return {
    isPreflop: false, hand, pos, posInfo,
    madeHand: made, eq, texture: tex,
    mix, primary: mix.reduce((a, b) => a.freq >= b.freq ? a : b),
    reasoning,
  };
}

// ============================================================
// PER-PLAYER HAND REVIEW — buildHandReview(game)
// Returns one row per seat with their position, hole, made hand,
// and a narrative for every action they took.
// ============================================================
function buildHandReview(game) {
  const labels = PE.positionLabels(game);
  const rows = [];
  for (let i = 0; i < game.seats.length; i++) {
    const seat = game.seats[i];
    if (!seat.hole) continue;
    const actions = game.handHistory.filter(h => h.idx === i);
    const hand = classifyHole(seat.hole);
    const pos = labels[i];
    const posInfo = positionInfo(pos);
    const finalMade = !seat.folded ? classifyMadeHand(seat.hole, game.board) : null;

    const narrative = actions.map(h => explainAction(h, seat, game));

    const winner = game.winners ? game.winners.find(w => w.idx === i) : null;
    const won = !!winner;
    const winShare = winner ? winner.share : 0;
    const net = winShare - seat.committed;

    rows.push({
      idx: i, seat, isHuman: seat.isHuman, name: seat.name,
      style: seat.ai || (seat.isHuman ? "human" : "—"),
      hole: seat.hole, folded: seat.folded,
      pos, posInfo, hand, finalMade,
      committed: seat.committed, net, won, winShare,
      narrative,
      vpip: actions.some(a => a.street === "preflop" && (a.action === "call" || a.action === "raise")),
      pfr:  actions.some(a => a.street === "preflop" && a.action === "raise"),
    });
  }
  // sort: humans first, then by net descending
  rows.sort((a, b) => (a.isHuman ? -1 : b.isHuman ? 1 : b.net - a.net));
  return rows;
}

function explainAction(h, seat, game) {
  const ctx = h.ctx;
  if (!ctx) return { street: h.street, action: h.action, amount: h.amount, why: "—" };
  const hand = classifyHole(ctx.hole);
  const posInfo = positionInfo(ctx.pos);
  const facing = ctx.toCall > 0;
  const styleTag = styleLabel(ctx.aiStyle);
  const isPreflop = ctx.street === "preflop";

  let why;
  if (isPreflop) why = explainPreflopAction(h, ctx, hand, posInfo, styleTag, facing);
  else           why = explainPostflopAction(h, ctx, hand, posInfo, styleTag, facing);

  return {
    street: ctx.street,
    action: h.action,
    amount: h.amount,
    pos: ctx.pos,
    board: ctx.board,
    pot: ctx.pot,
    toCall: ctx.toCall,
    why,
  };
}

function styleLabel(style) {
  if (!style || style === "human") return null;
  if (style === "gto")   return { tag: "GTO",   note: "依 GTO 範圍與頻率" };
  if (style === "tight") return { tag: "Tight", note: "緊家風格 (TAG/Rock)" };
  if (style === "loose") return { tag: "Loose", note: "鬆兇風格 (LAG)" };
  return { tag: style, note: "" };
}

function explainPreflopAction(h, ctx, hand, posInfo, styleTag, facing) {
  const prefix = styleTag ? `[${styleTag.tag}] ` : "";
  if (h.action === "raise" && !facing) {
    const sz = Math.round(h.amount / (ctx.pot - h.amount + ctx.streetBet) * 10) / 10; // rough
    return `${prefix}在 ${ctx.pos} (${posInfo.role}) RFI 開池 ${h.amount}。`
         + `${hand.code} 是 ${hand.short}，` + (hand.tier === "premium" || hand.tier === "strong"
            ? `範圍核心 — 必開。`
            : `符合 ${posInfo.rangeHint}。`);
  }
  if (h.action === "raise" && facing) {
    return `${prefix}在 ${ctx.pos} 面對 raise，用 ${hand.code} (${hand.short}) 3-bet 到 ${h.amount}。`
         + (hand.tier === "premium" ? `頂級牌建池為王。` : `混合策略 — 用 ${hand.short} 平衡 3-bet range。`);
  }
  if (h.action === "call" && facing) {
    return `${prefix}在 ${ctx.pos} 用 ${hand.code} (${hand.short}) 跟注 ${ctx.toCall}。`
         + (ctx.pos === "BB" ? `BB 賠率好，邊際牌也可防守。` : `準備在翻牌爭奪，依賴位置或牌力實現價值。`);
  }
  if (h.action === "call" && !facing) {
    return `${prefix}在 SB 補注 — 賠率好，但翻後 OOP。`;
  }
  if (h.action === "check") {
    return `${prefix}BB 沒人加注，免費看翻牌。`;
  }
  if (h.action === "fold") {
    return `${prefix}${hand.code} (${hand.short}) 在 ${ctx.pos} 不在繼續範圍內 — ${posInfo.advice}。`;
  }
  return "—";
}

function explainPostflopAction(h, ctx, hand, posInfo, styleTag, facing) {
  const prefix = styleTag ? `[${styleTag.tag}] ` : "";
  const made = classifyMadeHand(ctx.hole, ctx.board);
  const tex = boardTexture(ctx.board);
  const handDesc = made ? made.label : hand.code;

  if (h.action === "raise" && !facing) {
    const sizingPct = ctx.pot > 0 ? Math.round((h.amount - ctx.streetBet) / ctx.pot * 100) : 0;
    let why;
    if (made.strength === "monster" || made.strength === "nuts" || made.strength === "very_strong") {
      why = `頂級牌主動建池榨取價值。`;
    } else if (made.strength === "strong" || made.strength === "medium") {
      why = `價值下注 — 對手範圍中的弱對與聽牌會跟。`;
    } else if (made.draws && (made.draws.flushDraw || made.draws.straightDraw)) {
      why = `半詐唬 — 即被跟也有 ~30%+ 補牌權。`;
    } else {
      why = `純詐唬，藉 ${tex ? tex.label : "牌面"} 攻擊對手 range 的弱點。`;
    }
    return `${prefix}持 ${handDesc}，下注 ${h.amount} (~${sizingPct}% 池)。${why}`;
  }
  if (h.action === "raise" && facing) {
    return `${prefix}持 ${handDesc} 面對下注選擇加注到 ${h.amount}。`
         + (made.strength === "monster" || made.strength === "very_strong" || made.strength === "strong"
            ? `價值升級，把底池做大。`
            : `平衡 raise range — 含詐唬與半詐唬。`);
  }
  if (h.action === "call" && facing) {
    const oddsPct = Math.round(ctx.toCall / (ctx.pot + ctx.toCall) * 100);
    let why;
    if (made.strength === "monster" || made.strength === "very_strong") why = `Slow-play 設陷阱，留空間讓對手繼續下注。`;
    else if (made.strength === "strong" || made.strength === "medium")  why = `中等強度，跟注控池避免被加注。`;
    else if (made.draws && (made.draws.flushDraw || made.draws.straightDraw)) why = `聽牌跟注 — 賠率充足。`;
    else if (made.strength === "weak_made") why = `弱成手 hero call — 對抗對手 bluff range。`;
    else why = `輕度跟注 — 賠率邊際 +EV。`;
    return `${prefix}持 ${handDesc} 跟注 ${ctx.toCall} (需 ${oddsPct}% 勝率)。${why}`;
  }
  if (h.action === "check") {
    let why;
    if (made.strength === "monster" || made.strength === "very_strong") why = `Slow-play / check-trap。`;
    else if (made.strength === "strong" || made.strength === "medium") why = `控池 — 不主動建池，誘對手 bluff。`;
    else if (made.draws && (made.draws.flushDraw || made.draws.straightDraw)) why = `check-call 拿賠率聽牌。`;
    else why = `range 中弱端，棄主動。`;
    return `${prefix}持 ${handDesc}，check。${why}`;
  }
  if (h.action === "fold") {
    return `${prefix}持 ${handDesc} 面對 ${ctx.toCall} (pot ${ctx.pot})。eq 不足以繼續，棄牌停損。`;
  }
  return "—";
}

// ============================================================
// Preflop RFI range matrix (13x13) for the live reference chart.
// Mirrors the same position thresholds the coach uses, so the chart and the
// per-hand advice stay consistent.
// ============================================================
const PREFLOP_RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

function rfiAction(pos, c1, c2) {
  const s = PE.preflopStrength(c1, c2);
  const t = openThreshFor(pos);
  if (s >= t) return "raise";
  // late positions mix in a wider, lower-frequency steal range
  if (s >= t - 10 && (pos === "BTN" || pos === "CO" || pos === "SB" || pos === "HJ")) return "mixed";
  return "fold";
}

// Build the standard hand matrix: suited in the upper-right triangle,
// offsuit in the lower-left, pairs on the diagonal.
function preflopRange(pos) {
  const R = PREFLOP_RANKS;
  const grid = [];
  for (let i = 0; i < 13; i++) {
    const row = [];
    for (let j = 0; j < 13; j++) {
      const hi = R[Math.min(i, j)], lo = R[Math.max(i, j)];
      let c1, c2, type, code;
      if (i === j) { c1 = R[i] + "s"; c2 = R[i] + "h"; type = "pair"; code = R[i] + R[i]; }
      else if (i < j) { c1 = hi + "s"; c2 = lo + "s"; type = "suited"; code = hi + lo + "s"; }
      else { c1 = hi + "s"; c2 = lo + "h"; type = "offsuit"; code = hi + lo + "o"; }
      row.push({ code, type, action: rfiAction(pos, c1, c2) });
    }
    grid.push(row);
  }
  return grid;
}

// ============================================================
window.PokerExplain = {
  classifyHole, classifyMadeHand, boardTexture, countDraws,
  positionInfo, openThreshFor, HAND_TIERS, POSITIONS,
  gtoAdvise, buildHandReview, explainAction,
  preflopRange, PREFLOP_RANKS,
};
