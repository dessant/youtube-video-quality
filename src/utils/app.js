import browser from 'webextension-polyfill';

import {getText} from 'utils/common';

function prepareQualityData(quality) {
  const epoch = Date.now();
  const data = {
    data: "{\"quality\":"+quality+",\"previousQuality\":0}",
    expiration: epoch + 60 * 60 * 24 * 30 * 1000, // one month
    creation: epoch,
  };
  return JSON.stringify(data);
}

function getOptionLabels(data, scope = 'optionValue') {
  const labels = {};
  for (const [group, items] of Object.entries(data)) {
    labels[group] = [];
    items.forEach(function(value) {
      labels[group].push({
        id: value,
        label: getText(`${scope}_${group}_${value}`)
      });
    });
  }
  return labels;
}

export {prepareQualityData, getOptionLabels};
