class ClubChrono {
  controlsSelector = '[data-club-chrono-controls="true"]';
  requestDelayMs = 300;
  maxRetries = 5;

  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  getRetryAfterMs = (response, attempt) => {
    const retryAfterHeader = response.headers.get("Retry-After");

    if (retryAfterHeader) {
      const seconds = Number(retryAfterHeader);

      if (!Number.isNaN(seconds)) {
        return seconds * 1000;
      }

      const retryDate = new Date(retryAfterHeader);

      if (!Number.isNaN(retryDate.getTime())) {
        return Math.max(0, retryDate.getTime() - Date.now());
      }
    }

    return Math.min(1000 * 2 ** attempt, 10000);
  }

  fetchWithThrottle = async (url, options = {}) => {
    await this.sleep(this.requestDelayMs);

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const response = await fetch(url, options);

      if (response.status !== 429 || attempt === this.maxRetries) {
        return response;
      }

      await this.sleep(this.getRetryAfterMs(response, attempt));
    }
  }

  normalizeText = (value) => {
    return (value ?? "").replace(/\s+/g, " ").trim();
  }

  getRegistrationTable = (root = document) => {
    const tables = Array.from(root.querySelectorAll("table"));
    let bestTable = undefined;
    let bestAthleteCount = 0;

    for (const table of tables) {
      const athleteCount = table.querySelectorAll('a[href*="/atleet/main/"]').length;

      if (athleteCount > bestAthleteCount) {
        bestTable = table;
        bestAthleteCount = athleteCount;
      }
    }

    if (!bestTable || bestAthleteCount === 0) {
      return undefined;
    }

    return bestTable;
  }

  getHeaderTexts = (table) => {
    const headerCells = Array.from(table.querySelectorAll("thead th"));

    if (headerCells.length > 0) {
      return headerCells.map((cell) => this.normalizeText(cell.textContent).toLowerCase());
    }

    const firstRow = table.querySelector("tr");

    if (!firstRow) {
      return [];
    }

    return Array.from(firstRow.children).map((cell) => this.normalizeText(cell.textContent).toLowerCase());
  }

  getColumnIndex = (headers, patterns) => {
    return headers.findIndex((headerText) => {
      return patterns.some((pattern) => pattern.test(headerText));
    });
  }

  getBodyRows = (table) => {
    const bodyRows = Array.from(table.querySelectorAll("tbody tr"));

    if (bodyRows.length > 0) {
      return bodyRows;
    }

    const rows = Array.from(table.querySelectorAll("tr"));
    return rows.slice(1);
  }

  extractClubName = (row, clubColumnIndex) => {
    const cells = Array.from(row.children);

    if (clubColumnIndex >= 0 && cells[clubColumnIndex]) {
      return this.normalizeText(cells[clubColumnIndex].textContent);
    }

    const clubLink = row.querySelector('a[href*="/vereniging/"], a[href*="/club/"]');

    if (clubLink) {
      return this.normalizeText(clubLink.textContent);
    }

    return "";
  }

  getClubEntries = (table) => {
    const headers = this.getHeaderTexts(table);
    const clubColumnIndex = this.getColumnIndex(headers, [/vereniging/i, /club/i]);
    const rows = this.getBodyRows(table);
    const clubs = new Map();

    for (const row of rows) {
      const athleteLink = row.querySelector('a[href*="/atleet/main/"]');

      if (!athleteLink) {
        continue;
      }

      const clubName = this.extractClubName(row, clubColumnIndex);

      if (!clubName) {
        continue;
      }

      const athleteUrl = new URL(athleteLink.getAttribute("href"), window.location.origin).toString();
      if (!clubs.has(clubName)) {
        clubs.set(clubName, new Map());
      }

      clubs.get(clubName).set(athleteUrl, this.normalizeText(athleteLink.textContent));
    }

    return clubs;
  }

  mergeClubEntries = (targetEntries, sourceEntries) => {
    for (const [clubName, athleteMap] of sourceEntries.entries()) {
      if (!targetEntries.has(clubName)) {
        targetEntries.set(clubName, new Map());
      }

      const targetAthletes = targetEntries.get(clubName);

      for (const [athleteUrl, athleteName] of athleteMap.entries()) {
        targetAthletes.set(athleteUrl, athleteName);
      }
    }

    return targetEntries;
  }

  getClubEntriesFromRoot = (root) => {
    const registrationTable = this.getRegistrationTable(root);

    if (!registrationTable) {
      return new Map();
    }

    return this.getClubEntries(registrationTable);
  }

  getPaginationUrls = (root) => {
    const paginationContainers = root.querySelectorAll('.dataTables_paginate, .pagination, ul.pagination, nav[aria-label*="pagination" i]');
    const paginationUrls = new Set();
    const basePath = window.location.pathname;

    for (const container of paginationContainers) {
      const links = container.querySelectorAll('a[href]');

      for (const link of links) {
        const href = link.getAttribute("href");

        if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
          continue;
        }

        const url = new URL(href, window.location.origin);

        if (url.pathname !== basePath) {
          continue;
        }

        if (!url.searchParams.has("page") && !url.searchParams.has("start") && !url.searchParams.has("p")) {
          continue;
        }

        paginationUrls.add(url.toString());
      }
    }

    return Array.from(paginationUrls);
  }

  fetchDocument = async (url) => {
    const response = await this.fetchWithThrottle(url, {
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Ophalen mislukt voor ${url} (HTTP ${response.status})`);
    }

    const htmlText = await response.text();
    const parser = new DOMParser();
    return parser.parseFromString(htmlText, "text/html");
  }

  collectClubEntries = async () => {
    const mergedEntries = this.getClubEntriesFromRoot(document);
    const visitedUrls = new Set([window.location.href]);
    const paginationUrls = new Set();

    const currentDocument = await this.fetchDocument(window.location.href);
    this.mergeClubEntries(mergedEntries, this.getClubEntriesFromRoot(currentDocument));

    for (const url of this.getPaginationUrls(document)) {
      paginationUrls.add(url);
    }

    for (const url of this.getPaginationUrls(currentDocument)) {
      paginationUrls.add(url);
    }

    for (const paginationUrl of paginationUrls) {
      if (visitedUrls.has(paginationUrl)) {
        continue;
      }

      visitedUrls.add(paginationUrl);

      const pageDocument = await this.fetchDocument(paginationUrl);
      this.mergeClubEntries(mergedEntries, this.getClubEntriesFromRoot(pageDocument));
    }

    return mergedEntries;
  }

  updateClubSelect = (select, clubEntries, selectedClubName) => {
    select.innerHTML = "";

    const clubNames = Array.from(clubEntries.keys()).sort((left, right) => left.localeCompare(right));

    for (const clubName of clubNames) {
      const option = document.createElement("option");
      option.value = clubName;
      option.textContent = clubName;
      select.appendChild(option);
    }

    if (selectedClubName && clubEntries.has(selectedClubName)) {
      select.value = selectedClubName;
    }
  }

  getAthleteEntriesForClub = (clubEntries, clubName) => {
    return Array.from(clubEntries.get(clubName)?.entries() ?? []).map(([url, name]) => {
      return { url, name };
    });
  }

  createButton = (label) => {
    const button = document.createElement("a");
    button.className = "btn btn-greenhover";
    button.href = "#";
    button.textContent = label;

    return button;
  }

  createChronoEntryKey = (timeText, eventText) => {
    return `${timeText}__${eventText}`;
  }

  isFinalEvent = (eventCell) => {
    const eventSources = [
      eventCell.textContent,
      eventCell.innerHTML,
      ...Array.from(eventCell.querySelectorAll("a")).map((link) => link.getAttribute("href") ?? "")
    ];

    return eventSources.some((source) => /_(?:hf|f)(?=$|[^a-z])/i.test(source));
  }

  parseAthleteChronoRows = (htmlText, athleteName, includeFinals = false) => {
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(htmlText, "text/html");
    const chronoTable = htmlDocument.getElementById("chronoloog_1") ?? htmlDocument.querySelector("table.chronoloogtabel");

    if (!chronoTable) {
      return [];
    }

    const chronoClone = chronoTable.cloneNode(true);
    const tableHead = chronoClone.querySelector("thead");
    tableHead && tableHead.remove();

    const rows = chronoClone.getElementsByTagName("tr");

    for (const row of rows) {
      const athletesButton = row.children[3];
      athletesButton && athletesButton.remove();
    }

    const tableBody = chronoClone.querySelector("tbody");

    if (!tableBody) {
      return [];
    }

    return Array.from(tableBody.querySelectorAll("tr")).map((row) => {
      const cells = Array.from(row.children);
      const timeCell = cells[0];
      const eventCell = cells[cells.length - 1];

      if (!timeCell || !eventCell) {
        return undefined;
      }

      if (!includeFinals && this.isFinalEvent(eventCell)) {
        return undefined;
      }

      return {
        key: this.createChronoEntryKey(this.normalizeText(timeCell.textContent), this.normalizeText(eventCell.textContent)),
        timeHtml: timeCell.innerHTML,
        eventHtml: eventCell.innerHTML,
        categoryCode: this.normalizeText(cells[1]?.querySelector(".visible-xs-inline")?.textContent ?? cells[1]?.textContent),
        eventCode: this.normalizeText(eventCell.querySelector(".visible-xs-inline")?.textContent ?? eventCell.textContent),
        athleteName
      };
    }).filter((entry) => entry);
  }

  getCompetitionChronoUrl = () => {
    const competitionMatch = window.location.pathname.match(/\/wedstrijd\/atleten\/(\d+)\/?$/);

    if (!competitionMatch) {
      return undefined;
    }

    return new URL(`/wedstrijd/chronoloog/${competitionMatch[1]}/`, window.location.origin).toString();
  }

  parseFinalChronoRows = (htmlText) => {
    const parser = new DOMParser();
    const htmlDocument = parser.parseFromString(htmlText, "text/html");
    const chronoTable = htmlDocument.getElementById("chronoloog_1") ?? htmlDocument.querySelector("table.chronoloogtabel");

    if (!chronoTable) {
      return [];
    }

    return Array.from(chronoTable.querySelectorAll("tbody tr")).map((row) => {
      const cells = Array.from(row.children);
      const timeCell = cells[0];
      const eventCell = cells.find((cell) => {
        const eventCode = cell.querySelector(".visible-xs-inline")?.textContent ?? cell.textContent;
        return /_(?:hf|f)\s*$/i.test(this.normalizeText(eventCode));
      });
      const startlistLink = eventCell?.querySelector('a[href*="/wedstrijd/startlijst/"]');
      const eventCode = eventCell?.querySelector(".visible-xs-inline")?.textContent ?? eventCell?.textContent;

      if (!timeCell || !eventCell || !startlistLink || !eventCode) {
        return undefined;
      }

      return {
        startlistUrl: new URL(startlistLink.getAttribute("href"), window.location.origin).toString(),
        timeHtml: timeCell.innerHTML,
        eventHtml: eventCell.innerHTML,
        categoryCode: this.normalizeText(cells[1]?.querySelector(".visible-xs-inline")?.textContent ?? cells[1]?.textContent),
        eventCode: this.normalizeText(eventCell.querySelector(".visible-xs-inline")?.textContent ?? eventCell.textContent)
      };
    }).filter((entry) => entry);
  }

  getFinalChronoEntries = async (athleteEntries, normalChronoEntries, statusElement) => {
    const chronoUrl = this.getCompetitionChronoUrl();

    if (!chronoUrl) {
      return [];
    }

    this.setStatus(statusElement, "Finales en halve finales ophalen");
    const chronoResponse = await this.fetchWithThrottle(chronoUrl, {
      credentials: "include"
    });

    if (!chronoResponse.ok) {
      throw new Error(`Ophalen mislukt voor ${chronoUrl} (HTTP ${chronoResponse.status})`);
    }

    const finalRows = this.parseFinalChronoRows(await chronoResponse.text());
    const athleteEventCodes = new Map(athleteEntries.map((athleteEntry) => [athleteEntry.url, new Set()]));

    for (const chronoEntry of normalChronoEntries) {
      athleteEventCodes.get(chronoEntry.athleteUrl)?.add(`${chronoEntry.categoryCode.toLowerCase()}__${chronoEntry.eventCode.toLowerCase()}`);
    }

    const chronoEntries = [];

    for (let index = 0; index < finalRows.length; index++) {
      const finalRow = finalRows[index];
      this.setStatus(statusElement, `Finales en halve finales verwerken ${index + 1}/${finalRows.length}`);
      const baseEventCode = finalRow.eventCode.replace(/_(?:hf|f)$/i, "").toLowerCase();
      const finalEventKey = `${finalRow.categoryCode.toLowerCase()}__${baseEventCode}`;

      for (const athleteEntry of athleteEntries) {
        if (!athleteEventCodes.get(athleteEntry.url)?.has(finalEventKey)) {
          continue;
        }

        const eventText = this.normalizeText(finalRow.eventCode);
        chronoEntries.push({
          key: this.createChronoEntryKey(this.normalizeText(finalRow.timeHtml.replace(/<[^>]+>/g, " ")), eventText),
          timeHtml: finalRow.timeHtml,
          eventHtml: finalRow.eventHtml,
          eventCode: finalRow.eventCode,
          categoryCode: finalRow.categoryCode,
          optional: true,
          athleteName: athleteEntry.name,
          athleteUrl: athleteEntry.url
        });
      }
    }

    return chronoEntries;
  }

  buildChronoRowsHtml = (chronoEntries) => {
    const groupedEntries = new Map();

    for (const chronoEntry of chronoEntries) {
      if (!groupedEntries.has(chronoEntry.key)) {
        groupedEntries.set(chronoEntry.key, {
          timeHtml: chronoEntry.timeHtml,
          eventHtml: chronoEntry.eventHtml,
          optional: chronoEntry.optional === true,
          athleteNames: []
        });
      }

      const groupedEntry = groupedEntries.get(chronoEntry.key);
      groupedEntry.optional = groupedEntry.optional || chronoEntry.optional === true;

      if (!groupedEntry.athleteNames.includes(chronoEntry.athleteName)) {
        groupedEntry.athleteNames.push(chronoEntry.athleteName);
      }
    }

    return Array.from(groupedEntries.values()).map((groupedEntry) => {
      const row = document.createElement("tr");
      const timeCell = document.createElement("td");
      const athleteCell = document.createElement("td");
      const eventCell = document.createElement("td");

      timeCell.innerHTML = groupedEntry.timeHtml;
      athleteCell.innerHTML = groupedEntry.athleteNames.join("<br>");
      eventCell.innerHTML = groupedEntry.eventHtml;

      if (groupedEntry.optional) {
        eventCell.insertAdjacentHTML("beforeend", ' <span style="display:inline-block;margin-left:6px;padding:2px 5px;border:1px solid #9aa8b2;border-radius:3px;color:#5f6d76;font-size:10px;font-weight:700;line-height:1.2;">OPTIONEEL</span>');
      }

      row.appendChild(timeCell);
      row.appendChild(athleteCell);
      row.appendChild(eventCell);

      return row.outerHTML;
    }).join("");
  }

  buildChronoHtml = (chronoRowsHtml) => {
    const chronoTable = document.createElement("table");
    chronoTable.className = "chronoloogtabel";
    chronoTable.innerHTML = chronoRowsHtml;

    const sort = new Sort();
    sort.sortTable(chronoTable);

    const html = new Html();
    return html.createHtmlPage(chronoTable);
  }

  setStatus = (statusElement, message, isError = false) => {
    statusElement.textContent = message;
    statusElement.setAttribute("data-error", isError ? "true" : "false");
  }

  buildClubChrono = async (clubName, athleteEntries, statusElement, includeFinals) => {
    const chronoEntries = [];

    for (let index = 0; index < athleteEntries.length; index++) {
      const athleteEntry = athleteEntries[index];
      this.setStatus(statusElement, `Tijdschema ophalen ${index + 1}/${athleteEntries.length}`);

      const response = await this.fetchWithThrottle(athleteEntry.url, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error(`Ophalen mislukt voor ${athleteEntry.url} (HTTP ${response.status})`);
      }

      const htmlText = await response.text();

      const athleteRows = this.parseAthleteChronoRows(htmlText, athleteEntry.name, includeFinals);

      for (const athleteRow of athleteRows) {
        athleteRow.athleteUrl = athleteEntry.url;
        chronoEntries.push(athleteRow);
      }
    }

    if (includeFinals) {
      const finalEntries = await this.getFinalChronoEntries(athleteEntries, chronoEntries, statusElement);

      for (const finalEntry of finalEntries) {
        chronoEntries.push(finalEntry);
      }
    }

    if (chronoEntries.length === 0) {
      throw new Error(`Geen tijdschema gevonden voor ${clubName}`);
    }

    const chronoHtml = this.buildChronoHtml(this.buildChronoRowsHtml(chronoEntries));

    let clipboardCopied = true;

    try {
      await navigator.clipboard.writeText(chronoHtml.outerHTML);
    } catch (error) {
      clipboardCopied = false;
    }

    const save = new Save();
    save.saveFile(chronoHtml.outerHTML);

    return clipboardCopied;
  }

  render = () => {
    const registrationTable = this.getRegistrationTable();

    if (!registrationTable || !registrationTable.parentNode) {
      return false;
    }

    const registrationContainer = registrationTable.parentNode;

    if (registrationContainer.querySelector(this.controlsSelector)) {
      return true;
    }

    const clubEntries = this.getClubEntries(registrationTable);

    if (clubEntries.size === 0) {
      return false;
    }

    if (typeof ensureChronoStyles === "function") {
      ensureChronoStyles();
    }

    const controls = document.createElement("div");
    controls.className = "chrono-controls chrono-controls--club";
    controls.setAttribute("data-club-chrono-controls", "true");

    const label = document.createElement("label");
    label.className = "chrono-controls__label";
    label.textContent = "Vereniging";

    const select = document.createElement("select");
    select.className = "chrono-controls__select";

    this.updateClubSelect(select, clubEntries);

    const buildButton = this.createButton("Maak chronoloog");
    const finalsLabel = document.createElement("label");
    finalsLabel.className = "chrono-controls__checkbox";
    const finalsCheckbox = document.createElement("input");
    finalsCheckbox.type = "checkbox";
    finalsLabel.appendChild(finalsCheckbox);
    finalsLabel.appendChild(document.createTextNode(" Inclusief finales/halve finales"));
    const optionalBadge = document.createElement("span");
    optionalBadge.className = "chrono-controls__optional";
    optionalBadge.textContent = "OPTIONEEL";
    finalsLabel.appendChild(optionalBadge);
    const status = document.createElement("span");
    status.className = "chrono-controls__status";

    let activeClubEntries = clubEntries;
    this.setStatus(status, `${clubEntries.size} verenigingen gevonden`);

    this.collectClubEntries().then((collectedEntries) => {
      if (collectedEntries.size === 0) {
        return;
      }

      const selectedClubName = select.value;
      activeClubEntries = collectedEntries;
      this.updateClubSelect(select, activeClubEntries, selectedClubName);
      this.setStatus(status, `${activeClubEntries.size} verenigingen gevonden`);
    }).catch(() => {
      this.setStatus(status, "Niet alle inschrijvingen konden vooraf geladen worden", true);
    });

    buildButton.onclick = async (event) => {
      event.preventDefault();

      const selectedClub = select.value;

      buildButton.style.pointerEvents = "none";
      buildButton.style.opacity = "0.7";

      try {
        activeClubEntries = await this.collectClubEntries();
        this.updateClubSelect(select, activeClubEntries, selectedClub);

        const athleteEntries = this.getAthleteEntriesForClub(activeClubEntries, selectedClub);

        if (athleteEntries.length === 0) {
          this.setStatus(status, `Geen atleten gevonden voor ${selectedClub}`, true);
          return;
        }

        const clipboardCopied = await this.buildClubChrono(selectedClub, athleteEntries, status, finalsCheckbox.checked);
        this.setStatus(status, clipboardCopied
          ? `Chronoloog gemaakt voor ${selectedClub}`
          : `Chronoloog gemaakt voor ${selectedClub}; bestand gedownload, kopiëren naar klembord is geblokkeerd`);
      } catch (error) {
        this.setStatus(status, error.message, true);
      } finally {
        buildButton.style.pointerEvents = "";
        buildButton.style.opacity = "";
      }
    }

    controls.appendChild(label);
    controls.appendChild(select);
    controls.appendChild(buildButton);
    controls.appendChild(finalsLabel);
    controls.appendChild(status);

    registrationContainer.prepend(controls);

    return true;
  }
}

const clubChrono = new ClubChrono();