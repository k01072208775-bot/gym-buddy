/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * 앱 화면에서 쓰는 색상.
 *
 * 연한 회색 배경 위에 흰 카드를 얹는 밝은 테마입니다.
 * 포인트는 초록(primary), 강조·주의는 빨강(danger),
 * 고르는 칩처럼 "지금 선택됨"을 나타낼 때는 검정(selected)을 씁니다.
 *
 * 지금은 라이트/다크 모드와 상관없이 항상 이 색을 씁니다.
 * 화면 코드에 #00C471 같은 값을 직접 적지 말고 반드시 여기를 거치세요.
 */
const palette = {
  /** 페이지 배경 (카드가 떠 보이도록 살짝 회색) */
  background: '#F4F5F7',
  /** 카드, 입력칸처럼 배경 위에 얹는 흰 면 */
  card: '#FFFFFF',
  /** 선택 안 된 칩 */
  chip: '#EFF1F4',
  text: '#17181A',
  textMuted: '#8B8F96',
  border: '#E6E8EC',
  /** 포인트 색 — 위에 올리는 글자는 onPrimary */
  primary: '#00B96B',
  onPrimary: '#FFFFFF',
  /** 연한 초록 배지 (겹치는 종목처럼 가볍게 강조할 때) */
  primarySoft: '#E3F6EC',
  onPrimarySoft: '#007A47',
  /** 고른 칩·탭처럼 "선택됨"을 또렷하게 보여줄 때 */
  selected: '#17181A',
  onSelected: '#FFFFFF',
  /** 신고·삭제처럼 되돌릴 수 없는 것, 그리고 '신규' 배지 */
  danger: '#F04452',
  bubbleMine: '#00B96B',
  bubbleMineText: '#FFFFFF',
  bubbleTheirs: '#FFFFFF',
  bubbleTheirsText: '#17181A',
};

export const AppColors = {
  light: palette,
  dark: palette,
};

export type AppPalette = typeof palette;

/**
 * 프로필 사진이 없을 때 쓰는 동그라미 색. 배경과 그 위 글자색이 한 쌍입니다.
 *
 * 전부 같은 회색으로 두면 목록에서 누가 누군지 구분이 안 됩니다.
 * 닉네임으로 색을 정하므로 같은 사람은 어느 화면에서나 같은 색으로 보입니다.
 */
export const AvatarColors = [
  { bg: '#E3F6EC', text: '#007A47' },
  { bg: '#E4EEFF', text: '#1E4FA3' },
  { bg: '#F0E9FF', text: '#5B3CB8' },
  { bg: '#FFE9F0', text: '#A62B5B' },
  { bg: '#FFF0DB', text: '#8A5A00' },
  { bg: '#DDF4F5', text: '#0F6E73' },
  { bg: '#FFE8E3', text: '#AA3C22' },
] as const;

/** 모서리 둥글기. 전체적으로 넉넉하게 둥글립니다. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** 여백은 이 값들 중에서만 고르세요 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** 글자 크기 단계. 굵기를 크게 대비시켜 운동 앱다운 힘을 줍니다. */
export const Typography = {
  /** 화면 큰 제목 (게시판, 탐색 …) */
  display: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  /** 글 상세 제목 */
  title: { fontSize: 20, fontWeight: '700' },
  /** 목록의 글 제목, 카드 제목 */
  heading: { fontSize: 16, fontWeight: '700' },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  /** 작성자 · 시간 같은 부가 정보 */
  caption: { fontSize: 12, fontWeight: '400' },
  /** 종목 태그처럼 작고 굵은 라벨 */
  label: { fontSize: 12, fontWeight: '700' },
} as const;
