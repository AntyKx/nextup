import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { DateField } from '@/components/date-field';
import { categoryColors, fonts, palette } from '@/constants/design';
import { addDays, formatIsoDate } from '@/features/life-items/date-utils';
import {
  Category,
  categoryMeta,
  NewLifeItemInput,
  Recurrence,
  RecurrenceMode,
  recurrenceModeLabels,
} from '@/features/life-items/life-items-types';

const templates: { label: string; category: Category; days: number }[] = [
  { label: '濾芯更換', category: 'home', days: 60 },
  { label: '保險續約', category: 'vehicle', days: 365 },
  { label: '免費試用', category: 'money', days: 7 },
  { label: '護照換發', category: 'document', days: 180 },
];

const recurrenceOptions: { value: Recurrence; label: string }[] = [
  { value: 'none', label: '不重複' },
  { value: 'monthly', label: '每月' },
  { value: 'quarterly', label: '每 3 個月' },
  { value: 'yearly', label: '每年' },
];

const recurrenceModeOptions: { value: RecurrenceMode; label: string }[] = [
  { value: 'fixed_schedule', label: recurrenceModeLabels.fixed_schedule },
  { value: 'from_completion', label: recurrenceModeLabels.from_completion },
];

const presetReminderDays = [1, 3, 7, 14, 30];

export type LifeItemFormValue = NewLifeItemInput;

export function LifeItemForm({
  initialValue,
  onSubmit,
  submitLabel,
  isEditing = false,
}: {
  initialValue?: LifeItemFormValue;
  onSubmit: (value: LifeItemFormValue) => Promise<void>;
  submitLabel: string;
  isEditing?: boolean;
}) {
  const [title, setTitle] = useState(initialValue?.title ?? '');
  const [category, setCategory] = useState<Category>(initialValue?.category ?? 'home');
  const [dueDate, setDueDate] = useState(initialValue?.dueDate ?? formatIsoDate(addDays(new Date(), 30)));
  const [reminderDays, setReminderDays] = useState<number[]>(initialValue?.reminderDays ?? [7]);
  const [customReminderInput, setCustomReminderInput] = useState('');
  const [showCustomReminderInput, setShowCustomReminderInput] = useState(false);
  const [recurrence, setRecurrence] = useState<Recurrence>(initialValue?.recurrence ?? 'none');
  const [recurrenceMode, setRecurrenceMode] = useState<RecurrenceMode>(initialValue?.recurrenceMode ?? 'fixed_schedule');
  const [note, setNote] = useState(initialValue?.note ?? '');
  const [showMoreSettings, setShowMoreSettings] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedReminderDays = useMemo(() => [...reminderDays].sort((a, b) => a - b), [reminderDays]);

  const pickTemplate = (template: (typeof templates)[number]) => {
    setTitle(template.label);
    setCategory(template.category);
    setDueDate(formatIsoDate(addDays(new Date(), template.days)));
  };

  const setDateFromNow = (days: number) => setDueDate(formatIsoDate(addDays(new Date(), days)));

  const toggleReminderDay = (days: number) => {
    setReminderDays((current) => (current.includes(days) ? current.filter((d) => d !== days) : [...current, days]));
  };

  const addCustomReminderDay = () => {
    const days = Number(customReminderInput);
    if (Number.isFinite(days) && days > 0 && !reminderDays.includes(days)) {
      setReminderDays((current) => [...current, days]);
    }
    setCustomReminderInput('');
    setShowCustomReminderInput(false);
  };

  const save = async () => {
    if (isSubmitting) return;
    if (!title.trim()) {
      Alert.alert('還少一個名稱', '請輸入要提醒的事項。');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        category,
        dueDate,
        recurrence,
        recurrenceMode,
        note,
        reminderDays: sortedReminderDays.length ? sortedReminderDays : [7],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!isEditing ? (
        <>
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
        </>
      ) : null}

      <Text style={styles.sectionLabel}>事項名稱</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="例如：Brita 濾芯"
        placeholderTextColor={palette.subtle}
        style={styles.input}
      />

      <Text style={styles.sectionLabel}>到期／處理日期</Text>
      <DateField dueDate={dueDate} onChange={setDueDate} />
      <View style={styles.quickDates}>
        <QuickDate label="7 天後" onPress={() => setDateFromNow(7)} />
        <QuickDate label="30 天後" onPress={() => setDateFromNow(30)} />
        <QuickDate label="半年後" onPress={() => setDateFromNow(180)} />
        <QuickDate label="一年後" onPress={() => setDateFromNow(365)} />
      </View>

      <Text style={styles.sectionLabel}>提前提醒</Text>
      <View style={styles.chipRow}>
        {presetReminderDays.map((days) => {
          const active = reminderDays.includes(days);
          return (
            <Pressable key={days} onPress={() => toggleReminderDay(days)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{days} 天</Text>
            </Pressable>
          );
        })}
        {reminderDays
          .filter((days) => !presetReminderDays.includes(days))
          .map((days) => (
            <Pressable key={days} onPress={() => toggleReminderDay(days)} style={[styles.chip, styles.chipActive]}>
              <Text style={[styles.chipText, styles.chipTextActive]}>{days} 天</Text>
            </Pressable>
          ))}
        {showCustomReminderInput ? (
          <View style={styles.customReminderRow}>
            <TextInput
              value={customReminderInput}
              onChangeText={setCustomReminderInput}
              placeholder="天數"
              placeholderTextColor={palette.subtle}
              keyboardType="number-pad"
              style={styles.customReminderInput}
              autoFocus
              onSubmitEditing={addCustomReminderDay}
            />
            <Pressable onPress={addCustomReminderDay} style={styles.customReminderConfirm}>
              <AppIcon name="check" size={14} color={palette.white} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setShowCustomReminderInput(true)} style={styles.chip}>
            <Text style={styles.chipText}>＋ 自訂</Text>
          </Pressable>
        )}
      </View>

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

      <Pressable style={styles.moreSettingsHeader} onPress={() => setShowMoreSettings((current) => !current)}>
        <Text style={styles.moreSettingsLabel}>更多設定</Text>
        <View style={{ transform: [{ rotate: showMoreSettings ? '90deg' : '0deg' }] }}>
          <AppIcon name="chevron" size={14} color={palette.muted} />
        </View>
      </Pressable>

      {showMoreSettings ? (
        <>
          <Text style={styles.sectionLabel}>週期</Text>
          <View style={styles.recurrencePanel}>
            {recurrenceOptions.map((option, index) => (
              <Pressable key={option.value} onPress={() => setRecurrence(option.value)} style={[styles.recurrenceRow, index > 0 && styles.recurrenceDivider]}>
                <Text style={styles.recurrenceText}>{option.label}</Text>
                <View style={[styles.radio, recurrence === option.value && styles.radioActive]}>
                  {recurrence === option.value ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            ))}
          </View>

          {recurrence !== 'none' ? (
            <>
              <Text style={styles.sectionLabel}>週期起算方式</Text>
              <View style={styles.recurrencePanel}>
                {recurrenceModeOptions.map((option, index) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setRecurrenceMode(option.value)}
                    style={[styles.recurrenceRow, index > 0 && styles.recurrenceDivider]}>
                    <Text style={styles.recurrenceText}>{option.label}</Text>
                    <View style={[styles.radio, recurrenceMode === option.value && styles.radioActive]}>
                      {recurrenceMode === option.value ? <View style={styles.radioDot} /> : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>備註</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="想記下的細節（選填）"
            placeholderTextColor={palette.subtle}
            style={[styles.input, styles.noteInput]}
            multiline
          />
        </>
      ) : null}

      <Pressable onPress={save} disabled={isSubmitting} style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}>
        {isSubmitting ? <ActivityIndicator color={palette.white} /> : <Text style={styles.primaryButtonText}>{submitLabel}</Text>}
      </Pressable>
    </ScrollView>
  );
}

function QuickDate({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.quickDate}>
      <Text style={styles.quickDateText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  sectionLabel: { color: palette.ink, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 21, marginBottom: 10 },
  templates: { gap: 9 },
  template: { width: 108, minHeight: 86, backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1, borderColor: palette.line, padding: 12, justifyContent: 'space-between' },
  templateIconBox: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  templateText: { color: palette.ink, fontSize: 12, fontFamily: fonts.bodySemibold },
  input: { height: 56, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16, color: palette.ink, fontSize: 16, fontFamily: fonts.bodyMedium },
  noteInput: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { width: '31.7%', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 14, alignItems: 'center', paddingVertical: 12, gap: 6 },
  categoryText: { color: palette.muted, fontSize: 11.5, fontFamily: fonts.bodySemibold },
  quickDates: { flexDirection: 'row', gap: 7, marginTop: 8 },
  quickDate: { flex: 1, height: 34, backgroundColor: palette.surfaceMuted, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  quickDateText: { color: palette.muted, fontSize: 10, fontFamily: fonts.bodySemibold },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 12, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
  chipText: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodySemibold },
  chipTextActive: { color: palette.white },
  customReminderRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  customReminderInput: { width: 64, height: 36, borderRadius: 12, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 10, color: palette.ink, fontSize: 12, fontFamily: fonts.bodySemibold },
  customReminderConfirm: { width: 36, height: 36, borderRadius: 12, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  moreSettingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  moreSettingsLabel: { color: palette.ink, fontSize: 13.5, fontFamily: fonts.bodySemibold },
  recurrencePanel: { backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16 },
  recurrenceRow: { minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recurrenceDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.line },
  recurrenceText: { color: palette.ink, fontSize: 14, fontFamily: fonts.body },
  radio: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: '#D9C6A6', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: palette.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: palette.accent },
  primaryButton: { height: 56, borderRadius: 16, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: palette.white, fontSize: 15, fontFamily: fonts.bodyBold },
});
