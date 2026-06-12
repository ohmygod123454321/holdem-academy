/* global React, useState, useMemo, PageHeader, Section, Pill, Bar */

function PageStack() {
  const [pot, setPot] = useState(2000);
  const [stack, setStack] = useState(8000);
  const [bb, setBb] = useState(200);
  const spr = pot > 0 ? (stack / pot) : 0;
  const bbDepth = stack / bb;

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 05 · 籌碼深度"
        title="同樣一副 AK，深堆與短碼是不同遊戲"
        sub="SPR (Stack-to-Pot Ratio) 決定翻牌後你能玩多少街道、多大尺度、是否值得 commit。短碼以 push/fold 為主；深堆以位置與機動性決勝。"
      />

      <Section num="05.1" title="SPR 計算器">
        <div className="grid-2">
          <div className="card">
            <div className="card-head">
              <div className="card-title">當前牌局</div>
              <span className="mono text-gold">SPR</span>
            </div>
            <NumField label="翻牌底池 (Pot)" value={pot} setValue={setPot} step={100} />
            <NumField label="有效籌碼 (Effective Stack)" value={stack} setValue={setStack} step={500} />
            <NumField label="大盲注 (BB)" value={bb} setValue={setBb} step={50} />
          </div>
          <div className="card">
            <div className="card-eyebrow mb-8">RESULT</div>
            <div className="serif" style={{ fontSize: 64, fontWeight: 700, color: "var(--gold)", lineHeight: 1, letterSpacing: "-0.02em" }}>
              {spr.toFixed(1)}
            </div>
            <div className="mono text-dim" style={{ fontSize: 12, marginTop: 4 }}>SPR = Stack ÷ Pot</div>
            <div className="mt-16 text-dim" style={{ fontSize: 13, lineHeight: 1.7 }}>
              ≈ {bbDepth.toFixed(0)}bb 籌碼深度<br/>
              區間：<span className="text-gold">{sprBucket(spr).label}</span> — {sprBucket(spr).advice}
            </div>
          </div>
        </div>
      </Section>

      <Section num="05.2" title="不同深度的策略地圖">
        <div className="col gap-16">
          {STACK_DEPTHS.map(d => (
            <div key={d.bb} className="card" style={{ padding: "20px 22px" }}>
              <div className="row between mb-16">
                <div className="row gap-16" style={{ alignItems: "baseline" }}>
                  <span className="serif text-gold" style={{ fontSize: 32, fontWeight: 700 }}>{d.bb}bb</span>
                  <span className="serif" style={{ fontSize: 17 }}>{d.name}</span>
                  <Pill tone={d.tone}>{d.tag}</Pill>
                </div>
                <div className="mono text-dim" style={{ fontSize: 11 }}>SPR≈{d.spr}</div>
              </div>
              <div className="grid-2" style={{ gap: 24 }}>
                <div>
                  <div className="card-eyebrow mb-8">DO ✓</div>
                  <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7, fontSize: 13.5, color: "var(--fg)" }}>
                    {d.dos.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
                <div>
                  <div className="card-eyebrow mb-8" style={{ color: "var(--bad)" }}>AVOID ✗</div>
                  <ul style={{ paddingLeft: 18, margin: 0, lineHeight: 1.7, fontSize: 13.5, color: "var(--fg-dim)" }}>
                    {d.donts.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section num="05.3" title="深度只是其中一半 — 錦標賽要再加一層">
        <div className="card row between" style={{
          padding: "20px 26px", gap: 24, alignItems: "center",
          background: "linear-gradient(90deg, var(--felt), var(--felt-dark))",
        }}>
          <div style={{ flex: 1 }}>
            <div className="card-eyebrow mb-8">CHAPTER 06 · 錦標賽</div>
            <div className="serif" style={{ fontSize: 18, color: "var(--cream)", lineHeight: 1.4 }}>
              在 MTT 裡，籌碼深度的故事多了「籌碼不等於現金」這一層。
            </div>
            <div className="text-dim mt-8" style={{ fontSize: 13, lineHeight: 1.65 }}>
              ICM、Push/Fold Nash、Bubble Factor、階段地圖 — 完整的錦標賽決策框架在 Chapter 06。
            </div>
          </div>
          <div className="text-gold mono" style={{ fontSize: 13, letterSpacing: "0.16em" }}>
            06 →
          </div>
        </div>
      </Section>
    </div>
  );
}

function sprBucket(spr) {
  if (spr < 1)  return { label: "Committed",   advice: "已經半全下，幾乎只能繼續推。" };
  if (spr < 4)  return { label: "Low SPR",     advice: "頂對 + 強聽牌可以 commit；不要慢打強牌。" };
  if (spr < 10) return { label: "Medium SPR",  advice: "兩對以上才 commit；overpair 有調整空間。" };
  return         { label: "Deep SPR",          advice: "暗示 + 反詐唬遊戲；位置與機動性 > 牌力。" };
}

function NumField({ label, value, setValue, min = 0, max = 999999, step = 1 }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div className="uppercase text-faint mb-8">{label}</div>
      <div className="row gap-8">
        <button className="btn btn-sm btn-ghost" onClick={() => setValue(Math.max(min, value - step))}>−</button>
        <input type="number" value={value} min={min} max={max} step={step}
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

const STACK_DEPTHS = [
  { bb: 10, name: "短碼 (Short Stack)", tag: "Push/Fold", tone: "bad", spr: "1-2",
    dos: ["記憶 Nash push/fold 圖表", "前 fold 到你 → 直接 jam，不要 min-raise", "防守大盲時用簡化的 calling range"],
    donts: ["翻牌前 limp", "翻牌後玩三街", "詐唬 — 沒有空間"] },
  { bb: 25, name: "中短碼", tag: "Re-shove", tone: "warn", spr: "3-5",
    dos: ["可以 3-bet jam 對偷盲", "翻牌後 commit 兩對以上", "尋找 fold equity 機會"],
    donts: ["深籌碼風格的 floating", "用很大的 c-bet"] },
  { bb: 50, name: "中堆", tag: "彈性", tone: "", spr: "6-9",
    dos: ["三街計畫", "正常開池尺度 2.2-2.5x", "C-bet 使用 30-50% 池"],
    donts: ["未計畫的 4-bet bluff", "拿著 TPTK 在 wet board 蓋幣"] },
  { bb: 100, name: "標準深度 (Cash)", tag: "經典", tone: "good", spr: "10-15",
    dos: ["完整三街遊戲", "兩極化 over-bet", "用位置壓 OOP"],
    donts: ["浪費 fold equity 在 nut 牌上", "亂 commit"] },
  { bb: 200, name: "深堆 (Deep)", tag: "高階", tone: "gold", spr: "20+",
    dos: ["後街反詐唬", "鬆守翻牌（implied odds 高）", "靠位置與選牌"],
    donts: ["把整個 stack 押在頂對", "硬碰硬下風口"] },
];

window.PageStack = PageStack;
