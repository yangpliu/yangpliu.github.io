(function () {
  var state = {
    room: null,
    roomCode: "",
    playerId: "",
    source: null,
    serverOffset: 0,
    timerId: null,
    lastTurnKey: "",
    lobbySettingsDirty: false
  };

  var elements = {};
  var API_BASE = normalizeApiBase(window.ENTROPY_ONLINE_API_BASE || "");

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEvents();
    hydrateFromUrl();
    renderEntryRows(defaultRows());
    updateSetupPrefixShare();
    updateLobbyPrefixShare();
    updateValidation();
    state.timerId = window.setInterval(renderTimer, 100);
  });

  function cacheElements() {
    [
      "onlineSetupPanel",
      "onlinePlayerName",
      "joinRoomCode",
      "onlineSentenceCount",
      "onlineTurnSeconds",
      "onlinePrefixShare",
      "onlinePrefixShareValue",
      "createRoomButton",
      "joinRoomButton",
      "onlineSetupStatus",
      "onlineLobbyPanel",
      "lobbyRoomCode",
      "lobbyHostControls",
      "lobbySentenceCount",
      "lobbyTurnSeconds",
      "lobbyPrefixShare",
      "lobbyPrefixShareValue",
      "startOnlineGameButton",
      "lobbyStatus",
      "onlineLobbyPlayers",
      "onlineGamePanel",
      "onlineRoundKicker",
      "onlineRoundTitle",
      "onlineTimerValue",
      "onlinePromptText",
      "onlinePredictPanel",
      "onlinePlayerLabel",
      "onlineSubmissionStatus",
      "onlineEntryRows",
      "onlineAddRowButton",
      "onlineNormalizeButton",
      "onlineSubmitPredictionButton",
      "onlineProbabilityTotal",
      "onlineValidationMessage",
      "onlineRevealPanel",
      "onlineActualToken",
      "onlineTurnResultTable",
      "onlineNextTurnButton",
      "onlineRevealStatus",
      "onlineFinishedPanel",
      "onlineWinnerBanner",
      "onlineFinalTable",
      "onlineScoreboardList"
    ].forEach(function (id) {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    elements.onlinePrefixShare.addEventListener("input", updateSetupPrefixShare);
    elements.lobbyPrefixShare.addEventListener("input", function () {
      state.lobbySettingsDirty = true;
      updateLobbyPrefixShare();
    });
    ["lobbySentenceCount", "lobbyTurnSeconds"].forEach(function (id) {
      elements[id].addEventListener("input", function () {
        state.lobbySettingsDirty = true;
      });
    });

    elements.createRoomButton.addEventListener("click", createRoom);
    elements.joinRoomButton.addEventListener("click", joinRoom);
    elements.startOnlineGameButton.addEventListener("click", startGame);
    elements.onlineAddRowButton.addEventListener("click", function () {
      appendEntryRow("", "");
      updateValidation();
    });
    elements.onlineNormalizeButton.addEventListener("click", normalizeRows);
    elements.onlineSubmitPredictionButton.addEventListener("click", submitPrediction);
    elements.onlineNextTurnButton.addEventListener("click", advanceGame);
    elements.onlineEntryRows.addEventListener("input", updateValidation);
    elements.onlineEntryRows.addEventListener("click", function (event) {
      if (event.target.classList.contains("remove-row-button")) {
        event.target.closest(".entry-row").remove();
        ensureAtLeastOneRow();
        updateValidation();
      }
    });
  }

  function hydrateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var room = (params.get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
    if (room) {
      elements.joinRoomCode.value = room;
    }
  }

  function updateSetupPrefixShare() {
    elements.onlinePrefixShareValue.textContent = elements.onlinePrefixShare.value + "%";
  }

  function updateLobbyPrefixShare() {
    elements.lobbyPrefixShareValue.textContent = elements.lobbyPrefixShare.value + "%";
  }

  function readSetupSettings() {
    return {
      sentenceCount: parseInt(elements.onlineSentenceCount.value, 10),
      turnSeconds: parseInt(elements.onlineTurnSeconds.value, 10),
      prefixShare: parseInt(elements.onlinePrefixShare.value, 10)
    };
  }

  function readLobbySettings() {
    return {
      sentenceCount: parseInt(elements.lobbySentenceCount.value, 10),
      turnSeconds: parseInt(elements.lobbyTurnSeconds.value, 10),
      prefixShare: parseInt(elements.lobbyPrefixShare.value, 10)
    };
  }

  function playerName() {
    return elements.onlinePlayerName.value.trim() || "Player";
  }

  function roomCodeInput() {
    return elements.joinRoomCode.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  }

  function createRoom() {
    setSetupStatus("Creating room...", false);
    setSetupBusy(true);
    fetchJson(apiUrl("/api/online/rooms"), {
      name: playerName(),
      settings: readSetupSettings()
    }).then(function (data) {
      enterRoom(data);
      setSetupStatus("", false);
    }).catch(function (error) {
      setSetupStatus(error.message, true);
    }).finally(function () {
      setSetupBusy(false);
    });
  }

  function joinRoom() {
    var code = roomCodeInput();
    if (!code) {
      setSetupStatus("Enter a room code.", true);
      return;
    }

    setSetupStatus("Joining room...", false);
    setSetupBusy(true);
    fetchJson(apiUrl("/api/online/rooms/" + encodeURIComponent(code) + "/join"), {
      name: playerName()
    }).then(function (data) {
      enterRoom(data);
      setSetupStatus("", false);
    }).catch(function (error) {
      setSetupStatus(error.message, true);
    }).finally(function () {
      setSetupBusy(false);
    });
  }

  function enterRoom(data) {
    state.roomCode = data.roomCode;
    state.playerId = data.playerId;
    state.room = data.state;
    state.lobbySettingsDirty = false;
    updateUrlRoom(state.roomCode);
    connectEvents();
    renderRoom();
  }

  function connectEvents() {
    if (state.source) {
      state.source.close();
    }

    state.source = new EventSource(apiUrl("/api/online/rooms/" + encodeURIComponent(state.roomCode) + "/events?playerId=" + encodeURIComponent(state.playerId)));
    state.source.addEventListener("state", function (event) {
      var nextRoom = JSON.parse(event.data);
      state.room = nextRoom;
      state.serverOffset = nextRoom.serverTime - Date.now();
      renderRoom();
    });
    state.source.addEventListener("closed", function (event) {
      var payload = JSON.parse(event.data);
      setSetupStatus(payload.error || "Room closed.", true);
      resetToSetup();
    });
    state.source.addEventListener("error", function () {
      if (!state.room) {
        setSetupStatus("Could not connect to the online server.", true);
      }
    });
  }

  function startGame() {
    if (!state.room || !isHost()) {
      return;
    }

    setLobbyStatus("Starting game...", false);
    fetchJson(apiUrl("/api/online/rooms/" + encodeURIComponent(state.roomCode) + "/start"), {
      playerId: state.playerId,
      settings: readLobbySettings()
    }).then(function (data) {
      state.room = data.state;
      state.lobbySettingsDirty = false;
      renderRoom();
    }).catch(function (error) {
      setLobbyStatus(error.message, true);
    });
  }

  function submitPrediction() {
    if (!state.room || state.room.phase !== "predicting") {
      return;
    }

    var result = collectRows(true);
    if (result.errors.length > 0) {
      elements.onlineValidationMessage.textContent = result.errors[0];
      elements.onlineValidationMessage.className = "is-error";
      return;
    }

    setPredictionBusy(true);
    fetchJson(apiUrl("/api/online/rooms/" + encodeURIComponent(state.roomCode) + "/submit"), {
      playerId: state.playerId,
      distribution: result.distribution
    }).then(function (data) {
      state.room = data.state;
      renderEntryRows(defaultRows());
      renderRoom();
    }).catch(function (error) {
      elements.onlineValidationMessage.textContent = error.message;
      elements.onlineValidationMessage.className = "is-error";
    }).finally(function () {
      if (state.room && state.room.phase === "predicting") {
        renderRoom();
      } else {
        setPredictionBusy(false);
      }
    });
  }

  function advanceGame() {
    if (!state.room || !isHost()) {
      return;
    }

    elements.onlineNextTurnButton.disabled = true;
    fetchJson(apiUrl("/api/online/rooms/" + encodeURIComponent(state.roomCode) + "/advance"), {
      playerId: state.playerId
    }).then(function (data) {
      state.room = data.state;
      renderRoom();
    }).catch(function (error) {
      elements.onlineRevealStatus.textContent = error.message;
      elements.onlineRevealStatus.className = "status-line is-error";
    }).finally(function () {
      elements.onlineNextTurnButton.disabled = false;
    });
  }

  function renderRoom() {
    var room = state.room;
    if (!room) {
      elements.onlineSetupPanel.classList.remove("is-hidden");
      elements.onlineLobbyPanel.classList.add("is-hidden");
      elements.onlineGamePanel.classList.add("is-hidden");
      return;
    }

    elements.onlineSetupPanel.classList.add("is-hidden");
    elements.onlineLobbyPanel.classList.toggle("is-hidden", room.phase !== "lobby");
    elements.onlineGamePanel.classList.toggle("is-hidden", room.phase === "lobby");

    if (room.phase === "lobby") {
      renderLobby(room);
      return;
    }

    renderGame(room);
  }

  function renderLobby(room) {
    var host = isHost();
    elements.lobbyRoomCode.textContent = room.code;
    elements.lobbyHostControls.classList.toggle("is-hidden", !host);
    elements.startOnlineGameButton.classList.toggle("is-hidden", !host);
    setLobbyStatus(host ? "Ready" : "Waiting for host.", false);

    if (!state.lobbySettingsDirty) {
      elements.lobbySentenceCount.value = room.settings.sentenceCount;
      elements.lobbyTurnSeconds.value = room.settings.turnSeconds;
      elements.lobbyPrefixShare.value = room.settings.prefixShare;
      updateLobbyPrefixShare();
    }

    elements.onlineLobbyPlayers.innerHTML = "";
    room.players.forEach(function (player) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      var status = document.createElement("span");
      name.className = "player-name";
      status.className = player.connected ? "connection-status is-online" : "connection-status";
      name.textContent = player.name + (player.isHost ? " (host)" : "");
      status.textContent = player.connected ? "online" : "offline";
      item.appendChild(name);
      item.appendChild(status);
      elements.onlineLobbyPlayers.appendChild(item);
    });
  }

  function renderGame(room) {
    renderScoreboard(room);
    renderTimer();

    if (room.phase === "finished") {
      elements.onlineRoundKicker.textContent = "Game complete";
      elements.onlineRoundTitle.textContent = "Final scores";
      elements.onlinePromptText.textContent = "All selected math statements have ended.";
    } else {
      elements.onlineRoundKicker.textContent = "Sentence " + room.sentenceNumber + " of " + room.sentenceCount + " / " + room.topic;
      elements.onlineRoundTitle.textContent = "Assign probability to the next string";
      elements.onlinePromptText.textContent = room.prefix;
    }

    elements.onlinePredictPanel.classList.toggle("is-hidden", room.phase !== "predicting");
    elements.onlineRevealPanel.classList.toggle("is-hidden", room.phase !== "revealing");
    elements.onlineFinishedPanel.classList.toggle("is-hidden", room.phase !== "finished");

    if (room.phase === "predicting") {
      renderPredicting(room);
    } else if (room.phase === "revealing") {
      renderReveal(room);
    } else if (room.phase === "finished") {
      renderFinished(room);
    }
  }

  function renderPredicting(room) {
    var turnKey = room.sentenceNumber + "|" + room.topic + "|" + room.prefix;
    var self = currentPlayer(room);
    var alreadySubmitted = self ? self.submitted : false;

    if (turnKey !== state.lastTurnKey) {
      state.lastTurnKey = turnKey;
      renderEntryRows(defaultRows());
      updateValidation();
    }

    elements.onlinePlayerLabel.textContent = self ? self.name + "'s distribution" : "Your distribution";
    elements.onlineSubmissionStatus.textContent = room.submissionCount + " of " + room.playerCount + " submitted";
    setPredictionDisabled(alreadySubmitted);

    if (alreadySubmitted) {
      elements.onlineValidationMessage.textContent = "Submitted. Waiting for the other players.";
      elements.onlineValidationMessage.className = "is-ok";
    } else {
      updateValidation();
    }
  }

  function renderReveal(room) {
    var reveal = room.reveal;
    if (!reveal) {
      return;
    }

    elements.onlineActualToken.textContent = reveal.actual;
    var rows = [
      '<div class="result-row header"><span>Player</span><span>p(actual)</span><span>Round loss</span><span>New total score</span></div>'
    ];

    reveal.results.forEach(function (result) {
      var lossClass = result.loss === 0 ? "round-loss is-zero" : "round-loss is-positive";
      rows.push(
        '<div class="result-row">' +
        '<span>' + escapeHtml(result.playerName) + (result.submitted ? "" : " (missed)") + '</span>' +
        '<span>' + formatProbability(result.probability) + '</span>' +
        '<span class="' + lossClass + '">' + formatNumber(result.loss) + '</span>' +
        '<span class="new-total-score">' + formatNumber(result.cumulativeAfter) + '</span>' +
        '</div>'
      );
    });

    elements.onlineTurnResultTable.innerHTML = rows.join("");
    elements.onlineNextTurnButton.textContent = nextActionText(room);
    elements.onlineNextTurnButton.classList.toggle("is-hidden", !isHost());
    elements.onlineRevealStatus.textContent = isHost() ? "" : "Waiting for the host to continue.";
    elements.onlineRevealStatus.className = "status-line";
  }

  function renderFinished(room) {
    var final = room.final || { winners: [], rankings: [] };
    renderWinnerBanner(final.winners);

    var rows = [
      '<div class="result-row header"><span>Rank</span><span>Player</span><span></span><span>Total</span></div>'
    ];
    final.rankings.forEach(function (entry) {
      rows.push(
        '<div class="result-row">' +
        '<span>' + entry.rank + '</span>' +
        '<span>' + escapeHtml(entry.name) + '</span>' +
        '<span></span>' +
        '<span>' + formatNumber(entry.score) + '</span>' +
        '</div>'
      );
    });
    elements.onlineFinalTable.innerHTML = rows.join("");
  }

  function renderWinnerBanner(winners) {
    if (!winners || winners.length === 0) {
      elements.onlineWinnerBanner.innerHTML = "";
      return;
    }

    var label = winners.length === 1 ? "Winner" : "Winners";
    var bestScore = winners[0].score;
    var names = joinEscapedNames(winners.map(function (winner) {
      return escapeHtml(winner.name);
    }));

    elements.onlineWinnerBanner.innerHTML =
      '<div class="winner-crown" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="winner-copy">' +
      '<div class="winner-label">' + label + '</div>' +
      '<div class="winner-name">' + names + '</div>' +
      '<div class="winner-score">Final loss ' + formatNumber(bestScore) + '</div>' +
      '</div>';
  }

  function renderScoreboard(room) {
    elements.onlineScoreboardList.innerHTML = "";
    room.scoreboard.forEach(function (entry) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      var score = document.createElement("span");
      name.className = "score-name";
      score.className = "score-value";
      name.textContent = entry.rank + ". " + entry.name;
      score.textContent = formatNumber(entry.score);
      item.appendChild(name);
      item.appendChild(score);
      elements.onlineScoreboardList.appendChild(item);
    });
  }

  function renderTimer() {
    if (!elements.onlineTimerValue) {
      return;
    }
    if (!state.room || !state.room.deadline || state.room.phase !== "predicting") {
      elements.onlineTimerValue.textContent = "0.0";
      return;
    }

    var serverNow = Date.now() + state.serverOffset;
    var remaining = Math.max(0, state.room.deadline - serverNow);
    elements.onlineTimerValue.textContent = (remaining / 1000).toFixed(1);
  }

  function nextActionText(room) {
    if (!room.reveal || !room.reveal.endsSentence) {
      return "Add Losses and Continue";
    }
    return room.reveal.endsGame ? "Add Losses and Show Final Scores" : "Add Losses and Next Sentence";
  }

  function defaultRows() {
    return [
      { token: "", probability: "" },
      { token: "", probability: "" },
      { token: "", probability: "" },
      { token: "", probability: "" },
      { token: "", probability: "" }
    ];
  }

  function renderEntryRows(rows) {
    elements.onlineEntryRows.innerHTML = "";
    rows.forEach(function (row) {
      appendEntryRow(row.token, row.probability);
    });
  }

  function appendEntryRow(token, probability) {
    var row = document.createElement("div");
    var tokenInput = document.createElement("input");
    var probabilityInput = document.createElement("input");
    var removeButton = document.createElement("button");

    row.className = "entry-row";
    tokenInput.className = "token-input";
    tokenInput.type = "text";
    tokenInput.maxLength = 40;
    tokenInput.placeholder = "word or punctuation";
    tokenInput.autocomplete = "off";
    tokenInput.value = token;

    probabilityInput.className = "probability-input";
    probabilityInput.type = "text";
    probabilityInput.inputMode = "decimal";
    probabilityInput.placeholder = "0.25";
    probabilityInput.value = probability;

    removeButton.className = "remove-row-button";
    removeButton.type = "button";
    removeButton.textContent = "X";
    removeButton.title = "Remove row";

    row.appendChild(tokenInput);
    row.appendChild(probabilityInput);
    row.appendChild(removeButton);
    elements.onlineEntryRows.appendChild(row);
  }

  function ensureAtLeastOneRow() {
    if (!elements.onlineEntryRows.querySelector(".entry-row")) {
      appendEntryRow("", "");
    }
  }

  function collectRows(requireTotal) {
    var rowNodes = Array.prototype.slice.call(elements.onlineEntryRows.querySelectorAll(".entry-row"));
    var distribution = {};
    var errors = [];
    var total = 0;
    var usedRows = 0;

    if (rowNodes.length > 50) {
      errors.push("Use at most 50 entries.");
    }

    rowNodes.forEach(function (row) {
      var tokenInput = row.querySelector(".token-input");
      var probabilityInput = row.querySelector(".probability-input");
      var token = tokenInput.value.trim();
      var rawProbability = probabilityInput.value.trim();

      if (!token && !rawProbability) {
        return;
      }
      if (!token) {
        errors.push("Every filled probability needs a string.");
        return;
      }
      if (!rawProbability) {
        errors.push("Every filled string needs a probability.");
        return;
      }
      if (token.length > 40) {
        errors.push("Strings must be 40 characters or shorter.");
        return;
      }

      var probability = Number(rawProbability);
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
    if (requireTotal && Math.abs(total - 1) > 0.000001) {
      errors.push("Probabilities must add to 1.");
    }

    return {
      distribution: distribution,
      errors: unique(errors),
      total: total,
      usedRows: usedRows
    };
  }

  function updateValidation() {
    if (!elements.onlineEntryRows) {
      return;
    }
    var result = collectRows(false);
    elements.onlineProbabilityTotal.textContent = formatNumber(result.total);
    elements.onlineValidationMessage.className = "";

    if (result.errors.length > 0) {
      elements.onlineValidationMessage.textContent = result.errors[0];
      elements.onlineValidationMessage.classList.add("is-error");
      return;
    }

    if (Math.abs(result.total - 1) <= 0.000001) {
      elements.onlineValidationMessage.textContent = "Ready";
      elements.onlineValidationMessage.classList.add("is-ok");
    } else {
      elements.onlineValidationMessage.textContent = "Total must be 1";
      elements.onlineValidationMessage.classList.add("is-error");
    }
  }

  function normalizeRows() {
    var rows = Array.prototype.slice.call(elements.onlineEntryRows.querySelectorAll(".entry-row"));
    var weightedRows = [];
    var errors = [];
    var totalWeight = 0;

    if (rows.length > 50) {
      errors.push("Use at most 50 entries.");
    }

    rows.forEach(function (row) {
      var tokenInput = row.querySelector(".token-input");
      var probabilityInput = row.querySelector(".probability-input");
      var token = tokenInput.value.trim();
      var rawProbability = probabilityInput.value.trim();

      if (!token && !rawProbability) {
        return;
      }
      if (!token) {
        errors.push("Every filled probability needs a string.");
        return;
      }
      if (token.length > 40) {
        errors.push("Strings must be 40 characters or shorter.");
        return;
      }

      var weight = 1;
      if (rawProbability) {
        weight = Number(rawProbability);
        if (!Number.isFinite(weight)) {
          errors.push("\"" + token + "\" has a probability that is not a finite number.");
          return;
        }
        if (weight < 0) {
          errors.push("\"" + token + "\" has a negative probability.");
          return;
        }
      }

      weightedRows.push({
        probabilityInput: probabilityInput,
        weight: weight
      });
      totalWeight += weight;
    });

    if (errors.length > 0) {
      elements.onlineValidationMessage.textContent = unique(errors)[0];
      elements.onlineValidationMessage.className = "is-error";
      return;
    }

    if (weightedRows.length === 0) {
      elements.onlineValidationMessage.textContent = "Enter at least one string.";
      elements.onlineValidationMessage.className = "is-error";
      return;
    }

    if (totalWeight <= 0) {
      totalWeight = weightedRows.length;
      weightedRows.forEach(function (item) {
        item.weight = 1;
      });
    }

    writeNormalizedProbabilities(weightedRows, totalWeight);
    updateValidation();
  }

  function writeNormalizedProbabilities(weightedRows, totalWeight) {
    var scale = 100000000;
    var scaledRows = weightedRows.map(function (item, index) {
      var exact = (item.weight / totalWeight) * scale;
      var base = Math.floor(exact);
      return {
        item: item,
        index: index,
        base: base,
        fraction: exact - base
      };
    });
    var used = scaledRows.reduce(function (sum, row) {
      return sum + row.base;
    }, 0);
    var remaining = scale - used;

    scaledRows.slice().sort(function (a, b) {
      return b.fraction - a.fraction || a.index - b.index;
    }).slice(0, remaining).forEach(function (row) {
      row.base += 1;
    });

    scaledRows.sort(function (a, b) {
      return a.index - b.index;
    }).forEach(function (row) {
      row.item.probabilityInput.value = formatNormalizedProbability(row.base / scale);
    });
  }

  function setPredictionDisabled(disabled) {
    Array.prototype.slice.call(elements.onlineEntryRows.querySelectorAll("input, button")).forEach(function (control) {
      control.disabled = disabled;
    });
    elements.onlineAddRowButton.disabled = disabled;
    elements.onlineNormalizeButton.disabled = disabled;
    elements.onlineSubmitPredictionButton.disabled = disabled;
  }

  function setPredictionBusy(busy) {
    elements.onlineSubmitPredictionButton.disabled = busy;
    elements.onlineNormalizeButton.disabled = busy;
    elements.onlineAddRowButton.disabled = busy;
  }

  function setSetupBusy(busy) {
    elements.createRoomButton.disabled = busy;
    elements.joinRoomButton.disabled = busy;
  }

  function setSetupStatus(message, isError) {
    elements.onlineSetupStatus.textContent = message;
    elements.onlineSetupStatus.className = isError ? "status-line is-error" : "status-line";
  }

  function setLobbyStatus(message, isError) {
    elements.lobbyStatus.textContent = message;
    elements.lobbyStatus.className = isError ? "status-line is-error" : "status-line";
  }

  function resetToSetup() {
    if (state.source) {
      state.source.close();
    }
    state.room = null;
    state.roomCode = "";
    state.playerId = "";
    state.source = null;
    renderRoom();
  }

  function currentPlayer(room) {
    return room.players.find(function (player) {
      return player.id === state.playerId;
    });
  }

  function isHost() {
    return Boolean(state.room && state.room.hostId === state.playerId);
  }

  function fetchJson(url, payload) {
    return window.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {})
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || "Request failed.");
        }
        return data;
      });
    });
  }

  function apiUrl(path) {
    return API_BASE + path;
  }

  function normalizeApiBase(value) {
    return String(value || "").replace(/\/+$/, "");
  }

  function updateUrlRoom(roomCode) {
    if (!window.history || !window.history.replaceState) {
      return;
    }
    var nextUrl = window.location.pathname + "?room=" + encodeURIComponent(roomCode);
    window.history.replaceState(null, "", nextUrl);
  }

  function formatNumber(value) {
    if (!Number.isFinite(value)) {
      return "0";
    }
    return Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatProbability(value) {
    if (!Number.isFinite(value)) {
      return "0";
    }
    if (value === 0) {
      return "0";
    }
    if (value >= 0.001) {
      return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
    }
    return value.toExponential(2);
  }

  function formatNormalizedProbability(value) {
    if (!Number.isFinite(value) || value === 0) {
      return "0";
    }
    return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  }

  function unique(items) {
    var seen = {};
    return items.filter(function (item) {
      if (seen[item]) {
        return false;
      }
      seen[item] = true;
      return true;
    });
  }

  function joinEscapedNames(names) {
    if (names.length <= 1) {
      return names[0] || "";
    }
    if (names.length === 2) {
      return names[0] + " and " + names[1];
    }
    return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character];
    });
  }
}());
