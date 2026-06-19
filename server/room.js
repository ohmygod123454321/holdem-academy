// Server-authoritative poker room.
// Reuses the SAME engine the browser uses (single source of truth).
// The full game state (including everyone's hole cards) lives here on the
// server; each client only ever receives a view tailored to them, so opponents'
// cards are never sent over the wire until showdown. -> strict anti-cheat.

const crypto = require("crypto");
const PE = require("../src/engine/pokerEngine.jsx");

function hashPw(pw) {
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}

function genCode() {
  // 4-char, no ambiguous chars (no O/0/I/1)
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

const MAX_SEATS = 9;

class Room {
  constructor(code, hostId, password, opts = {}) {
    this.code = code;
    this.hostId = hostId;
    this.passwordHash = password ? hashPw(password) : null;
    this.players = []; // { id, name, ws, connected }
    this.game = null;
    this.config = {
      sb: opts.sb || 10,
      bb: opts.bb || 20,
      startingStack: opts.startingStack || 2000,
      maxSeats: Math.max(2, Math.min(MAX_SEATS, opts.maxSeats || MAX_SEATS)),
    };
    this.createdAt = Date.now();
  }

  get started() { return !!this.game; }
  hasPassword() { return !!this.passwordHash; }
  checkPassword(pw) { return !this.passwordHash || hashPw(pw || "") === this.passwordHash; }

  getPlayer(id) { return this.players.find(p => p.id === id); }
  seatIndexOf(id) { return this.players.findIndex(p => p.id === id); }
  connectedCount() { return this.players.filter(p => p.connected).length; }

  addPlayer(player) {
    if (this.started) { const e = new Error("遊戲已開始，無法加入"); e.code = "IN_PROGRESS"; throw e; }
    if (this.players.length >= this.config.maxSeats) { const e = new Error("房間已滿"); e.code = "FULL"; throw e; }
    this.players.push(player);
  }

  // Between hands / pre-game we can fully drop a player; mid-hand we keep the
  // seat (mark disconnected) so seat indices stay aligned with game.seats.
  dropPlayer(id) {
    const i = this.seatIndexOf(id);
    if (i < 0) return;
    this.players.splice(i, 1);
    if (id === this.hostId && this.players.length) this.hostId = this.players[0].id;
  }

  startGame() {
    if (this.players.length < 2) { const e = new Error("至少需要 2 位玩家"); e.code = "NEED_PLAYERS"; throw e; }
    const players = this.players.map(p => ({ id: p.id, name: p.name, isHuman: true }));
    let g = PE.newGame({
      playerCount: players.length,
      sb: this.config.sb, bb: this.config.bb,
      startingStack: this.config.startingStack,
      players,
    });
    g = PE.startHand(g);
    this.game = g;
  }

  nextHand() {
    if (!this.game) return;
    this.game = PE.startHand(this.game);
  }

  // A busted player buys back in to the starting stack. They re-enter on the
  // next hand (they're already out of the current one).
  rebuy(playerId) {
    const g = this.game;
    if (!g) return false;
    const idx = this.seatIndexOf(playerId);
    if (idx < 0) return false;
    const seat = g.seats[idx];
    if (seat.stack > 0) return false;
    seat.stack = this.config.startingStack;
    return true;
  }

  applyAction(playerId, action) {
    const g = this.game;
    if (!g) { const e = new Error("遊戲尚未開始"); e.code = "NOT_STARTED"; throw e; }
    if (g.finished) { const e = new Error("本手已結束"); e.code = "HAND_OVER"; throw e; }
    const idx = this.seatIndexOf(playerId);
    if (g.toAct !== idx) { const e = new Error("還沒輪到你"); e.code = "NOT_YOUR_TURN"; throw e; }
    const legal = PE.availableActions(g, idx).options;
    const t = action && action.type;
    if (!legal.includes(t)) { const e = new Error("不合法的動作: " + t); e.code = "ILLEGAL"; throw e; }
    this.game = PE.applyAction(g, idx, action);
  }

  // If the player to act has disconnected, auto-fold (or check) so the table
  // doesn't freeze. Returns true if it advanced the game.
  autoActIfDisconnected() {
    const g = this.game;
    if (!g || g.finished) return false;
    const seat = this.players[g.toAct];
    if (!seat || seat.connected) return false;
    const acts = PE.availableActions(g, g.toAct);
    const action = acts.options.includes("check") ? { type: "check" } : { type: "fold" };
    this.game = PE.applyAction(g, g.toAct, action);
    return true;
  }

  // Tailored, privacy-safe view for one player.
  viewFor(playerId) {
    const g = this.game;
    const myIdx = this.seatIndexOf(playerId);
    if (!g) return { started: false, mySeat: myIdx };

    const seats = g.seats.map((s, i) => {
      const reveal = i === myIdx || (g.finished && !s.folded && s.inHand);
      return {
        name: s.name,
        stack: s.stack,
        folded: s.folded,
        allin: s.allin,
        inHand: s.inHand,
        streetBet: s.streetBet,
        committed: s.committed,
        lastAction: s.lastAction,
        connected: this.players[i] ? this.players[i].connected : false,
        // opponents' hole cards are NEVER sent until showdown
        hole: s.hole ? (reveal ? s.hole : [null, null]) : null,
      };
    });

    const view = {
      started: true,
      handNo: g.handNo,
      street: g.street,
      board: g.board,
      pot: g.pot,
      currentBet: g.currentBet,
      bb: g.bb, sb: g.sb,
      dealerIdx: g.dealerIdx,
      toAct: g.toAct,
      finished: g.finished,
      winners: g.winners,
      labels: PE.positionLabels(g),
      seats,
      mySeat: myIdx,
    };
    if (!g.finished && g.toAct === myIdx) {
      view.legalActions = PE.availableActions(g, myIdx);
    }
    return view;
  }

  meta() {
    return {
      code: this.code,
      hostId: this.hostId,
      hasPassword: this.hasPassword(),
      started: this.started,
      config: this.config,
      players: this.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    };
  }
}

module.exports = { Room, hashPw, genCode, MAX_SEATS };
