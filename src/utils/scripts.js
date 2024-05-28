function mainContextScript(contextEventName) {
  const contentStorage = {
    contextEventName,
    limitFps: false,
    videos: []
  };

  const qualityLevels = {
    4320: 'highres',
    2160: 'hd2160',
    1440: 'hd1440',
    1080: 'hd1080',
    720: 'hd720',
    480: 'large',
    360: 'medium',
    240: 'small',
    144: 'tiny',
    0: 'auto'
  };

  function decodeQualityData(data) {
    const {data: dataString} = JSON.parse(data);
    const {quality} = JSON.parse(dataString);

    return quality.toString();
  }

  function getQualityLevel() {
    const quality = decodeQualityData(
      localStorage.getItem('yt-player-quality')
    );

    return qualityLevels[quality];
  }

  function setQualityLevel() {
    const quality = getQualityLevel();

    for (const {player} of contentStorage.videos) {
      try {
        const levels = player.getAvailableQualityLevels();
        const qualityLevel =
          levels.length && !levels.includes(quality) ? levels[0] : quality;

        player.setPlaybackQualityRange(qualityLevel, qualityLevel);
      } catch (err) {
        console.log('Could not set video quality:', err.message());
      }
    }
  }

  function limitVideoFps() {
    const isMediaTypeSupported = MediaSource.isTypeSupported;
    MediaSource.isTypeSupported = function (mediaType) {
      if (contentStorage.limitFps) {
        const match = mediaType.match(/framerate=(\d+)/);
        if (match && match[1] > 30) {
          return false;
        }
      }

      return isMediaTypeSupported.apply(this, arguments);
    };
  }

  function getPlayer(video) {
    const players = document.querySelectorAll('.html5-video-player');

    for (const player of players) {
      if (player.contains(video) && player.setPlaybackQualityRange) {
        return player;
      }
    }
  }

  function isSavedVideo(video) {
    for (const item of contentStorage.videos) {
      if (item.video === video) {
        return true;
      }
    }

    return false;
  }

  function addVideo(video, {setQuality = true} = {}) {
    if (!isSavedVideo(video)) {
      const player = getPlayer(video);

      if (player) {
        contentStorage.videos.push({player, video});

        const events = ['play', 'progress', 'ended'];
        for (const event of events) {
          video.addEventListener(event, setQualityLevel);
        }

        if (setQuality) {
          setQualityLevel();
        }
      }
    }
  }

  function removeVideo(video) {
    for (const [index, item] of contentStorage.videos.entries()) {
      if (item.video === video) {
        contentStorage.videos.splice(index, 1);

        const events = ['play', 'progress', 'ended'];
        for (const event of events) {
          video.removeEventListener(event, setQualityLevel);
        }

        return;
      }
    }
  }

  function processVideos() {
    const videos = document.getElementsByTagName('video');
    for (const video of videos) {
      addVideo(video, {setQuality: false});
    }

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeName.toLowerCase() === 'video') {
            addVideo(node);
          }
        });

        mutation.removedNodes.forEach(function (node) {
          if (node.nodeName.toLowerCase() === 'video') {
            removeVideo(node);
          }
        });
      });
    });

    observer.observe(document, {childList: true, subtree: true});
  }

  function detectOptionChanges() {
    const storageSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === localStorage && key === 'yt-player-quality') {
        const dataChanged =
          decodeQualityData(localStorage.getItem('yt-player-quality')) !==
          decodeQualityData(value);

        storageSetItem.apply(this, arguments);

        if (dataChanged) {
          sendContextMessage({id: 'qualityChange'});
        }
      } else {
        storageSetItem.apply(this, arguments);
      }
    };

    document.addEventListener(
      contentStorage.contextEventName,
      onContextMessage
    );
  }

  function sendContextMessage(message) {
    document.dispatchEvent(
      new CustomEvent(contentStorage.contextEventName, {
        detail: JSON.stringify(message)
      })
    );
  }

  function onContextMessage(ev) {
    const message = JSON.parse(ev.detail);

    if (message.id === 'syncState') {
      contentStorage.limitFps = message.limitFps;

      setQualityLevel();
    }
  }

  function init() {
    limitVideoFps();
    processVideos();

    detectOptionChanges();
  }

  init();
}

const scriptFunctions = {mainContext: mainContextScript};

function getScriptFunction(func) {
  return scriptFunctions[func];
}

export {getScriptFunction};
