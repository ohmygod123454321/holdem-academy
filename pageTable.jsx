/* global React, useState, useEffect, useRef, useMemo, PageHeader, Section, PlayingCard, ChipStack, Pill, Bar, Stat */
const PE = window.PokerEngine;
const PAI = window.PokerAI;
const PEX = window.PokerExplain;

// ============================================================
// Tournament mode · 錦標賽 schedule + state
// ============================================================
const MTT_SPEEDS = {
  turbo:   { label: "Turbo",      hands: 6,  growth: 1.50, anteAt: 3, desc: "每級 6 手 · 盲注 ×1.5" },
  regular: { label: "Regular",    hands: 10, growth: 1.40, anteAt: 4, desc: "每級 10 手 · 盲注 ×1.4" },
  deep:    { label: "Deep Stack", hands: 14, growth: 1.30, anteAt: 5, desc: "每級 14 手 · 盲注 ×1.3" },
};

const MTT_PRIZE_STRUCT = {
  3: { paid: 1, pct: [100] },
  6: { paid: 2, pct: [65, 35] },
  9: { paid: 3, pct: [50, 30, 20] },
};

// Starting blinds for MTT (chip units; starting stack = 200bb = 20000)
const MTT_START_BB = 100;
const MTT_START_STACK_BB = 200;

function buildMttLevels(speed) {
  const cfg = MTT_SPEEDS[speed];
  const levels = [];
  let bb = MTT_START_BB;
  for (let i = 0; i < 18; i++) {
    levels.push({
      idx: i + 1,
      sb: Math.round(bb / 2 / 5) * 5 || Math.round(bb / 2),
      bb: Math.round(bb / 10) * 10 || Math.round(bb),
      ante: i >= cfg.anteAt ? Math.round(bb * 0.125 / 5) * 5 : 0,
    });
    bb = bb * cfg.growth;
  }
  return levels;
}

function makeTournament(speed, seats) {
  const struct = MTT_PRIZE_STRUCT[seats] || MTT_PRIZE_STRUCT[6];
  const buyin = MTT_START_STACK_BB * MTT_START_BB; // 20000 chips per seat (notional)
  const pool = buyin * seats;
  return {
    speed,
    levels: buildMttLevels(speed),
    levelIdx: 0,
    handsPerLevel: MTT_SPEEDS[speed].hands,
    handsThisLevel: 0,
    paid: struct.paid,
    prizes: struct.pct.map(p => Math.round(pool * p / 100)),
    pool,
    seats,
    eliminations: [], // [{idx, name, place, prize}]
  };
}

// Post antes after startHand (engine doesn't natively support antes).
function postAntes(game, anteAmount) {
  if (!anteAmount) return game;
  for (const seat of game.seats) {
    if (!seat.inHand) continue;
    const ante = Math.min(anteAmount, seat.stack);
    if (ante <= 0) continue;
    seat.stack -= ante;
    seat.committed += ante;
    game.pot += ante;
    if (seat.stack === 0) seat.allin = true;
  }
  return game;
}

// After a hand finishes, detect newly-busted players and award places.
function detectEliminations(game, tourney) {
  const aliveBefore = tourney.seats - tourney.eliminations.length;
  const newlyBusted = game.seats
    .map((s, i) => ({ s, i }))
    .filter(x => x.s.stack === 0 && !tourney.eliminations.some(e => e.idx === x.i));
  if (newlyBusted.length === 0) return tourney;

  // sort by committed asc → smaller stack busts first (worse place)
  newlyBusted.sort((a, b) => a.s.committed - b.s.committed);

  const elims = tourney.eliminations.slice();
  // place = alive count after this bust (so first bust of a 6-seat = 6th, last alive = 1st)
  let placeCursor = aliveBefore;
  for (const x of newlyBusted) {
    const place = placeCursor;
    placeCursor -= 1;
    const prize = place <= tourney.paid ? tourney.prizes[place - 1] : 0;
    elims.push({ idx: x.i, name: x.s.name, place, prize });
  }
  return { ...tourney, eliminations: elims };
}

function tournamentDone(tourney) {
  return tourney.seats - tourney.eliminations.length <= 1;
}

function getAliveSeats(game) {
  return game.seats.filter(s => s.stack > 0);
}

// $-EV via Malmuth-Harville for currently alive players (used in HUD).
function icmDollar(stacks, prizes) {
  const n = stacks.length;
  const numP = Math.min(prizes.length, n);
  const result = new Array(n).fill(0);
  function recurse(remaining, place, probSoFar) {
    if (place >= numP || remaining.length === 0) return;
    let sumRem = 0;
    for (const i of remaining) sumRem += stacks[i];
    if (sumRem <= 0) return;
    for (const i of remaining) {
      const p = probSoFar * (stacks[i] / sumRem);
      result[i] += p * prizes[place];
      if (place + 1 < numP) {
        const next = remaining.filter(x => x !== i);
        recurse(next, place + 1, p);
      }
    }
  }
  recurse(stacks.map((_, i) => i), 0, 1);
  return result;
}

function PageTable() {
  const [setup, setSetup] = useState({
    mode: "cash", // "cash" | "mtt"
    seats: 6,
    stack: 100, // bb (cash)
    sb: 50, bb: 100,
    aiMix: "balanced",
    mttSpeed: "regular",
  });
  const [game, setGame] = useState(null);
  const [tourney, setTourney] = useState(null); // null when cash, object when MTT
  const [aiThinking, setAiThinking] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [betAmount, setBetAmount] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [handFeedback, setHandFeedback] = useState(null);
  const [autoNext, setAutoNext] = useState(false);

  function startNewGame() {
    const isMTT = setup.mode === "mtt";
    const tInit = isMTT ? makeTournament(setup.mttSpeed, setup.seats) : null;
    const initSB = isMTT ? tInit.levels[0].sb : setup.sb;
    const initBB = isMTT ? tInit.levels[0].bb : setup.bb;
    const initStack = isMTT
      ? MTT_START_STACK_BB * MTT_START_BB
      : setup.stack * setup.bb;
    const players = makePlayers(setup, initStack);
    let g = PE.newGame({
      playerCount: setup.seats,
      sb: initSB, bb: initBB,
      startingStack: initStack,
      players,
    });
    g = PE.startHand(g);
    if (isMTT) g = postAntes(g, tInit.levels[0].ante);
    setGame({ ...g });
    setTourney(tInit);
    setShowCards(false);
    setHandFeedback(null);
    setFeedback([]);
  }
  function startNextHand() {
    if (!game) return;
    // MTT: advance level if needed; update game.sb/bb; mark eliminations
    let t = tourney;
    let g = game;
    if (t) {
      t = detectEliminations(g, t);
      // Tournament over?
      if (tournamentDone(t)) {
        setTourney(t);
        // Keep game as is — finalScreen will render
        return;
      }
      // Advance level?
      const newHandsThisLevel = t.handsThisLevel + 1;
      if (newHandsThisLevel >= t.handsPerLevel && t.levelIdx < t.levels.length - 1) {
        t = { ...t, levelIdx: t.levelIdx + 1, handsThisLevel: 0 };
      } else {
        t = { ...t, handsThisLevel: newHandsThisLevel };
      }
      const lvl = t.levels[t.levelIdx];
      g = { ...g, sb: lvl.sb, bb: lvl.bb };
    }
    let next = PE.startHand(g);
    if (t) next = postAntes(next, t.levels[t.levelIdx].ante);
    setGame({ ...next });
    setTourney(t);
    setShowCards(false);
    setHandFeedback(null);
    setFeedback([]);
  }

  // AI auto-play
  useEffect(() => {
    if (!game || game.finished) return;
    const seat = game.seats[game.toAct];
    if (!seat || seat.isHuman) return;
    setAiThinking(true);
    const t = setTimeout(() => {
      const action = PAI.aiDecide(game, game.toAct, seat.ai);
      const next = PE.applyAction(game, game.toAct, action);
      setGame({ ...next });
      setAiThinking(false);
    }, 650);
    return () => { clearTimeout(t); setAiThinking(false); };
  }, [game]);

  // when finished, build feedback
  useEffect(() => {
    if (!game || !game.finished || handFeedback) return;
    const human = game.seats.find(s => s.isHuman);
    if (!human) return;
    const myActions = game.handHistory.filter(h => h.idx === game.seats.indexOf(human));
    setHandFeedback(buildFeedback(game, human, myActions));
    setShowCards(true);
    // MTT: detect eliminations now so the banner / endscreen renders immediately
    if (tourney) {
      const tNext = detectEliminations(game, tourney);
      if (tNext !== tourney) setTourney(tNext);
    }
    if (autoNext) {
      const t = setTimeout(() => startNextHand(), 3500);
      return () => clearTimeout(t);
    }
  }, [game]);

  // When facing bet, suggest betAmount
  useEffect(() => {
    if (!game || !game.inputRequired) return;
    const acts = game.inputRequired;
    setBetAmount(Math.min(acts.maxRaise, Math.max(acts.minRaise, Math.round(game.pot * 0.66 + acts.toCall))));
  }, [game?.inputRequired]);

  if (!game) {
    return <SetupScreen setup={setup} setSetup={setSetup} onStart={startNewGame} />;
  }

  const human = game.seats.find(s => s.isHuman);
  const humanIdx = game.seats.indexOf(human);
  const humanBusted = tourney && human && human.stack === 0;
  const tournamentEnded = tourney && tournamentDone(tourney);
  const myTurn = game.toAct === humanIdx && !game.finished && human && !human.folded && human.stack > 0;
  const labels = PE.positionLabels(game);

  return (
    <div>
      <PageHeader
        eyebrow={(tourney ? "MTT · Level " + tourney.levels[tourney.levelIdx].idx : "Cash") + " · Hand #" + game.handNo}
        title={tourney ? "錦標賽練習桌" : "現金桌練習"}
        sub={tourney
          ? setup.seats + " 人 MTT · " + MTT_SPEEDS[tourney.speed].label + " · 進獎金 " + tourney.paid + "/" + setup.seats + " · 起始 200bb"
          : setup.seats + " 人桌 · " + setup.sb + "/" + setup.bb + " · 起始 " + setup.stack + "bb · AI: " + setup.aiMix}
        right={
          <div className="row gap-12">
            <button className="btn btn-ghost btn-sm" onClick={() => { setGame(null); setTourney(null); }}>離桌</button>
            <button className="btn btn-sm" onClick={() => setAutoNext(a => !a)}
              style={{ borderColor: autoNext ? "var(--gold)" : "var(--line)", color: autoNext ? "var(--gold)" : "var(--cream)" }}>
              {autoNext ? "✓ 自動下一手" : "自動下一手"}
            </button>
          </div>
        }
      />

      {tourney && <TournamentHUD tourney={tourney} game={game} humanIdx={humanIdx} />}
      {tournamentEnded && (
        <TournamentEndScreen tourney={tourney} game={game} humanIdx={humanIdx}
          onRestart={() => { setGame(null); setTourney(null); }} />
      )}
      {humanBusted && !tournamentEnded && (
        <BustedBanner tourney={tourney} humanIdx={humanIdx} />
      )}

      <div className="poker-grid">
        <div style={{ minWidth: 0 }}>
          <TableView game={game} labels={labels} showAll={showCards} humanIdx={humanIdx} aiThinking={aiThinking} />

          {/* Action panel */}
          <div className="card mt-24" style={{ padding: "20px 24px" }}>
            {game.finished ? (
              <div>
                <div className="row between mb-16">
                  <div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>
                    {game.winners?.map(w => game.seats[w.idx].name + " 贏 " + w.share + (w.reason ? " (" + w.reason + ")" : "")).join("、")}
                  </div>
                  <button className="btn btn-primary" onClick={startNextHand}>下一手 →</button>
                </div>
                {handFeedback && <HandReviewPanel game={game} fb={handFeedback} />}
              </div>
            ) : myTurn ? (
              <ActionControls
                acts={game.inputRequired}
                pot={game.pot}
                bb={game.bb}
                stack={human.stack}
                streetBet={human.streetBet}
                betAmount={betAmount}
                setBetAmount={setBetAmount}
                onAction={(action) => {
                  const next = PE.applyAction(game, humanIdx, action);
                  setGame({ ...next });
                }}
              />
            ) : (
              <div className="row gap-16" style={{ minHeight: 56, alignItems: "center" }}>
                <span className="mono text-faint">等待 {game.seats[game.toAct]?.name}…</span>
                {aiThinking && <span className="mono text-gold">⋯ thinking</span>}
              </div>
            )}
          </div>
        </div>

        <SidePanel game={game} labels={labels} human={human} humanIdx={humanIdx} />

        {/* far-right GTO range column (wide screens only; falls back to inline
            inside the side panel on narrower screens) */}
        <div className="gto-col-wide">
          <GtoRangeChart
            defaultPos={labels[humanIdx] || "BTN"}
            holeCode={human && human.hole ? PE.handCode(human.hole[0], human.hole[1]) : null}
          />
        </div>
      </div>
    </div>
  );
}

// ----- Setup Screen -----
function SetupScreen({ setup, setSetup, onStart }) {
  const SEAT_OPTS = setup.mode === "mtt" ? [3, 6, 9] : [3, 6, 9];
  const STACK_OPTS = [20, 50, 100, 200];
  const MIX_OPTS = [
    { v: "balanced", label: "均衡 (各種風格混合)" },
    { v: "gto",      label: "全 GTO 標準" },
    { v: "tight",    label: "全緊家 (ABC poker)" },
    { v: "loose",    label: "全鬆兇 (派對桌)" },
    { v: "mixed",    label: "深水區 (挑戰級)" },
  ];
  const isMTT = setup.mode === "mtt";

  return (
    <div>
      <PageHeader
        eyebrow="Live Practice · 練習桌"
        title="坐下來打一局"
        sub="選好模式、桌型與對手風格，馬上開打。每一手結束後系統會分析你的決策。"
      />

      {/* Mode toggle */}
      <div className="card mb-24" style={{ padding: 0, overflow: "hidden" }}>
        <div className="row" style={{ gap: 0 }}>
          {[
            { v: "cash", label: "現金桌",   sub: "固定盲注、不淘汰、隨時起身" },
            { v: "mtt",  label: "錦標賽 MTT", sub: "盲注上升、有 ante、淘汰、ICM 與獎金" },
          ].map(m => {
            const active = setup.mode === m.v;
            return (
              <button key={m.v}
                onClick={() => setSetup({ ...setup, mode: m.v })}
                style={{
                  flex: 1, padding: "22px 24px",
                  background: active ? "linear-gradient(180deg, rgba(201,165,92,0.14), rgba(201,165,92,0.04))" : "transparent",
                  border: "none",
                  borderRight: m.v === "cash" ? "1px solid var(--line)" : "none",
                  cursor: "pointer", textAlign: "left",
                  color: "var(--cream)",
                }}>
                <div className="row gap-12" style={{ alignItems: "center" }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%",
                    background: active ? "var(--gold)" : "transparent",
                    border: "2px solid " + (active ? "var(--gold)" : "var(--line-bright)"),
                  }} />
                  <div>
                    <div className="serif" style={{ fontSize: 19, fontWeight: 700, color: active ? "var(--cream)" : "var(--fg-dim)" }}>
                      {m.label}
                    </div>
                    <div className="mono text-dim mt-4" style={{ fontSize: 11 }}>{m.sub}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 24 }}>
        <div className="card">
          <div className="card-eyebrow mb-16">桌型 · 玩家數</div>
          <div className="row gap-12">
            {SEAT_OPTS.map(n => (
              <button key={n}
                onClick={() => setSetup({ ...setup, seats: n })}
                style={{
                  flex: 1, padding: "22px 14px", borderRadius: 10,
                  background: setup.seats === n ? "linear-gradient(180deg, var(--felt-light), var(--felt))" : "transparent",
                  border: "1.5px solid " + (setup.seats === n ? "var(--gold)" : "var(--line)"),
                  color: "var(--cream)", cursor: "pointer", textAlign: "center",
                }}>
                <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: setup.seats === n ? "var(--gold)" : "var(--cream)" }}>{n}</div>
                <div className="mono text-dim mt-8" style={{ fontSize: 11 }}>
                  {isMTT
                    ? (MTT_PRIZE_STRUCT[n] ? "領 " + MTT_PRIZE_STRUCT[n].paid + " 名" : "—")
                    : (n === 3 ? "短桌 · 手快" : n === 6 ? "6-max · 主流" : "Full Ring · 經典")}
                </div>
              </button>
            ))}
          </div>

          {!isMTT && (
            <>
              <div className="card-eyebrow mb-16 mt-32">起始籌碼</div>
              <div className="row gap-8">
                {STACK_OPTS.map(s => (
                  <button key={s}
                    onClick={() => setSetup({ ...setup, stack: s })}
                    className="btn btn-sm"
                    style={{
                      flex: 1,
                      background: setup.stack === s ? "var(--gold)" : "transparent",
                      color: setup.stack === s ? "var(--ink)" : "var(--cream)",
                      borderColor: setup.stack === s ? "var(--gold)" : "var(--line)",
                      fontWeight: setup.stack === s ? 700 : 400,
                    }}>{s}bb</button>
                ))}
              </div>

              <div className="card-eyebrow mb-16 mt-32">盲注</div>
              <div className="text-dim mono" style={{ fontSize: 13 }}>
                SB <span className="text-gold">{setup.sb}</span> / BB <span className="text-gold">{setup.bb}</span>
                <span className="text-faint" style={{ marginLeft: 8 }}>(可在 Tweaks 調整)</span>
              </div>
            </>
          )}

          {isMTT && (
            <>
              <div className="card-eyebrow mb-16 mt-32">盲注速度</div>
              <div className="col gap-8">
                {Object.entries(MTT_SPEEDS).map(([k, v]) => (
                  <button key={k}
                    onClick={() => setSetup({ ...setup, mttSpeed: k })}
                    style={{
                      padding: "12px 14px", borderRadius: 8,
                      background: setup.mttSpeed === k ? "rgba(201,165,92,0.1)" : "transparent",
                      border: "1.5px solid " + (setup.mttSpeed === k ? "var(--gold)" : "var(--line)"),
                      color: "var(--cream)", cursor: "pointer", textAlign: "left",
                    }}>
                    <div className="row between" style={{ alignItems: "baseline" }}>
                      <span className="serif" style={{ fontSize: 15, fontWeight: 600 }}>{v.label}</span>
                      <span className="mono text-gold" style={{ fontSize: 11 }}>×{v.growth.toFixed(2)} / 級</span>
                    </div>
                    <div className="mono text-dim mt-4" style={{ fontSize: 11 }}>{v.desc}</div>
                  </button>
                ))}
              </div>

              <div className="card-eyebrow mb-8 mt-32">獎金結構</div>
              <div className="mono text-dim" style={{ fontSize: 12, lineHeight: 1.7 }}>
                {(MTT_PRIZE_STRUCT[setup.seats] || MTT_PRIZE_STRUCT[6]).pct.map((p, i) =>
                  <div key={i}>第 {i+1} 名 · <span className="text-gold">{p}%</span> · ${Math.round(p * setup.seats * MTT_START_STACK_BB * MTT_START_BB / 100).toLocaleString()}</div>
                )}
                <div className="text-faint mt-8" style={{ fontSize: 11 }}>
                  總獎金 ${(setup.seats * MTT_START_STACK_BB * MTT_START_BB).toLocaleString()} · 起始 {MTT_START_STACK_BB}bb ({MTT_START_STACK_BB * MTT_START_BB} chips)
                </div>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-eyebrow mb-16">對手風格</div>
          <div className="col gap-8">
            {MIX_OPTS.map(m => (
              <button key={m.v}
                onClick={() => setSetup({ ...setup, aiMix: m.v })}
                style={{
                  padding: "14px 16px", borderRadius: 8,
                  background: setup.aiMix === m.v ? "rgba(201,165,92,0.1)" : "transparent",
                  border: "1.5px solid " + (setup.aiMix === m.v ? "var(--gold)" : "var(--line)"),
                  color: "var(--cream)", cursor: "pointer", textAlign: "left",
                }}>
                <div className="serif" style={{ fontSize: 16, fontWeight: 600 }}>{m.label}</div>
                <div className="mono text-dim mt-8" style={{ fontSize: 11 }}>{describeMix(m.v)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="row center mt-32">
        <button className="btn btn-primary" style={{ padding: "14px 32px", fontSize: 15 }} onClick={onStart}>
          {isMTT ? "開始錦標賽 →" : "開始牌局 →"}
        </button>
      </div>
    </div>
  );
}

function describeMix(v) {
  return {
    balanced: "對手有 GTO、緊、鬆三種風格混合",
    gto: "所有對手都按 GTO 範圍與頻率打 — 最難",
    tight: "對手只玩好牌、鮮少詐唬 — 適合練偷盲",
    loose: "對手鬆兇、亂跟亂詐唬 — 適合練價值下注",
    mixed: "包含詐唬機器、calling station 與職業 reg 的混合桌",
  }[v];
}

function makePlayers(setup, startingStack) {
  const { seats, aiMix } = setup;
  const stackChips = startingStack != null ? startingStack : setup.stack * setup.bb;
  const players = [];
  // human at seat 0 (will be repositioned by dealer rotation)
  players.push({ id: "you", name: "你", isHuman: true, stack: stackChips });
  // ai
  const styleSeq = mixSequence(aiMix, seats - 1);
  const NAMES = ["Mira", "Doyle", "Phil", "Vivian", "Kai", "Ren", "Ada", "Otto"];
  for (let i = 0; i < seats - 1; i++) {
    players.push({ id: "ai" + i, name: NAMES[i % NAMES.length], ai: styleSeq[i], stack: stackChips });
  }
  return players;
}
function mixSequence(mix, n) {
  if (mix === "gto")   return Array(n).fill("gto");
  if (mix === "tight") return Array(n).fill("tight");
  if (mix === "loose") return Array(n).fill("loose");
  if (mix === "mixed") {
    const pool = ["loose","loose","gto","tight","loose","gto"];
    return Array(n).fill(0).map((_, i) => pool[i % pool.length]);
  }
  // balanced
  const pool = ["gto","tight","loose","gto","loose","tight","gto","loose"];
  return Array(n).fill(0).map((_, i) => pool[i % pool.length]);
}

// ----- Table view (responsive, % based) -----
function TableView({ game, labels, showAll, humanIdx, aiThinking }) {
  const seats = game.seats;
  const n = seats.length;

  // place human at bottom
  function angleFor(i) {
    const offset = i - humanIdx;
    return (Math.PI / 2) + (offset / n) * Math.PI * 2;
  }

  // Responsive aspect ratio table; everything uses % positioning
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", background: "var(--felt-deep)" }}>
      <div style={{
        position: "relative", width: "100%",
        aspectRatio: "16 / 10",
        minHeight: 380,
      }}>
        {/* felt ellipse */}
        <div className="felt" style={{
          position: "absolute", left: "7%", right: "7%", top: "14%", bottom: "14%",
          borderRadius: 999,
        }} />

        {/* board area centered */}
        <div style={{
          position: "absolute", left: "50%", top: "50%",
          transform: "translate(-50%, -50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
          zIndex: 2,
        }}>
          <div className="row gap-6" style={{ minHeight: 64 }}>
            {game.board.map((c, i) => <PlayingCard key={i} card={c} size={48} />)}
            {Array.from({ length: 5 - game.board.length }).map((_, i) => (
              <div key={i} style={{
                width: 48, height: 68, borderRadius: 4,
                border: "1.5px dashed rgba(244,234,208,0.18)",
              }} />
            ))}
          </div>
          <div className="mono" style={{ fontSize: 12, color: "var(--gold)", letterSpacing: "0.18em", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            POT {game.pot}
          </div>
        </div>

        {/* seats positioned around ellipse using % */}
        {seats.map((seat, i) => {
          const a = angleFor(i);
          // ellipse radii in percent (to span almost full card)
          const rxPct = 40, ryPct = 36;
          const xPct = 50 + Math.cos(a) * rxPct;
          const yPct = 50 + Math.sin(a) * ryPct;
          return <SeatView key={i}
            seat={seat}
            label={labels[i]}
            xPct={xPct} yPct={yPct}
            isToAct={game.toAct === i && !game.finished}
            showCards={seat.isHuman || showAll}
            isDealer={i === game.dealerIdx}
          />;
        })}
      </div>
    </div>
  );
}

function SeatView({ seat, label, xPct, yPct, isToAct, showCards, isDealer }) {
  const isFolded = seat.folded;
  return (
    <div style={{
      position: "absolute",
      left: xPct + "%", top: yPct + "%",
      transform: "translate(-50%, -50%)",
      width: 156, opacity: isFolded ? 0.4 : 1,
      transition: "opacity .3s",
      zIndex: 3,
    }}>
      {/* cards above */}
      <div className="row center gap-4" style={{ minHeight: 50, marginBottom: 6 }}>
        {seat.hole && !isFolded ? (
          showCards
            ? seat.hole.map((c, i) => <PlayingCard key={i} card={c} size={58} />)
            : <>
                <div className="pcard back" style={{ "--w": "51px" }} />
                <div className="pcard back" style={{ "--w": "51px" }} />
              </>
        ) : isFolded && seat.hole ? null : null}
      </div>
      {/* nameplate */}
      <div style={{
        background: isToAct ? "linear-gradient(180deg, var(--gold-bright), var(--gold))" : "var(--felt-deep)",
        color: isToAct ? "var(--ink)" : "var(--cream)",
        border: "1.5px solid " + (isToAct ? "var(--gold-bright)" : "var(--line-bright)"),
        borderRadius: 8,
        padding: "8px 12px",
        textAlign: "center",
        boxShadow: isToAct ? "0 0 0 4px rgba(201,165,92,0.25), 0 4px 12px rgba(0,0,0,0.6)" : "0 4px 12px rgba(0,0,0,0.5)",
        transition: "all .2s",
      }}>
        <div className="row between" style={{ fontSize: 12 }}>
          <span style={{ fontWeight: 700, fontFamily: "var(--serif)" }}>{seat.name}</span>
          <span className="mono" style={{ fontSize: 10, opacity: 0.7 }}>{label}</span>
        </div>
        <div className="mono" style={{ fontSize: 13, marginTop: 4 }}>
          ${seat.stack}
        </div>
        {seat.lastAction && (
          <div className="mono" style={{
            fontSize: 10, marginTop: 4,
            color: isToAct ? "var(--ink)" : "var(--gold)", opacity: 0.85,
          }}>{seat.lastAction}</div>
        )}
      </div>
      {seat.streetBet > 0 && (
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: -2, fontSize: 11, fontFamily: "var(--mono)", color: "var(--gold)" }}>
          ↓ {seat.streetBet}
        </div>
      )}
      {isDealer && (
        <div style={{
          position: "absolute", right: -8, top: -8,
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--cream)", color: "var(--ink)",
          fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)",
          display: "grid", placeItems: "center",
          border: "2px solid var(--gold)",
        }}>D</div>
      )}
      {seat.ai && (
        <div style={{
          position: "absolute", left: -4, top: -8,
          fontSize: 9, fontFamily: "var(--mono)", letterSpacing: "0.1em",
          color: aiBadgeColor(seat.ai), textTransform: "uppercase",
        }}>{seat.ai}</div>
      )}
    </div>
  );
}
function aiBadgeColor(ai) {
  return { gto: "var(--gold)", tight: "var(--info)", loose: "var(--bad)" }[ai] || "var(--fg-dim)";
}

// ----- Action controls -----
function ActionControls({ acts, pot, bb, stack, streetBet, betAmount, setBetAmount, onAction }) {
  const presets = [
    { label: "1/3", v: Math.round(pot / 3) + acts.toCall + streetBet },
    { label: "1/2", v: Math.round(pot / 2) + acts.toCall + streetBet },
    { label: "2/3", v: Math.round(pot * 2 / 3) + acts.toCall + streetBet },
    { label: "Pot", v: pot + acts.toCall + streetBet },
    { label: "All-in", v: acts.maxRaise },
  ];

  return (
    <div>
      <div className="row between mb-16">
        <div className="row gap-16">
          <Pill tone="gold">底池 {pot}</Pill>
          {acts.toCall > 0 ? (
            <Pill tone="warn">需跟 {acts.toCall} · 賠率 {Math.round(acts.toCall / (pot + acts.toCall) * 100)}%</Pill>
          ) : (
            <Pill tone="good">免費看牌 (Check)</Pill>
          )}
        </div>
        <span className="mono text-dim" style={{ fontSize: 12 }}>Stack ${stack}</span>
      </div>

      <div className="row gap-12 mb-16">
        <button className="btn" style={{ flex: 1, padding: "14px", background: "rgba(217,111,94,0.15)", borderColor: "rgba(217,111,94,0.4)" }}
          onClick={() => onAction({ type: "fold" })}>
          Fold · 棄牌
        </button>
        {acts.options.includes("check") && (
          <button className="btn" style={{ flex: 1, padding: "14px" }}
            onClick={() => onAction({ type: "check" })}>
            Check · 過牌
          </button>
        )}
        {acts.options.includes("call") && (
          <button className="btn" style={{ flex: 1, padding: "14px", background: "rgba(111,194,138,0.12)", borderColor: "rgba(111,194,138,0.4)" }}
            onClick={() => onAction({ type: "call" })}>
            Call · 跟 {acts.toCall}
          </button>
        )}
        {acts.options.includes("raise") && (
          <button className="btn btn-primary" style={{ flex: 1, padding: "14px" }}
            onClick={() => onAction({ type: "raise", amount: betAmount })}>
            {acts.toCall > 0 ? "Raise" : "Bet"} → {betAmount}
          </button>
        )}
      </div>

      {acts.options.includes("raise") && (
        <div>
          <div className="row between mb-8">
            <div className="row gap-4">
              {presets.map(p => (
                <button key={p.label}
                  className="btn btn-sm btn-ghost"
                  style={{ padding: "4px 10px" }}
                  onClick={() => setBetAmount(Math.min(acts.maxRaise, Math.max(acts.minRaise, p.v)))}>
                  {p.label}
                </button>
              ))}
            </div>
            <span className="mono text-gold" style={{ fontSize: 12 }}>{betAmount}</span>
          </div>
          <input type="range"
            min={acts.minRaise} max={acts.maxRaise} value={betAmount}
            onChange={e => setBetAmount(parseInt(e.target.value, 10))}
            style={{ width: "100%", accentColor: "var(--gold)" }}
          />
          <div className="row between mt-8">
            <span className="mono text-faint" style={{ fontSize: 10 }}>min {acts.minRaise}</span>
            <span className="mono text-faint" style={{ fontSize: 10 }}>max {acts.maxRaise}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Side panel: equity, hint, log -----
function SidePanel({ game, labels, human, humanIdx }) {
  const myTurn = game.toAct === humanIdx && !game.finished && !human?.folded;
  const live = game.seats.filter(p => p.inHand && !p.folded);
  const opps = Math.max(1, live.length - 1);

  // equity hint (computed only when my turn or for showdown reveal)
  const eq = useMemo(() => {
    if (!human || !human.hole || human.folded) return null;
    const dead = []; // only my hole + board known to me
    return PE.equity(human.hole, game.board, dead, opps, 80);
  }, [game.handHistory.length, game.street, game.finished, human?.hole?.join("")]);

  const acts = game.inputRequired;
  const potOdds = acts && acts.toCall > 0 ? acts.toCall / (game.pot + acts.toCall) : 0;
  const evCall = eq != null && acts && acts.toCall > 0
    ? Math.round(eq * (game.pot + acts.toCall) - (1 - eq) * acts.toCall)
    : null;

  return (
    <div className="col gap-16">
      <div className="card">
        <div className="card-eyebrow mb-8">即時數據</div>
        <div className="col gap-12">
          <div className="row between"><span className="text-dim">階段</span><span className="mono text-gold">{game.street}</span></div>
          <div className="row between"><span className="text-dim">活躍對手</span><span className="mono">{opps} 人</span></div>
          <div className="row between"><span className="text-dim">底池</span><span className="mono text-gold">{game.pot}</span></div>
          {eq != null && (
            <>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                <div className="row between mb-8">
                  <span className="text-dim">你的勝率</span>
                  <span className="mono text-gold" style={{ fontSize: 16 }}>{Math.round(eq * 100)}%</span>
                </div>
                <Bar value={eq * 100} color="var(--gold)" height={6} />
              </div>
              {acts && acts.toCall > 0 && (
                <>
                  <div className="row between">
                    <span className="text-dim">需要勝率</span>
                    <span className="mono" style={{ color: eq >= potOdds ? "var(--good)" : "var(--bad)" }}>
                      {Math.round(potOdds * 100)}%
                    </span>
                  </div>
                  <div className="row between">
                    <span className="text-dim">Call 的 EV</span>
                    <span className="mono" style={{ color: evCall >= 0 ? "var(--good)" : "var(--bad)" }}>
                      {evCall >= 0 ? "+" : ""}{evCall}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {myTurn && human && human.hole && (
        <GtoCoach game={game} humanIdx={humanIdx} eq={eq} />
      )}

      <div className="gto-inline">
        <GtoRangeChart
          defaultPos={labels[humanIdx] || "BTN"}
          holeCode={human && human.hole ? PE.handCode(human.hole[0], human.hole[1]) : null}
        />
      </div>

      <div className="card">
        <div className="card-eyebrow mb-8">行動紀錄</div>
        <div style={{ maxHeight: 280, overflowY: "auto", fontFamily: "var(--mono)", fontSize: 12 }}>
          {game.handHistory.length === 0 && <div className="text-faint">尚未開始…</div>}
          {game.handHistory.map((h, i) => (
            <div key={i} className="row between" style={{ padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-dim">{h.street}</span>
              <span>{game.seats[h.idx].name}</span>
              <span className="text-gold">{h.action}{h.amount ? " " + h.amount : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ----- GTO preflop range chart (live reference) -----
const RANGE_POSITIONS = ["UTG", "UTG+1", "MP", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
function GtoRangeChart({ defaultPos, holeCode }) {
  const [pos, setPos] = useState(() => RANGE_POSITIONS.includes(defaultPos) ? defaultPos : "BTN");
  // follow the hero's seat as the hand rotates, until the user picks manually
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    if (!pinned && defaultPos && RANGE_POSITIONS.includes(defaultPos)) setPos(defaultPos);
  }, [defaultPos, pinned]);

  const grid = useMemo(() => (PEX ? PEX.preflopRange(pos) : []), [pos]);
  if (!PEX) return null;

  return (
    <div className="card">
      <div className="row between mb-8">
        <div className="card-eyebrow">GTO 開池範圍 · RFI</div>
        <select className="gto-pos-select" value={pos}
          onChange={e => { setPinned(true); setPos(e.target.value); }}>
          {RANGE_POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="gto-grid">
        {grid.map((row, i) => row.map((cell, j) => (
          <div key={i + "-" + j}
            className={"gto-cell gto-" + cell.action + (cell.code === holeCode ? " gto-hl" : "")}
            title={cell.code + " · " + (cell.action === "raise" ? "開加注" : cell.action === "mixed" ? "混合/偷盲" : "棄牌")}>
            {cell.code}
          </div>
        )))}
      </div>
      <div className="gto-legend">
        <span><i className="gto-raise" />開加注</span>
        <span><i className="gto-mixed" />混合/偷盲</span>
        <span><i className="gto-fold" />棄牌</span>
      </div>
      <div className="mono text-faint" style={{ fontSize: 10, marginTop: 8, lineHeight: 1.5 }}>
        {pinned ? "已手動選位置" : "跟隨你目前的座位"} · 綠框為你的手牌。近似 GTO，依位置與牌力估算，非 solver 精解。
      </div>
    </div>
  );
}
function suggestionColor(eq, potOdds, acts) {
  if (acts.toCall === 0) return eq > 0.55 ? "var(--good)" : "var(--gold)";
  return eq >= potOdds + 0.05 ? "var(--good)" : "var(--bad)";
}
function suggestion(eq, potOdds, acts, street) {
  if (acts.toCall === 0) {
    if (eq > 0.7) return "Bet for value · 強牌下注 60-75% 池";
    if (eq > 0.5) return "Bet small · 33% 池保護牌力";
    if (eq < 0.35 && street !== "river") return "Check 控池 · 試圖看免費牌";
    return "Check · 不主動建池";
  }
  if (eq >= potOdds + 0.1) return "Call · 賠率充足，必跟";
  if (eq >= potOdds) return "Call · 邊際 +EV";
  if (eq >= potOdds - 0.05) return "Close · GTO 中可棄可跟";
  return "Fold · 賠率不足";
}

// ----- Hand feedback -----
function buildFeedback(game, human, myActions) {
  const items = [];
  let total = 0;
  for (const a of myActions) {
    if (a.action === "fold") continue;
    // estimate equity at action time - simplified: use final state equity but mark street
    items.push({
      street: a.street,
      action: a.action,
      amount: a.amount,
    });
  }
  // overall result
  const winner = game.winners?.find(w => w.idx === game.seats.indexOf(human));
  const won = !!winner;
  let result;
  if (won) result = "贏 +" + winner.share;
  else result = "輸 −" + human.committed;
  return { items, result, won, committed: human.committed };
}

function HandFeedback({ fb }) {
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16, marginTop: 16 }}>
      <div className="row between mb-8">
        <div className="card-eyebrow">本手復盤</div>
        <span className="mono" style={{ fontSize: 12, color: fb.won ? "var(--good)" : "var(--bad)" }}>{fb.result}</span>
      </div>
      <div className="row gap-8" style={{ flexWrap: "wrap" }}>
        {fb.items.map((it, i) => (
          <Pill key={i} tone={it.action === "fold" ? "bad" : it.action === "raise" ? "gold" : ""}>
            {it.street} · {it.action}{it.amount ? " " + it.amount : ""}
          </Pill>
        ))}
        {fb.items.length === 0 && <span className="text-faint mono" style={{ fontSize: 12 }}>未行動</span>}
      </div>
    </div>
  );
}

// ============================================================
// GTO COACH — live, side-by-side recommendation while playing
// ============================================================
function GtoCoach({ game, humanIdx, eq }) {
  const advice = useMemo(() => {
    if (!PEX) return null;
    return PEX.gtoAdvise(game, humanIdx, eq);
  }, [game.handHistory.length, game.street, eq, humanIdx]);

  if (!advice) return null;
  const { hand, pos, posInfo, isPreflop, madeHand, texture, mix, primary, reasoning } = advice;
  const primaryColor = ACT_COLOR[primary.act] || "var(--gold)";

  return (
    <div className="card" style={{
      borderTop: "3px solid var(--gold)",
      background: "linear-gradient(180deg, rgba(201,165,92,0.06), rgba(0,0,0,0.2))",
      padding: 18,
    }}>
      <div className="row between mb-12">
        <div className="card-eyebrow" style={{ color: "var(--gold-bright)" }}>GTO COACH</div>
        <span className="mono text-faint" style={{ fontSize: 10 }}>LIVE · {isPreflop ? "PREFLOP" : game.street.toUpperCase()}</span>
      </div>

      {/* Hand + position pill */}
      <div className="row gap-8 mb-12" style={{ flexWrap: "wrap" }}>
        <Pill tone="gold" style={{ fontSize: 12 }}>{hand.code} · {hand.short}</Pill>
        <Pill style={{ fontSize: 12 }}>{pos} · {posInfo.role}</Pill>
        {madeHand && <Pill tone={MADE_TONE[madeHand.strength] || ""} style={{ fontSize: 12 }}>{madeHand.label}</Pill>}
      </div>

      {/* primary action call-out */}
      <div style={{
        padding: "12px 14px",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid " + primaryColor,
        borderRadius: 8,
        marginBottom: 14,
      }}>
        <div className="row between" style={{ alignItems: "baseline" }}>
          <span className="mono text-faint" style={{ fontSize: 10, letterSpacing: "0.18em" }}>PRIMARY</span>
          <span className="mono" style={{ fontSize: 10, color: primaryColor }}>{Math.round(primary.freq * 100)}%</span>
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700, color: primaryColor, marginTop: 4 }}>
          {ACT_LABEL[primary.act] || primary.act}{primary.size ? <span className="mono text-dim" style={{ fontSize: 13, marginLeft: 8, fontWeight: 400 }}>{primary.size}</span> : null}
        </div>
      </div>

      {/* mix frequency bars */}
      <div className="col gap-8 mb-16">
        {mix.map((m, i) => (
          <div key={i}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <span className="mono" style={{ fontSize: 11, color: ACT_COLOR[m.act] || "var(--cream)" }}>
                {ACT_LABEL[m.act] || m.act}{m.size ? " · " + m.size : ""}
              </span>
              <span className="mono text-dim" style={{ fontSize: 11 }}>{Math.round(m.freq * 100)}%</span>
            </div>
            <Bar value={m.freq * 100} color={ACT_COLOR[m.act]} height={5} />
          </div>
        ))}
      </div>

      {/* reasoning bullets */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <div className="card-eyebrow mb-8">為什麼</div>
        <ul style={{ margin: 0, padding: "0 0 0 16px", color: "var(--fg-dim)", fontSize: 12.5, lineHeight: 1.6 }}>
          {reasoning.map((r, i) => <li key={i} style={{ marginBottom: 4 }}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}

const ACT_COLOR = {
  raise: "var(--gold)",
  call:  "var(--good)",
  check: "var(--info)",
  fold:  "var(--bad)",
};
const ACT_LABEL = {
  raise: "Raise / Bet",
  call:  "Call",
  check: "Check",
  fold:  "Fold",
};
const MADE_TONE = {
  nuts: "gold", monster: "gold", very_strong: "gold",
  strong: "good", medium: "good",
  weak_made: "warn", draw_strong: "warn", draw_weak: "warn",
  air: "bad",
};

// ============================================================
// HAND REVIEW PANEL — per-player end-of-hand 覆盤
// Each player gets: position, cards, made hand, per-street narrative.
// ============================================================
function HandReviewPanel({ game, fb }) {
  const rows = useMemo(() => PEX ? PEX.buildHandReview(game) : [], [game.handNo, game.finished]);
  const [expanded, setExpanded] = useState(() => new Set(rows.filter(r => r.isHuman).map(r => r.idx)));

  function toggle(idx) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }
  function expandAll()   { setExpanded(new Set(rows.map(r => r.idx))); }
  function collapseAll() { setExpanded(new Set()); }

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 18, marginTop: 18 }}>
      <div className="row between mb-16">
        <div>
          <div className="card-eyebrow" style={{ color: "var(--gold-bright)" }}>本手覆盤 · HAND #{game.handNo}</div>
          <div className="serif text-dim mt-8" style={{ fontSize: 13 }}>
            {rows.length} 位玩家 · 每位玩家拿了什麼、為什麼那樣打
          </div>
        </div>
        <div className="row gap-8">
          <button className="btn btn-sm btn-ghost" onClick={expandAll}>全部展開</button>
          <button className="btn btn-sm btn-ghost" onClick={collapseAll}>全部收起</button>
        </div>
      </div>

      {/* Final board */}
      {game.board.length > 0 && (
        <div className="card mb-16" style={{ padding: "14px 18px", background: "rgba(0,0,0,0.25)" }}>
          <div className="row between">
            <div className="row gap-12">
              <span className="card-eyebrow">最終公牌</span>
              <div className="row gap-4">
                {game.board.map((c, i) => <PlayingCard key={i} card={c} size={32} />)}
              </div>
            </div>
            {fb && <span className="mono" style={{ fontSize: 12, color: fb.won ? "var(--good)" : "var(--bad)" }}>{fb.result}</span>}
          </div>
        </div>
      )}

      {/* Player cards */}
      <div className="col gap-8">
        {rows.map(r => (
          <PlayerReviewRow
            key={r.idx}
            row={r}
            expanded={expanded.has(r.idx)}
            onToggle={() => toggle(r.idx)}
          />
        ))}
      </div>
    </div>
  );
}

function PlayerReviewRow({ row, expanded, onToggle }) {
  const { idx, name, isHuman, style, hole, folded, pos, posInfo, hand, finalMade, net, won, narrative } = row;
  const netColor = net > 0 ? "var(--good)" : net < 0 ? "var(--bad)" : "var(--fg-dim)";
  const styleTag = STYLE_TAG[style] || { label: isHuman ? "你 · Human" : style, color: "var(--fg-dim)" };

  return (
    <div className="card" style={{
      padding: 0,
      borderLeft: "3px solid " + (won ? "var(--good)" : folded ? "var(--line)" : "var(--gold-dim)"),
      background: isHuman ? "rgba(201,165,92,0.05)" : "var(--bg-card)",
    }}>
      {/* header row, clickable */}
      <button onClick={onToggle} style={{
        width: "100%", display: "block", textAlign: "left",
        background: "transparent", border: "none", color: "var(--cream)",
        padding: "14px 18px", cursor: "pointer",
      }}>
        <div className="row between" style={{ gap: 16, flexWrap: "wrap" }}>
          <div className="row gap-12" style={{ minWidth: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: "1.5px solid var(--line-bright)",
              display: "grid", placeItems: "center",
              fontFamily: "var(--mono)", fontSize: 11, color: "var(--gold)",
            }}>{pos}</div>
            <div style={{ minWidth: 0 }}>
              <div className="serif" style={{ fontSize: 16, fontWeight: 600 }}>
                {name}
                {isHuman && <span className="mono text-gold" style={{ fontSize: 10, marginLeft: 8, letterSpacing: "0.18em" }}>YOU</span>}
              </div>
              <div className="row gap-8" style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-dim)", marginTop: 3 }}>
                <span style={{ color: styleTag.color }}>{styleTag.label}</span>
                <span>·</span>
                <span>{posInfo.role}</span>
              </div>
            </div>
          </div>

          <div className="row gap-12">
            {/* cards */}
            <div className="row gap-4" style={{ opacity: folded ? 0.5 : 1 }}>
              {hole.map((c, i) => <PlayingCard key={i} card={c} size={32} />)}
            </div>
            {/* hand class */}
            <div className="col gap-4" style={{ minWidth: 140, alignItems: "flex-end" }}>
              <span className="mono" style={{ fontSize: 11, color: hand.color }}>
                {hand.code} · {hand.short}
              </span>
              {finalMade && !folded && (
                <span className="mono" style={{ fontSize: 11, color: madeColor(finalMade.strength) }}>
                  → {finalMade.label}
                </span>
              )}
              {folded && <span className="mono" style={{ fontSize: 11, color: "var(--fg-faint)" }}>已棄牌</span>}
            </div>
            {/* net */}
            <div style={{ minWidth: 80, textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 16, color: netColor, fontWeight: 600 }}>
                {net > 0 ? "+" : ""}{net}
              </div>
              <div className="mono text-faint" style={{ fontSize: 10 }}>net</div>
            </div>
            <span className="mono text-faint" style={{ fontSize: 14, width: 14, textAlign: "center" }}>
              {expanded ? "▾" : "▸"}
            </span>
          </div>
        </div>
      </button>

      {/* expanded narrative */}
      {expanded && (
        <div style={{ padding: "0 18px 18px 18px", borderTop: "1px solid var(--line)" }}>
          {narrative.length === 0 ? (
            <div className="text-faint mono mt-16" style={{ fontSize: 12 }}>本手未行動 (盲注後直接被攻擊或棄牌前已成局)。</div>
          ) : (
            <div className="col gap-12 mt-16">
              {narrative.map((n, i) => <NarrativeRow key={i} n={n} num={i + 1} />)}
            </div>
          )}
          {won && row.winShare > 0 && (
            <div className="mt-16" style={{
              padding: "10px 14px",
              background: "rgba(111,194,138,0.1)",
              border: "1px solid rgba(111,194,138,0.3)",
              borderRadius: 6, fontSize: 13,
            }}>
              <span className="mono text-good">✓ 贏 +{row.winShare}</span>
              <span className="text-dim" style={{ marginLeft: 12 }}>
                {finalMade ? "靠 " + finalMade.label + " 拿下底池" : "uncontested — 對手棄牌"}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const STYLE_TAG = {
  human: { label: "你 · Human", color: "var(--gold)" },
  gto:   { label: "GTO 標準",   color: "var(--gold)" },
  tight: { label: "Tight · 緊家", color: "var(--info)" },
  loose: { label: "Loose · 鬆兇", color: "var(--bad)"  },
};

function madeColor(strength) {
  return {
    nuts: "var(--gold-bright)", monster: "var(--gold-bright)", very_strong: "var(--gold)",
    strong: "var(--good)", medium: "var(--good)",
    weak_made: "var(--warn)", draw_strong: "var(--warn)", draw_weak: "var(--warn)",
    air: "var(--bad)",
  }[strength] || "var(--fg-dim)";
}

function NarrativeRow({ n, num }) {
  const tone = ACT_PILL_TONE[n.action] || "";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 12, alignItems: "flex-start" }}>
      <span className="mono" style={{
        fontSize: 10, color: "var(--gold)", letterSpacing: "0.18em",
        width: 56, paddingTop: 4,
      }}>{streetLabel(n.street)}</span>
      <Pill tone={tone} style={{ fontSize: 11, minWidth: 0 }}>
        {actVerb(n.action)}{n.amount ? " " + n.amount : ""}
      </Pill>
      <div className="text-dim" style={{ fontSize: 13, lineHeight: 1.6 }}>{n.why}</div>
    </div>
  );
}

const ACT_PILL_TONE = { raise: "gold", call: "good", check: "", fold: "bad" };
function streetLabel(s) { return ({ preflop: "PREFLOP", flop: "FLOP", turn: "TURN", river: "RIVER" })[s] || s.toUpperCase(); }
function actVerb(a)     { return ({ raise: "Raise/Bet", call: "Call", check: "Check", fold: "Fold" })[a] || a; }

/* ============================================================
   Tournament HUD · 錦標賽資訊面板
   ============================================================ */
function TournamentHUD({ tourney, game, humanIdx }) {
  const lvl = tourney.levels[tourney.levelIdx];
  const nextLvl = tourney.levels[tourney.levelIdx + 1];
  const handsLeft = Math.max(0, tourney.handsPerLevel - tourney.handsThisLevel);
  const alive = getAliveSeats(game);
  const aliveCount = alive.length;
  const inMoney = aliveCount <= tourney.paid;
  const human = game.seats[humanIdx];
  const humanAlive = human && human.stack > 0;

  // ICM $-EV for human (only if alive)
  const icmEV = useMemo(() => {
    if (!humanAlive) return null;
    const aliveStacks = alive.map(s => s.stack);
    const evs = icmDollar(aliveStacks, tourney.prizes);
    const myIdxInAlive = alive.indexOf(human);
    return Math.round(evs[myIdxInAlive] || 0);
  }, [game.handNo, humanAlive, tourney.eliminations.length, tourney.levelIdx]);

  const chipShare = humanAlive
    ? human.stack / alive.reduce((a, b) => a + b.stack, 0)
    : 0;
  const myBB = humanAlive ? (human.stack / lvl.bb).toFixed(1) : "—";

  // Bubble color: red if 1 away from money
  const bubbleAway = aliveCount - tourney.paid;
  const bubbleStatus =
    inMoney ? { tone: "good", label: "ITM · " + aliveCount + "/" + tourney.paid + " 進獎金" } :
    bubbleAway === 1 ? { tone: "bad", label: "Bubble · 再 1 人下車就進獎金" } :
    { tone: "", label: bubbleAway + " 人到泡沫圈" };

  return (
    <div className="card mb-16" style={{ padding: "16px 22px", background: "linear-gradient(180deg, rgba(201,165,92,0.06), transparent)" }}>
      <div className="row between mb-12" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-8" style={{ flexWrap: "wrap" }}>
          <Pill tone="gold" style={{ fontSize: 12 }}>
            Level {lvl.idx} · {lvl.sb}/{lvl.bb}{lvl.ante ? " · ante " + lvl.ante : ""}
          </Pill>
          <Pill tone={bubbleStatus.tone}>{bubbleStatus.label}</Pill>
          <Pill>{aliveCount} 人活著 · 共 {tourney.seats}</Pill>
        </div>
        <div className="row gap-8 mono text-dim" style={{ fontSize: 11 }}>
          <span>本級剩 {handsLeft} 手</span>
          {nextLvl && <span>→ 下級 {nextLvl.sb}/{nextLvl.bb}{nextLvl.ante ? " a" + nextLvl.ante : ""}</span>}
        </div>
      </div>

      {/* level progress bar */}
      <div style={{ height: 4, background: "rgba(0,0,0,0.3)", borderRadius: 999, overflow: "hidden", marginBottom: 14 }}>
        <div style={{
          width: ((tourney.handsThisLevel / tourney.handsPerLevel) * 100) + "%",
          height: "100%",
          background: "var(--gold)",
          transition: "width .3s",
        }} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <Stat label="你的籌碼" value={humanAlive ? human.stack.toLocaleString() : "出局"}
              sub={humanAlive ? myBB + " bb" : "—"} accent={humanAlive ? "var(--gold)" : "var(--bad)"} />
        <Stat label="籌碼佔比" value={humanAlive ? (chipShare * 100).toFixed(1) + "%" : "—"}
              sub={humanAlive ? "1 / " + aliveCount : "—"} />
        <Stat label="$-EV (ICM)" value={humanAlive ? "$" + icmEV.toLocaleString() : "—"}
              sub={humanAlive ? "獎金期望" : "—"} accent={humanAlive ? "var(--good)" : "var(--bad)"} />
        <Stat label="下一個 pay jump" value={(() => {
          const place = aliveCount;
          if (place > tourney.paid) return "進獎金 (+$" + tourney.prizes[tourney.paid - 1].toLocaleString() + ")";
          if (place === 1) return "—";
          const cur = tourney.prizes[place - 1] || 0;
          const next = tourney.prizes[place - 2] || 0;
          return "+$" + (next - cur).toLocaleString();
        })()} sub={"第 " + aliveCount + " 名"} />
      </div>

      {/* prize ladder */}
      <div className="mt-16" style={{ display: "grid", gridTemplateColumns: "repeat(" + tourney.seats + ", 1fr)", gap: 4 }}>
        {Array.from({ length: tourney.seats }, (_, i) => {
          const place = i + 1; // 1-indexed
          const prize = place <= tourney.paid ? tourney.prizes[place - 1] : 0;
          const isCurrent = place === aliveCount && humanAlive;
          const isPast = place > aliveCount; // already a finishing place handed out
          return (
            <div key={i} style={{
              padding: "6px 4px",
              borderRadius: 4,
              background: isCurrent ? "rgba(201,165,92,0.18)" : isPast ? "rgba(0,0,0,0.2)" : "transparent",
              border: "1px solid " + (isCurrent ? "var(--gold)" : prize > 0 ? "rgba(111,194,138,0.25)" : "var(--line)"),
              textAlign: "center",
              opacity: isPast ? 0.55 : 1,
            }}>
              <div className="mono" style={{ fontSize: 10, color: prize > 0 ? "var(--good)" : "var(--fg-faint)" }}>
                #{place}
              </div>
              <div className="mono" style={{ fontSize: 10, color: isCurrent ? "var(--gold-bright)" : prize > 0 ? "var(--cream)" : "var(--fg-faint)" }}>
                {prize > 0 ? "$" + (prize >= 1000 ? Math.round(prize / 100) / 10 + "k" : prize) : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   Stat (local compact variant — uses global Stat from ui.jsx)
   ============================================================ */
// (Stat is already imported from ui.jsx via globals.)

/* ============================================================
   BustedBanner · 你出局了
   ============================================================ */
function BustedBanner({ tourney, humanIdx }) {
  const myElim = tourney.eliminations.find(e => e.idx === humanIdx);
  if (!myElim) return null;
  const inMoney = myElim.prize > 0;
  return (
    <div className="card mb-16" style={{
      padding: "20px 26px",
      borderLeft: "4px solid " + (inMoney ? "var(--good)" : "var(--bad)"),
      background: inMoney ? "rgba(111,194,138,0.06)" : "rgba(217,111,94,0.06)",
    }}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="card-eyebrow mb-8" style={{ color: inMoney ? "var(--good)" : "var(--bad)" }}>
            你出局了
          </div>
          <div className="serif" style={{ fontSize: 24, fontWeight: 700 }}>
            第 {myElim.place} 名 / {tourney.seats}
          </div>
          <div className="text-dim mt-8" style={{ fontSize: 13 }}>
            {inMoney
              ? "已進獎金。可繼續觀戰，看 AI 把錦標賽打完。"
              : "未進獎金。要進前 " + tourney.paid + " 名才有獎金。可繼續觀戰，或回首頁重來。"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="card-eyebrow mb-8">獎金</div>
          <div className="serif" style={{ fontSize: 32, fontWeight: 700, color: inMoney ? "var(--good)" : "var(--fg-faint)" }}>
            ${myElim.prize.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TournamentEndScreen · 錦標賽結束
   ============================================================ */
function TournamentEndScreen({ tourney, game, humanIdx, onRestart }) {
  // Winner = the only seat with stack > 0
  const winner = game.seats.find(s => s.stack > 0);
  const winnerIdx = winner ? game.seats.indexOf(winner) : -1;
  const winnerName = winner ? winner.name : "—";
  // Build full finishing order: winner = 1st, then reversed elimination order
  const finalOrder = [];
  if (winner) finalOrder.push({ idx: winnerIdx, name: winnerName, place: 1, prize: tourney.prizes[0] || 0 });
  // eliminations are in elimination order (first to bust = worst place)
  // sort by place ascending (1st place at top of list)
  const sortedElims = tourney.eliminations.slice().sort((a, b) => a.place - b.place);
  for (const e of sortedElims) finalOrder.push(e);

  const myEntry = finalOrder.find(r => r.idx === humanIdx);
  const myPlace = myEntry?.place || "—";
  const myPrize = myEntry?.prize || 0;
  const iWon = winnerIdx === humanIdx;

  return (
    <div className="card mb-24" style={{
      padding: 0, overflow: "hidden",
      background: "linear-gradient(180deg, var(--felt), var(--felt-deep))",
      border: "1.5px solid var(--gold)",
    }}>
      <div style={{ padding: "32px 32px 24px", textAlign: "center", borderBottom: "1px solid var(--line)" }}>
        <div className="card-eyebrow mb-8" style={{ color: "var(--gold-bright)" }}>錦標賽結束</div>
        <div className="serif" style={{ fontSize: 36, fontWeight: 700, color: "var(--cream)" }}>
          🏆 {winnerName} 拿下冠軍
        </div>
        <div className="text-dim mt-8" style={{ fontSize: 13 }}>
          $-{tourney.prizes[0].toLocaleString()} · {iWon ? "恭喜！" : "你 · 第 " + myPlace + " 名"}
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div className="grid-3 mb-24">
          <Stat label="你的名次" value={"#" + myPlace} sub={iWon ? "冠軍" : myPrize > 0 ? "進獎金" : "未進獎金"}
                accent={iWon ? "var(--gold)" : myPrize > 0 ? "var(--good)" : "var(--bad)"} />
          <Stat label="獎金" value={"$" + myPrize.toLocaleString()} sub={"領 " + tourney.paid + " 名"} />
          <Stat label="總獎金池" value={"$" + tourney.pool.toLocaleString()} sub={tourney.seats + " 人 × 買入"} />
        </div>

        <div className="card-eyebrow mb-12">最終名次</div>
        <div className="col gap-4">
          {finalOrder.map(r => (
            <div key={r.idx} className="row between" style={{
              padding: "10px 14px", borderRadius: 6,
              background: r.idx === humanIdx ? "rgba(201,165,92,0.12)" : "rgba(0,0,0,0.18)",
              border: "1px solid " + (r.idx === humanIdx ? "var(--gold)" : "var(--line)"),
            }}>
              <div className="row gap-12">
                <span className="mono text-gold" style={{ width: 24, fontSize: 12, fontWeight: 700 }}>#{r.place}</span>
                <span className="serif" style={{ fontSize: 14, color: r.idx === humanIdx ? "var(--cream)" : "var(--fg-dim)" }}>
                  {r.name}{r.idx === humanIdx ? " (你)" : ""}
                </span>
                {r.place === 1 && <span className="mono text-gold" style={{ fontSize: 11 }}>★</span>}
              </div>
              <span className="mono" style={{ fontSize: 13, color: r.prize > 0 ? "var(--good)" : "var(--fg-faint)" }}>
                ${r.prize.toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        <div className="row center mt-24">
          <button className="btn btn-primary" onClick={onRestart}>再來一場 →</button>
        </div>
      </div>
    </div>
  );
}

window.PageTable = PageTable;
