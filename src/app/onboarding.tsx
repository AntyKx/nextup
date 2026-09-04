import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, AppIconName } from '@/components/app-icon';
import { fonts, palette } from '@/constants/design';
import { useLifeItems } from '@/features/life-items/life-items-context';

type OnboardingScreenContent = {
  icon: AppIconName;
  title: string;
  subtitle: string;
  examples?: string[];
};

const screens: OnboardingScreenContent[] = [
  {
    icon: 'calendar',
    title: '有些事，不需要現在做。',
    subtitle: '但到了那一天，你一定不想忘記。',
  },
  {
    icon: 'repeat',
    title: '把生活週期交給 NextUp',
    subtitle: '到期、續約、更換、保養，\n時間到了再提醒你。',
    examples: ['護照', '保險', '濾芯', '訂閱', '保固', '保養'],
  },
  {
    icon: 'check',
    title: '先放進來，就可以忘記了',
    subtitle: 'NextUp 會記得你的下一次。',
  },
];

export default function OnboardingScreen() {
  const { setOnboardingCompleted } = useLifeItems();
  const [page, setPage] = useState(0);
  const isLast = page === screens.length - 1;
  const current = screens[page];

  // Onboarding never requests the OS notification permission itself — doing
  // that before the user has any reason to want it just trains them to tap
  // "Deny". Settings (or a future in-context prompt) is where that belongs.
  const finish = async () => {
    await setOnboardingCompleted(true);
    router.replace('/');
  };

  return (
    <View style={styles.page}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.skipRow}>
          {!isLast ? (
            <Pressable accessibilityRole="button" accessibilityLabel="略過導覽" onPress={finish} hitSlop={12}>
              <Text style={styles.skipText}>略過</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.iconBox}>
            <AppIcon name={current.icon} size={38} color={palette.accentDeep} />
          </View>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.subtitle}>{current.subtitle}</Text>
          {current.examples ? (
            <View style={styles.exampleRow}>
              {current.examples.map((example) => (
                <View key={example} style={styles.exampleChip}>
                  <Text style={styles.exampleText}>{example}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.dotsRow}>
          {screens.map((_, index) => (
            <View key={index} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isLast ? '開始整理生活' : '繼續'}
          onPress={() => (isLast ? finish() : setPage((current) => current + 1))}
          style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>{isLast ? '開始整理生活' : '繼續'}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1, paddingHorizontal: 28 },
  skipRow: { height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { color: palette.muted, fontSize: 13.5, fontFamily: fonts.bodyMedium },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 76, height: 76, borderRadius: 38, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { color: palette.ink, fontSize: 24, fontFamily: fonts.display, textAlign: 'center', marginBottom: 12 },
  subtitle: { color: palette.muted, fontSize: 14.5, lineHeight: 22, fontFamily: fonts.body, textAlign: 'center' },
  exampleRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 24 },
  exampleChip: { backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  exampleText: { color: palette.ink, fontSize: 12.5, fontFamily: fonts.bodySemibold },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 7, marginBottom: 24 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: palette.line },
  dotActive: { backgroundColor: palette.accent, width: 20 },
  primaryButton: { height: 56, borderRadius: 16, backgroundColor: palette.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  primaryButtonText: { color: palette.white, fontSize: 15, fontFamily: fonts.bodyBold },
});
