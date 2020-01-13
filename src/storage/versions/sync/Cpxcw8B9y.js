import browser from 'webextension-polyfill';

const message = 'Add installTime and limitFps';

const revision = 'Cpxcw8B9y';
const downRevision = 'MzsvDbSaX';

const storage = browser.storage.sync;

async function upgrade() {
  const changes = {installTime: new Date().getTime(), limitFps: false};

  changes.storageVersion = revision;
  return storage.set(changes);
}

async function downgrade() {
  const changes = {};
  await storage.remove(['installTime', 'limitFps']);

  changes.storageVersion = downRevision;
  return storage.set(changes);
}

export {message, revision, upgrade, downgrade};
