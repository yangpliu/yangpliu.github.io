(function () {
  var PENALTY = 4;
  var LOG_BASE = 2;
  var ENDING_TOKENS = { ".": true, "?": true, "!": true };
  var PUNCTUATION = { ".": true, ",": true, "?": true, "!": true, ";": true, ":": true, ")": true };

  var state = {
    status: "setup",
    players: [],
    scores: {},
    settings: {
      sentenceCount: 5,
      turnSeconds: 30,
      prefixShare: 55
    },
    deck: [],
    sentenceIndex: 0,
    currentTokens: [],
    currentTokenIndex: 0,
    submissions: {},
    history: [],
    lastResult: null,
    deadline: null,
    timerId: null
  };

  var elements = {};

  document.addEventListener("DOMContentLoaded", function () {
    cacheElements();
    bindEvents();
    addPlayer("Player 1");
    addPlayer("Player 2");
    updatePrefixShare();
    renderSetupPlayers();
    renderEntryRows(defaultRows());
    updateValidation();
  });

  function cacheElements() {
    [
      "setupPanel",
      "gamePanel",
      "sentenceCount",
      "turnSeconds",
      "prefixShare",
      "prefixShareValue",
      "startGameButton",
      "resetSetupButton",
      "addPlayerForm",
      "playerNameInput",
      "setupPlayerList",
      "roundKicker",
      "roundTitle",
      "timerValue",
      "promptText",
      "predictPanel",
      "playerSelect",
      "submissionStatus",
      "entryRows",
      "addRowButton",
      "normalizeButton",
      "submitPredictionButton",
      "probabilityTotal",
      "validationMessage",
      "revealPanel",
      "actualToken",
      "turnResultTable",
      "nextTurnButton",
      "finishedPanel",
      "winnerBanner",
      "finalTable",
      "playAgainButton",
      "scoreboardList"
    ].forEach(function (id) {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    elements.prefixShare.addEventListener("input", updatePrefixShare);
    elements.addPlayerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var name = elements.playerNameInput.value.trim();
      if (name) {
        addPlayer(name);
        elements.playerNameInput.value = "";
        renderSetupPlayers();
      }
    });
    elements.startGameButton.addEventListener("click", startGame);
    elements.resetSetupButton.addEventListener("click", resetSetup);
    elements.addRowButton.addEventListener("click", function () {
      appendEntryRow("", "");
      updateValidation();
    });
    elements.normalizeButton.addEventListener("click", normalizeRows);
    elements.submitPredictionButton.addEventListener("click", submitPrediction);
    elements.nextTurnButton.addEventListener("click", advanceAfterReveal);
    elements.playAgainButton.addEventListener("click", backToSetup);
    elements.entryRows.addEventListener("input", updateValidation);
    elements.entryRows.addEventListener("click", function (event) {
      if (event.target.classList.contains("remove-row-button")) {
        event.target.closest(".entry-row").remove();
        ensureAtLeastOneRow();
        updateValidation();
      }
    });
  }

  function updatePrefixShare() {
    elements.prefixShareValue.textContent = elements.prefixShare.value + "%";
  }

  function addPlayer(name) {
    var cleanName = name.replace(/\s+/g, " ").trim().slice(0, 24);
    if (!cleanName) {
      return;
    }
    state.players.push({
      id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: cleanName
    });
  }

  function removePlayer(playerId) {
    state.players = state.players.filter(function (player) {
      return player.id !== playerId;
    });
    renderSetupPlayers();
  }

  function renderSetupPlayers() {
    elements.setupPlayerList.innerHTML = "";
    state.players.forEach(function (player) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      var remove = document.createElement("button");
      name.className = "player-name";
      name.textContent = player.name;
      remove.className = "danger-button";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.disabled = state.players.length <= 1;
      remove.addEventListener("click", function () {
        removePlayer(player.id);
      });
      item.appendChild(name);
      item.appendChild(remove);
      elements.setupPlayerList.appendChild(item);
    });
  }

  function resetSetup() {
    elements.sentenceCount.value = "5";
    elements.turnSeconds.value = "30";
    elements.prefixShare.value = "55";
    updatePrefixShare();
    state.players = [];
    addPlayer("Player 1");
    addPlayer("Player 2");
    renderSetupPlayers();
  }

  function startGame() {
    var settings = readSettings();
    if (!settings) {
      return;
    }

    state.settings = settings;
    state.scores = {};
    state.players.forEach(function (player) {
      state.scores[player.id] = 0;
    });
    state.deck = buildDeck(settings.sentenceCount);
    state.sentenceIndex = 0;
    state.history = [];
    state.lastResult = null;
    elements.setupPanel.classList.add("is-hidden");
    elements.gamePanel.classList.remove("is-hidden");
    loadSentence(0);
  }

  function readSettings() {
    var sentenceCount = parseInt(elements.sentenceCount.value, 10);
    var turnSeconds = parseInt(elements.turnSeconds.value, 10);
    var prefixShare = parseInt(elements.prefixShare.value, 10);

    if (!Number.isFinite(sentenceCount) || sentenceCount < 1) {
      alert("Choose at least one sentence round.");
      return null;
    }
    if (!Number.isFinite(turnSeconds) || turnSeconds < 5) {
      alert("Choose at least five seconds per reveal.");
      return null;
    }
    if (state.players.length < 1) {
      alert("Add at least one player.");
      return null;
    }

    return {
      sentenceCount: Math.min(sentenceCount, window.ENTROPY_SENTENCES.length),
      turnSeconds: Math.min(turnSeconds, 180),
      prefixShare: Math.min(Math.max(prefixShare, 35), 75)
    };
  }

  function buildDeck(count) {
    return shuffle(window.ENTROPY_SENTENCES.slice()).slice(0, count).map(function (sentence) {
      return {
        topic: sentence.topic,
        text: sentence.text,
        tokens: tokenize(sentence.text)
      };
    }).filter(function (sentence) {
      return sentence.tokens.length >= 6;
    });
  }

  function loadSentence(index) {
    var sentence = state.deck[index];
    state.currentTokens = sentence.tokens;
    state.currentTokenIndex = choosePrefixLength(sentence.tokens, state.settings.prefixShare);
    beginPrediction();
  }

  function beginPrediction() {
    state.status = "predicting";
    state.submissions = {};
    state.lastResult = null;
    elements.predictPanel.classList.remove("is-hidden");
    elements.revealPanel.classList.add("is-hidden");
    elements.finishedPanel.classList.add("is-hidden");
    renderPlayerSelect();
    renderEntryRows(defaultRows());
    updateScoreboard();
    renderRound();
    startTimer();
  }

  function startTimer() {
    clearTimer();
    state.deadline = Date.now() + state.settings.turnSeconds * 1000;
    tickTimer();
    state.timerId = window.setInterval(tickTimer, 100);
  }

  function clearTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function tickTimer() {
    var remaining = Math.max(0, state.deadline - Date.now());
    elements.timerValue.textContent = (remaining / 1000).toFixed(1);
    if (remaining <= 0 && state.status === "predicting") {
      finishTurn();
    }
  }

  function renderRound() {
    var sentence = state.deck[state.sentenceIndex];
    var visiblePrefix = detokenize(state.currentTokens.slice(0, state.currentTokenIndex));
    elements.roundKicker.textContent = "Sentence " + (state.sentenceIndex + 1) + " of " + state.deck.length + " / " + sentence.topic;
    elements.roundTitle.textContent = "Assign probability to the next string";
    elements.promptText.textContent = visiblePrefix;
    renderSubmissionStatus();
    updateValidation();
  }

  function renderPlayerSelect() {
    var submittedIds = Object.keys(state.submissions);
    var activePlayers = state.players.filter(function (player) {
      return submittedIds.indexOf(player.id) === -1;
    });

    elements.playerSelect.innerHTML = "";
    activePlayers.forEach(function (player) {
      var option = document.createElement("option");
      option.value = player.id;
      option.textContent = player.name;
      elements.playerSelect.appendChild(option);
    });

    elements.submitPredictionButton.disabled = activePlayers.length === 0;
    elements.normalizeButton.disabled = activePlayers.length === 0;
    elements.addRowButton.disabled = activePlayers.length === 0;
  }

  function renderSubmissionStatus() {
    var submittedCount = Object.keys(state.submissions).length;
    elements.submissionStatus.textContent = submittedCount + " of " + state.players.length + " submitted";
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
    elements.entryRows.innerHTML = "";
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
    elements.entryRows.appendChild(row);
  }

  function ensureAtLeastOneRow() {
    if (!elements.entryRows.querySelector(".entry-row")) {
      appendEntryRow("", "");
    }
  }

  function collectRows(requireTotal) {
    var rowNodes = Array.prototype.slice.call(elements.entryRows.querySelectorAll(".entry-row"));
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
    if (!elements.entryRows) {
      return;
    }
    var result = collectRows(false);
    elements.probabilityTotal.textContent = formatNumber(result.total);
    elements.validationMessage.className = "";

    if (result.errors.length > 0) {
      elements.validationMessage.textContent = result.errors[0];
      elements.validationMessage.classList.add("is-error");
      return;
    }

    if (Math.abs(result.total - 1) <= 0.000001) {
      elements.validationMessage.textContent = "Ready";
      elements.validationMessage.classList.add("is-ok");
    } else {
      elements.validationMessage.textContent = "Total must be 1";
      elements.validationMessage.classList.add("is-error");
    }
  }

  function normalizeRows() {
    var rows = Array.prototype.slice.call(elements.entryRows.querySelectorAll(".entry-row"));
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
      elements.validationMessage.textContent = unique(errors)[0];
      elements.validationMessage.className = "is-error";
      return;
    }

    if (weightedRows.length === 0) {
      elements.validationMessage.textContent = "Enter at least one string.";
      elements.validationMessage.className = "is-error";
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

  function submitPrediction() {
    var playerId = elements.playerSelect.value;
    if (!playerId) {
      return;
    }
    var result = collectRows(true);
    if (result.errors.length > 0) {
      elements.validationMessage.textContent = result.errors[0];
      elements.validationMessage.className = "is-error";
      return;
    }

    state.submissions[playerId] = {
      distribution: result.distribution,
      submittedAt: Date.now()
    };

    renderPlayerSelect();
    renderSubmissionStatus();
    renderEntryRows(defaultRows());
    updateValidation();

    if (Object.keys(state.submissions).length === state.players.length) {
      finishTurn();
    }
  }

  function finishTurn() {
    if (state.status !== "predicting") {
      return;
    }
    clearTimer();
    state.status = "revealing";

    var actual = state.currentTokens[state.currentTokenIndex];
    var prompt = detokenize(state.currentTokens.slice(0, state.currentTokenIndex));
    var results = state.players.map(function (player) {
      var submission = state.submissions[player.id];
      var probability = submission ? submission.distribution[actual] || 0 : 0;
      var loss = probability > 0 ? Math.min(PENALTY, -Math.log(probability) / Math.log(LOG_BASE)) : PENALTY;
      return {
        playerId: player.id,
        playerName: player.name,
        probability: probability,
        loss: loss,
        cumulativeBefore: state.scores[player.id],
        submitted: Boolean(submission)
      };
    });

    state.lastResult = {
      sentenceIndex: state.sentenceIndex,
      prompt: prompt,
      actual: actual,
      results: results,
      applied: false
    };
    state.history.unshift(state.lastResult);
    state.history = state.history.slice(0, 8);

    elements.predictPanel.classList.add("is-hidden");
    elements.revealPanel.classList.remove("is-hidden");
    elements.actualToken.textContent = actual;
    renderTurnResults();
    updateScoreboard();
    elements.timerValue.textContent = "0.0";
  }

  function renderTurnResults() {
    var rows = [
      '<div class="result-row header"><span>Player</span><span>p(actual)</span><span>Round loss</span><span>New total score</span></div>'
    ];

    state.lastResult.results.slice().sort(function (a, b) {
      return a.loss - b.loss;
    }).forEach(function (result) {
      var lossClass = result.loss === 0 ? "round-loss is-zero" : "round-loss is-positive";
      var newTotal = result.cumulativeBefore + result.loss;
      rows.push(
        '<div class="result-row">' +
        '<span>' + escapeHtml(result.playerName) + (result.submitted ? "" : " (missed)") + '</span>' +
        '<span>' + formatProbability(result.probability) + '</span>' +
        '<span class="' + lossClass + '">' + formatNumber(result.loss) + '</span>' +
        '<span class="new-total-score">' + formatNumber(newTotal) + '</span>' +
        '</div>'
      );
    });

    elements.turnResultTable.innerHTML = rows.join("");
    elements.nextTurnButton.textContent = nextRevealActionText();
  }

  function advanceAfterReveal() {
    applyPendingLosses();
    state.currentTokenIndex += 1;
    if (shouldEndSentence()) {
      state.sentenceIndex += 1;
      if (state.sentenceIndex >= state.deck.length) {
        finishGame();
      } else {
        loadSentence(state.sentenceIndex);
      }
    } else {
      beginPrediction();
    }
  }

  function applyPendingLosses() {
    if (!state.lastResult || state.lastResult.applied) {
      return;
    }

    state.lastResult.results.forEach(function (result) {
      state.scores[result.playerId] += result.loss;
      result.cumulativeAfter = state.scores[result.playerId];
    });
    state.lastResult.applied = true;
    updateScoreboard();
  }

  function shouldAdvanceSentence() {
    var actual = state.lastResult ? state.lastResult.actual : "";
    return ENDING_TOKENS[actual] || state.currentTokenIndex + 1 >= state.currentTokens.length;
  }

  function nextRevealActionText() {
    if (!shouldAdvanceSentence()) {
      return "Add Losses and Next String";
    }
    return state.sentenceIndex + 1 >= state.deck.length ? "Add Losses and Show Final Scores" : "Add Losses and Next Sentence";
  }

  function shouldEndSentence() {
    var previousToken = state.currentTokens[state.currentTokenIndex - 1];
    return ENDING_TOKENS[previousToken] || state.currentTokenIndex >= state.currentTokens.length;
  }

  function finishGame() {
    state.status = "finished";
    clearTimer();
    elements.predictPanel.classList.add("is-hidden");
    elements.revealPanel.classList.add("is-hidden");
    elements.finishedPanel.classList.remove("is-hidden");
    elements.roundKicker.textContent = "Game complete";
    elements.roundTitle.textContent = "Final scores";
    elements.promptText.textContent = "All selected math statements have ended.";
    elements.timerValue.textContent = "0.0";
    updateScoreboard();
    renderFinalTable();
  }

  function renderFinalTable() {
    var ranked = rankedPlayers();
    renderWinnerBanner(ranked);
    var rows = [
      '<div class="result-row header"><span>Rank</span><span>Player</span><span></span><span>Total</span></div>'
    ];
    ranked.forEach(function (entry, index) {
      rows.push(
        '<div class="result-row">' +
        '<span>' + (index + 1) + '</span>' +
        '<span>' + escapeHtml(entry.player.name) + '</span>' +
        '<span></span>' +
        '<span>' + formatNumber(entry.score) + '</span>' +
        '</div>'
      );
    });
    elements.finalTable.innerHTML = rows.join("");
  }

  function renderWinnerBanner(ranked) {
    if (!ranked.length) {
      elements.winnerBanner.innerHTML = "";
      return;
    }

    var bestScore = ranked[0].score;
    var winners = ranked.filter(function (entry) {
      return Math.abs(entry.score - bestScore) <= 0.000000001;
    });
    var label = winners.length === 1 ? "Winner" : "Winners";
    var names = joinEscapedNames(winners.map(function (entry) {
      return escapeHtml(entry.player.name);
    }));

    elements.winnerBanner.innerHTML =
      '<div class="winner-crown" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<div class="winner-copy">' +
      '<div class="winner-label">' + label + '</div>' +
      '<div class="winner-name">' + names + '</div>' +
      '<div class="winner-score">Final loss ' + formatNumber(bestScore) + '</div>' +
      '</div>';
  }

  function backToSetup() {
    state.status = "setup";
    clearTimer();
    elements.gamePanel.classList.add("is-hidden");
    elements.setupPanel.classList.remove("is-hidden");
    renderSetupPlayers();
  }

  function updateScoreboard() {
    var ranked = rankedPlayers();
    elements.scoreboardList.innerHTML = "";
    ranked.forEach(function (entry, index) {
      var item = document.createElement("li");
      var name = document.createElement("span");
      var score = document.createElement("span");
      name.className = "score-name";
      score.className = "score-value";
      name.textContent = (index + 1) + ". " + entry.player.name;
      score.textContent = formatNumber(entry.score);
      item.appendChild(name);
      item.appendChild(score);
      elements.scoreboardList.appendChild(item);
    });
  }

  function rankedPlayers() {
    return state.players.map(function (player) {
      return {
        player: player,
        score: state.scores[player.id] || 0
      };
    }).sort(function (a, b) {
      return a.score - b.score || a.player.name.localeCompare(b.player.name);
    });
  }

  function tokenize(text) {
    return text.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*|\d+(?:\.\d+)?|[.,!?;:()]/g) || [];
  }

  function detokenize(tokens) {
    var text = "";
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
    var minPrefix = Math.min(6, Math.max(2, tokens.length - 3));
    var maxPrefix = Math.max(minPrefix, tokens.length - 2);
    var proposed = Math.floor(tokens.length * prefixShare / 100);
    var index = Math.min(Math.max(proposed, minPrefix), maxPrefix);

    while (index > minPrefix && PUNCTUATION[tokens[index]]) {
      index -= 1;
    }
    return index;
  }

  function shuffle(items) {
    for (var index = items.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(Math.random() * (index + 1));
      var temp = items[index];
      items[index] = items[swapIndex];
      items[swapIndex] = temp;
    }
    return items;
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

  function shorten(text, length) {
    if (text.length <= length) {
      return text;
    }
    return text.slice(0, length - 3) + "...";
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
