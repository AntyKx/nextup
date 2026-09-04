import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { palette } from '@/constants/design';

export function DateField({ dueDate, onChange }: { dueDate: string | null; onChange: (iso: string) => void }) {
  return (
    <View style={styles.dateRow}>
      {createElement('input', {
        type: 'date',
        value: dueDate ?? '',
        onChange: (event: { target: { value: string } }) => {
          if (event.target.value) onChange(event.target.value);
        },
        style: webDateInputStyle,
      })}
    </View>
  );
}

const webDateInputStyle = {
  flex: 1,
  height: 56,
  borderRadius: 14,
  backgroundColor: palette.surface,
  border: `1px solid ${palette.line}`,
  paddingLeft: 16,
  paddingRight: 16,
  color: palette.ink,
  fontSize: 15,
} as const;

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: 8 },
});
