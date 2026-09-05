import { Href, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/app-icon';
import { categoryColors, fonts, palette } from '@/constants/design';
import { Category, categoryMeta } from '@/features/life-items/life-items-types';
import { getTemplatesByCategory } from '@/features/templates/template-utils';
import { LifeTemplate } from '@/features/templates/template-types';

type Filter = 'all' | Category;

export default function TemplatesScreen() {
  const [filter, setFilter] = useState<Filter>('all');
  const templates = useMemo(() => getTemplatesByCategory(filter), [filter]);
  // Arriving from an in-progress Add screen (which already `replace`d
  // itself with this one) means picking a template should replace this
  // screen with the new Add instance too — never push, or the two Add
  // visits would stack into two modals.
  const { source } = useLocalSearchParams<{ source?: string }>();
  const fromAdd = source === 'add';

  const selectTemplate = (id: string) => {
    const href = `/add?template=${id}` as Href;
    if (fromAdd) router.replace(href);
    else router.push(href);
  };

  // Arriving via `replace` from Add means this screen has no Add instance
  // left underneath it — a plain back() would skip past Add entirely (to
  // whatever was open before it, e.g. Home). Replacing back to a blank Add
  // keeps "cancel out of browsing templates" landing on Add either way.
  const goBack = () => {
    if (fromAdd) router.replace('/add');
    else router.back();
  };

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={goBack} hitSlop={12} style={styles.headerButton}>
            <AppIcon name="back" size={20} color={palette.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>生活情境</Text>
          <View style={styles.headerButton} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>把容易忘記的事先放進來</Text>

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

          <View style={styles.listPanel}>
            {templates.map((template, index) => (
              <View key={template.id}>
                {index > 0 ? <View style={styles.divider} /> : null}
                <TemplateRow template={template} onPress={() => selectTemplate(template.id)} />
              </View>
            ))}
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function TemplateRow({ template, onPress }: { template: LifeTemplate; onPress: () => void }) {
  const accent = categoryColors[template.category];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`使用「${template.title}」範本`}
      onPress={onPress}
      style={styles.templateRow}>
      <View style={[styles.templateIconBox, { backgroundColor: accent.tint }]}>
        <AppIcon name={template.category} size={20} color={accent.color} />
      </View>
      <View style={styles.templateCopy}>
        <Text style={styles.templateTitle}>{template.title}</Text>
        <Text style={styles.templateDescription} numberOfLines={2}>{template.description}</Text>
      </View>
      <AppIcon name="chevron" size={14} color={palette.subtle} />
    </Pressable>
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
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.line },
  headerButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: palette.ink, fontSize: 15, fontFamily: fonts.bodyBold },
  content: { paddingHorizontal: 20, paddingTop: 18 },
  subtitle: { color: palette.muted, fontSize: 13, fontFamily: fonts.body, marginBottom: 16 },
  pressed: { opacity: 0.55 },
  filters: { gap: 8, paddingBottom: 20 },
  filterChip: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 16 },
  filterText: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodySemibold },
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
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line },
  templateRow: { minHeight: 78, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
  templateIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  templateCopy: { flex: 1, paddingRight: 10 },
  templateTitle: { color: palette.ink, fontSize: 14.5, fontFamily: fonts.bodyBold, marginBottom: 4 },
  templateDescription: { color: palette.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
  bottomSpacer: { height: 40 },
});
