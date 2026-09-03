import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { fonts, palette } from '@/constants/design';

type SnackbarOptions = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
};

let listener: ((options: SnackbarOptions) => void) | null = null;

/** Imperative trigger — call from anywhere, no provider/hook needed. */
export function showSnackbar(options: SnackbarOptions) {
  listener?.(options);
}

/** Mount exactly once, near the root (see `_layout.tsx`). */
export function SnackbarHost() {
  const [current, setCurrent] = useState<SnackbarOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listener = (options) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setCurrent(options);
      timerRef.current = setTimeout(() => setCurrent(null), options.durationMs ?? 4000);
    };
    return () => {
      listener = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!current) return null;

  const dismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(null);
  };

  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bar}>
        <Text style={styles.message} numberOfLines={2}>
          {current.message}
        </Text>
        {current.actionLabel && current.onAction ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              current.onAction?.();
              dismiss();
            }}>
            <Text style={styles.action}>{current.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 96, alignItems: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    width: '100%',
    maxWidth: 420,
    backgroundColor: palette.ink,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  message: { flex: 1, color: palette.white, fontSize: 13.5, fontFamily: fonts.bodyMedium },
  action: { color: palette.accentSoft, fontSize: 13.5, fontFamily: fonts.bodyBold },
});
