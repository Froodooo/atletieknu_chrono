class Html {
  createTableHead = () => {
    const tr = document.createElement('tr');
    for (let i = 0; i < 3; i++) {
      tr.appendChild( document.createElement('th') );
    }

    tr.cells[0].appendChild(document.createTextNode('Tijd'));
    tr.cells[1].appendChild(document.createTextNode('Deelnemers'));
    tr.cells[2].appendChild(document.createTextNode('Onderdeel'));

    const thead = document.createElement('thead');
    thead.appendChild(tr);

    return thead;
  }

  createLink = () => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('type', 'text/css');
    link.setAttribute('href', 'https://www.atletiek.nu/css/full.min.css');

    return link;
  }

  createHtmlHead = () => {
    const link = this.createLink();
    
    const head = document.createElement('head');
    head.appendChild(link);

    return head;
  }

  createHtmlPage = (chronoTable) => {
    const html = document.createElement('html');
    
    const head = this.createHtmlHead();
    html.appendChild(head);

    const thead = this.createTableHead();
    chronoTable.prepend(thead);

    const body = document.createElement('body');
    body.appendChild(chronoTable);
    html.appendChild(body);

    return html;
  }
}