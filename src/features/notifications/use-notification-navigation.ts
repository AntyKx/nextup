import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Routes a tapped reminder notification to its item's detail screen.
 * Covers foreground/background taps (`addNotificationResponseReceivedListener`)
 * and cold start (`getLastNotificationResponseAsync`) — a `ready` gate delays
 * navigation until the root Stack has actually mounted, and a handled-id
 * guard stops the same response firing a duplicate navigation when both
 * paths observe it.
 */
export function useNotificationTapNavigation(ready: boolean) {
  const handledNotificationId = useRef<string | null>(null);
  const checkedInitial = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web' || !ready) return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const requestId = response.notification.request.identifier;
      if (handledNotificationId.current === requestId) return;
      handledNotificationId.current = requestId;
      const data = response.notification.request.content.data as { itemId?: string } | undefined;
      if (data?.itemId) router.push(`/item/${data.itemId}`);
    }

    if (!checkedInitial.current) {
      checkedInitial.current = true;
      Notifications.getLastNotificationResponseAsync()
        .then((response) => {
          if (response) handleResponse(response);
        })
        .catch((error) => console.error('[notifications] failed to read last notification response', error));
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [ready]);
}
