const run = () => {
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

const observe = () => {
  const target = document.querySelector('body');
  const config = { childList: true };
  const callback = () => {
    if (document.getElementsByClassName('chronoloogtabel')[0] && window.location.href.indexOf("team/main") > -1) {
      run();
    }
  }
  const observer = new MutationObserver(callback);
  observer.observe(target, config);
}

window.performance.getEntriesByType('navigation').map((nav) => nav.type).includes('reload')
  ? run()
  : observe();