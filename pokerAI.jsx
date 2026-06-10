/* global window */
// AI brains — three styles built on top of preflopStrength + Monte Carlo equity
// Each AI returns an action: {type:'fold'|'check'|'call'|'raise', amount?}
const PE = window.PokerEngine;

function aiDecide(state, idx, style = "gto") {
  const seat = state.seats[idx];
  const acts = PE.availableActions(state, idx);
  const toCall = acts.toCall;
  const pot = state.pot;
  const isPreflop = state.street === "preflop";

  // hand reps
  const live = state.seats.filter(p => p.inHand && !p.folded);
  const opps = Math.max(1, live.length - 1);

  // style modifiers
  const M = STYLE[style] || STYLE.gto;

  if (isPreflop) {
    return preflopAI(state, idx, seat, acts, M, opps);
  } else {
    return postflopAI(state, idx, seat, acts, M, opps);
  }
}

const STYLE = {
  gto:   { openThresh: 50, callThresh: 45, threeBetThresh: 75, bluffFreq: 0.18, callDownLimit: 0.35, valueBetMin: 0.55, raiseMin: 0.72 },
  loose: { openThresh: 38, callThresh: 32, threeBetThresh: 68, bluffFreq: 0.32, callDownLimit: 0.22, valueBetMin: 0.48, raiseMin: 0.65 },
  tight: { openThresh: 62, callThresh: 56, threeBetThresh: 82, bluffFreq: 0.06, callDownLimit: 0.45, valueBetMin: 0.62, raiseMin: 0.80 },
};

function preflopAI(state, idx, seat, acts, M, opps) {
  const [c1, c2] = seat.hole;
  const strength = PE.preflopStrength(c1, c2);
  const opens = state.lastRaiser !== -1 && state.lastRaiser !== idx;
  const raisers = state.seats.filter(p => p.lastAction && /Raise|Bet/.test(p.lastAction)).length;

  // No one raised yet — RFI scenario
  if (!opens || (state.currentBet === state.bb && state.lastRaiser === -1)) {
    if (strength >= M.openThresh) {
      const target = state.bb * 2.5;
      return { type: "raise", amount: Math.min(target, seat.stack + seat.streetBet) };
    }
    if (acts.toCall === 0) return { type: "check" };
    return { type: "fold" };
  }

  // Facing a raise / 3-bet
  // Compare strength vs thresholds
  if (strength >= M.threeBetThresh) {
    const target = state.currentBet * 3;
    return { type: "raise", amount: Math.min(target, seat.stack + seat.streetBet) };
  }
  if (strength >= M.callThresh && acts.toCall <= seat.stack * 0.15) {
    return { type: "call" };
  }
  // big bet — fold most
  if (acts.toCall === 0) return { type: "check" };
  // some bluff defense for loose
  if (Math.random() < M.bluffFreq * 0.4 && acts.toCall <= seat.stack * 0.05) {
    return { type: "call" };
  }
  return { type: "fold" };
}

function postflopAI(state, idx, seat, acts, M, opps) {
  // Estimate equity quickly
  const dead = state.seats.filter(p => p !== seat && p.hole).flatMap(p => p.hole);
  const eq = PE.equity(seat.hole, state.board, dead, opps, 60);
  const toCall = acts.toCall;
  const pot = state.pot;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  // No one bet yet
  if (toCall === 0) {
    // value bet?
    if (eq >= M.raiseMin) {
      const sz = Math.round(pot * (eq > 0.85 ? 0.75 : 0.55));
      return { type: "raise", amount: Math.max(state.bb, Math.min(sz, seat.stack)) };
    }
    if (eq >= M.valueBetMin) {
      const sz = Math.round(pot * 0.4);
      return { type: "raise", amount: Math.max(state.bb, Math.min(sz, seat.stack)) };
    }
    // bluff?
    if (Math.random() < M.bluffFreq && state.street !== "river") {
      const sz = Math.round(pot * 0.4);
      return { type: "raise", amount: Math.max(state.bb, Math.min(sz, seat.stack)) };
    }
    return { type: "check" };
  }

  // Facing a bet
  // very strong — raise
  if (eq >= M.raiseMin) {
    const target = Math.round((pot + toCall * 2) * 1.0 + state.currentBet);
    return { type: "raise", amount: Math.min(target, seat.stack + seat.streetBet) };
  }
  // call if equity > pot odds + cushion
  if (eq >= potOdds + 0.04 && eq >= M.callDownLimit) {
    return { type: "call" };
  }
  // hero call sometimes for loose
  if (Math.random() < M.bluffFreq * 0.3 && toCall < seat.stack * 0.2) {
    return { type: "call" };
  }
  return { type: "fold" };
}

window.PokerAI = { aiDecide, STYLE };
