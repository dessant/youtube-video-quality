const optionKeys = ['quality', 'limitFps', 'appTheme', 'showContribPage'];

// https://developers.google.com/youtube/iframe_api_reference#Events
// localStorage yt-player-quality: IFrame player API onPlaybackQualityChange
const qualityLevels = {
  '4320': 'highres',
  '2160': 'hd2160',
  '1440': 'hd1440',
  '1080': 'hd1080',
  '720': 'hd720',
  '480': 'large',
  '360': 'medium',
  '240': 'small',
  '144': 'tiny',
  '0': 'auto'
};

const youtubeOriginRx = /^https:\/\/www\.(?:youtube|youtube-nocookie)\.com$/;

export {optionKeys, qualityLevels, youtubeOriginRx};
