import { LXGWWenKaiTC_400Regular, LXGWWenKaiTC_700Bold } from '@expo-google-fonts/lxgw-wenkai-tc';
import {
  NotoSansTC_400Regular,
  NotoSansTC_500Medium,
  NotoSansTC_600SemiBold,
  NotoSansTC_700Bold,
} from '@expo-google-fonts/noto-sans-tc';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { SnackbarHost } from '@/components/snackbar';
import { palette } from '@/constants/design';
import { LifeItemsProvider } from '@/features/life-items/life-items-context';
import { useNotificationTapNavigation } from '@/features/notifications/use-notification-navigation';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    LXGWWenKaiTC_400Regular,
    LXGWWenKaiTC_700Bold,
    NotoSansTC_400Regular,
    NotoSansTC_500Medium,
    NotoSansTC_600SemiBold,
    NotoSansTC_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  useNotificationTapNavigation(fontsLoaded);

  if (!fontsLoaded) return null;

  return (
    <LifeItemsProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.canvas },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="items" />
        <Stack.Screen name="settings" />
        <Stack.Screen
          name="add"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="item/[id]" />
        <Stack.Screen
          name="item/[id]/edit"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
      <SnackbarHost />
    </LifeItemsProvider>
  );
}
