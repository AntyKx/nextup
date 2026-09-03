import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { palette, fonts } from '@/constants/design';
import { formatIsoDate, parseLocalDate } from '@/features/life-items/date-utils';

export function DateField({ dueDate, onChange }: { dueDate: string; onChange: (iso: string) => void }) {
  const [showIosPicker, setShowIosPicker] = useState(false);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseLocalDate(dueDate),
        mode: 'date',
        onChange: (_event, selectedDate) => {
          if (selectedDate) onChange(formatIsoDate(selectedDate));
        },
      });
    } else {
      setShowIosPicker((current) => !current);
    }
  };

  return (
    <View>
      <Pressable onPress={open} style={styles.dateRow}>
        <View style={styles.dateInput}>
          <Text style={styles.dateInputText}>{dueDate}</Text>
        </View>
        <View style={styles.dateIconWrap}>
          <AppIcon name="calendar" size={20} color={palette.accentDeep} />
        </View>
      </Pressable>
      {showIosPicker && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={parseLocalDate(dueDate)}
          mode="date"
          display="spinner"
          onChange={(_event, selectedDate) => {
            if (selectedDate) onChange(formatIsoDate(selectedDate));
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, height: 56, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16, justifyContent: 'center' },
  dateInputText: { color: palette.ink, fontSize: 15, fontFamily: fonts.bodySemibold, letterSpacing: 0.4 },
  dateIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
});
