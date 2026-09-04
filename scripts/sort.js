// See https://www.w3schools.com/howto/howto_js_sort_table.asp
class Sort {
  getTimeCellText = (row) => {
    const timeCell = row.getElementsByTagName("TD")[0];

    if (!timeCell) {
      return "";
    }

    const timeLink = timeCell.getElementsByTagName("a")[0];
    return (timeLink?.textContent ?? timeCell.textContent ?? "").trim();
  }

  parseTimeValue = (value) => {
    const match = value.match(/(\d{1,2})[:.](\d{2})/);

    if (!match) {
      return Number.POSITIVE_INFINITY;
    }

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    return hours * 60 + minutes;
  }

  compareRows = (leftRow, rightRow) => {
    const leftText = this.getTimeCellText(leftRow);
    const rightText = this.getTimeCellText(rightRow);
    const leftValue = this.parseTimeValue(leftText);
    const rightValue = this.parseTimeValue(rightText);

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }

    return leftText.localeCompare(rightText, "nl", { numeric: true });
  }

  getStartIndex = (rows) => {
    const firstRow = rows[0];

    if (!firstRow) {
      return 0;
    }

    return firstRow.getElementsByTagName("TH").length > 0 ? 1 : 0;
  }

  sortTable = (table) => {
    var rows, switching, i, shouldSwitch, startIndex;
    switching = true;
    /* Make a loop that will continue until
    no switching has been done: */
    while (switching) {
      // Start by saying: no switching is done:
      switching = false;
      rows = table.rows;
      startIndex = this.getStartIndex(rows);
      /* Loop through all table rows, skipping the
      first row only when it contains table headers. */
      for (i = startIndex; i < (rows.length - 1); i++) {
        // Start by saying there should be no switching:
        shouldSwitch = false;
        // Check if the two rows should switch place:
        if (this.compareRows(rows[i], rows[i + 1]) > 0) {
          // If so, mark as a switch and break the loop:
          shouldSwitch = true;
          break;
        }
      }
      if (shouldSwitch) {
        /* If a switch has been marked, make the switch
        and mark that a switch has been done: */
        rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
        switching = true;
      }
    }
  }
}