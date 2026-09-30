import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function saveBackupFile(fileName: string, json: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('backup-file: sharing is not available on this device');
  // Written to the cache dir only as a hand-off to the share sheet — the
  // copy the user actually keeps is wherever they send it (Drive, LINE, Files).
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: '儲存 NextUp 備份' });
}

export async function pickBackupFile(): Promise<string | null> {
  // '*/*' rather than 'application/json': cloud drives and chat apps often
  // re-label a downloaded .json as octet-stream/plain text, which would grey
  // the user's own backup out in the picker. parseBackup validates content anyway.
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  return new File(result.assets[0].uri).text();
}
