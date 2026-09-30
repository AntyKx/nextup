/** Platform file I/O for backups — `.native.ts` uses the share sheet + document picker, `.web.ts` a browser download + file picker. */

/** Hands the backup to the user to keep. Resolves once the share sheet / download has been triggered. */
export function saveBackupFile(fileName: string, json: string): Promise<void>;

/** Lets the user pick a backup file and returns its text, or null if they cancelled. */
export function pickBackupFile(): Promise<string | null>;
