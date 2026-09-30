import * as DocumentPicker from 'expo-document-picker';

export async function saveBackupFile(fileName: string, json: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoke on the next tick — revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', '.json'], multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file.text();
  return (await fetch(asset.uri)).text();
}
