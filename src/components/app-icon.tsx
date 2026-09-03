import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';

export type AppIconName =
  | 'today'
  | 'list'
  | 'settings'
  | 'document'
  | 'vehicle'
  | 'home'
  | 'digital'
  | 'money'
  | 'travel'
  | 'calendar'
  | 'add'
  | 'check'
  | 'repeat'
  | 'bell'
  | 'cloud'
  | 'privacy'
  | 'chevron'
  | 'filter'
  | 'back'
  | 'edit'
  | 'trash'
  | 'undo';

const iconNames: Record<AppIconName, SymbolViewProps['name']> = {
  today: { ios: 'sun.max', android: 'today', web: 'today' },
  list: { ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' },
  settings: { ios: 'gearshape', android: 'settings', web: 'settings' },
  document: { ios: 'doc.text', android: 'description', web: 'description' },
  vehicle: { ios: 'car', android: 'directions_car', web: 'directions_car' },
  home: { ios: 'house', android: 'home', web: 'home' },
  digital: { ios: 'iphone', android: 'devices', web: 'devices' },
  money: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
  travel: { ios: 'airplane', android: 'flight', web: 'flight' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  add: { ios: 'plus', android: 'add', web: 'add' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  repeat: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  bell: { ios: 'bell', android: 'notifications_none', web: 'notifications_none' },
  cloud: { ios: 'icloud', android: 'backup', web: 'backup' },
  privacy: { ios: 'hand.raised', android: 'shield', web: 'shield' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  filter: { ios: 'line.3.horizontal.decrease', android: 'filter_list', web: 'filter_list' },
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  undo: { ios: 'arrow.uturn.left', android: 'undo', web: 'undo' },
};

export function AppIcon({
  name,
  size = 20,
  color,
  style,
}: {
  name: AppIconName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SymbolView
      name={iconNames[name]}
      size={size}
      tintColor={color}
      weight="medium"
      resizeMode="scaleAspectFit"
      style={style}
    />
  );
}
