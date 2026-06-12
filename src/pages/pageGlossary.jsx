/* global React, useState, useMemo, PageHeader, Section, GLOSSARY, Pill */

function PageGlossary() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return GLOSSARY;
    return GLOSSARY.filter(g =>
      g.term.toLowerCase().includes(s) ||
      g.cn.includes(s) ||
      g.desc.toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <div>
      <PageHeader
        eyebrow="Chapter 11 · 詞彙表"
        title="22 個必懂的撲克術語"
        sub="如果牌桌上有人用詞你聽不懂，多半都會在這裡。"
      />

      <Section num="09.1" title="搜尋">
        <div className="card mb-24">
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="搜尋術語、中文、或解釋…"
            style={{
              width: "100%",
              background: "var(--bg)",
              border: "1px solid var(--line)",
              color: "var(--cream)",
              padding: "12px 16px",
              borderRadius: 6,
              fontSize: 15,
              fontFamily: "var(--sans)",
            }}
          />
          <div className="row between mt-16">
            <span className="mono text-faint" style={{ fontSize: 11 }}>{filtered.length} 個結果</span>
            {q && <button className="btn btn-sm btn-ghost" onClick={() => setQ("")}>清除</button>}
          </div>
        </div>

        <div className="grid-2">
          {filtered.map(g => (
            <div key={g.term} className="card" style={{ padding: "18px 22px" }}>
              <div className="row between mb-8">
                <div className="row gap-12" style={{ alignItems: "baseline" }}>
                  <span className="serif text-gold" style={{ fontSize: 22, fontWeight: 700 }}>{g.term}</span>
                  <span className="text-dim" style={{ fontSize: 14 }}>{g.cn}</span>
                </div>
              </div>
              <p className="text-dim" style={{ fontSize: 13.5, lineHeight: 1.7, margin: 0 }}>{g.desc}</p>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="card text-faint" style={{ textAlign: "center", padding: 40, gridColumn: "1 / -1" }}>
              沒有符合的詞彙
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

window.PageGlossary = PageGlossary;
