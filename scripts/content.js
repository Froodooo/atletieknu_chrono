const CHRONO_CONTROLS_SELECTOR = '[data-chrono-controls="true"]';
const RECORDS_POINTS_SELECTOR = '[data-chrono-points="true"]';
const CHRONO_STYLE_SELECTOR = '[data-chrono-style="true"]';

const ensureChronoStyles = () => {
  if (document.head.querySelector(CHRONO_STYLE_SELECTOR)) {
    return;
  }

  const style = document.createElement("style");
  style.setAttribute("data-chrono-style", "true");
  style.textContent = `
    .chrono-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    }

    .chrono-controls .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 14px;
    }

    .chrono-controls__label {
      font-weight: 600;
    }

    .chrono-controls__select {
      min-width: 220px;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid #c9d2d8;
      border-radius: 4px;
      background: #fff;
    }

    .chrono-controls__checkbox {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding-left: 8px;
      border-left: 1px solid #c9d2d8;
      color: #44525c;
    }

    .chrono-controls__optional {
      display: inline-block;
      margin-left: 4px;
      padding: 2px 5px;
      border: 1px solid #9aa8b2;
      border-radius: 3px;
      color: #5f6d76;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }

    .chrono-controls__status {
      color: #44525c;
      font-size: 13px;
    }

    .chrono-controls__status[data-error="true"] {
      color: #b42318;
    }
  `;

  document.head.appendChild(style);
}

const chrono = () => {
  const chronoTable = document.getElementById("chronoloog_1");

  if (!chronoTable || !chronoTable.parentNode) {
    return false;
  }

  const chronoContainer = chronoTable.parentNode;

  if (chronoContainer.querySelector(CHRONO_CONTROLS_SELECTOR)) {
    return true;
  }

  ensureChronoStyles();

  const controls = document.createElement("div");
  controls.className = "chrono-controls";
  controls.setAttribute("data-chrono-controls", "true");

  const button = new Button();

  const copySaveButton = button.configureCopySave();
  controls.appendChild(copySaveButton);

  const clearButton = button.configureClear();
  controls.appendChild(clearButton);

  const addButton = button.configureAdd(() => chronoTable.cloneNode(true));
  controls.appendChild(addButton);

  chronoContainer.prepend(controls);

  return true;
}

const longDistanceResult = (eventText, result) => {
  const minutes = parseInt(result.split(":")[0]);
  const seconds = parseInt(result.split(":")[1].split(",")[0]);

  return parseInt(POINTS[eventText].A / (minutes * 60 + seconds) - POINTS[eventText].B);
}

const sprintResult = (event, result) => {
  return parseInt(POINTS[event].A / result - POINTS[event].B)
}

const jumpThrowResult = (eventText, result) => {
  if (eventText === "Hoogspringen" && result <= 1.35) {
    result = parseInt((result - 0.67) * 733.33333 + 0.7);
  } else if (eventText === "Verspringen" && result <= 4.41) {
    result = parseInt((result - 1.91) * 200 + 0.5);
  } else if (POINTS[eventText]) {
    result = parseInt(POINTS[eventText].A * Math.sqrt(result) - POINTS[eventText].B);
  }

  return result;
}

const pointResult = (eventText, result) => {
  let event = undefined;

  event = SPRINTS.find(e => eventText.includes(e));
  if (event) {
    return sprintResult(event, result);
  }

  event = LONGDISTANCES.find(e => eventText.includes(e));
  if (event) {
    return longDistanceResult(event, result);
  }

  event = JUMPTHROW.find(e => eventText.includes(e));
  if (event) {
    return jumpThrowResult(event, result);
  }

  return "Niet ondersteund";
}

const rawResult = (row, eventText) => {
  const event = LONGDISTANCES.find(e => eventText.includes(e));
  if (event) {
    return row.children[1].innerText.trim().split("\n")[0].trim().split(",")[0];
  } else {
    return parseFloat(row.children[1].innerText.trim().split("\n")[0].replace(",", "."));
  }
}

const personalRecords = () => {
  const recordsTableHead = document.querySelector('#records #persoonlijkerecords > thead:first-of-type > tr:first-of-type');
  const recordsTableBody = document.querySelector('#records #persoonlijkerecords > tbody:first-of-type');

  if (!recordsTableHead || !recordsTableBody) {
    return false;
  }

  if (recordsTableHead.querySelector(RECORDS_POINTS_SELECTOR)) {
    return true;
  }

  const pointsHeader = document.createElement("th");
  pointsHeader.innerText = "Punten";
  pointsHeader.setAttribute("data-chrono-points", "true");
  recordsTableHead.appendChild(pointsHeader);

  const rows = recordsTableBody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const eventText = row.children[0].innerText.trim();
    const result = rawResult(row, eventText);

    const cell = document.createElement("td");
    cell.innerText = pointResult(eventText, result);

    row.appendChild(cell);
  }

  return true;
}

const syncPageEnhancements = () => {
  const url = window.location.href;

  if (url.includes("team/main")) {
    chrono();
  } else if (url.includes("wedstrijd/atleten")) {
    clubChrono.render();
  } else if (url.includes("records")) {
    personalRecords();
  }
}

let scheduledSync = false;

const scheduleSync = () => {
  if (scheduledSync) {
    return;
  }

  scheduledSync = true;

  requestAnimationFrame(() => {
    scheduledSync = false;
    syncPageEnhancements();
  });
}

const observePageChanges = () => {
  const observer = new MutationObserver(() => {
    scheduleSync();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

const initialize = () => {
  scheduleSync();

  if (document.body) {
    observePageChanges();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize, { once: true });
} else {
  initialize();
}