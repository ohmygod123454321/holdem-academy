/* global React, ReactDOM, useState, useEffect,
   PageHome, PageRules, PagePositions, PagePreflop, PageOdds, PageStack,
   PageTournament, PagePractice, PageReplay, PageGTO, PageGlossary, PageTable,
   PageMultiplayer, TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor */

const NAV = [
  { group: "開始", items: [
    { id: "home",      num: "00", label: "首頁" },
  ]},
  { group: "教學", items: [
    { id: "rules",     num: "01", label: "規則 · 牌力" },
    { id: "positions", num: "02", label: "位置詳解" },
    { id: "preflop",   num: "03", label: "起手牌範圍" },
    { id: "odds",      num: "04", label: "賠率 · EV" },
    { id: "stack",      num: "05", label: "籌碼 · SPR" },
    { id: "tournament", num: "06", label: "錦標賽 · ICM" },
    { id: "gto",        num: "07", label: "GTO · 剝削" },
  ]},
  { group: "練習", items: [
    { id: "table",      num: "08", label: "練習桌 · LIVE" },
    { id: "practice",   num: "09", label: "情境練習" },
    { id: "replay",     num: "10", label: "手牌復盤" },
  ]},
  { group: "對戰", items: [
    { id: "multiplayer", num: "12", label: "多人對戰 · ONLINE" },
  ]},
  { group: "參考", items: [
    { id: "glossary",   num: "11", label: "術語字典" },
  ]},
];

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "theme": "felt",
  "accent": "#c9a55c"
}/*EDITMODE-END*/;

function App() {
  const [page, setPage] = useState(() => {
    try { return localStorage.getItem("hp-page") || "home"; } catch { return "home"; }
  });
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("hp-nav-collapsed");
      if (saved !== null) return saved === "1";
      // default to collapsed on phones so the content gets the full width
      return typeof window !== "undefined" && window.innerWidth <= 820;
    } catch { return false; }
  });
  function toggleNav() {
    setNavCollapsed(c => {
      const next = !c;
      try { localStorage.setItem("hp-nav-collapsed", next ? "1" : "0"); } catch {}
      return next;
    });
  }
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULS);

  // apply theme
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme || "felt";
    document.documentElement.style.setProperty("--gold", tweaks.accent);
  }, [tweaks.theme, tweaks.accent]);

  function go(p) {
    setPage(p);
    try { localStorage.setItem("hp-page", p); } catch {}
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // mock progress for home page
  const stats = {
    lessonsDone: 3,
    practiceDone: 5,
    accuracy: 78,
    level: "中階",
    replays: 2,
    mistakes: 4,
  };

  let body = null;
  switch (page) {
    case "home":      body = <PageHome go={go} stats={stats} />; break;
    case "rules":     body = <PageRules />; break;
    case "positions": body = <PagePositions />; break;
    case "preflop":   body = <PagePreflop />; break;
    case "odds":      body = <PageOdds />; break;
    case "stack":      body = <PageStack />; break;
    case "tournament": body = <PageTournament />; break;
    case "gto":        body = <PageGTO />; break;
    case "table":     body = <PageTable />; break;
    case "multiplayer": body = <PageMultiplayer />; break;
    case "practice":  body = <PagePractice />; break;
    case "replay":    body = <PageReplay />; break;
    case "glossary":  body = <PageGlossary />; break;
    default:          body = <PageHome go={go} stats={stats} />;
  }

  return (
    <div className={"app" + (navCollapsed ? " nav-collapsed" : "")} data-screen-label={pageLabel(page)}>
      {navCollapsed && (
        <button className="nav-reopen-btn" onClick={toggleNav} title="展開目錄" aria-label="展開目錄">☰</button>
      )}
      <aside className="sidebar">
        <div className="brand" onClick={() => go("home")} style={{ cursor: "pointer" }}>
          <div className="brand-mark">♠</div>
          <div className="brand-text">
            <div className="brand-name">Hold'em Academy</div>
            <div className="brand-sub">德州撲克學院</div>
          </div>
          <button className="nav-collapse-btn"
            onClick={(e) => { e.stopPropagation(); toggleNav(); }}
            title="收合目錄" aria-label="收合目錄">‹</button>
        </div>
        <nav className="col gap-4" style={{ flex: 1 }}>
          {NAV.map(group => (
            <div key={group.group}>
              <div className="nav-group-label">{group.group}</div>
              {group.items.map(it => (
                <button key={it.id}
                  className={"nav-item" + (page === it.id ? " active" : "")}
                  onClick={() => go(it.id)}>
                  <span className="num">{it.num}</span>
                  <span>{it.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 }}>
          <div className="mono text-faint" style={{ fontSize: 10, letterSpacing: "0.16em" }}>
            v 1.0 · 2026
          </div>
          <div className="mono text-faint mt-8" style={{ fontSize: 10 }}>
            這個原型不接受真錢投注。
          </div>
        </div>
      </aside>

      <main className="main">{body}</main>

      <TweaksPanel title="視覺調整 · Tweaks">
        <TweakSection label="主題">
          <TweakRadio
            label="風格"
            value={tweaks.theme}
            onChange={v => setTweak("theme", v)}
            options={[
              { value: "felt", label: "牌桌綠" },
              { value: "ink",  label: "深色板" },
            ]}
          />
        </TweakSection>
        <TweakSection label="強調色">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={v => setTweak("accent", v)}
            options={["#c9a55c", "#d4ae5c", "#b8845e", "#7fb6a8", "#c97a7a"]}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function pageLabel(p) {
  const map = {
    home: "00 首頁", rules: "01 規則牌力", positions: "02 位置", preflop: "03 起手牌",
    odds: "04 賠率", stack: "05 籌碼", tournament: "06 錦標賽", gto: "07 GTO",
    table: "08 練習桌", practice: "09 情境練習", replay: "10 復盤", glossary: "11 字典",
    multiplayer: "12 多人對戰",
  };
  return map[p] || p;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
