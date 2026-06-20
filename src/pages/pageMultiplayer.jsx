/* global React, useState, useEffect, useRef, PageHeader, PlayingCard, Pill, TableView, ActionControls, HandReadout */
// Multiplayer lobby + live table. Talks to the server-authoritative WebSocket
// backend (server/). The server sends each client a privacy-safe `view`
// (opponents' hole cards withheld until showdown); we just render it and send
// the local player's actions back.

// Where the backend lives. Local dev uses the local server; in production this
// must point at the deployed backend (Render). 部署到 Render 後把下面網址改掉。
const MP_SERVER_URL =
  (typeof location !== "undefined" &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1"))
    ? "ws://localhost:8080"
    : "wss://holdem-academy-server.onrender.com"; // 正式後端（Render）已上線

function viewToGame(view) {
  // Adapt the server view into the shape TableView/ActionControls expect.
  return {
    seats: view.seats.map((s, i) => ({
      name: s.name,
      stack: s.stack,
      folded: s.folded,
      allin: s.allin,
      inHand: s.inHand,
      lastAction: s.lastAction,
      streetBet: s.streetBet,
      committed: s.committed,
      isHuman: i === view.mySeat,
      // server already masks opponents pre-showdown ([null,null]) / real at showdown
      hole: s.hole,
    })),
    board: view.board,
    pot: view.pot,
    toAct: view.toAct,
    dealerIdx: view.dealerIdx,
    finished: view.finished,
    street: view.street,
    winners: view.winners,
  };
}

function PageMultiplayer() {
  const wsRef = useRef(null);
  const [status, setStatus] = useState("idle");      // idle/connecting/connected/error
  const [phase, setPhase] = useState("menu");        // menu/lobby/game
  const [me, setMe] = useState({ id: null, isHost: false });
  const [room, setRoom] = useState(null);
  const [view, setView] = useState(null);
  const [error, setError] = useState("");
  const [betAmount, setBetAmount] = useState(0);

  // form state
  const [name, setName] = useState(() => {
    try { return localStorage.getItem("hp-mp-name") || ""; } catch { return ""; }
  });
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [cfg, setCfg] = useState({ sb: 10, bb: 20, startingStack: 2000, maxSeats: 9 });

  useEffect(() => () => { if (wsRef.current) wsRef.current.close(); }, []);

  function rememberName(n) {
    try { localStorage.setItem("hp-mp-name", n); } catch {}
  }

  function onMessage(m) {
    if (m.type === "hello") setMe(p => ({ ...p, id: m.id }));
    else if (m.type === "joined") { setMe({ id: m.youId, isHost: m.isHost }); setRoom(m.room); setPhase("lobby"); setError(""); }
    else if (m.type === "lobby") setRoom(m.room);
    else if (m.type === "state") { setRoom(m.room); setView(m.view); setPhase(m.view.started ? "game" : "lobby"); }
    else if (m.type === "error") setError(m.message);
    else if (m.type === "left") { setPhase("menu"); setRoom(null); setView(null); }
  }

  function ensureConnected() {
    return new Promise((resolve, reject) => {
      const cur = wsRef.current;
      if (cur && cur.readyState === 1) return resolve();
      setStatus("connecting");
      setError("");
      let ws;
      try { ws = new WebSocket(MP_SERVER_URL); } catch (e) { setStatus("error"); return reject(e); }
      wsRef.current = ws;
      ws.onopen = () => { setStatus("connected"); resolve(); };
      ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)); } catch {} };
      ws.onerror = () => { setStatus("error"); setError("無法連線到伺服器（可能正在喚醒，請稍候再試）"); reject(new Error("ws error")); };
      ws.onclose = () => { setStatus("idle"); };
    });
  }

  function send(obj) { const ws = wsRef.current; if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); }

  async function createRoom() {
    if (!name.trim()) return setError("請先輸入你的暱稱");
    rememberName(name.trim());
    try { await ensureConnected(); } catch { return; }
    send({ type: "createRoom", name: name.trim(), password: usePassword ? password : null, config: cfg });
  }
  async function joinRoom() {
    if (!name.trim()) return setError("請先輸入你的暱稱");
    if (!joinCode.trim()) return setError("請輸入房號");
    rememberName(name.trim());
    try { await ensureConnected(); } catch { return; }
    send({ type: "joinRoom", code: joinCode.trim().toUpperCase(), name: name.trim(), password: joinPassword });
  }
  function startGame() { send({ type: "startGame" }); }
  function nextHand() { send({ type: "nextHand" }); }
  function leave() { send({ type: "leave" }); if (wsRef.current) wsRef.current.close(); setPhase("menu"); setRoom(null); setView(null); }

  // keep bet slider sensible when it becomes my turn
  useEffect(() => {
    const la = view && view.legalActions;
    if (la) setBetAmount(Math.min(la.maxRaise, Math.max(la.minRaise, Math.round((view.pot || 0) * 0.66 + la.toCall))));
  }, [view && view.legalActions && view.toAct, view && view.handNo, view && view.street]);

  return (
    <div>
      <PageHeader
        eyebrow="MULTIPLAYER · 跟朋友連線"
        title="多人對戰"
        sub="開房間、把房號給朋友，由房主開始牌局。底牌只在你自己的裝置上看得到。"
        right={phase !== "menu" ? <button className="btn btn-ghost btn-sm" onClick={leave}>離開房間</button> : null}
      />

      {error && (
        <div className="card" style={{ borderColor: "var(--bad)", marginBottom: 16 }}>
          <span className="mono" style={{ color: "var(--bad)", fontSize: 13 }}>⚠ {error}</span>
        </div>
      )}

      {phase === "menu" && <MenuScreen
        name={name} setName={setName}
        usePassword={usePassword} setUsePassword={setUsePassword}
        password={password} setPassword={setPassword}
        joinCode={joinCode} setJoinCode={setJoinCode}
        joinPassword={joinPassword} setJoinPassword={setJoinPassword}
        cfg={cfg} setCfg={setCfg}
        status={status}
        onCreate={createRoom} onJoin={joinRoom}
      />}

      {phase === "lobby" && room && <LobbyScreen room={room} me={me} onStart={startGame} />}

      {phase === "game" && view && <GameScreen
        view={view} room={room} me={me}
        betAmount={betAmount} setBetAmount={setBetAmount}
        onAction={(action) => { if (window.Sound) window.Sound.act(action); send({ type: "action", action }); }}
        onNextHand={nextHand}
        onRebuy={() => send({ type: "rebuy" })}
        onShowCard={(index) => send({ type: "showCard", index })}
        onSetAutoNext={(on) => send({ type: "setAutoNext", on })}
      />}
    </div>
  );
}

function MenuScreen({ name, setName, usePassword, setUsePassword, password, setPassword,
  joinCode, setJoinCode, joinPassword, setJoinPassword, cfg, setCfg, status, onCreate, onJoin }) {
  return (
    <div className="grid-2" style={{ gap: 20, alignItems: "start" }}>
      <div className="card">
        <div className="card-eyebrow mb-8">你的暱稱</div>
        <input className="mp-input" value={name} maxLength={20}
          placeholder="例如：阿傑" onChange={e => setName(e.target.value)} />

        <div className="card-eyebrow mb-8" style={{ marginTop: 20 }}>建立房間（你是房主）</div>
        <div className="row gap-12" style={{ flexWrap: "wrap", marginBottom: 12 }}>
          <label className="mono" style={{ fontSize: 12, color: "var(--fg-dim)" }}>小盲/大盲</label>
          <input className="mp-input mp-input-sm" type="number" value={cfg.sb}
            onChange={e => setCfg(c => ({ ...c, sb: +e.target.value }))} />
          <input className="mp-input mp-input-sm" type="number" value={cfg.bb}
            onChange={e => setCfg(c => ({ ...c, bb: +e.target.value }))} />
          <label className="mono" style={{ fontSize: 12, color: "var(--fg-dim)" }}>起始籌碼</label>
          <input className="mp-input mp-input-sm" type="number" value={cfg.startingStack}
            onChange={e => setCfg(c => ({ ...c, startingStack: +e.target.value }))} />
          <label className="mono" style={{ fontSize: 12, color: "var(--fg-dim)" }}>人數上限</label>
          <select className="mp-input mp-input-sm" value={cfg.maxSeats}
            onChange={e => setCfg(c => ({ ...c, maxSeats: +e.target.value }))}>
            {[2, 3, 4, 5, 6, 7, 8, 9].map(n => <option key={n} value={n}>{n} 人</option>)}
          </select>
        </div>
        <label className="row gap-8" style={{ marginBottom: 8, cursor: "pointer", fontSize: 13 }}>
          <input type="checkbox" checked={usePassword} onChange={e => setUsePassword(e.target.checked)} />
          設定房間密碼
        </label>
        {usePassword && (
          <input className="mp-input" type="text" value={password} placeholder="房間密碼"
            onChange={e => setPassword(e.target.value)} style={{ marginBottom: 12 }} />
        )}
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={onCreate}
          disabled={status === "connecting"}>
          {status === "connecting" ? "連線中…" : "建立房間"}
        </button>
      </div>

      <div className="card">
        <div className="card-eyebrow mb-8">加入朋友的房間</div>
        <input className="mp-input" value={joinCode} maxLength={4}
          placeholder="輸入 4 碼房號（如 7DRY）"
          onChange={e => setJoinCode(e.target.value.toUpperCase())}
          style={{ marginBottom: 12, letterSpacing: "0.3em", textTransform: "uppercase" }} />
        <input className="mp-input" type="text" value={joinPassword}
          placeholder="房間密碼（沒有就留空）"
          onChange={e => setJoinPassword(e.target.value)} style={{ marginBottom: 12 }} />
        <button className="btn" style={{ width: "100%" }} onClick={onJoin}
          disabled={status === "connecting"}>
          {status === "connecting" ? "連線中…" : "加入房間"}
        </button>
        <div className="mono text-faint" style={{ fontSize: 11, marginTop: 16, lineHeight: 1.6 }}>
          提示：免費後端閒置會休眠，第一個人連線可能要等約 30 秒喚醒，之後就順了。
        </div>
      </div>
    </div>
  );
}

function LobbyScreen({ room, me, onStart }) {
  const canStart = me.isHost && room.players.length >= 2;
  function copyCode() { try { navigator.clipboard.writeText(room.code); } catch {} }
  return (
    <div className="grid-2" style={{ gap: 20, alignItems: "start" }}>
      <div className="card">
        <div className="card-eyebrow mb-8">房號（分享給朋友）</div>
        <div className="row gap-12" style={{ alignItems: "center" }}>
          <div className="serif" style={{ fontSize: 48, fontWeight: 900, letterSpacing: "0.1em", color: "var(--gold)" }}>
            {room.code}
          </div>
          <button className="btn btn-sm btn-ghost" onClick={copyCode}>複製</button>
        </div>
        <div className="row gap-8" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <Pill tone={room.hasPassword ? "gold" : ""}>{room.hasPassword ? "🔒 有密碼" : "無密碼"}</Pill>
          <Pill>{room.config.sb}/{room.config.bb} · 起始 {room.config.startingStack}</Pill>
          <Pill>最多 {room.config.maxSeats || 9} 人</Pill>
        </div>
        {me.isHost ? (
          <button className="btn btn-primary" style={{ width: "100%", marginTop: 20 }}
            onClick={onStart} disabled={!canStart}>
            {canStart ? "開始牌局 →" : "至少需要 2 人才能開始"}
          </button>
        ) : (
          <div className="mono text-faint" style={{ fontSize: 12, marginTop: 20 }}>等待房主開始牌局…</div>
        )}
      </div>

      <div className="card">
        <div className="card-eyebrow mb-8">玩家（{room.players.length}/{room.config.maxSeats || 9}）</div>
        <div className="col gap-8">
          {room.players.map(p => (
            <div key={p.id} className="row between" style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <span>{p.name}{p.id === me.id ? "（你）" : ""}</span>
              <span className="mono" style={{ fontSize: 11, color: p.id === room.hostId ? "var(--gold)" : "var(--fg-faint)" }}>
                {p.id === room.hostId ? "房主" : (p.connected ? "已連線" : "離線")}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GameScreen({ view, room, me, betAmount, setBetAmount, onAction, onNextHand, onRebuy, onShowCard, onSetAutoNext }) {
  const game = viewToGame(view);
  const myTurn = !view.finished && view.toAct === view.mySeat && view.legalActions;
  const mySeat = view.seats[view.mySeat];
  const busted = mySeat && mySeat.stack <= 0;
  const autoNext = room && room.autoNext;
  // can voluntarily show only when the hand is over, I didn't fold, and it
  // wasn't a real showdown (where my cards are already public)
  const canShow = view.finished && mySeat && !mySeat.folded && mySeat.hole && mySeat.hole[0] && !view.showdown;
  const myShown = view.myShown || [false, false];
  const startStack = (room && room.config && room.config.startingStack) || 0;
  return (
    <div className="poker-grid">
      <div style={{ minWidth: 0 }}>
        <TableView game={game} labels={view.labels} showAll={view.finished} humanIdx={view.mySeat} aiThinking={false} />

        {busted && (
          <div className="card mt-24" style={{ padding: "16px 22px", borderLeft: "4px solid var(--bad)", background: "rgba(217,111,94,0.06)" }}>
            <div className="row between" style={{ flexWrap: "wrap", gap: 12, alignItems: "center" }}>
              <div>
                <div className="card-eyebrow" style={{ color: "var(--bad)" }}>你輸光了籌碼</div>
                <div className="text-dim" style={{ fontSize: 13, marginTop: 4 }}>再買入會帶 ${startStack.toLocaleString()} 重新入座，下一手就回桌。</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={onRebuy}>再買入 ${startStack.toLocaleString()} →</button>
            </div>
          </div>
        )}

        <div className="card mt-24" style={{ padding: "20px 24px" }}>
          {mySeat && mySeat.hole && mySeat.hole[0] && <HandReadout human={mySeat} game={game} />}
          {view.finished ? (
            <div>
              <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
                <div className="serif" style={{ fontSize: 20, fontWeight: 700 }}>
                  {(view.winners || []).map(w => view.seats[w.idx].name + " 贏 " + w.share + (w.reason ? "（" + w.reason + "）" : "")).join("、")}
                </div>
                <div className="row gap-8" style={{ alignItems: "center" }}>
                  {me.isHost && (
                    <button className="btn btn-sm btn-ghost" onClick={() => onSetAutoNext(!autoNext)}
                      style={{ borderColor: autoNext ? "var(--gold)" : "var(--line)", color: autoNext ? "var(--gold)" : "var(--cream)" }}>
                      {autoNext ? "✓ 自動發牌" : "自動發牌"}
                    </button>
                  )}
                  {me.isHost
                    ? <button className="btn btn-primary btn-sm" onClick={onNextHand}>{autoNext ? "立即下一手 →" : "發下一手 →"}</button>
                    : <span className="mono text-faint" style={{ fontSize: 12 }}>{autoNext ? "自動發下一手中…" : "等待房主發下一手…"}</span>}
                </div>
              </div>

              {canShow && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <div className="card-eyebrow mb-8">秀牌給對手（可選）</div>
                  <div className="row gap-10" style={{ alignItems: "center", flexWrap: "wrap" }}>
                    {mySeat.hole.map((c, i) => (
                      <button key={i} onClick={() => onShowCard(i)}
                        title={myShown[i] ? "點一下收回" : "點一下秀出這張"}
                        style={{
                          padding: 4, borderRadius: 8, cursor: "pointer", background: "transparent",
                          border: "2px solid " + (myShown[i] ? "var(--good)" : "var(--line-bright)"),
                        }}>
                        <PlayingCard card={c} size={40} />
                        <div className="mono" style={{ fontSize: 9, marginTop: 2, color: myShown[i] ? "var(--good)" : "var(--fg-faint)" }}>
                          {myShown[i] ? "✓ 已秀" : "點擊秀出"}
                        </div>
                      </button>
                    ))}
                    <span className="mono text-faint" style={{ fontSize: 11, marginLeft: 4 }}>
                      贏了不必亮牌；可選擇秀一張或兩張給對手看。
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : myTurn ? (
            <ActionControls
              acts={view.legalActions}
              pot={view.pot} bb={view.bb}
              stack={mySeat.stack} streetBet={mySeat.streetBet}
              betAmount={betAmount} setBetAmount={setBetAmount}
              onAction={onAction}
            />
          ) : (
            <div className="row gap-16" style={{ minHeight: 56, alignItems: "center" }}>
              <span className="mono text-faint">等待 {view.seats[view.toAct] ? view.seats[view.toAct].name : "…"} 行動…</span>
            </div>
          )}
        </div>
      </div>

      <div className="col gap-16 table-side">
        <div className="card">
          <div className="card-eyebrow mb-8">房間 {room ? room.code : ""}</div>
          <div className="col gap-12">
            <div className="row between"><span className="text-dim">階段</span><span className="mono text-gold">{view.street}</span></div>
            <div className="row between"><span className="text-dim">底池</span><span className="mono text-gold">{view.pot}</span></div>
            <div className="row between"><span className="text-dim">手數</span><span className="mono">#{view.handNo}</span></div>
          </div>
        </div>
        <div className="card">
          <div className="card-eyebrow mb-8">玩家</div>
          <div className="col gap-8">
            {view.seats.map((s, i) => (
              <div key={i} className="row between" style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: s.folded ? 0.45 : 1 }}>
                <span style={{ fontSize: 13 }}>
                  {i === view.toAct && !view.finished ? "▶ " : ""}{s.name}{i === view.mySeat ? "（你）" : ""}
                  {!s.connected ? " ·離線" : ""}
                </span>
                <span className="mono" style={{ fontSize: 12, color: "var(--gold)" }}>${(s.stack || 0).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
