import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LifeItemForm, LifeItemFormValue } from '@/components/life-item-form';
import { fonts, palette } from '@/constants/design';
import { addDays, formatIsoDate } from '@/features/life-items/date-utils';
import { useLifeItems } from '@/features/life-items/life-items-context';
import { getTemplateById } from '@/features/templates/template-utils';

export default function AddScreen() {
  const { addItem } = useLifeItems();
  const { template: templateId } = useLocalSearchParams<{ template?: string }>();
  const template = templateId ? getTemplateById(templateId) : undefined;

  // A template only prefills the form — Save still requires the user to
  // confirm every field, the real due date most of all (see LifeTemplate).
  const initialValue: LifeItemFormValue | undefined = useMemo(() => {
    if (!template) return undefined;
    return {
      title: template.title,
      category: template.category,
      dueDate: formatIsoDate(addDays(new Date(), template.defaultOffsetDays ?? 30)),
      recurrence: template.recurrence,
      recurrenceMode: template.recurrenceMode,
      note: '',
      reminderDays: template.reminderDays,
    };
  }, [template]);

  const handleSubmit = async (value: LifeItemFormValue) => {
    await addItem(value);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancel}>取消</Text>
          </Pressable>
          <Text style={styles.modalTitle}>新增事項</Text>
          <View style={{ width: 32 }} />
        </View>
        <LifeItemForm
          initialValue={initialValue}
          notePlaceholder={template?.notePlaceholder}
          onSubmit={handleSubmit}
          submitLabel="加入生活清單"
        />
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
});
