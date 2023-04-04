const message = 'Add installTime and limitFps';

const revision = 'Cpxcw8B9y';

async function upgrade() {
  const changes = {installTime: new Date().getTime(), limitFps: false};

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
