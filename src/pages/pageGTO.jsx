/* global React, useState, PageHeader, Section, Pill, Bar */

function PageGTO() {
  const [tab, setTab] = useState("gto");

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 07 · GTO vs Exploitative"
        title="均衡的盾牌，剝削的劍"
        sub="GTO 讓你不被任何人剝削；Exploitative 讓你針對對手弱點賺最多。頂尖玩家以 GTO 為基準，再依場上資訊偏離。"
      />

      <Section num="06.1" title="兩種思維的核心差異">
        <div className="grid-2">
          <div className="card" style={{ background: "linear-gradient(180deg, var(--felt), var(--felt-dark))" }}>
            <div className="row between mb-16">
              <div className="card-eyebrow" style={{ color: "var(--gold)" }}>GTO · 賽局理論最佳</div>
              <Pill tone="gold">不可剝削</Pill>
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 10 }}>策略本身就是答案</h3>
            <p className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              假設對手也打最佳，你的策略對任何反制都不虧。混合頻率（同一手有時 raise 有時 call）是核心。
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "var(--fg)" }}>
              <li>建立平衡的價值/詐唬比例</li>
              <li>用阻斷牌挑詐唬</li>
              <li>下注尺度遵守理論最優</li>
              <li>面對未知對手或強對手時的預設值</li>
            </ul>
          </div>

          <div className="card">
            <div className="row between mb-16">
              <div className="card-eyebrow" style={{ color: "var(--info)" }}>EXPLOITATIVE · 剝削式</div>
              <Pill>賺最多</Pill>
            </div>
            <h3 style={{ fontSize: 20, marginBottom: 10 }}>對手錯就放大他的錯</h3>
            <p className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7 }}>
              偵測對手偏離，然後做反向偏離。對 nit 多偷，對 calling station 不詐唬，對 LAG 抓詐唬。
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "var(--fg)" }}>
              <li>讀對手樣式（HUD 或現場觀察）</li>
              <li>放大對手最大的洞</li>
              <li>願意打不平衡的線</li>
              <li>低池、休閒桌的最大盈利方式</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section num="06.2" title="什麼時候用什麼？">
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="dt">
            <thead><tr><th>場景</th><th>建議思維</th><th>原因</th></tr></thead>
            <tbody>
              {DECISION_TABLE.map((r, i) => (
                <tr key={i}>
                  <td>{r.scene}</td>
                  <td>
                    <Pill tone={r.mode === "GTO" ? "gold" : r.mode === "EXP" ? "good" : ""}>
                      {r.mode === "GTO" ? "GTO 預設" : r.mode === "EXP" ? "剝削式" : "混合"}
                    </Pill>
                  </td>
                  <td className="text-dim" style={{ fontSize: 13 }}>{r.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section num="06.3" title="範例 — 河牌 bluff catch 頻率">
        <div className="card">
          <div className="text-dim mb-16" style={{ fontSize: 14 }}>
            對手河牌下注 75% 池，需要對手 30% 詐唬比例你才達到 indifference。
          </div>

          <div className="grid-3">
            <div>
              <div className="card-eyebrow mb-8">GTO 防守</div>
              <div className="serif text-gold" style={{ fontSize: 28, fontWeight: 700 }}>57.1%</div>
              <Bar value={57} color="var(--gold)" height={6} style={{ marginTop: 8 }} />
              <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>MDF = 1 − bet/(bet+pot)</div>
            </div>
            <div>
              <div className="card-eyebrow mb-8">對 NIT (緊家)</div>
              <div className="serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--info)" }}>30%</div>
              <Bar value={30} color="var(--info)" height={6} style={{ marginTop: 8 }} />
              <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>他幾乎不詐唬，多棄</div>
            </div>
            <div>
              <div className="card-eyebrow mb-8">對 LAG (鬆兇)</div>
              <div className="serif" style={{ fontSize: 28, fontWeight: 700, color: "var(--good)" }}>75%</div>
              <Bar value={75} color="var(--good)" height={6} style={{ marginTop: 8 }} />
              <div className="mono text-faint mt-8" style={{ fontSize: 11 }}>他常詐唬，多抓</div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

const DECISION_TABLE = [
  { scene: "未知對手 / 第一手牌", mode: "GTO", why: "沒資訊，預設不被剝削。" },
  { scene: "高水準對手 (regs)", mode: "GTO", why: "對方也讀你；偏離容易被抓。" },
  { scene: "低池娛樂玩家", mode: "EXP", why: "他們有大洞，GTO 在這裡留 EV 在桌上。" },
  { scene: "Calling station 對手", mode: "EXP", why: "別詐唬、放大價值尺度。" },
  { scene: "Nit (太緊) 對手", mode: "EXP", why: "增加偷盲與詐唬頻率，他會棄牌。" },
  { scene: "錦標賽 ICM 階段", mode: "MIX", why: "起點是 GTO，再加上 ICM 調整。" },
  { scene: "你還沒讀清對手", mode: "GTO", why: "等資訊，先打平衡。" },
];

window.PageGTO = PageGTO;
