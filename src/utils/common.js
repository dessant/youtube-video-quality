import browser from 'webextension-polyfill';

const getText = browser.i18n.getMessage;

function executeCode(code, tabId, frameId = 0, runAt = 'document_start') {
  return browser.tabs.executeScript(tabId, {
    frameId,
    runAt,
    code
  });
}

export {getText, executeCode};
