/* global React, useState, PageHeader, Section, PlayingCard, Pill, Bar */

function PageReplay() {
  const [hand, setHand] = useState(SAMPLE_HAND);
  const [analyzed, setAnalyzed] = useState(true);

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 10 · 手牌復盤"
        title="把昨晚那一手丟進來"
        sub="輸入位置、手牌、行動序列；系統會逐街給你打分數、列出最佳選擇與你選擇的 EV 落差。"
        right={
          <div className="row gap-12">
            <button className="btn btn-ghost btn-sm" onClick={() => { setHand(SAMPLE_HAND); setAnalyzed(true); }}>載入範例</button>
          </div>
        }
      />

      <Section num="08.1" title="復盤檢視 — 範例手牌">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">牌局摘要</div>
              <Pill tone="gold">100bb · Cash</Pill>
            </div>
            <div className="row between mb-16">
              <div>
                <div className="uppercase text-faint">英雄位置</div>
                <div className="mono text-gold" style={{ fontSize: 17, marginTop: 4 }}>{hand.heroPos}</div>
              </div>
              <div>
                <div className="uppercase text-faint">對手位置</div>
                <div className="mono" style={{ fontSize: 17, marginTop: 4 }}>{hand.villainPos}</div>
              </div>
              <div>
                <div className="uppercase text-faint">最終結果</div>
                <div className="serif text-bad" style={{ fontSize: 17, marginTop: 4 }}>{hand.result}</div>
              </div>
            </div>
            <div className="mb-16">
              <div className="uppercase text-faint mb-8">英雄手牌</div>
              <div className="row gap-6">{hand.hero.map((c, i) => <PlayingCard key={i} card={c} size={48} />)}</div>
            </div>
            <div>
              <div className="uppercase text-faint mb-8">最終公共牌</div>
              <div className="row gap-6">{hand.board.map((c, i) => <PlayingCard key={i} card={c} size={48} />)}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <div className="card-title">總體評分</div>
              <span className="mono text-gold">REPLAY SCORE</span>
            </div>
            <div className="row gap-32" style={{ alignItems: "flex-end" }}>
              <div>
                <div className="serif" style={{ fontSize: 64, fontWeight: 700, color: "var(--warn)", lineHeight: 1 }}>C+</div>
                <div className="mono text-dim mt-8" style={{ fontSize: 11 }}>4 個決策中 2 個次優</div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="row between mb-8"><span className="text-dim">總 EV 損失</span><span className="mono text-bad">−320 chips</span></div>
                <Bar value={45} color="var(--bad)" height={6} />
                <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>主要來源：轉牌跟注 + 河牌詐唬</div>
              </div>
            </div>
            <div className="mt-24">
              <div className="card-eyebrow mb-8">摘要建議</div>
              <p className="text-dim" style={{ fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                翻牌前打得乾淨。翻牌的 c-bet 尺度可以再小一點（30-40% 池）。轉牌的跟注是最大失誤 — 牌型已落後對手範圍。河牌詐唬尺度過小，無法形成有意義的 fold equity。
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section num="08.2" title="逐街分析">
        <div className="col gap-12">
          {hand.actions.map((a, i) => (
            <StreetAnalysis key={i} action={a} num={i + 1} />
          ))}
        </div>
      </Section>

      <Section num="08.3" title="輸入你自己的牌局" lede="這個版本是 demo — 想做完整 hand history 解析請貼上 PokerStars / GG 格式。">
        <div className="card">
          <div className="card-eyebrow mb-8">PASTE HAND HISTORY</div>
          <textarea
            placeholder={"PokerStars Hand #...\nSeat 1: Hero (10000 in chips)\n..."}
            style={{
              width: "100%", minHeight: 140,
              background: "var(--bg)", border: "1px solid var(--line)",
              color: "var(--cream)", padding: 14, borderRadius: 6,
              fontFamily: "var(--mono)", fontSize: 12, resize: "vertical",
            }}
          />
          <div className="row gap-12 mt-16">
            <button className="btn btn-primary" onClick={() => { setAnalyzed(true); if (window.Progress) window.Progress.addReplay(); }}>分析牌局</button>
            <button className="btn btn-ghost" onClick={() => setAnalyzed(false)}>清除</button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function StreetAnalysis({ action, num }) {
  const ratingColor = { good: "var(--good)", ok: "var(--warn)", bad: "var(--bad)" }[action.rating];
  const ratingLabel = { good: "✓ 最佳", ok: "△ 可以更好", bad: "✗ 偏離" }[action.rating];
  return (
    <div className="card" style={{
      padding: "16px 22px",
      borderLeft: "3px solid " + ratingColor,
    }}>
      <div className="row between mb-12">
        <div className="row gap-12">
          <span className="mono text-gold" style={{ fontSize: 11, letterSpacing: "0.18em" }}>STREET {num}</span>
          <span className="serif" style={{ fontSize: 17, fontWeight: 600 }}>{action.street}</span>
          {action.board && <div className="row gap-4">{action.board.map((c, i) => <PlayingCard key={i} card={c} size={28} />)}</div>}
        </div>
        <div className="row gap-12">
          <span className="mono" style={{ fontSize: 12, color: ratingColor }}>{ratingLabel}</span>
          <span className="mono text-dim" style={{ fontSize: 12 }}>EV {action.ev >= 0 ? "+" : ""}{action.ev}</span>
        </div>
      </div>
      <div className="grid-2" style={{ gap: 16 }}>
        <div>
          <div className="uppercase text-faint mb-8">你的行動</div>
          <div className="serif" style={{ fontSize: 15 }}>{action.taken}</div>
        </div>
        <div>
          <div className="uppercase text-faint mb-8">建議行動</div>
          <div className="serif text-gold" style={{ fontSize: 15 }}>{action.best}</div>
        </div>
      </div>
      <div className="mt-12" style={{ fontSize: 13, color: "var(--fg-dim)", lineHeight: 1.6 }}>
        {action.note}
      </div>
    </div>
  );
}

const SAMPLE_HAND = {
  heroPos: "BTN",
  villainPos: "BB",
  hero: ["Ah", "Jc"],
  board: ["Qh", "Td", "5s", "8c", "2h"],
  result: "輸 −2400",
  actions: [
    {
      street: "Preflop", board: null,
      taken: "BTN open 2.2x (450)",
      best: "BTN open 2.2-2.5x",
      rating: "good", ev: 25,
      note: "AJo 在 BTN 是清楚的開池，尺度標準。",
    },
    {
      street: "Flop", board: ["Qh","Td","5s"],
      taken: "C-bet 75% pot (820)",
      best: "C-bet 30-35% pot (350)",
      rating: "ok", ev: -45,
      note: "Q T 5 中等濕度，BB 範圍很多 Q x、T x、聽牌。小尺度 c-bet 讓對手帶弱牌跟，且省成本被 check-raise。大尺度只把空氣趕走。",
    },
    {
      street: "Turn", board: ["Qh","Td","5s","8c"],
      taken: "Call 1500 (對手 lead)",
      best: "Fold",
      rating: "bad", ev: -240,
      note: "對手 turn 主動下注代表已升級到 Q9、QT、JT 等強牌。AJ 高 + 卡張順 (4 outs) 對其範圍只有約 18% 勝率，賠率不足。Reverse implied odds 大。",
    },
    {
      street: "River", board: ["Qh","Td","5s","8c","2h"],
      taken: "Bluff raise 2200 (3x)",
      best: "Check / give up",
      rating: "bad", ev: -60,
      note: "尺度太小無法形成可信詐唬（只要對手有對都會跟）。河牌的 polarized over-bet 才有 fold equity；3x 是價值尺度，會被任何對子抓。",
    },
  ],
};

window.PageReplay = PageReplay;
