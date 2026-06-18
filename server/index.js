// WebSocket backend for multiplayer Hold'em.
// Server-authoritative: it deals, holds the full state, and sends each client
// only their own view (opponents' hole cards withheld until showdown).

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");
const { Room, genCode } = require("./room");

const PORT = process.env.PORT || 8080;

/** @type {Map<string, Room>} */
const rooms = new Map();

function newId() { return crypto.randomBytes(8).toString("hex"); }
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }
function err(ws, message, code) { send(ws, { type: "error", message, code }); }

function uniqueCode() {
  let code;
  do { code = genCode(); } while (rooms.has(code));
  return code;
}

function broadcastLobby(room) {
  for (const p of room.players) if (p.connected) send(p.ws, { type: "lobby", room: room.meta() });
}

function broadcastState(room) {
  for (const p of room.players) if (p.connected) {
    send(p.ws, { type: "state", room: room.meta(), view: room.viewFor(p.id) });
  }
}

// Advance past any disconnected players whose turn it is, then broadcast.
function progressAndBroadcast(room) {
  let guard = 0;
  while (room.autoActIfDisconnected() && guard++ < 20) { /* keep folding the absent */ }
  broadcastState(room);
}

// -------- HTTP server (health check for Render) + WS upgrade --------
const server = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("holdem multiplayer server ok");
  } else {
    res.writeHead(404); res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.id = newId();
  ws.roomCode = null;

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    try { handle(ws, msg); }
    catch (e) { err(ws, e.message || "伺服器錯誤", e.code || "SERVER"); }
  });

  ws.on("close", () => handleClose(ws));
  ws.on("error", () => {});

  send(ws, { type: "hello", id: ws.id });
});

function handle(ws, msg) {
  switch (msg.type) {
    case "createRoom":   return onCreateRoom(ws, msg);
    case "joinRoom":     return onJoinRoom(ws, msg);
    case "startGame":    return onStartGame(ws, msg);
    case "action":       return onAction(ws, msg);
    case "nextHand":     return onNextHand(ws, msg);
    case "leave":        return onLeave(ws);
    case "ping":         return send(ws, { type: "pong" });
    default:             return err(ws, "未知訊息: " + msg.type, "UNKNOWN");
  }
}

function currentRoom(ws) { return ws.roomCode ? rooms.get(ws.roomCode) : null; }

function onCreateRoom(ws, msg) {
  const name = (msg.name || "房主").slice(0, 20);
  const code = uniqueCode();
  const room = new Room(code, ws.id, msg.password || null, msg.config || {});
  room.addPlayer({ id: ws.id, name, ws, connected: true });
  rooms.set(code, room);
  ws.roomCode = code;
  send(ws, { type: "joined", code, youId: ws.id, isHost: true, room: room.meta() });
  broadcastLobby(room);
}

function onJoinRoom(ws, msg) {
  const code = String(msg.code || "").toUpperCase().trim();
  const room = rooms.get(code);
  if (!room) return err(ws, "找不到這個房間", "NO_ROOM");
  if (!room.checkPassword(msg.password)) return err(ws, "房間密碼錯誤", "BAD_PASSWORD");
  const name = (msg.name || "玩家").slice(0, 20);
  room.addPlayer({ id: ws.id, name, ws, connected: true });
  ws.roomCode = code;
  send(ws, { type: "joined", code, youId: ws.id, isHost: ws.id === room.hostId, room: room.meta() });
  broadcastLobby(room);
}

function onStartGame(ws) {
  const room = currentRoom(ws);
  if (!room) return err(ws, "你不在任何房間", "NO_ROOM");
  if (ws.id !== room.hostId) return err(ws, "只有房主能開始遊戲", "NOT_HOST");
  room.startGame();
  broadcastState(room);
}

function onAction(ws, msg) {
  const room = currentRoom(ws);
  if (!room) return err(ws, "你不在任何房間", "NO_ROOM");
  room.applyAction(ws.id, msg.action);
  progressAndBroadcast(room);
}

function onNextHand(ws) {
  const room = currentRoom(ws);
  if (!room) return err(ws, "你不在任何房間", "NO_ROOM");
  if (ws.id !== room.hostId) return err(ws, "只有房主能發下一手", "NOT_HOST");
  if (room.game && !room.game.finished) return err(ws, "本手還沒結束", "HAND_ACTIVE");
  room.nextHand();
  progressAndBroadcast(room);
}

function onLeave(ws) {
  const room = currentRoom(ws);
  if (!room) return;
  removeFromRoom(ws, room);
  send(ws, { type: "left" });
}

function handleClose(ws) {
  const room = currentRoom(ws);
  if (!room) return;
  const p = room.getPlayer(ws.id);
  if (!p) return;
  if (room.started) {
    // keep the seat to preserve indices; mark gone and auto-fold if it's their turn
    p.connected = false;
    progressAndBroadcast(room);
    broadcastLobby(room);
  } else {
    removeFromRoom(ws, room);
  }
}

function removeFromRoom(ws, room) {
  const wasHost = ws.id === room.hostId;
  room.dropPlayer(ws.id);
  ws.roomCode = null;
  if (room.players.length === 0) {
    rooms.delete(room.code);
    return;
  }
  if (wasHost) broadcastLobby(room); // host reassigned inside dropPlayer
  if (room.started) progressAndBroadcast(room);
  broadcastLobby(room);
}

server.listen(PORT, () => {
  console.log("Hold'em multiplayer server listening on :" + PORT);
});

module.exports = { server, rooms };
