const targetEnv = process.env.TARGET_ENV;

const enableContributions = process.env.ENABLE_CONTRIBUTIONS === 'true';

const storageRevisions = {
  local: process.env.STORAGE_REVISION_LOCAL,
  session: process.env.STORAGE_REVISION_SESSION
};

const appVersion = process.env.APP_VERSION;

const mv3 = process.env.MV3 === 'true';

export {targetEnv, enableContributions, storageRevisions, appVersion, mv3};
