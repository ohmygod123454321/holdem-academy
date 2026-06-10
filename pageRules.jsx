/* global React, PageHeader, Section, PlayingCard, HAND_RANKINGS, Pill */

function PageRules() {
  return (
    <div>
      <PageHeader
        eyebrow="Chapter 01 · 規則與牌力"
        title="從一副牌到十種勝負"
        sub="德州撲克的核心很簡單：每人兩張底牌，桌面五張公共牌，從七張中組出最強的五張，比大小。難的是十種牌型在不同情境下的「相對價值」。"
      />

      <Section num="01.1" title="一手牌的流程" lede="從發牌到攤牌的完整時序，每一街都對應一輪下注。">
        <div className="card">
          <div className="grid-4" style={{ gap: 0 }}>
            {STREETS.map((s, i) => (
              <div key={s.name} style={{
                padding: "20px 22px",
                borderRight: i < STREETS.length - 1 ? "1px solid var(--line)" : "none",
              }}>
                <div className="mono text-gold" style={{ fontSize: 11, letterSpacing: "0.2em" }}>{s.code}</div>
                <div className="serif" style={{ fontSize: 19, marginTop: 6, marginBottom: 8 }}>{s.name}</div>
                <div className="text-dim" style={{ fontSize: 13, lineHeight: 1.55 }}>{s.desc}</div>
                <div className="row gap-4 mt-16">
                  {s.cards > 0 ? Array.from({ length: s.cards }).map((_, j) => <div key={j} style={{
                    width: 22, height: 30, borderRadius: 3, background: "var(--paper)",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                  }} />) : <span className="text-faint mono" style={{ fontSize: 11 }}>無公共牌</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section num="01.2" title="十種牌型 · 從強到弱" lede="背下這個排序是門檻。比較邏輯：先比型，型同再比點，再比 kicker。">
        <div className="col gap-8">
          {HAND_RANKINGS.map(h => (
            <div key={h.rank} className="card" style={{ padding: "16px 22px" }}>
              <div className="row between" style={{ alignItems: "center", gap: 24 }}>
                <div className="row gap-16" style={{ minWidth: 280, alignItems: "center" }}>
                  <div className="serif" style={{
                    fontSize: 28, fontWeight: 700, color: "var(--gold)",
                    width: 36, textAlign: "right",
                  }}>{h.rank}</div>
                  <div>
                    <div className="serif" style={{ fontSize: 18, fontWeight: 600 }}>{h.name}</div>
                    <div className="mono text-faint" style={{ fontSize: 11, letterSpacing: "0.1em" }}>{h.en}</div>
                  </div>
                </div>
                <div className="row gap-4">
                  {h.example.map(c => <PlayingCard key={c} card={c} size={42} />)}
                </div>
                <div className="text-dim" style={{ fontSize: 13, flex: 1, lineHeight: 1.5 }}>{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section num="01.3" title="比牌的細節" lede="新手最容易卡關的判斷題。">
        <div className="grid-2">
          <div className="card">
            <div className="card-eyebrow mb-8">QUESTION</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 12 }}>
              桌面 K♠ K♥ 7♦ 4♣ 2♠，A 拿 K♣ Q♦，B 拿 K♦ J♥，誰贏？
            </div>
            <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              兩人都成「三條 K」。組成五張：A = K K K Q 7，B = K K K J 7。比第四張 kicker：Q &gt; J，
              <span className="text-gold">A 勝。</span>
            </div>
          </div>
          <div className="card">
            <div className="card-eyebrow mb-8">QUESTION</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 12 }}>
              桌面 5♣ 6♦ 7♠ 8♥ 9♣，所有人手上隨便拿什麼，誰贏？
            </div>
            <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              桌面已經是順子 5-9。除非有人手上拿 T（成 6-T 順）或 4（成 4-8，但更小），多數人會
              <span className="text-gold">平分底池（Chop）</span>。
            </div>
          </div>
          <div className="card">
            <div className="card-eyebrow mb-8">QUESTION</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 12 }}>
              三條從哪裡來？Set 與 Trips 有差嗎？
            </div>
            <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              Set = 你拿口袋對，桌面再來一張同點（隱蔽強）。Trips = 桌面有對，你手上有第三張（容易被讀出）。
              Set 的 EV 顯著高於 Trips。
            </div>
          </div>
          <div className="card">
            <div className="card-eyebrow mb-8">QUESTION</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 12 }}>
              A 可以當 1 嗎？
            </div>
            <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              可以，A2345 是有效順子（Wheel），但點數最小。A 不能「同時」當高與低，例如 QKA23 不是順子。
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const STREETS = [
  { code: "STREET 01", name: "Preflop",    desc: "發兩張底牌，從 UTG 開始下注一輪。", cards: 0 },
  { code: "STREET 02", name: "Flop",       desc: "桌面發三張公共牌，再下注一輪。", cards: 3 },
  { code: "STREET 03", name: "Turn",       desc: "第四張公共牌，下注金額通常翻倍。", cards: 4 },
  { code: "STREET 04", name: "River",      desc: "第五張公共牌。最後下注後攤牌。", cards: 5 },
];

window.PageRules = PageRules;
