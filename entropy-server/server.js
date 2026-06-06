const fs = require("fs");
const http = require("http");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8787;
const PENALTY = 4;
const LOG_BASE = 2;
const MAX_PLAYERS = 12;
const MAX_BODY_BYTES = 64 * 1024;
const COMPLETED_ROOM_TTL_MS = 10 * 60 * 1000;
const EMPTY_ROOM_TTL_MS = 10 * 60 * 1000;
const LOBBY_IDLE_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ENDING_TOKENS = { ".": true, "?": true, "!": true };
const PUNCTUATION = { ".": true, ",": true, "?": true, "!": true, ";": true, ":": true, ")": true };

const rooms = new Map();
const sentenceBank = loadSentences();

setInterval(cleanupRooms, CLEANUP_INTERVAL_MS).unref();

const server = http.createServer(function (request, response) {
  route(request, response).catch(function (error) {
    console.error(error);
    respondJson(response, 500, { error: "Server error." });
  });
});

server.listen(PORT, function () {
  console.log("Entropy online server running at http://localhost:" + PORT + "/entropy-online.html");
});

async function route(request, response) {
  const url = new URL(request.url, "http://localhost");
  const pathname = url.pathname;

  if (request.method === "POST" && pathname === "/api/online/rooms") {
    return createRoom(request, response);
  }

  const eventMatch = pathname.match(/^\/api\/online\/rooms\/([A-Z0-9]+)\/events$/);
  if (request.method === "GET" && eventMatch) {
    return connectEvents(eventMatch[1], url, request, response);
  }

  const actionMatch = pathname.match(/^\/api\/online\/rooms\/([A-Z0-9]+)\/(join|start|submit|advance|leave)$/);
  if (request.method === "POST" && actionMatch) {
    return roomAction(actionMatch[1], actionMatch[2], request, response);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    return serveStatic(pathname, request, response);
  }

  respondJson(response, 405, { error: "Method not allowed." });
}

async function createRoom(request, response) {
  const body = await readJson(request);
  const host = createPlayer(body.name || "Host");
  const room = {
    code: makeRoomCode(),
    hostId: host.id,
    players: [host],
    scores: {},
    settings: readSettings(body.settings || {}),
    phase: "lobby",
    deck: [],
    sentenceIndex: 0,
    currentTokens: [],
    currentTokenIndex: 0,
    submissions: {},
    lastResult: null,
    deadline: null,
    revealTimer: null,
    clients: new Set(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
    lastEmptyAt: Date.now()
  };

  room.scores[host.id] = 0;
  rooms.set(room.code, room);
  respondJson(response, 201, {
    roomCode: room.code,
    playerId: host.id,
    state: publicState(room, host.id)
  });
}

async function roomAction(code, action, request, response) {
  const room = rooms.get(code);
  if (!room) {
    return respondJson(response, 404, { error: "Room not found." });
  }

  const body = await readJson(request);

  if (action === "join") {
    return joinRoom(room, body, response);
  }

  const actor = findPlayer(room, body.playerId);
  if (!actor) {
    return respondJson(response, 403, { error: "Player not found in this room." });
  }

  if (action === "start") {
    return startRoom(room, actor, body, response);
  }
  if (action === "submit") {
    return submitDistribution(room, actor, body, response);
  }
  if (action === "advance") {
    return advanceRoom(room, actor, response);
  }
  if (action === "leave") {
    return leaveRoom(room, actor, response);
  }

  respondJson(response, 404, { error: "Unknown room action." });
}

function joinRoom(room, body, response) {
  if (room.phase !== "lobby") {
    return respondJson(response, 409, { error: "This game has already started." });
  }
  if (room.players.length >= MAX_PLAYERS) {
    return respondJson(response, 409, { error: "This room is full." });
  }

  const player = createPlayer(body.name || "Player");
  room.players.push(player);
  room.scores[player.id] = 0;
  touchRoom(room);
  broadcastRoom(room);
  respondJson(response, 201, {
    roomCode: room.code,
    playerId: player.id,
    state: publicState(room, player.id)
  });
}

function startRoom(room, actor, body, response) {
  if (actor.id !== room.hostId) {
    return respondJson(response, 403, { error: "Only the host can start the game." });
  }
  if (room.phase !== "lobby") {
    return respondJson(response, 409, { error: "The game has already started." });
  }
  if (room.players.length < 1) {
    return respondJson(response, 400, { error: "Add at least one player." });
  }

  room.settings = readSettings(body.settings || room.settings);
  room.deck = buildDeck(room.settings.sentenceCount);
  if (room.deck.length === 0) {
    return respondJson(response, 500, { error: "No usable sentences were found." });
  }

  room.scores = {};
  room.players.forEach(function (player) {
    room.scores[player.id] = 0;
  });
  room.sentenceIndex = 0;
  room.currentTokens = room.deck[0].tokens;
  room.currentTokenIndex = choosePrefixLength(room.currentTokens, room.settings.prefixShare);
  room.lastResult = null;
  beginPrediction(room);

  respondJson(response, 200, { state: publicState(room, actor.id) });
}

function submitDistribution(room, actor, body, response) {
  if (room.phase !== "predicting") {
    return respondJson(response, 409, { error: "This room is not accepting predictions right now." });
  }
  if (room.submissions[actor.id]) {
    return respondJson(response, 409, { error: "You already submitted for this string." });
  }

  const validation = validateDistribution(body.distribution);
  if (validation.errors.length > 0) {
    return respondJson(response, 400, { error: validation.errors[0] });
  }

  room.submissions[actor.id] = {
    distribution: validation.distribution,
    submittedAt: Date.now()
  };
  touchRoom(room);

  if (Object.keys(room.submissions).length >= room.players.length) {
    finishTurn(room, "all-submitted");
  } else {
    broadcastRoom(room);
  }

  respondJson(response, 200, { state: publicState(room, actor.id) });
}

function advanceRoom(room, actor, response) {
  if (actor.id !== room.hostId) {
    return respondJson(response, 403, { error: "Only the host can advance the game." });
  }
  if (room.phase !== "revealing") {
    return respondJson(response, 409, { error: "There is no revealed string to advance from." });
  }

  applyPendingLosses(room);
  room.currentTokenIndex += 1;

  if (shouldEndSentence(room)) {
    room.sentenceIndex += 1;
    if (room.sentenceIndex >= room.deck.length) {
      finishGame(room);
    } else {
      room.currentTokens = room.deck[room.sentenceIndex].tokens;
      room.currentTokenIndex = choosePrefixLength(room.currentTokens, room.settings.prefixShare);
      beginPrediction(room);
    }
  } else {
    beginPrediction(room);
  }

  respondJson(response, 200, { state: publicState(room, actor.id) });
}

function leaveRoom(room, actor, response) {
  actor.connected = false;
  actor.leftAt = Date.now();
  touchRoom(room);
  broadcastRoom(room);
  respondJson(response, 200, { ok: true });
}

function connectEvents(code, url, request, response) {
  const room = rooms.get(code);
  if (!room) {
    response.writeHead(404, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    response.write("event: error\n");
    response.write('data: {"error":"Room not found."}\n\n');
    response.end();
    return;
  }

  const playerId = url.searchParams.get("playerId") || "";
  const player = findPlayer(room, playerId);
  if (!player) {
    response.writeHead(403, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    response.write("event: error\n");
    response.write('data: {"error":"Player not found in this room."}\n\n');
    response.end();
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  const client = { playerId: player.id, response: response };
  room.clients.add(client);
  player.connected = true;
  player.lastSeen = Date.now();
  room.lastEmptyAt = null;
  sendEvent(response, "state", publicState(room, player.id));
  broadcastRoom(room);

  const heartbeat = setInterval(function () {
    sendEvent(response, "ping", { serverTime: Date.now() });
  }, HEARTBEAT_INTERVAL_MS);
  heartbeat.unref();

  request.on("close", function () {
    clearInterval(heartbeat);
    room.clients.delete(client);
    player.connected = hasConnectionForPlayer(room, player.id);
    player.lastSeen = Date.now();
    if (room.clients.size === 0) {
      room.lastEmptyAt = Date.now();
    }
    touchRoom(room);
    broadcastRoom(room);
  });
}

function beginPrediction(room) {
  clearRevealTimer(room);
  room.phase = "predicting";
  room.submissions = {};
  room.lastResult = null;
  room.deadline = Date.now() + room.settings.turnSeconds * 1000;
  room.revealTimer = setTimeout(function () {
    finishTurn(room, "timeout");
  }, room.settings.turnSeconds * 1000 + 100);
  touchRoom(room);
  broadcastRoom(room);
}

function finishTurn(room, reason) {
  if (room.phase !== "predicting") {
    return;
  }

  clearRevealTimer(room);
  const actual = room.currentTokens[room.currentTokenIndex];
  const prompt = detokenize(room.currentTokens.slice(0, room.currentTokenIndex));
  const results = room.players.map(function (player) {
    const submission = room.submissions[player.id];
    const probability = submission ? submission.distribution[actual] || 0 : 0;
    const loss = probability > 0 ? Math.min(PENALTY, -Math.log(probability) / Math.log(LOG_BASE)) : PENALTY;
    const cumulativeBefore = room.scores[player.id] || 0;
    return {
      playerId: player.id,
      playerName: player.name,
      probability: probability,
      loss: loss,
      cumulativeBefore: cumulativeBefore,
      cumulativeAfter: cumulativeBefore + loss,
      submitted: Boolean(submission)
    };
  });

  room.phase = "revealing";
  room.deadline = null;
  room.lastResult = {
    sentenceIndex: room.sentenceIndex,
    tokenIndex: room.currentTokenIndex,
    prompt: prompt,
    actual: actual,
    reason: reason,
    results: results,
    applied: false
  };
  touchRoom(room);
  broadcastRoom(room);
}

function applyPendingLosses(room) {
  if (!room.lastResult || room.lastResult.applied) {
    return;
  }

  room.lastResult.results.forEach(function (result) {
    room.scores[result.playerId] = (room.scores[result.playerId] || 0) + result.loss;
    result.cumulativeAfter = room.scores[result.playerId];
  });
  room.lastResult.applied = true;
}

function finishGame(room) {
  clearRevealTimer(room);
  room.phase = "finished";
  room.deadline = null;
  room.completedAt = Date.now();
  touchRoom(room);
  broadcastRoom(room);
}

function cleanupRooms() {
  const now = Date.now();
  rooms.forEach(function (room, code) {
    if (room.phase === "finished" && room.completedAt && now - room.completedAt > COMPLETED_ROOM_TTL_MS) {
      return deleteRoom(code);
    }
    if (room.phase === "lobby" && now - room.updatedAt > LOBBY_IDLE_TTL_MS) {
      return deleteRoom(code);
    }
    if (room.clients.size === 0 && room.lastEmptyAt && now - room.lastEmptyAt > EMPTY_ROOM_TTL_MS) {
      return deleteRoom(code);
    }
  });
}

function deleteRoom(code) {
  const room = rooms.get(code);
  if (!room) {
    return;
  }
  clearRevealTimer(room);
  room.clients.forEach(function (client) {
    sendEvent(client.response, "closed", { error: "Room expired." });
    client.response.end();
  });
  rooms.delete(code);
}

function publicState(room, viewerId) {
  const sentence = room.deck[room.sentenceIndex] || null;
  const prefix = room.currentTokens.length
    ? detokenize(room.currentTokens.slice(0, room.currentTokenIndex))
    : "";
  const ranked = rankedPlayers(room);
  const winners = ranked.length > 0
    ? ranked.filter(function (entry) {
      return Math.abs(entry.score - ranked[0].score) <= 0.000000001;
    })
    : [];

  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    viewerId: viewerId,
    settings: room.settings,
    sentenceNumber: room.phase === "lobby" ? 0 : room.sentenceIndex + 1,
    sentenceCount: room.deck.length || room.settings.sentenceCount,
    topic: sentence ? sentence.topic : "",
    prefix: prefix,
    deadline: room.deadline,
    serverTime: Date.now(),
    submissionCount: Object.keys(room.submissions).length,
    playerCount: room.players.length,
    players: room.players.map(function (player) {
      return {
        id: player.id,
        name: player.name,
        connected: Boolean(player.connected),
        isHost: player.id === room.hostId,
        submitted: Boolean(room.submissions[player.id])
      };
    }),
    scoreboard: ranked.map(function (entry, index) {
      return {
        rank: index + 1,
        playerId: entry.player.id,
        name: entry.player.name,
        score: entry.score
      };
    }),
    reveal: room.phase === "revealing" && room.lastResult ? {
      actual: room.lastResult.actual,
      reason: room.lastResult.reason,
      endsSentence: revealEndsSentence(room),
      endsGame: revealEndsSentence(room) && room.sentenceIndex + 1 >= room.deck.length,
      results: room.lastResult.results.slice().sort(function (a, b) {
        return a.loss - b.loss || a.playerName.localeCompare(b.playerName);
      })
    } : null,
    final: room.phase === "finished" ? {
      winners: winners.map(function (entry) {
        return {
          playerId: entry.player.id,
          name: entry.player.name,
          score: entry.score
        };
      }),
      rankings: ranked.map(function (entry, index) {
        return {
          rank: index + 1,
          playerId: entry.player.id,
          name: entry.player.name,
          score: entry.score
        };
      })
    } : null
  };
}

function validateDistribution(rawDistribution) {
  const errors = [];
  const distribution = {};
  let total = 0;
  let usedRows = 0;

  if (!rawDistribution || typeof rawDistribution !== "object" || Array.isArray(rawDistribution)) {
    return { errors: ["Submit a probability distribution."], distribution: {}, total: 0 };
  }

  const entries = Object.entries(rawDistribution);
  if (entries.length > 50) {
    errors.push("Use at most 50 entries.");
  }

  entries.forEach(function (entry) {
    const token = cleanToken(entry[0]);
    const probability = Number(entry[1]);

    if (!token) {
      errors.push("Every probability needs a string.");
      return;
    }
    if (token.length > 40) {
      errors.push("Strings must be 40 characters or shorter.");
      return;
    }
    if (!Number.isFinite(probability)) {
      errors.push("\"" + token + "\" has a probability that is not a finite number.");
      return;
    }
    if (probability < 0) {
      errors.push("\"" + token + "\" has a negative probability.");
      return;
    }

    usedRows += 1;
    distribution[token] = (distribution[token] || 0) + probability;
    total += probability;
  });

  if (usedRows === 0) {
    errors.push("Enter at least one prediction.");
  }
  if (Math.abs(total - 1) > 0.000001) {
    errors.push("Probabilities must add to 1.");
  }

  return {
    errors: unique(errors),
    distribution: distribution,
    total: total
  };
}

function readSettings(rawSettings) {
  const sentenceCount = clamp(parseInteger(rawSettings.sentenceCount, 5), 1, sentenceBank.length);
  const turnSeconds = clamp(parseInteger(rawSettings.turnSeconds, 30), 5, 180);
  const prefixShare = clamp(parseInteger(rawSettings.prefixShare, 55), 35, 75);
  return {
    sentenceCount: sentenceCount,
    turnSeconds: turnSeconds,
    prefixShare: prefixShare
  };
}

function createPlayer(name) {
  return {
    id: makeId("p"),
    name: cleanPlayerName(name),
    connected: false,
    joinedAt: Date.now(),
    lastSeen: Date.now()
  };
}

function buildDeck(count) {
  return shuffle(sentenceBank.slice()).map(function (sentence) {
    return {
      topic: sentence.topic,
      text: sentence.text,
      tokens: tokenize(sentence.text)
    };
  }).filter(function (sentence) {
    return sentence.tokens.length >= 6;
  }).slice(0, count);
}

function shouldEndSentence(room) {
  const previousToken = room.currentTokens[room.currentTokenIndex - 1];
  return ENDING_TOKENS[previousToken] || room.currentTokenIndex >= room.currentTokens.length;
}

function revealEndsSentence(room) {
  const actual = room.lastResult ? room.lastResult.actual : "";
  return ENDING_TOKENS[actual] || room.currentTokenIndex + 1 >= room.currentTokens.length;
}

function rankedPlayers(room) {
  return room.players.map(function (player) {
    return {
      player: player,
      score: room.scores[player.id] || 0
    };
  }).sort(function (a, b) {
    return a.score - b.score || a.player.name.localeCompare(b.player.name);
  });
}

function tokenize(text) {
  return text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*|\d+(?:\.\d+)?|[.,!?;:()]/g) || [];
}

function detokenize(tokens) {
  let text = "";
  tokens.forEach(function (token) {
    if (!text) {
      text = token;
    } else if (PUNCTUATION[token]) {
      text += token;
    } else if (token === "(") {
      text += " " + token;
    } else {
      text += " " + token;
    }
  });
  return text;
}

function choosePrefixLength(tokens, prefixShare) {
  const minPrefix = Math.min(6, Math.max(2, tokens.length - 3));
  const maxPrefix = Math.max(minPrefix, tokens.length - 2);
  const proposed = Math.floor(tokens.length * prefixShare / 100);
  let index = Math.min(Math.max(proposed, minPrefix), maxPrefix);

  while (index > minPrefix && PUNCTUATION[tokens[index]]) {
    index -= 1;
  }
  return index;
}

function loadSentences() {
  const sentencesPath = path.join(ROOT, "entropy-game", "sentences.js");
  const code = fs.readFileSync(sentencesPath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: sentencesPath });
  if (!Array.isArray(sandbox.window.ENTROPY_SENTENCES)) {
    throw new Error("Could not load entropy sentence bank.");
  }
  return sandbox.window.ENTROPY_SENTENCES;
}

function serveStatic(pathname, request, response) {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relativePath);

  if (!isPathInside(ROOT, filePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, function (statError, stats) {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-cache"
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    fs.createReadStream(filePath).pipe(response);
  });
}

function respondJson(response, status, payload) {
  if (response.headersSent) {
    return;
  }
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  response.end(JSON.stringify(payload));
}

function readJson(request) {
  return new Promise(function (resolve, reject) {
    let body = "";
    request.on("data", function (chunk) {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });
    request.on("end", function () {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function sendEvent(response, eventName, payload) {
  response.write("event: " + eventName + "\n");
  response.write("data: " + JSON.stringify(payload) + "\n\n");
}

function broadcastRoom(room) {
  const staleClients = [];
  room.clients.forEach(function (client) {
    try {
      sendEvent(client.response, "state", publicState(room, client.playerId));
    } catch (error) {
      staleClients.push(client);
    }
  });
  staleClients.forEach(function (client) {
    room.clients.delete(client);
  });
}

function touchRoom(room) {
  room.updatedAt = Date.now();
}

function clearRevealTimer(room) {
  if (room.revealTimer) {
    clearTimeout(room.revealTimer);
    room.revealTimer = null;
  }
}

function findPlayer(room, playerId) {
  return room.players.find(function (player) {
    return player.id === playerId;
  });
}

function hasConnectionForPlayer(room, playerId) {
  let connected = false;
  room.clients.forEach(function (client) {
    if (client.playerId === playerId) {
      connected = true;
    }
  });
  return connected;
}

function makeRoomCode() {
  let code = "";
  do {
    code = "";
    for (let index = 0; index < 5; index += 1) {
      code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
    }
  } while (rooms.has(code));
  return code;
}

function makeId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function cleanPlayerName(name) {
  const cleaned = String(name || "").replace(/\s+/g, " ").trim().slice(0, 24);
  return cleaned || "Player";
}

function cleanToken(token) {
  return String(token || "").trim();
}

function parseInteger(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function unique(items) {
  const seen = {};
  return items.filter(function (item) {
    if (seen[item]) {
      return false;
    }
    seen[item] = true;
    return true;
  });
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = items[index];
    items[index] = items[swapIndex];
    items[swapIndex] = temp;
  }
  return items;
}

function contentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".pdf": "application/pdf"
  }[extension] || "application/octet-stream";
}

function isPathInside(parent, child) {
  const relative = path.relative(parent, child);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}
