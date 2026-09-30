import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, AppIconName } from '@/components/app-icon';
import { fonts, palette } from '@/constants/design';

type Tab = 'today' | 'items' | 'settings';

const tabs: { key: Tab; label: string; icon: AppIconName; route: '/' | '/items' | '/settings' }[] = [
  { key: 'today', label: '今天', icon: 'today', route: '/' },
  { key: 'items', label: '事項', icon: 'list', route: '/items' },
  { key: 'settings', label: '設定', icon: 'settings', route: '/settings' },
];

/** Pill that slides behind the selected tab — ported from 小熊記帳's `main-nav.tsx` sliding indicator, re-done with Reanimated since this is React Native, not CSS. */
function SlidingIndicator({ index, trackWidth }: { index: number; trackWidth: number }) {
  const tabWidth = trackWidth / tabs.length;
  const translateX = useSharedValue(index * tabWidth);

  useEffect(() => {
    translateX.value = withTiming(index * tabWidth, { duration: 220 });
  }, [index, tabWidth, translateX]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  if (!trackWidth) return null;
  return <Animated.View pointerEvents="none" style={[styles.indicator, { width: tabWidth }, style]} />;
}

export function BottomNav({ active }: { active: Tab }) {
  const insets = useSafeAreaInsets();
  const [trackWidth, setTrackWidth] = useState(0);
  const activeIndex = tabs.findIndex((tab) => tab.key === active);

  return (
    <View
      style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 9) }]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}>
      <SlidingIndicator index={activeIndex} trackWidth={trackWidth} />
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => router.replace(tab.route)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <AppIcon name={tab.icon} size={22} color={selected ? palette.accentDeep : palette.subtle} />
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
    backgroundColor: 'rgba(255,253,248,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.line,
  },
  indicator: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    borderRadius: 16,
    backgroundColor: palette.accentSoft,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pressed: { opacity: 0.55 },
  label: { color: palette.subtle, fontSize: 10, fontFamily: fonts.bodySemibold },
  labelActive: { color: palette.accentDeep, fontFamily: fonts.bodyBold },
});
