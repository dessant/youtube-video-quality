import {initStorage} from 'storage/init';
import {isStorageReady} from 'storage/storage';
import {
  insertBaseModule,
  processMessageResponse,
  processAppUse,
  showOptionsPage,
  setAppVersion,
  getStartupState
} from 'utils/app';
import {executeScript, isValidTab, getPlatform, runOnce} from 'utils/common';
import {getScriptFunction} from 'utils/scripts';
import {targetEnv, mv3} from 'utils/config';
import {youtubeOriginRx} from 'utils/data';

async function syncState() {
  const contexts = [];

  const tabs = await browser.tabs.query({
    url: ['http://*/*', 'https://*/*'],
    windowType: 'normal'
  });

  for (const tab of tabs) {
    const tabId = tab.id;

    const frames = await browser.webNavigation.getAllFrames({tabId});
    for (const frame of frames) {
      const origin = new URL(frame.url).origin;

      if (youtubeOriginRx.test(origin)) {
        contexts.push({tabId, frameId: frame.frameId});
      }
    }
  }

  for (const {tabId, frameId} of contexts) {
    browser.tabs
      .sendMessage(tabId, {id: 'syncState'}, {frameId})
      .catch(err => null);
  }

  await processAppUse();
}

async function processMessage(request, sender) {
  // Samsung Internet 13: extension messages are sometimes also dispatched
  // to the sender frame.
  if (sender.url === self.location.href) {
    return;
  }

  if (targetEnv === 'samsung') {
    if (await isValidTab({tab: sender.tab})) {
      // Samsung Internet 13: runtime.onMessage provides wrong tab index.
      sender.tab = await browser.tabs.get(sender.tab.id);
    }
  }

  if (request.id === 'getPlatform') {
    return getPlatform();
  } else if (request.id === 'optionChange') {
    await onOptionChange();
  } else if (request.id === 'executeScript') {
    const params = request.params;
    if (request.setSenderTabId) {
      params.tabId = sender.tab.id;
    }
    if (request.setSenderFrameId) {
      params.frameIds = [sender.frameId];
    }

    if (params.func) {
      params.func = getScriptFunction(params.func);
    }

    return executeScript(params);
  }
}

function onMessage(request, sender, sendResponse) {
  const response = processMessage(request, sender);

  return processMessageResponse(response, sendResponse);
}

async function onOptionChange() {
  await syncState();
}

async function onActionButtonClick(tab) {
  await showOptionsPage();
}

async function onInstall(details) {
  if (['install', 'update'].includes(details.reason)) {
    await setup({event: 'install'});
  }
}

async function onStartup() {
  await setup({event: 'startup'});
}

function addActionListener() {
  if (mv3) {
    browser.action.onClicked.addListener(onActionButtonClick);
  } else {
    browser.browserAction.onClicked.addListener(onActionButtonClick);
  }
}

function addMessageListener() {
  browser.runtime.onMessage.addListener(onMessage);
}

function addInstallListener() {
  browser.runtime.onInstalled.addListener(onInstall);
}

function addStartupListener() {
  browser.runtime.onStartup.addListener(onStartup);
}

async function setup({event = ''} = {}) {
  const startup = await getStartupState({event});

  if (startup.setupInstance) {
    await runOnce('setupInstance', async () => {
      if (!(await isStorageReady())) {
        await initStorage();
      }

      if (['chrome', 'edge', 'opera', 'samsung'].includes(targetEnv)) {
        await insertBaseModule();
      }

      if (startup.update) {
        await setAppVersion();
      }
    });
  }

  if (startup.setupSession) {
    await runOnce('setupSession', async () => {
      if (mv3 && !(await isStorageReady({area: 'session'}))) {
        await initStorage({area: 'session', silent: true});
      }
    });
  }
}

function init() {
  addActionListener();
  addMessageListener();
  addInstallListener();
  addStartupListener();

  setup();
}

init();
