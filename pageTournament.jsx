/* global React, useState, useMemo, PageHeader, Section, Pill, Bar, RANKS */

function PageTournament() {
  return (
    <div>
      <PageHeader
        eyebrow="Chapter 06 · 錦標賽 · MTT"
        title="籌碼不等於現金，名次才是"
        sub="MTT 是德州撲克最劇烈的形態 — 盲注不斷上升、籌碼不能兌現、第一名拿走大頭。學會用 $EV 而非 chip-EV 思考、學會在 push/fold 區域生存、學會在泡沫圈當溫度計，是錦標賽選手與現金桌玩家最大的分水嶺。"
      />

      <MTTvsCash />
      <StageTimeline />
      <ICMCalculator />
      <PushFoldChart />
      <RiskPremium />
      <BlindEscalation />
    </div>
  );
}

/* ============================================================
   06.1 · MTT vs Cash 心智模型差異
   ============================================================ */
function MTTvsCash() {
  const ROWS = [
    { dim: "籌碼價值",      cash: "線性。一個 $25 籌碼永遠值 $25。",                                  mtt: "非線性。第 1 名拿 30%、第 9 名拿 1% — 同樣的籌碼價值天差地遠。" },
    { dim: "目標",          cash: "最大化每手 EV，下班結帳。",                                         mtt: "活到下一個獎金級距 (pay jump)，最終目標是冠軍。" },
    { dim: "盲注",          cash: "固定。可以等好牌。",                                                mtt: "每 10–20 分鐘上升。等牌等到死。" },
    { dim: "籌碼深度",      cash: "通常 100bb 以上，深堆遊戲。",                                       mtt: "從 200bb 一路掉到 10bb，每階段策略不同。" },
    { dim: "離桌時機",      cash: "隨時。輸了補碼或起身。",                                            mtt: "只有出局或冠軍。re-entry 也只在前幾級開放。" },
    { dim: "對手",          cash: "相對穩定，可以建立 reads。",                                        mtt: "隨機分配座位、合桌頻繁，靠快速分類。" },
    { dim: "風險取捨",      cash: "Chip-EV = $-EV，可以打高方差線。",                                   mtt: "Chip-EV ≠ $-EV，淘汰風險常常壓過數學上的 +EV。" },
    { dim: "決策核心",      cash: "三街計畫、SPR、剝削。",                                              mtt: "Push/Fold、ICM、stack-size 心智地圖。" },
  ];
  return (
    <Section num="06.1" title="MTT vs Cash · 兩種完全不同的遊戲"
      lede="現金桌打得很好的玩家，第一次打錦標賽常常困惑於同樣的牌為什麼要 fold。差異不在牌力，在「籌碼到底值多少」這件事上。">
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="dt" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "20%" }}>面向</th>
              <th style={{ width: "40%" }}><span className="mono text-dim">CASH GAME</span></th>
              <th style={{ width: "40%" }}><span className="mono text-gold">TOURNAMENT</span></th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r, i) => (
              <tr key={i}>
                <td className="serif" style={{ color: "var(--gold)", fontWeight: 600 }}>{r.dim}</td>
                <td className="text-dim" style={{ fontSize: 13 }}>{r.cash}</td>
                <td style={{ fontSize: 13 }}>{r.mtt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/* ============================================================
   06.2 · 階段地圖 · Stage Timeline
   ============================================================ */
const STAGES = [
  { id: "early",   label: "早期",    bb: "100–200bb", tone: "good",
    headline: "建立形象，避免方差",
    desc: "盲注小、深堆。地雷少而資訊多。把時間花在「觀察對手」而非「累積籌碼」。",
    dos:    ["位置牌打三街計畫", "用大池子去學對手的線", "好球用標準尺度", "別用 set 翻倍下注"],
    avoid:  ["翻倍開池迎合 maniac", "用 KK 在乾燥牌面去 hero-call 全下", "為了「進獎金」就保守縮手 — 還太早"] },
  { id: "middle",  label: "中期",   bb: "25–50bb",   tone: "warn",
    headline: "Ante 進場，偷盲為王",
    desc: "盲注上升、ante 加入，每手底池立刻多 1bb。偷盲 EV 翻倍，3-bet jam 也回到工具箱。",
    dos:    ["BTN/CO 加大開池頻率", "對偷盲者 3-bet light", "短碼可以開始 re-shove 12–20bb", "M = stack ÷ (SB+BB+antes) 開始追蹤"],
    avoid:  ["limp open", "用 100bb 風格的 floating", "讓自己默默被盲注吃成 short stack"] },
  { id: "bubble",  label: "泡沫圈",  bb: "10–30bb",   tone: "bad",
    headline: "ICM 高峰，溫度計時刻",
    desc: "離獎金一名。中堆對 chip leader 要極端保守，short stack 反而可以更寬地 jam。誰最怕出局，誰就最被剝削。",
    dos:    ["當 chip leader：施壓中堆，他們動彈不得", "當 short stack：選擇性 jam，找到沒有 cover 你的對手", "當中堆：fold KK 都不誇張，活過泡沫優先"],
    avoid:  ["中堆 vs 中堆全下對撞", "為了「公平」就跟一個 marginal call", "詐唬 short stack — 他在等好牌 jam"] },
  { id: "itm",     label: "ITM",    bb: "15–40bb",   tone: "",
    headline: "進獎金 — 重新開放",
    desc: "min cash 已經保證。除了下一個 pay jump 還早，立刻把 aggression 拉回來，目標放在 top 3。",
    dos:    ["把鬆掉的 short stack 收下", "中堆重新打 chip-EV 線", "鎖定下一個 pay jump 的距離"],
    avoid:  ["以為 ITM 就贏了，繼續保守", "對著 chip leader 自殺"] },
  { id: "ft",      label: "決賽桌",  bb: "10–60bb",   tone: "gold",
    headline: "Pay jump 主導每一個決策",
    desc: "獎金級距大。第 5→第 4 可能差數萬。ICM 影響比 bubble 更深，連 AQs 都可能 fold 全下。",
    dos:    ["列出 pay jump 表，知道每一名差多少", "對 short stack 施壓", "找 medium stack 的弱點 — 他們最被 ICM 綁住"],
    avoid:  ["chip leader 之間互打", "在 short stack 還沒出局前消耗自己籌碼"] },
  { id: "hu",      label: "Heads-Up", bb: "20–80bb",  tone: "good",
    headline: "兩人對決 · Aggression 為王",
    desc: "範圍極寬，position swap 每一手。沒有「等好牌」這回事 — 一手要打 60–80%。",
    dos:    ["BTN open 80%+", "BB 防守不再緊，3-bet 頻率拉高", "用尺度與時機壓對手"],
    avoid:  ["像 9-handed 一樣等 AA", "靜態的 c-bet 100% 線 — 對手會 floating 一輩子"] },
];

function StageTimeline() {
  const [active, setActive] = useState("bubble");
  const stage = STAGES.find(s => s.id === active);

  return (
    <Section num="06.2" title="MTT 階段地圖"
      lede="一場 MTT 從 200bb 打到 0bb，中間經過六個質變點。每一個點上「贏」的定義都不一樣。">

      {/* timeline rail */}
      <div className="card" style={{ padding: "26px 28px" }}>
        <div style={{ position: "relative", marginBottom: 18 }}>
          {/* spine */}
          <div style={{
            position: "absolute", left: 24, right: 24, top: 18, height: 2,
            background: "linear-gradient(90deg, var(--good), var(--warn) 30%, var(--bad) 50%, var(--gold) 80%, var(--good))",
            opacity: 0.5,
          }} />
          <div className="row" style={{ justifyContent: "space-between", position: "relative" }}>
            {STAGES.map(s => {
              const isActive = s.id === active;
              return (
                <button key={s.id}
                  onClick={() => setActive(s.id)}
                  style={{
                    background: "transparent", border: "none",
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 8, padding: "0 4px", cursor: "pointer", flex: 1, minWidth: 0,
                  }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: isActive ? "var(--gold)" : "var(--bg-card)",
                    border: "2px solid " + (isActive ? "var(--gold-bright)" : "var(--line-bright)"),
                    boxShadow: isActive ? "0 0 0 4px rgba(201,165,92,0.15)" : "none",
                    transition: "all .2s",
                  }} />
                  <div className="serif" style={{
                    fontSize: 14, fontWeight: 600,
                    color: isActive ? "var(--cream)" : "var(--fg-dim)",
                  }}>{s.label}</div>
                  <div className="mono text-faint" style={{ fontSize: 10 }}>{s.bb}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* detail panel */}
        <div style={{
          borderTop: "1px solid var(--line)", paddingTop: 22, marginTop: 6,
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 26,
        }}>
          <div>
            <Pill tone={stage.tone}>{stage.label.toUpperCase()} · {stage.bb}</Pill>
            <h3 className="serif mt-16" style={{ fontSize: 22 }}>{stage.headline}</h3>
            <div className="text-dim mt-8" style={{ fontSize: 13.5, lineHeight: 1.7 }}>{stage.desc}</div>
          </div>
          <div>
            <div className="card-eyebrow mb-8">DO ✓</div>
            <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13, lineHeight: 1.7 }}>
              {stage.dos.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
            </ul>
          </div>
          <div>
            <div className="card-eyebrow mb-8" style={{ color: "var(--bad)" }}>AVOID ✗</div>
            <ul style={{ paddingLeft: 16, margin: 0, fontSize: 13, lineHeight: 1.7, color: "var(--fg-dim)" }}>
              {stage.avoid.map((x, i) => <li key={i} style={{ marginBottom: 4 }}>{x}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
   06.3 · ICM 計算器 · Malmuth-Harville
   ============================================================ */

// ICM via Malmuth-Harville: prob of finishing in place p ≈ proportional to remaining stack
function icm(stacks, prizes) {
  const n = stacks.length;
  const numPrizes = Math.min(prizes.length, n);
  const result = new Array(n).fill(0);

  // recursive: at each step, assign next finishing place
  // to keep complexity in check (n<=9), full factorial enumeration is fine
  function recurse(remaining, place, probSoFar) {
    if (place >= numPrizes || remaining.length === 0) return;
    let sumRem = 0;
    for (const i of remaining) sumRem += stacks[i];
    if (sumRem <= 0) return;
    for (const i of remaining) {
      const p = probSoFar * (stacks[i] / sumRem);
      result[i] += p * prizes[place];
      if (place + 1 < numPrizes) {
        const next = remaining.filter(x => x !== i);
        recurse(next, place + 1, p);
      }
    }
  }

  // Malmuth-Harville interprets "finishing first" as proportional to stack,
  // then iterates by removing the finisher. The standard ICM formula gives
  // each player's $EV directly:
  // EV_i = Σ_p prize_p × P(player i finishes in place p)
  // P(i first) = stack_i / total
  // P(i second | j first) = stack_i / (total - stack_j), etc.
  // The recursive enumeration above computes prizes[place] for "place"=finishing
  // position p. But because we award prizes from 1st onwards we need to think
  // of place=0 as 1st. That works.
  recurse(stacks.map((_, i) => i), 0, 1);
  return result;
}

function ICMCalculator() {
  const [players, setPlayers] = useState([
    { name: "Player 1 (你)", stack: 35000 },
    { name: "Player 2",      stack: 28000 },
    { name: "Player 3",      stack: 18000 },
    { name: "Player 4",      stack: 12000 },
    { name: "Player 5",      stack: 7000  },
  ]);
  const [prizePct, setPrizePct] = useState([40, 25, 17, 11, 7]);

  const pool = 100000; // notional prize pool $100,000
  const prizes = prizePct.map(p => pool * p / 100);
  const totalChips = players.reduce((s, p) => s + p.stack, 0);

  const evs = useMemo(() => icm(players.map(p => p.stack), prizes), [players, prizes]);

  function setStack(i, v) {
    const next = players.slice();
    next[i] = { ...next[i], stack: Math.max(0, parseInt(v) || 0) };
    setPlayers(next);
  }
  function setName(i, v) {
    const next = players.slice();
    next[i] = { ...next[i], name: v };
    setPlayers(next);
  }
  function setPrize(i, v) {
    const next = prizePct.slice();
    next[i] = Math.max(0, parseFloat(v) || 0);
    setPrizePct(next);
  }
  function addPlayer() {
    if (players.length >= 9) return;
    setPlayers([...players, { name: "Player " + (players.length + 1), stack: 10000 }]);
  }
  function removePlayer(i) {
    if (players.length <= 2) return;
    setPlayers(players.filter((_, idx) => idx !== i));
  }

  // chip-EV reference: if you got chips, you'd be entitled to:
  const chipEV = players.map(p => totalChips > 0 ? (p.stack / totalChips) * pool : 0);

  return (
    <Section num="06.3" title="ICM 計算器 · Independent Chip Model"
      lede="輸入剩餘玩家的籌碼量與獎金結構，看每個人「此刻的真實獎金期望」。Chip-EV 是把所有獎金平攤到每個籌碼上 — 在 MTT 不成立；ICM 才是真的數字。">

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* INPUTS */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">玩家籌碼</div>
            <span className="mono text-dim" style={{ fontSize: 11 }}>總籌碼 {totalChips.toLocaleString()}</span>
          </div>
          <div className="col gap-8">
            {players.map((p, i) => (
              <div key={i} className="row gap-8" style={{ alignItems: "center" }}>
                <span className="mono text-gold" style={{ width: 22, fontSize: 12 }}>P{i + 1}</span>
                <input value={p.name} onChange={e => setName(i, e.target.value)}
                  style={inputStyle({ flex: 1, fontSize: 13 })} />
                <input type="number" value={p.stack} step={500} min={0}
                  onChange={e => setStack(i, e.target.value)}
                  style={inputStyle({ width: 110, textAlign: "right", fontFamily: "var(--mono)" })} />
                <button className="btn btn-sm btn-ghost"
                  disabled={players.length <= 2}
                  onClick={() => removePlayer(i)}
                  style={{ padding: "4px 8px", opacity: players.length <= 2 ? 0.3 : 1 }}>×</button>
              </div>
            ))}
          </div>
          <div className="row gap-8 mt-16">
            <button className="btn btn-sm btn-ghost" onClick={addPlayer} disabled={players.length >= 9}>
              + 增加玩家 ({players.length}/9)
            </button>
          </div>

          <div style={{ borderTop: "1px solid var(--line)", margin: "20px 0 16px" }} />

          <div className="card-eyebrow mb-8">獎金結構 (% of pool)</div>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            {prizePct.map((p, i) => (
              <div key={i} style={{ flex: "1 1 70px", minWidth: 70 }}>
                <div className="mono text-faint" style={{ fontSize: 10, marginBottom: 2 }}>第 {i + 1} 名</div>
                <input type="number" value={p} step={1} min={0}
                  onChange={e => setPrize(i, e.target.value)}
                  style={inputStyle({ width: "100%", fontFamily: "var(--mono)", textAlign: "center" })} />
              </div>
            ))}
          </div>
          <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>
            獎金池 ${pool.toLocaleString()} · 加總 {prizePct.reduce((a, b) => a + b, 0)}%
          </div>
        </div>

        {/* RESULTS */}
        <div className="card">
          <div className="card-head">
            <div className="card-title">$EV vs Chip-EV</div>
            <span className="mono text-gold" style={{ fontSize: 11 }}>ICM</span>
          </div>

          <div className="col gap-12">
            {players.map((p, i) => {
              const chipShare = totalChips > 0 ? p.stack / totalChips : 0;
              const icmShare  = evs[i] / pool;
              const delta     = evs[i] - chipEV[i];
              return (
                <div key={i}>
                  <div className="row between mb-8">
                    <div className="row gap-8">
                      <span className="mono text-gold" style={{ fontSize: 11 }}>P{i + 1}</span>
                      <span style={{ fontSize: 13 }}>{p.name}</span>
                    </div>
                    <div className="mono" style={{ fontSize: 13 }}>
                      <span className="text-gold">${Math.round(evs[i]).toLocaleString()}</span>
                      <span className="text-faint" style={{ marginLeft: 8, fontSize: 11 }}>
                        ({(icmShare * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div style={{ position: "relative" }}>
                    {/* chip-EV ghost bar */}
                    <div style={{
                      position: "absolute", inset: 0, height: 8,
                      borderRadius: 999, overflow: "hidden",
                      background: "rgba(0,0,0,0.3)",
                    }}>
                      <div style={{
                        width: (chipShare * 100) + "%", height: "100%",
                        background: "rgba(244,234,208,0.18)",
                      }} />
                    </div>
                    {/* ICM bar */}
                    <div style={{
                      position: "relative", height: 8,
                      borderRadius: 999, overflow: "hidden",
                    }}>
                      <div style={{
                        width: (icmShare * 100) + "%", height: "100%",
                        background: delta >= 0 ? "var(--gold)" : "var(--bad)",
                        transition: "width .3s",
                      }} />
                    </div>
                  </div>
                  <div className="mono mt-8" style={{ fontSize: 10, color: "var(--fg-faint)" }}>
                    Chip share {(chipShare * 100).toFixed(1)}% ·
                    <span style={{ color: delta >= 0 ? "var(--good)" : "var(--bad)", marginLeft: 6 }}>
                      ICM {delta >= 0 ? "+" : ""}{Math.round(delta).toLocaleString()}$
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-24" style={{ background: "rgba(0,0,0,0.25)", padding: "14px 16px", borderRadius: 8, borderLeft: "2px solid var(--gold)" }}>
            <div className="card-eyebrow mb-8">看出來了嗎</div>
            <div className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.65 }}>
              Chip leader 的 $EV <span className="text-bad">通常低於</span> chip share — 籌碼到了一定程度，每多 1 顆能換的獎金愈來愈少。短碼則 <span className="text-good">高於</span> chip share — 第一名與最後一名差不了 30 倍獎金，但籌碼差了上百倍。
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

function inputStyle(extra = {}) {
  return {
    background: "var(--bg)",
    border: "1px solid var(--line)",
    color: "var(--cream)",
    padding: "6px 10px",
    borderRadius: 6,
    fontSize: 13,
    outline: "none",
    ...extra,
  };
}

/* ============================================================
   06.4 · Push/Fold (Nash) 表
   ============================================================ */

// Build 169 hand grid. Top-right = suited, bottom-left = offsuit, diagonal = pair.
const GRID_RANKS = ["A","K","Q","J","T","9","8","7","6","5","4","3","2"];
function handCode(row, col) {
  // row index 0 = A, etc; col index 0 = A
  const a = GRID_RANKS[row], b = GRID_RANKS[col];
  if (row === col) return a + a;
  // suited if col > row (upper-right), offsuit otherwise — pick consistent ordering
  return row < col ? a + b + "s" : b + a + "o";
}

// SB jamming ranges (BTN/SB vs BB) for common short-stack depths.
// Source: Nash equilibrium push tables (approximate / educational, not exact).
const SB_JAM = {
  5:  "100%", // any two
  8:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","K3s","K2s",
       "QJs","QTs","Q9s","Q8s","Q7s","Q6s","Q5s","Q4s",
       "JTs","J9s","J8s","J7s","J6s","J5s",
       "T9s","T8s","T7s","T6s","T5s",
       "98s","97s","96s","95s",
       "87s","86s","85s",
       "76s","75s","74s",
       "65s","64s","54s","53s","43s",
       "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o",
       "KQo","KJo","KTo","K9o","K8o","K7o","K6o",
       "QJo","QTo","Q9o","Q8o","Q7o",
       "JTo","J9o","J8o","J7o",
       "T9o","T8o","T7o",
       "98o","97o","87o","76o"],
  10: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s","K4s","K3s","K2s",
       "QJs","QTs","Q9s","Q8s","Q7s","Q6s","Q5s",
       "JTs","J9s","J8s","J7s","J6s",
       "T9s","T8s","T7s","T6s",
       "98s","97s","96s","87s","86s","76s","75s","65s","54s",
       "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o","A4o","A3o","A2o",
       "KQo","KJo","KTo","K9o","K8o","K7o",
       "QJo","QTo","Q9o","Q8o",
       "JTo","J9o","T9o","98o"],
  15: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s","K8s","K7s","K6s","K5s",
       "QJs","QTs","Q9s","Q8s","Q7s",
       "JTs","J9s","J8s","T9s","T8s","98s","87s","76s","65s","54s",
       "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o",
       "KQo","KJo","KTo","K9o",
       "QJo","QTo","JTo"],
  20: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s",
       "QJs","QTs","JTs","T9s","98s","87s","76s","65s",
       "AKo","AQo","AJo","ATo","A9o",
       "KQo","KJo","QJo"],
  25: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33",
       "AKs","AQs","AJs","ATs","A9s","A5s","A4s",
       "KQs","KJs","KTs","QJs","QTs","JTs","T9s","98s","87s","76s",
       "AKo","AQo","AJo","KQo"],
};

// BB call range vs SB jam (educational approximation)
const BB_CALL = {
  5:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s","K8s","K7s","K6s",
       "QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s","76s","65s",
       "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o",
       "KQo","KJo","KTo","QJo","QTo","JTo"],
  10: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A5s","A4s","A3s",
       "KQs","KJs","KTs","QJs","QTs","JTs",
       "AKo","AQo","AJo","ATo","KQo","KJo"],
  15: ["AA","KK","QQ","JJ","TT","99","88","77","66","55",
       "AKs","AQs","AJs","ATs","KQs","KJs","QJs",
       "AKo","AQo","AJo","KQo"],
  20: ["AA","KK","QQ","JJ","TT","99","88","77",
       "AKs","AQs","AJs","KQs",
       "AKo","AQo"],
  25: ["AA","KK","QQ","JJ","TT","99","88",
       "AKs","AQs","KQs",
       "AKo","AQo"],
};

function rangeSet(rangeOrAll) {
  if (rangeOrAll === "100%") return null; // sentinel: all
  return new Set(rangeOrAll);
}

// Re-shove (3-bet jam) ranges — facing a late-position open, you re-jam from BB.
// Tighter than open-jam: there's already a raiser putting weight in the pot.
const RESHOVE = {
  8:  ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A7s","A6s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s","K8s","K7s",
       "QJs","QTs","Q9s","JTs","J9s","T9s","98s","87s","76s","65s","54s",
       "AKo","AQo","AJo","ATo","A9o","A8o","A7o","A6o","A5o",
       "KQo","KJo","KTo","QJo","QTo","JTo"],
  12: ["AA","KK","QQ","JJ","TT","99","88","77","66","55","44","33","22",
       "AKs","AQs","AJs","ATs","A9s","A8s","A5s","A4s","A3s","A2s",
       "KQs","KJs","KTs","K9s",
       "QJs","QTs","JTs","T9s","98s","87s","76s",
       "AKo","AQo","AJo","ATo","A9o",
       "KQo","KJo","QJo"],
  15: ["AA","KK","QQ","JJ","TT","99","88","77","66","55",
       "AKs","AQs","AJs","ATs","A5s","A4s",
       "KQs","KJs","KTs","QJs","JTs",
       "AKo","AQo","AJo","KQo"],
  20: ["AA","KK","QQ","JJ","TT","99","88","77",
       "AKs","AQs","AJs","KQs",
       "AKo","AQo"],
  25: ["AA","KK","QQ","JJ","TT","99",
       "AKs","AQs",
       "AKo"],
};

function PushFoldChart() {
  const [depth, setDepth] = useState(15);
  const [side, setSide]   = useState("jam"); // 'jam' (SB) / 'call' (BB) / 'reshove' (BB vs BTN open)

  const set = useMemo(() => {
    if (side === "jam")     return rangeSet(SB_JAM[depth]);
    if (side === "call")    return rangeSet(BB_CALL[depth]);
    if (side === "reshove") return rangeSet(RESHOVE[depth] || RESHOVE[15]);
    return null;
  }, [depth, side]);

  const depthOpts = side === "reshove" ? [8,12,15,20,25] : [5,8,10,15,20,25];

  // Keep depth in valid range when side switches
  React.useEffect(() => {
    if (!depthOpts.includes(depth)) setDepth(15);
  }, [side]); // eslint-disable-line

  // Count combos for header pct
  const stats = useMemo(() => {
    let combos = 0; let total = 0;
    for (let r = 0; r < 13; r++) for (let c = 0; c < 13; c++) {
      const h = handCode(r, c);
      const w = r === c ? 6 : (r < c ? 4 : 12); // pair 6, suited 4, offsuit 12
      total += w;
      if (set === null || set.has(h)) combos += w;
    }
    return { combos, total, pct: (combos / total) * 100 };
  }, [set]);

  return (
    <Section num="06.4" title="Push/Fold · Nash 均衡表"
      lede="籌碼掉到 25bb 以下，三街遊戲消失，每一手變成「我要 jam 還是 fold」。Nash 均衡告訴你：哪些手在哪個深度應該 shove、哪些應該 call。背下來，比任何其他練習都划算。">

      {/* controls */}
      <div className="row between mb-16" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-8">
          <span className="mono text-faint" style={{ fontSize: 11 }}>SCENARIO</span>
          <Toggle
            value={side}
            options={[
              { value: "jam",     label: "SB Jam" },
              { value: "call",    label: "BB Call vs SB jam" },
              { value: "reshove", label: "BB Re-shove vs BTN open" },
            ]}
            onChange={setSide}
          />
        </div>
        <div className="row gap-8">
          <span className="mono text-faint" style={{ fontSize: 11 }}>EFFECTIVE STACK</span>
          <Toggle
            value={depth}
            options={depthOpts.map(d => ({ value: d, label: d + "bb" }))}
            onChange={setDepth}
          />
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="row between mb-16">
          <div>
            <div className="serif" style={{ fontSize: 18, color: "var(--cream)" }}>
              {side === "jam"
                ? "SB 在 " + depth + "bb 的全下範圍"
                : side === "call"
                  ? "BB 面對 SB 全下 (" + depth + "bb) 的跟注範圍"
                  : "BB 面對 BTN open、使用 " + depth + "bb 的 Re-shove 範圍"}
            </div>
            <div className="text-dim" style={{ fontSize: 12.5, marginTop: 4 }}>
              {side === "jam"
                ? "前面所有人都棄牌、輪到你在 SB。"
                : side === "call"
                  ? "SB 已經全下，輪到你在 BB 決定要不要 call。"
                  : "BTN open 2–2.2x、SB fold。你在 BB 拿這些牌直接 3-bet 全下，吃 fold equity + 安全限制多街變數。"}
            </div>
          </div>
          <div className="serif" style={{ fontSize: 36, fontWeight: 700, color: "var(--gold)" }}>
            {stats.pct.toFixed(1)}<span style={{ fontSize: 18 }}>%</span>
          </div>
        </div>

        <HandGrid set={set} />

        <div className="row gap-16 mt-16" style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--fg-dim)" }}>
          <span className="row gap-4"><Swatch c="var(--gold)" /> {side === "jam" ? "Shove" : side === "call" ? "Call" : "Re-shove"}</span>
          <span className="row gap-4"><Swatch c="rgba(255,255,255,0.05)" border /> Fold</span>
          <span style={{ marginLeft: "auto" }}>對角線 = 對子 · 右上 = 同花 · 左下 = 雜花</span>
        </div>
      </div>

      <div className="card mt-24" style={{ background: "rgba(0,0,0,0.25)" }}>
        <div className="card-eyebrow mb-8">使用心法</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: "var(--fg-dim)" }}>
          <li>這些是 Nash 均衡解 — 假設對手也照 Nash 打。實戰若對手 call 太緊，你可以 jam 寬一些；call 太鬆，反而要收一些。</li>
          <li>SB jam 是你「沒人在你之前進池」的開放線。如果有人 raise 了，要用另一套 re-shove 範圍。</li>
          <li>深度愈淺、jam 範圍愈寬、call 範圍愈緊。5bb 時 SB 幾乎 any two 都可以 jam；20bb 以上才開始有意義的 fold。</li>
          <li>ICM 壓力高時 (bubble、FT)，BB 的 call 範圍要 <span className="text-bad">再收 20–40%</span>；short stack 在沒有 cover 時，jam 範圍可以 <span className="text-good">放寬</span>。</li>
        </ul>
      </div>
    </Section>
  );
}

function HandGrid({ set }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(13, 1fr)",
      gap: 2,
      fontFamily: "var(--mono)",
      fontSize: 10,
    }}>
      {GRID_RANKS.map((_, r) =>
        GRID_RANKS.map((_, c) => {
          const code = handCode(r, c);
          const isIn = set === null || set.has(code);
          const isPair = r === c;
          const isSuited = r < c;
          return (
            <div key={r + "-" + c} style={{
              aspectRatio: "1 / 1",
              display: "grid", placeItems: "center",
              borderRadius: 3,
              background: isIn
                ? (isPair ? "var(--gold-bright)" : isSuited ? "var(--gold)" : "rgba(201,165,92,0.65)")
                : "rgba(255,255,255,0.03)",
              color: isIn ? "var(--ink)" : "var(--fg-faint)",
              fontWeight: isIn ? 700 : 400,
              border: "1px solid " + (isIn ? "transparent" : "var(--line)"),
              fontSize: 10,
              letterSpacing: "-0.02em",
            }}>{code}</div>
          );
        })
      )}
    </div>
  );
}

function Toggle({ value, options, onChange }) {
  return (
    <div className="row gap-4" style={{
      background: "var(--bg)", padding: 3, borderRadius: 8,
      border: "1px solid var(--line)",
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding: "6px 12px", border: "none", borderRadius: 5,
              fontSize: 12,
              fontFamily: "var(--mono)",
              letterSpacing: "0.04em",
              background: active ? "var(--gold)" : "transparent",
              color: active ? "var(--ink)" : "var(--fg-dim)",
              fontWeight: active ? 700 : 400,
              cursor: "pointer",
              transition: "all .15s",
            }}>{o.label}</button>
        );
      })}
    </div>
  );
}

function Swatch({ c, border }) {
  return <span style={{
    display: "inline-block", width: 12, height: 12, borderRadius: 3,
    background: c, border: border ? "1px solid var(--line)" : "none",
  }} />;
}

/* ============================================================
   06.5 · Bubble Factor / Risk Premium
   ============================================================ */
function RiskPremium() {
  const SCENARIOS = [
    { who: "Chip leader vs Chip leader",     bf: 1.05, equityNeeded: 51, color: "var(--good)",
      note: "互相吃不掉，BF 接近 1。可以打 chip-EV 線。" },
    { who: "中堆 (covering) vs Chip leader", bf: 1.15, equityNeeded: 54, color: "var(--good)",
      note: "中堆雖然蓋住 CL 一些，但 CL 不會去送，BF 微高。" },
    { who: "中堆 vs 中堆 (covered)",         bf: 1.35, equityNeeded: 57, color: "var(--warn)",
      note: "雙方都怕互撞，誰先動誰被剝削。" },
    { who: "中堆 vs Chip leader (被 cover)", bf: 1.50, equityNeeded: 60, color: "var(--bad)",
      note: "最痛的位置。CL 對你 shove 你需要 60%+ equity — 連 99 都得思考。" },
    { who: "Short stack (not covered)",      bf: 1.00, equityNeeded: 50, color: "var(--good)",
      note: "沒有 cover 你的對手 → 沒有淘汰風險 → chip-EV 即 $-EV。可以最寬。" },
    { who: "Short stack vs Big (covered)",   bf: 1.10, equityNeeded: 52, color: "var(--good)",
      note: "雖被 cover，但你的籌碼 $EV 變化率低，BF 仍然小。" },
  ];

  return (
    <Section num="06.5" title="Bubble Factor · 風險溢價"
      lede="ICM 的實戰版本。Bubble Factor (BF) = 「贏一手帶來的 $EV 增加」÷「輸一手帶來的 $EV 減少」。BF=1.5 代表你需要比 chip-EV 多 10%+ 勝率才值得 call。">

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="dt" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: "32%" }}>情境</th>
              <th style={{ width: "10%" }}>BF</th>
              <th style={{ width: "16%" }}>需要勝率</th>
              <th>意義</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((s, i) => (
              <tr key={i}>
                <td style={{ fontSize: 13 }}>{s.who}</td>
                <td className="mono" style={{ color: s.color, fontWeight: 700, fontSize: 14 }}>
                  {s.bf.toFixed(2)}×
                </td>
                <td className="mono" style={{ fontSize: 13 }}>
                  <span style={{ color: s.color }}>{s.equityNeeded}%</span>
                  <span className="text-faint" style={{ marginLeft: 6, fontSize: 11 }}>
                    (+{s.equityNeeded - 50})
                  </span>
                </td>
                <td className="text-dim" style={{ fontSize: 12.5 }}>{s.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-2 mt-24" style={{ alignItems: "start" }}>
        <div className="card" style={{ background: "linear-gradient(180deg, var(--felt), var(--felt-dark))" }}>
          <div className="card-eyebrow mb-8">範例 · Bubble 對 chip leader 的 ATo</div>
          <div className="text-dim" style={{ fontSize: 12.5, lineHeight: 1.7, marginBottom: 16 }}>
            CL 從 BTN 全下 15bb，你在 BB 有 14bb 拿到 A♣T♦。對手 jam 範圍假設 35%。
          </div>
          <div className="col gap-16">
            <div>
              <div className="row between mb-8"><span className="text-dim">Chip-EV (純籌碼)</span><span className="mono text-good">+1.8 bb</span></div>
              <Bar value={62} color="var(--good)" height={8} />
              <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>ATo 對 35% 範圍贏 ~52% — call 是 +chipEV</div>
            </div>
            <div>
              <div className="row between mb-8"><span className="text-dim">$-EV (BF ≈ 1.5)</span><span className="mono text-bad">−$320</span></div>
              <Bar value={32} color="var(--bad)" height={8} />
              <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>需要 60% equity 才值得 — fold 才正確</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-eyebrow mb-8">三條心法</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.85, color: "var(--fg-dim)" }}>
            <li><span className="text-gold serif">壓力傳導</span> — 籌碼 ranking 比絕對量更重要。你不會「被 short stack 壓力」，但會被「能 cover 你的中堆」壓垮。</li>
            <li><span className="text-gold serif">向下傳遞</span> — Chip leader 對中堆施壓，中堆被卡住所以對 short stack 也緊，short stack 反而可以欺負 chip leader (CL 不想跟，怕意外輸給 short)。</li>
            <li><span className="text-gold serif">越接近 pay jump，BF 越高</span> — Bubble 跟 FT 是 BF 最極端的兩個時刻。中間階段 BF ≈ 1.1，不要過度反應。</li>
          </ol>
        </div>
      </div>
    </Section>
  );
}

/* ============================================================
   06.6 · Blind Escalation Simulator · 盲注吃人模擬器
   ============================================================ */

const BLIND_PRESETS = {
  turbo:   { label: "Turbo",     minutes: 5,  growth: 1.50, levels: 14, anteAt: 3, anteRatio: 0.125 },
  regular: { label: "Regular",   minutes: 15, growth: 1.40, levels: 14, anteAt: 4, anteRatio: 0.125 },
  deep:    { label: "Deep Stack", minutes: 30, growth: 1.30, levels: 14, anteAt: 5, anteRatio: 0.125 },
};

// Stack-depth zones (in bb) — used to colour the chart background.
const DEPTH_ZONES = [
  { min: 50, max: 999, label: "深堆",        color: "rgba(111,194,138,0.10)", text: "var(--good)",
    note: "三街計畫、找位置與資訊。" },
  { min: 25, max: 50,  label: "中堆",        color: "rgba(232,185,72,0.10)",  text: "var(--warn)",
    note: "標準開池、合理 sizing。" },
  { min: 10, max: 25,  label: "Push/Fold",   color: "rgba(217,111,94,0.13)",  text: "var(--bad)",
    note: "Nash jam 區，三街遊戲消失。" },
  { min: 0,  max: 10,  label: "Survival",   color: "rgba(217,111,94,0.22)",  text: "var(--bad)",
    note: "任意兩張、別 fold 賠率超過 1:2 的全下。" },
];

function buildLevels(bb0, cfg) {
  const out = [];
  let bb = bb0;
  for (let i = 0; i < cfg.levels; i++) {
    out.push({
      idx: i + 1,
      timeStart: i * cfg.minutes,
      timeEnd: (i + 1) * cfg.minutes,
      bb: Math.round(bb),
      sb: Math.round(bb / 2),
      ante: i >= cfg.anteAt ? Math.round(bb * cfg.anteRatio) : 0,
    });
    bb = bb * cfg.growth;
  }
  return out;
}

function depthZone(bb) {
  for (const z of DEPTH_ZONES) if (bb >= z.min && bb < z.max) return z;
  return DEPTH_ZONES[DEPTH_ZONES.length - 1];
}

function BlindEscalation() {
  const [preset, setPreset] = useState("regular");
  const [chips, setChips] = useState(30000);
  const [bb0, setBb0] = useState(200);
  const [t, setT] = useState(0); // current time in minutes

  const cfg = BLIND_PRESETS[preset];
  const levels = useMemo(() => buildLevels(bb0, cfg), [bb0, preset]);
  const totalMin = levels[levels.length - 1].timeEnd;

  // Clamp t when preset changes
  React.useEffect(() => { if (t > totalMin) setT(totalMin); }, [totalMin]); // eslint-disable-line

  // current level by time
  const currentLevel = levels.find(L => t >= L.timeStart && t < L.timeEnd) || levels[levels.length - 1];
  const currentBB = currentLevel.bb;
  const currentDepth = chips / currentBB;
  const zone = depthZone(currentDepth);

  // chart geometry
  const W = 760, H = 240, pad = { l: 44, r: 18, t: 14, b: 30 };
  const innerW = W - pad.l - pad.r, innerH = H - pad.t - pad.b;
  const maxDepth = Math.max(chips / levels[0].bb, 60);
  const xAt = (mins) => pad.l + (mins / totalMin) * innerW;
  const yAt = (depth) => pad.t + innerH - Math.min(depth, maxDepth) / maxDepth * innerH;

  // polyline of bb depth across time — stair-step (constant within each level)
  const stepPath = useMemo(() => {
    const pts = [];
    for (const L of levels) {
      const d = chips / L.bb;
      pts.push([xAt(L.timeStart), yAt(d)]);
      pts.push([xAt(L.timeEnd),   yAt(d)]);
    }
    return pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  }, [levels, chips, totalMin]); // eslint-disable-line

  // y-axis ticks
  const yTicks = [10, 25, 50, 100, 200].filter(v => v <= maxDepth);

  return (
    <Section num="06.6" title="盲注吃人模擬器 · Blind Escalation"
      lede="假設你完全不贏不輸 — 只是被盲注吃，你的有效深度隨時間怎麼變？這張圖告訴你：什麼時候會掉進 push/fold 區、什麼時候必須開始施壓偷盲。「等好牌」之所以行不通，全寫在這條斜線上。">

      <div className="grid-2" style={{ gap: 18, alignItems: "start", gridTemplateColumns: "300px 1fr" }}>
        {/* Inputs */}
        <div className="card">
          <div className="card-eyebrow mb-16">參數</div>

          <div className="mono text-faint mb-8" style={{ fontSize: 10 }}>盲注速度</div>
          <div className="col gap-8 mb-24">
            {Object.entries(BLIND_PRESETS).map(([k, v]) => (
              <button key={k}
                onClick={() => setPreset(k)}
                style={{
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 6,
                  background: preset === k ? "rgba(201,165,92,0.12)" : "transparent",
                  border: "1px solid " + (preset === k ? "var(--gold)" : "var(--line)"),
                  cursor: "pointer",
                  color: "inherit",
                }}>
                <div className="row between">
                  <span className="serif" style={{ fontSize: 14, color: preset === k ? "var(--cream)" : "var(--fg-dim)" }}>
                    {v.label}
                  </span>
                  <span className="mono text-gold" style={{ fontSize: 11 }}>{v.minutes} 分鐘 / 級</span>
                </div>
                <div className="mono text-faint mt-4" style={{ fontSize: 10 }}>
                  每級盲注 × {v.growth.toFixed(2)} · ante 從第 {v.anteAt + 1} 級開始
                </div>
              </button>
            ))}
          </div>

          <div className="mono text-faint mb-8" style={{ fontSize: 10 }}>起始籌碼 (chips)</div>
          <input type="number" value={chips} step={1000} min={1000}
            onChange={e => setChips(Math.max(1000, parseInt(e.target.value) || 1000))}
            style={inputStyle({ width: "100%", marginBottom: 14, fontFamily: "var(--mono)" })} />

          <div className="mono text-faint mb-8" style={{ fontSize: 10 }}>起始 BB</div>
          <input type="number" value={bb0} step={50} min={50}
            onChange={e => setBb0(Math.max(50, parseInt(e.target.value) || 50))}
            style={inputStyle({ width: "100%", fontFamily: "var(--mono)" })} />
          <div className="mono text-faint mt-8" style={{ fontSize: 10 }}>
            起始深度 = {Math.round(chips / bb0)}bb
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ padding: 22 }}>
          <div className="row between mb-16" style={{ alignItems: "baseline" }}>
            <div>
              <div className="card-eyebrow mb-8">YOUR BB DEPTH OVER TIME</div>
              <div className="serif" style={{ fontSize: 17, color: "var(--cream)" }}>
                假設你不贏不輸的「自然衰減」曲線
              </div>
            </div>
            <div className="text-dim mono" style={{ fontSize: 11 }}>
              總時長 {Math.round(totalMin / 60 * 10) / 10} 小時 · {levels.length} 級
            </div>
          </div>

          <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", height: "auto", display: "block" }}>
            {/* zones */}
            {DEPTH_ZONES.map((z, i) => {
              const yTop = yAt(Math.min(z.max, maxDepth));
              const yBot = yAt(z.min);
              return (
                <g key={i}>
                  <rect x={pad.l} y={yTop} width={innerW} height={yBot - yTop} fill={z.color} />
                  <text x={pad.l + 6} y={yTop + 14}
                    style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em" }}
                    fill={z.text}>{z.label.toUpperCase()}</text>
                </g>
              );
            })}

            {/* grid */}
            {yTicks.map(v => (
              <g key={v}>
                <line x1={pad.l} x2={W - pad.r} y1={yAt(v)} y2={yAt(v)}
                  stroke="rgba(244,234,208,0.06)" strokeDasharray="2 4" />
                <text x={pad.l - 8} y={yAt(v) + 3}
                  textAnchor="end"
                  style={{ fontFamily: "var(--mono)", fontSize: 10 }}
                  fill="var(--fg-faint)">{v}bb</text>
              </g>
            ))}

            {/* ante start line */}
            {(() => {
              const anteStart = levels[cfg.anteAt]?.timeStart;
              if (anteStart == null) return null;
              const x = xAt(anteStart);
              return (
                <g>
                  <line x1={x} x2={x} y1={pad.t} y2={H - pad.b}
                    stroke="var(--gold-dim)" strokeDasharray="3 3" opacity={0.6} />
                  <text x={x + 4} y={pad.t + 12}
                    style={{ fontFamily: "var(--mono)", fontSize: 9 }}
                    fill="var(--gold)">ANTE START</text>
                </g>
              );
            })()}

            {/* x-axis time ticks */}
            {levels.filter((_, i) => i % 2 === 0).map((L) => (
              <text key={L.idx} x={xAt(L.timeStart)} y={H - pad.b + 14}
                textAnchor="middle"
                style={{ fontFamily: "var(--mono)", fontSize: 9 }}
                fill="var(--fg-faint)">{L.timeStart}m</text>
            ))}

            {/* step line */}
            <path d={stepPath} fill="none" stroke="var(--gold)" strokeWidth="2" />
            <path d={stepPath + " L" + xAt(totalMin) + "," + yAt(0) + " L" + pad.l + "," + yAt(0) + " Z"}
              fill="url(#bb-grad)" opacity={0.18} />

            {/* gradient fill under line */}
            <defs>
              <linearGradient id="bb-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* current time marker */}
            <g>
              <line x1={xAt(t)} x2={xAt(t)} y1={pad.t} y2={H - pad.b}
                stroke="var(--cream)" strokeWidth="1" opacity={0.6} />
              <circle cx={xAt(t)} cy={yAt(currentDepth)} r={5} fill="var(--cream)" stroke="var(--gold)" strokeWidth={2} />
            </g>
          </svg>

          {/* scrubber */}
          <div className="mt-16">
            <input type="range" min={0} max={totalMin} step={1}
              value={t} onChange={e => setT(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "var(--gold)" }} />
            <div className="row between mono text-faint" style={{ fontSize: 10 }}>
              <span>0m</span>
              <span>{Math.round(totalMin / 4)}m</span>
              <span>{Math.round(totalMin / 2)}m</span>
              <span>{Math.round(totalMin * 3 / 4)}m</span>
              <span>{totalMin}m</span>
            </div>
          </div>

          {/* current readout */}
          <div className="grid-4 mt-24" style={{ gap: 10 }}>
            <div className="stat" style={{ padding: "10px 12px" }}>
              <div className="stat-label">時間</div>
              <div className="stat-value" style={{ fontSize: 22 }}>{t}<span style={{ fontSize: 12, color: "var(--fg-dim)" }}>分</span></div>
              <div className="stat-sub">Level {currentLevel.idx}</div>
            </div>
            <div className="stat" style={{ padding: "10px 12px" }}>
              <div className="stat-label">當前盲注</div>
              <div className="stat-value" style={{ fontSize: 18, fontFamily: "var(--mono)" }}>
                {currentLevel.sb}/{currentBB}
              </div>
              <div className="stat-sub">{currentLevel.ante ? "ante " + currentLevel.ante : "no ante"}</div>
            </div>
            <div className="stat" style={{ padding: "10px 12px" }}>
              <div className="stat-label">你的深度</div>
              <div className="stat-value" style={{ fontSize: 22, color: zone.text }}>
                {currentDepth.toFixed(0)}<span style={{ fontSize: 12 }}>bb</span>
              </div>
              <div className="stat-sub" style={{ color: zone.text }}>{zone.label}</div>
            </div>
            <div className="stat" style={{ padding: "10px 12px" }}>
              <div className="stat-label">建議模式</div>
              <div className="serif" style={{ fontSize: 14, marginTop: 6, lineHeight: 1.4 }}>
                {zone.note}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level table */}
      <div className="card mt-24" style={{ padding: 0, overflow: "hidden" }}>
        <table className="dt" style={{ margin: 0 }}>
          <thead>
            <tr>
              <th>級</th>
              <th>起始時間</th>
              <th>SB / BB</th>
              <th>Ante</th>
              <th>你的 bb 深度 (不贏不輸)</th>
              <th>區間</th>
            </tr>
          </thead>
          <tbody>
            {levels.map(L => {
              const d = chips / L.bb;
              const z = depthZone(d);
              const isCurrent = L === currentLevel;
              return (
                <tr key={L.idx} style={isCurrent ? { background: "rgba(201,165,92,0.06)" } : null}>
                  <td className="mono text-gold">{L.idx}</td>
                  <td className="mono">{L.timeStart}m</td>
                  <td className="mono">{L.sb}/{L.bb}</td>
                  <td className="mono text-dim">{L.ante || "—"}</td>
                  <td className="mono" style={{ color: z.text, fontWeight: 700 }}>{d.toFixed(0)}bb</td>
                  <td><Pill tone={z.text === "var(--good)" ? "good" : z.text === "var(--warn)" ? "warn" : "bad"}>{z.label}</Pill></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card mt-24" style={{ background: "rgba(0,0,0,0.25)" }}>
        <div className="card-eyebrow mb-8">為什麼這張圖重要</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: "var(--fg-dim)" }}>
          <li>新手最常犯的錯：「我只是等好牌」— 但等的同時，深度從 150bb 滑到 25bb，等於把每一手的戰術空間都讓給對手。</li>
          <li>看你進入 Push/Fold 區的時間點。Regular 速度大約是 90–120 分鐘左右；Turbo 賽不到一小時。這之前必須累積到 chip-EV 上方。</li>
          <li>Ante 開始的那條虛線是「偷盲 EV 翻倍」的時刻。從這裡開始，BTN/CO 應該明顯加大開池頻率。</li>
          <li>圖上忽略了你實際贏輸籌碼；現實中需要靠主動行動把曲線拉回去。「主動」不是選項，是必要條件。</li>
        </ul>
      </div>
    </Section>
  );
}

window.PageTournament = PageTournament;
