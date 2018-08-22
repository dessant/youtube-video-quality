import browser from 'webextension-polyfill';

import storage from 'storage/storage';
import {prepareQualityData} from 'utils/app';
import {qualityLevels} from 'utils/data';

function setVideoQuality(quality) {
  localStorage.setItem('yt-player-quality', prepareQualityData(quality));
}

function dispatchQualityChange() {
  const storageSetItem = Storage.prototype.setItem;

  Storage.prototype.setItem = function(key, value) {
    storageSetItem.apply(this, arguments);

    if (this === localStorage && key === 'yt-player-quality') {
      const {data} = JSON.parse(value) || {};
      document.dispatchEvent(new CustomEvent('qualityChange', {detail: data}));
    }
  };
}

async function onQualityChange(e) {
  const newQuality = e.detail;
  if (qualityLevels.includes(newQuality)) {
    await storage.set({quality: newQuality}, 'sync');
  }
}

async function init() {
  const {quality} = await storage.get('quality', 'sync');
  setVideoQuality(quality);

  document.addEventListener('qualityChange', onQualityChange);

  const script = document.createElement('script');
  script.textContent = `(${dispatchQualityChange.toString()})()`;
  document.documentElement.appendChild(script);
  script.remove();
}

init();
