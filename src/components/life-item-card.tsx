import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { categoryColors, fonts, palette } from '@/constants/design';
import { categoryMeta, LifeItem, recurrenceLabels } from '@/features/life-items/life-items-types';
import { daysUntil, formatDisplayDate, urgencyMeta } from '@/features/life-items/life-items-utils';

export function LifeItemCard({
  item,
  onComplete,
  showDivider = true,
}: {
  item: LifeItem;
  onComplete: (id: string) => Promise<void>;
  showDivider?: boolean;
}) {
  const days = daysUntil(item.dueDate);
  const urgency = urgencyMeta(days);

  return (
    <View style={[styles.row, showDivider && styles.divider]}>
      <View style={[styles.iconBox, { backgroundColor: urgency.background }]}>
        <AppIcon name={item.category} size={20} color={urgency.color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <View style={styles.metaRow}>
          <View style={[styles.categoryDot, { backgroundColor: categoryColors[item.category].color }]} />
          <Text style={styles.meta}>{categoryMeta[item.category].label} · {formatDisplayDate(item.dueDate)}</Text>
          {item.recurrence !== 'none' ? (
            <View style={styles.repeatRow}>
              <AppIcon name="repeat" size={11} color={palette.muted} />
              <Text style={styles.repeatText}>{recurrenceLabels[item.recurrence].replace('更新', '')}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.countdown}>
        <Text style={[styles.dayNumber, { color: urgency.color }]}>{days < 0 ? Math.abs(days) : days}</Text>
        <Text style={styles.dayLabel}>{days < 0 ? '逾期' : days === 0 ? '今天' : '天'}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`完成 ${item.title}`}
        onPress={() => onComplete(item.id)}
        hitSlop={8}
        style={({ pressed }) => [styles.check, pressed && styles.checkPressed]}>
        <AppIcon name="check" size={14} color={palette.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 84, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  iconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  copy: { flex: 1, paddingRight: 10 },
  title: { color: palette.ink, fontSize: 15, fontFamily: fonts.bodyBold, letterSpacing: -0.15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 6 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  meta: { color: palette.muted, fontSize: 11.5, fontFamily: fonts.body },
  repeatRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  repeatText: { color: palette.muted, fontSize: 10.5, fontFamily: fonts.body },
  countdown: { width: 42, alignItems: 'flex-end', marginRight: 12 },
  dayNumber: { fontSize: 20, fontFamily: fonts.display, lineHeight: 22, letterSpacing: -0.2 },
  dayLabel: { color: palette.subtle, fontSize: 10, marginTop: 2, fontFamily: fonts.body },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#D9C6A6', alignItems: 'center', justifyContent: 'center' },
  checkPressed: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
});
