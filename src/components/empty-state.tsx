import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { fonts, palette } from '@/constants/design';

export function EmptyState({ message = '目前沒有待處理事項' }: { message?: string }) {
  return (
    <View style={styles.box}>
      <View style={styles.iconBox}><AppIcon name="check" size={22} color={palette.accent} /></View>
      <Text style={styles.title}>都安排好了</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { paddingVertical: 38, alignItems: 'center' },
  iconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { color: palette.ink, fontSize: 15, fontFamily: fonts.bodyBold },
  message: { color: palette.muted, fontSize: 12, marginTop: 6, fontFamily: fonts.body },
});
