import { Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { useCompleteWithUndo } from '@/components/use-complete-with-undo';
import { categoryColors, fonts, palette } from '@/constants/design';
import { daysUntil } from '@/features/life-items/date-utils';
import { useLifeItems } from '@/features/life-items/life-items-context';
import { categoryMeta, CompletionHistoryEntry, recurrenceLabels, recurrenceModeLabels } from '@/features/life-items/life-items-types';
import { formatDisplayDate, formatDueStatus, urgencyMeta } from '@/features/life-items/life-items-utils';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, deleteItem, getCompletionHistory } = useLifeItems();
  const completeWithUndo = useCompleteWithUndo();
  const item = items.find((candidate) => candidate.id === id);
  const [history, setHistory] = useState<CompletionHistoryEntry[]>([]);

  useEffect(() => {
    if (!item) return;
    getCompletionHistory(item.id, 5).then(setHistory);
  }, [item, getCompletionHistory]);

  if (!item) {
    return (
      <View style={styles.page}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Header title="事項詳情" />
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>找不到這個項目，可能已經被刪除了。</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const days = daysUntil(item.dueDate);
  const urgency = urgencyMeta(days);
  const accent = categoryColors[item.category];
  const sortedReminders = [...item.reminders].sort((a, b) => b.daysBefore - a.daysBefore);

  const handleDelete = () => {
    Alert.alert('刪除這個事項？', item.title, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          await deleteItem(item.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Header title="事項詳情" onEdit={() => router.push(`/item/${item.id}/edit` as Href)} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <View style={[styles.iconBox, { backgroundColor: urgency.background }]}>
              <AppIcon name={item.category} size={24} color={urgency.color} />
            </View>
            <View style={styles.titleCopy}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.categoryRow}>
                <View style={[styles.categoryDot, { backgroundColor: accent.color }]} />
                <Text style={styles.categoryLabel}>{categoryMeta[item.category].label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.panel}>
            <Row label="到期日期" value={formatDisplayDate(item.dueDate)} />
            <Divider />
            <Row label="剩餘時間" value={formatDueStatus(days)} valueColor={urgency.color} />
            <Divider />
            <Row label="週期" value={recurrenceLabels[item.recurrence]} />
            {item.recurrence !== 'none' ? (
              <>
                <Divider />
                <Row label="起算方式" value={recurrenceModeLabels[item.recurrenceMode]} />
              </>
            ) : null}
            {item.lastCompletedAt ? (
              <>
                <Divider />
                <Row label="最近完成" value={formatDisplayDate(item.lastCompletedAt.slice(0, 10))} />
              </>
            ) : null}
          </View>

          <Text style={styles.sectionLabel}>提醒</Text>
          <View style={styles.reminderRow}>
            {sortedReminders.length ? (
              sortedReminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderChip}>
                  <Text style={styles.reminderChipText}>{reminder.daysBefore} 天前</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyInline}>沒有設定提醒</Text>
            )}
          </View>

          {item.note ? (
            <>
              <Text style={styles.sectionLabel}>備註</Text>
              <View style={styles.panel}>
                <Text style={styles.noteText}>{item.note}</Text>
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>完成紀錄</Text>
          <View style={styles.panel}>
            {history.length ? (
              history.map((entry, index) => (
                <View key={entry.id}>
                  {index > 0 ? <Divider /> : null}
                  <Row label={formatDisplayDate(entry.scheduledDate)} value={`${formatDisplayDate(entry.completedAt.slice(0, 10))} 完成`} />
                </View>
              ))
            ) : (
              <Text style={styles.emptyInline}>還沒有完成紀錄</Text>
            )}
          </View>

          <View style={styles.actions}>
            {!item.completedAt ? (
              <Pressable
                style={styles.primaryAction}
                onPress={() => {
                  completeWithUndo(item.id);
                }}>
                <AppIcon name="check" size={16} color={palette.white} />
                <Text style={styles.primaryActionText}>完成這次</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryAction} onPress={() => router.push(`/item/${item.id}/edit` as Href)}>
              <AppIcon name="edit" size={16} color={palette.accentDeep} />
              <Text style={styles.secondaryActionText}>編輯</Text>
            </Pressable>
            <Pressable style={styles.dangerAction} onPress={handleDelete}>
              <AppIcon name="trash" size={16} color={palette.danger} />
              <Text style={styles.dangerActionText}>刪除</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Header({ title, onEdit }: { title: string; onEdit?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} hitSlop={12} style={styles.headerButton}>
        <AppIcon name="back" size={20} color={palette.ink} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={12} style={styles.headerButton}>
          <AppIcon name="edit" size={18} color={palette.ink} />
        </Pressable>
      ) : (
        <View style={styles.headerButton} />
      )}
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: palette.ink, fontSize: 15, fontFamily: fonts.bodyBold },
  content: { padding: 20, paddingBottom: 48 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { color: palette.muted, fontSize: 13.5, fontFamily: fonts.body, textAlign: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconBox: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  titleCopy: { flex: 1 },
  title: { color: palette.ink, fontSize: 22, fontFamily: fonts.display, marginBottom: 6 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryDot: { width: 7, height: 7, borderRadius: 3.5 },
  categoryLabel: { color: palette.muted, fontSize: 12.5, fontFamily: fonts.bodySemibold },
  panel: { backgroundColor: palette.surface, borderRadius: 18, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 16 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { color: palette.muted, fontSize: 13, fontFamily: fonts.body },
  rowValue: { color: palette.ink, fontSize: 13.5, fontFamily: fonts.bodySemibold },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line },
  sectionLabel: { color: palette.ink, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 22, marginBottom: 10 },
  reminderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reminderChip: { height: 32, paddingHorizontal: 13, borderRadius: 11, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  reminderChipText: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodySemibold },
  emptyInline: { color: palette.subtle, fontSize: 12.5, fontFamily: fonts.body, paddingVertical: 16, paddingHorizontal: 2 },
  noteText: { color: palette.ink, fontSize: 13.5, fontFamily: fonts.body, lineHeight: 20, paddingVertical: 14 },
  actions: { marginTop: 28, gap: 10 },
  primaryAction: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 16, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: palette.white, fontSize: 14.5, fontFamily: fonts.bodyBold },
  secondaryAction: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 16, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: palette.accentDeep, fontSize: 14.5, fontFamily: fonts.bodyBold },
  dangerAction: { flexDirection: 'row', gap: 8, height: 52, borderRadius: 16, borderWidth: 1, borderColor: '#E9C9BC', alignItems: 'center', justifyContent: 'center' },
  dangerActionText: { color: palette.danger, fontSize: 14.5, fontFamily: fonts.bodyBold },
});
