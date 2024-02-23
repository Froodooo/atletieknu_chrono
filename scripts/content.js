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

const longDistanceResult = (distance, result) => {
  const minutes = parseInt(result.split(":")[0]);
  const seconds = parseInt(result.split(":")[1].split(",")[0]);

  switch (distance) {
    case 600:
      return parseInt(160470.5 / (minutes * 60 + seconds) - 911.35);
    case 1000:
      return parseInt(276912.0 / (minutes * 60 + seconds) - 838.50);
    default:
      return result;
  }
}

const personalRecords = () => {
  const recordsTable = document.querySelector('#records #persoonlijkerecords > tbody:first-of-type');
  const rows = [].filter.call(recordsTable.getElementsByTagName("tr"), el => el.className.indexOf("notThatImportant") === -1);
  console.log(recordsTable);
  console.log(rows);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const eventText = row.children[0].innerText.trim();
    let result = parseFloat(row.children[1].innerText.split("\n")[0].replace(",", "."));

    const cell = document.createElement("td");

    switch (eventText) {
      case "40 meter":
        result = parseInt(10834.0 / result - 1096.00);
        break;
      case "60 meter":
        result = parseInt(15365.0 / result - 1158.00);
        break;
      case "80 meter":
        result = parseInt(19933.0 / result - 1193.00);
        break;
      case "600 meter":
        result = longDistanceResult(600, row.children[1].innerText.split("\n")[0].split(",")[0]);
        break;
      case "1000 meter":
        result = longDistanceResult(1000, row.children[1].innerText.split("\n")[0].split(",")[0]);
        break;
    }

    cell.innerText = result;

    row.appendChild(cell);
  }
}

const url = window.location.href;

if (url.includes("team/main")) {
  chrono();
} else if (url.includes("records")) {
  personalRecords();
}