import storage from 'storage/storage';
import {prepareQualityData} from 'utils/app';
import {qualityLevels} from 'utils/data';

function setVideoQuality(quality) {
  localStorage.setItem('yt-player-quality', prepareQualityData(quality));
}

function addHooks(limitFps) {
  if (limitFps) {
    const isMediaTypeSupported = MediaSource.isTypeSupported;
    MediaSource.isTypeSupported = function(mediaType) {
      const match = mediaType.match(/framerate=(\d+)/);
      if (match && match[1] > 30) {
        return false;
      }

      return isMediaTypeSupported(mediaType);
    };
  }

  const storageSetItem = Storage.prototype.setItem;
  let ignoreNextStorageChange = false;

  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === 'yt-player-quality') {
      if (ignoreNextStorageChange) {
        ignoreNextStorageChange = false;
      } else {
        storageSetItem.apply(this, arguments);

        const {data} = JSON.parse(value) || {};
        document.dispatchEvent(
          new CustomEvent('qualityChange', {detail: data})
        );
      }
    } else {
      storageSetItem.apply(this, arguments);
    }
  };

  window.onYouTubePlayerReady = function(player) {
    if (player.setPlaybackQualityRange) {
      // https://developers.google.com/youtube/iframe_api_reference#Events
      player.addEventListener('onStateChange', function(ev) {
        const state = ev.data || ev;
        if (state === 1) {
          const levels = player.getAvailableQualityLevels();
          let {data: quality} = JSON.parse(
            localStorage.getItem('yt-player-quality')
          );
          if (!levels.includes(quality)) {
            quality = levels[0];
          }

          ignoreNextStorageChange = true;
          player.setPlaybackQualityRange(quality, quality);
        }
      });
    }
  };
}

async function onQualityChange(ev) {
  const newQuality = ev.detail;
  if (qualityLevels.includes(newQuality)) {
    await storage.set({quality: newQuality}, 'sync');
  }
}

async function init() {
  const {quality, limitFps} = await storage.get(
    ['quality', 'limitFps'],
    'sync'
  );
  setVideoQuality(quality);

  document.addEventListener('qualityChange', onQualityChange);

  const script = document.createElement('script');
  script.textContent = `(${addHooks.toString()})(${limitFps})`;
  document.documentElement.appendChild(script);
  script.remove();
}

init();
