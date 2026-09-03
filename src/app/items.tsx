import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { BottomNav } from '@/components/bottom-nav';
import { EmptyState } from '@/components/empty-state';
import { LifeItemCard } from '@/components/life-item-card';
import { categoryColors, fonts, palette } from '@/constants/design';
import { useLifeItems } from '@/features/life-items/life-items-context';
import { Category, categoryMeta } from '@/features/life-items/life-items-types';
import { sortByDueDate } from '@/features/life-items/life-items-utils';

type Filter = 'all' | Category;

export default function ItemsScreen() {
  const { items, completeItem } = useLifeItems();
  const [filter, setFilter] = useState<Filter>('all');
  const visibleItems = useMemo(
    () => items.filter((item) => !item.completedAt && (filter === 'all' || item.category === filter)).sort(sortByDueDate),
    [filter, items],
  );

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.caption}>生活裡的重要小事</Text>
              <Text style={styles.title}>全部事項</Text>
            </View>
            <Pressable
              accessibilityLabel="新增事項"
              onPress={() => router.push('/add')}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
              <AppIcon name="add" size={22} color={palette.white} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            <FilterChip label="全部" active={filter === 'all'} onPress={() => setFilter('all')} />
            {(Object.keys(categoryMeta) as Category[]).map((category) => (
              <FilterChip
                key={category}
                label={categoryMeta[category].label}
                active={filter === category}
                onPress={() => setFilter(category)}
                accent={categoryColors[category]}
              />
            ))}
          </ScrollView>

          <View style={styles.countRow}>
            <Text style={styles.count}>{visibleItems.length} 個進行中事項</Text>
            <AppIcon name="filter" size={15} color={palette.subtle} />
          </View>

          {visibleItems.length ? (
            <View style={styles.listPanel}>
              {visibleItems.map((item, index) => (
                <LifeItemCard
                  key={item.id}
                  item={item}
                  onComplete={completeItem}
                  showDivider={index < visibleItems.length - 1}
                />
              ))}
            </View>
          ) : <EmptyState message="這個分類目前沒有待處理事項" />}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
      <BottomNav active="items" />
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  accent,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accent?: { color: string; tint: string };
}) {
  const activeStyle = active
    ? { backgroundColor: accent?.tint ?? palette.accent, borderColor: accent?.color ?? palette.accent }
    : null;
  const textStyle = active ? { color: accent?.color ?? palette.white } : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.filterChip, activeStyle, pressed && styles.pressed]}>
      <Text style={[styles.filterText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1 },
  content: { paddingTop: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  caption: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodyMedium, marginBottom: 5 },
  title: { color: palette.ink, fontSize: 32, fontFamily: fonts.display },
  addButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.55 },
  filters: { gap: 8, paddingHorizontal: 20, paddingTop: 23, paddingBottom: 22 },
  filterChip: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 16 },
  filterText: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodySemibold },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 10 },
  count: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodyMedium },
  listPanel: {
    marginHorizontal: 20,
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
  bottomSpacer: { height: 120 },
});
