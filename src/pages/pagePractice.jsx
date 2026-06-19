/* global React, useState, useMemo, PageHeader, Section, Pill, Bar, PlayingCard, ChipStack, SCENARIOS, Stat */

function PagePractice() {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [history, setHistory] = useState([]); // {id, picked, correct}
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (filter === "all") return SCENARIOS;
    return SCENARIOS.filter(s => s.stage === filter || (filter === "MTT" && s.tags.includes("MTT")) || (filter === "ICM" && s.tags.includes("ICM")));
  }, [filter]);

  const safeIdx = Math.min(idx, filtered.length - 1);
  const sc = filtered[safeIdx];
  const result = picked && sc.options.find(o => o.id === picked);

  function pick(id) {
    if (picked) return;
    setPicked(id);
    const opt = sc.options.find(o => o.id === id);
    setHistory(h => [...h, { id: sc.id, picked: id, correct: opt.correct }]);
    if (window.Progress) window.Progress.recordQuiz(sc.id, opt.correct);
  }
  function next() {
    setPicked(null);
    setIdx(i => Math.min(i + 1, filtered.length - 1));
  }
  function prev() {
    setPicked(null);
    setIdx(i => Math.max(i - 1, 0));
  }
  function reset() {
    setHistory([]); setPicked(null); setIdx(0);
  }

  const correct = history.filter(h => h.correct).length;
  const accuracy = history.length ? Math.round(correct / history.length * 100) : 0;

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 09 · 互動練習"
        title="把每個情境練到下意識做對"
        sub="每題列出所有選項的勝率、EV 與 GTO 推薦頻率。選完後立即看到專家的線、為什麼專家會這樣打。"
        right={
          <div className="row gap-12">
            <button className="btn btn-ghost btn-sm" onClick={reset}>重置進度</button>
          </div>
        }
      />

      {/* 進度與篩選 */}
      <div className="card mb-24" style={{ padding: "16px 22px" }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
          <div className="row gap-24" style={{ flexWrap: "wrap" }}>
            <div>
              <div className="uppercase text-faint">完成</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>{history.length} <span className="text-dim mono" style={{ fontSize: 14 }}>/ {SCENARIOS.length}</span></div>
            </div>
            <div>
              <div className="uppercase text-faint">正確率</div>
              <div className="serif text-gold" style={{ fontSize: 22, fontWeight: 700 }}>{accuracy}%</div>
            </div>
            <div>
              <div className="uppercase text-faint">當前題</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>#{safeIdx + 1}</div>
            </div>
          </div>
          <div className="row gap-8" style={{ flexWrap: "wrap" }}>
            {[
              { id: "all", label: "全部" },
              { id: "Preflop", label: "翻牌前" },
              { id: "Flop", label: "翻牌" },
              { id: "Turn", label: "轉牌" },
              { id: "River", label: "河牌" },
              { id: "MTT", label: "MTT" },
              { id: "ICM", label: "ICM" },
            ].map(f => (
              <button key={f.id}
                onClick={() => { setFilter(f.id); setIdx(0); setPicked(null); }}
                className="btn btn-sm"
                style={{
                  background: filter === f.id ? "var(--gold)" : "transparent",
                  color: filter === f.id ? "var(--ink)" : "var(--cream)",
                  borderColor: filter === f.id ? "var(--gold)" : "var(--line)",
                  fontWeight: filter === f.id ? 700 : 400,
                }}>{f.label}</button>
            ))}
          </div>
        </div>
      </div>

      <TableContext sc={sc} />
      <ScenarioCard sc={sc} picked={picked} pick={pick} />

      {picked && (
        <FeedbackPanel sc={sc} picked={picked} result={result} />
      )}

      <div className="row between mt-24">
        <button className="btn btn-ghost" onClick={prev} disabled={safeIdx === 0}>← 上一題</button>
        <div className="mono text-dim">{safeIdx + 1} / {filtered.length}</div>
        <button className="btn btn-primary" onClick={next} disabled={!picked || safeIdx === filtered.length - 1}>
          下一題 →
        </button>
      </div>
    </div>
  );
}

function TableContext({ sc }) {
  if (!sc.table) return null;
  const seats = sc.seats || sc.table.length;
  const isMTT = sc.gameType === "MTT";
  return (
    <div className="card mb-16" style={{ padding: "16px 22px" }}>
      <div className="row between mb-12" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="row gap-12">
          <Pill tone={isMTT ? "warn" : "good"}>{sc.gameType || "Cash"}</Pill>
          <Pill>{seats}-handed</Pill>
          {sc.itm && <Pill tone="bad">ITM · 剩 {sc.itm.left}/{sc.itm.paid} · {sc.itm.places}</Pill>}
        </div>
        <span className="mono text-faint" style={{ fontSize: 11 }}>
          盲注 {sc.blinds}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
        {sc.table.map((p, i) => (
          <div key={i} style={{
            padding: "10px 12px", borderRadius: 6,
            background: p.isHero ? "rgba(201,165,92,0.12)" : "rgba(255,255,255,0.02)",
            border: "1.5px solid " + (p.isHero ? "var(--gold)" : "var(--line)"),
          }}>
            <div className="row between" style={{ alignItems: "baseline" }}>
              <span className="mono text-gold" style={{ fontSize: 11, fontWeight: 700 }}>{p.pos}</span>
              <span className="mono" style={{ fontSize: 10, color: p.isHero ? "var(--gold)" : "var(--fg-dim)" }}>
                {p.isHero ? "你" : p.name}
              </span>
            </div>
            <div className="mono mt-4" style={{ fontSize: 13, color: p.isHero ? "var(--gold)" : "var(--cream)" }}>
              {p.stack}<span className="text-faint" style={{ fontSize: 10 }}>bb</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({ sc, picked, pick }) {
  const stageColor = { Preflop: "var(--info)", Flop: "var(--gold)", Turn: "var(--warn)", River: "var(--bad)" }[sc.stage];

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "20px 26px", borderBottom: "1px solid var(--line)" }}>
        <div className="row between mb-8">
          <div className="row gap-12">
            <Pill tone="gold">{sc.stage}</Pill>
            <Pill>{sc.position}</Pill>
            {sc.tags.slice(0, 2).map(t => <Pill key={t}>{t}</Pill>)}
          </div>
          <span className="mono text-faint" style={{ fontSize: 11 }}>#{String(sc.id).padStart(2,"0")}</span>
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 700 }}>{sc.title}</div>
      </div>

      <div style={{
        background: "radial-gradient(ellipse at center, var(--felt-light) 0%, var(--felt) 60%, var(--felt-dark) 100%)",
        padding: "32px 26px",
        borderBottom: "1px solid var(--line)",
      }}>
        <div className="row between mb-24">
          <div className="row gap-32">
            <div>
              <div className="uppercase text-faint">盲注 / Ante</div>
              <div className="mono" style={{ fontSize: 14, marginTop: 4 }}>{sc.blinds}</div>
            </div>
            <div>
              <div className="uppercase text-faint">有效籌碼</div>
              <div className="mono text-gold" style={{ fontSize: 14, marginTop: 4 }}>{sc.effective}</div>
            </div>
            <div>
              <div className="uppercase text-faint">底池</div>
              <div className="mono text-gold" style={{ fontSize: 14, marginTop: 4 }}>{sc.pot}</div>
            </div>
          </div>
          <ChipStack amount={parseInt(sc.pot, 10) || 1000} size={28} />
        </div>

        <div className="row gap-32 mb-24" style={{ alignItems: "flex-end" }}>
          <div>
            <div className="uppercase text-faint mb-8">公共牌</div>
            <div className="row gap-8">
              {sc.board.length === 0
                ? <span className="text-faint mono" style={{ fontSize: 13 }}>翻牌前 — 尚無公共牌</span>
                : sc.board.map((c, i) => <PlayingCard key={i} card={c} size={56} />)}
              {sc.board.length > 0 && Array.from({ length: 5 - sc.board.length }).map((_, i) => (
                <div key={i} style={{
                  width: 56, height: 78, borderRadius: 4,
                  border: "1.5px dashed rgba(244,234,208,0.2)",
                }} />
              ))}
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <div className="uppercase text-faint mb-8" style={{ textAlign: "right" }}>你的手牌 (Hero)</div>
            <div className="row gap-8">
              {sc.hero.map((c, i) => <PlayingCard key={i} card={c} size={64} />)}
            </div>
          </div>
        </div>

        <div style={{
          padding: 14,
          background: "rgba(0,0,0,0.3)",
          borderRadius: 6,
          borderLeft: "3px solid " + stageColor,
        }}>
          <div className="uppercase text-faint mb-8">面對行動</div>
          <div style={{ fontSize: 14 }}>{sc.facing}</div>
        </div>
      </div>

      {/* Options */}
      <div style={{ padding: "22px 26px" }}>
        <div className="card-eyebrow mb-16">你的選擇</div>
        <div className="col gap-12">
          {sc.options.map(opt => {
            const isPicked = picked === opt.id;
            const showResult = !!picked;
            const isCorrect = opt.correct;
            let bg = "transparent", border = "var(--line)", glow = "none";
            if (showResult) {
              if (isCorrect) { bg = "rgba(111,194,138,0.08)"; border = "rgba(111,194,138,0.5)"; }
              if (isPicked && !isCorrect) { bg = "rgba(217,111,94,0.08)"; border = "rgba(217,111,94,0.5)"; }
              if (isPicked && isCorrect) { glow = "0 0 0 2px rgba(111,194,138,0.3)"; }
            }
            return (
              <button key={opt.id}
                disabled={!!picked}
                onClick={() => pick(opt.id)}
                style={{
                  background: bg,
                  border: "1.5px solid " + border,
                  borderRadius: 8,
                  padding: "14px 18px",
                  textAlign: "left",
                  cursor: picked ? "default" : "pointer",
                  boxShadow: glow,
                  transition: "all .15s",
                }}>
                <div className="row between">
                  <div className="row gap-12">
                    <span className="serif" style={{ fontSize: 17, fontWeight: 600, color: showResult && isCorrect ? "var(--good)" : showResult && isPicked ? "var(--bad)" : "var(--cream)" }}>
                      {opt.label}
                    </span>
                    {showResult && isCorrect && <Pill tone="good">GTO 推薦</Pill>}
                    {showResult && isPicked && !isCorrect && <Pill tone="bad">你的選擇</Pill>}
                  </div>
                  {showResult && (
                    <div className="row gap-16">
                      {opt.equity != null && (
                        <div className="mono" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                          勝率 <span className="text-gold">{opt.equity}%</span>
                        </div>
                      )}
                      {opt.chipEV != null ? (
                        <>
                          <div className="mono" style={{ fontSize: 12 }}>
                            Chip-EV <span className={opt.chipEV >= 0 ? "text-good" : "text-bad"}>
                              {opt.chipEV >= 0 ? "+" : ""}{opt.chipEV}bb
                            </span>
                          </div>
                          <div className="mono" style={{ fontSize: 12 }}>
                            $-EV <span className={opt.dollarEV >= 0 ? "text-good" : "text-bad"}>
                              {opt.dollarEV >= 0 ? "+" : ""}{opt.dollarEV}%
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="mono" style={{ fontSize: 12 }}>
                          EV <span className={opt.ev >= 0 ? "text-good" : "text-bad"}>
                            {opt.ev >= 0 ? "+" : ""}{opt.ev}
                          </span>
                        </div>
                      )}
                      <div className="mono" style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                        GTO 頻率 <span className="text-gold">{opt.gto}%</span>
                      </div>
                    </div>
                  )}
                </div>
                {showResult && (
                  <div className="mt-8" style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 8, alignItems: "center" }}>
                    <span className="mono text-faint" style={{ fontSize: 10 }}>頻率</span>
                    <Bar value={opt.gto} max={100} color={isCorrect ? "var(--good)" : "var(--gold-dim)"} height={4} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeedbackPanel({ sc, picked, result }) {
  const isCorrect = result.correct;
  const bestOption = sc.options.find(o => o.correct);

  return (
    <div className="card mt-24" style={{
      borderLeft: "3px solid " + (isCorrect ? "var(--good)" : "var(--bad)"),
      background: isCorrect ? "rgba(111,194,138,0.04)" : "rgba(217,111,94,0.04)",
    }}>
      <div className="row between mb-16">
        <div className="row gap-12">
          <span className="serif" style={{
            fontSize: 24, fontWeight: 700,
            color: isCorrect ? "var(--good)" : "var(--bad)",
          }}>
            {isCorrect ? "✓ 正確" : "✗ 可以打更好"}
          </span>
          <Pill tone={isCorrect ? "good" : "bad"}>
            {isCorrect ? "與 GTO 一致" : "與 GTO 偏離"}
          </Pill>
        </div>
        <div className="mono text-dim" style={{ fontSize: 12 }}>
          EV 損失 <span className={isCorrect ? "text-gold" : "text-bad"}>
            {isCorrect ? "0" : (result.ev - bestOption.ev)}
          </span>
        </div>
      </div>

      {!isCorrect && (
        <div className="mb-16" style={{
          padding: 14, background: "rgba(0,0,0,0.3)", borderRadius: 6,
          borderLeft: "2px solid var(--good)",
        }}>
          <div className="uppercase text-good mb-8">最佳線</div>
          <div className="serif" style={{ fontSize: 17 }}>{bestOption.label}</div>
          <div className="mono text-dim mt-8" style={{ fontSize: 12 }}>
            GTO 頻率 {bestOption.gto}% · EV {bestOption.ev >= 0 ? "+" : ""}{bestOption.ev}
          </div>
        </div>
      )}

      <div>
        <div className="card-eyebrow mb-8">解析</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: 0 }}>{sc.explain}</p>
      </div>

      {/* ICM Chip-EV vs $-EV breakdown when scenario carries dual EV */}
      {sc.options.some(o => o.chipEV != null) && (
        <div className="mt-24" style={{
          background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 8,
          borderLeft: "2px solid var(--gold)",
        }}>
          <div className="card-eyebrow mb-16">Chip-EV vs $-EV 對照</div>
          <div className="col gap-12">
            {sc.options.map(o => {
              const chipPos = (o.chipEV || 0) >= 0;
              const dollPos = (o.dollarEV || 0) >= 0;
              const diverge = chipPos !== dollPos;
              return (
                <div key={o.id} style={{
                  padding: "10px 12px",
                  background: diverge ? "rgba(217,111,94,0.06)" : "transparent",
                  borderRadius: 6,
                  border: "1px solid " + (o.correct ? "rgba(111,194,138,0.3)" : "var(--line)"),
                }}>
                  <div className="row between mb-8">
                    <div className="row gap-8">
                      <span className="serif" style={{ fontSize: 14, color: o.correct ? "var(--good)" : "var(--cream)" }}>
                        {o.label}
                      </span>
                      {diverge && <Pill tone="bad">訊號矛盾</Pill>}
                      {o.correct && <Pill tone="good">$-EV 最佳</Pill>}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 80px", gap: 10, alignItems: "center" }}>
                    <span className="mono text-faint" style={{ fontSize: 10 }}>CHIP-EV</span>
                    <div style={{ position: "relative", height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 999 }}>
                      <div style={{
                        position: "absolute", top: 0, height: "100%",
                        left: "50%",
                        transform: chipPos ? "none" : "translateX(-100%)",
                        width: Math.min(50, Math.abs(o.chipEV || 0) * 8) + "%",
                        background: chipPos ? "var(--good)" : "var(--bad)",
                        borderRadius: 999,
                      }} />
                      <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 10, background: "rgba(244,234,208,0.3)" }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, textAlign: "right", color: chipPos ? "var(--good)" : "var(--bad)" }}>
                      {chipPos ? "+" : ""}{o.chipEV}bb
                    </span>

                    <span className="mono text-faint" style={{ fontSize: 10 }}>$-EV</span>
                    <div style={{ position: "relative", height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 999 }}>
                      <div style={{
                        position: "absolute", top: 0, height: "100%",
                        left: "50%",
                        transform: dollPos ? "none" : "translateX(-100%)",
                        width: Math.min(50, Math.abs(o.dollarEV || 0) * 8) + "%",
                        background: dollPos ? "var(--good)" : "var(--bad)",
                        borderRadius: 999,
                      }} />
                      <div style={{ position: "absolute", left: "50%", top: -2, width: 1, height: 10, background: "rgba(244,234,208,0.3)" }} />
                    </div>
                    <span className="mono" style={{ fontSize: 12, textAlign: "right", color: dollPos ? "var(--good)" : "var(--bad)" }}>
                      {dollPos ? "+" : ""}{o.dollarEV}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mono text-faint mt-16" style={{ fontSize: 10, lineHeight: 1.6 }}>
            「訊號矛盾」代表 chip-EV 與 $-EV 指向不同的選項 — 這是 ICM 的獨特之處。應選 $-EV 為正的選項。
          </div>
        </div>
      )}
    </div>
  );
}

window.PagePractice = PagePractice;
