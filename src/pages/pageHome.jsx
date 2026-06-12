/* global React, useState, PageHeader, Section, Stat, Pill, PlayingCard, ChipStack */

function PageHome({ go, stats }) {
  return (
    <div>
      <PageHeader
        eyebrow="Hold'em Academy · Vol. I"
        title={<>從盲注到<span style={{ color: "var(--gold)" }}>底牌</span>，把每個決策練成肌肉</>}
        sub="一套完整的德州撲克教學系統 — 規則、位置、起手牌、賠率、籌碼策略、互動牌局練習與手牌復盤。每題都告訴你 GTO 答案、勝率比較、以及為什麼。"
        right={
          <div className="row gap-12">
            <button className="btn btn-primary" onClick={() => go("practice")}>開始練習牌局 →</button>
          </div>
        }
      />

      {/* HERO — 三張展示牌 + 切片籌碼 */}
      <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 36 }}>
        <div style={{
          padding: "32px 40px",
          background: "radial-gradient(ellipse at 30% 50%, var(--felt-light) 0%, var(--felt) 60%, var(--felt-dark) 100%)",
          borderBottom: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 30,
          alignItems: "center",
        }}>
          <div>
            <div className="uppercase text-gold mb-8">Today's Lesson · 今日重點</div>
            <h2 className="serif" style={{ fontSize: 28, lineHeight: 1.25, marginBottom: 14 }}>
              位置決定範圍，<br/>範圍決定勝負。
            </h2>
            <p className="text-dim" style={{ maxWidth: 480 }}>
              業餘玩家最常忽略的事：你坐在哪一個位置，比你拿到什麼牌更重要。BTN 拿 72o 比 UTG 拿 AJo 更賺錢。
            </p>
            <div className="row gap-12 mt-24">
              <button className="btn" onClick={() => go("positions")}>位置詳解</button>
              <button className="btn btn-ghost" onClick={() => go("preflop")}>看起手牌表</button>
            </div>
          </div>
          <div className="row center gap-12">
            <div style={{ transform: "rotate(-8deg)" }}><PlayingCard card="As" size={88} /></div>
            <div style={{ transform: "translateY(-8px)" }}><PlayingCard card="Kh" size={88} /></div>
            <div style={{ transform: "rotate(6deg) translateY(6px)" }}><PlayingCard card="Qd" size={88} /></div>
          </div>
        </div>

        <div className="grid-4" style={{ padding: 24, gap: 0 }}>
          {[
            { k: "完成課程", v: stats.lessonsDone + " / 9", s: "繼續學習" },
            { k: "練習題", v: stats.practiceDone, s: "正確率 " + stats.accuracy + "%" },
            { k: "目前等級", v: stats.level, s: "進階中" },
            { k: "復盤次數", v: stats.replays, s: "找到 " + stats.mistakes + " 處可改" },
          ].map((s, i) => (
            <div key={i} style={{
              padding: "8px 24px",
              borderRight: i < 3 ? "1px solid var(--line)" : "none",
            }}>
              <div className="uppercase text-faint">{s.k}</div>
              <div className="serif" style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{s.v}</div>
              <div className="mono text-gold" style={{ fontSize: 11, marginTop: 4 }}>{s.s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 學習路徑 */}
      <Section num="01" title="學習路徑" lede="按順序走完九個章節，搭配練習與復盤。每章 8-15 分鐘可消化。">
        <div className="grid-3">
          {LEARN_PATH.map(p => (
            <button key={p.key} className="card" onClick={() => go(p.key)} style={{
              textAlign: "left", cursor: "pointer", border: "1px solid var(--line)",
              transition: "transform .15s, border-color .15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--line-bright)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.transform = "translateY(0)"; }}>
              <div className="row between mb-16">
                <span className="mono text-gold" style={{ fontSize: 11, letterSpacing: "0.2em" }}>{p.num}</span>
                <Pill tone={p.tone}>{p.tag}</Pill>
              </div>
              <div className="serif" style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>{p.title}</div>
              <div className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.6 }}>{p.desc}</div>
              <div className="mt-16 mono text-gold" style={{ fontSize: 11 }}>{p.time} · 進入 →</div>
            </button>
          ))}
        </div>
      </Section>

      {/* 練習入口 */}
      <Section num="02" title="互動練習" lede="每題會列出所有選項的勝率、EV 和 GTO 頻率，並告訴你為何專家會這樣打。">
        <div className="grid-2">
          <button className="card" onClick={() => go("practice")} style={{ textAlign: "left", cursor: "pointer" }}>
            <div className="row between mb-16"><div className="serif" style={{ fontSize: 20 }}>情境決策題</div><span className="text-gold mono">→</span></div>
            <div className="text-dim" style={{ fontSize: 14 }}>給情境、籌碼、底池與面對行動，從幾個選項中挑出最佳；立即顯示勝率比較與 GTO 推薦頻率。</div>
            <div className="row gap-8 mt-16">
              <Pill>翻牌前</Pill><Pill>翻牌</Pill><Pill>轉河</Pill><Pill tone="gold">ICM</Pill>
            </div>
          </button>
          <button className="card" onClick={() => go("replay")} style={{ textAlign: "left", cursor: "pointer" }}>
            <div className="row between mb-16"><div className="serif" style={{ fontSize: 20 }}>手牌復盤</div><span className="text-gold mono">→</span></div>
            <div className="text-dim" style={{ fontSize: 14 }}>輸入你打過的一手牌，逐街分析每個決策、與最佳線比較，標出可以打得更好的點。</div>
            <div className="row gap-8 mt-16">
              <Pill>EV 計算</Pill><Pill>逐街分析</Pill><Pill tone="gold">改進建議</Pill>
            </div>
          </button>
        </div>
      </Section>

      {/* 工具 */}
      <Section num="03" title="即時工具">
        <div className="grid-3">
          <button className="card" onClick={() => go("odds")} style={{ textAlign: "left", cursor: "pointer" }}>
            <div className="serif" style={{ fontSize: 17, marginBottom: 6 }}>賠率與 EV 計算器</div>
            <div className="text-dim" style={{ fontSize: 13 }}>輸入底池、注額、勝率，立即得到 break-even 和 EV。</div>
          </button>
          <button className="card" onClick={() => go("preflop")} style={{ textAlign: "left", cursor: "pointer" }}>
            <div className="serif" style={{ fontSize: 17, marginBottom: 6 }}>起手牌矩陣</div>
            <div className="text-dim" style={{ fontSize: 13 }}>切換位置查看 RFI 範圍、3-bet 範圍、防守範圍。</div>
          </button>
          <button className="card" onClick={() => go("stack")} style={{ textAlign: "left", cursor: "pointer" }}>
            <div className="serif" style={{ fontSize: 17, marginBottom: 6 }}>SPR / 籌碼深度</div>
            <div className="text-dim" style={{ fontSize: 13 }}>20bb、50bb、150bb 的策略差異與 SPR 計算器。</div>
          </button>
        </div>
      </Section>
    </div>
  );
}

const LEARN_PATH = [
  { num: "Ch 01", key: "rules",     title: "規則與牌力", desc: "從同花順到高牌，10 個牌型的機率與比較邏輯。", time: "8 分鐘", tag: "基礎", tone: "" },
  { num: "Ch 02", key: "positions", title: "位置詳解", desc: "9-handed 的 9 個座位，每個位置的角色、範圍與心態。", time: "12 分鐘", tag: "核心", tone: "gold" },
  { num: "Ch 03", key: "preflop",   title: "起手牌範圍", desc: "RFI、3-bet、4-bet、call、squeeze 五張關鍵範圍表。", time: "15 分鐘", tag: "核心", tone: "gold" },
  { num: "Ch 04", key: "odds",      title: "賠率與期望值", desc: "Pot odds、implied odds、EV 公式，配上 outs 速查表。", time: "10 分鐘", tag: "計算", tone: "" },
  { num: "Ch 05", key: "stack",      title: "籌碼深度與 SPR", desc: "20bb / 50bb / 100bb / 200bb 的策略落差。", time: "12 分鐘", tag: "進階", tone: "" },
  { num: "Ch 06", key: "tournament", title: "錦標賽 · ICM", desc: "階段地圖、ICM 計算器、Nash 與 Re-shove 表、Bubble Factor、盲注吃人模擬器。", time: "22 分鐘", tag: "MTT", tone: "gold" },
  { num: "Ch 07", key: "gto",        title: "GTO vs Exploitative", desc: "什麼是均衡，什麼時候該偏離，怎麼讀對手。", time: "14 分鐘", tag: "進階", tone: "" },
  { num: "Ch 09", key: "practice",   title: "情境練習", desc: "8 題互動，每題顯示勝率比較與 GTO 推薦。", time: "依進度", tag: "練習", tone: "good" },
  { num: "Ch 10", key: "replay",     title: "手牌復盤", desc: "把你的牌局丟進來，逐街找出可以打更好的點。", time: "依需求", tag: "練習", tone: "good" },
  { num: "Ch 11", key: "glossary",   title: "術語字典", desc: "VPIP、PFR、SPR、ICM、MDF…22 個必懂術語。", time: "速查", tag: "參考", tone: "" },
];

window.PageHome = PageHome;
