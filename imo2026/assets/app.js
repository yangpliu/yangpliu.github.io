(function () {
  "use strict";

  const payload = window.IMO2026_DATA;
  const content = document.getElementById("results-content");

  if (!payload || !content) {
    if (content) {
      content.innerHTML = '<p class="empty-state">The results data could not be loaded.</p>';
    }
    return;
  }

  const awardNames = {
    1: "Gold medal",
    2: "Silver medal",
    3: "Bronze medal",
    4: "Honourable mention",
    0: "No award",
  };

  const contestants = payload.contestants.map((row, sourceIndex) => ({
    givenName: row[0],
    familyName: row[1],
    code: row[2],
    scores: row.slice(3, 9),
    total: row[9],
    award: row[10],
    sourceIndex,
  }));

  const rankedContestants = contestants
    .slice()
    .sort((a, b) => b.total - a.total || a.sourceIndex - b.sourceIndex);

  rankedContestants.forEach((contestant, index) => {
    contestant.rank = index === 0 || contestant.total !== rankedContestants[index - 1].total
      ? index + 1
      : rankedContestants[index - 1].rank;
  });

  const teamsByCode = new Map();
  rankedContestants.forEach((contestant) => {
    if (!teamsByCode.has(contestant.code)) {
      teamsByCode.set(contestant.code, {
        code: contestant.code,
        country: countryName(contestant.code),
        members: [],
        scores: [0, 0, 0, 0, 0, 0],
        total: 0,
        awards: [0, 0, 0, 0, 0],
      });
    }

    const team = teamsByCode.get(contestant.code);
    team.members.push(contestant);
    team.total += contestant.total;
    contestant.scores.forEach((score, index) => {
      team.scores[index] += score;
    });
    if (contestant.award) {
      team.awards[contestant.award] += 1;
    }
  });

  const teams = Array.from(teamsByCode.values())
    .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));

  teams.forEach((team, index) => {
    team.rank = index === 0 || team.total !== teams[index - 1].total
      ? index + 1
      : teams[index - 1].rank;
  });

  setupMenu();

  const view = document.body.dataset.view;
  if (view === "individual") {
    renderIndividualResults();
  } else if (view === "team") {
    renderTeamView();
  } else if (view === "statistics") {
    renderStatistics();
  }

  function setupMenu() {
    const header = document.querySelector(".site-header");
    const button = document.querySelector(".menu-toggle");
    if (!header || !button) return;

    button.addEventListener("click", () => {
      const open = header.classList.toggle("menu-open");
      button.setAttribute("aria-expanded", String(open));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && header.classList.contains("menu-open")) {
        header.classList.remove("menu-open");
        button.setAttribute("aria-expanded", "false");
        button.focus();
      }
    });
  }

  function countryName(code) {
    return payload.countries[code] || code;
  }

  function fullName(contestant) {
    return `${contestant.givenName} ${contestant.familyName}`.replace(/\s+/g, " ").trim();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[character]);
  }

  function awardMarkup(code) {
    if (code === 1) {
      return '<span class="medal medal-gold" title="Gold medal" aria-label="Gold medal">G</span>';
    }
    if (code === 2) {
      return '<span class="medal medal-silver" title="Silver medal" aria-label="Silver medal">S</span>';
    }
    if (code === 3) {
      return '<span class="medal medal-bronze" title="Bronze medal" aria-label="Bronze medal">B</span>';
    }
    if (code === 4) {
      return '<span class="honourable-mention" title="Honourable mention">HM</span>';
    }
    return '<span aria-label="No award">—</span>';
  }

  function sortHeader(key, label, className) {
    const classes = className ? ` class="${className}"` : "";
    return `<th scope="col" data-key="${key}" aria-sort="none"${classes}><button class="sort-button" type="button" data-sort="${key}">${label}<span class="sr-only">, sort column</span></button></th>`;
  }

  function compareValues(left, right) {
    if (typeof left === "string" || typeof right === "string") {
      return String(left).localeCompare(String(right), undefined, { sensitivity: "base" });
    }
    return left - right;
  }

  function installSortableTable(options) {
    const table = options.table;
    const count = options.count;
    const input = options.input;
    const clearButton = options.clearButton;
    const state = {
      key: options.defaultKey,
      direction: options.defaultDirection,
      query: "",
    };

    function update() {
      const query = state.query.trim().toLocaleLowerCase();
      const visibleRows = query
        ? options.rows.filter((row) => options.searchText(row).toLocaleLowerCase().includes(query))
        : options.rows.slice();

      const accessor = options.accessors[state.key];
      visibleRows.sort((a, b) => {
        const comparison = compareValues(accessor(a), accessor(b));
        if (comparison !== 0) {
          return state.direction === "asc" ? comparison : -comparison;
        }
        return options.stableOrder(a) - options.stableOrder(b);
      });

      table.querySelectorAll("thead th[data-key]").forEach((header) => {
        const selected = header.dataset.key === state.key;
        header.setAttribute("aria-sort", selected
          ? (state.direction === "asc" ? "ascending" : "descending")
          : "none");
      });

      options.renderRows(visibleRows);
      count.textContent = query
        ? `Showing ${visibleRows.length} of ${options.rows.length} ${options.noun}`
        : `${options.rows.length} ${options.noun}`;
      clearButton.classList.toggle("visible", Boolean(state.query));
    }

    table.querySelectorAll("button[data-sort]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.sort;
        if (state.key === key) {
          state.direction = state.direction === "asc" ? "desc" : "asc";
        } else {
          state.key = key;
          state.direction = "asc";
        }
        update();
      });
    });

    input.addEventListener("input", () => {
      state.query = input.value;
      update();
    });

    clearButton.addEventListener("click", () => {
      input.value = "";
      state.query = "";
      input.focus();
      update();
    });

    update();
  }

  function renderIndividualResults() {
    content.innerHTML = `
      <div class="table-toolbar">
        <p class="table-meta" id="result-count" aria-live="polite">${rankedContestants.length} contestants</p>
        <label class="search-field">
          <span class="sr-only">Search contestants or countries</span>
          <input id="result-search" type="search" placeholder="Search contestant or country" autocomplete="off">
          <button class="clear-search" type="button" title="Clear search" aria-label="Clear search">×</button>
        </label>
      </div>
      <div class="table-scroll">
        <table class="result-table" id="individual-table">
          <caption class="sr-only">Individual results for all 666 IMO 2026 contestants</caption>
          <thead>
            <tr>
              ${sortHeader("name", "Contestant", "text-left")}
              ${sortHeader("country", "Country", "text-left")}
              ${sortHeader("rank", "Rank")}
              ${sortHeader("award", "Award")}
              ${sortHeader("total", "Points")}
              ${[0, 1, 2, 3, 4, 5].map((index) => sortHeader(`p${index}`, `P${index + 1}`)).join("")}
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    const table = document.getElementById("individual-table");
    const tbody = table.querySelector("tbody");
    const accessors = {
      name: fullName,
      country: (row) => countryName(row.code),
      rank: (row) => row.rank,
      award: (row) => row.award || 99,
      total: (row) => row.total,
    };
    [0, 1, 2, 3, 4, 5].forEach((index) => {
      accessors[`p${index}`] = (row) => row.scores[index];
    });

    installSortableTable({
      table,
      count: document.getElementById("result-count"),
      input: document.getElementById("result-search"),
      clearButton: content.querySelector(".clear-search"),
      rows: rankedContestants,
      noun: "contestants",
      defaultKey: "total",
      defaultDirection: "desc",
      accessors,
      stableOrder: (row) => row.sourceIndex,
      searchText: (row) => [
        fullName(row),
        countryName(row.code),
        row.code,
        row.rank,
        awardNames[row.award],
        row.total,
        ...row.scores,
      ].join(" "),
      renderRows: (rows) => {
        if (!rows.length) {
          tbody.innerHTML = '<tr><td class="empty-state" colspan="11">No contestants match that search.</td></tr>';
          return;
        }
        tbody.innerHTML = rows.map((row) => `
          <tr>
            <td class="text-left primary-cell">${escapeHtml(fullName(row))}</td>
            <td class="text-left">${escapeHtml(countryName(row.code))}<span class="country-code">${escapeHtml(row.code)}</span></td>
            <td>${row.rank}</td>
            <td>${awardMarkup(row.award)}</td>
            <td><strong>${row.total}</strong></td>
            ${row.scores.map((score) => `<td>${score}</td>`).join("")}
          </tr>
        `).join("");
      },
    });
  }

  function renderTeamView() {
    const requestedCode = (new URLSearchParams(window.location.search).get("code") || "").toUpperCase();
    if (requestedCode) {
      renderTeamDetail(requestedCode);
    } else {
      renderTeamResults();
    }
  }

  function renderTeamResults() {
    content.innerHTML = `
      <div class="table-toolbar">
        <p class="table-meta" id="result-count" aria-live="polite">${teams.length} teams</p>
        <label class="search-field">
          <span class="sr-only">Search teams</span>
          <input id="result-search" type="search" placeholder="Search country or code" autocomplete="off">
          <button class="clear-search" type="button" title="Clear search" aria-label="Clear search">×</button>
        </label>
      </div>
      <div class="table-scroll">
        <table class="result-table" id="team-table">
          <caption class="sr-only">Team results for all 117 teams at IMO 2026</caption>
          <thead>
            <tr>
              ${sortHeader("country", "Country", "text-left")}
              ${sortHeader("rank", "Rank")}
              ${sortHeader("total", "Points")}
              ${[0, 1, 2, 3, 4, 5].map((index) => sortHeader(`p${index}`, `P${index + 1}`)).join("")}
              ${sortHeader("gold", '<span class="medal medal-gold" aria-label="Gold medals">G</span>')}
              ${sortHeader("silver", '<span class="medal medal-silver" aria-label="Silver medals">S</span>')}
              ${sortHeader("bronze", '<span class="medal medal-bronze" aria-label="Bronze medals">B</span>')}
              ${sortHeader("hm", "HM")}
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="authority-note">The listed team scores are sums of the official individual results. Team rankings are informational, following the convention used by IMO result archives.</p>
    `;

    const table = document.getElementById("team-table");
    const tbody = table.querySelector("tbody");
    const accessors = {
      country: (row) => row.country,
      rank: (row) => row.rank,
      total: (row) => row.total,
      gold: (row) => row.awards[1],
      silver: (row) => row.awards[2],
      bronze: (row) => row.awards[3],
      hm: (row) => row.awards[4],
    };
    [0, 1, 2, 3, 4, 5].forEach((index) => {
      accessors[`p${index}`] = (row) => row.scores[index];
    });

    installSortableTable({
      table,
      count: document.getElementById("result-count"),
      input: document.getElementById("result-search"),
      clearButton: content.querySelector(".clear-search"),
      rows: teams,
      noun: "teams",
      defaultKey: "total",
      defaultDirection: "desc",
      accessors,
      stableOrder: (row) => teams.indexOf(row),
      searchText: (row) => `${row.country} ${row.code} ${row.rank} ${row.total}`,
      renderRows: (rows) => {
        if (!rows.length) {
          tbody.innerHTML = '<tr><td class="empty-state" colspan="13">No teams match that search.</td></tr>';
          return;
        }
        tbody.innerHTML = rows.map((row) => `
          <tr>
            <td class="text-left primary-cell"><a class="country-link" href="team.html?code=${encodeURIComponent(row.code)}">${escapeHtml(row.country)}<span class="country-code">${escapeHtml(row.code)}</span></a></td>
            <td>${row.rank}</td>
            <td><strong>${row.total}</strong></td>
            ${row.scores.map((score) => `<td>${score}</td>`).join("")}
            <td>${row.awards[1]}</td>
            <td>${row.awards[2]}</td>
            <td>${row.awards[3]}</td>
            <td>${row.awards[4]}</td>
          </tr>
        `).join("");
      },
    });
  }

  function renderTeamDetail(code) {
    const team = teamsByCode.get(code);
    if (!team) {
      content.innerHTML = `
        <a class="back-link" href="team.html">All team results</a>
        <div class="empty-state">
          <strong>Team not found.</strong><br>
          There is no IMO 2026 team with code “${escapeHtml(code)}”.
        </div>
      `;
      return;
    }

    const breadcrumb = document.getElementById("breadcrumb-current");
    const heading = document.getElementById("page-title");
    const subtitle = document.getElementById("page-subtitle");
    if (breadcrumb) breadcrumb.textContent = `${team.country} Team`;
    if (heading) heading.textContent = `${team.country} — IMO 2026`;
    if (subtitle) subtitle.textContent = `Shanghai, China · ${team.members.length} ${team.members.length === 1 ? "contestant" : "contestants"}`;
    document.title = `${team.country} Team — IMO 2026`;

    const members = team.members
      .slice()
      .sort((a, b) => b.total - a.total || a.sourceIndex - b.sourceIndex);
    const rosterNote = team.members.length === 6
      ? "The six contestants are sorted by total points; global ranks are retained."
      : `This official roster contains ${team.members.length} contestants; no placeholder contestants have been added.`;

    content.innerHTML = `
      <a class="back-link" href="team.html">All team results</a>
      <div class="team-detail-heading" id="team-detail">
        <div>
          <h3>${escapeHtml(team.country)} team</h3>
          <p>${escapeHtml(rosterNote)}</p>
        </div>
        <span class="team-code-badge">${escapeHtml(team.code)}</span>
      </div>
      <div class="summary-grid" aria-label="Team summary">
        <div class="summary-card"><span>Team rank</span><strong>${team.rank}</strong></div>
        <div class="summary-card"><span>Points</span><strong>${team.total}</strong></div>
        <div class="summary-card"><span>Team size</span><strong>${team.members.length}</strong></div>
        <div class="summary-card"><span>Awards</span><strong class="award-counts">${team.awards[1]} G · ${team.awards[2]} S · ${team.awards[3]} B · ${team.awards[4]} HM</strong></div>
      </div>
      <h4 class="detail-table-title">Contestants</h4>
      <div class="table-scroll">
        <table class="result-table">
          <caption class="sr-only">Contestants representing ${escapeHtml(team.country)} at IMO 2026</caption>
          <thead>
            <tr>
              <th scope="col" class="text-left">Contestant</th>
              <th scope="col">Rank</th>
              <th scope="col">%</th>
              <th scope="col">Award</th>
              <th scope="col">Points</th>
              ${[1, 2, 3, 4, 5, 6].map((problem) => `<th scope="col">P${problem}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${members.map((member) => `
              <tr>
                <td class="text-left primary-cell">${escapeHtml(fullName(member))}</td>
                <td>${member.rank}</td>
                <td>${percentile(member.rank)}%</td>
                <td>${awardMarkup(member.award)}</td>
                <td><strong>${member.total}</strong></td>
                ${member.scores.map((score) => `<td>${score}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td class="text-left primary-cell">Team results</td>
              <td>${team.rank}</td>
              <td>—</td>
              <td><span class="honourable-mention" title="Gold, silver, bronze, honourable mention">${team.awards[1]}/${team.awards[2]}/${team.awards[3]}/${team.awards[4]}</span></td>
              <td><strong>${team.total}</strong></td>
              ${team.scores.map((score) => `<td><strong>${score}</strong></td>`).join("")}
            </tr>
          </tfoot>
        </table>
      </div>
      <p class="detail-footnote">Percentile follows the IMO archive convention: (666 − global rank) ÷ 665, rounded to one decimal.</p>
    `;
  }

  function percentile(rank) {
    return (((rankedContestants.length - rank) / (rankedContestants.length - 1)) * 100).toFixed(1);
  }

  function mean(values) {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function populationStandardDeviation(values) {
    const average = mean(values);
    return Math.sqrt(values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length);
  }

  function correlation(left, right) {
    const leftMean = mean(left);
    const rightMean = mean(right);
    let numerator = 0;
    let leftSquares = 0;
    let rightSquares = 0;

    for (let index = 0; index < left.length; index += 1) {
      const leftDelta = left[index] - leftMean;
      const rightDelta = right[index] - rightMean;
      numerator += leftDelta * rightDelta;
      leftSquares += leftDelta ** 2;
      rightSquares += rightDelta ** 2;
    }

    return numerator / Math.sqrt(leftSquares * rightSquares);
  }

  function fixed(value) {
    return Number(value).toFixed(3);
  }

  function renderStatistics() {
    const problemColumns = [0, 1, 2, 3, 4, 5].map((problem) => rankedContestants.map((row) => row.scores[problem]));
    const totals = rankedContestants.map((row) => row.total);
    const totalMean = mean(totals);
    const perfectScores = totals.filter((total) => total === 42).length;
    const awardCounts = [0, 0, 0, 0, 0];
    rankedContestants.forEach((row) => { awardCounts[row.award] += 1; });
    const totalFrequencies = Array.from({ length: 43 }, (_, score) => totals.filter((total) => total === score).length);
    const maxFrequency = Math.max(...totalFrequencies);

    const scoreCountRows = Array.from({ length: 8 }, (_, score) => ({
      label: `Num( P# = ${score} )`,
      values: problemColumns.map((values) => values.filter((value) => value === score).length),
    }));
    const statisticRows = [
      ...scoreCountRows,
      { label: "Mean( P# )", values: problemColumns.map(mean), format: fixed },
      { label: "Max( P# )", values: problemColumns.map((values) => Math.max(...values)) },
      { label: "σ( P# )", values: problemColumns.map(populationStandardDeviation), format: fixed },
      { label: "Corr( P#, Sum )", values: problemColumns.map((values) => correlation(values, totals)), format: fixed },
    ];

    content.innerHTML = `
      <section class="stats-section" aria-labelledby="overview-title">
        <h3 id="overview-title">Results overview</h3>
        <p class="stats-intro">A compact summary of participation and scoring across the official result set.</p>
        <div class="overview-grid">
          <div class="overview-card"><span>Contestants</span><strong>${rankedContestants.length}</strong><small>from ${teams.length} teams</small></div>
          <div class="overview-card"><span>Mean total</span><strong>${fixed(totalMean)}</strong><small>${fixed((totalMean / 42) * 100)}% of 42 points</small></div>
          <div class="overview-card"><span>Perfect scores</span><strong>${perfectScores}</strong><small>42 out of 42 points</small></div>
          <div class="overview-card"><span>Median total</span><strong>${median(totals)}</strong><small>official scores, all contestants</small></div>
        </div>
      </section>

      <section class="stats-section" aria-labelledby="awards-title">
        <h3 id="awards-title">Awards</h3>
        <p class="stats-intro">The medal cutoffs and award counts recorded in the official results.</p>
        <div class="award-grid">
          <div class="award-card gold"><span>Gold</span><strong>${awardCounts[1]}</strong><small>29 points or more</small></div>
          <div class="award-card silver"><span>Silver</span><strong>${awardCounts[2]}</strong><small>23–28 points</small></div>
          <div class="award-card bronze"><span>Bronze</span><strong>${awardCounts[3]}</strong><small>16–22 points</small></div>
          <div class="award-card hm"><span>Hon. mention</span><strong>${awardCounts[4]}</strong><small>Non-medallist with a 7</small></div>
          <div class="award-card"><span>No award</span><strong>${awardCounts[0]}</strong><small>Official result classification</small></div>
        </div>
      </section>

      <section class="stats-section" aria-labelledby="distribution-title">
        <h3 id="distribution-title">Point distribution</h3>
        <p class="stats-intro">Number of contestants receiving each total score from 0 to 42. Hover or focus a bar for its exact count.</p>
        <div class="distribution-scroll">
          <div class="distribution-chart" role="img" aria-label="Distribution of total scores from 0 to 42">
            ${totalFrequencies.map((frequency, score) => `
              <span class="distribution-bar" tabindex="0" aria-label="${score} points: ${frequency} contestants">
                <span class="distribution-bar-value" aria-hidden="true">${score}: ${frequency}</span>
                <span class="distribution-bar-fill" style="height: ${(frequency / maxFrequency) * 100}%"></span>
                <span class="distribution-bar-label" aria-hidden="true">${score}</span>
              </span>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="stats-section" aria-labelledby="problem-stats-title">
        <h3 id="problem-stats-title">Problem statistics</h3>
        <p class="stats-intro">Score frequencies and summary statistics in the format traditionally used by the official IMO archive.</p>
        <div class="table-scroll">
          <table class="stats-table">
            <caption>Statistics for all ${rankedContestants.length} contestants</caption>
            <thead><tr><th scope="col" class="text-left">Statistic</th>${[1, 2, 3, 4, 5, 6].map((problem) => `<th scope="col">P${problem}</th>`).join("")}</tr></thead>
            <tbody>
              ${statisticRows.map((row) => `<tr><th scope="row">${row.label}</th>${row.values.map((value) => `<td>${row.format ? row.format(value) : value}</td>`).join("")}</tr>`).join("")}
            </tbody>
          </table>
        </div>
        <p class="method-note">σ is the population standard deviation. Correlations are Pearson product-moment correlations, rounded to three decimal places.</p>
      </section>

      <section class="stats-section" aria-labelledby="correlation-title">
        <h3 id="correlation-title">Problem correlation matrix</h3>
        <p class="stats-intro">Pairwise Pearson correlations between problem scores.</p>
        <div class="table-scroll">
          <table class="stats-table">
            <caption>Pairwise problem-score correlations</caption>
            <thead><tr><th scope="col" class="text-left">Problem</th>${[1, 2, 3, 4, 5, 6].map((problem) => `<th scope="col">P${problem}</th>`).join("")}</tr></thead>
            <tbody>
              ${problemColumns.map((values, rowIndex) => `
                <tr>
                  <th scope="row">Corr( P#, P${rowIndex + 1} )</th>
                  ${problemColumns.map((otherValues, columnIndex) => `<td>${rowIndex === columnIndex ? "—" : fixed(correlation(values, otherValues))}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = sorted.length / 2;
    return sorted.length % 2
      ? sorted[Math.floor(middle)]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  }
})();
