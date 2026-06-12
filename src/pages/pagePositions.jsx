/* global React, useState, PageHeader, Section, POSITIONS_9, RFI_RANGES, Pill */

function PagePositions() {
  const [active, setActive] = useState("BTN");
  const pos = POSITIONS_9.find(p => p.id === active);
  const rfi = RFI_RANGES[active] || RFI_RANGES.BTN;

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 02 · 位置"
        title={<>位置 = 訊息 = 利潤</>}
        sub="德州撲克在每一街上，都是按順時針從莊家左邊開始下注。越晚行動，看到越多訊息。同一手牌在 BTN 賺錢，在 UTG 是賠錢戶。"
      />

      <Section num="02.1" title="9-handed 牌桌總覽" lede="點任一座位查看角色定位、開池建議與心態提醒。">
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 32, alignItems: "center" }}>
            <PokerTable active={active} onSelect={setActive} />
            <div>
              <div className="row gap-12 mb-8">
                <span className="mono text-gold" style={{ fontSize: 11, letterSpacing: "0.2em" }}>{pos.id} · {pos.cn}</span>
                <Pill tone={posTone(pos.group)}>{posGroupLabel(pos.group)}</Pill>
              </div>
              <h2 className="serif" style={{ fontSize: 30, marginBottom: 12 }}>{pos.name}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 1.7, color: "var(--fg-dim)" }}>{pos.desc}</p>
              <div className="grid-2 mt-24">
                <div className="card" style={{ padding: 14 }}>
                  <div className="uppercase text-faint">RFI 範圍</div>
                  <div className="serif text-gold" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{rfi.pct}%</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 4 }}>翻牌前主動加注頻率</div>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div className="uppercase text-faint">大略尺度</div>
                  <div className="serif" style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{recSize(pos.id)}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 4 }}>建議開池倍數 / bb</div>
                </div>
              </div>
              <div className="mt-16 text-dim" style={{ fontSize: 13, lineHeight: 1.6 }}>
                <strong className="text-gold">代表手牌：</strong> {rfi.hands.slice(0, 6).join("、")}…
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section num="02.2" title="位置心法" lede="每個位置的「該做的事」一句話。">
        <div className="grid-2">
          {POSITION_TIPS.map(t => (
            <div key={t.id} className="card">
              <div className="row between mb-8">
                <span className="mono text-gold" style={{ fontSize: 11, letterSpacing: "0.18em" }}>{t.id} · {t.cn}</span>
                <Pill tone={t.tone}>{t.tag}</Pill>
              </div>
              <div className="serif" style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{t.title}</div>
              <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{t.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section num="02.3" title="位置 × 開池範圍對照" lede="一張表看清越靠後越寬的趨勢。">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="dt" style={{ marginBottom: 0 }}>
            <thead>
              <tr><th>位置</th><th>RFI %</th><th>視覺化</th><th>典型範圍包含</th></tr>
            </thead>
            <tbody>
              {Object.entries(RFI_RANGES).map(([id, r]) => (
                <tr key={id}>
                  <td>
                    <div className="row gap-8">
                      <span className="mono text-gold" style={{ fontWeight: 600 }}>{id}</span>
                      <span className="text-dim">{POSITIONS_9.find(p => p.id === id)?.cn}</span>
                    </div>
                  </td>
                  <td className="num text-gold">{r.pct}%</td>
                  <td style={{ width: 240 }}>
                    <div style={{ height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: r.pct + "%", height: "100%", background: "var(--gold)" }} />
                    </div>
                  </td>
                  <td className="text-dim" style={{ fontSize: 12.5 }}>{r.hands.slice(0, 5).join("、")}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function PokerTable({ active, onSelect }) {
  // 9 seats around an oval. Seat 0 (BTN) at right.
  // Seats are positioned by angle.
  const seats = POSITIONS_9.slice().sort((a, b) => a.seat - b.seat);
  const W = 460, H = 280;
  const cx = W / 2, cy = H / 2;
  const rx = 180, ry = 100;
  return (
    <div style={{ position: "relative", width: W, height: H + 40, margin: "0 auto" }}>
      <div className="felt" style={{ position: "absolute", inset: "20px 0 20px 0", width: W, height: H, borderRadius: 999 }}>
        <div style={{
          position: "absolute", inset: 0, display: "grid", placeItems: "center",
        }}>
          <div className="serif text-gold" style={{ fontSize: 14, letterSpacing: "0.3em", opacity: 0.45 }}>HOLD'EM ACADEMY</div>
        </div>
      </div>
      {seats.map((p, i) => {
        const angle = (Math.PI / 2) + (i / seats.length) * Math.PI * 2;
        const x = cx + Math.cos(angle) * rx;
        const y = cy + Math.sin(angle) * ry + 20;
        const isActive = p.id === active;
        return (
          <button key={p.id}
            onClick={() => onSelect(p.id)}
            style={{
              position: "absolute",
              left: x - 28, top: y - 28,
              width: 56, height: 56,
              borderRadius: "50%",
              border: "2px solid " + (isActive ? "var(--gold)" : "var(--line-bright)"),
              background: isActive ? "linear-gradient(180deg, var(--gold-bright), var(--gold))" : "var(--felt-deep)",
              color: isActive ? "var(--ink)" : "var(--cream)",
              fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700,
              boxShadow: isActive ? "0 0 0 4px rgba(201,165,92,0.2), 0 8px 16px rgba(0,0,0,0.5)" : "0 4px 10px rgba(0,0,0,0.4)",
              cursor: "pointer",
              transition: "all .15s",
            }}>
            {p.id}
          </button>
        );
      })}
    </div>
  );
}

function posTone(g) {
  return g === "LP" ? "good" : g === "BL" ? "warn" : g === "EP" ? "bad" : "";
}
function posGroupLabel(g) {
  return { LP: "後位", MP: "中位", EP: "前位", BL: "盲注" }[g] || g;
}
function recSize(id) {
  if (id === "UTG" || id === "UTG+1" || id === "MP") return "2.5x";
  if (id === "LJ" || id === "HJ" || id === "CO") return "2.3x";
  if (id === "BTN") return "2.2x";
  if (id === "SB") return "3.0x";
  return "—";
}

const POSITION_TIPS = [
  { id: "UTG / UTG+1", cn: "槍口位", title: "只打有自信的牌", detail: "後面 7 人未行動，任何中弱牌都可能被反加。打 ~11% 的範圍，避免主導劣勢手牌。", tag: "前位", tone: "bad" },
  { id: "MP / LJ", cn: "中位", title: "略寬一點，仍要紀律", detail: "可以加進中對與好的同花連張，但對 3-bet 仍要尊重。", tag: "中位", tone: "" },
  { id: "HJ / CO", cn: "後期區", title: "啟動偷盲機器", detail: "前面棄牌到你時，這是價值 + 詐唬最平衡的位置。CO 可打 28% 範圍。", tag: "後位", tone: "good" },
  { id: "BTN", cn: "莊家位", title: "翻牌後永遠最後行動", detail: "理論最強位置。可開到 45% 範圍，c-bet 高頻，控池與壓力切換自如。", tag: "後位", tone: "good" },
  { id: "SB", cn: "小盲", title: "投了半個盲注的詛咒", detail: "翻牌後 OOP 是大缺點，但 cold-call 通常輸給 3-bet 或 fold。GTO 上 3-bet 高頻。", tag: "盲注", tone: "warn" },
  { id: "BB", cn: "大盲", title: "底池賠率最好的防守位", detail: "已投入 1bb，可超寬防守對付偷盲；但翻牌後 OOP 是長期劣勢。", tag: "盲注", tone: "warn" },
];

window.PagePositions = PagePositions;
