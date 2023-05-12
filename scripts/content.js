function configureAdd(chrono) {
  const addButton = document.createElement("button");
  addButton.textContent = "Toevoegen";
  
  addButton.onclick = function() {
    const tableHead = chrono.getElementsByTagName("thead")[0];
    tableHead && chrono.removeChild(tableHead);
    const rows = chrono.getElementsByTagName("tr");
  
    for (let row of rows) {
      const athletesButton = row.children[3];
      athletesButton && athletesButton.remove();
  
      const timeCell = row.children[0];
      const spanElements = timeCell.getElementsByTagName("span");
      for (let i = spanElements.length - 1; i >= 0; i--) {
          spanElements[i].parentNode.removeChild(spanElements[i]);
      }
    }
  
    const tableRowsHtml = chrono.getElementsByTagName("tbody")[0].innerHTML;
    let currentRows = localStorage.getItem("chrono") ?? "";
    currentRows += tableRowsHtml;
    localStorage.setItem("chrono", currentRows);
  }  

  return addButton;
}

function configureClear() {
  const clearButton = document.createElement("button");
  clearButton.textContent = "Legen";
  
  clearButton.onclick = function () {
    localStorage.removeItem("chrono");
  }

  return clearButton;
}

function configureCopySave() {
  const copySaveButton = document.createElement("button");
  copySaveButton.textContent = "Kopiëren en opslaan";
  
  copySaveButton.onclick = function () {
    const chrono = localStorage.getItem("chrono");
  
    const chronoTable = document.createElement('table');
    chronoTable.innerHTML = chrono;
    sort.sortTable(chronoTable);
  
    navigator.clipboard.writeText(chronoTable.outerHTML);
    save.saveFile(chronoTable.outerHTML);
  }

  return copySaveButton;
}

// Main function
function run () {
  const chrono = document.getElementById("chronoloog_1");
  const chronoClone = chrono.cloneNode(true);

  const copySaveButton = configureCopySave();
  chrono.parentNode.prepend(copySaveButton);

  const clearButton = configureClear();
  chrono.parentNode.prepend(clearButton);

  const addButton = configureAdd(chronoClone);
  chrono.parentNode.prepend(addButton);
}

const save = new Save();
const sort = new Sort();

run();