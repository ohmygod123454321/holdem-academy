/* global React, useState, useMemo, PageHeader, Section, RFI_RANGES, RANKS, buildPreflopMatrix, POSITIONS_9, Pill */

function PagePreflop() {
  const [pos, setPos] = useState("BTN");
  const matrix = useMemo(() => buildPreflopMatrix(RFI_RANGES[pos].hands), [pos]);
  const rfi = RFI_RANGES[pos];

  // 統計
  const total = 169;
  const counts = matrix.flat().reduce((acc, c) => {
    acc[c.action] = (acc[c.action] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 03 · 起手牌"
        title="13×13 — 全部 169 種起手手牌"
        sub="同點數對 (對角線)、同花 (右上)、雜花 (左下)。每個位置都有自己最佳的開池範圍；先記憶 BTN 與 UTG 兩極端，中間位用感覺插值。"
      />

      <Section num="03.1" title="位置切換" lede="點選位置查看該位置的 RFI（首加注）範圍。">
        <div className="row gap-8 mb-24" style={{ flexWrap: "wrap" }}>
          {Object.keys(RFI_RANGES).map(p => (
            <button key={p}
              onClick={() => setPos(p)}
              className="btn btn-sm"
              style={{
                background: pos === p ? "linear-gradient(180deg, var(--gold-bright), var(--gold))" : "transparent",
                color: pos === p ? "var(--ink)" : "var(--cream)",
                borderColor: pos === p ? "var(--gold)" : "var(--line)",
                fontWeight: pos === p ? 700 : 400,
              }}>
              {p}<span style={{ opacity: 0.6, marginLeft: 6, fontSize: 11 }}>{RFI_RANGES[p].pct}%</span>
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 32, alignItems: "start" }}>
          <div className="card">
            <div className="card-head">
              <div className="card-title">{pos} 開池範圍 · RFI</div>
              <span className="mono text-gold">{POSITIONS_9.find(p => p.id === pos)?.cn} · {rfi.pct}%</span>
            </div>
            <PreflopMatrix matrix={matrix} />
          </div>

          <div className="col gap-16">
            <div className="card">
              <div className="card-eyebrow mb-8">圖例</div>
              <Legend swatch="var(--gold)" label="加注 (Raise)" />
              <Legend swatch="var(--felt-light)" label="跟注 (Call) — 部分情境" />
              <Legend swatch="rgba(0,0,0,0.3)" label="棄牌 (Fold)" border />
              <div style={{ borderTop: "1px solid var(--line)", margin: "12px 0" }} />
              <div className="text-faint mono" style={{ fontSize: 11, lineHeight: 1.6 }}>
                上三角 = 同花<br/>
                對角線 = 對<br/>
                下三角 = 雜花
              </div>
            </div>

            <div className="card">
              <div className="card-eyebrow mb-8">範圍統計</div>
              <div className="row between"><span className="text-dim">加注組合</span><span className="mono text-gold">{Math.round(rfi.pct * 13.26) / 100}%</span></div>
              <div className="row between"><span className="text-dim">手牌格</span><span className="mono">{counts.R || 0} / {total}</span></div>
              <div className="row between"><span className="text-dim">建議尺度</span><span className="mono text-gold">2.2-2.5x</span></div>
            </div>

            <div className="card">
              <div className="card-eyebrow mb-8">記憶口訣</div>
              <ul style={{ paddingLeft: 18, color: "var(--fg-dim)", fontSize: 13, lineHeight: 1.7 }}>
                <li>UTG：22+, AT+, KQ</li>
                <li>CO：22+, A2s+, K9s+, ATo+</li>
                <li>BTN：幾乎全打，丟掉最爛 50%</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section num="03.2" title="3-bet 範圍 · 兩極化結構" lede="3-bet 不是「多加 5%」，而是 polarized：強牌 + 阻斷牌詐唬。">
        <div className="grid-2">
          <div className="card">
            <div className="card-eyebrow mb-8">VALUE · 價值區</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 8 }}>QQ+, AKs, AKo</div>
            <div className="text-dim" style={{ fontSize: 13 }}>對抗 4-bet 仍 ahead 或好賠率打到底。</div>
          </div>
          <div className="card">
            <div className="card-eyebrow mb-8">BLUFF · 詐唬區</div>
            <div className="serif" style={{ fontSize: 17, marginBottom: 8 }}>A5s, A4s, KQs</div>
            <div className="text-dim" style={{ fontSize: 13 }}>有 A 阻斷牌，被 4-bet 棄掉乾淨；同花連張作 backup equity。</div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function PreflopMatrix({ matrix }) {
  return (
    <div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(13, 1fr)",
        gap: 2,
        fontFamily: "var(--mono)",
      }}>
        {matrix.flat().map((cell, i) => {
          const isPair = cell.type === "pair";
          const bg = cell.action === "R"
            ? (isPair ? "var(--gold)" : "rgba(201,165,92,0.65)")
            : "rgba(0,0,0,0.4)";
          const fg = cell.action === "R" ? "var(--ink)" : "var(--fg-faint)";
          return (
            <div key={i}
              title={cell.code}
              style={{
                aspectRatio: "1",
                background: bg,
                color: fg,
                display: "grid", placeItems: "center",
                fontSize: "clamp(9px, 1vw, 12px)",
                fontWeight: cell.action === "R" ? 700 : 400,
                borderRadius: 2,
                border: isPair && cell.action === "R" ? "1px solid var(--gold-bright)" : "none",
              }}>
              {cell.code}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ swatch, label, border }) {
  return (
    <div className="row gap-8" style={{ marginBottom: 6 }}>
      <span style={{ width: 14, height: 14, background: swatch, border: border ? "1px solid var(--line)" : "none", borderRadius: 2 }} />
      <span style={{ fontSize: 12.5 }}>{label}</span>
    </div>
  );
}

window.PagePreflop = PagePreflop;
