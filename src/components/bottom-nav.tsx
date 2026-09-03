import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, AppIconName } from '@/components/app-icon';
import { fonts, palette } from '@/constants/design';

type Tab = 'today' | 'items' | 'settings';

const tabs: { key: Tab; label: string; icon: AppIconName; route: '/' | '/items' | '/settings' }[] = [
  { key: 'today', label: '今天', icon: 'today', route: '/' },
  { key: 'items', label: '事項', icon: 'list', route: '/items' },
  { key: 'settings', label: '設定', icon: 'settings', route: '/settings' },
];

export function BottomNav({ active }: { active: Tab }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 9) }]}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.replace(tab.route)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <AppIcon name={tab.icon} size={22} color={selected ? palette.accent : palette.subtle} />
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 72,
    paddingTop: 10,
    flexDirection: 'row',
    backgroundColor: 'rgba(251,245,234,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pressed: { opacity: 0.55 },
  label: { color: palette.subtle, fontSize: 10, fontFamily: fonts.bodySemibold },
  labelActive: { color: palette.accent, fontFamily: fonts.bodyBold },
});
