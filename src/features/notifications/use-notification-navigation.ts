import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import * as lifeItemsService from '@/features/life-items/life-items-service';

/**
 * Routes a tapped reminder notification to its item's detail screen.
 * Covers foreground/background taps (`addNotificationResponseReceivedListener`)
 * and cold start (`getLastNotificationResponseAsync`) — a `ready` gate delays
 * navigation until the root Stack has actually mounted, and a handled-id
 * guard stops the same response firing a duplicate navigation when both
 * paths observe it. Looks the item up through the service layer (never
 * touches the repository/SQLite directly) so a deleted item falls back to
 * the home screen instead of the dead-end "not found" state.
 */
export function useNotificationTapNavigation(ready: boolean) {
  const handledNotificationId = useRef<string | null>(null);
  const checkedInitial = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return;

    async function handleResponse(response: Notifications.NotificationResponse) {
      const requestId = response.notification.request.identifier;
      if (handledNotificationId.current === requestId) return;
      handledNotificationId.current = requestId;
      const data = response.notification.request.content.data as { itemId?: string } | undefined;
      if (!data?.itemId) return;
      const item = await lifeItemsService.getItem(data.itemId).catch((error) => {
        console.error('[notifications] failed to look up tapped item', error);
        return null;
      });
      if (item) {
        router.push(`/item/${data.itemId}`);
      } else {
        router.replace('/');
      }
    }

    if (!checkedInitial.current) {
      checkedInitial.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then(async (response) => {
          if (!response) return;
          await handleResponse(response);
          // Otherwise the same response gets re-consumed on every future
          // cold start of the app, re-triggering this navigation forever.
          try {
            await Notifications.clearLastNotificationResponseAsync();
          } catch (error) {
            console.error('[notifications] failed to clear last notification response', error);
          }
        })
        .catch((error) => console.error('[notifications] failed to read last notification response', error));
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [ready]);
}
