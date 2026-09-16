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
 * 앱 화면에서 쓰는 색상 — "스포츠형(C)" 디자인.
 *
 * 어두운 배경 + 형광 연두 포인트. 지금은 라이트/다크 모드와 상관없이 항상 이 색을 씁니다.
 * 나중에 밝은 테마를 만들려면 light 에 다른 색표를 넣으면 됩니다.
 *
 * 화면 코드에 #97C459 같은 값을 직접 적지 말고 반드시 여기를 거치세요.
 */
const sportPalette = {
  background: '#2C2C2A',
  /** 입력칸, 카드처럼 배경 위에 한 단계 떠 있는 면 */
  card: '#383836',
  /** 선택 안 된 칩, 버튼 같은 채워진 컨트롤 */
  chip: '#444441',
  text: '#F1EFE8',
  textMuted: '#A3A198',
  border: '#444441',
  /** 포인트 색 (형광 연두) — 위에 올리는 글자는 onPrimary */
  primary: '#97C459',
  onPrimary: '#173404',
  danger: '#F09595',
  bubbleMine: '#97C459',
  bubbleMineText: '#173404',
  bubbleTheirs: '#444441',
  bubbleTheirsText: '#F1EFE8',
};

export const AppColors = {
  light: sportPalette,
  dark: sportPalette,
};

export type AppPalette = typeof sportPalette;

/** 모서리 둥글기. 스포츠형은 알약 모양보다 살짝 각진 모서리를 씁니다. */
export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
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
