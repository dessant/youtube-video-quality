import storage from 'storage/storage';
import {
  getText,
  executeScript,
  createTab,
  getActiveTab,
  isValidTab,
  getPlatform,
  getDayPrecisionEpoch,
  getDarkColorSchemeQuery
} from 'utils/common';
import {
  targetEnv,
  enableContributions,
  storageRevisions,
  appVersion,
  mv3
} from 'utils/config';
import {qualityLevels, youtubeOriginRx} from 'utils/data';

function encodeQualityData(quality) {
  const epoch = Date.now();
  const value = parseInt(quality, 10);

  const data = {
    data: JSON.stringify({quality: value, previousQuality: value}),
    expiration: epoch + 60 * 60 * 24 * 365 * 1000, // one year
    creation: epoch
  };

  return JSON.stringify(data);
}

function decodeQualityData(data) {
  const {data: dataString} = JSON.parse(data);
  const {quality} = JSON.parse(dataString);

  return quality.toString();
}

function convertQualityValue(value, {from = 'storage'} = {}) {
  if (from === 'storage') {
    return qualityLevels[value];
  } else if (from === 'api') {
    for (const [k, v] of Object.entries(qualityLevels)) {
      if (v === value) {
        return k;
      }
    }
  }
}

function isValidQualityValue(value) {
  if (qualityLevels[value]) {
    return true;
  }

  return false;
}

function getListItems(data, {scope = '', shortScope = ''} = {}) {
  const results = {};

  for (const [group, items] of Object.entries(data)) {
    results[group] = [];

    items.forEach(function (item) {
      if (item.value === undefined) {
        item = {value: item};
      }

      item.title = getText(`${scope ? scope + '_' : ''}${item.value}`);

      if (shortScope) {
        item.shortTitle = getText(`${shortScope}_${item.value}`);
      }

      results[group].push(item);
    });
  }

  return results;
}

async function insertBaseModule() {
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
    executeScript({
      files: ['/src/base/script.js'],
      tabId,
      frameIds: [frameId]
    });
  }
}

async function loadFonts(fonts) {
  await Promise.allSettled(fonts.map(font => document.fonts.load(font)));
}

function processMessageResponse(response, sendResponse) {
  if (targetEnv === 'safari') {
    response.then(function (result) {
      // Safari 15: undefined response will cause sendMessage to never resolve.
      if (result === undefined) {
        result = null;
      }
      sendResponse(result);
    });

    return true;
  } else {
    return response;
  }
}

async function configApp(app) {
  const platform = await getPlatform();

  const classes = [platform.targetEnv, platform.os];
  document.documentElement.classList.add(...classes);

  if (app) {
    app.config.globalProperties.$env = platform;
  }
}

async function getAppTheme(theme) {
  if (!theme) {
    ({appTheme: theme} = await storage.get('appTheme'));
  }

  if (theme === 'auto') {
    theme = getDarkColorSchemeQuery().matches ? 'dark' : 'light';
  }

  return theme;
}

function addSystemThemeListener(callback) {
  getDarkColorSchemeQuery().addEventListener('change', function () {
    callback();
  });
}

function addAppThemeListener(callback) {
  browser.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && changes.appTheme) {
      callback();
    }
  });
}

function addThemeListener(callback) {
  addSystemThemeListener(callback);
  addAppThemeListener(callback);
}

async function getOpenerTabId({tab, tabId = null} = {}) {
  if (!tab && tabId !== null) {
    tab = await browser.tabs.get(tabId).catch(err => null);
  }

  if ((await isValidTab({tab})) && !(await getPlatform()).isMobile) {
    return tab.id;
  }

  return null;
}

async function showPage({
  url = '',
  setOpenerTab = true,
  getTab = false,
  activeTab = null
} = {}) {
  if (!activeTab) {
    activeTab = await getActiveTab();
  }

  const props = {url, index: activeTab.index + 1, active: true, getTab};

  if (setOpenerTab) {
    props.openerTabId = await getOpenerTabId({tab: activeTab});
  }

  return createTab(props);
}

async function autoShowContributePage({
  minUseCount = 0, // 0-1000
  minInstallDays = 0,
  minLastOpenDays = 0,
  minLastAutoOpenDays = 0,
  action = 'auto',
  activeTab = null
} = {}) {
  if (enableContributions) {
    const options = await storage.get([
      'showContribPage',
      'useCount',
      'installTime',
      'contribPageLastOpen',
      'contribPageLastAutoOpen'
    ]);

    const epoch = getDayPrecisionEpoch();

    if (
      options.showContribPage &&
      options.useCount >= minUseCount &&
      epoch - options.installTime >= minInstallDays * 86400000 &&
      epoch - options.contribPageLastOpen >= minLastOpenDays * 86400000 &&
      epoch - options.contribPageLastAutoOpen >= minLastAutoOpenDays * 86400000
    ) {
      await storage.set({
        contribPageLastOpen: epoch,
        contribPageLastAutoOpen: epoch
      });

      return showContributePage({
        action,
        updateStats: false,
        activeTab,
        getTab: true
      });
    }
  }
}

let useCountLastUpdate = 0;
async function updateUseCount({
  valueChange = 1,
  maxUseCount = Infinity,
  minInterval = 0
} = {}) {
  if (Date.now() - useCountLastUpdate >= minInterval) {
    useCountLastUpdate = Date.now();

    const {useCount} = await storage.get('useCount');

    if (useCount < maxUseCount) {
      await storage.set({useCount: useCount + valueChange});
    } else if (useCount > maxUseCount) {
      await storage.set({useCount: maxUseCount});
    }
  }
}

async function processAppUse({
  action = 'auto',
  activeTab = null,
  showContribPage = true
} = {}) {
  await updateUseCount({
    valueChange: 1,
    maxUseCount: 1000,
    minInterval: 60000
  });

  if (showContribPage) {
    return autoShowContributePage({
      minUseCount: 1,
      minInstallDays: 14,
      minLastOpenDays: 14,
      minLastAutoOpenDays: 365,
      activeTab,
      action
    });
  }
}

async function showContributePage({
  action = '',
  updateStats = true,
  getTab = false,
  activeTab = null
} = {}) {
  if (updateStats) {
    await storage.set({contribPageLastOpen: getDayPrecisionEpoch()});
  }

  let url = browser.runtime.getURL('/src/contribute/index.html');
  if (action) {
    url = `${url}?action=${action}`;
  }

  return showPage({url, getTab, activeTab});
}

async function showOptionsPage({getTab = false, activeTab = null} = {}) {
  // Samsung Internet 13: runtime.openOptionsPage fails.
  // runtime.openOptionsPage adds new tab at the end of the tab list.
  return showPage({
    url: browser.runtime.getURL('/src/options/index.html'),
    getTab,
    activeTab
  });
}

async function setAppVersion() {
  await storage.set({appVersion});
}

async function isSessionStartup() {
  const privateContext = browser.extension.inIncognitoContext;

  const sessionKey = privateContext ? 'privateSession' : 'session';
  const session = (await browser.storage.session.get(sessionKey))[sessionKey];

  if (!session) {
    await browser.storage.session.set({[sessionKey]: true});
  }

  if (privateContext) {
    try {
      if (!(await self.caches.has(sessionKey))) {
        await self.caches.open(sessionKey);

        return true;
      }
    } catch (err) {
      return true;
    }
  }

  if (!session) {
    return true;
  }
}

async function isStartup() {
  const startup = {
    install: false,
    update: false,
    session: false,
    setupInstance: false,
    setupSession: false
  };

  const {storageVersion, appVersion: savedAppVersion} =
    await browser.storage.local.get(['storageVersion', 'appVersion']);

  if (!storageVersion) {
    startup.install = true;
  }

  if (
    storageVersion !== storageRevisions.local ||
    savedAppVersion !== appVersion
  ) {
    startup.update = true;
  }

  if (mv3 && (await isSessionStartup())) {
    startup.session = true;
  }

  if (startup.install || startup.update) {
    startup.setupInstance = true;
  }

  if (startup.session || !mv3) {
    startup.setupSession = true;
  }

  return startup;
}

let startupState;
async function getStartupState({event = ''} = {}) {
  if (!startupState) {
    startupState = isStartup();
    startupState.events = [];
  }

  if (event) {
    startupState.events.push(event);
  }

  const startup = await startupState;

  if (startupState.events.includes('install')) {
    startup.setupInstance = true;
  }
  if (startupState.events.includes('startup')) {
    startup.setupSession = true;
  }

  return startup;
}

export {
  encodeQualityData,
  decodeQualityData,
  convertQualityValue,
  isValidQualityValue,
  getListItems,
  insertBaseModule,
  loadFonts,
  processMessageResponse,
  configApp,
  getAppTheme,
  addSystemThemeListener,
  addAppThemeListener,
  addThemeListener,
  getOpenerTabId,
  showPage,
  autoShowContributePage,
  updateUseCount,
  processAppUse,
  showContributePage,
  showOptionsPage,
  setAppVersion,
  isSessionStartup,
  isStartup,
  getStartupState
};
