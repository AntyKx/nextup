import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, AppIconName } from '@/components/app-icon';
import { BottomNav } from '@/components/bottom-nav';
import { fonts, palette } from '@/constants/design';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);

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
                <Text style={styles.settingDescription}>系統通知套件接入後啟用</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#DDD0BC', true: '#D2A184' }}
                thumbColor={notifications ? palette.accentDeep : '#FBF5EA'}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>資料</Text>
          <View style={styles.panel}>
            <SettingRow icon="digital" title="儲存在這台裝置" description="不需要帳號，離線也能使用" />
            <View style={styles.divider} />
            <SettingRow icon="cloud" title="雲端備份" description="規劃於 Pro 版本提供" badge="稍後" />
          </View>

          <Text style={styles.sectionTitle}>關於</Text>
          <View style={styles.panel}>
            <SettingRow icon="calendar" title="下一件事 NextUp" description="Version 0.2.0 · Preview" />
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
  badge: { color: palette.muted, backgroundColor: palette.surfaceMuted, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontFamily: fonts.bodySemibold },
  promiseCard: { marginTop: 26, backgroundColor: palette.accentSoft, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center' },
  promiseIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.6)', alignItems: 'center', justifyContent: 'center', marginRight: 13 },
  promiseTitle: { color: palette.ink, fontSize: 14.5, fontFamily: fonts.bodyBold, marginBottom: 4 },
  promiseDescription: { color: palette.muted, fontSize: 12, lineHeight: 17, fontFamily: fonts.body },
});
