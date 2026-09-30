import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, AppIconName } from '@/components/app-icon';
import { BottomNav } from '@/components/bottom-nav';
import { showSnackbar } from '@/components/snackbar';
import { appVersion } from '@/constants/app-info';
import { fonts, palette } from '@/constants/design';
import { backupFileName } from '@/features/backup/backup-format';
import { pickBackupFile, saveBackupFile } from '@/features/backup/backup-file';
import { useLifeItems } from '@/features/life-items/life-items-context';
import { InvalidBackupError } from '@/features/life-items/life-items-service';
import { formatNotificationTime, isSameNotificationTime, NOTIFICATION_TIME_OPTIONS, NotificationTime } from '@/features/notifications/notification-policy';
import { getPermissionStatus, requestPermission } from '@/features/notifications/notification-service';

const permissionCopy: Record<'granted' | 'denied' | 'undetermined', { label: string; description: string }> = {
  granted: { label: '已允許', description: '到期提醒會準時通知你。' },
  denied: { label: '未允許', description: '請到系統設定開啟這個 App 的通知權限，提醒才能送達。' },
  undetermined: { label: '尚未詢問', description: '開啟「到期提醒」時會請你允許系統通知。' },
};

export default function SettingsScreen() {
  const { notificationsEnabled, setNotificationsEnabled, notificationTime, setNotificationTime, exportBackup, importBackup } = useLifeItems();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [busyBackupAction, setBusyBackupAction] = useState<'export' | 'import' | null>(null);

  useEffect(() => {
    getPermissionStatus().then(setPermissionStatus);
    // The user can grant/revoke notification permission from system Settings
    // without ever closing the app — re-check whenever we come back to the
    // foreground instead of only once on mount, or this row goes stale.
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') getPermissionStatus().then(setPermissionStatus);
    });
    return () => subscription.remove();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    // Scheduling/cancelling every item is async and can overlap a rapid
    // on/off/on tap sequence — disable the switch mid-flight instead of
    // letting two toggles race each other.
    if (isUpdatingNotifications) return;
    setIsUpdatingNotifications(true);
    try {
      if (value) {
        const granted = await requestPermission();
        setPermissionStatus(await getPermissionStatus());
        if (!granted) return;
      }
      await setNotificationsEnabled(value);
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const chooseNotificationTime = async (time: NotificationTime) => {
    setIsTimePickerOpen(false);
    // Rescheduling shares the same in-flight guard as the switch — both
    // rewrite every item's OS notifications and must not interleave.
    if (isUpdatingNotifications || isSameNotificationTime(time, notificationTime)) return;
    setIsUpdatingNotifications(true);
    try {
      await setNotificationTime(time);
    } catch (error) {
      console.error('[settings] failed to change notification time', error);
      showSnackbar({ message: '提醒時間未能更新，請再試一次' });
    } finally {
      setIsUpdatingNotifications(false);
    }
  };

  const handleExport = async () => {
    if (busyBackupAction) return;
    setBusyBackupAction('export');
    try {
      const { json, itemCount } = await exportBackup();
      if (itemCount === 0) {
        showSnackbar({ message: '還沒有事項可以備份' });
        return;
      }
      await saveBackupFile(backupFileName(new Date()), json);
    } catch (error) {
      console.error('[settings] backup export failed', error);
      showSnackbar({ message: '備份未能匯出，請再試一次' });
    } finally {
      setBusyBackupAction(null);
    }
  };

  const handleImport = async () => {
    if (busyBackupAction) return;
    setBusyBackupAction('import');
    try {
      const raw = await pickBackupFile();
      if (raw === null) return;
      showSnackbar({ message: await importBackup(raw) });
    } catch (error) {
      if (error instanceof InvalidBackupError) {
        showSnackbar({ message: error.message });
      } else {
        console.error('[settings] backup import failed', error);
        showSnackbar({ message: '備份未能匯入，現有資料沒有變動' });
      }
    } finally {
      setBusyBackupAction(null);
    }
  };

  const permission = permissionCopy[permissionStatus];

  return (
    <View style={styles.page}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>偏好與資料</Text>
          <Text style={styles.title}>設定</Text>

          <Text style={styles.sectionTitle}>提醒</Text>
          <View style={styles.panel}>
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}><AppIcon name="bell" size={19} color={palette.accentDeep} /></View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>到期提醒</Text>
                <Text style={styles.settingDescription}>關閉後會取消已排程的通知，但事項資料仍會保留</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={toggleNotifications}
                disabled={isUpdatingNotifications}
                trackColor={{ false: '#DDD0BC', true: '#D2A184' }}
                thumbColor={notificationsEnabled ? palette.accentDeep : '#FBF5EA'}
              />
            </View>
            <View style={styles.divider} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`提醒時間，目前是${formatNotificationTime(notificationTime)}`}
              accessibilityState={{ expanded: isTimePickerOpen, disabled: isUpdatingNotifications }}
              disabled={isUpdatingNotifications}
              onPress={() => setIsTimePickerOpen((open) => !open)}
              style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
              <View style={styles.settingIcon}><AppIcon name="clock" size={19} color={palette.accentDeep} /></View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>提醒時間</Text>
                <Text style={styles.settingDescription}>所有提醒都會在這個時間送出</Text>
              </View>
              {isUpdatingNotifications ? (
                <ActivityIndicator color={palette.accent} />
              ) : (
                <Text style={styles.valueText}>{formatNotificationTime(notificationTime)}</Text>
              )}
            </Pressable>
            {isTimePickerOpen ? (
              <View style={styles.timeOptions}>
                {NOTIFICATION_TIME_OPTIONS.map((option) => {
                  const selected = isSameNotificationTime(option, notificationTime);
                  return (
                    <Pressable
                      key={`${option.hour}:${option.minute}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => chooseNotificationTime(option)}
                      style={({ pressed }) => [styles.timeChip, selected && styles.timeChipSelected, pressed && styles.pressed]}>
                      <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{formatNotificationTime(option)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingIcon}><AppIcon name="privacy" size={19} color={palette.accentDeep} /></View>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>系統通知權限：{permission.label}</Text>
                <Text style={styles.settingDescription}>{permission.description}</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>資料</Text>
          <View style={styles.panel}>
            <SettingRow icon="digital" title="儲存在這台裝置" description="不需要帳號，離線也能使用" />
            <View style={styles.divider} />
            <ActionRow
              icon="export"
              title="匯出備份"
              description="把所有事項存成一個檔案，換手機時可以匯入"
              busy={busyBackupAction === 'export'}
              disabled={busyBackupAction !== null}
              onPress={handleExport}
            />
            <View style={styles.divider} />
            <ActionRow
              icon="import"
              title="匯入備份"
              description="從備份檔加回事項，不會覆蓋現有資料"
              busy={busyBackupAction === 'import'}
              disabled={busyBackupAction !== null}
              onPress={handleImport}
            />
            <View style={styles.divider} />
            <SettingRow icon="cloud" title="雲端備份" description="規劃於 Pro 版本提供" badge="稍後" />
          </View>

          <Text style={styles.sectionTitle}>關於</Text>
          <View style={styles.panel}>
            <SettingRow icon="calendar" title="下一件事 NextUp" description={`Version ${appVersion}`} />
          </View>

          <View style={styles.promiseCard}>
            <View style={styles.promiseIcon}><AppIcon name="privacy" size={20} color={palette.accentDeep} /></View>
            <View style={styles.settingCopy}>
              <Text style={styles.promiseTitle}>你的資料屬於你</Text>
              <Text style={styles.promiseDescription}>第一版不建立帳號，也不將生活資料傳到伺服器。</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav active="settings" />
    </View>
  );
}

function SettingRow({ icon, title, description, badge }: { icon: AppIconName; title: string; description: string; badge?: string }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}><AppIcon name={icon} size={19} color={palette.accentDeep} /></View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
    </View>
  );
}

function ActionRow({
  icon,
  title,
  description,
  busy,
  disabled,
  onPress,
}: {
  icon: AppIconName;
  title: string;
  description: string;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.settingRow, pressed && styles.pressed]}>
      <View style={styles.settingIcon}><AppIcon name={icon} size={19} color={palette.accentDeep} /></View>
      <View style={styles.settingCopy}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      {busy ? <ActivityIndicator color={palette.accent} /> : <AppIcon name="chevron" size={16} color={palette.subtle} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.canvas },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 },
  eyebrow: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodyMedium, marginBottom: 5 },
  title: { color: palette.ink, fontSize: 32, fontFamily: fonts.display, marginBottom: 28 },
  sectionTitle: { color: palette.muted, fontSize: 12, fontFamily: fonts.bodySemibold, marginBottom: 9, marginTop: 16, marginLeft: 3 },
  panel: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 16,
    shadowColor: '#7A4423',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  settingRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center' },
  settingIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingCopy: { flex: 1 },
  settingTitle: { color: palette.ink, fontSize: 14.5, fontFamily: fonts.bodySemibold, marginBottom: 4 },
  settingDescription: { color: palette.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: palette.line, marginLeft: 52 },
  pressed: { opacity: 0.6 },
  valueText: { color: palette.accentDeep, fontSize: 13.5, fontFamily: fonts.bodySemibold },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 50, paddingBottom: 16 },
  timeChip: { height: 34, paddingHorizontal: 12, borderRadius: 11, borderWidth: 1, borderColor: palette.line, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center' },
  timeChipSelected: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
  timeChipText: { color: palette.muted, fontSize: 12.5, fontFamily: fonts.bodySemibold },
  timeChipTextSelected: { color: palette.accentDeep },
  badge: { color: palette.muted, backgroundColor: palette.surfaceMuted, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontFamily: fonts.bodySemibold },
  promiseCard: { marginTop: 26, backgroundColor: palette.accentSoft, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center' },
  promiseIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  promiseTitle: { color: palette.ink, fontSize: 14.5, fontFamily: fonts.bodyBold, marginBottom: 4 },
  promiseDescription: { color: palette.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
});
