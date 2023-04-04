import {convertQualityValue} from 'utils/app';
import {getDayPrecisionEpoch} from 'utils/common';

const message = 'Add theme support';

const revision = '20230401082834_add_theme_support';

async function upgrade() {
  const changes = {
    appTheme: 'auto', // auto, light, dark
    showContribPage: true,
    contribPageLastOpen: 0,
    contribPageLastAutoOpen: 0,
    useCount: 0
  };

  let {installTime, quality} = await browser.storage.local.get([
    'installTime',
    'quality'
  ]);

  changes.installTime = getDayPrecisionEpoch(installTime);

  if (quality === 'hd2880') {
    quality = 'hd2160';
  }
  changes.quality = convertQualityValue(quality, {from: 'api'});

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
