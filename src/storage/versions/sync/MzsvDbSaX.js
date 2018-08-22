import browser from 'webextension-polyfill';

const message = 'Initial version';

const revision = 'MzsvDbSaX';
const downRevision = null;

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {
    quality: 'hd1080'
  };

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  return storage.clear();
}

export {message, revision, upgrade, downgrade};
