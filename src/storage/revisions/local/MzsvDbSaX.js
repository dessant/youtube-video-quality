const message = 'Initial version';

const revision = 'MzsvDbSaX';

async function upgrade() {
  const changes = {
    quality: 'hd1080'
  };

  changes.storageVersion = revision;
  return browser.storage.local.set(changes);
}

export {message, revision, upgrade};
