import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifeItemForm, LifeItemFormValue } from '@/components/life-item-form';
import { fonts, palette } from '@/constants/design';
import { useLifeItems } from '@/features/life-items/life-items-context';

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, updateItem } = useLifeItems();
  const item = items.find((candidate) => candidate.id === id);

  const handleSubmit = async (value: LifeItemFormValue) => {
    if (!item) return;
    await updateItem(item.id, value);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancel}>取消</Text>
          </Pressable>
          <Text style={styles.modalTitle}>編輯事項</Text>
          <View style={{ width: 32 }} />
        </View>
        {item ? (
          <LifeItemForm
            isEditing
            initialValue={{
              title: item.title,
              category: item.category,
              dueDate: item.dueDate,
              recurrence: item.recurrence,
              recurrenceMode: item.recurrenceMode,
              note: item.note,
              reminderDays: item.reminders.map((reminder) => reminder.daysBefore),
            }}
            onSubmit={handleSubmit}
            submitLabel="儲存"
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>找不到這個項目，可能已經被刪除了。</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1 },
  modalHeader: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  modalTitle: { color: palette.ink, fontSize: 17, fontFamily: fonts.display },
  cancel: { color: palette.muted, fontSize: 14, fontFamily: fonts.bodyMedium },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: palette.muted, fontSize: 13.5, fontFamily: fonts.body, textAlign: 'center' },
});
