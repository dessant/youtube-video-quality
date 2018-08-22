import browser from 'webextension-polyfill';

import {initStorage} from 'storage/init';
import storage from 'storage/storage';
import {prepareQualityData} from 'utils/app';
import {executeCode} from 'utils/common';

const youtubeOriginRx = /^https:\/\/(?:(?:www|gaming)\.youtube|youtube-nocookie)\.com$/;

async function syncState(quality) {
  if (!quality) {
    var {quality} = await storage.get('quality', 'sync');
  }

  const messageTargets = {};

  const tabs = await browser.tabs.query({});
  for (const tab of tabs) {
    const tabId = tab.id;

    const frames = await browser.webNavigation.getAllFrames({tabId});
    for (const frame of frames) {
      const origin = new URL(frame.url).origin;

      if (youtubeOriginRx.test(origin) && !messageTargets[origin]) {
        messageTargets[origin] = {tabId, frameId: frame.frameId};
      }
    }
  }

  const qualityData = prepareQualityData(quality);

  for (const {tabId, frameId} of Object.values(messageTargets)) {
    await executeCode(
      `
        localStorage.setItem('yt-player-quality', '${qualityData}');
      `,
      tabId,
      frameId
    );
  }
}

async function onStorageChange(changes, area) {
  if (changes.quality) {
    await syncState(changes.quality.newValue);
  }
}

function addStorageListener() {
  browser.storage.onChanged.addListener(onStorageChange);
}

async function onLoad() {
  await initStorage('sync');
  await syncState();
  addStorageListener();
}

document.addEventListener('DOMContentLoaded', onLoad);
