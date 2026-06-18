// Integration test: boot the server, drive 3 players through a hand, and assert
// that opponents' hole cards are never revealed before showdown.
process.env.PORT = "8090";
require("./index.js");
const WebSocket = require("ws");

const URL = "ws://localhost:8090";
const sleep = ms => new Promise(r => setTimeout(r, ms));

function mkClient(name) {
  const ws = new WebSocket(URL);
  const c = { ws, name, id: null, lastView: null, lastRoom: null, errors: [] };
  ws.on("message", raw => {
    const m = JSON.parse(raw.toString());
    if (m.type === "hello") c.id = m.id;
    if (m.type === "joined") { c.id = m.youId; c.isHost = m.isHost; c.lastRoom = m.room; }
    if (m.type === "lobby") c.lastRoom = m.room;
    if (m.type === "state") { c.lastView = m.view; c.lastRoom = m.room; }
    if (m.type === "error") c.errors.push(m);
  });
  c.send = obj => ws.send(JSON.stringify(obj));
  c.ready = new Promise(res => ws.on("open", res));
  return c;
}

function assert(cond, msg) { if (!cond) { console.log("FAIL: " + msg); process.exitCode = 1; throw new Error(msg); } else console.log("PASS: " + msg); }

(async () => {
  const host = mkClient("Alice");
  const g1 = mkClient("Bob");
  const g2 = mkClient("Carol");
  await Promise.all([host.ready, g1.ready, g2.ready]);
  await sleep(50);

  host.send({ type: "createRoom", name: "Alice", password: "1234", config: { sb: 10, bb: 20, startingStack: 1000 } });
  await sleep(80);
  const code = host.lastRoom.code;
  assert(!!code && code.length === 4, "host got a 4-char room code: " + code);
  assert(host.lastRoom.hasPassword === true, "room reports it has a password");

  // wrong password
  g1.send({ type: "joinRoom", code, name: "Bob", password: "0000" });
  await sleep(80);
  assert(g1.errors.some(e => e.code === "BAD_PASSWORD"), "wrong password rejected");

  // correct password
  g1.send({ type: "joinRoom", code, name: "Bob", password: "1234" });
  g2.send({ type: "joinRoom", code, name: "Carol", password: "1234" });
  await sleep(120);
  assert(host.lastRoom.players.length === 3, "room now has 3 players");

  // non-host cannot start
  g1.send({ type: "startGame" });
  await sleep(60);
  assert(g1.errors.some(e => e.code === "NOT_HOST"), "non-host cannot start game");

  // host starts
  host.send({ type: "startGame" });
  await sleep(120);
  assert(host.lastView && host.lastView.started, "game started, state broadcast");

  // privacy: each client sees own 2 cards, opponents masked
  for (const c of [host, g1, g2]) {
    const v = c.lastView;
    const mine = v.seats[v.mySeat].hole;
    assert(Array.isArray(mine) && mine[0] && mine[1] && mine[0] !== null, c.name + " sees own 2 hole cards: " + JSON.stringify(mine));
    const others = v.seats.filter((s, i) => i !== v.mySeat);
    const leaked = others.some(s => s.hole && s.hole[0] !== null);
    assert(!leaked, c.name + " does NOT see any opponent hole cards");
  }

  // play the hand to completion by always having the to-act player act
  const clientsBySeat = () => {
    const v = host.lastView;
    return v.seats.map((s, i) => [host, g1, g2].find(c => c.lastView && c.lastView.mySeat === i));
  };
  let steps = 0;
  while (!host.lastView.finished && steps++ < 200) {
    const v = host.lastView;
    const toAct = v.toAct;
    const actor = [host, g1, g2].find(c => c.lastView && c.lastView.mySeat === toAct);
    const la = actor.lastView.legalActions;
    // simple policy: check if possible else call else fold
    let action;
    if (la.options.includes("check")) action = { type: "check" };
    else if (la.options.includes("call")) action = { type: "call" };
    else action = { type: "fold" };
    actor.send({ type: "action", action });
    await sleep(40);
  }
  assert(host.lastView.finished, "hand reached completion");
  assert(Array.isArray(host.lastView.winners) && host.lastView.winners.length >= 1, "winners decided");

  // showdown: non-folded opponents' cards now visible to others
  const v = host.lastView;
  const shown = v.seats.filter((s, i) => i !== v.mySeat && !s.folded && s.inHand && s.hole && s.hole[0] !== null);
  console.log("INFO showdown revealed opponents:", shown.length);

  // next hand by host
  host.send({ type: "nextHand" });
  await sleep(100);
  assert(host.lastView.handNo >= 2 && !host.lastView.finished, "next hand dealt");

  console.log("\nALL TESTS PASSED");
  process.exit(process.exitCode || 0);
})().catch(e => { console.log(e); process.exit(1); });
