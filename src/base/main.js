import {v4 as uuidv4} from 'uuid';

import storage from 'storage/storage';
import {
  encodeQualityData,
  decodeQualityData,
  isValidQualityValue
} from 'utils/app';
import {executeScriptMainContext} from 'utils/common';

function main() {
  // Script may be injected multiple times.
  if (self.baseModule) {
    return;
  } else {
    self.baseModule = true;
  }

  const contentStorage = {
    contextEventName: ''
  };

  function getVideoQuality() {
    const quality = decodeQualityData(
      localStorage.getItem('yt-player-quality')
    );

    if (isValidQualityValue(quality)) {
      return quality;
    }
  }

  function setVideoQuality(quality) {
    localStorage.setItem('yt-player-quality', encodeQualityData(quality));
  }

  async function syncState() {
    const {quality, limitFps} = await storage.get(['quality', 'limitFps']);

    setVideoQuality(quality);

    sendContextMessage({id: 'syncState', limitFps});
  }

  function sendContextMessage(message) {
    document.dispatchEvent(
      new CustomEvent(contentStorage.contextEventName, {
        detail: JSON.stringify(message)
      })
    );
  }

  async function onContextMessage(ev) {
    const message = JSON.parse(ev.detail);

    if (message.id === 'qualityChange') {
      const quality = getVideoQuality();

      if (quality) {
        await storage.set({quality});
        await browser.runtime.sendMessage({id: 'optionChange'});
      }
    }
  }

  function onMessage(request, sender) {
    // Samsung Internet 13: extension messages are sometimes also dispatched
    // to the sender frame.
    if (sender.url === self.location.href) {
      return;
    }

    if (request.id === 'syncState') {
      syncState();
    }
  }

  async function setup() {
    contentStorage.contextEventName = uuidv4();

    document.addEventListener(
      contentStorage.contextEventName,
      onContextMessage
    );

    await executeScriptMainContext({
      func: 'mainContext',
      args: [contentStorage.contextEventName]
    });

    await syncState();
  }

  function init() {
    browser.runtime.onMessage.addListener(onMessage);

    setup();
  }

  init();
}

main();
