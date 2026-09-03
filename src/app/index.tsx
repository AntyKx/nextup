import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { BottomNav } from '@/components/bottom-nav';
import { EmptyState } from '@/components/empty-state';
import { LifeItemCard } from '@/components/life-item-card';
import { useCompleteWithUndo } from '@/components/use-complete-with-undo';
import { fonts, palette } from '@/constants/design';
import { useLifeItems } from '@/features/life-items/life-items-context';
import { daysUntil, formatDueStatus, sortByDueDate } from '@/features/life-items/life-items-utils';

function todayLabel() {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
}

export default function HomeScreen() {
  const { items, isLoading, error } = useLifeItems();
  const completeWithUndo = useCompleteWithUndo();
  const activeItems = useMemo(() => items.filter((item) => !item.completedAt).sort(sortByDueDate), [items]);
  const overdueItems = activeItems.filter((item) => daysUntil(item.dueDate) < 0);
  const upcomingItems = activeItems.filter((item) => {
    const days = daysUntil(item.dueDate);
    return days >= 0 && days <= 30;
  });
  const previewItems = activeItems.slice(0, 4);
  const nearest = activeItems[0];

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={palette.accent} /></View>;
  }

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View>
              <Text style={styles.date}>{todayLabel()}</Text>
              <Text style={styles.title}>今天</Text>
            </View>
            <Pressable
              accessibilityLabel="設定"
              onPress={() => router.push('/settings')}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
              <AppIcon name="settings" size={21} color={palette.ink} />
            </Pressable>
          </View>

          <Text style={styles.intro}>把該續、該換、該處理的事，安穩地放在這裡。</Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.overview}>
            <View style={styles.overviewTop}>
              <View style={styles.overviewIcon}>
                <AppIcon name="calendar" size={23} color={palette.accentDeep} />
              </View>
              <Text style={styles.overviewLabel}>接下來 30 天</Text>
              <Pressable onPress={() => router.push('/items')} hitSlop={10}>
                <AppIcon name="chevron" size={16} color={palette.muted} />
              </Pressable>
            </View>
            <View style={styles.overviewMain}>
              <Text style={styles.overviewNumber}>{upcomingItems.length}</Text>
              <Text style={styles.overviewUnit}>件待處理事項</Text>
            </View>
            {overdueItems.length > 0 ? (
              <Text style={styles.overdueText}>已逾期 {overdueItems.length} 項，優先處理一下吧</Text>
            ) : null}
            <View style={styles.overviewDivider} />
            <Text style={styles.nearestLabel}>最近一項</Text>
            <Text style={styles.nearestText} numberOfLines={1}>
              {nearest ? `${nearest.title} · ${formatDueStatus(daysUntil(nearest.dueDate))}` : '目前沒有待處理事項'}
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>接下來</Text>
            <Pressable onPress={() => router.push('/items')} hitSlop={10}>
              <Text style={styles.seeAll}>查看全部</Text>
            </Pressable>
          </View>

          {previewItems.length ? (
            <View style={styles.listPanel}>
              {previewItems.map((item, index) => (
                <LifeItemCard
                  key={item.id}
                  item={item}
                  onComplete={completeWithUndo}
                  showDivider={index < previewItems.length - 1}
                />
              ))}
            </View>
          ) : <EmptyState />}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="新增事項"
        onPress={() => router.push('/add')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
        <AppIcon name="add" size={25} color={palette.white} />
      </Pressable>
      <BottomNav active="today" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodySemibold, marginBottom: 5 },
  title: { color: palette.ink, fontSize: 34, fontFamily: fonts.display, letterSpacing: 0 },
  iconButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.55 },
  intro: { color: palette.muted, fontSize: 14, lineHeight: 21, fontFamily: fonts.body, marginTop: 12, marginBottom: 24 },
  errorBanner: { backgroundColor: '#F6E1D6', borderRadius: 14, padding: 14, marginBottom: 16 },
  errorText: { color: palette.danger, fontSize: 12.5, fontFamily: fonts.bodyMedium },
  overview: {
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: '#7A4423',
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  overviewTop: { flexDirection: 'row', alignItems: 'center' },
  overviewIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  overviewLabel: { color: palette.muted, fontSize: 13, fontFamily: fonts.bodyBold, flex: 1 },
  overviewMain: { flexDirection: 'row', alignItems: 'baseline', marginTop: 16 },
  overviewNumber: { color: palette.ink, fontSize: 42, lineHeight: 46, fontFamily: fonts.display },
  overviewUnit: { color: palette.ink, fontSize: 14.5, fontFamily: fonts.bodySemibold, marginLeft: 8 },
  overdueText: { color: palette.danger, fontSize: 12.5, fontFamily: fonts.bodySemibold, marginTop: 10 },
  overviewDivider: { height: 1, backgroundColor: palette.line, marginVertical: 16 },
  nearestLabel: { color: palette.muted, fontSize: 11, fontFamily: fonts.body, marginBottom: 4 },
  nearestText: { color: palette.accent, fontSize: 14, fontFamily: fonts.bodyBold },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 10 },
  sectionTitle: { color: palette.ink, fontSize: 21, fontFamily: fonts.display },
  seeAll: { color: palette.accent, fontSize: 12, fontFamily: fonts.bodyBold },
  listPanel: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: palette.line,
    shadowColor: '#7A4423',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  bottomSpacer: { height: 150 },
  fab: { position: 'absolute', right: 20, bottom: 88, width: 54, height: 54, borderRadius: 27, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', shadowColor: '#7A4423', shadowOpacity: 0.32, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  fabPressed: { transform: [{ scale: 0.95 }], opacity: 0.9 },
});
