/* global React, useState, useMemo, PageHeader, Section, Stat, Pill, Bar */

function PageOdds() {
  const [pot, setPot] = useState(1000);
  const [bet, setBet] = useState(500);
  const [equity, setEquity] = useState(35);
  const [outs, setOuts] = useState(9);
  const [street, setStreet] = useState("turn");

  const callAmt = bet;
  const totalPot = pot + bet + bet;
  const breakEven = (callAmt / totalPot) * 100;
  const ev = (equity / 100) * (pot + bet) - (1 - equity / 100) * callAmt;
  const decision = equity >= breakEven ? "+EV · 跟注" : "−EV · 棄牌";

  // outs → equity (rule of 4 / 2)
  const outsEq = street === "flop" ? outs * 4 : outs * 2;

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 04 · 賠率與期望值"
        title="撲克是數學遊戲"
        sub="Pot odds 告訴你需要多少勝率才能跟注；EV 把贏與輸的兩種未來折成一個數字。會計算的玩家，才能持續贏。"
      />

      <Section num="04.1" title="底池賠率計算機">
        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div className="card-title">輸入情境</div>
              <span className="mono text-gold">CALCULATOR</span>
            </div>
            <NumField label="底池大小 (Pot)" value={pot} setValue={setPot} step={50} />
            <NumField label="對手下注 (Bet)" value={bet} setValue={setBet} step={50} />
            <NumField label="你的勝率 % (Equity)" value={equity} setValue={setEquity} min={0} max={100} step={1} />
          </div>

          <div className="card" style={{ background: "linear-gradient(180deg, var(--felt), var(--felt-dark))" }}>
            <div className="card-head">
              <div className="card-title">結果</div>
              <span className="mono text-gold">RESULT</span>
            </div>
            <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <Stat label="需要勝率" value={breakEven.toFixed(1) + "%"} sub={"跟 " + callAmt + " 贏 " + (pot + bet)} />
              <Stat
                label="期望值 (EV)"
                value={(ev >= 0 ? "+" : "") + ev.toFixed(0)}
                sub={ev >= 0 ? "長期賺" : "長期虧"}
                accent={ev >= 0 ? "var(--good)" : "var(--bad)"}
              />
            </div>
            <div className="mt-24">
              <Bar label="你的勝率" value={equity} max={100} color="var(--gold)" height={8} />
              <div style={{ marginTop: 14 }}>
                <Bar label="所需勝率" value={breakEven} max={100} color="var(--bad)" height={8} />
              </div>
            </div>
            <div className="mt-24" style={{
              padding: 14, borderRadius: 8,
              background: ev >= 0 ? "rgba(111,194,138,0.1)" : "rgba(217,111,94,0.1)",
              border: "1px solid " + (ev >= 0 ? "rgba(111,194,138,0.3)" : "rgba(217,111,94,0.3)"),
            }}>
              <div className="mono uppercase" style={{ fontSize: 11, color: ev >= 0 ? "var(--good)" : "var(--bad)" }}>建議</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: ev >= 0 ? "var(--good)" : "var(--bad)" }}>{decision}</div>
            </div>
          </div>
        </div>
      </Section>

      <Section num="04.2" title="Outs · 補牌機率速查">
        <div className="card">
          <div className="row between mb-16">
            <div>
              <div className="card-eyebrow mb-8">RULE OF 4 / 2</div>
              <div className="serif" style={{ fontSize: 18 }}>Outs × {street === "flop" ? "4" : "2"} ≈ 成牌機率 %</div>
            </div>
            <div className="row gap-8">
              <button onClick={() => setStreet("flop")}
                className="btn btn-sm"
                style={{
                  background: street === "flop" ? "var(--gold)" : "transparent",
                  color: street === "flop" ? "var(--ink)" : "var(--cream)",
                  borderColor: street === "flop" ? "var(--gold)" : "var(--line)",
                }}>翻牌→河 ×4</button>
              <button onClick={() => setStreet("turn")}
                className="btn btn-sm"
                style={{
                  background: street === "turn" ? "var(--gold)" : "transparent",
                  color: street === "turn" ? "var(--ink)" : "var(--cream)",
                  borderColor: street === "turn" ? "var(--gold)" : "var(--line)",
                }}>轉牌→河 ×2</button>
            </div>
          </div>

          <div className="row gap-16 mb-24">
            <NumField inline label="Outs" value={outs} setValue={setOuts} min={0} max={20} step={1} />
            <div className="card" style={{ flex: 1, padding: 14 }}>
              <div className="uppercase text-faint">估算勝率</div>
              <div className="serif text-gold" style={{ fontSize: 28, fontWeight: 700 }}>{outsEq}%</div>
            </div>
          </div>

          <table className="dt">
            <thead><tr><th>常見牌型</th><th>Outs</th><th>翻→河 (~4×)</th><th>轉→河 (~2×)</th></tr></thead>
            <tbody>
              {OUTS_TABLE.map(o => (
                <tr key={o.name}>
                  <td>{o.name}</td>
                  <td className="num text-gold">{o.outs}</td>
                  <td className="num">{o.flop}%</td>
                  <td className="num">{o.turn}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section num="04.3" title="Implied / Reverse Implied Odds" lede="當前賠率不夠，未來街道能否補回來？">
        <div className="grid-2">
          <div className="card">
            <div className="card-eyebrow mb-8">IMPLIED ODDS · 隱含賠率</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 8 }}>追大牌、藏在弱範圍裡的時候</div>
            <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              聽 nut flush 翻到河 35% 勝率，當前底池只給 25% 賠率？如果對手是強牌（會在後街繼續投錢），call 仍然 +EV。
            </div>
          </div>
          <div className="card">
            <div className="card-eyebrow mb-8">REVERSE IMPLIED · 反向隱含</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 8 }}>看似中等牌，未來會輸更多</div>
            <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              KQ 在 Q72 翻牌看似頂對，但對手範圍多 AQ。即便當下勝率夠，後街每次跟注都在送錢。減少跟注、控池或棄掉。
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function NumField({ label, value, setValue, min = 0, max = 999999, step = 1, inline }) {
  return (
    <div style={{ marginBottom: inline ? 0 : 16, flex: inline ? 1 : "auto" }}>
      <div className="uppercase text-faint mb-8">{label}</div>
      <div className="row gap-8">
        <button className="btn btn-sm btn-ghost" onClick={() => setValue(Math.max(min, value - step))}>−</button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={e => setValue(Math.min(max, Math.max(min, parseFloat(e.target.value) || 0)))}
          style={{
            flex: 1, background: "var(--bg)", border: "1px solid var(--line)",
            color: "var(--cream)", padding: "8px 12px", borderRadius: 6,
            fontFamily: "var(--mono)", fontSize: 16, textAlign: "center",
          }}
        />
        <button className="btn btn-sm btn-ghost" onClick={() => setValue(Math.min(max, value + step))}>+</button>
      </div>
    </div>
  );
}

const OUTS_TABLE = [
  { name: "順子聽牌 (open-ended)", outs: 8, flop: 32, turn: 17 },
  { name: "卡張順 (gutshot)",       outs: 4, flop: 17, turn: 9 },
  { name: "同花聽牌",               outs: 9, flop: 35, turn: 19.5 },
  { name: "同花 + open-ended",      outs: 15, flop: 54, turn: 33 },
  { name: "對 → 三條 (set draw)",   outs: 2, flop: 8, turn: 4.3 },
  { name: "對 → 兩對或三條",         outs: 5, flop: 20, turn: 11 },
  { name: "Overcards (兩張高張)",   outs: 6, flop: 24, turn: 13 },
];

window.PageOdds = PageOdds;
