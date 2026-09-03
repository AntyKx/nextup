import { Category } from '@/features/life-items/life-items-types';

export const palette = {
  canvas: '#F3EADC',
  surface: '#FBF5EA',
  surfaceMuted: '#EFE2CC',
  ink: '#2E2418',
  muted: '#8A7458',
  subtle: '#B0A084',
  line: '#E9DAC1',
  accent: '#BE6A42',
  accentDeep: '#9C5535',
  accentSoft: '#F0DDBE',
  coral: '#C97B57',
  coralSoft: '#F7E6DA',
  danger: '#C1573F',
  warning: '#B37B34',
  safe: '#6E8268',
  white: '#FBF5EA',
} as const;

/**
 * Per-category accents, used only as light decoration (filter chips, the
 * category dot on a card, the picker in Add) — never on the countdown icon
 * box, which stays coded to urgency (see `urgencyMeta`). Muted to sit next
 * to the warm-paper canvas without competing with the terracotta accent.
 */
export const categoryColors: Record<Category, { color: string; tint: string }> = {
  document: { color: '#BD7C86', tint: '#F2E0E1' },
  vehicle: { color: '#5C7C99', tint: '#DEE6ED' },
  home: { color: '#7C9463', tint: '#E3E8D6' },
  digital: { color: '#8B7BA6', tint: '#E7E0EF' },
  money: { color: '#B98A2E', tint: '#F2E5C7' },
  travel: { color: '#4F8F86', tint: '#DCEAE7' },
};

/**
 * "溫潤紙感" type system — LXGW WenKai TC for display moments (screen
 * titles, section headers, countdown numerals), Noto Sans TC for body
 * copy. Loaded via `useFonts` in the root layout; fall back to the
 * platform system font until they're ready.
 */
export const fonts = {
  display: 'LXGWWenKaiTC_700Bold',
  displayRegular: 'LXGWWenKaiTC_400Regular',
  body: 'NotoSansTC_400Regular',
  bodyMedium: 'NotoSansTC_500Medium',
  bodySemibold: 'NotoSansTC_600SemiBold',
  bodyBold: 'NotoSansTC_700Bold',
} as const;
