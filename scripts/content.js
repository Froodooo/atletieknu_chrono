const chrono = () => {
  const chronoTable = document.getElementById("chronoloog_1");
  const chronoClone = chronoTable.cloneNode(true);

  const button = new Button();

  const copySaveButton = button.configureCopySave();
  chronoTable.parentNode.prepend(copySaveButton);

  const clearButton = button.configureClear();
  chronoTable.parentNode.prepend(clearButton);

  const addButton = button.configureAdd(chronoClone);
  chronoTable.parentNode.prepend(addButton);
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
  const pointsHeader = document.createElement("th");
  pointsHeader.innerText = "Punten";
  recordsTableHead.appendChild(pointsHeader);

  const recordsTableBody = document.querySelector('#records #persoonlijkerecords > tbody:first-of-type');
  const rows = recordsTableBody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const eventText = row.children[0].innerText.trim();
    const result = rawResult(row, eventText);

    const cell = document.createElement("td");
    cell.innerText = pointResult(eventText, result);

    row.appendChild(cell);
  }
}

const url = window.location.href;

if (url.includes("team/main")) {
  chrono();
} else if (url.includes("records")) {
  personalRecords();
}