import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { categoryColors, fonts, palette } from '@/constants/design';
import { useLifeItems } from '@/features/life-items/life-items-context';
import { Category, categoryMeta, Recurrence } from '@/features/life-items/life-items-types';
import { addDays, formatIsoDate, parseLocalDate } from '@/features/life-items/life-items-utils';

const templates: { label: string; category: Category; days: number }[] = [
  { label: '濾芯更換', category: 'home', days: 60 },
  { label: '保險續約', category: 'vehicle', days: 365 },
  { label: '免費試用', category: 'money', days: 7 },
  { label: '護照換發', category: 'document', days: 180 },
];

const recurrences: { value: Recurrence; label: string }[] = [
  { value: 'none', label: '不重複' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每 3 個月' },
  { value: 'yearly', label: '每年' },
];

export default function AddScreen() {
  const { addItem } = useLifeItems();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('home');
  const [dueDate, setDueDate] = useState(formatIsoDate(addDays(new Date(), 30)));
  const [reminderDays, setReminderDays] = useState(7);
  const [recurrence, setRecurrence] = useState<Recurrence>('none');

  const pickTemplate = (template: (typeof templates)[number]) => {
    setTitle(template.label);
    setCategory(template.category);
    setDueDate(formatIsoDate(addDays(new Date(), template.days)));
  };

  const setDateFromNow = (days: number) => setDueDate(formatIsoDate(addDays(new Date(), days)));

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('還少一個名稱', '請輸入要提醒的事項。');
      return;
    }
    const parsedDate = parseLocalDate(dueDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || Number.isNaN(parsedDate.getTime()) || formatIsoDate(parsedDate) !== dueDate) {
      Alert.alert('日期格式不正確', '請使用 YYYY-MM-DD，例如 2026-10-03。');
      return;
    }
    await addItem({ title: title.trim(), category, dueDate, reminderDays, recurrence, note: '' });
    router.back();
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12}><Text style={styles.cancel}>取消</Text></Pressable>
          <Text style={styles.modalTitle}>新增事項</Text>
          <Pressable onPress={save} hitSlop={12}><Text style={styles.save}>儲存</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>快速範本</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templates}>
            {templates.map((template) => (
              <Pressable key={template.label} style={styles.template} onPress={() => pickTemplate(template)}>
                <View style={[styles.templateIconBox, { backgroundColor: categoryColors[template.category].tint }]}>
                  <AppIcon name={template.category} size={19} color={categoryColors[template.category].color} />
                </View>
                <Text style={styles.templateText}>{template.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.sectionLabel}>事項名稱</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="例如：Brita 濾芯"
            placeholderTextColor={palette.subtle}
            style={styles.input}
            autoFocus
          />

          <Text style={styles.sectionLabel}>分類</Text>
          <View style={styles.categoryGrid}>
            {(Object.keys(categoryMeta) as Category[]).map((key) => {
              const active = category === key;
              const accent = categoryColors[key];
              return (
                <Pressable
                  key={key}
                  onPress={() => setCategory(key)}
                  style={[styles.category, active && { backgroundColor: accent.tint, borderColor: accent.color }]}>
                  <AppIcon name={key} size={19} color={active ? accent.color : palette.muted} />
                  <Text style={[styles.categoryText, active && { color: accent.color }]}>{categoryMeta[key].label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>到期／處理日期</Text>
          <View style={styles.dateRow}>
            <TextInput
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={styles.dateInput}
            />
            <View style={styles.dateIconWrap}><AppIcon name="calendar" size={20} color={palette.accentDeep} /></View>
          </View>
          <View style={styles.quickDates}>
            <QuickDate label="7 天後" onPress={() => setDateFromNow(7)} />
            <QuickDate label="30 天後" onPress={() => setDateFromNow(30)} />
            <QuickDate label="半年後" onPress={() => setDateFromNow(180)} />
            <QuickDate label="一年後" onPress={() => setDateFromNow(365)} />
          </View>

          <Text style={styles.sectionLabel}>提前提醒</Text>
          <View style={styles.segmentRow}>
            {[1, 3, 7, 14, 30].map((days) => (
              <Pressable key={days} onPress={() => setReminderDays(days)} style={[styles.segment, reminderDays === days && styles.segmentActive]}>
                <Text style={[styles.segmentText, reminderDays === days && styles.segmentTextActive]}>{days} 天</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>週期</Text>
          <View style={styles.recurrencePanel}>
            {recurrences.map((option, index) => (
              <Pressable key={option.value} onPress={() => setRecurrence(option.value)} style={[styles.recurrenceRow, index > 0 && styles.recurrenceDivider]}>
                <Text style={styles.recurrenceText}>{option.label}</Text>
                <View style={[styles.radio, recurrence === option.value && styles.radioActive]}>
                  {recurrence === option.value ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={save} style={styles.primaryButton}><Text style={styles.primaryButtonText}>加入生活清單</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function QuickDate({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.quickDate}><Text style={styles.quickDateText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1 },
  modalHeader: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  modalTitle: { color: palette.ink, fontSize: 17, fontFamily: fonts.display },
  cancel: { color: palette.muted, fontSize: 14, fontFamily: fonts.bodyMedium },
  save: { color: palette.accent, fontSize: 14, fontFamily: fonts.bodyBold },
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: { color: palette.ink, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 21, marginBottom: 10 },
  templates: { gap: 9 },
  template: { width: 108, minHeight: 86, backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1, borderColor: palette.line, padding: 12, justifyContent: 'space-between' },
  templateIconBox: { width: 34, height: 34, borderRadius: 11, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  templateText: { color: palette.ink, fontSize: 12, fontFamily: fonts.bodySemibold },
  input: { height: 56, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16, color: palette.ink, fontSize: 16, fontFamily: fonts.bodyMedium },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { width: '31.7%', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 14, alignItems: 'center', paddingVertical: 12, gap: 6 },
  categoryText: { color: palette.muted, fontSize: 11.5, fontFamily: fonts.bodySemibold },
  dateRow: { flexDirection: 'row', gap: 8 },
  dateInput: { flex: 1, height: 56, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16, color: palette.ink, fontSize: 15, fontFamily: fonts.bodySemibold, letterSpacing: 0.4 },
  dateIconWrap: { width: 56, height: 56, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  quickDates: { flexDirection: 'row', gap: 7, marginTop: 8 },
  quickDate: { flex: 1, height: 34, backgroundColor: palette.surfaceMuted, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickDateText: { color: palette.muted, fontSize: 10, fontFamily: fonts.bodySemibold },
  segmentRow: { flexDirection: 'row', gap: 7 },
  segment: { flex: 1, height: 40, backgroundColor: palette.surface, borderRadius: 12, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  segmentText: { color: palette.muted, fontSize: 11, fontFamily: fonts.bodySemibold },
  segmentTextActive: { color: palette.white },
  recurrencePanel: { backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16 },
  recurrenceRow: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recurrenceDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  recurrenceText: { color: palette.ink, fontSize: 14, fontFamily: fonts.body },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: '#D9C6A6', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: palette.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.accent },
  primaryButton: { height: 56, borderRadius: 16, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  primaryButtonText: { color: palette.white, fontSize: 15, fontFamily: fonts.bodyBold },
});
