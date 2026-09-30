import { Category } from '@/features/life-items/life-items-types';

/**
 * Ported from 小熊記帳's OKLCH tokens (`記帳本/src/app/globals.css`) so the
 * two apps read as one brand family — values below are the exact sRGB hex
 * equivalents of its oklch() tokens (computed via the standard OKLab→linear
 * sRGB→gamma conversion, not eyeballed), not a reinterpretation.
 */
export const palette = {
  canvas: '#FDF7F0',
  surface: '#FFFDF8',
  surfaceMuted: '#F5EBCE',
  ink: '#331E16',
  muted: '#816D62',
  subtle: '#B0A084',
  line: '#E8DBD1',
  accent: '#F56333',
  accentDeep: '#D24100',
  accentSoft: '#F5EBCE',
  coral: '#F56333',
  coralSoft: '#F5EBCE',
  danger: '#EE343B',
  dangerSoft: '#FCDFDC',
  warning: '#D9A514',
  warningSoft: '#F9F0D6',
  safe: '#029E72',
  safeSoft: '#D9EFE4',
  white: '#FFFDF8',
} as const;

/**
 * Fixed radius steps, replacing ad hoc 13–22px values scattered per
 * component — echoes 小熊記帳's `--radius` scale (`globals.css`), which
 * derives every corner from one base value instead of hand-picking each.
 */
export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
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
 * Aligned with 小熊記帳's type system: Geist has no CJK glyphs (its own
 * Chinese text just falls back to the OS system font), so this keeps Noto
 * Sans TC — deliberately chosen, unlike 小熊記帳's fallback — for every
 * Chinese heading/body role, and only reaches for Geist where the content
 * is actually numerals (day counts, big counters), which is where the two
 * apps' personalities visibly line up. Loaded via `useFonts` in the root
 * layout; fall back to the platform system font until they're ready.
 */
export const fonts = {
  display: 'NotoSansTC_700Bold',
  numeric: 'Geist_700Bold',
  body: 'NotoSansTC_400Regular',
  bodyMedium: 'NotoSansTC_500Medium',
  bodySemibold: 'NotoSansTC_600SemiBold',
  bodyBold: 'NotoSansTC_700Bold',
} as const;
