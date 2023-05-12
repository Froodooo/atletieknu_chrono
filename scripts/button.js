const create = () => {
  const button = document.createElement("a");
  button.className = "btn btn-greenhover";
  
  return button;
}

class Button {
  configureAdd = (chrono) => {
    const addButton = create();
    addButton.textContent = "Toevoegen";
    
    addButton.onclick = function() {
      const tableHead = chrono.getElementsByTagName("thead")[0];
      tableHead && chrono.removeChild(tableHead);
      const rows = chrono.getElementsByTagName("tr");
    
      for (let row of rows) {
        const athletesButton = row.children[3];
        athletesButton && athletesButton.remove();
      }
    
      const tableRowsHtml = chrono.getElementsByTagName("tbody")[0].innerHTML;
      let currentRows = localStorage.getItem("chrono") ?? "";
      currentRows += tableRowsHtml;
      localStorage.setItem("chrono", currentRows);
    }  
  
    return addButton;
  }
  
  configureClear = () => {
    const clearButton = create();
    clearButton.textContent = "Legen";
    
    clearButton.onclick = function () {
      localStorage.removeItem("chrono");
    }
  
    return clearButton;
  }
  
  configureCopySave = () => {
    const copySaveButton = create();
    copySaveButton.textContent = "Kopiëren en opslaan";

    const save = new Save();
    
    copySaveButton.onclick = function () {
      const buildChronoHtml = (chronoData) => {
        const chronoTable = document.createElement('table');
        chronoTable.innerHTML = chronoData;
      
        const sort = new Sort();
        sort.sortTable(chronoTable);
      
        const html = new Html();
        const htmlPage = html.createHtmlPage(chronoTable);
      
        return htmlPage;
      }

      const chronoData = localStorage.getItem("chrono");
      const chronoHtml = buildChronoHtml(chronoData);

      navigator.clipboard.writeText(chronoHtml.outerHTML);
      save.saveFile(chronoHtml.outerHTML);
    }
  
    return copySaveButton;
  }
}