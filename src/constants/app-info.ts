import Constants from 'expo-constants';

/** Single source for the version shown in Settings and stamped into backups — read from app.json so it can't drift. */
export const appVersion = Constants.expoConfig?.version ?? '0.0.0';
